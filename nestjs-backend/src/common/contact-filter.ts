export const CONTACT_PATTERNS: Record<string, RegExp> = {
  phone_tr: /(?:\+?90|0)?\s*5\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2}/g,
  email: /[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g,
  whatsapp: /(wa\.me|api\.whatsapp\.com|whatsapp\.com\/send)/gi,
  telegram: /(t\.me\/|telegram\.me\/|@\w{5,})/gi,
  instagram: /(instagram\.com\/|@[a-z0-9_.]{4,})/gi,
};

export const CONTACT_MASK =
  '[iletisim bilgisi engellendi - sistem ici mesajlasma kullanin]';

export function detectContact(text: string): string[] {
  if (!text) return [];
  const matched: string[] = [];
  for (const [name, pattern] of Object.entries(CONTACT_PATTERNS)) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) matched.push(name);
  }
  return matched;
}

export function maskContact(text: string): string {
  if (!text) return text;
  let out = text;
  for (const pattern of Object.values(CONTACT_PATTERNS)) {
    out = out.replace(pattern, CONTACT_MASK);
  }
  return out;
}
