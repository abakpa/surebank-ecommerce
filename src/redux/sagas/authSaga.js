import { call, put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';
import {
  loginRequest,
  loginSuccess,
  loginFailure,
  registerRequest,
  registerSuccess,
  registerFailure,
} from '../slices/authSlice';
import { fetchCartSuccess } from '../slices/cartSlice';
import { API_URL, getSessionId } from '../../utils/api';

function* loginSaga(action) {
  try {
    const { phone, password, navigate, redirect } = action.payload;
    const response = yield call(axios.post, `${API_URL}/api/ecommerce/auth/login`, {
      phone,
      password,
    });

    if (response.data.requiresPasswordUpdate) {
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customerData');
      localStorage.removeItem('customerAccountNumber');
      localStorage.removeItem('customerSBAccountNumber');
      if (navigate) {
        navigate('/admin-reset-password', {
          state: { phone, forced: true },
          replace: true,
        });
      }
      return;
    }

    // Store token first
    const token = response.data.token;
    localStorage.setItem('customerToken', token);

    yield put(loginSuccess(response.data));

    // Merge guest cart with customer cart and wait for it to complete
    const sessionId = getSessionId();
    try {
      const mergeResponse = yield call(
        axios.post,
        `${API_URL}/api/cart/merge`,
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      yield put(fetchCartSuccess(mergeResponse.data.cart));
    } catch (mergeError) {
      console.log('Cart merge failed:', mergeError);
      // If merge fails, fetch the customer cart anyway
      try {
        const cartResponse = yield call(
          axios.get,
          `${API_URL}/api/cart`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        yield put(fetchCartSuccess(cartResponse.data));
      } catch (cartError) {
        console.log('Cart fetch failed:', cartError);
      }
    }

    // Navigate after cart merge is complete
    if (navigate) {
      navigate(redirect ? `/${redirect}` : '/');
    }
  } catch (error) {
    yield put(loginFailure(error.response?.data?.message || 'Login failed'));
  }
}

function* registerSaga(action) {
  try {
    const { navigate, redirect, ...customerData } = action.payload;
    const response = yield call(axios.post, `${API_URL}/api/ecommerce/auth/register`, customerData);

    // Store token first
    const token = response.data.token;
    localStorage.setItem('customerToken', token);

    yield put(registerSuccess(response.data));

    // Merge guest cart with customer cart and wait for it to complete
    const sessionId = getSessionId();
    try {
      const mergeResponse = yield call(
        axios.post,
        `${API_URL}/api/cart/merge`,
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      yield put(fetchCartSuccess(mergeResponse.data.cart));
    } catch (mergeError) {
      console.log('Cart merge failed:', mergeError);
      // If merge fails, fetch the customer cart anyway
      try {
        const cartResponse = yield call(
          axios.get,
          `${API_URL}/api/cart`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        yield put(fetchCartSuccess(cartResponse.data));
      } catch (cartError) {
        console.log('Cart fetch failed:', cartError);
      }
    }

    // Navigate after cart merge is complete
    if (navigate) {
      navigate(redirect ? `/${redirect}` : '/');
    }
  } catch (error) {
    yield put(registerFailure(error.response?.data?.message || 'Registration failed'));
  }
}

export default function* authSaga() {
  yield takeLatest(loginRequest.type, loginSaga);
  yield takeLatest(registerRequest.type, registerSaga);
}
