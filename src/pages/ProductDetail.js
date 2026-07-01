import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductByIdRequest, clearProduct } from '../redux/slices/productSlice';
import { addToCartRequest } from '../redux/slices/cartSlice';
import { loginRequest, registerRequest, clearError } from '../redux/slices/authSlice';
import { initializePaymentRequest, clearPaymentState } from '../redux/slices/orderSlice';
import { fetchWalletRequest } from '../redux/slices/walletSlice';
import { getStates, getLGAs, getTowns } from '../data/nigerianLocations';
import { handleImageFallback, PRODUCT_FALLBACK_IMAGE, resolveImageUrl } from '../utils/image';
import { API_URL, getAuthHeader } from '../utils/api';
import ProductCard from '../components/ProductCard';

const ProductDetail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { product, productLoading, productLoaded, categories } = useSelector((state) => state.products);
  const { loading: cartLoading } = useSelector((state) => state.cart);
  const { isAuthenticated, customer, loading: authLoading, error: authError } = useSelector((state) => state.auth);
  const { paymentLoading, paymentError, paymentVerified } = useSelector((state) => state.orders);
  const { account: walletAccount } = useSelector((state) => state.wallet);
  const prevAuthRef = useRef(isAuthenticated);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState('');
  const [showAllVariations, setShowAllVariations] = useState(false);
  const [showPlanSetup, setShowPlanSetup] = useState(false);
  const [firstPaymentAmount, setFirstPaymentAmount] = useState('');
  const [showShippingInfo, setShowShippingInfo] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [authMode, setAuthMode] = useState('signup'); // 'signup' or 'login'
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
  const [showPassword, setShowPassword] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedLGA, setSelectedLGA] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [showPaymentSourceModal, setShowPaymentSourceModal] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState(null);
  const [paymentSourceMode, setPaymentSourceMode] = useState('all');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Buy Now Once flow states
  const [showBuyNowSetup, setShowBuyNowSetup] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState(''); // 'home' or 'pickup'
  const [selectedPickupLocation, setSelectedPickupLocation] = useState(null);
  const [buyNowTermsAccepted, setBuyNowTermsAccepted] = useState(false);
  const [buyNowAddress, setBuyNowAddress] = useState('');
  const [buyNowState, setBuyNowState] = useState('');
  const [buyNowLGA, setBuyNowLGA] = useState('');
  const [buyNowTown, setBuyNowTown] = useState('');
  const [buyNowEmail, setBuyNowEmail] = useState('');
  const [showBuyNowAddressForm, setShowBuyNowAddressForm] = useState(false);

  // SureBank pickup locations
  const pickupLocations = [
    {
      id: 1,
      name: 'Mushin',
      address: 'No 58/47 Ojekunle street by Bello junction, Papa Ajao, Mushin, Lagos',
      area: 'Papa Ajao Mushin Lagos'
    },
    {
      id: 2,
      name: 'Oshodi',
      address: 'Shop No 44E resettlement Complex by Post office, Oshodi Rd, Oshodi',
      area: 'Oshodi Lagos'
    },
    {
      id: 3,
      name: 'Lagos Island',
      address: 'Trendy Mall besides Mandilas building, Broad Street, Lagos Island',
      area: 'Lagos Island'
    }
  ];

  const activeVariations = Array.isArray(product?.variations)
    ? product.variations.filter((variation) => variation && variation.isActive !== false)
    : [];
  const hasVariations = (product?.hasVariations === true || activeVariations.length > 0) && activeVariations.length > 0;
  const selectedVariation = hasVariations
    ? activeVariations.find((variation) => variation._id === selectedVariationId)
    : null;
  const selectedPrice = selectedVariation ? selectedVariation.price : product?.price;
  const visibleVariations = showAllVariations
    ? activeVariations
    : activeVariations.slice(0, 2);
  const hiddenVariationCount = Math.max(0, activeVariations.length - 2);

  // Close modal and set address when auth state changes (user logs in)
  useEffect(() => {
    if (!prevAuthRef.current && isAuthenticated && showAddressInput) {
      // User just logged in while modal was open
      if (customer?.address) {
        setDeliveryAddress(customer.address);
      }
      // If Buy Now setup is active, close the modal so user can continue
      if (showBuyNowSetup) {
        setShowAddressInput(false);
      }
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, customer, showAddressInput, showBuyNowSetup]);

  // Set delivery address from customer data when component mounts or customer changes
  useEffect(() => {
    if (isAuthenticated && customer?.address && !deliveryAddress) {
      setDeliveryAddress(customer.address);
    }
  }, [isAuthenticated, customer, deliveryAddress]);

  // Clear auth error when modal closes
  useEffect(() => {
    if (!showAddressInput) {
      dispatch(clearError());
    }
  }, [showAddressInput, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchWalletRequest());
    }
  }, [dispatch, isAuthenticated]);

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
        address: signupForm.state || '',
        password: signupForm.password
      }));
    }
  };

  useEffect(() => {
    dispatch(fetchProductByIdRequest({ productId: id }));
    return () => {
      dispatch(clearProduct());
    };
  }, [dispatch, id]);

  useEffect(() => {
    const categoryId = product?.categoryId?._id || product?.categoryId;

    if (!product?._id || !categoryId) {
      setRelatedProducts([]);
      return;
    }

    let cancelled = false;
    setRelatedLoading(true);

    axios.get(`${API_URL}/api/products`, { params: { categoryId } })
      .then((response) => {
        if (cancelled) return;

        const products = Array.isArray(response.data) ? response.data : [];
        setRelatedProducts(products.filter((item) => item._id !== product._id).slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) {
          setRelatedProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRelatedLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [product]);


  const handleAddToCart = () => {
    if (hasVariations && !selectedVariation) {
      setPaymentErrorMessage('Please select a product variation');
      return;
    }

    dispatch(addToCartRequest({
      productId: product._id,
      quantity: 1,
      variationId: selectedVariation?._id || '',
    }));
  };

  const handleBuyNow = () => {
    // Toggle Buy Now setup section (close Pay Small Small if open)
    setShowBuyNowSetup(!showBuyNowSetup);
    if (showPlanSetup) {
      setShowPlanSetup(false);
    }
  };

  // Calculate estimated delivery dates
  const getDeliveryDates = () => {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 2); // Minimum 2 days
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 14); // Maximum 14 days

    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    };

    return {
      minDate: formatDate(minDate),
      maxDate: formatDate(maxDate)
    };
  };

  const openPaymentSourceModal = useCallback(async (paymentData) => {
    setPaymentErrorMessage('');
    setProcessingPayment(true);

    try {
      const activeResponse = await axios.get(
        `${API_URL}/api/ecommerce/orders/active`,
        { headers: getAuthHeader() }
      );

      if (activeResponse.data?.hasActiveOrder) {
        if (paymentData.paymentType === 'installment') {
          setPaymentSourceMode('bankOnly');
          setProcessingPayment(false);
          dispatch(initializePaymentRequest({
            paymentData: { ...paymentData, paymentSource: 'bank' },
            onSuccess: (data) => {
              if (data?.authorization_url) {
                window.location.href = data.authorization_url;
                return;
              }

              setProcessingPayment(false);
              setPaymentErrorMessage('Failed to get payment URL. Please try again.');
            },
            onError: (error) => {
              setProcessingPayment(false);
              setPaymentErrorMessage(error || 'Payment initialization failed. Please try again.');
            }
          }));
          return;
        }

        setPendingPaymentData(paymentData);
        setPaymentSourceMode('existingOrder');
        setShowPaymentSourceModal(true);
        setProcessingPayment(false);
        return;
      }

      dispatch(initializePaymentRequest({
        paymentData: { ...paymentData, paymentSource: 'bank' },
        onSuccess: (data) => {
          if (data?.authorization_url) {
            window.location.href = data.authorization_url;
            return;
          }

          setProcessingPayment(false);
          setPaymentErrorMessage('Failed to get payment URL. Please try again.');
        },
        onError: (error) => {
          setProcessingPayment(false);
          setPaymentErrorMessage(error || 'Payment initialization failed. Please try again.');
        }
      }));
    } catch (error) {
      setPaymentErrorMessage(error.response?.data?.message || 'Unable to prepare checkout. Please try again.');
      setProcessingPayment(false);
    }
  }, [dispatch]);

  // Handle Buy Now with Paystack (outright payment)
  const handleBuyNowPayment = useCallback(() => {
    if (!isAuthenticated) {
      // Show login/signup modal instead of navigating away
      setShowAddressInput(true);
      return;
    }

    if (hasVariations && !selectedVariation) {
      setPaymentErrorMessage('Please select a product variation');
      return;
    }

    const email = buyNowEmail;
    // Validate email format only if provided
    if (email && (!email.includes('@') || !email.includes('.'))) {
      setPaymentErrorMessage('Please provide a valid email address (e.g., example@email.com)');
      return;
    }

    // Validate delivery method
    if (!deliveryMethod) {
      setPaymentErrorMessage('Please select a delivery method');
      return;
    }

    // Validate address for home delivery or pickup location for pickup
    if (deliveryMethod === 'home' && !buyNowAddress) {
      setPaymentErrorMessage('Please enter your delivery address');
      return;
    }

    if (deliveryMethod === 'pickup' && !selectedPickupLocation) {
      setPaymentErrorMessage('Please select a pickup location');
      return;
    }

    setPaymentErrorMessage('');

    const shippingAddress = deliveryMethod === 'home'
      ? `${buyNowAddress}${buyNowTown ? ', ' + buyNowTown : ''}${buyNowLGA ? ', ' + buyNowLGA : ''}${buyNowState ? ', ' + buyNowState : ''}`
      : `PICKUP: ${selectedPickupLocation.name} - ${selectedPickupLocation.address}`;

    const paymentData = {
      paymentType: 'outright',
      shippingAddress,
      shippingCity: deliveryMethod === 'home' ? buyNowLGA : selectedPickupLocation?.area || '',
      shippingState: deliveryMethod === 'home' ? buyNowState : 'Lagos',
      customerPhone: customer?.phone,
      customerEmail: email,
      accountNumber: customer?.phone,
      callbackUrl: `${window.location.origin}/payment/verify`,
      productId: product._id,
      quantity: 1,
      variationId: selectedVariation?._id || '',
      amountToCharge: Number(selectedPrice || 0),
      deliveryMethod,
      pickupLocationId: selectedPickupLocation?.id || null
    };

    openPaymentSourceModal(paymentData);
  }, [
    isAuthenticated, buyNowEmail, deliveryMethod, buyNowAddress, buyNowState,
    buyNowLGA, buyNowTown, selectedPickupLocation, customer, product, hasVariations, selectedVariation, selectedPrice, openPaymentSourceModal
  ]);

  // Load Paystack script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script when component unmounts
      const existingScript = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  // Clear payment error on unmount
  useEffect(() => {
    return () => {
      dispatch(clearPaymentState());
    };
  }, [dispatch]);

  // Handle successful payment verification
  useEffect(() => {
    if (paymentVerified) {
      setProcessingPayment(false);
    }
  }, [paymentVerified]);

  const walletBalance = Number(walletAccount?.availableBalance || 0);

  const submitPayment = useCallback((paymentData) => {
    setProcessingPayment(true);
    setPaymentErrorMessage('');

    dispatch(initializePaymentRequest({
      paymentData,
      onSuccess: (data) => {
        if (data?.paymentSource === 'wallet' && data?.order) {
          setProcessingPayment(false);
          setShowPaymentSourceModal(false);
          navigate(`/orders?orderNumber=${data.order.orderNumber}`);
          return;
        }

        if (data?.authorization_url) {
          window.location.href = data.authorization_url;
          return;
        }

        setProcessingPayment(false);
        setPaymentErrorMessage('Failed to get payment URL. Please try again.');
      },
      onError: (error) => {
        setProcessingPayment(false);
        setPaymentErrorMessage(error || 'Payment initialization failed. Please try again.');
      }
    }));
  }, [dispatch, navigate]);

  const handleBankPayment = useCallback(() => {
    if (!pendingPaymentData) {
      return;
    }

    submitPayment({ ...pendingPaymentData, paymentSource: 'bank' });
  }, [pendingPaymentData, submitPayment]);

  const handleWalletPayment = useCallback(() => {
    if (!pendingPaymentData) {
      return;
    }

    if (paymentSourceMode === 'existingOrder') {
      setProcessingPayment(true);
      setPaymentErrorMessage('');
      axios.post(
        `${API_URL}/api/ecommerce/orders/active/items`,
        pendingPaymentData,
        { headers: getAuthHeader() }
      ).then((response) => {
        const orderNumber = response.data?.order?.orderNumber;
        setShowPaymentSourceModal(false);
        navigate(orderNumber ? `/orders?orderNumber=${orderNumber}` : '/orders');
      }).catch((error) => {
        setPaymentErrorMessage(error.response?.data?.message || 'Unable to add product to My Orders.');
      }).finally(() => {
        setProcessingPayment(false);
      });
      return;
    }

    submitPayment({ ...pendingPaymentData, paymentSource: 'wallet' });
  }, [navigate, paymentSourceMode, pendingPaymentData, submitPayment]);

  const handlePaySmallSmall = useCallback(() => {
    if (!isAuthenticated) {
      setShowAddressInput(true);
      return;
    }

    // Validate email format only if provided
    const email = customerEmail;
    if (email && (!email.includes('@') || !email.includes('.'))) {
      setPaymentErrorMessage('Please provide a valid email address (e.g., example@email.com)');
      return;
    }

    const amountToPay = Number(firstPaymentAmount);
    if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
      setPaymentErrorMessage('Please enter the amount you want to pay now');
      return;
    }
    if (hasVariations && !selectedVariation) {
      setPaymentErrorMessage('Please select a product variation');
      return;
    }
    if (amountToPay > Number(selectedPrice || 0)) {
      setPaymentErrorMessage(`First payment cannot exceed ₦${Number(selectedPrice || 0).toLocaleString()}`);
      return;
    }

    setPaymentErrorMessage('');

    // Initialize payment request - include productId so backend adds to cart
    const paymentData = {
      paymentType: 'installment',
      firstPaymentAmount: amountToPay,
      amountToPay,
      initialPaymentAmount: amountToPay,
      amountToCharge: amountToPay,
      shippingAddress: deliveryAddress,
      shippingCity: selectedLGA || '',
      shippingState: selectedState || '',
      customerPhone: customer?.phone || signupForm.phone,
      customerEmail: email,
      accountNumber: customer?.phone,
      callbackUrl: `${window.location.origin}/payment/verify`,
      productId: product._id,
      variationId: selectedVariation?._id || '',
      quantity: 1
    };

    openPaymentSourceModal(paymentData);
  }, [
    isAuthenticated, customerEmail, customer, product, firstPaymentAmount,
    deliveryAddress, selectedLGA, selectedState, signupForm.phone, hasVariations, selectedVariation, selectedPrice, openPaymentSourceModal
  ]);

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c._id === categoryId);
    return category ? category.name : 'Products';
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share failed');
      }
    }
  };

  const handlePrevImage = () => {
    setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    setSelectedImage(0);
    setSelectedVariationId('');
    setShowAllVariations(false);
  }, [id]);

  useEffect(() => {
    setSelectedImage(0);
  }, [selectedVariationId]);

  useEffect(() => {
    if (!product?.images || product.images.length <= 1) {
      return undefined;
    }

    const interval = setInterval(() => {
      setSelectedImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
    }, 3000);

    return () => clearInterval(interval);
  }, [product]);

  if (productLoading || !productLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (productLoaded && !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <h2 className="text-xl font-semibold mb-4">Product not found</h2>
        <button
          onClick={() => navigate(-1)}
          className="text-orange-500 hover:text-orange-600"
        >
          Go back
        </button>
      </div>
    );
  }

  const productImages = product.images && product.images.length > 0
    ? product.images.map((img) => resolveImageUrl(img))
    : [PRODUCT_FALLBACK_IMAGE];
  const images = selectedVariation?.image
    ? [resolveImageUrl(selectedVariation.image), ...productImages]
    : productImages;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back arrow and title */}
      <div className="bg-white px-3 py-2 md:px-4 md:py-4 flex items-center md:sticky md:top-0 z-10 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-orange-500 hover:text-orange-600 mr-3 md:mr-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-sm md:text-lg font-semibold truncate pr-8 md:pr-10">
          {product.name}
        </h1>
      </div>

      {/* Product Image Carousel */}
      <div className="bg-white py-2 md:py-4">
        <div className="mx-auto max-w-[240px] sm:max-w-sm md:max-w-md">
          <div className="relative bg-gray-50 rounded-xl overflow-hidden mx-3 md:mx-4">
            <div className="aspect-[4/3] md:aspect-square relative flex items-center justify-center p-2 md:p-4">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="max-w-full max-h-full object-contain"
                onError={handleImageFallback}
              />
              {/* Image navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              {/* Image counter */}
              <div className="absolute bottom-2 right-2 bg-gray-800/70 text-white text-xs px-2 py-1 rounded-full">
                {selectedImage + 1}/{images.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Overview Card */}
      <div className="mx-auto mt-2 md:mt-4 max-w-xs sm:max-w-sm md:max-w-md bg-white rounded-xl p-3 md:p-4 shadow-sm">
        <h2 className="text-sm md:text-base font-semibold text-gray-900">Product overview</h2>
        <p className="hidden sm:block text-sm text-gray-500 mt-1">Review item details and choose how you want to pay.</p>

        <div className="flex items-center justify-between mt-2 md:mt-4">
          <div className="flex items-center">
            <span className="text-sm md:text-base text-orange-500 font-medium">{getCategoryName(product.categoryId)}</span>
            <span className="text-gray-400 ml-1">{getCategoryName(product.categoryId) !== 'Products' && ' Products'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddToCart}
              disabled={cartLoading || (hasVariations && !selectedVariation)}
              className="p-2 rounded-full border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:border-orange-400 disabled:opacity-50 transition-colors"
              title="Add to cart"
            >
              {cartLoading ? (
                <svg className="animate-spin h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
            </button>
            <button className="p-2 rounded-full border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:border-orange-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button onClick={handleShare} className="p-2 rounded-full border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:border-orange-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        <h3 className="text-sm md:text-base font-medium text-gray-900 mt-2 md:mt-4">{product.name}</h3>

        <p className="text-lg md:text-xl font-bold text-orange-500 mt-1 md:mt-2">
          ₦{selectedPrice?.toLocaleString()}
        </p>

        {hasVariations && (
          <div className="mt-3 md:mt-4">
            <p className="text-xs md:text-sm font-medium text-gray-700 mb-2">Choose variation</p>
            <div className="grid grid-cols-1 gap-2">
              {visibleVariations.map((variation) => {
                const optionEntries = Object.entries(variation.optionValues || {});
                const isSelected = selectedVariationId === variation._id;

                return (
                  <button
                    key={variation._id}
                    type="button"
                    onClick={() => {
                      setSelectedVariationId(variation._id);
                      setPaymentErrorMessage('');
                    }}
                    className={`text-left rounded-lg border p-2 md:p-3 transition-colors ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {variation.image && (
                        <img
                          src={resolveImageUrl(variation.image)}
                          alt={variation.name || product.name}
                          className="h-12 w-12 md:h-14 md:w-14 flex-shrink-0 rounded-md border border-gray-200 object-cover"
                          onError={handleImageFallback}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-gray-900">
                            {variation.name || optionEntries.map(([, value]) => value).join(' / ')}
                          </span>
                          <span className="text-sm font-bold text-orange-500">
                            ₦{Number(variation.price || 0).toLocaleString()}
                          </span>
                        </div>
                        {optionEntries.length > 0 && (
                          <p className="mt-1 text-xs text-gray-500">
                            {optionEntries.map(([name, value]) => `${name}: ${value}`).join(' • ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {hiddenVariationCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllVariations((prev) => !prev)}
                className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-600"
              >
                {showAllVariations ? 'Show less' : `Show ${hiddenVariationCount} more`}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 md:gap-3 mt-3">
          <button
            onClick={handleBuyNow}
            className={`text-xs md:text-sm font-bold px-4 md:px-5 py-2 rounded-full text-white shadow-sm transition-colors ${
              showBuyNowSetup
                ? 'bg-orange-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            Buy Now, Once!
          </button>
          <button
            onClick={() => {
              setShowPlanSetup(!showPlanSetup);
              if (showBuyNowSetup) setShowBuyNowSetup(false);
            }}
            className={`text-xs md:text-sm font-bold px-4 md:px-5 py-2 rounded-full text-white shadow-sm transition-colors ${
              showPlanSetup
                ? 'bg-orange-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            Pay Small Small
          </button>
        </div>

      </div>

      {/* Buy Now Once Setup Card */}
      {showBuyNowSetup && (
        <div className="mx-auto mt-4 max-w-xs sm:max-w-sm md:max-w-md bg-white rounded-xl p-4 shadow-sm">
          {/* Payment Summary Header */}
          <div className="bg-orange-50 rounded-lg p-4 mb-4">
            <p className="text-center text-gray-700">
              You will pay <span className="text-orange-500 font-bold">₦{selectedPrice?.toLocaleString()}</span> once.
            </p>
            <p className="text-center text-sm text-gray-500 mt-2">
              Your item will be shipped between{' '}
              <span className="text-orange-500">{getDeliveryDates().minDate}</span> and{' '}
              <span className="text-orange-500">{getDeliveryDates().maxDate}</span>.
            </p>
          </div>

          {/* Delivery Address Section */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">Delivery Address</span>
            </div>

            {/* Delivery Method Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setDeliveryMethod('home');
                  setSelectedPickupLocation(null);
                  if (!isAuthenticated) {
                    setShowAddressInput(true);
                  }
                }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium border-2 transition-colors ${
                  deliveryMethod === 'home'
                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Home Delivery
              </button>
              <button
                onClick={() => {
                  setDeliveryMethod('pickup');
                  setBuyNowAddress('');
                  setBuyNowState('');
                  setBuyNowLGA('');
                  setBuyNowTown('');
                  if (!isAuthenticated) {
                    setShowAddressInput(true);
                  }
                }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium border-2 transition-colors ${
                  deliveryMethod === 'pickup'
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Pick Up
              </button>
            </div>

            {/* Login prompt for unauthenticated users */}
            {!isAuthenticated && (
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-700 mb-3">Please login or create an account to continue</p>
                <button
                  onClick={() => setShowAddressInput(true)}
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-full"
                >
                  Login / Sign Up
                </button>
              </div>
            )}

            {/* Home Delivery Address Form */}
            {deliveryMethod === 'home' && (
              <div className="space-y-3">
                {!showBuyNowAddressForm && (isAuthenticated && customer?.address) ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Not verified
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{customer.address}</p>
                    {customer.phone && (
                      <p className="text-sm text-gray-500 mt-1">{customer.phone}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          setBuyNowAddress(customer.address || '');
                        }}
                        className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                      >
                        Use this address
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => setShowBuyNowAddressForm(true)}
                        className="text-xs text-gray-500 hover:text-orange-500"
                      >
                        Enter new address
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={buyNowAddress}
                      onChange={(e) => setBuyNowAddress(e.target.value)}
                      placeholder="House number, Street name..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <select
                      value={buyNowState}
                      onChange={(e) => {
                        setBuyNowState(e.target.value);
                        setBuyNowLGA('');
                        setBuyNowTown('');
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select State</option>
                      {getStates().map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    {buyNowState && (
                      <select
                        value={buyNowLGA}
                        onChange={(e) => {
                          setBuyNowLGA(e.target.value);
                          setBuyNowTown('');
                        }}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select LGA</option>
                        {getLGAs(buyNowState).map((lga) => (
                          <option key={lga} value={lga}>{lga}</option>
                        ))}
                      </select>
                    )}
                    {buyNowLGA && (
                      <select
                        value={buyNowTown}
                        onChange={(e) => setBuyNowTown(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select Town</option>
                        {getTowns(buyNowState, buyNowLGA).map((town) => (
                          <option key={town} value={town}>{town}</option>
                        ))}
                      </select>
                    )}
                    {isAuthenticated && customer?.address && (
                      <button
                        onClick={() => setShowBuyNowAddressForm(false)}
                        className="text-xs text-gray-500 hover:text-orange-500"
                      >
                        ← Use saved address
                      </button>
                    )}
                  </div>
                )}

                {/* Show selected address */}
                {buyNowAddress && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-green-700">Delivery Address</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {buyNowAddress}
                      {buyNowTown && `, ${buyNowTown}`}
                      {buyNowLGA && `, ${buyNowLGA}`}
                      {buyNowState && `, ${buyNowState}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pickup Location Selection */}
            {deliveryMethod === 'pickup' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-2">Select a SureBank location to pick up your order:</p>
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
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{location.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{location.address}</p>
                      </div>
                      {selectedPickupLocation?.id === location.id && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Terms & Conditions - Shows when delivery method is selected */}
          {deliveryMethod && (deliveryMethod === 'pickup' ? selectedPickupLocation : buyNowAddress) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!buyNowTermsAccepted) {
                      setShowTermsModal(true);
                    } else {
                      setBuyNowTermsAccepted(false);
                    }
                  }}
                  className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                    buyNowTermsAccepted
                      ? 'bg-orange-500 border-orange-500'
                      : 'border-gray-300 hover:border-orange-400'
                  }`}
                >
                  {buyNowTermsAccepted && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-gray-700">
                  I accept SureBank <span className="text-orange-500">Terms and Conditions.</span>
                </span>
              </div>
              <button
                onClick={() => setShowTermsModal(true)}
                className="text-xs text-orange-500 mt-1 ml-8 hover:text-orange-600 underline"
              >
                View terms & condition
              </button>
            </div>
          )}

          {/* Payment Summary - Shows when terms are accepted */}
          {buyNowTermsAccepted && deliveryMethod && (
            <div className="mt-4">
              {/* Payment Plan Summary Banner */}
              <div className="mt-4 bg-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                    Once plan
                  </span>
                  <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                    1 payment
                  </span>
                  <span className="px-4 py-2 bg-white rounded-full text-sm text-orange-500 font-semibold border border-orange-200">
                    ₦{selectedPrice?.toLocaleString()} due now
                  </span>
                </div>
              </div>

              {/* Email Input for Payment Receipt */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={buyNowEmail}
                  onChange={(e) => setBuyNowEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">For payment receipt (if provided)</p>
              </div>

              {/* Payment Error Message */}
              {paymentErrorMessage && (
                <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {paymentErrorMessage}
                </div>
              )}

              {/* Pay Now Button */}
              <button
                onClick={handleBuyNowPayment}
                disabled={processingPayment || paymentLoading}
                className={`w-full mt-4 py-3 rounded-full text-sm font-medium transition-colors ${
                  processingPayment || paymentLoading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {processingPayment || paymentLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Payment...
                  </span>
                ) : (
                  'Pay Now'
                )}
              </button>
            </div>
          )}

          {/* Continue Button - Shows when terms not accepted */}
          {deliveryMethod && (deliveryMethod === 'pickup' ? selectedPickupLocation : buyNowAddress) && !buyNowTermsAccepted && (
            <button
              onClick={() => setShowTermsModal(true)}
              className="w-full mt-4 py-3 rounded-full text-sm font-medium transition-colors bg-gray-200 text-gray-500"
            >
              Accept terms to continue
            </button>
          )}

          {/* Prompt to select delivery method - only show for authenticated users */}
          {!deliveryMethod && isAuthenticated && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Please select a delivery method above to continue.
            </p>
          )}
        </div>
      )}

      {/* Plan Setup Card */}
      {showPlanSetup && (
        <div className="mx-auto mt-4 max-w-xs sm:max-w-sm md:max-w-md bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Pay Small Small</h2>
          <p className="text-sm text-gray-500 mt-1">Enter the amount you want to pay now. You can add more money anytime from My Orders. There is no fixed duration or payment boundary, and your product will be available for pickup or delivery when full payment is complete.</p>

          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Product price</span>
              <span className="font-semibold">₦{selectedPrice?.toLocaleString()}</span>
            </div>
            <label className="mt-3 block text-sm font-medium text-gray-700">First payment amount</label>
            <input
              type="number"
              min="1"
              max={selectedPrice}
              value={firstPaymentAmount}
              onChange={(e) => setFirstPaymentAmount(e.target.value)}
              placeholder="Enter amount to pay now"
              className="mt-1 w-full rounded-lg border border-orange-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              Remaining balance after this payment: ₦{Math.max(0, Number(selectedPrice || 0) - Number(firstPaymentAmount || 0)).toLocaleString()}
            </p>

            {Number(firstPaymentAmount) > 0 && Number(firstPaymentAmount) <= Number(selectedPrice || 0) && (
              <div className="mt-4 pt-4 border-t border-orange-200">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-700">Delivery Address</span>
                </div>

                {!deliveryAddress ? (
                  <>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Not verified
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAddressInput(true)}
                      className="text-xs text-gray-500 mt-2 hover:text-orange-500"
                    >
                      Click to input a new delivery address.
                    </button>
                  </>
                ) : (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{deliveryAddress}</p>
                    <button
                      onClick={() => setShowAddressInput(true)}
                      className="text-xs text-orange-500 mt-1 hover:text-orange-600"
                    >
                      Change address
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Terms & Conditions Section - Shows when delivery address is set */}
          {Number(firstPaymentAmount) > 0 && deliveryAddress && (
            <div className="mt-4 pt-4 border-t border-orange-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!termsAccepted) {
                      setShowTermsModal(true);
                    } else {
                      setTermsAccepted(false);
                    }
                  }}
                  className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                    termsAccepted
                      ? 'bg-orange-500 border-orange-500'
                      : 'border-gray-300 hover:border-orange-400'
                  }`}
                >
                  {termsAccepted && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-gray-700">
                  I accept SureBank <span className="text-orange-500">Terms and Conditions.</span>
                </span>
              </div>
              <button
                onClick={() => setShowTermsModal(true)}
                className="text-xs text-orange-500 mt-1 ml-8 hover:text-orange-600 underline"
              >
                View terms & condition
              </button>
            </div>
          )}

          {/* Payment Summary Section - Shows when terms are accepted */}
          {Number(firstPaymentAmount) > 0 && deliveryAddress && termsAccepted && (
            <div className="mt-4">
              <div className="mt-4 bg-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                    Flexible payment
                  </span>
                  <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                    Pay any amount anytime
                  </span>
                  <span className="px-4 py-2 bg-white rounded-full text-sm text-orange-500 font-semibold border border-orange-200">
                    ₦{Number(firstPaymentAmount || 0).toLocaleString()} due now
                  </span>
                </div>
              </div>

              {/* Email Input for Payment Receipt */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">For payment receipt (if provided)</p>
              </div>

              {/* Payment Error Message */}
              {(paymentErrorMessage || paymentError) && (
                <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {paymentErrorMessage || paymentError}
                </div>
              )}

              {/* Start Installments Button */}
              <button
                onClick={handlePaySmallSmall}
                disabled={processingPayment || paymentLoading}
                className={`w-full mt-4 py-3 rounded-full text-sm font-medium transition-colors ${
                  processingPayment || paymentLoading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {processingPayment || paymentLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Payment...
                  </span>
                ) : (
                  'Start pay small small'
                )}
              </button>
            </div>
          )}

          {/* Continue Button - Shows when terms not accepted or no address */}
          {Number(firstPaymentAmount) > 0 && (!deliveryAddress || !termsAccepted) && (
            <button
              onClick={() => {
                if (!deliveryAddress) {
                  setShowAddressInput(true);
                } else if (!termsAccepted) {
                  setShowTermsModal(true);
                }
              }}
              className="w-full mt-4 py-3 rounded-full text-sm font-medium transition-colors bg-gray-200 text-gray-500"
            >
              {!deliveryAddress ? 'Enter delivery address to continue' : 'Accept terms to continue'}
            </button>
          )}
        </div>
      )}

      {/* More Description Card */}
      {product.description && (
        <div className="mx-auto mt-2 md:mt-4 mb-6 max-w-xs sm:max-w-sm md:max-w-md bg-white rounded-xl p-3 md:p-4 shadow-sm">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">More description</h2>

          <div className="mt-2 md:mt-3 text-sm text-gray-600 space-y-1">
            {product.description.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {(relatedLoading || relatedProducts.length > 0) && (
        <section className="mx-auto mt-2 mb-6 max-w-5xl px-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Other products in this category</h2>
              <p className="text-xs text-gray-500">You may also like these products.</p>
            </div>
          </div>

          {relatedLoading ? (
            <div className="flex justify-center rounded-xl bg-white py-8 shadow-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct._id} product={relatedProduct} compact />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Shipping Info Modal */}
      {showShippingInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Shipping Information</h3>
              <button
                onClick={() => setShowShippingInfo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delivery</p>
                    <p className="text-xs text-gray-500">Products are available for delivery after payment is complete</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delivery Time</p>
                    <p className="text-xs text-gray-500">2-5 business days after full payment</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delivery Coverage</p>
                    <p className="text-xs text-gray-500">We deliver nationwide</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setShowShippingInfo(false)}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentSourceModal && pendingPaymentData && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Choose how to pay
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Pay from bank now through Paystack, or continue to My Orders to pay from your wallet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (processingPayment || paymentLoading) {
                    return;
                  }
                  setShowPaymentSourceModal(false);
                  setPendingPaymentData(null);
                  setPaymentErrorMessage('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                x
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-orange-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Amount due now</span>
                <span className="font-bold text-orange-600">
                  ₦{Number(pendingPaymentData.amountToCharge || 0).toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">Wallet balance</span>
                <span className={`font-semibold ${walletBalance >= Number(pendingPaymentData.amountToCharge || 0) ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₦{walletBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {walletBalance < Number(pendingPaymentData.amountToCharge || 0) && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your wallet balance is not enough yet. Continue to My Orders to pay from wallet or top up automatically.
              </div>
            )}

            {(paymentErrorMessage || paymentError) && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {paymentErrorMessage || paymentError}
              </div>
            )}

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={handleWalletPayment}
                disabled={processingPayment || paymentLoading}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400"
              >
                {processingPayment || paymentLoading ? 'Processing...' : 'Pay from Wallet in My Orders'}
              </button>
              <button
                type="button"
                onClick={handleBankPayment}
                disabled={processingPayment || paymentLoading}
                className="rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400"
              >
                {processingPayment || paymentLoading ? 'Processing...' : 'Pay from Bank'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Terms & Conditions</h3>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">1. Payment Terms</h4>
                <p>
                  {showBuyNowSetup
                    ? 'By selecting the "Buy Now, Once!" option, you agree to make a one-time full payment for your order. Payment is processed securely through Paystack.'
                      : 'By selecting the "Pay Small Small" option, you agree to make an initial payment now and continue paying any amount whenever you like until the total product price is fully paid. There is no fixed duration or payment boundary.'}
                </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">2. Payment Processing</h4>
                  <p>
                    {showBuyNowSetup
                      ? 'Your payment will be processed immediately upon confirmation. You will receive a receipt via email once payment is successful.'
                      : 'Your first payment is processed immediately. Subsequent payments can be made from My Orders whenever you are ready.'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">3. Product Delivery</h4>
                  <p>
                  {showBuyNowSetup
                      ? 'Products will be delivered within 2-14 business days after payment confirmation. For pickup orders, you will be notified when your item is ready for collection.'
                      : 'Products will be available for pickup or delivery after your final payment is received.'}
                </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">4. Delivery & Pickup</h4>
                  <p>
                  {showBuyNowSetup
                      ? 'Home delivery is available nationwide. For pickup, visit your selected SureBank location with a valid ID and order confirmation.'
                      : 'There are no missed-payment penalties or fixed payment dates. Continue paying as you like until the product is fully paid.'}
                </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">5. Product Payment Policy</h4>
                  <p>All transactions on this package are only for products or properties and are not to be withdrawn as cash. You can change the product you're paying for in our pay small small from the varieties of our products to any other product as your need arises.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">6. Product Returns</h4>
                  <p>Products can be returned within 24 hours of delivery only if they are defective or damaged and were delivered by SureBank dispatch. Returns are not honored for pickup orders or when the customer uses their own dispatch. Items must be in their original packaging.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">7. Price Changes</h4>
                  <p>Product prices may change based on changes in market price. If a product price changes before your order is fully paid, the unpaid order balance may be adjusted to reflect the current product price.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">8. Out of Market Products</h4>
                  <p>If a product becomes out of market before it is supplied, delivered, or picked up, you are required to replace it with another available product from SureBank stores. Payment may continue, but the out-of-market product cannot be supplied.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">9. Account Responsibility</h4>
                  <p>You are responsible for providing accurate delivery information and ensuring someone is available to receive the delivery at the specified address.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">10. Changes to Terms</h4>
                  <p>SureBank reserves the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => {
                  // Set terms accepted for the active flow
                  if (showBuyNowSetup) {
                    setBuyNowTermsAccepted(true);
                  } else {
                    setTermsAccepted(true);
                  }
                  setShowTermsModal(false);
                }}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium"
              >
                I Accept Terms & Conditions
              </button>
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full mt-2 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Input Modal */}
      {showAddressInput && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 sm:items-center sm:pt-4">
          <div className={`${isAuthenticated ? 'bg-white' : 'bg-orange-50'} mt-4 w-full max-w-md overflow-hidden rounded-xl sm:mt-0`}>
            {/* Header */}
            <div className="p-4 flex justify-between items-center">
              {!isAuthenticated ? (
                <button
                  onClick={() => { setShowAddressInput(false); setShowNewAddressForm(false); }}
                  className="text-orange-500 hover:text-orange-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              ) : (
                <div></div>
              )}
              {isAuthenticated && (
                <button
                  onClick={() => { setShowAddressInput(false); setShowNewAddressForm(false); }}
                  className="text-gray-400 hover:text-gray-600 ml-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {!isAuthenticated ? (
              /* Signup/Login Form for non-authenticated users */
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
                        <p className="text-xs text-gray-500">At least 6 characters</p>
                      </div>

                      <button
                        onClick={() => setShowAddressInput(false)}
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
                          If you input your friend's referral code, we'll send a thank you note to them and also credit you with some money for remembering them when you make your first purchase (T&Cs apply).
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
	                        <div className="text-right">
	                          <Link
	                            to="/forgot-password"
	                            className="text-xs font-medium text-orange-500 hover:text-orange-600"
	                          >
	                            Forgot Password?
	                          </Link>
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
            ) : (
              /* Address Selection for authenticated users */
              <div className="px-4 pb-4">
                {!showNewAddressForm ? (
                  <>
                    <h2 className="text-xl font-bold text-gray-900">Please select or enter a new delivery address.</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose a saved address or add a new one.
                    </p>

                    {/* Saved Address Card */}
                    <div className="bg-white rounded-xl p-4 mt-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Delivery Address</span>
                      </div>
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Not verified
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {customer?.address || deliveryAddress || 'No address saved'}
                        {customer?.phone && `. ${customer.phone}`}
                      </p>
                      {customer?.firstName && (
                        <p className="text-sm text-gray-500 mt-1">
                          {customer.firstName} {customer.lastName}
                        </p>
                      )}

                      {/* Select this address button */}
                      {(customer?.address || deliveryAddress) && (
                        <button
                          onClick={() => {
                            if (customer?.address) {
                              setDeliveryAddress(customer.address);
                            }
                            setShowAddressInput(false);
                          }}
                          className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium"
                        >
                          Use this address
                        </button>
                      )}
                    </div>

                    {/* Add New Address Button */}
                    <button
                      onClick={() => setShowNewAddressForm(true)}
                      className="w-full mt-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium"
                    >
                      Add new address
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-900">Enter your delivery address</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Enter your delivery address for this order.
                    </p>

                    <div className="bg-white rounded-xl p-4 mt-4 space-y-3">
                      {/* Street Address Input */}
                      <div>
                        <input
                          type="text"
                          value={newAddress}
                          onChange={(e) => {
                            setNewAddress(e.target.value);
                            if (e.target.value.length > 0 && !showStateDropdown) {
                              setShowStateDropdown(true);
                            }
                          }}
                          placeholder="House number, Street name..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>

                      {/* State Dropdown - Shows after user starts typing */}
                      {showStateDropdown && (
                        <div>
                          <select
                            value={selectedState}
                            onChange={(e) => {
                              setSelectedState(e.target.value);
                              setSelectedLGA('');
                              setSelectedTown('');
                            }}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="">Select State</option>
                            {getStates().map((state) => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* LGA Dropdown - Shows after State is selected */}
                      {selectedState && (
                        <div>
                          <select
                            value={selectedLGA}
                            onChange={(e) => {
                              setSelectedLGA(e.target.value);
                              setSelectedTown('');
                            }}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="">Select LGA</option>
                            {getLGAs(selectedState).map((lga) => (
                              <option key={lga} value={lga}>{lga}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Town Dropdown - Shows after LGA is selected */}
                      {selectedLGA && (
                        <div>
                          <select
                            value={selectedTown}
                            onChange={(e) => setSelectedTown(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="">Select Town</option>
                            {getTowns(selectedState, selectedLGA).map((town) => (
                              <option key={town} value={town}>{town}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        Please provide a complete address to ensure smooth delivery
                      </p>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => {
                          setShowNewAddressForm(false);
                          setNewAddress('');
                          setSelectedState('');
                          setSelectedLGA('');
                          setSelectedTown('');
                          setShowStateDropdown(false);
                        }}
                        className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (newAddress.trim() && selectedState) {
                            const fullAddress = `${newAddress}${selectedTown ? ', ' + selectedTown : ''}${selectedLGA ? ', ' + selectedLGA : ''}, ${selectedState}`;
                            setDeliveryAddress(fullAddress);
                            setShowNewAddressForm(false);
                            setShowAddressInput(false);
                            setNewAddress('');
                            setSelectedState('');
                            setSelectedLGA('');
                            setSelectedTown('');
                            setShowStateDropdown(false);
                          }
                        }}
                        disabled={!newAddress.trim() || !selectedState}
                        className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save address
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetail;
