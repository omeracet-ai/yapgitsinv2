import { Repository } from 'typeorm';
import { JobQuestion } from './job-question.entity';
import { JobQuestionReply } from './job-question-reply.entity';
import { Offer } from './offer.entity';
import { Job } from './job.entity';
export declare class QuestionsService {
    private questionsRepo;
    private repliesRepo;
    private offersRepo;
    private jobsRepo;
    constructor(questionsRepo: Repository<JobQuestion>, repliesRepo: Repository<JobQuestionReply>, offersRepo: Repository<Offer>, jobsRepo: Repository<Job>);
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
