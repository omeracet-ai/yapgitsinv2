import { JobQuestion } from './job-question.entity';
import { User } from '../users/user.entity';
export declare class JobQuestionReply {
    id: string;
    questionId: string;
    question: JobQuestion;
    userId: string;
    user: User;
    text: string;
    createdAt: Date;
}
