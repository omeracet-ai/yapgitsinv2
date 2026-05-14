export declare class Tenant {
    id: string;
    slug: string;
    brandName: string;
    subdomain: string | null;
    customDomain: string | null;
    theme: {
        primary?: string;
        accent?: string;
    } | null;
    defaultCurrency: string;
    defaultLocale: string;
    isActive: boolean;
    createdAt: Date;
}
