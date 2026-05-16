import { IsIn } from 'class-validator';

export class ModerationActionDto {
  @IsIn(['approve', 'remove', 'ban_user'] as const)
  action: 'approve' | 'remove' | 'ban_user';
}
