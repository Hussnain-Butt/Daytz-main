import { Tutorial } from '../../types/Tutorial';
import TutorialRepository from '../../repository/TutorialsRepository';

class TutorialService {
    tutorialRepository: TutorialRepository;

    constructor() {
        this.tutorialRepository = new TutorialRepository();
    }

    async createTutorial(tutorial: Tutorial): Promise<void> {
        return this.tutorialRepository.createTutorial(tutorial);
    }

    async getTutorialById(tutorialId: number): Promise<Tutorial | null> {
        return this.tutorialRepository.getTutorialById(tutorialId);
    }

    async getAllTutorials(): Promise<Tutorial[]> {
        return this.tutorialRepository.getAllTutorials();
    }

    async updateTutorial(tutorialId: number, tutorial: Partial<Tutorial>): Promise<void> {
        return this.tutorialRepository.updateTutorial(tutorialId, tutorial);
    }

    async deleteTutorial(tutorialId: number): Promise<void> {
        return this.tutorialRepository.deleteTutorial(tutorialId);
    }
}

export default TutorialService;
