export declare const CONTACT_PATTERNS: Record<string, RegExp>;
export declare const CONTACT_MASK = "[iletisim bilgisi engellendi - sistem ici mesajlasma kullanin]";
export declare function detectContact(text: string): string[];
export declare function maskContact(text: string): string;
