"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTACT_MASK = exports.CONTACT_PATTERNS = void 0;
exports.detectContact = detectContact;
exports.maskContact = maskContact;
exports.CONTACT_PATTERNS = {
    phone_tr: /(?:\+?90|0)?\s*5\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2}/g,
    email: /[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g,
    whatsapp: /(wa\.me|api\.whatsapp\.com|whatsapp\.com\/send)/gi,
    telegram: /(t\.me\/|telegram\.me\/|@\w{5,})/gi,
    instagram: /(instagram\.com\/|@[a-z0-9_.]{4,})/gi,
};
exports.CONTACT_MASK = '[iletisim bilgisi engellendi - sistem ici mesajlasma kullanin]';
function detectContact(text) {
    if (!text)
        return [];
    const matched = [];
    for (const [name, pattern] of Object.entries(exports.CONTACT_PATTERNS)) {
        pattern.lastIndex = 0;
        if (pattern.test(text))
            matched.push(name);
    }
    return matched;
}
function maskContact(text) {
    if (!text)
        return text;
    let out = text;
    for (const pattern of Object.values(exports.CONTACT_PATTERNS)) {
        out = out.replace(pattern, exports.CONTACT_MASK);
    }
    return out;
}
//# sourceMappingURL=contact-filter.js.map