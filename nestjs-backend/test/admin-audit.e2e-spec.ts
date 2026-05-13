import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AdminAuditService } from '../src/modules/admin-audit/admin-audit.service';
import { AdminAuditLog } from '../src/modules/admin-audit/admin-audit-log.entity';
import { User } from '../src/modules/users/user.entity';


/**
 * Phase 182 — admin audit log (e2e).
 *
 * Coverage:
 *  - Non-admin (unauthenticated) → 401 on /admin/audit-log
 *  - Customer (authenticated, non-admin) → 403 on /admin/audit-log
 *  - Admin → GET /admin/audit-log → 200 paginated shape
 *  - AdminAuditService.record() writes a row with actorEmail/ip/userAgent and
 *    it surfaces via the query endpoint
 *  - FK behaviour: deleting the actor User leaves the audit row in place with
 *    adminUserId NULL but actorEmail preserved
 */
describe('Admin audit log (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let auditService: AdminAuditService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.init();
    dataSource = app.get(DataSource);
    auditService = app.get(AdminAuditService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // Each request bumps the forwarded IP so the named global throttlers
  // (default=60/min, auth-login=5/min, uploads=10/min) each see a unique
  // bucket per call — auth-login fires on every route so we can't get past
  // its 5/min cap without per-request IP variance.
  let ipCounter = 0;
  const nextIp = () =>
    `10.0.${Math.floor(ipCounter / 256) % 256}.${(ipCounter++) % 256}`;
  const http = () => {
    const agent = request(app.getHttpServer());
    const ip = nextIp();
    const wrap = (m: 'get' | 'post' | 'patch' | 'delete' | 'put') =>
      ((url: string) => agent[m](url).set('X-Forwarded-For', ip)) as never;
    return {
      get: wrap('get'),
      post: wrap('post'),
      patch: wrap('patch'),
      delete: wrap('delete'),
      put: wrap('put'),
    } as unknown as ReturnType<typeof request>;
  };

  let adminToken: string;
  let customerToken: string;

  it('issues admin + customer tokens', async () => {
    const adm = await http()
      .post('/auth/admin/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(201);
    adminToken = adm.body.access_token;
    expect(adminToken).toBeDefined();

    const reg = await http()
      .post('/auth/register')
      .send({
        email: 'audit-customer@test.com',
        phoneNumber: '5559880011',
        password: 'Test1234',
        fullName: 'Audit Customer',
      })
      .expect(201);
    customerToken = reg.body.access_token;
    expect(customerToken).toBeDefined();
  });

  it('rejects unauthenticated GET /admin/audit-log (401)', async () => {
    await http().get('/admin/audit-log').expect(401);
  });

  it('rejects non-admin GET /admin/audit-log (403)', async () => {
    await http()
      .get('/admin/audit-log')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('admin can list audit log (paginated shape)', async () => {
    const res = await http()
      .get('/admin/audit-log')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.limit).toBe('number');
    expect(typeof res.body.offset).toBe('number');
  });

  it('record() writes a structured entry visible via query', async () => {
    const admin = await dataSource
      .getRepository(User)
      .findOne({ where: { email: 'admin@yapgitsin.tr' } });
    expect(admin).toBeTruthy();
    await auditService.record({
      actor: { id: admin!.id, email: admin!.email },
      action: 'audit.test.record',
      targetType: 'user',
      targetId: 'sentinel-target-1',
      payload: { foo: 'bar' },
      req: { ip: '203.0.113.7', headers: { 'user-agent': 'jest-e2e/1.0' } },
    });
    const res = await http()
      .get('/admin/audit-log?action=audit.test.record')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    const row = res.body.data.find(
      (r: AdminAuditLog) => r.targetId === 'sentinel-target-1',
    );
    expect(row).toBeTruthy();
    expect(row.action).toBe('audit.test.record');
    expect(row.actorEmail).toBe('admin@yapgitsin.tr');
    expect(row.ip).toBe('203.0.113.7');
    expect(row.userAgent).toBe('jest-e2e/1.0');
  });

  it('GET /admin/audit-log/:id returns a single entry', async () => {
    const list = await http()
      .get('/admin/audit-log?action=audit.test.record')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const id = list.body.data[0].id;
    const one = await http()
      .get(`/admin/audit-log/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(one.body.id).toBe(id);
  });

  it('FK SET NULL: deleting actor preserves audit row with actorEmail', async () => {
    // Create a disposable user, record an entry, delete the user, then assert
    // the audit row still exists with adminUserId=null + actorEmail preserved.
    const userRepo = dataSource.getRepository(User);
    const disposable = await userRepo.save(
      userRepo.create({
        email: 'disposable-admin@test.com',
        phoneNumber: '5550009999',
        password: 'x',
        fullName: 'Disposable',
        role: 'admin',
      } as Partial<User>),
    );
    await auditService.record({
      actor: { id: disposable.id, email: disposable.email },
      action: 'audit.test.fk',
      targetType: 'user',
      targetId: 'fk-target-1',
      payload: null,
    });
    const auditRepo = dataSource.getRepository(AdminAuditLog);
    const before = await auditRepo.findOne({ where: { targetId: 'fk-target-1' } });
    expect(before).toBeTruthy();
    expect(before!.adminUserId).toBe(disposable.id);
    expect(before!.actorEmail).toBe('disposable-admin@test.com');

    // SQLite e2e requires PRAGMA foreign_keys=ON for SET NULL to fire.
    await dataSource.query('PRAGMA foreign_keys = ON');
    await userRepo.delete(disposable.id);

    const after = await auditRepo.findOne({ where: { targetId: 'fk-target-1' } });
    expect(after).toBeTruthy();
    expect(after!.adminUserId).toBeNull();
    expect(after!.actorEmail).toBe('disposable-admin@test.com');
  });
});
