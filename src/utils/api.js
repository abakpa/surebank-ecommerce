const LOCAL_API_URL = 'http://localhost:8080';
const PRODUCTION_API_URL = '';

const isLocalhostUrl = (value = '') => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
const isLocalBrowser = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const getDefaultApiUrl = () => {
  if (isLocalBrowser()) {
    return LOCAL_API_URL;
  }

  return PRODUCTION_API_URL;
};

const getConfiguredApiUrl = () => {
  const configuredUrl = process.env.REACT_APP_API_URL?.replace(/\/$/, '');
  if (!configuredUrl) {
    return getDefaultApiUrl();
  }

  if (!isLocalBrowser() && isLocalhostUrl(configuredUrl)) {
    return PRODUCTION_API_URL;
  }

  return configuredUrl;
};

export const API_URL = getConfiguredApiUrl();

export const getAuthHeader = () => {
  const token = localStorage.getItem('customerToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getSessionId = () => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};
