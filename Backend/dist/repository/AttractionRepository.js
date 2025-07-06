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
// File: src/repository/AttractionRepository.ts
const db_1 = __importDefault(require("../db")); // Adjust path to your DB connection pool
const humps = __importStar(require("humps"));
// Helper to map DB row to Attraction object
const mapRowToAttraction = (row) => {
    if (!row)
        return null;
    const camelized = humps.camelizeKeys(row);
    return {
        attractionId: parseInt(camelized.attractionId, 10),
        userFrom: camelized.userFrom,
        userTo: camelized.userTo,
        date: camelized.date,
        romanticRating: camelized.romanticRating !== null && camelized.romanticRating !== undefined
            ? parseInt(camelized.romanticRating, 10)
            : null,
        sexualRating: camelized.sexualRating !== null && camelized.sexualRating !== undefined
            ? parseInt(camelized.sexualRating, 10)
            : null,
        friendshipRating: camelized.friendshipRating !== null && camelized.friendshipRating !== undefined
            ? parseInt(camelized.friendshipRating, 10)
            : null,
        longTermPotential: typeof camelized.longTermPotential === 'boolean' ? camelized.longTermPotential : null,
        intellectual: typeof camelized.intellectual === 'boolean' ? camelized.intellectual : null,
        emotional: typeof camelized.emotional === 'boolean' ? camelized.emotional : null,
        result: typeof camelized.result === 'boolean' ? camelized.result : null,
        firstMessageRights: typeof camelized.firstMessageRights === 'boolean' ? camelized.firstMessageRights : null,
        createdAt: camelized.createdAt ? new Date(camelized.createdAt) : undefined,
        updatedAt: camelized.updatedAt ? new Date(camelized.updatedAt) : undefined,
    };
};
class AttractionRepository {
    createAttraction(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[AttractionRepository] createAttraction with payload:', JSON.stringify(payload, null, 2));
            // SIMPLIFIED INSERT:
            // Assumes 'created_at' has a DB default (e.g., DEFAULT NOW())
            // Assumes 'updated_at' will be set on creation by the DB (e.g., same default or a trigger)
            // OR if using Prisma, @default(now()) and @updatedAt handle these.
            // We do NOT pass createdAt or updatedAt from the payload.
            const query = `
      INSERT INTO attraction (
        user_from, user_to, date, 
        romantic_rating, sexual_rating, friendship_rating,
        long_term_potential, intellectual, emotional,
        result, first_message_rights
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
            const values = [
                payload.userFrom,
                payload.userTo,
                payload.date,
                payload.romanticRating,
                payload.sexualRating,
                payload.friendshipRating,
                payload.longTermPotential,
                payload.intellectual,
                payload.emotional,
                payload.result,
                payload.firstMessageRights,
            ];
            try {
                const { rows } = yield db_1.default.query(query, values);
                return rows.length > 0 ? mapRowToAttraction(rows[0]) : null;
            }
            catch (error) {
                console.error('[AttractionRepository] Error in createAttraction:', error);
                throw error;
            }
        });
    }
    getAttraction(userFrom, userTo, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM attraction
      WHERE user_from = $1 AND user_to = $2 AND date = $3;
    `;
            try {
                const { rows } = yield db_1.default.query(query, [userFrom, userTo, date]);
                return rows.length > 0 ? mapRowToAttraction(rows[0]) : null;
            }
            catch (error) {
                console.error('[AttractionRepository] Error in getAttraction:', error);
                throw error;
            }
        });
    }
    getAttractionsByUserFrom(userFrom) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM attraction WHERE user_from = $1 ORDER BY date DESC;`;
            try {
                const { rows } = yield db_1.default.query(query, [userFrom]);
                return rows.map(mapRowToAttraction).filter((a) => a !== null);
            }
            catch (error) {
                console.error('[AttractionRepository] Error in getAttractionsByUserFrom:', error);
                throw error;
            }
        });
    }
    getAttractionsByUserTo(userTo) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM attraction WHERE user_to = $1 ORDER BY date DESC;`;
            try {
                const { rows } = yield db_1.default.query(query, [userTo]);
                return rows.map(mapRowToAttraction).filter((a) => a !== null);
            }
            catch (error) {
                console.error('[AttractionRepository] Error in getAttractionsByUserTo:', error);
                throw error;
            }
        });
    }
    getAttractionsByUserFromAndUserTo(userFrom, userTo) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM attraction
      WHERE user_from = $1 AND user_to = $2 
      ORDER BY date DESC;
    `;
            try {
                const { rows } = yield db_1.default.query(query, [userFrom, userTo]);
                return rows.map(mapRowToAttraction).filter((a) => a !== null);
            }
            catch (error) {
                console.error('[AttractionRepository] Error in getAttractionsByUserFromAndUserTo:', error);
                throw error;
            }
        });
    }
    getAllAttractions() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM attraction ORDER BY created_at DESC;`;
            try {
                const { rows } = yield db_1.default.query(query);
                return rows.map(mapRowToAttraction).filter((a) => a !== null);
            }
            catch (error) {
                console.error('[AttractionRepository] Error in getAllAttractions:', error);
                throw error;
            }
        });
    }
    updateAttraction(attractionId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AttractionRepository] updateAttraction ID ${attractionId} with:`, JSON.stringify(updates, null, 2));
            const fieldsToUpdate = [];
            const values = [];
            let queryIndex = 1;
            const allowedUpdateKeys = [
                'romanticRating',
                'sexualRating',
                'friendshipRating',
                'longTermPotential',
                'intellectual',
                'emotional',
                'result',
                'firstMessageRights',
            ];
            for (const key of allowedUpdateKeys) {
                if (updates[key] !== undefined) {
                    fieldsToUpdate.push(`${humps.decamelize(key)} = $${queryIndex}`);
                    values.push(updates[key]);
                    queryIndex++;
                }
            }
            if (fieldsToUpdate.length === 0) {
                console.warn('[AttractionRepository] updateAttraction: No fields provided in the updates object that are allowed or defined.');
                const currentAttractionQuery = `SELECT * FROM attraction WHERE attraction_id = $1;`;
                try {
                    const { rows } = yield db_1.default.query(currentAttractionQuery, [attractionId]);
                    return rows.length > 0 ? mapRowToAttraction(rows[0]) : null;
                }
                catch (error) {
                    console.error('[AttractionRepository] Error fetching current attraction after no-op update attempt:', error);
                    throw error;
                }
            }
            values.push(attractionId);
            // Ensure your 'attraction' table has an 'updated_at' column
            // If using Prisma with @updatedAt, Prisma handles this, and you might not need to set it explicitly in SQL.
            // If using raw SQL and the column exists, setting it to NOW() is correct.
            const query = `
      UPDATE attraction
      SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() 
      WHERE attraction_id = $${queryIndex}
      RETURNING *;
    `;
            try {
                const { rows } = yield db_1.default.query(query, values);
                if (rows.length > 0) {
                    console.log(`[AttractionRepository] Attraction ID ${attractionId} updated successfully.`);
                    return mapRowToAttraction(rows[0]);
                }
                else {
                    console.warn(`[AttractionRepository] No attraction found with ID ${attractionId} to update, or update yielded no return.`);
                    return null;
                }
            }
            catch (error) {
                console.error('[AttractionRepository] Error in updateAttraction query execution:', error);
                throw error;
            }
        });
    }
}
exports.default = AttractionRepository;
