import { Injectable } from '@nestjs/common';

export interface FilterResult {
  flagged: boolean;
  reasons: string[];
}

@Injectable()
export class ContentFilterService {
  private readonly badWords: string[] = [
    // TR
    'amk', 'aq', 'amq', 'siktir', 'sikeyim', 'sikiyim', 'sik', 'orospu',
    'oç', 'piç', 'pic', 'pezevenk', 'göt', 'got', 'yarrak', 'yarak',
    'salak', 'aptal', 'gerizekalı', 'gerizekali', 'mal', 'şerefsiz',
    'serefsiz', 'kahpe', 'ananı', 'anani', 'ananizi', 'babanı', 'babani',
    'ibne', 'puşt', 'pust', 'dingil', 'kaltak', 'sürtük', 'surtuk',
    'göt verici', 'amına', 'amina', 'sikim',
    // EN
    'fuck', 'shit', 'bitch', 'asshole', 'dick', 'cunt', 'bastard',
    'motherfucker', 'pussy',
  ];

  private readonly contactPatterns: RegExp[] = [
    /\b0\d{10}\b/,
    /\b\+90\s?\d{10}\b/,
    /\b5\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/,
    /\S+@\S+\.\S+/,
    /\bins?ta(?:gram)?:?\s*@?\w+/i,
    /\bwhats(?:app)?:?\s*\+?\d/i,
    /\btelegram:?\s*@?\w+/i,
    /\b(?:facebook|fb|twitter|tiktok)[:\s]+@?\w+/i,
  ];

  check(text: string): FilterResult {
    const reasons: string[] = [];
    if (!text) return { flagged: false, reasons };
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

  sanitize(text: string): string {
    if (!text) return text;
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
}
