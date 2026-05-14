import type { AuthenticatedRequest } from '../../common/types/auth.types';
import { UploadsService } from './uploads.service';
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    uploadCompletionPhotos(jobId: string, files: Express.Multer.File[], req: AuthenticatedRequest): Promise<{
        photos: string[];
    }>;
    uploadJobPhotos(files: any[], req: any): Promise<string[]>;
    uploadJobVideos(files: any[], req: any): Promise<string[]>;
    uploadPortfolioPhoto(file: any, req: any): Promise<{
        url: string;
    }>;
    uploadPortfolioVideo(file: any, req: any): Promise<{
        url: string;
    }>;
    uploadIntroVideo(file: any, req: any): Promise<{
        url: string;
        duration?: number;
    }>;
    uploadProfilePhoto(file: any, req: any): Promise<{
        url: string;
    }>;
    uploadProfileVideo(file: any, req: any): Promise<{
        url: string;
        duration?: number;
    }>;
    uploadIdentityPhoto(file: any, req: any): Promise<{
        url: string;
    }>;
    uploadOnboardingImage(file: any, req: any): Promise<{
        url: string;
    }>;
    uploadChatAttachment(file: any, req: any): Promise<{
        url: string;
        type: 'image' | 'document';
        name: string;
        size: number;
    }>;
    uploadChatAudio(file: any, req: any): Promise<{
        url: string;
        type: 'audio';
        name: string;
        size: number;
        duration?: number;
    }>;
    uploadCertification(file: any, req: any): Promise<{
        url: string;
        name: string;
        size: number;
    }>;
    uploadDocument(file: any, req: any): Promise<{
        url: string;
    }>;
}
