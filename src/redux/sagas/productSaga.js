import { call, put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';
import {
  fetchProductsRequest,
  fetchProductsSuccess,
  fetchProductsFailure,
  fetchProductByIdRequest,
  fetchProductByIdSuccess,
  fetchProductByIdFailure,
  fetchFeaturedProductsRequest,
  fetchFeaturedProductsSuccess,
  fetchFeaturedProductsFailure,
  fetchCategoriesRequest,
  fetchCategoriesSuccess,
  fetchCategoriesFailure,
} from '../slices/productSlice';
import { API_URL } from '../../utils/api';

function* fetchProductsSaga(action) {
  try {
    const { append, ...params } = action.payload || {};
    const queryString = new URLSearchParams(params).toString();
    const response = yield call(axios.get, `${API_URL}/api/products?${queryString}`);
    yield put(fetchProductsSuccess({ ...response.data, append }));
  } catch (error) {
    yield put(fetchProductsFailure(error.response?.data?.message || 'Failed to fetch products'));
  }
}

function* fetchProductByIdSaga(action) {
  try {
    const { productId } = action.payload;
    const response = yield call(axios.get, `${API_URL}/api/products/${productId}`);
    yield put(fetchProductByIdSuccess(response.data));
  } catch (error) {
    yield put(fetchProductByIdFailure(error.response?.data?.message || 'Failed to fetch product'));
  }
}

function* fetchFeaturedProductsSaga(action) {
  try {
    const limit = action.payload?.limit || 8;
    const response = yield call(axios.get, `${API_URL}/api/products/featured?limit=${limit}`);
    yield put(fetchFeaturedProductsSuccess(response.data));
  } catch (error) {
    yield put(fetchFeaturedProductsFailure(error.response?.data?.message || 'Failed to fetch featured products'));
  }
}

function* fetchCategoriesSaga() {
  try {
    const response = yield call(axios.get, `${API_URL}/api/categories`);
    yield put(fetchCategoriesSuccess(response.data));
  } catch (error) {
    yield put(fetchCategoriesFailure(error.response?.data?.message || 'Failed to fetch categories'));
  }
}

export default function* productSaga() {
  yield takeLatest(fetchProductsRequest.type, fetchProductsSaga);
  yield takeLatest(fetchProductByIdRequest.type, fetchProductByIdSaga);
  yield takeLatest(fetchFeaturedProductsRequest.type, fetchFeaturedProductsSaga);
  yield takeLatest(fetchCategoriesRequest.type, fetchCategoriesSaga);
}
