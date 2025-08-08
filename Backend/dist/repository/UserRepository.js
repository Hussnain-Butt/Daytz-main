"use strict";
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
// File: src/repository/UserRepository.ts
const db_1 = __importDefault(require("../db"));
const humps = __importStar(require("humps"));
const mapRowToUser = (row) => {
    if (!row) {
        return null;
    }
    const camelizedDbRow = humps.camelizeKeys(row);
    return {
        userId: camelizedDbRow.userId,
        auth0Id: camelizedDbRow.auth0Id || camelizedDbRow.userId,
        email: camelizedDbRow.email,
        firstName: camelizedDbRow.firstName,
        lastName: camelizedDbRow.lastName,
        profilePictureUrl: camelizedDbRow.profilePictureUrl,
        videoUrl: camelizedDbRow.videoUrl,
        zipcode: camelizedDbRow.zipcode,
        stickers: camelizedDbRow.stickers,
        tokens: typeof camelizedDbRow.tokens === 'number' ? camelizedDbRow.tokens : 0,
        enableNotifications: typeof camelizedDbRow.enableNotifications === 'boolean'
            ? camelizedDbRow.enableNotifications
            : true,
        // Ensure this maps correctly from is_profile_complete
        is_profile_complete: typeof camelizedDbRow.isProfileComplete === 'boolean'
            ? camelizedDbRow.isProfileComplete
            : typeof camelizedDbRow.is_profile_complete === 'boolean'
                ? camelizedDbRow.is_profile_complete
                : false,
        createdAt: camelizedDbRow.createdAt ? new Date(camelizedDbRow.createdAt) : new Date(),
        updatedAt: camelizedDbRow.updatedAt ? new Date(camelizedDbRow.updatedAt) : new Date(),
        // oneSignalPlayerId is not typically part of the User domain model returned to most services,
        // but if needed, it would be mapped here.
    };
};
class UserRepository {
    // Removed this.db property, use 'pool' directly from import
    // constructor() { this.db = pool; } // Not strictly necessary if pool is used directly
    registerPushToken(userId, playerId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const client = yield db_1.default.connect(); // Use 'pool' from import
            try {
                yield client.query('BEGIN');
                // Clear this player ID from any other user who might have it
                // This ensures a player ID is uniquely associated with one user
                const clearOldUserSql = `
            UPDATE users
            SET one_signal_player_id = NULL
            WHERE one_signal_player_id = $1 AND user_id != $2;
        `;
                yield client.query(clearOldUserSql, [playerId, userId]);
                // Set player ID for the current user
                const updateUserSql = `
            UPDATE users
            SET one_signal_player_id = $1, updated_at = NOW()
            WHERE user_id = $2;
        `;
                const result = yield client.query(updateUserSql, [playerId, userId]);
                yield client.query('COMMIT');
                console.log(`[UserRepository] Registered push token ${playerId} for user ${userId}. Rows affected: ${result.rowCount}`);
                return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
            }
            catch (error) {
                yield client.query('ROLLBACK');
                console.error(`[UserRepository] Error registering push token for user ${userId}:`, error);
                throw error; // Re-throw for handler to catch
            }
            finally {
                client.release();
            }
        });
    }
    getPlayerId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const query = 'SELECT one_signal_player_id FROM users WHERE user_id = $1';
            const { rows } = yield db_1.default.query(query, [userId]); // Use 'pool' from import
            return ((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.one_signal_player_id) || null;
        });
    }
    createUser(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            const columns = [
                'user_id',
                'email',
                'first_name',
                'last_name',
                'profile_picture_url',
                'video_url',
                'zipcode',
                'stickers',
                'enable_notifications',
                'is_profile_complete',
                'tokens',
                // 'auth0_id' // only if you have a separate auth0_id column
            ];
            const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', '$9', '$10', '$11'];
            const values = [
                userData.userId,
                userData.email,
                userData.firstName,
                userData.lastName,
                userData.profilePictureUrl,
                userData.videoUrl,
                userData.zipcode,
                userData.stickers ? JSON.stringify(userData.stickers) : null,
                userData.enableNotifications,
                userData.is_profile_complete,
                userData.tokens,
                // userData.auth0Id || userData.userId, // if using separate auth0_id column
            ];
            // Example if you have a distinct auth0_id column that is not the primary user_id
            // if (userData.auth0Id && process.env.DB_HAS_SEPARATE_AUTH0_ID_COLUMN === 'true') {
            //   columns.push('auth0_id');
            //   placeholders.push(`$${values.length + 1}`);
            //   values.push(userData.auth0Id);
            // } else if (process.env.DB_HAS_SEPARATE_AUTH0_ID_COLUMN === 'true') {
            //   columns.push('auth0_id');
            //   placeholders.push(`$${values.length + 1}`);
            //   values.push(userData.userId); // Default auth0_id to user_id if separate column exists but not provided
            // }
            const query = `
      INSERT INTO users (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *;
    `;
            try {
                console.log('[UserRepository.createUser] Executing query. Payload:', userData, 'SQL Query:', query.trim(), 'SQL Values:', values);
                const { rows } = yield db_1.default.query(query, values);
                const result = rows.length > 0 ? mapRowToUser(rows[0]) : null;
                console.log('[UserRepository.createUser] Result:', result ? `Success, UserID: ${result.userId}, Tokens: ${result.tokens}` : 'Failed');
                return result;
            }
            catch (error) {
                console.error('[UserRepository.createUser] Error:', error);
                throw error;
            }
        });
    }
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM users WHERE user_id = $1;`;
            try {
                const { rows } = yield db_1.default.query(query, [userId]);
                const result = rows.length > 0 ? mapRowToUser(rows[0]) : null;
                if (result) {
                    // console.log(`[UserRepository.getUserById] User ${userId} found. Tokens: ${result.tokens}`);
                }
                else {
                    // console.log(`[UserRepository.getUserById] User ${userId} not found.`);
                }
                return result;
            }
            catch (error) {
                console.error(`[UserRepository.getUserById] Error for ${userId}:`, error);
                throw error;
            }
        });
    }
    updateUser(userId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const fieldsToUpdate = [];
            const valuesToSet = [];
            let queryIndex = 1;
            const disallowedKeys = ['userId', 'auth0Id', 'createdAt']; // updatedAt is handled by DB or query
            for (const [key, value] of Object.entries(updateData)) {
                if (disallowedKeys.includes(key) || value === undefined) {
                    // Also skip undefined values
                    continue;
                }
                const snakeCaseKey = humps.decamelize(key);
                fieldsToUpdate.push(`${snakeCaseKey} = $${queryIndex}`);
                if (key === 'stickers' && value !== null && typeof value === 'object') {
                    valuesToSet.push(JSON.stringify(value));
                }
                else {
                    valuesToSet.push(value);
                }
                queryIndex++;
            }
            if (fieldsToUpdate.length === 0) {
                console.log(`[UserRepository.updateUser] No valid fields to update for user ${userId}. Returning current user data.`);
                return this.getUserById(userId);
            }
            fieldsToUpdate.push(`updated_at = NOW()`); // Ensure updated_at is always set on update
            valuesToSet.push(userId); // For the WHERE clause
            const query = `
      UPDATE users
      SET ${fieldsToUpdate.join(', ')}
      WHERE user_id = $${queryIndex}
      RETURNING *;
    `;
            try {
                console.log(`[UserRepository.updateUser] Updating user ${userId}. SET: ${fieldsToUpdate.join(', ')}`, 'Values:', valuesToSet);
                const { rows } = yield db_1.default.query(query, valuesToSet);
                const result = rows.length > 0 ? mapRowToUser(rows[0]) : null;
                if (result) {
                    console.log(`[UserRepository.updateUser] Update success for ${userId}.`);
                }
                else {
                    console.log(`[UserRepository.updateUser] Update for ${userId} failed or user not found.`);
                }
                return result;
            }
            catch (error) {
                console.error(`[UserRepository.updateUser] Error for ${userId}:`, error);
                throw error;
            }
        });
    }
    deleteUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const query = `DELETE FROM users WHERE user_id = $1;`;
            try {
                const result = yield db_1.default.query(query, [userId]);
                return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
            }
            catch (error) {
                console.error(`[UserRepository.deleteUser] Error for ${userId}:`, error);
                throw error;
            }
        });
    }
    getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM users ORDER BY created_at DESC;`;
            try {
                const { rows } = yield db_1.default.query(query);
                return rows.map(mapRowToUser).filter((user) => user !== null);
            }
            catch (error) {
                console.error(`[UserRepository.getAllUsers] Error:`, error);
                throw error;
            }
        });
    }
    replenishAllUserTokens(amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      UPDATE users
      SET tokens = $1, updated_at = NOW()
      RETURNING user_id;
    `;
            try {
                console.log(`[UserRepository.replenishAllUserTokens] Setting tokens to ${amount} for all users.`);
                const { rowCount } = yield db_1.default.query(query, [amount]);
                console.log(`[UserRepository.replenishAllUserTokens] ${rowCount !== null && rowCount !== void 0 ? rowCount : 0} users had their tokens replenished.`);
                return rowCount !== null && rowCount !== void 0 ? rowCount : 0;
            }
            catch (error) {
                console.error('[UserRepository.replenishAllUserTokens] Error:', error);
                throw error;
            }
        });
    }
    spendUserTokens(userId, amountToSpend) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield db_1.default.connect();
            try {
                yield client.query('BEGIN');
                const selectQuery = 'SELECT tokens FROM users WHERE user_id = $1 FOR UPDATE;';
                const selectResult = yield client.query(selectQuery, [userId]);
                if (selectResult.rows.length === 0) {
                    yield client.query('ROLLBACK');
                    console.warn(`[UserRepository.spendUserTokens] User ${userId} not found.`);
                    return null; // User not found
                }
                const currentTokens = selectResult.rows[0].tokens;
                if (currentTokens < amountToSpend) {
                    yield client.query('ROLLBACK');
                    console.warn(`[UserRepository.spendUserTokens] Insufficient token balance for user ${userId}. Has: ${currentTokens}, Needs: ${amountToSpend}`);
                    // Create a custom error or throw an error with a specific message/code
                    const error = new Error(`Insufficient token balance for user ${userId}. Has: ${currentTokens}, Needs: ${amountToSpend}`);
                    error.code = 'INSUFFICIENT_FUNDS'; // Add a code for easier handling
                    throw error;
                }
                const newBalance = currentTokens - amountToSpend;
                const updateQuery = `
        UPDATE users 
        SET tokens = $1, updated_at = NOW() 
        WHERE user_id = $2 
        RETURNING *;`;
                const updateResult = yield client.query(updateQuery, [newBalance, userId]);
                yield client.query('COMMIT');
                return mapRowToUser(updateResult.rows[0]);
            }
            catch (error) {
                yield client.query('ROLLBACK'); // Ensure rollback on any error
                console.error(`[UserRepository.spendUserTokens] Error for user ${userId}:`, error);
                throw error; // Re-throw to be handled by the service/handler
            }
            finally {
                client.release();
            }
        });
    }
}
exports.default = UserRepository;
