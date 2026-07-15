import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearWalletMessages,
  fetchWalletRequest,
  initializeWalletFundingRequest,
} from '../redux/slices/walletSlice';

const formatCurrency = (amount) => `N${Number(amount || 0).toLocaleString()}`;
const isDebitLike = (transaction) => ['Debit', 'Charge'].includes(transaction?.direction);
const clampPercent = (value) => Math.min(100, Math.max(0, Number(value || 0)));

const StatusPill = ({ transaction }) => {
  const debit = isDebitLike(transaction);

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
      debit ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
    }`}>
      {transaction.direction || 'N/A'}
    </span>
  );
};

const MyDS = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const {
    dsAccounts,
    dsTransactions,
    loading,
    error,
    fundingLoading,
    fundingError,
  } = useSelector((state) => state.wallet);
  const [selectedDSAccountId, setSelectedDSAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [flashMessage, setFlashMessage] = useState(location.state?.message || '');
  const [isPackageDropdownOpen, setIsPackageDropdownOpen] = useState(false);
  const packageDropdownRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchWalletRequest());
    }

    return () => {
      dispatch(clearWalletMessages());
    };
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!selectedDSAccountId && dsAccounts?.length > 0) {
      setSelectedDSAccountId(dsAccounts[0]._id);
    }
  }, [dsAccounts, selectedDSAccountId]);

  useEffect(() => {
    if (!location.state?.message) return undefined;

    setFlashMessage(location.state.message);
    navigate(location.pathname, { replace: true, state: {} });

    const timeoutId = window.setTimeout(() => {
      setFlashMessage('');
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!packageDropdownRef.current || packageDropdownRef.current.contains(event.target)) {
        return;
      }

      setIsPackageDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDSAccount = useMemo(
    () => (dsAccounts || []).find((dsAccount) => dsAccount._id === selectedDSAccountId) || null,
    [dsAccounts, selectedDSAccountId]
  );

  const filteredTransactions = useMemo(() => {
    if (!selectedDSAccount) return dsTransactions || [];
    return (dsTransactions || []).filter((transaction) => (
      transaction.accountTypeId === selectedDSAccount._id
    ));
  }, [dsTransactions, selectedDSAccount]);

  const targetDays = 31;
  const daysPaid = Number(selectedDSAccount?.totalCount || 0);
  const progressPercent = clampPercent((daysPaid / targetDays) * 100);

  const handleDeposit = (event) => {
    event.preventDefault();
    setFormError('');

    if (!selectedDSAccount) {
      setFormError('Select a DS package to fund.');
      return;
    }

    const paymentAmount = Number(amount);
    const packageAmount = Number(selectedDSAccount.amountPerDay || 0);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }

    if (paymentAmount < packageAmount) {
      setFormError(`Amount cannot be less than ${formatCurrency(packageAmount)}.`);
      return;
    }

    if (packageAmount > 0 && paymentAmount % packageAmount !== 0) {
      setFormError(`Amount must be a multiple of ${formatCurrency(packageAmount)}.`);
      return;
    }

    dispatch(initializeWalletFundingRequest({
      fundingData: {
        fundingType: 'ds_package',
        dsAccountId: selectedDSAccount._id,
        amount,
        callbackUrl: `${window.location.origin}/payment/wallet/verify?funding=ds`,
      },
      onSuccess: (data) => {
        window.location.href = data.authorization_url;
      },
      onError: (message) => setFormError(message),
    }));
  };

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=my-ds" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-hidden px-2.5 py-3 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-3 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm sm:mb-6 sm:rounded-3xl">
        <div className="relative p-4 sm:p-7">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-orange-500/20 sm:h-32 sm:w-32" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-orange-300">Daily savings</p>
              <h1 className="mt-1 text-xl font-black tracking-normal sm:text-3xl">My DS</h1>
              <p className="mt-1 max-w-xl text-xs text-slate-300 sm:text-base">
                Deposit into your DS package and keep track of every contribution.
              </p>
            </div>
            {selectedDSAccount && (
              <div className="min-w-0 rounded-2xl bg-white/10 px-3 py-2 text-xs backdrop-blur sm:px-4 sm:py-3 sm:text-sm">
                <p className="text-slate-300">Active package</p>
                <p className="mt-0.5 truncate font-black text-white">{selectedDSAccount.DSAccountNumber}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {(flashMessage || error || fundingError || formError) && (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
          flashMessage
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {flashMessage || error || fundingError || formError}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-slate-500 shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
          <p className="font-semibold">Loading DS accounts...</p>
        </div>
      ) : dsAccounts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
          </div>
          <p className="font-bold text-slate-900">No DS package found.</p>
          <p className="mt-1 text-sm text-slate-500">A staff member needs to create a DS package for your account first.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-5">
          <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm sm:rounded-3xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-slate-950 sm:text-lg">Your DS Packages</h2>
              <button
                type="button"
                onClick={() => dispatch(fetchWalletRequest())}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
            <div className="-mx-2 flex max-w-full gap-2 overflow-x-auto px-2 pb-1 sm:gap-3">
              {dsAccounts.map((dsAccount) => {
                const active = dsAccount._id === selectedDSAccountId;
                return (
                  <button
                    key={dsAccount._id}
                    type="button"
                    onClick={() => setSelectedDSAccountId(dsAccount._id)}
                    className={`min-w-[168px] max-w-[168px] rounded-2xl border p-3 text-left transition sm:min-w-[220px] sm:max-w-[220px] sm:p-4 ${
                      active
                        ? 'border-purple-300 bg-purple-50 shadow-sm'
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <p className={`truncate text-[11px] font-bold uppercase sm:text-xs ${active ? 'text-purple-700' : 'text-slate-500'}`}>
                      {dsAccount.accountType}
                    </p>
                    <p className="mt-1 truncate text-sm font-black text-slate-950 sm:text-lg">{dsAccount.DSAccountNumber}</p>
                    <p className="mt-2 truncate text-xs font-semibold text-slate-600 sm:text-sm">
                      {formatCurrency(dsAccount.amountPerDay)} daily
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedDSAccount && (
            <section className="min-w-0 rounded-2xl border border-purple-100 bg-purple-50 p-4 shadow-sm sm:rounded-3xl sm:p-5">
              <p className="text-xs font-bold uppercase text-purple-700">Selected DS balance</p>
              <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <p className="break-words text-2xl font-black text-purple-950 sm:text-3xl">
                  {formatCurrency(selectedDSAccount.totalContribution)}
                </p>
                <p className="text-sm font-semibold text-purple-700">
                  {selectedDSAccount.DSAccountNumber} | {selectedDSAccount.accountType}
                </p>
              </div>
            </section>
          )}

          {selectedDSAccount && (
            <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-slate-700">Package progress</span>
                <span className="font-black text-slate-950">{Math.round(progressPercent)}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-purple-600"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </section>
          )}

          <div className="grid min-w-0 gap-3 lg:grid-cols-[0.85fr,1.35fr] lg:gap-5">
          <section className="min-w-0 rounded-2xl border border-purple-100 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 sm:h-10 sm:w-10">
                <span className="text-lg font-black leading-none">N</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-950 sm:text-lg">Deposit to DS Package</h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Pay securely with Paystack.</p>
              </div>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleDeposit}>
              <div ref={packageDropdownRef} className="relative">
                <label id="ds-package-label" className="mb-2 block text-sm font-medium text-slate-700">
                  DS Package
                </label>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isPackageDropdownOpen}
                  aria-labelledby="ds-package-label"
                  onClick={() => setIsPackageDropdownOpen((open) => !open)}
                  className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-950 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 sm:px-4 sm:py-3"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {selectedDSAccount
                      ? `${selectedDSAccount.DSAccountNumber} - ${selectedDSAccount.accountType} - ${formatCurrency(selectedDSAccount.amountPerDay)}`
                      : 'Select DS package'}
                  </span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isPackageDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                  </svg>
                </button>
                {isPackageDropdownOpen && (
                  <div
                    role="listbox"
                    aria-labelledby="ds-package-label"
                    className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
                  >
                    {dsAccounts.map((dsAccount) => {
                      const active = dsAccount._id === selectedDSAccountId;

                      return (
                        <button
                          key={dsAccount._id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setSelectedDSAccountId(dsAccount._id);
                            setIsPackageDropdownOpen(false);
                          }}
                          className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left text-sm transition ${
                            active ? 'bg-purple-50 text-purple-950' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-black">{dsAccount.DSAccountNumber}</span>
                          <span className="mt-0.5 text-xs font-semibold text-slate-500">
                            {dsAccount.accountType} | {formatCurrency(dsAccount.amountPerDay)} daily
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="ds-amount" className="mb-2 block text-sm font-medium text-slate-700">
                  Amount
                </label>
                <input
                  id="ds-amount"
                  type="number"
                  min={selectedDSAccount?.amountPerDay || 100}
                  step={selectedDSAccount?.amountPerDay || 100}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={String(selectedDSAccount?.amountPerDay || 1000)}
                  className="w-full min-w-0 rounded-2xl border border-slate-300 px-3 py-2.5 text-base font-bold text-slate-950 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 sm:px-4 sm:py-3"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={fundingLoading}
                className="flex w-full items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {fundingLoading ? 'Redirecting...' : 'Deposit with Paystack'}
              </button>
            </form>
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">DS Transaction History</h2>
                <p className="text-xs text-slate-500 sm:text-sm">Swipe the table sideways on mobile.</p>
              </div>
              <button
                type="button"
                onClick={() => dispatch(fetchWalletRequest())}
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Refresh
              </button>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No DS transactions found for this package.
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-[680px] divide-y divide-slate-200 text-xs sm:min-w-[820px] sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
                      <th className="px-3 py-3.5">Date</th>
                      <th className="px-3 py-3">DS Account</th>
                      <th className="px-3 py-3">Narration</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Amount</th>
                      <th className="px-3 py-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction._id} className="text-slate-700 hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-4 text-xs font-semibold text-slate-500">{transaction.date}</td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <span className="font-bold text-slate-950">{transaction.DSAccountNumber || 'N/A'}</span>
                          <span className="ml-1 text-xs text-slate-400">{transaction.accountType || ''}</span>
                        </td>
                        <td className="min-w-[180px] px-3 py-4 sm:min-w-[240px]">{transaction.narration}</td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <StatusPill transaction={transaction} />
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 font-bold ${
                          isDebitLike(transaction) ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isDebitLike(transaction) ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 font-semibold">{formatCurrency(transaction.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDS;
