import { call, put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';
import {
  fetchOrdersRequest,
  fetchOrdersSuccess,
  fetchOrdersFailure,
  fetchOrderByNumberRequest,
  fetchOrderByNumberSuccess,
  fetchOrderByNumberFailure,
  payoffRemainingBalanceRequest,
  payoffRemainingBalanceSuccess,
  payoffRemainingBalanceFailure,
  initializeOrderDepositRequest,
  initializeOrderDepositSuccess,
  initializeOrderDepositFailure,
  initializePaymentRequest,
  initializePaymentSuccess,
  initializePaymentFailure,
  verifyPaymentRequest,
  verifyPaymentSuccess,
  verifyPaymentFailure,
} from '../slices/orderSlice';
import { clearCartSuccess } from '../slices/cartSlice';
import { fetchWalletRequest } from '../slices/walletSlice';
import { API_URL, getAuthHeader } from '../../utils/api';

function* fetchOrdersSaga() {
  try {
    const config = { headers: getAuthHeader() };
    const response = yield call(axios.get, `${API_URL}/api/ecommerce/orders/my-orders`, config);
    yield put(fetchOrdersSuccess(response.data));
  } catch (error) {
    yield put(fetchOrdersFailure(error.response?.data?.message || 'Failed to fetch orders'));
  }
}

function* fetchOrderByNumberSaga(action) {
  try {
    const { orderNumber } = action.payload;
    const config = { headers: getAuthHeader() };
    const response = yield call(axios.get, `${API_URL}/api/ecommerce/orders/number/${orderNumber}`, config);
    yield put(fetchOrderByNumberSuccess(response.data));
  } catch (error) {
    yield put(fetchOrderByNumberFailure(error.response?.data?.message || 'Failed to fetch order'));
  }
}

function* initializePaymentSaga(action) {
  try {
    console.log('Initializing payment with data:', action.payload.paymentData);
    const config = { headers: getAuthHeader() };
    const response = yield call(
      axios.post,
      `${API_URL}/api/ecommerce/orders/payment/initialize`,
      action.payload.paymentData,
      config
    );
    console.log('Payment initialization response:', response.data);

    yield put(initializePaymentSuccess(response.data.data));

    if (response.data.data?.paymentSource === 'wallet' && response.data.data?.order) {
      yield put(clearCartSuccess());
      yield put(fetchWalletRequest());
    }

    // Call the callback with payment data if provided
    if (action.payload.onSuccess) {
      action.payload.onSuccess(response.data.data);
    }
  } catch (error) {
    console.error('Payment initialization error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Failed to initialize payment';
    yield put(initializePaymentFailure(errorMessage));
    if (action.payload.onError) {
      action.payload.onError(errorMessage);
    }
  }
}

function* payoffRemainingBalanceSaga(action) {
  try {
    const { orderNumber, onSuccess } = action.payload;
    const config = { headers: getAuthHeader() };
    const response = yield call(
      axios.post,
      `${API_URL}/api/ecommerce/orders/number/${orderNumber}/payoff`,
      {},
      config
    );
    yield put(payoffRemainingBalanceSuccess(response.data));
    yield put(fetchWalletRequest());

    if (onSuccess) {
      onSuccess(response.data);
    }
  } catch (error) {
    yield put(
      payoffRemainingBalanceFailure(
        error.response?.data?.message || 'Failed to pay remaining balance from wallet'
      )
    );
  }
}

function* initializeOrderDepositSaga(action) {
  const { orderNumber, amount, customerEmail, onSuccess, onError } = action.payload;
  try {
    const config = { headers: getAuthHeader() };
    const response = yield call(
      axios.post,
      `${API_URL}/api/ecommerce/orders/number/${orderNumber}/deposit/initialize`,
      {
        amount,
        customerEmail,
        callbackUrl: `${window.location.origin}/payment/verify`,
      },
      config
    );

    yield put(initializeOrderDepositSuccess(response.data.data));
    if (onSuccess) {
      onSuccess(response.data.data);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to initialize order deposit';
    yield put(initializeOrderDepositFailure(errorMessage));
    if (onError) {
      onError(errorMessage);
    }
  }
}

function* verifyPaymentSaga(action) {
  try {
    const { reference, navigate } = action.payload;
    const config = { headers: getAuthHeader() };
    const response = yield call(
      axios.get,
      `${API_URL}/api/ecommerce/orders/payment/verify/${reference}`,
      config
    );
    yield put(verifyPaymentSuccess(response.data));
    yield put(clearCartSuccess());

    if (navigate && response.data.order) {
      navigate(`/orders?orderNumber=${response.data.order.orderNumber}`);
    }
  } catch (error) {
    yield put(verifyPaymentFailure(error.response?.data?.message || 'Failed to verify payment'));
  }
}

export default function* orderSaga() {
  yield takeLatest(fetchOrdersRequest.type, fetchOrdersSaga);
  yield takeLatest(fetchOrderByNumberRequest.type, fetchOrderByNumberSaga);
  yield takeLatest(payoffRemainingBalanceRequest.type, payoffRemainingBalanceSaga);
  yield takeLatest(initializeOrderDepositRequest.type, initializeOrderDepositSaga);
  yield takeLatest(initializePaymentRequest.type, initializePaymentSaga);
  yield takeLatest(verifyPaymentRequest.type, verifyPaymentSaga);
}
