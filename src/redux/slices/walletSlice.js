import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  customer: null,
  account: null,
  dsAccounts: [],
  dsTransactions: [],
  transactions: [],
  loading: false,
  error: null,
  fundingLoading: false,
  fundingError: null,
  fundingData: null,
  verifying: false,
  verifyError: null,
  fundingVerified: false,
  lastFundingResult: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    fetchWalletRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchWalletSuccess: (state, action) => {
      state.loading = false;
      state.customer = action.payload.customer;
      state.account = action.payload.account;
      state.dsAccounts = action.payload.dsAccounts || [];
      state.dsTransactions = action.payload.dsTransactions || [];
      state.transactions = action.payload.transactions || [];
    },
    fetchWalletFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    initializeWalletFundingRequest: (state) => {
      state.fundingLoading = true;
      state.fundingError = null;
      state.fundingData = null;
      state.fundingVerified = false;
      state.verifyError = null;
    },
    initializeWalletFundingSuccess: (state, action) => {
      state.fundingLoading = false;
      state.fundingData = action.payload;
    },
    initializeWalletFundingFailure: (state, action) => {
      state.fundingLoading = false;
      state.fundingError = action.payload;
    },
    verifyWalletFundingRequest: (state) => {
      state.verifying = true;
      state.verifyError = null;
      state.fundingVerified = false;
    },
    verifyWalletFundingSuccess: (state, action) => {
      state.verifying = false;
      state.fundingVerified = true;
      state.account = action.payload.account;
      state.dsAccounts = action.payload.dsAccounts || state.dsAccounts || [];
      state.dsTransactions = action.payload.dsTransactions || state.dsTransactions || [];
      state.transactions = action.payload.transactions || [];
      state.lastFundingResult = action.payload;
    },
    verifyWalletFundingFailure: (state, action) => {
      state.verifying = false;
      state.verifyError = action.payload;
      state.fundingVerified = false;
    },
    clearWalletMessages: (state) => {
      state.error = null;
      state.fundingError = null;
      state.verifyError = null;
    },
    clearWalletPaymentState: (state) => {
      state.fundingData = null;
      state.fundingLoading = false;
      state.verifying = false;
      state.fundingVerified = false;
      state.fundingError = null;
      state.verifyError = null;
      state.lastFundingResult = null;
    },
  },
});

export const {
  fetchWalletRequest,
  fetchWalletSuccess,
  fetchWalletFailure,
  initializeWalletFundingRequest,
  initializeWalletFundingSuccess,
  initializeWalletFundingFailure,
  verifyWalletFundingRequest,
  verifyWalletFundingSuccess,
  verifyWalletFundingFailure,
  clearWalletMessages,
  clearWalletPaymentState,
} = walletSlice.actions;

export default walletSlice.reducer;
