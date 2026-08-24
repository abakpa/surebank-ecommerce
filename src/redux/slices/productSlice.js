import { createSlice } from '@reduxjs/toolkit';

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
};

const defaultProductsPagination = {
  page: 1,
  limit: 0,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const normalizePaginationPayload = (payload) => ({
  ...defaultProductsPagination,
  ...(payload?.pagination || {}),
});

const initialState = {
  products: [],
  productsPagination: defaultProductsPagination,
  product: null,
  featuredProducts: [],
  categories: [],
  loading: false,
  productsLoading: false,
  productsLoaded: false,
  productLoading: false,
  productLoaded: false,
  error: null,
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    fetchProductsRequest: (state) => {
      state.loading = true;
      state.productsLoading = true;
      state.error = null;
    },
    fetchProductsSuccess: (state, action) => {
      state.loading = false;
      state.productsLoading = false;
      state.productsLoaded = true;
      state.products = normalizeListPayload(action.payload);
      state.productsPagination = normalizePaginationPayload(action.payload);
    },
    fetchProductsFailure: (state, action) => {
      state.loading = false;
      state.productsLoading = false;
      state.productsLoaded = true;
      state.error = action.payload;
    },
    fetchProductByIdRequest: (state) => {
      state.loading = true;
      state.productLoading = true;
      state.productLoaded = false;
      state.error = null;
    },
    fetchProductByIdSuccess: (state, action) => {
      state.loading = false;
      state.productLoading = false;
      state.productLoaded = true;
      state.product = action.payload;
    },
    fetchProductByIdFailure: (state, action) => {
      state.loading = false;
      state.productLoading = false;
      state.productLoaded = true;
      state.error = action.payload;
    },
    fetchFeaturedProductsRequest: (state) => {
      state.loading = true;
    },
    fetchFeaturedProductsSuccess: (state, action) => {
      state.loading = false;
      state.featuredProducts = normalizeListPayload(action.payload);
    },
    fetchFeaturedProductsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchCategoriesRequest: (state) => {
      state.loading = true;
    },
    fetchCategoriesSuccess: (state, action) => {
      state.loading = false;
      state.categories = normalizeListPayload(action.payload);
    },
    fetchCategoriesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearProduct: (state) => {
      state.product = null;
      state.productLoaded = false;
    },
  },
});

export const {
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
  clearProduct,
} = productSlice.actions;

export default productSlice.reducer;
