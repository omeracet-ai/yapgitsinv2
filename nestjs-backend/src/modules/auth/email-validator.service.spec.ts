import { BadRequestException } from '@nestjs/common';
import { EmailValidatorService } from './email-validator.service';

// Mock dns/promises.resolveMx — tests assert MX behavior without network.
jest.mock('dns', () => ({
  promises: {
    resolveMx: jest.fn(),
  },
}));

import { promises as dns } from 'dns';
const resolveMxMock = dns.resolveMx as unknown as jest.Mock;

describe('EmailValidatorService (Phase 253)', () => {
  let service: EmailValidatorService;

  beforeEach(() => {
    resolveMxMock.mockReset();
    service = new EmailValidatorService();
  });

  it('passes whitelisted domain without MX lookup', async () => {
    await expect(service.validate('user@gmail.com')).resolves.toBeUndefined();
    expect(resolveMxMock).not.toHaveBeenCalled();
  });

  it('rejects disposable domain with EMAIL_DISPOSABLE', async () => {
    await expect(service.validate('throwaway@mailinator.com')).rejects.toMatchObject({
      response: { code: 'EMAIL_DISPOSABLE' },
    });
    expect(resolveMxMock).not.toHaveBeenCalled();
  });

  it('rejects domain with zero MX records as EMAIL_DOMAIN_INVALID', async () => {
    resolveMxMock.mockResolvedValueOnce([]);
    await expect(service.validate('foo@asdad-nodomain.example')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts domain with MX records', async () => {
    resolveMxMock.mockResolvedValueOnce([{ exchange: 'mx.example.com', priority: 10 }]);
    await expect(service.validate('foo@real-domain.example')).resolves.toBeUndefined();
  });

  it('caches MX result (second call hits cache)', async () => {
    resolveMxMock.mockResolvedValueOnce([{ exchange: 'mx.x', priority: 10 }]);
    await service.validate('a@cache-test.example');
    await service.validate('b@cache-test.example');
    expect(resolveMxMock).toHaveBeenCalledTimes(1);
  });

  it('no-op on empty email (email is enforced upstream by DTO)', async () => {
    await expect(service.validate('')).resolves.toBeUndefined();
    await expect(service.validate(undefined)).resolves.toBeUndefined();
  });
});
