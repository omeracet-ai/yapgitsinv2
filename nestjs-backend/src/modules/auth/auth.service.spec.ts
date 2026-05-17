import { asUserId } from '../../common/branded.types';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TwoFactorService } from './two-factor.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import { SmsOtp } from './sms-otp.entity';
import { IpOtpLockout } from './ip-otp-lockout.entity';
import { UserRole } from '../users/user.entity';
import { EmailValidatorService } from './email-validator.service';

// ── Phase 227 — firebase-admin tam mock ─────────────────────────────────────
const verifyIdTokenMock = jest.fn();
const authFnMock = jest.fn(() => ({ verifyIdToken: verifyIdTokenMock }));
const initializeAppMock = jest.fn();
const certMock = jest.fn(() => ({} as unknown));

jest.mock(
  'firebase-admin',
  () => ({
    __esModule: false,
    apps: [] as unknown[],
    initializeApp: (...args: unknown[]) => initializeAppMock(...args),
    credential: { cert: (...args: unknown[]) => certMock(...args) },
    auth: (...args: unknown[]) => authFnMock(...args),
  }),
  { virtual: true },
);

describe('AuthService (smoke)', () => {
  it('branded asUserId tip-güvenli string passthrough', () => {
    const id = asUserId('user_123');
    expect(typeof id).toBe('string');
    expect(id).toBe('user_123');
  });

  it.todo('login: bcrypt verify happy path');
  it.todo('login: wrong password 401');
  it.todo('refresh: rotated token invalidates old');
  it.todo('signup: duplicate email 409');
  it.todo('JWT payload: userId + role claim shape');
});

