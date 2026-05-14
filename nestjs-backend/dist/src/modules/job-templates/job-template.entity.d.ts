export declare class JobTemplate {
    id: string;
    userId: string;
    name: string;
    title: string;
    description: string;
    category: string;
    categoryId: string | null;
    location: string;
    budgetMin: number | null;
    budgetMax: number | null;
    photos: string[] | null;
    useCount: number;
    createdAt: Date;
    updatedAt: Date;
}
