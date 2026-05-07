import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobQuestion } from './job-question.entity';
import { JobQuestionReply } from './job-question-reply.entity';
import { Offer } from './offer.entity';
import { Job } from './job.entity';
import { ContentFilterService } from '../moderation/content-filter.service';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(JobQuestion)
    private questionsRepo: Repository<JobQuestion>,
    @InjectRepository(JobQuestionReply)
    private repliesRepo: Repository<JobQuestionReply>,
    @InjectRepository(Offer)
    private offersRepo: Repository<Offer>,
    @InjectRepository(Job)
    private jobsRepo: Repository<Job>,
    private filter: ContentFilterService,
  ) {}

  async getQuestions(jobId: string) {
    const questions = await this.questionsRepo.find({
      where: { jobId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    const results = await Promise.all(
      questions.map(async (q) => {
        const replies = await this.repliesRepo.find({
          where: { questionId: q.id },
          relations: ['user'],
          order: { createdAt: 'ASC' },
        });
        return {
          id: q.id,
          text: q.text,
          photoUrl: q.photoUrl,
          createdAt: q.createdAt,
          user: q.user
            ? { id: q.user.id, fullName: q.user.fullName, profileImageUrl: q.user.profileImageUrl }
            : null,
          replies: replies.map((r) => ({
            id: r.id,
            text: r.text,
            createdAt: r.createdAt,
            user: r.user
              ? { id: r.user.id, fullName: r.user.fullName, profileImageUrl: r.user.profileImageUrl }
              : null,
          })),
        };
      }),
    );

    return results;
  }

  async postQuestion(jobId: string, userId: string, text: string, photoUrl?: string) {
    // Karar B: Teklif vermiş olan usta soru sorabilir
    const hasOffer = await this.offersRepo.findOne({ where: { jobId, userId } });
    if (!hasOffer) {
      throw new ForbiddenException(
        'Soru sormak için önce bu ilana teklif vermeniz gerekiyor (5 token).',
      );
    }

    const result = this.filter.check(text);
    const safeText = result.flagged ? this.filter.sanitize(text) : text;
    const q = this.questionsRepo.create({
      jobId,
      userId,
      text: safeText,
      photoUrl: photoUrl ?? null,
      flagged: result.flagged,
      flagReason: result.flagged ? result.reasons.join(',') : null,
    });
    return this.questionsRepo.save(q);
  }

  async postReply(questionId: string, userId: string, text: string) {
    const question = await this.questionsRepo.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Soru bulunamadı.');

    // Yanıtlayabilir: ilan sahibi veya soruyu soran
    const job = await this.jobsRepo.findOne({ where: { id: question.jobId } });
    const isJobOwner = job?.customerId === userId;
    const isQuestionOwner = question.userId === userId;

    if (!isJobOwner && !isQuestionOwner) {
      throw new ForbiddenException('Bu soruya yalnızca ilan sahibi veya soruyu soran yanıt verebilir.');
    }

    const reply = this.repliesRepo.create({ questionId, userId, text });
    return this.repliesRepo.save(reply);
  }
}
