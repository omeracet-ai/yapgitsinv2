export declare class UploadsController {
    uploadJobPhotos(files: any[], req: any): Promise<string[]>;
    uploadJobVideos(files: any[], req: any): Promise<string[]>;
    uploadIdentityPhoto(file: any, req: any): Promise<{
        url: string;
    }>;
    uploadOnboardingImage(file: any, req: any): Promise<{
        url: string;
    }>;
    uploadDocument(file: any, req: any): Promise<{
        url: string;
    }>;
}
