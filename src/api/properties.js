import axios from 'axios';

export function normalizeMembershipsResponse(raw) {
  const list = Array.isArray(raw?.properties) ? raw.properties : Array.isArray(raw) ? raw : [];

  return list.map((item) => {
    const prop = item?.property || item?.prop || item;
    const membership = item?.membership || item?.membership_info || item;

    const propertyId =
      item?.propertyId ||
      item?.property_id ||
      prop?.id ||
      prop?.property_id ||
      prop?.propertyId ||
      item?.id ||
      item?.slug ||
      prop?.slug ||
      item?.address;

    const displayAddress =
      prop?.display_address ||
      prop?.address ||
      item?.display_address ||
      item?.address ||
      prop?.name ||
      item?.name ||
      prop?.formatted_address ||
      'Unknown address';

    const membershipRole =
      membership?.membership_role ||
      membership?.membershipRole ||
      membership?.role ||
      item?.role ||
      item?.membership_role ||
      item?.membershipRole ||
      '';

    const membershipStatus =
      membership?.membership_status ||
      membership?.membershipStatus ||
      membership?.status ||
      item?.status ||
      item?.membership_status ||
      item?.membershipStatus ||
      '';

    const verifiedAt =
      membership?.verified_at ||
      membership?.verifiedAt ||
      item?.verified_at ||
      item?.verifiedAt ||
      prop?.verified_at ||
      prop?.verifiedAt ||
      null;

    const verificationMethod =
      membership?.verification_method ||
      membership?.verificationMethod ||
      item?.verification_method ||
      item?.verificationMethod ||
      null;

    return { propertyId, displayAddress, membershipRole, membershipStatus, verifiedAt, verificationMethod };
  });
}

export async function fetchMyProperties(headers) {
  const { data } = await axios.get('/api/properties/my', { headers, withCredentials: true });
  return {
    raw: data,
    memberships: normalizeMembershipsResponse(data),
  };
}

export async function fetchClaimableProperties(headers) {
  const { data } = await axios.get('/api/properties/claimable', { headers, withCredentials: true });
  return data?.claimable || [];
}

export async function claimProperty(payload = {}, headers) {
  let body;

  // New flow: claim by property_id
  if (payload.property_id || payload.propertyId) {
    body = {
      property_id: payload.property_id || payload.propertyId,
    };
  } else {
    // Legacy flow: claim by address
    body = {
      street_1: payload.street || payload.street_1 || payload.address,
      city: payload.city,
      state: payload.state,
      postal_code: payload.zip || payload.postal_code,
    };

    // Validate required fields
    if (!body.street_1) throw new Error('Street address is required');
    if (!body.city) throw new Error('City is required');
    if (!body.state) throw new Error('State is required');
  }

  const { data } = await axios.post(
    '/api/properties/claim',
    body,
    { headers, withCredentials: true }
  );
  return data;
}

export async function verifyPropertyMembership(propertyId, payload = {}, headers) {
  if (!propertyId) throw new Error('propertyId is required');
  const { data } = await axios.post(
    `/api/properties/${encodeURIComponent(propertyId)}/verify`,
    payload,
    { headers, withCredentials: true }
  );
  return data;
}
