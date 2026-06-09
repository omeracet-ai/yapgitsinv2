import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { User } from '../../users/user.entity';
import { Job } from '../../jobs/job.entity';
import { ServiceRequest } from '../../service-requests/service-request.entity';
import { Category } from '../../categories/category.entity';

export interface QualityIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  count: number;
  sampleIds?: string[];
  fixHint?: string;
}

export interface QualityCheckResult {
  generatedAt: string;
  totalIssues: number;
  bySeverity: { high: number; medium: number; low: number };
  score: number; // 0-100 — 100 = clean
  issues: QualityIssue[];
}

@Injectable()
export class QualityCheckService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(ServiceRequest)
    private readonly srs: Repository<ServiceRequest>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async run(): Promise<QualityCheckResult> {
    const issues: QualityIssue[] = [];

    // ── Categories: missing icon / description ───────────────────────────
    const noIcon = await this.categories
      .createQueryBuilder('c')
      .where("c.icon IS NULL OR c.icon = ''")
      .getMany();
    if (noIcon.length > 0) {
      issues.push({
        type: 'category.missing_icon',
        severity: 'medium',
        title: 'Kategoriler — eksik ikon',
        description: 'Bazı kategorilerin emoji/ikon alanı boş.',
        count: noIcon.length,
        sampleIds: noIcon.slice(0, 5).map((c) => c.id),
        fixHint: '/categories sayfasından kategori düzenle → ikon ekle.',
      });
    }

    const noDesc = await this.categories
      .createQueryBuilder('c')
      .where("c.description IS NULL OR c.description = ''")
      .getMany();
    if (noDesc.length > 0) {
      issues.push({
        type: 'category.missing_description',
        severity: 'low',
        title: 'Kategoriler — eksik açıklama',
        description: 'Açıklama alanı boş kategoriler SEO için zayıf.',
        count: noDesc.length,
        sampleIds: noDesc.slice(0, 5).map((c) => c.id),
        fixHint: '/categories sayfasından kategori düzenle → açıklama yaz.',
      });
    }

    // ── Users: missing profile image ──────────────────────────────────────
    const userTotal = await this.users.count();
    const userNoAvatar = await this.users
      .createQueryBuilder('u')
      .where("u.profileImageUrl IS NULL OR u.profileImageUrl = ''")
      .getCount();
    if (userTotal > 0 && userNoAvatar / userTotal > 0.5) {
      issues.push({
        type: 'user.missing_avatar_majority',
        severity: 'low',
        title: 'Kullanıcı profil fotoğrafları büyük oranda eksik',
        description: `${userNoAvatar}/${userTotal} kullanıcının avatar URL'i boş (>%50).`,
        count: userNoAvatar,
        fixHint: 'Onboarding akışına avatar yükleme zorunluluğu eklenebilir.',
      });
    }

    // Providers (workerCategories set) without bio
    const providerNoBio = await this.users
      .createQueryBuilder('u')
      .where("u.workerCategories IS NOT NULL AND u.workerCategories != ''")
      .andWhere("(u.workerBio IS NULL OR u.workerBio = '')")
      .getMany();
    if (providerNoBio.length > 0) {
      issues.push({
        type: 'provider.missing_bio',
        severity: 'medium',
        title: 'Hizmet verenler — eksik bio',
        description:
          'Hizmet sağlayıcısı olan kullanıcıların bio alanı boş; profil dönüşümü düşer.',
        count: providerNoBio.length,
        sampleIds: providerNoBio.slice(0, 5).map((u) => u.id),
        fixHint: 'Kullanıcılara bio ekleme bildirimi gönderilebilir.',
      });
    }

    // ── Jobs: open with no photos ────────────────────────────────────────
    const jobsNoPhotos = await this.jobs
      .createQueryBuilder('j')
      .where("j.status = 'open'")
      .andWhere("(j.photos IS NULL OR j.photos = '' OR j.photos = '[]')")
      .getMany();
    if (jobsNoPhotos.length > 0) {
      issues.push({
        type: 'job.open_no_photos',
        severity: 'low',
        title: 'Açık ilanlar — fotoğrafsız',
        description:
          'Açık iş ilanlarının bir kısmında hiç fotoğraf yok; teklif almayı azaltır.',
        count: jobsNoPhotos.length,
        sampleIds: jobsNoPhotos.slice(0, 5).map((j) => j.id),
        fixHint: 'Mobil uygulamada fotoğraf yükleme prompt güçlendirilebilir.',
      });
    }

    // ── Jobs: open with no location ──────────────────────────────────────
    const jobsNoLoc = await this.jobs
      .createQueryBuilder('j')
      .where("j.status = 'open'")
      .andWhere("(j.location IS NULL OR j.location = '')")
      .getCount();
    if (jobsNoLoc > 0) {
      issues.push({
        type: 'job.open_no_location',
        severity: 'medium',
        title: 'Açık ilanlar — konum boş',
        description: 'Açık iş ilanlarının konumu boş; yakındaki usta eşleştirmesi çalışmaz.',
        count: jobsNoLoc,
        fixHint: 'Form validasyonu konum alanını zorunlu yapsın.',
      });
    }

    // ── Service requests: open with no category ──────────────────────────
    const srsNoCategory = await this.srs
      .createQueryBuilder('sr')
      .where("sr.status = 'open'")
      .andWhere("(sr.category IS NULL OR sr.category = '')")
      .getCount();
    if (srsNoCategory > 0) {
      issues.push({
        type: 'service_request.no_category',
        severity: 'high',
        title: 'Hizmet istekleri — kategorisiz',
        description:
          'Açık hizmet isteği kayıtlarında kategori atanmamış; arama dışında kalır.',
        count: srsNoCategory,
        fixHint:
          'Backend service-requests create DTO category alanını zorunlu yapsın.',
      });
    }

    // ── Duplicate category slugs / names ─────────────────────────────────
    const dupes = await this.categories.query(
      `SELECT name, COUNT(*) AS n FROM categories GROUP BY name HAVING n > 1`,
    );
    if (Array.isArray(dupes) && dupes.length > 0) {
      issues.push({
        type: 'category.duplicate_name',
        severity: 'high',
        title: 'Yinelenen kategori adı',
        description: 'Aynı isimle birden fazla kategori kaydı var.',
        count: dupes.length,
        fixHint:
          '/categories sayfasından duplicate kategorileri birleştir veya sil.',
      });
    }

    // ── Soft-deleted users still referenced? (sanity) ────────────────────
    void IsNull;

    const bySeverity = {
      high: issues.filter((i) => i.severity === 'high').length,
      medium: issues.filter((i) => i.severity === 'medium').length,
      low: issues.filter((i) => i.severity === 'low').length,
    };
    // Score: -10 high, -3 medium, -1 low; clamp 0..100
    const penalty = bySeverity.high * 10 + bySeverity.medium * 3 + bySeverity.low * 1;
    const score = Math.max(0, Math.min(100, 100 - penalty));

    return {
      generatedAt: new Date().toISOString(),
      totalIssues: issues.length,
      bySeverity,
      score,
      issues,
    };
  }
}
