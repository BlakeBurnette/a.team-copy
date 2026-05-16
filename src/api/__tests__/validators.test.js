import {
  validateAchAuthorizeResponse,
  validateTermsCurrentResponse,
  validatePaymentsResponse,
  wrapValidation,
} from '../validators';

describe('validators', () => {
  it('accepts valid ach authorize response', () => {
    const data = {
      authorizationId: 'a1',
      status: 'ok',
      bundleHash: 'b',
      chainTxHash: 'c',
      createdAt: 'now',
      idempotencyKey: 'key',
      zkProofStatus: 'pending',
    };
    expect(validateAchAuthorizeResponse(data)).toEqual(data);
  });

  it('rejects invalid ach authorize response', () => {
    const res = wrapValidation(validateAchAuthorizeResponse, { status: 'ok' });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('invalid_response_shape');
  });

  it('accepts valid terms response', () => {
    const data = {
      termsId: 't1',
      version: 'v1',
      termsText: 'txt',
      termsHash: 'hash',
      amountModel: 'flat',
      revocationText: 'rev',
    };
    expect(validateTermsCurrentResponse(data)).toEqual(data);
  });

  it('rejects invalid payments response', () => {
    const res = wrapValidation(validatePaymentsResponse, { items: [{ amountCents: 'bad' }] });
    expect(res.ok).toBe(false);
  });
});