// ── Phase 227 — loginWithFirebase suite ─────────────────────────────────────
describe('AuthService.loginWithFirebase (Phase 227)', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<
    UsersService,
    'findByFirebaseUid' | 'findByEmail' | 'findById' | 'create' | 'update'
  >>;
  let jwtService: { sign: jest.Mock };

  const FAKE_SA = JSON.stringify({
    type: 'service_account',
    project_id: 'fake',
    private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
    client_email: 'fake@fake.iam.gserviceaccount.com',
  });

  const baseUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'u_1',
    fullName: 'Test User',
    email: 'test@example.com',
    phoneNumber: '05551112233',
    passwordHash: 'hash',
    role: UserRole.USER,
    tenantId: null,
    tokenVersion: 0,
    emailVerified: false,
    suspended: false,
    deactivated: false,
    firebaseUid: null as string | null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // firebase-admin mock apps array reset
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const admin = require('firebase-admin') as { apps: unknown[] };
    admin.apps.length = 0;

    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = FAKE_SA;

    usersService = {
      findByFirebaseUid: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<typeof usersService>;

    jwtService = { sign: jest.fn(() => 'signed.jwt.token') };

    const repoMock = () => ({
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: TwoFactorService, useValue: { verify: jest.fn() } },
        { provide: EmailService, useValue: { sendWelcome: jest.fn(), sendPasswordReset: jest.fn() } },
        { provide: SmsService, useValue: { sendSms: jest.fn() } },
        { provide: getRepositoryToken(PasswordResetToken), useValue: repoMock() },
        { provide: getRepositoryToken(EmailVerificationToken), useValue: repoMock() },
        { provide: getRepositoryToken(SmsOtp), useValue: repoMock() },
        { provide: getRepositoryToken(IpOtpLockout), useValue: repoMock() },
        { provide: CACHE_MANAGER, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
        {
          provide: DataSource,
          useValue: {
            options: { type: 'sqlite' },
            query: jest.fn(),
          },
        },
        {
          provide: EmailValidatorService,
          useValue: { validate: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  });

  // 1. UID match
  it('UID match: mevcut firebaseUid user bulundu → link/create yok, JWT döner', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'fb_uid_1',
      email: 'test@example.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    });
    const existing = baseUser({ firebaseUid: 'fb_uid_1' });
    usersService.findByFirebaseUid.mockResolvedValue(existing as never);

    const out = await service.loginWithFirebase('id_token_xyz');

    expect(usersService.findByFirebaseUid).toHaveBeenCalledWith('fb_uid_1');
    expect(usersService.findByEmail).not.toHaveBeenCalled();
    expect(usersService.create).not.toHaveBeenCalled();
    expect(usersService.update).not.toHaveBeenCalled();
    expect(out.user.id).toBe('u_1');
    expect(out.provider).toBe('google.com');
    expect(out.access_token).toBe('signed.jwt.token');
    expect(out.refresh_token).toBe('signed.jwt.token');
  });

  // 2. Email link
  it('Email link: uid yok, email match → mevcut user firebaseUid SET edilir, create çağrılmaz', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'fb_uid_2',
      email: 'test@example.com',
      email_verified: true,
    });
    const existing = baseUser({ id: 'u_2', firebaseUid: null, emailVerified: false });
    usersService.findByFirebaseUid.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(existing as never);
    usersService.findById.mockResolvedValue({ ...existing, firebaseUid: 'fb_uid_2', emailVerified: true } as never);

    const out = await service.loginWithFirebase('tok');

    expect(usersService.update).toHaveBeenCalledWith('u_2', {
      firebaseUid: 'fb_uid_2',
      emailVerified: true,
    });
    expect(usersService.create).not.toHaveBeenCalled();
    expect(out.user.id).toBe('u_2');
    expect(out.provider).toBe('firebase');
  });

  // 3. New user
  it('New user: uid/email match yok → yeni user create, phoneNumber firebase:<uid> prefix', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'fb_uid_3',
      email: 'new@example.com',
      email_verified: false,
      name: 'New Person',
    });
    usersService.findByFirebaseUid.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    const created = baseUser({
      id: 'u_3',
      email: 'new@example.com',
      fullName: 'New Person',
      phoneNumber: 'firebase:fb_uid_3',
      firebaseUid: 'fb_uid_3',
      emailVerified: false,
    });
    usersService.create.mockResolvedValue(created as never);

    const out = await service.loginWithFirebase('tok');

    expect(usersService.create).toHaveBeenCalledTimes(1);
    const createArg = usersService.create.mock.calls[0][0] as Record<string, unknown>;
    expect(createArg.firebaseUid).toBe('fb_uid_3');
    expect(createArg.fullName).toBe('New Person');
    expect(createArg.email).toBe('new@example.com');
    expect(createArg.emailVerified).toBe(false);
    expect(String(createArg.phoneNumber)).toMatch(/^firebase:fb_uid_3/);
    expect(String(createArg.phoneNumber).length).toBeLessThanOrEqual(20);
    expect(out.user.id).toBe('u_3');
  });

  // 4. emailVerified promote
  it('emailVerified promote: mevcut email-link user false → token true → update true geçer', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'fb_uid_4',
      email: 'test@example.com',
      email_verified: true,
    });
    const existing = baseUser({ id: 'u_4', emailVerified: false });
    usersService.findByFirebaseUid.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(existing as never);
    usersService.findById.mockResolvedValue({ ...existing, firebaseUid: 'fb_uid_4', emailVerified: true } as never);

    await service.loginWithFirebase('tok');

    expect(usersService.update).toHaveBeenCalledWith('u_4', expect.objectContaining({
      emailVerified: true,
    }));
  });

  // 5. Invalid token
  it('Invalid token: verifyIdToken throw → UnauthorizedException', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('id-token-expired'));

    await expect(service.loginWithFirebase('bad_token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(usersService.findByFirebaseUid).not.toHaveBeenCalled();
  });

  // 6. Credential missing
  it('Credential missing: FIREBASE_SERVICE_ACCOUNT_JSON yok → UnauthorizedException, init graceful', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    // re-construct service so onModuleInit semantics ile aynı path (initFirebaseAdmin no-creds)
    // Doğrudan loginWithFirebase de aynı yola düşer (firebaseReady=false).

    await expect(service.loginWithFirebase('any_token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  // 7. Suspended user
  it('Suspended user: user.suspended=true → ForbiddenException', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'fb_uid_7',
      email: 'sus@example.com',
      email_verified: true,
    });
    usersService.findByFirebaseUid.mockResolvedValue(
      baseUser({ id: 'u_7', firebaseUid: 'fb_uid_7', suspended: true }) as never,
    );

    await expect(service.loginWithFirebase('tok')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('Deactivated user: user.deactivated=true → ForbiddenException', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'fb_uid_7b',
      email: 'gone@example.com',
      email_verified: true,
    });
    usersService.findByFirebaseUid.mockResolvedValue(
      baseUser({ id: 'u_7b', firebaseUid: 'fb_uid_7b', deactivated: true }) as never,
    );

    await expect(service.loginWithFirebase('tok')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // 8. JWT response shape
  it('JWT response shape: {access_token, refresh_token, user, provider}', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'fb_uid_8',
      email: 'shape@example.com',
      email_verified: true,
      firebase: { sign_in_provider: 'apple.com' },
    });
    usersService.findByFirebaseUid.mockResolvedValue(
      baseUser({ id: 'u_8', firebaseUid: 'fb_uid_8' }) as never,
    );

    const out = await service.loginWithFirebase('tok');

    expect(Object.keys(out).sort()).toEqual(
      ['access_token', 'provider', 'refresh_token', 'user'].sort(),
    );
    expect(out.provider).toBe('apple.com');
    expect(out.user).toBeDefined();
    // passwordHash safe-stripped olmalı
    expect((out.user as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  // Bonus: idToken eksik
  it('Boş idToken: UnauthorizedException', async () => {
    await expect(service.loginWithFirebase('')).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(
      service.loginWithFirebase(undefined as unknown as string),
    ).rejects.toThrow(UnauthorizedException);
  });
});
