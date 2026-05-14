import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserId } from '../../common/types/branded';
import { Booking } from '../bookings/booking.entity';
import { SemanticSearchService } from '../ai/semantic-search.service';
import { BoostService } from '../boost/boost.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Review } from '../reviews/review.entity';
export type StatField = 'asCustomerTotal' | 'asCustomerSuccess' | 'asCustomerFail' | 'asWorkerTotal' | 'asWorkerSuccess' | 'asWorkerFail';
export declare class UsersService {
    private repo;
    private bookingsRepo;
    private reviewsRepo;
    private readonly semanticSearch;
    private readonly boostSvc;
    private readonly subscriptionsService;
    constructor(repo: Repository<User>, bookingsRepo: Repository<Booking>, reviewsRepo: Repository<Review>, semanticSearch: SemanticSearchService, boostSvc: BoostService, subscriptionsService: SubscriptionsService);
    getActiveSubscriptionPlanKeys(userIds: string[]): Promise<Map<string, string>>;
    private _applyBoostRanking;
    getAvailabilitySlots(userId: string, days: number): Promise<Array<{
        date: string;
        dayOfWeek: string;
        weeklyAvailable: boolean;
        hasBooking: boolean;
        fullyBooked: boolean;
    }>>;
    findByEmail(email: string): Promise<User | null>;
    findByPhone(phoneNumber: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    findWorkers(category?: string, city?: string): Promise<User[]>;
    findWorkersAdvanced(opts: {
        category?: string;
        city?: string;
        minRating?: number;
        minRate?: number;
        maxRate?: number;
        verifiedOnly?: boolean;
        availableOnly?: boolean;
        availableDay?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
        sortBy?: 'rating' | 'reputation' | 'rate_asc' | 'rate_desc' | 'nearest';
        page?: number;
        limit?: number;
        lat?: number;
        lng?: number;
        radiusKm?: number;
        semanticQuery?: string;
    }): Promise<{
        data: (User & {
            distanceKm?: number;
        })[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    create(userData: Partial<User>): Promise<User>;
    update(id: string, data: Partial<User>): Promise<User | null>;
    deleteById(id: string): Promise<void>;
    incrementTokenVersion(id: UserId): Promise<void>;
    deactivateAccount(userId: string, password: string): Promise<{
        deactivated: true;
        deactivatedAt: string;
    }>;
    bumpStat(userId: string, field: StatField): Promise<void>;
    recalcRating(userId: UserId, _newRating?: number): Promise<void>;
    updateAvailability(userId: string, schedule: Record<string, unknown> | null | undefined): Promise<{
        schedule: User['availabilitySchedule'];
    }>;
    updateLocation(id: string, latitude: number, longitude: number): Promise<void>;
    findNearbyWorkers(opts: {
        lat: number;
        lon: number;
        radiusKm?: number;
        category?: string;
        verifiedOnly?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{
        data: (User & {
            distanceKm: number;
        })[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    private static readonly CUSTOMER_FIELDS;
    private static readonly WORKER_FIELDS;
    computeProfileCompletion(user: User): {
        percent: number;
        missingFields: string[];
        totalFields: number;
        filledFields: number;
    };
    getCompletionScore(userId: string): Promise<{
        score: number;
        missing: Array<{
            field: string;
            label: string;
            points: number;
        }>;
        isWorker: boolean;
    }>;
    getNotificationPreferences(userId: string): Promise<{
        preferences: User['notificationPreferences'];
    }>;
    updateNotificationPreferences(userId: string, prefs: Partial<NonNullable<User['notificationPreferences']>> | null): Promise<{
        preferences: User['notificationPreferences'];
    }>;
    getOfferTemplates(userId: string): Promise<{
        templates: string[];
    }>;
    addOfferTemplate(userId: string, text: string): Promise<{
        templates: string[];
    }>;
    removeOfferTemplate(userId: string, index: number): Promise<{
        templates: string[];
    }>;
    getMessageTemplates(userId: string): Promise<{
        templates: string[];
    }>;
    addMessageTemplate(userId: string, text: string): Promise<{
        templates: string[];
    }>;
    removeMessageTemplate(userId: string, index: number): Promise<{
        templates: string[];
    }>;
    static readonly BADGE_DEFINITIONS: ReadonlyArray<{
        key: 'verified' | 'top_rated' | 'prolific' | 'rising_star' | 'available_now' | 'complete_profile' | 'pro_member' | 'premium_member';
        label: string;
        icon: string;
    }>;
    computeBadges(user: User, planKey?: string | null): Promise<Array<{
        key: string;
        label: string;
        icon: string;
    }>>;
    addFcmToken(userId: string, token: string): Promise<string[]>;
    removeFcmToken(userId: string, token: string): Promise<string[]>;
    recalcReputation(userId: string): Promise<void>;
}
