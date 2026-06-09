import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';

export interface DnsRecordCheck {
  type: 'SPF' | 'DKIM' | 'DMARC' | 'MX' | 'A' | 'NS' | 'CNAME' | 'TXT';
  status: 'ok' | 'missing' | 'warn' | 'error';
  records: string[];
  message?: string;
}

export interface DnsHealthReport {
  domain: string;
  generatedAt: string;
  durationMs: number;
  score: number; // 0-100
  checks: DnsRecordCheck[];
}

const DEFAULT_TIMEOUT = 5_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('DNS timeout')), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

@Injectable()
export class DnsHealthService {
  private readonly logger = new Logger(DnsHealthService.name);

  async check(domain: string): Promise<DnsHealthReport> {
    const t0 = Date.now();
    const checks: DnsRecordCheck[] = [];

    // A
    try {
      const a = await withTimeout(dns.resolve4(domain), DEFAULT_TIMEOUT);
      checks.push({
        type: 'A',
        status: a.length > 0 ? 'ok' : 'missing',
        records: a,
      });
    } catch (e) {
      checks.push({
        type: 'A',
        status: 'error',
        records: [],
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // MX
    try {
      const mx = await withTimeout(dns.resolveMx(domain), DEFAULT_TIMEOUT);
      mx.sort((a, b) => a.priority - b.priority);
      const records = mx.map((m) => `${m.priority} ${m.exchange}`);
      checks.push({
        type: 'MX',
        status: records.length > 0 ? 'ok' : 'missing',
        records,
      });
    } catch (e) {
      checks.push({
        type: 'MX',
        status: 'error',
        records: [],
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // NS
    try {
      const ns = await withTimeout(dns.resolveNs(domain), DEFAULT_TIMEOUT);
      checks.push({
        type: 'NS',
        status: ns.length > 0 ? 'ok' : 'missing',
        records: ns,
      });
    } catch (e) {
      checks.push({
        type: 'NS',
        status: 'error',
        records: [],
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // TXT (general)
    let txtRecords: string[] = [];
    try {
      const txt = await withTimeout(dns.resolveTxt(domain), DEFAULT_TIMEOUT);
      txtRecords = txt.map((arr) => arr.join(''));
    } catch (e) {
      // Don't push — TXT used to derive SPF below.
      this.logger.debug(`TXT lookup failed: ${e instanceof Error ? e.message : e}`);
    }

    // SPF (derived from TXT)
    const spf = txtRecords.filter((t) => t.toLowerCase().startsWith('v=spf1'));
    checks.push({
      type: 'SPF',
      status: spf.length > 0 ? 'ok' : 'missing',
      records: spf,
      message: spf.length === 0 ? 'SPF kaydı bulunamadı (email deliverability düşer).' : undefined,
    });

    // DMARC (TXT on _dmarc.<domain>)
    try {
      const dmarcTxt = await withTimeout(
        dns.resolveTxt(`_dmarc.${domain}`),
        DEFAULT_TIMEOUT,
      );
      const dmarc = dmarcTxt
        .map((arr) => arr.join(''))
        .filter((t) => t.toLowerCase().startsWith('v=dmarc1'));
      checks.push({
        type: 'DMARC',
        status: dmarc.length > 0 ? 'ok' : 'missing',
        records: dmarc,
        message:
          dmarc.length === 0 ? '_dmarc TXT yok; phishing koruması zayıf.' : undefined,
      });
    } catch (e) {
      checks.push({
        type: 'DMARC',
        status: 'missing',
        records: [],
        message: 'DMARC TXT bulunamadı.',
      });
    }

    // DKIM (heuristic — Resend default selector)
    const dkimSelectors = ['resend', 'default', 'google', 'k1'];
    let dkimFound: string[] = [];
    for (const sel of dkimSelectors) {
      try {
        const dkim = await withTimeout(
          dns.resolveTxt(`${sel}._domainkey.${domain}`),
          DEFAULT_TIMEOUT,
        );
        const lines = dkim.map((arr) => arr.join(''));
        if (lines.length > 0) {
          dkimFound.push(`${sel}: ${lines[0].slice(0, 80)}…`);
        }
      } catch {
        // selector not found, skip
      }
    }
    checks.push({
      type: 'DKIM',
      status: dkimFound.length > 0 ? 'ok' : 'missing',
      records: dkimFound,
      message:
        dkimFound.length === 0
          ? 'DKIM selector taraması (resend/default/google/k1) sonuç vermedi.'
          : undefined,
    });

    // Score
    const okCount = checks.filter((c) => c.status === 'ok').length;
    const score = Math.round((okCount / checks.length) * 100);

    return {
      domain,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - t0,
      score,
      checks,
    };
  }
}
