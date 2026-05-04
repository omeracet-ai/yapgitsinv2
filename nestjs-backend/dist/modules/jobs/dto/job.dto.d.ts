import { JobStatus } from '../job.entity';
export declare class CreateJobDto {
    title: string;
    description: string;
    category: string;
    location: string;
    budgetMin?: number;
    budgetMax?: number;
    photos?: string[];
}
export declare class UpdateJobDto {
    title?: string;
    description?: string;
    location?: string;
    status?: JobStatus;
}
