import apiConfig from './apiConfig';

const config = {
  // apiOrigin is the bare origin (no trailing /api); apiBasePath adds /api for convenience.
  apiOrigin: apiConfig.apiOrigin,
  apiBasePath: apiConfig.apiBasePath,
  // SSO configuration
  identityUrl: apiConfig.identityUrl,
  ssoClientId: apiConfig.ssoClientId,
};

// CommonJS compatibility for tooling (guarded for browser)
if (typeof module !== 'undefined' && module?.exports) {
  module.exports = config; // eslint-disable-line no-undef
}

export default config;
