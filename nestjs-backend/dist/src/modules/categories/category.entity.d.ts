export declare const CATEGORY_GROUPS: {
    readonly EV_YASAM: "Ev & Yaşam";
    readonly YAPI: "Yapı & Tesisat";
    readonly DIJITAL: "Dijital & Teknik";
    readonly ETKINLIK: "Etkinlik & Yaşam";
    readonly ARAC: "Araç & Taşıt";
};
export type CategoryGroup = (typeof CATEGORY_GROUPS)[keyof typeof CATEGORY_GROUPS];
export declare class Category {
    id: string;
    name: string;
    icon: string;
    description: string;
    group: string | null;
    subServices: string[] | null;
    avgPriceMin: number | null;
    avgPriceMax: number | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
