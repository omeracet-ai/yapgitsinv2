import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../users/user.entity';

export interface ConversationItem {
  peerId: string;
  peerName: string | null;
  peerAvatarUrl: string | null;
  lastMessage: {
    text: string;
    createdAt: Date;
    fromMe: boolean;
  };
  unreadCount: number;
  // Phase 78
  peerOnline: boolean;
  peerLastSeenAt: string | null;
}

export interface PresenceState {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private messagesRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  /**
   * Phase 69: list per-peer conversations for the given user.
   * Returns peer profile + last message + unread count.
   */
  async getConversations(userId: string): Promise<ConversationItem[]> {
    // Pull all messages involving this user, newest first.
    const rows = await this.messagesRepo
      .createQueryBuilder('m')
      .where('m.from = :uid OR m.to = :uid', { uid: userId })
      .orderBy('m.createdAt', 'DESC')
      .getMany();

    // Group by peer; first occurrence is the latest message because of DESC order.
    const peers = new Map<
      string,
      { last: ChatMessage; unread: number }
    >();
    for (const m of rows) {
      const peerId = m.from === userId ? m.to : m.from;
      if (!peerId) continue;
      const entry = peers.get(peerId);
      const isUnread = m.to === userId && m.readAt === null;
      if (entry) {
        if (isUnread) entry.unread += 1;
      } else {
        peers.set(peerId, { last: m, unread: isUnread ? 1 : 0 });
      }
    }

    if (peers.size === 0) return [];

    const peerIds = Array.from(peers.keys());
    const users = await this.usersRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.fullName',
        'u.profileImageUrl',
        'u.isOnline',
        'u.lastSeenAt',
      ])
      .where('u.id IN (:...ids)', { ids: peerIds })
      .getMany();
    const userMap = new Map(users.map((u) => [u.id, u]));

    const result: ConversationItem[] = peerIds.map((pid) => {
      const { last, unread } = peers.get(pid)!;
      const u = userMap.get(pid);
      return {
        peerId: pid,
        peerName: u?.fullName ?? null,
        peerAvatarUrl: u?.profileImageUrl ?? null,
        lastMessage: {
          text: last.message,
          createdAt: last.createdAt,
          fromMe: last.from === userId,
        },
        unreadCount: unread,
        peerOnline: u?.isOnline ?? false,
        peerLastSeenAt: u?.lastSeenAt ? u.lastSeenAt.toISOString() : null,
      };
    });

    // Sort by latest message desc.
    result.sort(
      (a, b) =>
        b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
    );
    return result;
  }

  /** Phase 78: presence query for a single user. */
  async getPresence(userId: string): Promise<PresenceState> {
    const u = await this.usersRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.isOnline', 'u.lastSeenAt'])
      .where('u.id = :id', { id: userId })
      .getOne();
    return {
      userId,
      isOnline: u?.isOnline ?? false,
      lastSeenAt: u?.lastSeenAt ? u.lastSeenAt.toISOString() : null,
    };
  }
}
