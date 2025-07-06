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
const DatesRepository_1 = __importDefault(require("../../repository/DatesRepository"));
class DateService {
    constructor() {
        this.dateRepository = new DatesRepository_1.default();
    }
    updateDateEntry(dateId, partialDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingDate = yield this.dateRepository.getDateEntryById(dateId);
            if (!existingDate) {
                return null;
            }
            // Determine the new status based on the updated fields
            const newStatus = this.determineStatus(existingDate, partialDate);
            // Merge existing date with partial updates and new status
            const updatedDate = Object.assign(Object.assign(Object.assign({}, existingDate), partialDate), { status: newStatus });
            // Update the date entry in the repository
            return yield this.dateRepository.updateDateEntry(dateId, updatedDate);
        });
    }
    determineStatus(existingDate, partialDate) {
        if (partialDate.status === 'cancelled') {
            return 'cancelled';
        }
        // If userFromApproved is undefined in the partialDate, default to the existing value
        if (partialDate.userFromApproved === undefined || partialDate.userFromApproved === null) {
            partialDate.userFromApproved = existingDate.userFromApproved;
        }
        // If userToApproved is undefined in the partialDate, default to the existing value
        if (partialDate.userToApproved === undefined || partialDate.userToApproved === null) {
            partialDate.userToApproved = existingDate.userToApproved;
        }
        if (partialDate.userFromApproved && partialDate.userToApproved) {
            return 'completed';
        }
        if (partialDate.userFromApproved || partialDate.userToApproved) {
            return 'pending';
        }
        return existingDate.status;
    }
    createDateEntry(dateEntry) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dateRepository.createDateEntry(dateEntry);
        });
    }
    getDateEntryById(dateId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dateRepository.getDateEntryById(dateId);
        });
    }
    getDateEntryByUserToUserFromAndDate(userTo, userFrom, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dateRepository.getDateEntryByUserToUserFromAndDate(userTo, userFrom, date);
        });
    }
    getDateEntryByUsersAndDate(user1, user2, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dateRepository.getDateEntryByUsersAndDate(user1, user2, date);
        });
    }
    getDateEntriesByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dateRepository.getDateEntriesByUserId(userId);
        });
    }
    deleteDateEntry(dateId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dateRepository.deleteDateEntry(dateId);
        });
    }
}
exports.default = DateService;
