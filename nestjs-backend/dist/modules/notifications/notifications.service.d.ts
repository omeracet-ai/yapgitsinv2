import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
export declare class NotificationsService {
    private repo;
    constructor(repo: Repository<Notification>);
    send(data: {
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        refId?: string;
    }): Promise<Notification>;
    getByUser(userId: string): Promise<Notification[]>;
    markRead(id: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
    unreadCount(userId: string): Promise<number>;
}
