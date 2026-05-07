/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import { Job, JobStatus } from '../jobs/job.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';

const sharp = require('sharp');

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(Job) private readonly jobsRepository: Repository<Job>,
    @InjectRepository(Offer) private readonly offersRepository: Repository<Offer>,
  ) {}

  async uploadCompletionPhotos(
    jobId: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<{ photos: string[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('En az 1 fotoğraf yüklenmelidir');
    }

    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('İlan bulunamadı');

    if (
      job.status !== JobStatus.IN_PROGRESS &&
      job.status !== JobStatus.PENDING_COMPLETION
    ) {
      throw new ForbiddenException(
        'Tamamlanma fotoğrafları yalnızca devam eden işlerde yüklenebilir',
      );
    }

    const acceptedOffer = await this.offersRepository.findOne({
      where: { jobId, status: OfferStatus.ACCEPTED },
    });
    if (!acceptedOffer || acceptedOffer.userId !== userId) {
      throw new ForbiddenException('Bu işin atanmış ustası değilsiniz');
    }

    const current = job.completionPhotos ?? [];
    if (current.length + files.length > 5) {
      throw new BadRequestException('Maks 5 fotoğraf');
    }

    const dir = join(process.cwd(), 'uploads', 'completion', jobId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const newUrls: string[] = [];
    const ts = Date.now();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = `${ts}-${i}.jpg`;
      const dest = join(dir, filename);
      await sharp(file.buffer)
        .resize({ width: 1024, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(dest);
      newUrls.push(`/uploads/completion/${jobId}/${filename}`);
    }

    job.completionPhotos = [...current, ...newUrls];
    await this.jobsRepository.save(job);

    return { photos: job.completionPhotos };
  }
}
