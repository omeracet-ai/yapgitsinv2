import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JobsService } from './jobs.service';
import { OffersService } from './offers.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JobStatus } from './job.entity';
import { OfferStatus } from './offer.entity';
import { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly offersService: OffersService,
  ) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('status') status?: JobStatus,
    @Query('limit') limit?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.jobsService.findAll({
      category,
      status,
      limit: limit ? Number(limit) : undefined,
      customerId,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-offers')
  getMyOffers(@Request() req: AuthenticatedRequest) {
    return this.offersService.findByUser(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('notifications')
  async getNotifications(@Request() req: AuthenticatedRequest) {
    const userId: string = req.user.id;
    // Kullanıcının kendi verdiği tekliflerin durum değişimleri
    const myOffers = await this.offersService.findByUser(userId);
    const offerNotifs = myOffers
      .filter((o) => o.status !== OfferStatus.PENDING)
      .map((o) => ({
        id: o.id,
        type:
          o.status === OfferStatus.ACCEPTED
            ? 'offer_accepted'
            : o.status === OfferStatus.REJECTED
              ? 'offer_rejected'
              : o.status === OfferStatus.COUNTERED
                ? 'offer_countered'
                : 'offer_withdrawn',
        title:
          o.status === OfferStatus.ACCEPTED
            ? 'Teklifiniz Kabul Edildi 🎉'
            : o.status === OfferStatus.REJECTED
              ? 'Teklifiniz Reddedildi'
              : o.status === OfferStatus.COUNTERED
                ? 'Pazarlık Teklifi Geldi'
                : 'Teklif Güncellendi',
        body: `İlan için teklifiniz güncellendi: ${o.status}`,
        jobId: (o.job as { id?: string } | undefined)?.id ?? null,
        jobTitle: (o.job as { title?: string } | undefined)?.title ?? '',
        price: o.price,
        counterPrice: o.counterPrice,
        status: o.status,
        createdAt: o.updatedAt ?? o.createdAt,
      }));

    // Kullanıcının kendi ilanlarına gelen teklifler
    const receivedOffers =
      await this.offersService.findOffersByCustomer(userId);
    const receivedNotifs = receivedOffers.map((o) => {
      const user = o.user as { fullName?: string } | undefined;
      const name = user?.fullName ?? 'Bir kullanıcı';
      const job = o.job as { id?: string; title?: string } | undefined;
      return {
        id: o.id,
        type:
          o.status === OfferStatus.PENDING
            ? 'new_offer'
            : o.status === OfferStatus.COUNTERED
              ? 'offer_countered'
              : 'offer_updated',
        title:
          o.status === OfferStatus.PENDING
            ? 'Yeni Teklif Aldınız!'
            : o.status === OfferStatus.COUNTERED
              ? 'Pazarlık Teklifi'
              : 'Teklif Güncellendi',
        body: `${name}, "${job?.title ?? 'ilanınız'}" için ${o.price} ₺ teklif verdi.`,
        jobId: job?.id ?? null,
        jobTitle: job?.title ?? '',
        price: o.price,
        counterPrice: o.counterPrice,
        status: o.status,
        createdAt: o.createdAt,
      };
    });

    return [...offerNotifs, ...receivedNotifs].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createJobDto: CreateJobDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.jobsService.create(createJobDto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.jobsService.update(id, updateJobDto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.jobsService.remove(id, req.user.id);
  }
}
