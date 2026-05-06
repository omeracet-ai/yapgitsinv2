import { JobStatus } from '../job.entity';
export declare class CreateJobDto {
    title: string;
    description: string;
    category: string;
    location: string;
    budgetMin?: number;
    budgetMax?: number;
    dueDate?: string;
    photos?: string[];
    videos?: string[];
}
export declare class UpdateJobDto {
    title?: string;
    description?: string;
    location?: string;
    status?: JobStatus;
    dueDate?: string;
    photos?: string[];
    videos?: string[];
}
