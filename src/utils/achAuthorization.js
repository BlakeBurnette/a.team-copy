const FORBIDDEN_KEYS = [
  'routingnumber',
  'accountnumber',
  'pan',
  'cvv',
  'ssn',
  'dob',
  'dateofbirth',
  'cardnumber',
  'socialsecurity',
];
const DEVICE_STORAGE_KEY = 'device_id_v1';

const hasCryptoUUID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';

const uuidv4 = () => {
  if (hasCryptoUUID) return crypto.randomUUID();
  // RFC4122-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const createSessionId = () => uuidv4();

export const getDeviceId = () => {
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing) return existing;
    const next = uuidv4();
    localStorage.setItem(DEVICE_STORAGE_KEY, next);
    return next;
  } catch {
    return uuidv4();
  }
};

export const buildIdempotencyKey = (sessionId, termsId) => {
  if (!sessionId || !termsId) return undefined;
  return `${sessionId}:${termsId}`;
};

export const assertNoForbiddenKeys = (value, path = 'payload') => {
  if (!value || typeof value !== 'object') return;

  const checkEntry = (val, currentPath) => {
    if (val && typeof val === 'object') {
      const entries = Array.isArray(val) ? val.entries() : Object.entries(val);
      for (const [key, child] of entries) {
        const keyStr = String(key);
        const keyLower = keyStr.toLowerCase();
        const keyNormalized = keyLower.replace(/[^a-z0-9]/g, '');
        const hit = FORBIDDEN_KEYS.some(
          (f) =>
            keyLower === f ||
            keyNormalized === f ||
            keyLower.includes(f) ||
            keyNormalized.includes(f)
        );
        if (hit) {
          throw new Error(`Forbidden key detected in authorization payload at ${currentPath}.${keyStr}`);
        }
        checkEntry(child, `${currentPath}.${keyStr}`);
      }
    }
  };

  checkEntry(value, path);
};

export const buildAchAuthorizationPayload = ({
  userId,
  terms,
  bank,
  sessionId,
  deviceId,
  acceptanceMethods = ['CHECKBOX_CLICK', 'SUBMIT'],
  standingAuthorizationAccepted = false,
}) => {
  if (!terms?.termsId || !terms?.termsHash) {
    throw new Error('termsId and termsHash are required');
  }
  if (!bank?.token) throw new Error('bank token is required');

  const acceptanceMethod = Array.isArray(acceptanceMethods)
    ? acceptanceMethods.join('+')
    : acceptanceMethods || 'SUBMIT';

  const payload = {
    userId: userId || '',
    termsId: terms.termsId,
    termsHash: terms.termsHash,
    acceptedAtClient: new Date().toISOString(),
    acceptanceMethod,
    sessionId: sessionId || '',
    deviceId: deviceId || '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timezone: typeof Intl !== 'undefined' && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
    locale: typeof navigator !== 'undefined' ? navigator.language : '',
    bankAccountToken: bank.token,
    bankDisplay: {
      bankName: bank.bankName || '',
      accountType: bank.accountType || '',
      last4: bank.last4 || '',
    },
  };

  if (standingAuthorizationAccepted) {
    payload.standingAuthorizationAccepted = true;
  }

  assertNoForbiddenKeys(payload);
  return payload;
};

export default {
  createSessionId,
  getDeviceId,
  buildIdempotencyKey,
  assertNoForbiddenKeys,
  buildAchAuthorizationPayload,
};
