import { UserTutorial } from '../../types/UserTutorials';
import UserTutorialsRepository from '../../repository/UserTutorialsRepository';

class UserTutorialService {
    private userTutorialsRepository: UserTutorialsRepository;

    constructor() {
        this.userTutorialsRepository = new UserTutorialsRepository();
    }

    async createUserTutorial(userTutorial: UserTutorial): Promise<void> {
        return this.userTutorialsRepository.createUserTutorial(userTutorial);
    }

    async getUserTutorialsByUserId(userId: string): Promise<UserTutorial[]> {
        return this.userTutorialsRepository.getUserTutorialsByUserId(userId);
    }

    async updateUserTutorialShown(userTutorialId: number, shown: boolean): Promise<void> {
        return this.userTutorialsRepository.updateUserTutorialShown(userTutorialId, shown);
    }

    async deleteUserTutorial(userTutorialId: number): Promise<void> {
        return this.userTutorialsRepository.deleteUserTutorial(userTutorialId);
    }
}

export default UserTutorialService;
