import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateCartItemRequest,
  removeFromCartRequest,
  clearCartRequest,
} from '../redux/slices/cartSlice';
import { initializePaymentRequest } from '../redux/slices/orderSlice';
import { loginRequest, registerRequest, clearError } from '../redux/slices/authSlice';
import { getStates, getLGAs, getTowns } from '../data/nigerianLocations';
import { PRODUCT_FALLBACK_IMAGE, resolveImageUrl } from '../utils/image';

const Cart = () => {
  const dispatch = useDispatch();
  const { items, totalAmount, totalItems, loading } = useSelector((state) => state.cart);
  const { isAuthenticated, customer, loading: authLoading, error: authError } = useSelector((state) => state.auth);
  const { paymentLoading } = useSelector((state) => state.orders);
  const prevAuthRef = useRef(isAuthenticated);

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState(''); // 'installment' or 'outright'
  const [firstPaymentAmount, setFirstPaymentAmount] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressLGA, setAddressLGA] = useState('');
  const [addressTown, setAddressTown] = useState('');
  const [selectedPickupLocation, setSelectedPickupLocation] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Auth modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signup'); // 'signup' or 'login'
  const [showPassword, setShowPassword] = useState(false);
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    state: '',
    password: '',
    referralCode: ''
  });
  const [loginForm, setLoginForm] = useState({
    phone: '',
    password: ''
  });

  // Close auth modal when user logs in
  useEffect(() => {
    if (!prevAuthRef.current && isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
      // Open payment modal after successful login
      setShowPaymentModal(true);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, showAuthModal]);

  // Pre-fill delivery address with customer's default address when payment modal opens
  useEffect(() => {
    if (showPaymentModal && isAuthenticated && customer) {
      // Pre-fill with customer's address (state) if available
      if (customer.address && !addressState) {
        // Check if customer.address matches a state name
        const states = getStates();
        if (states.includes(customer.address)) {
          setAddressState(customer.address);
        } else {
          // If it's a full address, use it as the street address
          if (!deliveryAddress) {
            setDeliveryAddress(customer.address);
          }
        }
      }
    }
  }, [showPaymentModal, isAuthenticated, customer, addressState, deliveryAddress]);

  // Clear auth error when modal closes
  useEffect(() => {
    if (!showAuthModal) {
      dispatch(clearError());
    }
  }, [showAuthModal, dispatch]);

  const handleLogin = () => {
    if (loginForm.phone && loginForm.password) {
      dispatch(loginRequest({
        phone: loginForm.phone,
        password: loginForm.password
      }));
    }
  };

  const handleSignup = () => {
    if (signupForm.fullName && signupForm.phone && signupForm.password) {
      const [firstName, ...lastNameParts] = signupForm.fullName.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      dispatch(registerRequest({
        firstName,
        lastName,
        phone: signupForm.phone,
        email: signupForm.email || '',
        address: signupForm.state || '',
        password: signupForm.password,
        referralCode: signupForm.referralCode || ''
      }));
    }
  };

  // SureBank pickup locations
  const pickupLocations = [
    { id: 1, name: 'SureBank Headquarters', address: '82 Ijesha Road, Surulere, Lagos, Nigeria', phone: '+2347074542997', area: 'Ijesha Surulere Lagos' },
    { id: 2, name: 'SureBank Ikeja Branch', address: '15 Allen Avenue, Ikeja, Lagos, Nigeria', phone: '+2348012345678', area: 'Allen Ikeja Lagos' },
    { id: 3, name: 'SureBank Victoria Island', address: '25 Adeola Odeku Street, Victoria Island, Lagos', phone: '+2348023456789', area: 'VI Lagos' },
    { id: 4, name: 'SureBank Lekki Branch', address: '10 Admiralty Way, Lekki Phase 1, Lagos', phone: '+2348034567890', area: 'Lekki Lagos' }
  ];

  const handleQuantityChange = (productId, quantity) => {
    if (quantity < 1) {
      dispatch(removeFromCartRequest({ productId }));
    } else {
      dispatch(updateCartItemRequest({ productId, quantity }));
    }
  };

  const handleRemove = (productId) => {
    dispatch(removeFromCartRequest({ productId }));
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      dispatch(clearCartRequest());
    }
  };

  const handleStartPayment = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  // Handle installment payment
  const handleInstallmentPayment = useCallback(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // Validate email format only if provided
    if (customerEmail && (!customerEmail.includes('@') || !customerEmail.includes('.'))) {
      setPaymentError('Please provide a valid email address');
      return;
    }

    if (!deliveryMethod) {
      setPaymentError('Please select a delivery method');
      return;
    }

    if (deliveryMethod === 'home' && !deliveryAddress) {
      setPaymentError('Please enter your delivery address');
      return;
    }

    if (deliveryMethod === 'pickup' && !selectedPickupLocation) {
      setPaymentError('Please select a pickup location');
      return;
    }

    const amountToPay = Number(firstPaymentAmount);
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
      setPaymentError('Please enter the amount you want to pay now');
      return;
    }
    if (amountToPay > Number(totalAmount || 0)) {
      setPaymentError(`First payment cannot exceed ₦${Number(totalAmount || 0).toLocaleString()}`);
      return;
    }

    setProcessingPayment(true);
    setPaymentError('');

    const shippingAddress = deliveryMethod === 'home'
      ? `${deliveryAddress}${addressTown ? ', ' + addressTown : ''}${addressLGA ? ', ' + addressLGA : ''}${addressState ? ', ' + addressState : ''}`
      : `PICKUP: ${selectedPickupLocation.name} - ${selectedPickupLocation.address}`;

    const paymentData = {
      paymentType: 'installment',
      firstPaymentAmount: amountToPay,
      amountToPay,
      initialPaymentAmount: amountToPay,
      amountToCharge: amountToPay,
      shippingAddress,
      shippingCity: deliveryMethod === 'home' ? addressLGA : selectedPickupLocation?.area || '',
      shippingState: deliveryMethod === 'home' ? addressState : 'Lagos',
      customerPhone: customer?.phone,
      customerEmail: customerEmail,
      accountNumber: customer?.phone,
      callbackUrl: `${window.location.origin}/payment/verify`,
    };

    console.log('Cart installment payment data:', paymentData);

    dispatch(initializePaymentRequest({
      paymentData,
      onSuccess: (data) => {
        console.log('Cart payment initialized:', data);
        if (data && data.authorization_url) {
          window.location.href = data.authorization_url;
        } else {
          setProcessingPayment(false);
          setPaymentError('Failed to get payment URL. Please try again.');
        }
      },
      onError: (error) => {
        console.error('Cart payment error:', error);
        setProcessingPayment(false);
        setPaymentError(error || 'Payment initialization failed. Please try again.');
      }
    }));
  }, [
    isAuthenticated, customerEmail, deliveryMethod, deliveryAddress, addressState,
    addressLGA, addressTown, selectedPickupLocation, customer, firstPaymentAmount, totalAmount, dispatch
  ]);

  // Handle outright payment (Buy Now, Once)
  const handleOutrightPayment = useCallback(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // Validate email format only if provided
    if (customerEmail && (!customerEmail.includes('@') || !customerEmail.includes('.'))) {
      setPaymentError('Please provide a valid email address');
      return;
    }

    if (!deliveryMethod) {
      setPaymentError('Please select a delivery method');
      return;
    }

    if (deliveryMethod === 'home' && !deliveryAddress) {
      setPaymentError('Please enter your delivery address');
      return;
    }

    if (deliveryMethod === 'pickup' && !selectedPickupLocation) {
      setPaymentError('Please select a pickup location');
      return;
    }

    setProcessingPayment(true);
    setPaymentError('');

    const shippingAddress = deliveryMethod === 'home'
      ? `${deliveryAddress}${addressTown ? ', ' + addressTown : ''}${addressLGA ? ', ' + addressLGA : ''}${addressState ? ', ' + addressState : ''}`
      : `PICKUP: ${selectedPickupLocation.name} - ${selectedPickupLocation.address}`;

    const paymentData = {
      paymentType: 'outright',
      installmentFrequency: null,
      installmentDuration: 1,
      shippingAddress,
      shippingCity: deliveryMethod === 'home' ? addressLGA : selectedPickupLocation?.area || '',
      shippingState: deliveryMethod === 'home' ? addressState : 'Lagos',
      customerPhone: customer?.phone,
      customerEmail: customerEmail,
      accountNumber: customer?.phone,
      callbackUrl: `${window.location.origin}/payment/verify`,
    };

    console.log('Cart outright payment data:', paymentData);

    dispatch(initializePaymentRequest({
      paymentData,
      onSuccess: (data) => {
        console.log('Cart outright payment initialized:', data);
        if (data && data.authorization_url) {
          window.location.href = data.authorization_url;
        } else {
          setProcessingPayment(false);
          setPaymentError('Failed to get payment URL. Please try again.');
        }
      },
      onError: (error) => {
        console.error('Cart outright payment error:', error);
        setProcessingPayment(false);
        setPaymentError(error || 'Payment initialization failed. Please try again.');
      }
    }));
  }, [
    isAuthenticated, customerEmail, deliveryMethod, deliveryAddress, addressState,
    addressLGA, addressTown, selectedPickupLocation, customer, dispatch
  ]);

  // Empty cart view
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Add some products to get started</p>
          <Link
            to="/products"
            className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Page Title */}
      <div className="bg-white py-4 px-4 shadow-sm">
        <h1 className="text-center text-lg font-semibold text-gray-900">My SureBank Cart</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4">
        {/* Cart Summary Card */}
        <div className="bg-gradient-to-b from-orange-50 to-white rounded-xl p-4 shadow-sm">
          {/* Cart Summary Header */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm text-orange-500 font-medium">Cart Summary</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">₦{totalAmount?.toLocaleString()}</p>
            <p className="text-sm text-gray-500">total value</p>
          </div>

          {/* Info Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-700 border border-gray-200">
              {items.length} product{items.length > 1 ? 's' : ''}
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-700 border border-gray-200">
              {totalItems} total item{totalItems > 1 ? 's' : ''}
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-700 border border-gray-200">
              Monthly: 2 to 12 months
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-700 border border-gray-200">
              Weekly: 4 to 48 weeks
            </span>
          </div>

          {/* Promo Badge */}
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-1 bg-white border border-orange-300 text-orange-500 text-xs rounded-full">
              Free delivery on all orders!
            </span>
          </div>

          {/* Start Payment Button */}
          <button
            onClick={handleStartPayment}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium transition-colors"
          >
            Checkout Now
          </button>

          {/* Clear Cart Link */}
          <button
            onClick={handleClearCart}
            className="w-full mt-2 text-center text-sm text-gray-500 hover:text-red-500"
          >
            Clear cart
          </button>
        </div>

        {/* Cart Items */}
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex gap-4">
                {/* Product Image */}
                <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                  <img
                    src={item.image ? resolveImageUrl(item.image) : PRODUCT_FALLBACK_IMAGE}
                    alt={item.productName}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                </Link>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.productId}`}>
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{item.productName}</h3>
                  </Link>

                  {/* Price */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">₦{item.price?.toLocaleString()} x {item.quantity}</p>
                    <p className="text-base font-bold text-gray-900">₦{item.subtotal?.toLocaleString()}</p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <div className="inline-flex items-center bg-orange-500 rounded-full overflow-hidden">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        disabled={loading}
                        className="px-3 py-2 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="px-4 py-2 text-white font-medium min-w-[40px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        disabled={loading}
                        className="px-3 py-2 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(item.productId)}
                      disabled={loading}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Shopping Link */}
        <div className="mt-6 text-center">
          <Link to="/products" className="text-orange-500 hover:text-orange-600 text-sm font-medium">
            ← Continue Shopping
          </Link>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto my-2 sm:my-4">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {!paymentType ? 'Choose Payment Option' : paymentType === 'installment' ? 'Plan your installments' : 'Complete your purchase'}
              </h3>
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentType(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {/* Cart Summary */}
              <div className="bg-orange-50 rounded-lg p-3 mb-4">
                <p className="text-center text-sm text-gray-600">
                  Total cart value: <span className="font-bold text-orange-500">₦{totalAmount?.toLocaleString()}</span>
                </p>
              </div>

              {/* Payment Type Selection - shown first */}
              {!paymentType && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 mb-3">How would you like to pay?</p>

                  {/* Pay Small Small Option */}
                  <button
                    onClick={() => setPaymentType('installment')}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-orange-500 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Pay Small Small</p>
                        <p className="text-sm text-gray-500">Split into daily, weekly, or monthly payments</p>
                      </div>
                    </div>
                  </button>

                  {/* Buy Now, Once Option */}
                  <button
                    onClick={() => setPaymentType('outright')}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-orange-500 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Buy Now, Once</p>
                        <p className="text-sm text-gray-500">Pay full amount now: ₦{totalAmount?.toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Back button for when payment type is selected */}
              {paymentType && (
                <button
                  onClick={() => { setPaymentType(''); setFirstPaymentAmount(''); setDeliveryMethod(''); setTermsAccepted(false); }}
                  className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 mb-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Change payment option
                </button>
              )}

              {/* Installment Payment Flow */}
              {paymentType === 'installment' && (
                <div className="bg-orange-50 rounded-lg p-3 mb-4 border border-orange-200">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-600">Cart total</span>
                    <span className="font-semibold">₦{totalAmount?.toLocaleString()}</span>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount to pay now</label>
                  <input
                    type="number"
                    min="1"
                    max={totalAmount}
                    value={firstPaymentAmount}
                    onChange={(e) => setFirstPaymentAmount(e.target.value)}
                    placeholder="Enter first payment amount"
                    className="w-full px-4 py-3 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Remaining after this payment: ₦{Math.max(0, Number(totalAmount || 0) - Number(firstPaymentAmount || 0)).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Outright Payment - Amount Display */}
              {paymentType === 'outright' && (
                <div className="bg-green-50 rounded-lg p-3 mb-4 border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total to pay now</span>
                    <span className="text-lg font-bold text-green-600">₦{totalAmount?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Delivery Method Selection - shown for both payment types */}
              {((paymentType === 'installment' && Number(firstPaymentAmount) > 0) || paymentType === 'outright') && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Delivery method</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => { setDeliveryMethod('home'); setSelectedPickupLocation(null); }}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium border-2 transition-colors ${
                        deliveryMethod === 'home'
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Home Delivery
                    </button>
                    <button
                      onClick={() => { setDeliveryMethod('pickup'); setDeliveryAddress(''); setAddressState(''); setAddressLGA(''); setAddressTown(''); }}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium border-2 transition-colors ${
                        deliveryMethod === 'pickup'
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Pick Up
                    </button>
                  </div>
                </div>
              )}

              {/* Home Delivery Address Form */}
              {deliveryMethod === 'home' && (
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House number, Street name..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <select
                    value={addressState}
                    onChange={(e) => { setAddressState(e.target.value); setAddressLGA(''); setAddressTown(''); }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select State</option>
                    {getStates().map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {addressState && (
                    <select
                      value={addressLGA}
                      onChange={(e) => { setAddressLGA(e.target.value); setAddressTown(''); }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select LGA</option>
                      {getLGAs(addressState).map((lga) => (
                        <option key={lga} value={lga}>{lga}</option>
                      ))}
                    </select>
                  )}
                  {addressLGA && (
                    <select
                      value={addressTown}
                      onChange={(e) => setAddressTown(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Town</option>
                      {getTowns(addressState, addressLGA).map((town) => (
                        <option key={town} value={town}>{town}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Pickup Location Selection */}
              {deliveryMethod === 'pickup' && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-500 mb-2">Select a SureBank location:</p>
                  {pickupLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedPickupLocation(location)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedPickupLocation?.id === location.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{location.name}</p>
                      <p className="text-xs text-gray-600">{location.address}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Terms & Conditions */}
              {deliveryMethod && (deliveryMethod === 'pickup' ? selectedPickupLocation : deliveryAddress) && (
                <div className="mb-4">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => {
                        if (!termsAccepted) setShowTermsModal(true);
                        else setTermsAccepted(false);
                      }}
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                        termsAccepted ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                      }`}
                    >
                      {termsAccepted && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm text-gray-700">
                      I accept SureBank <button onClick={() => setShowTermsModal(true)} className="text-orange-500">Terms and Conditions</button>
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Summary & Email */}
              {termsAccepted && (
                <>
                  {/* Installment Payment Summary */}
                  {paymentType === 'installment' && (
                    <div className="bg-gray-100 rounded-lg p-3 mb-4">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-700 border">
                          Flexible payment
                        </span>
                        <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-700 border">
                          Pay any amount anytime
                        </span>
                        <span className="px-3 py-1 bg-white rounded-full text-xs text-orange-500 font-semibold border border-orange-200">
                          ₦{Number(firstPaymentAmount || 0).toLocaleString()} due now
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Outright Payment Summary */}
                  {paymentType === 'outright' && (
                    <div className="bg-gray-100 rounded-lg p-3 mb-4">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-700 border">
                          One-time payment
                        </span>
                        <span className="px-3 py-1 bg-white rounded-full text-xs text-green-600 font-semibold border border-green-200">
                          ₦{totalAmount?.toLocaleString()} due now
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">For payment receipt (if provided)</p>
                  </div>

                  {paymentError && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                      {paymentError}
                    </div>
                  )}

                  {/* Installment Payment Button */}
                  {paymentType === 'installment' && (
                    <button
                      onClick={handleInstallmentPayment}
                      disabled={processingPayment || paymentLoading}
                      className={`w-full py-3 rounded-full font-medium transition-colors ${
                        processingPayment || paymentLoading
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      {processingPayment || paymentLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        'Start your installments'
                      )}
                    </button>
                  )}

                  {/* Outright Payment Button */}
                  {paymentType === 'outright' && (
                    <button
                      onClick={handleOutrightPayment}
                      disabled={processingPayment || paymentLoading}
                      className={`w-full py-3 rounded-full font-medium transition-colors ${
                        processingPayment || paymentLoading
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {processingPayment || paymentLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        'Pay Now'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Terms & Conditions</h3>
              <button onClick={() => setShowTermsModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] text-sm text-gray-600 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">1. Payment Terms</h4>
                <p>
                  {paymentType === 'installment'
                    ? 'By selecting installment payment, you agree to make an initial payment now and continue paying any amount until the total is paid.'
                    : 'By selecting outright payment, you agree to pay the full amount immediately to complete your purchase.'
                  }
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">2. Payment Processing</h4>
                <p>
                  {paymentType === 'installment'
                    ? 'Your first payment is due immediately. Subsequent payments can be made from My Orders whenever you are ready.'
                    : 'Your payment will be processed immediately through our secure payment gateway.'
                  }
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">3. Delivery</h4>
                <p>
                  {paymentType === 'installment'
                    ? 'Products are delivered within 2-14 days after final payment. Pickup orders will be notified when ready.'
                    : 'Products are delivered within 2-7 business days after payment confirmation. Pickup orders will be notified when ready.'
                  }
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">4. Cancellation & Refunds</h4>
                <p>Orders may be cancelled before delivery. Refunds are processed minus a 5% processing fee.</p>
              </div>
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => { setTermsAccepted(true); setShowTermsModal(false); }}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium"
              >
                I Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal (Login/Registration) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-orange-50 rounded-xl max-w-md w-full overflow-hidden my-4">
            {/* Header */}
            <div className="p-4 flex justify-between items-center">
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-orange-500 hover:text-orange-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </div>

            <div className="px-4 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">Create a Free Account</h2>
              <p className="text-sm text-gray-600 mt-1">
                Welcome! Create your account in seconds and start paying small small for the things you love.
              </p>

              <div className="bg-white rounded-xl p-4 mt-4">
                {authMode === 'signup' ? (
                  <>
                    {/* Signup Form */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-600">Have an Account?</span>
                      <button
                        onClick={() => setAuthMode('login')}
                        className="text-sm text-orange-500 font-medium hover:text-orange-600"
                      >
                        Login
                      </button>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={signupForm.fullName}
                        onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <select
                        value={signupForm.state}
                        onChange={(e) => setSignupForm({ ...signupForm, state: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-500"
                      >
                        <option value="">Select State</option>
                        {getStates().map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowAuthModal(false)}
                      className="text-sm text-gray-500 mt-3 hover:text-orange-500"
                    >
                      Sign Up later &gt;&gt;&gt;
                    </button>

                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <input
                        type="text"
                        placeholder="How did you hear about us?"
                        value={signupForm.referralCode}
                        onChange={(e) => setSignupForm({ ...signupForm, referralCode: e.target.value })}
                        className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none"
                      />
                      <p className="text-xs text-orange-500 mt-1">
                        If you input your friend's referral code, we'll send a thank you note to them.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Login Form */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-600">Don't have an Account?</span>
                      <button
                        onClick={() => setAuthMode('signup')}
                        className="text-sm text-orange-500 font-medium hover:text-orange-600"
                      >
                        Sign Up
                      </button>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={loginForm.phone}
                        onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Error Message */}
              {authError && (
                <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {authError}
                </div>
              )}

              {/* Terms and Submit */}
              <div className="mt-4">
                <p className="text-xs text-center text-gray-500">
                  By clicking {authMode === 'signup' ? 'Sign Up' : 'Log In'}, you agree to our{' '}
                  <span className="text-orange-500">Terms and Conditions</span> and{' '}
                  <span className="text-orange-500">Privacy Policy</span>.
                  {authMode === 'signup' && ' You may receive email/sms notifications from us.'}
                </p>

                <button
                  onClick={authMode === 'signup' ? handleSignup : handleLogin}
                  disabled={authLoading}
                  className="w-full mt-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium disabled:opacity-50"
                >
                  {authLoading ? 'Please wait...' : (authMode === 'signup' ? 'Sign Up' : 'Log In')}
                </button>

                <p className="text-center text-sm mt-4">
                  {authMode === 'signup' ? 'Already have an Account?' : "Don't have an Account?"}{' '}
                  <button
                    onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
                    className="text-orange-500 font-medium hover:text-orange-600"
                  >
                    {authMode === 'signup' ? 'Log In' : 'Sign Up'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
