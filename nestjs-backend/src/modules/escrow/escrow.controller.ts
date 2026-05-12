import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { EscrowService } from './escrow.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

class InitiateEscrowDto {
  @IsString() @IsNotEmpty() jobId!: string;
  @IsString() @IsNotEmpty() offerId!: string;
  @IsString() @IsNotEmpty() taskerId!: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() @MaxLength(200) paymentToken?: string;
}

class ConfirmEscrowDto {
  @IsString() @IsNotEmpty() paymentToken!: string;
  @IsString() @IsNotEmpty() paymentRef!: string;
}

class DisputeDto {
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

class ReleaseDto {
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

class AdminResolveDto {
  @IsIn(['release', 'refund', 'split']) action!:
    | 'release'
    | 'refund'
    | 'split';
  @IsOptional() @IsNumber() @Min(0) @Max(1) splitRatio?: number;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @IsOptional() @IsString() @MaxLength(2000) adminNote?: string;
}

@Controller('escrow')
@UseGuards(AuthGuard('jwt'))
export class EscrowController {
  constructor(private readonly svc: EscrowService) {}

  @Get('my')
  listMy(@Request() req: AuthenticatedRequest) {
    return this.svc.listMy(req.user.id);
  }

  @Post('initiate')
  async initiate(
    @Body() dto: InitiateEscrowDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!dto || !dto.jobId) throw new BadRequestException('Invalid payload');
    const result = await this.svc.initiate({
      jobId: dto.jobId,
      offerId: dto.offerId,
      amount: dto.amount,
      customerId: req.user.id,
      taskerId: dto.taskerId,
      paymentToken: dto.paymentToken,
    });
    return {
      escrow: this.svc.withFeeBreakdown(result.escrow),
      feeBreakdown: this.svc.feeBreakdownFor(result.escrow),
      paymentInitUrl: result.paymentInitUrl,
      paymentToken: result.paymentToken,
      checkoutFormContent: result.checkoutFormContent,
      mock: result.mock,
    };
  }

  @Post('confirm')
  confirm(@Body() dto: ConfirmEscrowDto) {
    return this.svc.confirm(dto.paymentToken, dto.paymentRef);
  }

  @Post(':id/release')
  release(
    @Param('id') id: string,
    @Body() dto: ReleaseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.release(id, req.user.id, dto?.reason, req.user.role);
  }

  @Post(':id/dispute')
  disputePost(
    @Param('id') id: string,
    @Body() dto: DisputeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.dispute(id, req.user.id, dto?.reason);
  }

  @Get('my-as-customer')
  listAsCustomer(@Request() req: AuthenticatedRequest) {
    return this.svc.listForCustomer(req.user.id);
  }

  @Get('my-as-tasker')
  listAsTasker(@Request() req: AuthenticatedRequest) {
    return this.svc.listForTasker(req.user.id);
  }

  @Get('by-job/:jobId')
  async getByJob(
    @Param('jobId') jobId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const escrow = await this.svc.getByJob(jobId, req.user.id, req.user.role);
    if (!escrow) {
      throw new NotFoundException('No escrow found for this job');
    }
    return this.svc.withFeeBreakdown(escrow);
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const escrow = await this.svc.getById(id, req.user.id, req.user.role);
    return this.svc.withFeeBreakdown(escrow);
  }

  @Patch(':id/dispute')
  dispute(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.dispute(id, req.user.id, body?.reason);
  }
}
