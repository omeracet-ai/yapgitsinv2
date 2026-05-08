import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OffersService } from './offers.service';
import { OfferStatus } from './offer.entity';
import { CreateOfferDto, CounterOfferDto } from './dto/offer.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

/** GET /offers/my — işçinin kendi teklifleri, iş detaylarıyla */
@Controller('offers')
export class OffersRootController {
  constructor(private readonly offersService: OffersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  getMyOffers(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.offersService.findByUser(req.user.id, Number(page) || 1, Number(limit) || 20);
  }
}

@Controller('jobs/:jobId/offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findByJob(@Param('jobId') jobId: string) {
    return this.offersService.findByJob(jobId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Param('jobId') jobId: string,
    @Body() body: CreateOfferDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.offersService.create({
      jobId,
      userId: req.user.id,
      price: body.price,
      message: body.message,
      attachmentUrls: body.attachmentUrls,
      lineItems: body.lineItems,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/accept')
  accept(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.offersService.accept(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.offersService.reject(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/counter')
  counter(
    @Param('id') id: string,
    @Body() body: CounterOfferDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.offersService.counter(
      id,
      req.user.id,
      body.counterPrice,
      body.counterMessage,
      body.lineItems,
    );
  }

  /** Bir teklifin tüm pazarlık zincirini döndürür (root'tan leaf'e). */
  @Get(':id/chain')
  getChain(@Param('id') id: string) {
    return this.offersService.getNegotiationChain(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':offerId/withdraw')
  withdraw(
    @Param('jobId') jobId: string,
    @Param('offerId') offerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.offersService.withdrawOffer(jobId, offerId, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: OfferStatus }) {
    return this.offersService.updateStatus(id, body.status);
  }
}
