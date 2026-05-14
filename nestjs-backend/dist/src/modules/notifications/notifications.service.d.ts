import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { User } from '../users/user.entity';
import { FcmService } from './fcm.service';
import { EmailService } from '../email/email.service';
export type NotificationCategory = 'booking' | 'offer' | 'review' | 'message' | 'system';
export declare class NotificationsService {
    private repo;
    private usersRepo;
    private readonly fcm;
    private readonly email;
    constructor(repo: Repository<Notification>, usersRepo: Repository<User>, fcm: FcmService, email: EmailService);
    private sendEmailForNotification;
    static categoryFor(type: NotificationType): NotificationCategory;
    private shouldSendNotification;
    static relatedTypeFor(type: NotificationType): 'booking' | 'job' | 'user' | null;
    send(data: {
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        refId?: string;
        relatedType?: 'booking' | 'job' | 'user' | null;
        relatedId?: string | null;
    }): Promise<Notification | null>;
    getByUser(userId: string): Promise<Notification[]>;
    markRead(id: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
    unreadCount(userId: string): Promise<number>;
    updateUserPushSettings(userId: string, settings: {
        fcmToken?: string | null;
        pushNotificationsEnabled?: boolean;
    }): Promise<void>;
}
