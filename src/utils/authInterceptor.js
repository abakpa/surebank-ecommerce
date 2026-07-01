import axios from 'axios';

let isRedirectingToLogin = false;

const clearCustomerSession = () => {
  localStorage.removeItem('customerToken');
  localStorage.removeItem('customerData');
  localStorage.removeItem('customerAccountNumber');
  localStorage.removeItem('customerSBAccountNumber');
};

const getLoginUrl = () => {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const redirectPath = currentPath.replace(/^\//, '');
  const params = new URLSearchParams({ sessionExpired: '1' });

  if (redirectPath && !redirectPath.startsWith('login')) {
    params.set('redirect', redirectPath);
  }

  return `/login?${params.toString()}`;
};

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 401 &&
      localStorage.getItem('customerToken') &&
      !isRedirectingToLogin
    ) {
      isRedirectingToLogin = true;
      clearCustomerSession();
      window.location.assign(getLoginUrl());
    }

    return Promise.reject(error);
  }
);
