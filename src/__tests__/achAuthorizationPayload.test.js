import {
  buildAchAuthorizationPayload,
  assertNoForbiddenKeys,
} from '../utils/achAuthorization';

const baseTerms = { termsId: 'v1', termsHash: 'hash123' };

describe('achAuthorization payload guard', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'jest-test-agent',
        language: 'en-US',
      },
      writable: true,
    });
    Object.defineProperty(global, 'Intl', {
      value: {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({ timeZone: 'America/Chicago' }),
        }),
      },
      writable: true,
    });
  });

  it('builds payload without forbidden keys', () => {
    const payload = buildAchAuthorizationPayload({
      userId: 'user-123',
      terms: baseTerms,
      bank: { token: 'bank_tok_1', bankName: 'Bank', accountType: 'checking', last4: '4242' },
      sessionId: 'session-abc',
      deviceId: 'device-xyz',
      standingAuthorizationAccepted: true,
    });

    expect(payload.bankAccountToken).toBe('bank_tok_1');
    expect(payload.bankDisplay.last4).toBe('4242');
    expect(payload.termsId).toBe(baseTerms.termsId);
    expect(typeof payload.acceptanceMethod).toBe('string');
    expect(() => assertNoForbiddenKeys(payload)).not.toThrow();
  });

  it('throws when forbidden key exists', () => {
    const bad = { routing_number: '123456789' };
    expect(() => assertNoForbiddenKeys(bad)).toThrow(/Forbidden key/);
  });

  it('throws when forbidden key exists nested', () => {
    const bad = { meta: { accountNumber: '9999' } };
    expect(() => assertNoForbiddenKeys(bad)).toThrow(/Forbidden key/);
  });
});
