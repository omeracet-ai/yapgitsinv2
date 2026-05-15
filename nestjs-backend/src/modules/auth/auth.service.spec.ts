import { asUserId } from '../../common/branded.types';

/**
 * Smoke skeleton — Müdür dispatch'inde Voldi-fs ile coverage genişletilecek.
 * Phase: Test Çölü Bitsin (Voldi-sec başlangıç).
 */
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
