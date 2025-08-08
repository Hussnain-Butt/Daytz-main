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
class TutorialsRepository {
    createTutorial(tutorial) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `INSERT INTO tutorials (video_url, description) VALUES ($1, $2)`;
            const values = [tutorial.videoUrl, tutorial.description];
            yield db_1.default.query(query, values);
        });
    }
    getTutorialById(tutorialId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM tutorials WHERE tutorial_id = $1`;
            const { rows } = yield db_1.default.query(query, [tutorialId]);
            if (rows.length) {
                const row = rows[0];
                return {
                    tutorialId: row.tutorial_id,
                    videoUrl: row.video_url,
                    description: row.description,
                };
            }
            else {
                return null;
            }
        });
    }
    getAllTutorials() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM tutorials ORDER BY tutorial_id ASC`;
            const { rows } = yield db_1.default.query(query);
            return rows.map((row) => ({
                tutorialId: row.tutorial_id,
                videoUrl: row.video_url,
                description: row.description,
            }));
        });
    }
    updateTutorial(tutorialId, tutorial) {
        return __awaiter(this, void 0, void 0, function* () {
            // Dynamically build query based on provided fields to update
            const fieldsToUpdate = [];
            const values = [];
            let queryIndex = 1;
            Object.entries(tutorial).forEach(([key, value]) => {
                if (value !== undefined) {
                    fieldsToUpdate.push(`${key} = $${queryIndex}`);
                    values.push(value);
                    queryIndex++;
                }
            });
            values.push(tutorialId); // For WHERE condition
            const query = `UPDATE tutorials SET ${fieldsToUpdate.join(', ')} WHERE tutorial_id = $${queryIndex}`;
            yield db_1.default.query(query, values);
        });
    }
    deleteTutorial(tutorialId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `DELETE FROM tutorials WHERE tutorial_id = $1`;
            yield db_1.default.query(query, [tutorialId]);
        });
    }
}
exports.default = TutorialsRepository;
