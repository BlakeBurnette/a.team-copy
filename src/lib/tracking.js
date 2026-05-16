// src/lib/tracking.js
// UTM parameter + referral code tracking for marketing campaigns

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const REF_KEY = 'ref';
const STORAGE_KEY = 'payhive_tracking';

/**
 * Captures UTM params and ref code from the current URL and persists them
 * in sessionStorage. Call once on page load (e.g., in a useEffect).
 * Later values overwrite earlier ones so the most recent click wins.
 */
export function captureTrackingParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    const existing = getTrackingData();
    let updated = false;

    for (const key of UTM_KEYS) {
      const val = params.get(key);
      if (val) {
        existing[key] = val;
        updated = true;
      }
    }

    const ref = params.get(REF_KEY);
    if (ref) {
      existing.ref = ref;
      updated = true;
    }

    // Always capture the landing page on first visit
    if (!existing.landing_page) {
      existing.landing_page = window.location.pathname;
      updated = true;
    }

    if (updated) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  } catch {
    // sessionStorage may be unavailable in some contexts
  }
}

/**
 * Returns the stored tracking data (UTM params + ref code).
 * Merge this into your lead-creation payload.
 */
export function getTrackingData() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Returns just the referral code, or null if none.
 */
export function getReferralCode() {
  return getTrackingData().ref || null;
}
