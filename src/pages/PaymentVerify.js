import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { verifyPaymentRequest } from '../redux/slices/orderSlice';

const PaymentVerify = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const hasTriggeredRef = useRef(false);

  const { error, paymentVerified, currentOrder } = useSelector((state) => state.orders);

  useEffect(() => {
    if (reference && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      dispatch(verifyPaymentRequest({ reference, navigate }));
    }
  }, [reference, dispatch, navigate]);

  useEffect(() => {
    if (paymentVerified && currentOrder) {
      navigate(`/order-confirmation/${currentOrder.orderNumber}`);
    }
  }, [paymentVerified, currentOrder, navigate]);

  if (!reference) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Payment Reference</h2>
          <p className="text-gray-600 mb-6">No payment reference was provided.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment</h2>
        <p className="text-gray-600">Please wait while we verify your payment...</p>
        <p className="text-sm text-gray-400 mt-4">Reference: {reference}</p>
      </div>
    </div>
  );
};

export default PaymentVerify;
