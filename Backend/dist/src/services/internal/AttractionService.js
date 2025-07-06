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
// File: src/services/internal/AttractionService.ts
const AttractionRepository_1 = __importDefault(require("../../repository/AttractionRepository"));
class AttractionService {
    constructor() {
        this.attractionRepository = new AttractionRepository_1.default();
        console.log('[AttractionService] AttractionRepository instantiated.');
    }
    calculateAttractionResultString(romanticAttraction, sexualAttraction, friendshipAttraction) {
        const R = romanticAttraction || 0;
        const S = sexualAttraction || 0;
        const F = friendshipAttraction || 0;
        const totalInterest = R + S + F;
        if (totalInterest === 0)
            return 'No Interest Expressed';
        if (R > 0 && S > 0 && F > 0)
            return 'The Full Package!';
        if (R > 0 && S > 0)
            return 'Romantic & Sexual Interest';
        if (R > 0 && F > 0)
            return 'Romantic Friendship Interest';
        if (S > 0 && F > 0)
            return 'Friends with Benefits Interest';
        if (R > 0)
            return 'Romantic Interest';
        if (S > 0)
            return 'Sexual Interest';
        if (F > 0)
            return 'Friendship Interest';
        return 'General Interest';
    }
    createAttraction(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[AttractionService] createAttraction called with payload:', payload);
            const creationPayloadWithDefaults = Object.assign(Object.assign({}, payload), { result: payload.result === undefined ? null : payload.result, firstMessageRights: payload.firstMessageRights === undefined ? null : payload.firstMessageRights });
            try {
                const newAttraction = yield this.attractionRepository.createAttraction(creationPayloadWithDefaults);
                if (!newAttraction) {
                    console.warn('[AttractionService] AttractionRepository.createAttraction returned null.');
                    throw new Error('Attraction creation failed in repository layer.');
                }
                console.log('[AttractionService] Attraction record created successfully:', newAttraction.attractionId);
                return newAttraction;
            }
            catch (error) {
                console.error('[AttractionService] Error creating attraction in repository:', error);
                throw error;
            }
        });
    }
    getAttraction(userFrom, userTo, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.attractionRepository.getAttraction(userFrom, userTo, date);
        });
    }
    getAttractionsByUserFrom(userFrom) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AttractionService] Getting attractions initiated by User: ${userFrom}`);
            return this.attractionRepository.getAttractionsByUserFrom(userFrom);
        });
    }
    getAttractionsByUserTo(userTo) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AttractionService] Getting attractions directed to User: ${userTo}`);
            return this.attractionRepository.getAttractionsByUserTo(userTo);
        });
    }
    getAttractionsByUserFromAndUserTo(userFrom, userTo) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.attractionRepository.getAttractionsByUserFromAndUserTo(userFrom, userTo);
            return result || [];
        });
    }
    getAttractionsBetweenTwoUsers(userOne, userTwo) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AttractionService] Getting all attractions between User: ${userOne} and User: ${userTwo}`);
            const attractionsOneToTwo = (yield this.attractionRepository.getAttractionsByUserFromAndUserTo(userOne, userTwo)) || [];
            const attractionsTwoToOne = (yield this.attractionRepository.getAttractionsByUserFromAndUserTo(userTwo, userOne)) || [];
            const allAttractions = [...attractionsOneToTwo, ...attractionsTwoToOne];
            const uniqueAttractionsMap = new Map();
            allAttractions.forEach((attr) => {
                if (attr.attractionId !== undefined) {
                    uniqueAttractionsMap.set(attr.attractionId, attr);
                }
            });
            return Array.from(uniqueAttractionsMap.values());
        });
    }
    determineMatchResult(attraction1, attraction2) {
        return __awaiter(this, void 0, void 0, function* () {
            const r1 = attraction1.romanticRating || 0;
            const s1 = attraction1.sexualRating || 0;
            const r2 = attraction2.romanticRating || 0;
            const s2 = attraction2.sexualRating || 0;
            if (r1 > 1 && r2 > 1)
                return true;
            if (r1 === 0 && r2 === 0 && s1 > 1 && s2 > 1)
                return true;
            return false;
        });
    }
    determineFirstMessageRights(attraction1, attraction2) {
        return __awaiter(this, void 0, void 0, function* () {
            if (attraction1.result !== true || attraction2.result !== true) {
                return null;
            }
            const sum1 = (attraction1.romanticRating || 0) +
                (attraction1.sexualRating || 0) +
                (attraction1.friendshipRating || 0);
            const sum2 = (attraction2.romanticRating || 0) +
                (attraction2.sexualRating || 0) +
                (attraction2.friendshipRating || 0);
            if (sum1 > sum2)
                return true;
            if (sum2 > sum1)
                return false;
            return Math.random() < 0.5;
        });
    }
    updateAttraction(attractionId, 
    // UPDATED TYPE: Allow updating more fields.
    // Omit fields that are typically not directly updatable or are identifiers.
    updates) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AttractionService] Updating attraction ID ${attractionId} with:`, JSON.stringify(updates, null, 2));
            if (!attractionId || isNaN(Number(attractionId))) {
                console.error('[AttractionService.updateAttraction] Invalid Attraction ID provided.');
                throw new Error('Valid Attraction ID is required for update.');
            }
            // Optional: Add more specific validation for incoming update values if needed
            // e.g., ensuring ratings are within bounds if they are being updated.
            // Ensure your repository method can handle these new fields in `updates`
            return this.attractionRepository.updateAttraction(Number(attractionId), updates);
        });
    }
}
exports.default = AttractionService;
