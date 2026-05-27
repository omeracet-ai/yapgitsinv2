import { Injectable, Logger } from '@nestjs/common';

/**
 * Realtime in-memory online users tracker.
 *
 * Fed by ChatGateway connect/disconnect handlers.
 * Maintains a bidirectional map: userId ↔ Set<socketId>.
 * Pure in-memory — survives only one process; resets on restart.
 *
 * Phase 268 — admin Realtime Analytics page.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  private readonly userSockets = new Map<string, Set<string>>();
  private readonly socketUser = new Map<string, string>();

  add(userId: string, socketId: string): void {
    if (!userId || !socketId) return;
    this.socketUser.set(socketId, userId);
    let set = this.userSockets.get(userId);
    if (!set) {
      set = new Set();
      this.userSockets.set(userId, set);
    }
    set.add(socketId);
  }

  remove(socketId: string): void {
    if (!socketId) return;
    const userId = this.socketUser.get(socketId);
    this.socketUser.delete(socketId);
    if (!userId) return;
    const set = this.userSockets.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) this.userSockets.delete(userId);
  }

  getOnlineCount(): number {
    return this.userSockets.size;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  isUserOnline(userId: string): boolean {
    const set = this.userSockets.get(userId);
    return !!set && set.size > 0;
  }
}
