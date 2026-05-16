import axios from 'axios';

const b64ToBuf = (b64) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const bufToB64 = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const prepCreation = (opts) => {
  // SimpleWebAuthn v10+ returns flat options; older versions wrap in publicKey
  const pk = opts?.publicKey ? { ...opts.publicKey } : { ...opts };
  pk.challenge = b64ToBuf(pk.challenge);
  if (pk.user?.id) pk.user = { ...pk.user, id: b64ToBuf(pk.user.id) };
  if (pk.excludeCredentials) {
    pk.excludeCredentials = pk.excludeCredentials.map((c) => ({ ...c, id: b64ToBuf(c.id) }));
  }
  return { publicKey: pk };
};

const prepRequest = (opts) => {
  // SimpleWebAuthn v10+ returns flat options; older versions wrap in publicKey
  const pk = opts?.publicKey ? { ...opts.publicKey } : { ...opts };
  pk.challenge = b64ToBuf(pk.challenge);
  if (pk.allowCredentials) {
    pk.allowCredentials = pk.allowCredentials.map((c) => ({ ...c, id: b64ToBuf(c.id) }));
  }
  return { publicKey: pk };
};

const credentialToObj = (cred) => {
  if (!cred) return null;
  return {
    id: cred.id,
    rawId: bufToB64(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: bufToB64(cred.response.clientDataJSON),
      attestationObject: cred.response.attestationObject ? bufToB64(cred.response.attestationObject) : undefined,
      authenticatorData: cred.response.authenticatorData ? bufToB64(cred.response.authenticatorData) : undefined,
      signature: cred.response.signature ? bufToB64(cred.response.signature) : undefined,
      userHandle: cred.response.userHandle ? bufToB64(cred.response.userHandle) : undefined,
    },
  };
};

export async function getRegistrationOptions(headers) {
  const { data } = await axios.post('/api/portal/webauthn/register/options', {}, { headers, withCredentials: true });
  return data;
}

export async function verifyRegistration(attestationResponse, headers) {
  const { data } = await axios.post(
    '/api/portal/webauthn/register/verify',
    attestationResponse,
    { headers, withCredentials: true }
  );
  return data;
}

export async function getAuthenticationOptions(headers) {
  const { data } = await axios.post('/api/portal/webauthn/authenticate/options', {}, { headers, withCredentials: true });
  return data;
}

export async function verifyAuthentication(assertionResponse, headers) {
  const { data } = await axios.post(
    '/api/portal/webauthn/authenticate/verify',
    assertionResponse,
    { headers, withCredentials: true }
  );
  return data;
}

export async function listCredentials(headers) {
  const { data } = await axios.get('/api/portal/webauthn/credentials', { headers, withCredentials: true });
  return data;
}

export async function deleteCredential(id, headers) {
  const { data } = await axios.delete(`/api/portal/webauthn/credentials/${encodeURIComponent(id)}`, {
    headers,
    withCredentials: true,
  });
  return data;
}

// Helpers for UI flows
export async function createPasskey(options, headers) {
  const prepared = prepCreation(options);
  const cred = await navigator.credentials.create(prepared);
  return verifyRegistration(credentialToObj(cred), headers);
}

export async function assertPasskey(options, headers) {
  const prepared = prepRequest(options);
  const cred = await navigator.credentials.get(prepared);
  return verifyAuthentication(credentialToObj(cred), headers);
}
