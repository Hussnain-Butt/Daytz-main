"use strict";
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
class AdvertisementsRepository {
    createAdvertisement(advertisement) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `INSERT INTO advertisements (video_url, metadata) VALUES ($1, $2)`;
            const values = [advertisement.videoUrl, JSON.stringify(advertisement.metadata)];
            yield db_1.default.query(query, values);
        });
    }
    getAdvertisementById(adId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM advertisements WHERE ad_id = $1`;
            const { rows } = yield db_1.default.query(query, [adId]);
            if (rows.length) {
                const row = rows[0];
                return {
                    adId: row.ad_id,
                    videoUrl: row.video_url,
                    metadata: row.metadata, // Assuming metadata is stored as JSON and automatically parsed by your DB driver
                };
            }
            else {
                return null;
            }
        });
    }
    getAllAdvertisements() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM advertisements ORDER BY ad_id ASC`;
            const { rows } = yield db_1.default.query(query);
            return rows.map((row) => ({
                adId: row.ad_id,
                videoUrl: row.video_url,
                metadata: row.metadata,
            }));
        });
    }
    updateAdvertisement(adId, advertisement) {
        return __awaiter(this, void 0, void 0, function* () {
            // Dynamically build query based on provided fields to update
            const fieldsToUpdate = [];
            const values = [];
            let queryIndex = 1;
            Object.entries(advertisement).forEach(([key, value]) => {
                if (value !== undefined) {
                    fieldsToUpdate.push(`${key} = $${queryIndex}`);
                    values.push(value);
                    queryIndex++;
                }
            });
            values.push(adId); // For WHERE condition
            const query = `UPDATE advertisements SET ${fieldsToUpdate.join(', ')} WHERE ad_id = $${queryIndex}`;
            yield db_1.default.query(query, values);
        });
    }
    deleteAdvertisement(adId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `DELETE FROM advertisements WHERE ad_id = $1`;
            yield db_1.default.query(query, [adId]);
        });
    }
}
exports.default = AdvertisementsRepository;
