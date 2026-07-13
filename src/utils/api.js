const LOCAL_API_URL = 'http://localhost:8080';
const REMOTE_API_URL = 'https://surebank-backend.onrender.com';
const VERCEL_PROXY_API_URL = '';

const isLocalhostUrl = (value = '') => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
const isLocalBrowser = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};
const isVercelBrowser = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.vercel.app');
};

const getDefaultApiUrl = () => {
  if (isLocalBrowser()) {
    return LOCAL_API_URL;
  }

  if (isVercelBrowser()) {
    return VERCEL_PROXY_API_URL;
  }

  return REMOTE_API_URL;
};

const getConfiguredApiUrl = () => {
  const configuredUrl = process.env.REACT_APP_API_URL?.replace(/\/$/, '');
  if (!configuredUrl) {
    return getDefaultApiUrl();
  }

  if (!isLocalBrowser() && isLocalhostUrl(configuredUrl)) {
    return getDefaultApiUrl();
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
