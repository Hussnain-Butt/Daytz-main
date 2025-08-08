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
const AdvertisementsRepository_1 = __importDefault(require("../../repository/AdvertisementsRepository"));
// Note: This SVC is for persisting advertisements with a manual dev flow.
// After ad clients sign contracts, we will add them to DB manually which should (if implemented)
// flow in appropriately to users.
class AdvertisementService {
    constructor() {
        this.advertisementsRepository = new AdvertisementsRepository_1.default();
    }
    createAdvertisement(advertisement) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.advertisementsRepository.createAdvertisement(advertisement);
        });
    }
    getAdvertisementById(adId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.advertisementsRepository.getAdvertisementById(adId);
        });
    }
    getAllAdvertisements() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.advertisementsRepository.getAllAdvertisements();
        });
    }
    updateAdvertisement(adId, advertisement) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.advertisementsRepository.updateAdvertisement(adId, advertisement);
        });
    }
    deleteAdvertisement(adId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.advertisementsRepository.deleteAdvertisement(adId);
        });
    }
}
exports.default = AdvertisementService;
