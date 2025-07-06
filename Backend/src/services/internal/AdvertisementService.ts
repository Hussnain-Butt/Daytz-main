import { Advertisement } from '../../types/Advertisement';
import AdvertisementsRepository from '../../repository/AdvertisementsRepository';

// Note: This SVC is for persisting advertisements with a manual dev flow.
// After ad clients sign contracts, we will add them to DB manually which should (if implemented)
// flow in appropriately to users.
class AdvertisementService {
    private advertisementsRepository: AdvertisementsRepository;

    constructor() {
        this.advertisementsRepository = new AdvertisementsRepository();
    }

    async createAdvertisement(advertisement: Advertisement): Promise<void> {
        return this.advertisementsRepository.createAdvertisement(advertisement);
    }

    async getAdvertisementById(adId: number): Promise<Advertisement | null> {
        return this.advertisementsRepository.getAdvertisementById(adId);
    }

    async getAllAdvertisements(): Promise<Advertisement[]> {
        return this.advertisementsRepository.getAllAdvertisements();
    }

    async updateAdvertisement(adId: number, advertisement: Partial<Advertisement>): Promise<void> {
        return this.advertisementsRepository.updateAdvertisement(adId, advertisement);
    }

    async deleteAdvertisement(adId: number): Promise<void> {
        return this.advertisementsRepository.deleteAdvertisement(adId);
    }
}

export default AdvertisementService;
