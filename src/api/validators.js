function assertHas(obj, keys) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Response is not an object');
  }
  for (const key of keys) {
    if (!(key in obj)) throw new Error(`Missing field: ${key}`);
  }
}

function isString(val) {
  return typeof val === 'string' && val.length > 0;
}

function isNumber(val) {
  return typeof val === 'number' && !Number.isNaN(val);
}

function optionalString(val) {
  return val == null || isString(val);
}

export function validateAchAuthorizeResponse(data) {
  assertHas(data, ['authorizationId', 'status', 'bundleHash', 'chainTxHash', 'createdAt', 'idempotencyKey', 'zkProofStatus']);
  ['authorizationId', 'status', 'bundleHash', 'chainTxHash', 'createdAt', 'idempotencyKey', 'zkProofStatus'].forEach((k) => {
    if (!isString(data[k])) throw new Error(`Invalid field ${k}`);
  });
  return data;
}

export function validateTermsCurrentResponse(data) {
  assertHas(data, ['termsId', 'version', 'termsText', 'termsHash', 'amountModel', 'revocationText']);
  ['termsId', 'version', 'termsText', 'termsHash', 'amountModel', 'revocationText'].forEach((k) => {
    if (!isString(data[k])) throw new Error(`Invalid field ${k}`);
  });
  return data;
}

export function validateAuthorizationsResponse(data) {
  assertHas(data, ['items']);
  if (!Array.isArray(data.items)) throw new Error('items must be an array');
  return data;
}

export function validateAuthorizationZkResponse(data) {
  assertHas(data, ['authorizationId', 'zkProofStatus', 'zkSchemaVersion', 'zkCircuitId', 'zkBundleHash', 'semanticCommit', 'zkVerified']);
  return data;
}

export function validatePaymentsResponse(data) {
  assertHas(data, ['items']);
  if (!Array.isArray(data.items)) throw new Error('items must be an array');
  data.items.forEach((p) => {
    if (!p || typeof p !== 'object') throw new Error('Invalid payment item');
    assertHas(p, ['paymentId', 'authorizationId', 'ownerUserId', 'amountCents', 'currency', 'status', 'createdAt']);
    if (!isNumber(p.amountCents)) throw new Error('Invalid amountCents');
  });
  return data;
}

export function validateAttestationResponse(data) {
  assertHas(data, ['status', 'verified', 'schemaVersion', 'circuitId']);
  return data;
}

export function validateDisputeExportResponse(data) {
  assertHas(data, ['payment', 'attestations']);
  return data;
}

export function validateApprovalsList(data) {
  // Accept either 'items' or 'approvals' field, or a direct array
  if (Array.isArray(data)) {
    return { approvals: data };
  }
  if (data && typeof data === 'object') {
    if (Array.isArray(data.approvals)) {
      return data;
    }
    if (Array.isArray(data.items)) {
      return { approvals: data.items };
    }
  }
  throw new Error('Response must have approvals array or items array');
}

export function validateApproval(data) {
  assertHas(data, ['id']);
  return data;
}

function invalidShapeError(message) {
  return {
    ok: false,
    status: 0,
    error: { code: 'invalid_response_shape', message },
    requestId: null,
  };
}

export function wrapValidation(fn, data) {
  try {
    return fn(data);
  } catch (e) {
    return invalidShapeError(e?.message || 'Invalid response');
  }
}
