import { call, put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';
import {
  fetchWalletRequest,
  fetchWalletSuccess,
  fetchWalletFailure,
  initializeWalletFundingRequest,
  initializeWalletFundingSuccess,
  initializeWalletFundingFailure,
  verifyWalletFundingRequest,
  verifyWalletFundingSuccess,
  verifyWalletFundingFailure,
} from '../slices/walletSlice';
import { API_URL, getAuthHeader } from '../../utils/api';

const getErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;

  if (typeof message === 'string') {
    return message;
  }

  if (message && typeof message === 'object') {
    return message.message || message.name || fallback;
  }

  return fallback;
};

function* fetchWalletSaga() {
  try {
    const response = yield call(
      axios.get,
      `${API_URL}/api/ecommerce/auth/wallet`,
      { headers: getAuthHeader() }
    );
    yield put(fetchWalletSuccess(response.data));
  } catch (error) {
    yield put(fetchWalletFailure(getErrorMessage(error, 'Failed to fetch wallet')));
  }
}

function* initializeWalletFundingSaga(action) {
  const { fundingData, onSuccess, onError } = action.payload;
  try {
    const response = yield call(
      axios.post,
      `${API_URL}/api/ecommerce/auth/wallet/fund/initialize`,
      fundingData,
      { headers: getAuthHeader() }
    );

    yield put(initializeWalletFundingSuccess(response.data.data));

    if (onSuccess) {
      onSuccess(response.data.data);
    }
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to initialize wallet funding');
    yield put(
      initializeWalletFundingFailure(message)
    );
    if (onError) {
      onError(message);
    }
  }
}

function* verifyWalletFundingSaga(action) {
  try {
    const { reference, navigate } = action.payload;
    const response = yield call(
      axios.get,
      `${API_URL}/api/ecommerce/auth/wallet/fund/verify/${reference}`,
      { headers: getAuthHeader() }
    );

    yield put(verifyWalletFundingSuccess(response.data));

    if (navigate) {
      navigate('/orders');
    }
  } catch (error) {
    yield put(
      verifyWalletFundingFailure(
        getErrorMessage(error, 'Failed to verify wallet funding')
      )
    );
  }
}

export default function* walletSaga() {
  yield takeLatest(fetchWalletRequest.type, fetchWalletSaga);
  yield takeLatest(initializeWalletFundingRequest.type, initializeWalletFundingSaga);
  yield takeLatest(verifyWalletFundingRequest.type, verifyWalletFundingSaga);
}
