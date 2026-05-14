export declare class CreateJobTemplateDto {
    name: string;
    title: string;
    description: string;
    category: string;
    categoryId?: string;
    location: string;
    budgetMin?: number;
    budgetMax?: number;
    photos?: string[];
}
declare const UpdateJobTemplateDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateJobTemplateDto>>;
export declare class UpdateJobTemplateDto extends UpdateJobTemplateDto_base {
}
export {};
