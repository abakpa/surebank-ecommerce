import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearWalletMessages,
  clearWalletPaymentState,
  fetchWalletRequest,
  initializeWalletFundingRequest,
} from '../redux/slices/walletSlice';

const formatCurrency = (amount) => `N${Number(amount || 0).toLocaleString()}`;
const isDebitTransaction = (transaction) => ['Debit', 'Bought', 'Delivered', 'Purchased'].includes(transaction?.direction);

const Wallet = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, customer: authCustomer, accountNumber } = useSelector((state) => state.auth);
  const {
    customer,
    account,
    dsAccounts,
    transactions,
    loading,
    error,
    fundingLoading,
    fundingError,
    lastFundingResult,
  } = useSelector((state) => state.wallet);

  const [amount, setAmount] = useState('');
  const [dsAmount, setDsAmount] = useState('');
  const [selectedDSAccountId, setSelectedDSAccountId] = useState('');
  const [dsFundingError, setDSFundingError] = useState('');

  useEffect(() => {
    if (!selectedDSAccountId && dsAccounts?.length > 0) {
      setSelectedDSAccountId(dsAccounts[0]._id);
    }
  }, [dsAccounts, selectedDSAccountId]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=wallet');
      return;
    }

    dispatch(fetchWalletRequest());

    return () => {
      dispatch(clearWalletMessages());
      dispatch(clearWalletPaymentState());
    };
  }, [dispatch, isAuthenticated, navigate]);

  const walletBalance = useMemo(() => Number(account?.availableBalance || 0), [account?.availableBalance]);
  const selectedDSAccount = useMemo(
    () => (dsAccounts || []).find((dsAccount) => dsAccount._id === selectedDSAccountId) || null,
    [dsAccounts, selectedDSAccountId]
  );

  const handleFundWallet = (event) => {
    event.preventDefault();

    dispatch(initializeWalletFundingRequest({
      fundingData: {
        amount,
        callbackUrl: `${window.location.origin}/payment/wallet/verify`,
      },
      onSuccess: (data) => {
        window.location.href = data.authorization_url;
      },
    }));
  };

  const handleFundDSPackage = (event) => {
    event.preventDefault();
    setDSFundingError('');

    if (!selectedDSAccount) {
      setDSFundingError('Select a DS package to fund.');
      return;
    }

    const paymentAmount = Number(dsAmount);
    const packageAmount = Number(selectedDSAccount.amountPerDay || 0);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setDSFundingError('Enter a valid amount.');
      return;
    }

    if (paymentAmount < packageAmount) {
      setDSFundingError(`Amount cannot be less than ${formatCurrency(packageAmount)}.`);
      return;
    }

    if (packageAmount > 0 && paymentAmount % packageAmount !== 0) {
      setDSFundingError(`Amount must be a multiple of ${formatCurrency(packageAmount)}.`);
      return;
    }

    dispatch(initializeWalletFundingRequest({
      fundingData: {
        fundingType: 'ds_package',
        dsAccountId: selectedDSAccount._id,
        amount: dsAmount,
        callbackUrl: `${window.location.origin}/payment/wallet/verify?funding=ds`,
      },
      onSuccess: (data) => {
        window.location.href = data.authorization_url;
      },
      onError: (message) => setDSFundingError(message),
    }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Wallet</h1>
          <p className="text-gray-600 mt-2">
            Your phone number is your wallet account number. Fund it from here and track wallet activity.
          </p>
        </div>
        <Link
          to="/orders"
          className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          View Orders
        </Link>
      </div>

      {(error || fundingError || dsFundingError) && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || fundingError || dsFundingError}
        </div>
      )}

      {(location.state?.message || lastFundingResult?.paymentDetails) && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {location.state?.message || `${lastFundingResult.paymentType === 'ds_package' ? 'DS package funded successfully.' : 'Wallet funded successfully.'} Reference: ${lastFundingResult.paymentDetails.reference}`}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr,0.9fr]">
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-orange-50 p-5">
              <p className="text-sm text-orange-700">Wallet Balance</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(walletBalance)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Wallet Number</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {account?.accountNumber || accountNumber || customer?.phone || authCustomer?.phone}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Wallet Activity</h2>
              <button
                type="button"
                onClick={() => dispatch(fetchWalletRequest())}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-gray-500">
                Loading wallet transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-gray-500">
                No wallet transactions yet.
              </div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {transactions.map((transaction) => (
                    <div key={transaction._id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 break-words">{transaction.narration}</p>
                          <p className="mt-1 text-xs text-gray-500">{transaction.date}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          isDebitTransaction(transaction)
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {transaction.direction}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className={`font-semibold ${
                          isDebitTransaction(transaction) ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isDebitTransaction(transaction) ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </span>
                        <span className="text-gray-600">Bal: {formatCurrency(transaction.balance)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Narration</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Amount</th>
                      <th className="px-3 py-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((transaction) => (
                      <tr key={transaction._id} className="text-sm text-gray-700">
                        <td className="px-3 py-4 whitespace-nowrap">{transaction.date}</td>
                        <td className="px-3 py-4 min-w-[280px]">{transaction.narration}</td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            isDebitTransaction(transaction)
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {transaction.direction}
                          </span>
                        </td>
                        <td className={`px-3 py-4 whitespace-nowrap font-semibold ${
                          isDebitTransaction(transaction) ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isDebitTransaction(transaction) ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">{formatCurrency(transaction.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="space-y-5 h-fit">
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900">Fund Wallet</h2>
            <p className="text-sm text-gray-600 mt-2">
              Add money to your wallet with Paystack. The money will reflect against your phone-number account.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleFundWallet}>
              <div>
                <label htmlFor="wallet-amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  id="wallet-amount"
                  type="number"
                  min="100"
                  step="100"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="1000"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={fundingLoading}
                className="w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {fundingLoading ? 'Redirecting...' : 'Deposit'}
              </button>
            </form>
          </section>

          {dsAccounts?.length > 0 && (
            <section className="bg-white rounded-3xl shadow-sm border border-purple-100 p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900">Fund DS Package</h2>
              <p className="text-sm text-gray-600 mt-2">
                Pay directly into a DS package. The contribution stays tied to the staff and branch that created the package.
              </p>

              <form className="mt-5 space-y-4" onSubmit={handleFundDSPackage}>
                <div>
                  <label htmlFor="ds-package" className="block text-sm font-medium text-gray-700 mb-2">
                    DS Package
                  </label>
                  <select
                    id="ds-package"
                    value={selectedDSAccountId}
                    onChange={(event) => setSelectedDSAccountId(event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    required
                  >
                    {dsAccounts.map((dsAccount) => (
                      <option key={dsAccount._id} value={dsAccount._id}>
                        {dsAccount.DSAccountNumber} - {dsAccount.accountType} - {formatCurrency(dsAccount.amountPerDay)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDSAccount && (
                  <div className="rounded-2xl bg-purple-50 p-4 text-sm text-purple-950">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-purple-700">Current contribution</span>
                      <span className="font-bold">{formatCurrency(selectedDSAccount.totalContribution)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-purple-700">Daily package</span>
                      <span className="font-bold">{formatCurrency(selectedDSAccount.amountPerDay)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="ds-amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    id="ds-amount"
                    type="number"
                    min={selectedDSAccount?.amountPerDay || 100}
                    step={selectedDSAccount?.amountPerDay || 100}
                    value={dsAmount}
                    onChange={(event) => setDsAmount(event.target.value)}
                    placeholder={String(selectedDSAccount?.amountPerDay || 1000)}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={fundingLoading}
                  className="w-full rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                >
                  {fundingLoading ? 'Redirecting...' : 'Deposit to DS Package'}
                </button>
              </form>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Wallet;
