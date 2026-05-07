import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  LessThanOrEqual,
  MoreThanOrEqual,
  In,
} from 'typeorm';
import { AvailabilitySlot } from './availability-slot.entity';
import { AvailabilityBlackout } from './availability-blackout.entity';

interface AddSlotDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  recurringUntil?: string | null;
}

interface AddBlackoutDto {
  startDate: string;
  endDate: string;
  reason?: string | null;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateToYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dateToHM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function validateHM(s: string): void {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) {
    throw new BadRequestException(`Invalid time format: ${s} (expected HH:MM)`);
  }
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilitySlot)
    private readonly slotRepo: Repository<AvailabilitySlot>,
    @InjectRepository(AvailabilityBlackout)
    private readonly blackoutRepo: Repository<AvailabilityBlackout>,
  ) {}

  // ---------- Slots ----------

  async getSlots(userId: string): Promise<AvailabilitySlot[]> {
    return this.slotRepo.find({
      where: { userId, isActive: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async addSlot(userId: string, dto: AddSlotDto): Promise<AvailabilitySlot> {
    if (dto.dayOfWeek < 0 || dto.dayOfWeek > 6) {
      throw new BadRequestException('dayOfWeek must be 0-6');
    }
    validateHM(dto.startTime);
    validateHM(dto.endTime);
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
    const slot = this.slotRepo.create({
      userId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isRecurring: true,
      recurringUntil: dto.recurringUntil ?? null,
      isActive: true,
    });
    return this.slotRepo.save(slot);
  }

  async updateSlot(
    slotId: string,
    userId: string,
    partial: Partial<AddSlotDto> & { isActive?: boolean },
  ): Promise<AvailabilitySlot> {
    const slot = await this.slotRepo.findOne({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.userId !== userId) throw new ForbiddenException('Not your slot');

    if (partial.dayOfWeek !== undefined) {
      if (partial.dayOfWeek < 0 || partial.dayOfWeek > 6) {
        throw new BadRequestException('dayOfWeek must be 0-6');
      }
      slot.dayOfWeek = partial.dayOfWeek;
    }
    if (partial.startTime !== undefined) {
      validateHM(partial.startTime);
      slot.startTime = partial.startTime;
    }
    if (partial.endTime !== undefined) {
      validateHM(partial.endTime);
      slot.endTime = partial.endTime;
    }
    if (slot.startTime >= slot.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
    if (partial.recurringUntil !== undefined) {
      slot.recurringUntil = partial.recurringUntil;
    }
    if (partial.isActive !== undefined) {
      slot.isActive = partial.isActive;
    }
    return this.slotRepo.save(slot);
  }

  async removeSlot(slotId: string, userId: string): Promise<{ deleted: true }> {
    const slot = await this.slotRepo.findOne({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.userId !== userId) throw new ForbiddenException('Not your slot');
    await this.slotRepo.delete(slotId);
    return { deleted: true };
  }

  // ---------- Blackouts ----------

  async getBlackouts(userId: string): Promise<AvailabilityBlackout[]> {
    const today = dateToYMD(new Date());
    return this.blackoutRepo.find({
      where: { userId, endDate: MoreThanOrEqual(today) },
      order: { startDate: 'ASC' },
    });
  }

  async addBlackout(
    userId: string,
    dto: AddBlackoutDto,
  ): Promise<AvailabilityBlackout> {
    if (!dto.startDate || !dto.endDate) {
      throw new BadRequestException('startDate and endDate required');
    }
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('startDate must be <= endDate');
    }
    const b = this.blackoutRepo.create({
      userId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason ?? null,
    });
    return this.blackoutRepo.save(b);
  }

  async removeBlackout(
    blackoutId: string,
    userId: string,
  ): Promise<{ deleted: true }> {
    const b = await this.blackoutRepo.findOne({ where: { id: blackoutId } });
    if (!b) throw new NotFoundException('Blackout not found');
    if (b.userId !== userId) throw new ForbiddenException('Not your blackout');
    await this.blackoutRepo.delete(blackoutId);
    return { deleted: true };
  }

  // ---------- Availability check ----------

  async isAvailable(userId: string, dateTime: Date): Promise<boolean> {
    if (isNaN(dateTime.getTime())) return false;
    const ymd = dateToYMD(dateTime);
    const hm = dateToHM(dateTime);
    const dow = dateTime.getDay();

    // Blackout check
    const blackout = await this.blackoutRepo.findOne({
      where: {
        userId,
        startDate: LessThanOrEqual(ymd),
        endDate: MoreThanOrEqual(ymd),
      },
    });
    if (blackout) return false;

    // Slot check
    const slots = await this.slotRepo.find({
      where: { userId, dayOfWeek: dow, isActive: true },
    });
    for (const s of slots) {
      if (s.recurringUntil && s.recurringUntil < ymd) continue;
      if (s.startTime <= hm && hm < s.endTime) return true;
    }
    return false;
  }

  async findAvailableTaskers(
    dateTime: Date,
    _category?: string,
    _city?: string,
  ): Promise<string[]> {
    if (isNaN(dateTime.getTime())) return [];
    const ymd = dateToYMD(dateTime);
    const hm = dateToHM(dateTime);
    const dow = dateTime.getDay();

    // Slots active for this dow/time
    const slots = await this.slotRepo
      .createQueryBuilder('s')
      .where('s.dayOfWeek = :dow', { dow })
      .andWhere('s.isActive = :active', { active: true })
      .andWhere('s.startTime <= :hm', { hm })
      .andWhere('s.endTime > :hm', { hm })
      .andWhere('(s.recurringUntil IS NULL OR s.recurringUntil >= :ymd)', {
        ymd,
      })
      .getMany();

    const userIds = Array.from(new Set(slots.map((s) => s.userId)));
    if (userIds.length === 0) return [];

    // Filter blacked-out users
    const blackouts = await this.blackoutRepo.find({
      where: {
        userId: In(userIds),
        startDate: LessThanOrEqual(ymd),
        endDate: MoreThanOrEqual(ymd),
      },
    });
    const blackedOut = new Set(blackouts.map((b) => b.userId));
    return userIds.filter((u) => !blackedOut.has(u));
  }

  async getCalendar(userId: string): Promise<{
    slots: AvailabilitySlot[];
    blackouts: AvailabilityBlackout[];
  }> {
    const [slots, blackouts] = await Promise.all([
      this.getSlots(userId),
      this.getBlackouts(userId),
    ]);
    return { slots, blackouts };
  }
}
