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
class UserTutorialsRepository {
    createUserTutorial(userTutorial) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `INSERT INTO user_tutorials (user_id, tutorial_id, shown) VALUES ($1, $2, $3)`;
            const values = [userTutorial.userId, userTutorial.tutorialId, userTutorial.shown];
            yield db_1.default.query(query, values);
        });
    }
    getUserTutorialsByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM user_tutorials WHERE user_id = $1`;
            const { rows } = yield db_1.default.query(query, [userId]);
            return rows.map((row) => {
                return {
                    userTutorialId: row.user_tutorial_id,
                    userId: row.user_id,
                    tutorialId: row.tutorial_id,
                    shown: row.shown,
                };
            });
        });
    }
    updateUserTutorialShown(userTutorialId, shown) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `UPDATE user_tutorials SET shown = $2 WHERE user_tutorial_id = $1`;
            yield db_1.default.query(query, [userTutorialId, shown]);
        });
    }
    deleteUserTutorial(userTutorialId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `DELETE FROM user_tutorials WHERE user_tutorial_id = $1`;
            yield db_1.default.query(query, [userTutorialId]);
        });
    }
}
exports.default = UserTutorialsRepository;
