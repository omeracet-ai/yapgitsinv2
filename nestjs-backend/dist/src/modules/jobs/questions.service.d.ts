import { Repository } from 'typeorm';
import { JobQuestion } from './job-question.entity';
import { JobQuestionReply } from './job-question-reply.entity';
import { Offer } from './offer.entity';
import { Job } from './job.entity';
import { ContentFilterService } from '../moderation/content-filter.service';
export declare class QuestionsService {
    private questionsRepo;
    private repliesRepo;
    private offersRepo;
    private jobsRepo;
    private filter;
    constructor(questionsRepo: Repository<JobQuestion>, repliesRepo: Repository<JobQuestionReply>, offersRepo: Repository<Offer>, jobsRepo: Repository<Job>, filter: ContentFilterService);
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
    postQuestion(jobId: string, userId: string, text: string, photoUrl?: string): Promise<JobQuestion>;
    postReply(questionId: string, userId: string, text: string): Promise<JobQuestionReply>;
}
