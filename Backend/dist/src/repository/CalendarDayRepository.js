"use strict";
// File: src/repository/CalendarDayRepository.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../db")); // Assuming '../db' exports your PostgreSQL pool connection
const humps = __importStar(require("humps")); // For camelCase to snake_case conversion
const moment_1 = __importDefault(require("moment")); // Ensure installed: npm install moment @types/moment
class CalendarDayRepository {
    /**
     * Creates a new calendar day entry in the database.
     * Initializes with default or null values for new columns.
     * @param calendarDay - The calendar day data to create.
     * @returns The newly created CalendarDay object or null if creation failed.
     */
    createCalendarDay(calendarDay) {
        return __awaiter(this, void 0, void 0, function* () {
            // Insert only the fields available in CreateCalendarDay
            // DB defaults will handle processing_status and timestamps
            // vimeo_uri will be NULL initially
            const query = `
        INSERT INTO calendar_day (user_id, date, user_video_url)
        VALUES ($1, $2, $3)
        RETURNING calendar_id`; // Return the newly created ID
            const values = [calendarDay.userId, calendarDay.date, calendarDay.userVideoUrl]; // userVideoUrl might be null
            try {
                const result = yield db_1.default.query(query, values);
                if (result.rows.length > 0 && result.rows[0].calendar_id) {
                    const newId = result.rows[0].calendar_id;
                    // Fetch the complete row using the returned ID to ensure all fields (including defaults) are present
                    return this.getCalendarDayById(newId);
                }
                else {
                    console.error('Failed to create calendar day or retrieve ID.');
                    return null;
                }
            }
            catch (error) {
                console.error('Error in createCalendarDay:', error);
                if (error.code === '23505') {
                    // Handle unique constraint violation
                    console.warn(`Attempted to create duplicate calendar day for user ${calendarDay.userId} on ${calendarDay.date}`);
                }
                return null; // Return null on error
            }
        });
    }
    /**
     * Retrieves all calendar day entries for a specific user, including new columns.
     * @param userId - The ID of the user.
     * @returns An array of CalendarDay objects.
     */
    getCalendarDaysByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Select the new columns as well
            const query = `
        SELECT calendar_id, user_id, date, user_video_url, vimeo_uri, processing_status, created_at, updated_at
        FROM calendar_day
        WHERE user_id = $1
        ORDER BY date DESC`; // Order by date, newest first
            try {
                const { rows } = yield db_1.default.query(query, [userId]);
                // Map the new columns
                return rows.map((row) => ({
                    calendarId: row.calendar_id,
                    userId: row.user_id,
                    date: (0, moment_1.default)(row.date).format('YYYY-MM-DD'), // Format date
                    userVideoUrl: row.user_video_url,
                    vimeoUri: row.vimeo_uri, // Map new column
                    processingStatus: row.processing_status, // Map and cast new column
                    // Optionally map timestamps if needed in the frontend type
                    // createdAt: row.created_at,
                    // updatedAt: row.updated_at,
                }));
            }
            catch (error) {
                console.error('Error fetching calendar days by user ID:', error);
                return []; // Return empty array on error
            }
        });
    }
    /**
     * Retrieves a specific calendar day entry by its ID, including new columns.
     * @param calendarId - The ID of the calendar day entry.
     * @returns The CalendarDay object or null if not found.
     */
    getCalendarDayById(calendarId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Select the new columns
            const query = `
        SELECT calendar_id, user_id, date, user_video_url, vimeo_uri, processing_status, created_at, updated_at
        FROM calendar_day
        WHERE calendar_id = $1`;
            try {
                const { rows } = yield db_1.default.query(query, [calendarId]);
                if (rows.length) {
                    const row = rows[0];
                    // Map the new columns
                    return {
                        calendarId: row.calendar_id,
                        userId: row.user_id,
                        date: (0, moment_1.default)(row.date).format('YYYY-MM-DD'),
                        userVideoUrl: row.user_video_url,
                        vimeoUri: row.vimeo_uri,
                        processingStatus: row.processing_status,
                        // createdAt: row.created_at,
                        // updatedAt: row.updated_at,
                    };
                }
                else {
                    return null; // Not found
                }
            }
            catch (error) {
                console.error('Error fetching calendar day by ID:', error);
                return null; // Return null on error
            }
        });
    }
    /**
     * Retrieves a specific calendar day entry by user ID and date, including new columns.
     * @param userId - The ID of the user.
     * @param date - The date string (YYYY-MM-DD).
     * @returns The CalendarDay object or null if not found.
     */
    getCalendarDayByUserIdAndDate(userId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            // Select the new columns
            const query = `
        SELECT calendar_id, user_id, date, user_video_url, vimeo_uri, processing_status, created_at, updated_at
        FROM calendar_day
        WHERE user_id = $1 AND date = $2`;
            try {
                const { rows } = yield db_1.default.query(query, [userId, date]);
                if (rows.length) {
                    const row = rows[0];
                    // Map the new columns
                    return {
                        calendarId: row.calendar_id,
                        userId: row.user_id,
                        date: (0, moment_1.default)(row.date).format('YYYY-MM-DD'),
                        userVideoUrl: row.user_video_url,
                        vimeoUri: row.vimeo_uri,
                        processingStatus: row.processing_status,
                        // createdAt: row.created_at,
                        // updatedAt: row.updated_at,
                    };
                }
                else {
                    return null; // Not found
                }
            }
            catch (error) {
                console.error('Error fetching calendar day by User ID and Date:', error);
                return null; // Return null on error
            }
        });
    }
    /**
     * Updates fields of a specific calendar day entry using UpdateCalendarDay type.
     * Automatically updates the 'updated_at' timestamp if DB trigger is not used.
     * @param calendarId - The ID of the entry to update.
     * @param updateData - An object containing the fields to update (using UpdateCalendarDay type).
     * @returns True if the update was successful, false otherwise.
     */
    // Use the specific UpdateCalendarDay type for input
    updateCalendarDay(calendarId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const fieldsToUpdate = [];
            const values = [];
            let queryIndex = 1;
            // Iterate over the provided updateData object
            Object.entries(updateData).forEach(([key, value]) => {
                // Check if the key is a valid field in UpdateCalendarDay (optional but good practice)
                // Ensure value is not undefined before adding to query
                if (value !== undefined) {
                    // Convert known camelCase keys from type to snake_case for DB
                    const snakeCaseKey = humps.decamelize(key); // Handles userVideoUrl, vimeoUri, processingStatus
                    fieldsToUpdate.push(`${snakeCaseKey} = $${queryIndex}`);
                    values.push(value); // Add the value (can be string, null, etc.)
                    queryIndex++;
                }
            });
            // If no fields to update, return successfully (or false based on desired behavior)
            if (fieldsToUpdate.length === 0) {
                console.log('No fields provided to update for calendarId:', calendarId);
                return true; // Indicate success as no update was needed
            }
            // Add updated_at field automatically if not using a DB trigger
            // Comment this line out if using the DB trigger from schema.sql
            fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(calendarId); // Add calendarId for the WHERE clause ($${queryIndex})
            const setClause = fieldsToUpdate.join(', '); // e.g., "user_video_url = $1, processing_status = $2, updated_at = CURRENT_TIMESTAMP"
            const query = `UPDATE calendar_day SET ${setClause} WHERE calendar_id = $${queryIndex} RETURNING calendar_id`;
            try {
                const result = yield db_1.default.query(query, values);
                const updated = (result.rowCount || 0) > 0;
                if (updated) {
                    console.log(`Successfully updated calendarId: ${calendarId} with fields: ${Object.keys(updateData).join(', ')}`);
                }
                else {
                    console.warn(`Update query executed but no rows affected for calendarId: ${calendarId}. Might not exist.`);
                }
                return updated; // True if 1 or more rows were affected
            }
            catch (error) {
                console.error(`Error updating calendar day (ID: ${calendarId}):`, error);
                return false; // Indicate failure
            }
        });
    }
    /**
     * Deletes a specific calendar day entry by its ID.
     * @param calendarId - The ID of the entry to delete.
     * @returns True if the deletion was successful, false otherwise.
     */
    deleteCalendarDay(calendarId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `DELETE FROM calendar_day WHERE calendar_id = $1`;
            try {
                const result = yield db_1.default.query(query, [calendarId]);
                return (result.rowCount || 0) > 0;
            }
            catch (error) {
                console.error('Error deleting calendar day:', error);
                return false;
            }
        });
    }
    // --- Nearby Zipcodes Method (No changes needed) ---
    getNearbyZipcodes(zipcode, miles) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // ... (same code as before) ...
            if (![5, 10, 20].includes(miles)) {
                return null;
            }
            const columnName = `within_${miles}_miles`;
            const query = `SELECT ${columnName} FROM zipcodes WHERE zipcode = $1`;
            try {
                const { rows } = yield db_1.default.query(query, [zipcode]);
                if (rows.length > 0 && ((_a = rows[0]) === null || _a === void 0 ? void 0 : _a[columnName]) != null) {
                    return rows[0][columnName];
                }
                else {
                    return null;
                }
            }
            catch (error) {
                console.error('Error fetching nearby zipcodes:', error);
                return null;
            }
        });
    }
    // --- Get Nearby Videos Method (No changes needed) ---
    getCalendarDayVideosByDateAndZipCode(date, zipcodeList) {
        return __awaiter(this, void 0, void 0, function* () {
            // ... (same code as before) ...
            const query = `
            SELECT cd.user_id, cd.user_video_url
            FROM calendar_day cd
            INNER JOIN users u ON cd.user_id = u.user_id
            WHERE cd.date = $1
              AND u.zipcode = ANY($2::text[])
              AND cd.user_video_url IS NOT NULL
              AND cd.user_video_url != ''`;
            try {
                const { rows } = yield db_1.default.query(query, [date, zipcodeList]);
                return rows.map((row) => ({ userId: row.user_id, userVideoUrl: row.user_video_url }));
            }
            catch (error) {
                console.error('Error in getCalendarDayVideosByDateAndZipCode:', error);
                return null;
            }
        });
    }
    // --- Find Stories Method (UPDATED to include new columns) ---
    /**
     * Retrieves story data (calendar entries with user details) for a specific date.
     * Includes vimeo_uri and processing_status.
     * @param date - The target date (YYYY-MM-DD).
     * @returns An array of story objects or null on error. Returns empty array if none found.
     */
    findStoriesByDateWithUserDetails(date) {
        return __awaiter(this, void 0, void 0, function* () {
            // Include the new columns in the SELECT list
            const query = `
          SELECT
              cd.calendar_id AS "calendarId",
              cd.user_id AS "userId",
              cd.date,
              cd.user_video_url AS "userVideoUrl", -- This is placeholder or final URL
              cd.vimeo_uri AS "vimeoUri",          -- NEW: Vimeo URI
              cd.processing_status AS "processingStatus", -- NEW: Processing status
              COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '') AS "userName",
              u.profile_picture_url AS "profilePictureUrl"
          FROM calendar_day cd
          JOIN users u ON cd.user_id = u.user_id
          WHERE cd.date = $1
            -- Filter potentially based on status? Or just having a URL?
            -- Let's assume we show stories even if processing, but need at least the placeholder URL.
            AND (cd.user_video_url IS NOT NULL AND cd.user_video_url != '')
          ORDER BY cd.created_at DESC, cd.calendar_id DESC; -- Order by creation time? Or ID?
      `;
            try {
                const { rows } = yield db_1.default.query(query, [date]);
                // Map results, including new fields and formatting date
                return rows.map((row) => ({
                    calendarId: row.calendarId,
                    userId: row.userId,
                    userName: row.userName,
                    profilePictureUrl: row.profilePictureUrl,
                    userVideoUrl: row.userVideoUrl,
                    date: (0, moment_1.default)(row.date).format('YYYY-MM-DD'), // Format the date string
                    vimeoUri: row.vimeoUri, // Map new field
                    processingStatus: row.processingStatus, // Map and cast new field
                }));
            }
            catch (error) {
                console.error('Error in findStoriesByDateWithUserDetails:', error);
                return null; // Return null on error
            }
        });
    }
}
exports.default = CalendarDayRepository;
