"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentFilterService = void 0;
const common_1 = require("@nestjs/common");
let ContentFilterService = class ContentFilterService {
    badWords = [
        'amk', 'aq', 'amq', 'siktir', 'sikeyim', 'sikiyim', 'sik', 'orospu',
        'oç', 'piç', 'pic', 'pezevenk', 'göt', 'got', 'yarrak', 'yarak',
        'salak', 'aptal', 'gerizekalı', 'gerizekali', 'mal', 'şerefsiz',
        'serefsiz', 'kahpe', 'ananı', 'anani', 'ananizi', 'babanı', 'babani',
        'ibne', 'puşt', 'pust', 'dingil', 'kaltak', 'sürtük', 'surtuk',
        'göt verici', 'amına', 'amina', 'sikim',
        'fuck', 'shit', 'bitch', 'asshole', 'dick', 'cunt', 'bastard',
        'motherfucker', 'pussy',
    ];
    contactPatterns = [
        /\b0\d{10}\b/,
        /\b\+90\s?\d{10}\b/,
        /\b5\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/,
        /\S+@\S+\.\S+/,
        /\bins?ta(?:gram)?:?\s*@?\w+/i,
        /\bwhats(?:app)?:?\s*\+?\d/i,
        /\btelegram:?\s*@?\w+/i,
        /\b(?:facebook|fb|twitter|tiktok)[:\s]+@?\w+/i,
    ];
    check(text) {
        const reasons = [];
        if (!text)
            return { flagged: false, reasons };
        const lower = text.toLowerCase();
        for (const w of this.badWords) {
            if (lower.includes(w.toLowerCase())) {
                reasons.push('profanity');
                break;
            }
        }
        for (const re of this.contactPatterns) {
            if (re.test(text)) {
                reasons.push('contact_info');
                break;
            }
        }
        return { flagged: reasons.length > 0, reasons };
    }
    sanitize(text) {
        if (!text)
            return text;
        let out = text;
        for (const w of this.badWords) {
            const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(escaped, 'gi');
            out = out.replace(re, '*'.repeat(Math.max(3, w.length)));
        }
        for (const re of this.contactPatterns) {
            const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
            out = out.replace(g, '[gizlendi]');
        }
        return out;
    }
};
exports.ContentFilterService = ContentFilterService;
exports.ContentFilterService = ContentFilterService = __decorate([
    (0, common_1.Injectable)()
], ContentFilterService);
//# sourceMappingURL=content-filter.service.js.map