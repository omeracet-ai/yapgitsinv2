import { QuestionsService } from './questions.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class QuestionsController {
    private readonly questionsService;
    constructor(questionsService: QuestionsService);
    getQuestions(jobId: string): Promise<{
        id: string;
        text: string;
        photoUrl: string | null;
        createdAt: Date;
        user: {
            id: string;
            fullName: string;
            profileImageUrl: string;
        } | null;
        replies: {
            id: string;
            text: string;
            createdAt: Date;
            user: {
                id: string;
                fullName: string;
                profileImageUrl: string;
            } | null;
        }[];
    }[]>;
    postQuestion(jobId: string, req: AuthenticatedRequest, text: string, photoUrl?: string): Promise<import("./job-question.entity").JobQuestion>;
    postReply(questionId: string, req: AuthenticatedRequest, text: string): Promise<import("./job-question-reply.entity").JobQuestionReply>;
}
