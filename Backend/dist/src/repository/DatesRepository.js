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
const db_1 = __importDefault(require("../db"));
const humps = __importStar(require("humps"));
class DatesRepository {
    createDateEntry(dateEntry) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const query = `INSERT INTO dates (date, time, user_from, user_to, user_from_approved, user_to_approved, location_metadata, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING date_id`;
            const values = [
                dateEntry.date,
                (_a = dateEntry.time) !== null && _a !== void 0 ? _a : '',
                dateEntry.userFrom,
                dateEntry.userTo,
                dateEntry.userFromApproved,
                dateEntry.userToApproved,
                (_b = JSON.stringify(dateEntry.locationMetadata)) !== null && _b !== void 0 ? _b : '',
                (_c = dateEntry.status) !== null && _c !== void 0 ? _c : 'unscheduled',
            ];
            const row = yield db_1.default.query(query, values);
            const dateId = row.rows[0].date_id;
            return {
                dateId: dateId,
                date: dateEntry.date,
                time: (_d = dateEntry.time) !== null && _d !== void 0 ? _d : '',
                userFrom: dateEntry.userFrom,
                userTo: dateEntry.userTo,
                userFromApproved: (_e = dateEntry.userFromApproved) !== null && _e !== void 0 ? _e : false,
                userToApproved: (_f = dateEntry.userToApproved) !== null && _f !== void 0 ? _f : false,
                locationMetadata: (_g = dateEntry.locationMetadata) !== null && _g !== void 0 ? _g : null,
                status: (_h = dateEntry.status) !== null && _h !== void 0 ? _h : 'unscheduled',
            };
        });
    }
    getDateEntryByUserToUserFromAndDate(userTo, userFrom, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM dates WHERE user_to = $1 AND user_from = $2 AND date = $3`;
            const { rows } = yield db_1.default.query(query, [userTo, userFrom, date]);
            if (rows.length) {
                const row = rows[0];
                return {
                    dateId: row.date_id,
                    date: row.date,
                    time: row.time,
                    userFrom: row.user_from,
                    userTo: row.user_to,
                    userFromApproved: row.user_from_approved,
                    userToApproved: row.user_to_approved,
                    locationMetadata: row.location_metadata,
                    status: row.status,
                };
            }
            else {
                return null;
            }
        });
    }
    getDateEntryByUsersAndDate(user1, user2, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM dates WHERE (user_from = $1 AND user_to = $2 OR user_from = $2 AND user_to = $1) AND date = $3`;
            const { rows } = yield db_1.default.query(query, [user1, user2, date]);
            if (rows.length) {
                const row = rows[0];
                return {
                    dateId: row.date_id,
                    date: row.date,
                    time: row.time,
                    userFrom: row.user_from,
                    userTo: row.user_to,
                    userFromApproved: row.user_from_approved,
                    userToApproved: row.user_to_approved,
                    locationMetadata: row.location_metadata,
                    status: row.status,
                };
            }
            else {
                return null;
            }
        });
    }
    getDateEntryById(dateId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM dates WHERE date_id = $1`;
            const { rows } = yield db_1.default.query(query, [dateId]);
            if (rows.length) {
                const row = rows[0];
                return {
                    dateId: row.date_id,
                    date: row.date,
                    time: row.time,
                    userFrom: row.user_from,
                    userTo: row.user_to,
                    userFromApproved: row.user_from_approved,
                    userToApproved: row.user_to_approved,
                    locationMetadata: row.location_metadata,
                    status: row.status,
                };
            }
            else {
                return null;
            }
        });
    }
    getDateEntriesByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM dates WHERE user_from = $1 OR user_to = $1`;
            const { rows } = yield db_1.default.query(query, [userId]);
            return rows.map((row) => ({
                dateId: row.date_id,
                date: row.date,
                time: row.time,
                userFrom: row.user_from,
                userTo: row.user_to,
                userFromApproved: row.user_from_approved,
                userToApproved: row.user_to_approved,
                locationMetadata: row.location_metadata,
                status: row.status,
            }));
        });
    }
    updateDateEntry(dateId, dateEntry) {
        return __awaiter(this, void 0, void 0, function* () {
            // Build a dynamic query based on what fields are provided
            const fieldsToUpdate = [];
            const values = [];
            let queryIndex = 1;
            Object.entries(dateEntry).forEach(([key, value]) => {
                if (value !== undefined) {
                    const snakeCaseKey = humps.decamelize(key); // Convert key to snake case
                    fieldsToUpdate.push(`${snakeCaseKey} = $${queryIndex}`);
                    values.push(value);
                    queryIndex++;
                }
            });
            if (fieldsToUpdate.length === 0) {
                return null; // No fields to update
            }
            values.push(dateId); // For WHERE condition
            const query = `UPDATE dates SET ${fieldsToUpdate.join(', ')} WHERE date_id = $${queryIndex} RETURNING *`;
            const { rows } = yield db_1.default.query(query, values);
            if (rows.length) {
                const row = rows[0];
                return {
                    dateId: row.date_id,
                    date: row.date,
                    time: row.time,
                    userFrom: row.user_from,
                    userTo: row.user_to,
                    userFromApproved: row.user_from_approved,
                    userToApproved: row.user_to_approved,
                    locationMetadata: row.location_metadata, // Convert back to camel case
                    status: row.status,
                };
            }
            else {
                return null;
            }
        });
    }
    deleteDateEntry(dateId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `DELETE FROM dates WHERE date_id = $1`;
            yield db_1.default.query(query, [dateId]);
        });
    }
}
exports.default = DatesRepository;
