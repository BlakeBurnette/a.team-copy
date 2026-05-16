// Thin wrapper around import.meta.env so Jest tests can mock this module
// instead of failing on import.meta at parse time.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export default env;
