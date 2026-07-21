import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { fetchOrdersRequest } from '../redux/slices/orderSlice';
import { fetchProductsRequest } from '../redux/slices/productSlice';
import {
  fetchWalletRequest,
  initializeWalletFundingRequest,
} from '../redux/slices/walletSlice';
import { API_URL, getAuthHeader } from '../utils/api';
import { handleImageFallback, PRODUCT_FALLBACK_IMAGE, resolveImageUrl } from '../utils/image';
import { calculateCustomerSellingPrice, getProductDisplayPrice } from '../utils/pricing';

const formatCurrency = (amount) => `N${Number(amount || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusPill = (status) => {
  const statusMap = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-100 text-amber-700 border-amber-200',
    unpaid: 'bg-rose-100 text-rose-700 border-rose-200',
    processing_order: 'bg-purple-100 text-purple-700 border-purple-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-teal-100 text-teal-700 border-teal-200',
    pending: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return statusMap[status] || 'bg-slate-100 text-slate-700 border-slate-200';
};

const getSelectedOptionsText = (item) => {
  if (!item?.selectedOptions) return '';
  return Object.entries(item.selectedOptions)
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}: ${value}`)
    .join(' / ');
};

const getVariationLabel = (variation) => {
  if (!variation) return '';
  const optionValues = variation.optionValues && typeof variation.optionValues === 'object'
    ? Object.values(variation.optionValues).filter(Boolean)
    : [];
  return optionValues.length > 0 ? optionValues.join(' / ') : variation.name;
};

const MobileVariationDropdown = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const selectedVariation = (options || []).find((variation) => variation._id === value);

  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm"
      >
        <span className={selectedVariation ? 'font-bold text-slate-900' : 'text-slate-500'}>
          {selectedVariation
            ? `${getVariationLabel(selectedVariation)} - ${formatCurrency(selectedVariation.price)}`
            : 'Select variation'}
        </span>
        <span className={`ml-3 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[70] max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          {(options || []).map((variation) => {
            const selected = variation._id === value;
            return (
              <button
                type="button"
                key={variation._id}
                onClick={() => {
                  onChange(variation._id);
                  setOpen(false);
                }}
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left text-xs font-bold last:border-b-0 ${
                  selected
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-white text-slate-700'
                }`}
              >
                {getVariationLabel(variation)} - {formatCurrency(calculateCustomerSellingPrice(variation.price))}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const inlineComputedStyles = (source, target) => {
  const computedStyle = window.getComputedStyle(source);
  target.setAttribute('style', computedStyle.cssText);

  Array.from(source.children).forEach((sourceChild, index) => {
    const targetChild = target.children[index];
    if (targetChild) {
      inlineComputedStyles(sourceChild, targetChild);
    }
  });
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const embedImagesAsDataUrls = async (element) => {
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute('src');
    if (!source || source.startsWith('data:')) return;

    try {
      const response = await fetch(source, { mode: 'cors' });
      if (!response.ok) throw new Error('Image fetch failed');
      const blob = await response.blob();
      image.setAttribute('src', await blobToDataUrl(blob));
      image.removeAttribute('crossorigin');
    } catch (error) {
      image.removeAttribute('src');
      image.setAttribute('alt', image.getAttribute('alt') || 'Signature unavailable for image export');
    }
  }));
};

const captureReceiptAsBlob = async (element) => {
  if (!element) {
    throw new Error('Receipt is not ready to share.');
  }

  const clone = element.cloneNode(true);
  inlineComputedStyles(element, clone);
  clone.querySelectorAll('[data-receipt-actions="true"]').forEach((node) => node.remove());
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  await embedImagesAsDataUrls(clone);

  const width = Math.ceil(element.scrollWidth);
  const height = Math.ceil(element.scrollHeight);
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `;
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));

  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(2, 2);
    context.drawImage(image, 0, 0);

    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

const shareOrDownloadReceipt = async ({ element, fileName }) => {
  const blob = await captureReceiptAsBlob(element);
  if (!blob) {
    throw new Error('Could not create receipt image.');
  }

  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'SureBank Receipt',
      text: 'SureBank product receipt',
    });
    return;
  }

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
};

const getCustomerReceiptStaffName = (value) => {
  const name = String(value || '').trim();
  if (!name || name === 'N/A' || name === 'ECOMMERCE_SYSTEM') {
    return 'Sure-Bank Delivery Team';
  }
  return name;
};

const ReceiptModal = ({ receipt, onClose, fallbackCustomerName = 'Customer' }) => {
  const receiptRef = useRef(null);
  const [shareLoading, setShareLoading] = useState(false);
  if (!receipt) return null;

  const product = receipt.product || {};
  const customer = receipt.customer || {};
  const payment = receipt.payment || {};
  const staff = receipt.staff || {};
  const deliveredByName = getCustomerReceiptStaffName(staff.deliveredBy);
  const receiptFileName = `${String(receipt.receiptNumber || 'surebank-receipt').replace(/[^a-zA-Z0-9-_]/g, '-')}.png`;

  const handleShare = async () => {
    setShareLoading(true);
    try {
      await shareOrDownloadReceipt({
        element: receiptRef.current,
        fileName: receiptFileName,
      });
    } catch (error) {
      alert(error.message || 'Failed to share receipt image.');
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 sm:p-5">
      <div ref={receiptRef} className="receipt-print-area max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-orange-500 via-purple-600 to-sky-600 px-5 py-5 text-white sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-100 sm:text-xs">Sure-Bank Stores</p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">Product Receipt</h2>
              <p className="mt-1 text-xs font-bold text-white/85 sm:text-sm">{receipt.receiptNumber}</p>
            </div>
            <button type="button" onClick={onClose} className="print:hidden rounded-full bg-white/15 px-3 py-1.5 text-xs font-black hover:bg-white/25">
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-7">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-2xl bg-orange-50 p-3">
              <p className="text-[10px] font-black uppercase text-orange-700">Date</p>
              <p className="mt-1 text-xs font-bold text-slate-950 sm:text-sm">{formatDate(receipt.receiptDate)}</p>
            </div>
            <div className="rounded-2xl bg-purple-50 p-3">
              <p className="text-[10px] font-black uppercase text-purple-700">Paid</p>
              <p className="mt-1 text-xs font-bold text-slate-950 sm:text-sm">{formatDate(payment.paidAt)}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3">
              <p className="text-[10px] font-black uppercase text-sky-700">Status</p>
              <p className="mt-1 text-xs font-bold capitalize text-slate-950 sm:text-sm">{product.fulfillmentStatus || 'delivered'}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-[10px] font-black uppercase text-emerald-700">Paid</p>
              <p className="mt-1 text-sm font-black text-emerald-800 sm:text-lg">{formatCurrency(product.totalAmount)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
              <p className="text-xs font-black uppercase text-slate-500">Customer</p>
              <p className="mt-2 text-sm font-black text-slate-950">{customer.name || fallbackCustomerName}</p>
              <p className="text-xs text-slate-500">{customer.phone || 'N/A'}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{customer.address || 'No address supplied'}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950 text-left text-[10px] font-black uppercase text-white sm:text-xs">
                <tr>
                  <th className="px-3 py-3 sm:px-4">Product</th>
                  <th className="px-3 py-3 sm:px-4">Qty</th>
                  <th className="px-3 py-3 text-right sm:px-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-4 sm:px-4">
                    <p className="font-black text-slate-950">{product.name || 'N/A'}</p>
                    {product.description && <p className="mt-1 text-xs text-slate-500">{product.description}</p>}
                  </td>
                  <td className="px-3 py-4 font-bold text-slate-700 sm:px-4">{Number(product.quantity || 1).toLocaleString()}</td>
                  <td className="px-3 py-4 text-right font-black text-slate-950 sm:px-4">{formatCurrency(product.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Authorized Signature</p>
              {staff.signatureUrl ? (
                <img
                  src={staff.signatureUrl}
                  alt={`${deliveredByName} signature`}
                  crossOrigin="anonymous"
                  className="mx-auto mt-2 h-14 w-full max-w-[220px] object-contain sm:h-16"
                />
              ) : (
                <div className="mx-auto mt-3 h-12 w-full max-w-[220px] border-b-2 border-slate-300"></div>
              )}
              <p className="mt-2 text-xs font-black text-slate-900">{deliveredByName}</p>
            </div>
          </div>

          <div data-receipt-actions="true" className="print:hidden flex justify-end gap-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={shareLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-black text-white hover:bg-purple-700 disabled:bg-purple-300"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M15 12.5a2.5 2.5 0 0 0-1.96.95L7.83 10.4a2.7 2.7 0 0 0 0-.8l5.21-3.05A2.5 2.5 0 1 0 12.5 5a2.7 2.7 0 0 0 .04.4L7.33 8.45a2.5 2.5 0 1 0 0 3.1l5.21 3.05a2.7 2.7 0 0 0-.04.4A2.5 2.5 0 1 0 15 12.5Z" />
              </svg>
              {shareLoading ? 'Preparing...' : 'Share'}
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white hover:bg-orange-600">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6 2a1 1 0 0 0-1 1v3h10V3a1 1 0 0 0-1-1H6Zm9 10H5v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5Z" />
                <path d="M4 7a3 3 0 0 0-3 3v3a2 2 0 0 0 2 2h1v-4h12v4h1a2 2 0 0 0 2-2v-3a3 3 0 0 0-3-3H4Zm12 3.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const isCollected = (item) => ['delivered', 'completed'].includes(item?.fulfillmentStatus);
const isActiveOrderItem = (item) => !isCollected(item);
const lockedOrderStatuses = new Set(['delivered', 'completed', 'shipped', 'cancelled']);

const getItemFulfillmentDisplay = (item = {}) => {
  const fulfillmentStatus = item.fulfillmentStatus || 'pending';
  if (['delivered', 'completed'].includes(fulfillmentStatus)) {
    return {
      status: fulfillmentStatus,
      label: fulfillmentStatus,
    };
  }

  const subtotal = Number(item.subtotal || 0);
  const paidAmount = Number(item.paidAmount || 0);
  const isPaid = item.paymentStatus === 'paid' || (subtotal > 0 && paidAmount >= subtotal);

  if (isPaid) {
    return {
      status: 'processing_order',
      label: 'Request submitted successfully',
    };
  }

  return {
    status: fulfillmentStatus,
    label: fulfillmentStatus || 'pending',
  };
};

const getProductImage = (product) => (
  product?.images?.length ? resolveImageUrl(product.images[0]) : PRODUCT_FALLBACK_IMAGE
);

const getDisplayPrice = (product) => getProductDisplayPrice(product);

const getTransactionNarration = (transaction) => (
  String(transaction?.narration || '').replace(/\s+-\s+Ref:.+$/i, '')
);
const isDebitTransaction = (transaction) => ['Debit', 'Bought', 'Delivered', 'Purchased'].includes(transaction?.direction);

const mobileProductCardStyles = [
  'border-orange-200 bg-orange-50',
  'border-sky-200 bg-sky-50',
  'border-emerald-200 bg-emerald-50',
  'border-purple-200 bg-purple-50',
  'border-rose-200 bg-rose-50',
  'border-amber-200 bg-amber-50',
];

const getMobileProductCardStyle = (index) => (
  mobileProductCardStyles[index % mobileProductCardStyles.length]
);

const Orders = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { orders, loading } = useSelector((state) => state.orders);
  const { products, productsLoading } = useSelector((state) => state.products);
  const { isAuthenticated, customer } = useSelector((state) => state.auth);
  const {
    account,
    transactions,
    loading: walletLoading,
    fundingLoading,
    fundingError,
  } = useSelector((state) => state.wallet);

  const [depositAmount, setDepositAmount] = useState('');
  const [payingItemId, setPayingItemId] = useState('');
  const [pageError, setPageError] = useState('');
  const [pageMessage, setPageMessage] = useState('');
  const [showMobileAlert, setShowMobileAlert] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showDeliveredProductsModal, setShowDeliveredProductsModal] = useState(false);
  const [replaceItem, setReplaceItem] = useState(null);
  const [replacementProductId, setReplacementProductId] = useState('');
  const [replacementVariationId, setReplacementVariationId] = useState('');
  const [replacementSearch, setReplacementSearch] = useState('');
  const [replaceError, setReplaceError] = useState('');
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchOrdersRequest());
      dispatch(fetchWalletRequest());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    const message = location.state?.message;
    const error = location.state?.error;
    if (message) setPageMessage(message);
    if (error) setPageError(error);
    if (message || error) {
      window.history.replaceState({}, document.title, `${location.pathname}${location.search}`);
    }
  }, [location.pathname, location.search, location.state]);

  useEffect(() => {
    if (pageMessage || pageError || fundingError) {
      setShowMobileAlert(true);
    }
  }, [pageMessage, pageError, fundingError]);

  const activeOrder = useMemo(() => {
    const activeStatuses = new Set(['pending', 'confirmed', 'paid', 'partially_paid', 'processing', 'shipped', 'delivered']);
    const preferredOrderNumber = new URLSearchParams(location.search).get('orderNumber');
    const writableOrders = orders.filter((order) => !order.isReadOnlyLegacy);
    if (preferredOrderNumber) {
      const preferredOrder = writableOrders.find((order) => order.orderNumber === preferredOrderNumber);
      if (preferredOrder) return preferredOrder;
    }
    return writableOrders.find((order) => activeStatuses.has(order.status)) || writableOrders[0] || null;
  }, [location.search, orders]);
  const previousSBAccounts = useMemo(
    () => orders.filter((order) => order.isReadOnlyLegacy),
    [orders]
  );

  const items = activeOrder?.items || [];
  const activeItems = items.filter(isActiveOrderItem);
  const deliveredItems = items.filter(isCollected);
  const activeItemsTotalAmount = activeItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const activeItemsPaidAmount = activeItems.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
  const totalAmount = Number(activeOrder?.totalAmount || 0);
  const totalPaid = Number(activeOrder?.installmentPlan?.totalPaid || 0);
  const remainingBalance = Number(activeOrder?.installmentPlan?.remainingBalance ?? Math.max(0, totalAmount - totalPaid));
  const walletBalance = Number(account?.availableBalance || 0);
  const progress = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0;
  const allCollected = items.length > 0 && items.every(isCollected);
  const collectionStatus = allCollected
    ? 'completed'
    : items.some(isCollected)
      ? 'partly collected'
      : 'pending collection';
  const selectedReplacementProduct = products.find((product) => product._id === replacementProductId);
  const activeReplacementVariations = selectedReplacementProduct?.hasVariations && Array.isArray(selectedReplacementProduct.variations)
    ? selectedReplacementProduct.variations.filter((variation) => variation.isActive !== false)
    : [];
  const selectedReplacementVariation = activeReplacementVariations.find(
    (variation) => variation._id === replacementVariationId
  );
  const customerName = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || 'Customer';
  const replacementUnitPrice = selectedReplacementVariation
    ? calculateCustomerSellingPrice(selectedReplacementVariation.price)
    : getDisplayPrice(selectedReplacementProduct);
  const replacementSubtotal = replacementUnitPrice * Number(replaceItem?.quantity || 1);
  const replacementOrderTotal = replaceItem
    ? activeItemsTotalAmount - Number(replaceItem.subtotal || 0) + replacementSubtotal
    : activeItemsTotalAmount;
  const replacePaidAmount = Number(replaceItem?.paidAmount || 0);
  const otherItemsPaidAmount = Math.max(0, activeItemsPaidAmount - replacePaidAmount);
  const walletAfterOldPaymentReversal = walletBalance + replacePaidAmount;
  const replacementWillBePaid = replacementSubtotal > 0 && walletAfterOldPaymentReversal >= replacementSubtotal;
  const replacementPaidAmount = replacementWillBePaid ? replacementSubtotal : 0;
  const replacementProjectedPaidAmount = otherItemsPaidAmount + replacementPaidAmount;
  const replacementRemainingBalance = Math.max(0, replacementOrderTotal - replacementProjectedPaidAmount);
  const projectedWalletBalance = replacementWillBePaid
    ? walletAfterOldPaymentReversal - replacementSubtotal
    : walletAfterOldPaymentReversal;
  const filteredReplacementProducts = products.filter((product) => {
    const search = replacementSearch.trim().toLowerCase();
    const isSameProduct = product._id === replaceItem?.productId;
    const matchesSearch = !search || [
      product.name,
      product.description,
      product.categoryName,
    ].some((value) => String(value || '').toLowerCase().includes(search));

    return !isSameProduct && product.isActive !== false && matchesSearch;
  });
  const previousSBAccountsSection = previousSBAccounts.length > 0 && (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Previous SB Accounts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Old SB accounts are shown for record keeping only. New products cannot be added to them.
            </p>
          </div>
          <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            View only
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {previousSBAccounts.map((accountOrder) => {
          const accountTotal = Number(accountOrder.totalAmount || 0);
          const paidAmount = Number(accountOrder.installmentPlan?.totalPaid || 0);
          const accountRemaining = Number(accountOrder.installmentPlan?.remainingBalance ?? Math.max(0, accountTotal - paidAmount));
          const accountItems = accountOrder.items || [];

          return (
            <div key={accountOrder.orderNumber || accountOrder._id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-950">{accountOrder.SBAccountNumber || accountOrder.orderNumber}</h3>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                      Previous SB Account
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${getStatusPill(accountOrder.paymentStatus)}`}>
                      {accountOrder.paymentStatus || 'unpaid'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Created: {formatDate(accountOrder.createdAt)} | Status: {accountOrder.status || 'N/A'}
                  </p>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[420px]">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
                    <p className="mt-1 font-bold text-slate-950">{formatCurrency(accountTotal)}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-3">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Paid</p>
                    <p className="mt-1 font-bold text-emerald-800">{formatCurrency(paidAmount)}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase text-amber-700">Remaining</p>
                    <p className="mt-1 font-bold text-amber-800">{formatCurrency(accountRemaining)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Paid</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Collection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accountItems.map((item) => {
                      const fulfillmentDisplay = getItemFulfillmentDisplay(item);
                      return (
                        <tr key={item._id || item.productName}>
                          <td className="min-w-[220px] px-4 py-3 font-semibold text-slate-900">{item.productName}</td>
                          <td className="px-4 py-3 text-slate-600">{Number(item.quantity || 1).toLocaleString()}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                          <td className="px-4 py-3 text-slate-600">{formatCurrency(item.paidAmount)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${getStatusPill(item.paymentStatus)}`}>
                              {item.paymentStatus || 'unpaid'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusPill(fulfillmentDisplay.status)}`}>
                              {fulfillmentDisplay.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=orders" />;
  }

  const handleFundWallet = (event) => {
    event.preventDefault();
    setPageError('');
    setPageMessage('');

    dispatch(initializeWalletFundingRequest({
      fundingData: {
        amount: depositAmount,
        callbackUrl: `${window.location.origin}/payment/wallet/verify`,
      },
      onSuccess: (data) => {
        setShowDepositModal(false);
        window.location.href = data.authorization_url;
      },
      onError: (error) => {
        setPageError(error || 'Failed to initialize wallet deposit.');
      },
    }));
  };

  const handlePayItem = async (item) => {
    if (!activeOrder?.orderNumber || !item?._id) return;

    setPageError('');
    setPageMessage('');
    setPayingItemId(item._id);
    const due = Math.max(0, Number(item.subtotal || 0) - Number(item.paidAmount || 0));
    if (due <= 0) {
      setPayingItemId('');
      setPageMessage('This product has already been paid for.');
      return;
    }

    if (walletBalance < due) {
      const shortfall = Math.max(0, due - walletBalance);
      dispatch(initializeWalletFundingRequest({
        fundingData: {
          amount: shortfall,
          callbackUrl: `${window.location.origin}/payment/wallet/verify`,
          autoPayOrderNumber: activeOrder.orderNumber,
          autoPayItemId: item._id,
        },
        onSuccess: (data) => {
          localStorage.setItem('pendingWalletAutoPay', JSON.stringify({
            orderNumber: activeOrder.orderNumber,
            itemId: item._id,
            reference: data.reference || '',
          }));
          window.location.href = data.authorization_url;
        },
        onError: (error) => {
          setPayingItemId('');
          setPageError(error || 'Failed to initialize wallet deposit');
          setPageMessage('');
        },
      }));
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/ecommerce/orders/number/${activeOrder.orderNumber}/items/${item._id}/pay-wallet`,
        {},
        { headers: getAuthHeader() }
      );
      dispatch(fetchOrdersRequest());
      dispatch(fetchWalletRequest());
      setPageMessage(`Payment successful for ${item.productName}.`);
    } catch (error) {
      setPageError(error.response?.data?.message || 'Failed to pay for product from wallet');
    } finally {
      setPayingItemId('');
    }
  };

  const openReplaceModal = (item) => {
    setPageError('');
    setPageMessage('');
    setReplaceItem(item);
    setReplacementProductId('');
    setReplacementVariationId('');
    setReplacementSearch('');
    setReplaceError('');
    dispatch(fetchProductsRequest({}));
  };

  const closeReplaceModal = () => {
    setReplaceItem(null);
    setReplacementProductId('');
    setReplacementVariationId('');
    setReplacementSearch('');
    setReplaceError('');
  };

  const handleReplacementProductSelect = (product) => {
    setReplacementProductId(product._id);
    setReplacementVariationId('');
    setReplaceError('');
  };

  const handleReplaceItem = async () => {
    if (!activeOrder?.orderNumber || !replaceItem?._id) return;
    if (!replacementProductId) {
      setReplaceError('Select the replacement product');
      return;
    }
    if (activeReplacementVariations.length > 0 && !replacementVariationId) {
      setReplaceError('Select the product variation');
      return;
    }
    if (lockedOrderStatuses.has(activeOrder.status)) {
      setReplaceError('This order can no longer be changed');
      return;
    }

    setReplaceLoading(true);
    setReplaceError('');
    setPageError('');
    setPageMessage('');

    try {
      await axios.put(
        `${API_URL}/api/ecommerce/orders/number/${activeOrder.orderNumber}/items/${replaceItem._id}/replace`,
        {
          productId: replacementProductId,
          variationId: replacementVariationId,
        },
        { headers: getAuthHeader() }
      );
      closeReplaceModal();
      dispatch(fetchOrdersRequest());
      dispatch(fetchWalletRequest());
      setPageMessage(`Product changed successfully from ${replaceItem.productName}.`);
    } catch (error) {
      setReplaceError(error.response?.data?.message || 'Failed to change product');
    } finally {
      setReplaceLoading(false);
    }
  };

  const openReceipt = async (item) => {
    const receiptItemId = item?.receiptItemId || item?._id;
    if (!receiptItemId || !activeOrder) return;

    setReceiptLoadingId(item._id);
    setPageError('');
    setPageMessage('');

    try {
      const endpoint = activeOrder.isBackofficeSBAccount || activeOrder.source === 'backoffice_sb_account'
        ? `${API_URL}/api/sbaccount/customer/${encodeURIComponent(activeOrder.SBAccountNumber)}/items/${encodeURIComponent(receiptItemId)}/receipt`
        : `${API_URL}/api/ecommerce/orders/customer/${encodeURIComponent(activeOrder._id)}/items/${encodeURIComponent(receiptItemId)}/receipt`;
      const response = await axios.get(endpoint, { headers: getAuthHeader() });
      setReceipt(response.data);
    } catch (error) {
      setPageError(error.response?.data?.message || 'Failed to load receipt.');
    } finally {
      setReceiptLoadingId('');
    }
  };

  const alertText = pageError || fundingError || pageMessage;
  const alertIsError = Boolean(pageError || fundingError);

  if (loading && !activeOrder) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {previousSBAccounts.length > 0 ? (
            <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
              <div className="grid gap-0 lg:grid-cols-[1.2fr,0.8fr]">
                <div className="px-6 py-8 sm:px-8 sm:py-10">
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                    Previous SB accounts found
                  </span>
                  <h1 className="mt-4 text-2xl font-extrabold text-slate-950 sm:text-3xl">
                    Create your new Sure-Bank Stores order account
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    Your old SB accounts are available below for viewing only. To buy new products or make ecommerce deposits, select products from Sure-Bank Stores and the system will create your new active SB order account.
                  </p>
                  <Link
                    to="/products"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-6 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-orange-600 sm:w-auto"
                  >
                    Start Shopping
                  </Link>
                </div>
                <div className="border-t border-slate-100 bg-slate-950 px-6 py-7 text-white lg:border-l lg:border-t-0">
                  <p className="text-sm font-semibold uppercase tracking-wide text-orange-300">Next step</p>
                  <div className="mt-4 space-y-4 text-sm text-slate-200">
                    <div>
                      <p className="font-bold text-white">1. Pick product or products</p>
                      <p className="mt-1 text-slate-300">Go to the products page and select what you want to buy.</p>
                    </div>
                    <div>
                      <p className="font-bold text-white">2. Create the new SB account</p>
                      <p className="mt-1 text-slate-300">Checkout will create the current ecommerce SB order account.</p>
                    </div>
                    <div>
                      <p className="font-bold text-white">3. Pay or deposit</p>
                      <p className="mt-1 text-slate-300">After the new account exists, you can pay for products or deposit into your wallet.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-900">You do not have an ecommerce order account yet.</p>
              <p className="mt-2 text-sm text-slate-500">
                Select a product to create your current Sure-Bank Stores order account.
              </p>
              <Link to="/products" className="mt-6 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600">
                Start Shopping
              </Link>
            </div>
          )}
          {previousSBAccountsSection}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-2 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm sm:mb-6 sm:rounded-3xl">
          <div className="relative p-4 sm:p-6">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-orange-500/20 sm:h-40 sm:w-40" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-orange-300">Sure-Bank Stores</p>
                <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">My Orders</h1>
                <p className="mt-2 max-w-3xl rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold leading-5 text-orange-50 ring-1 ring-white/10 sm:text-sm">
              Thank you Dear {customerName}, our desire is to provide all your needs, feel free to search, browse or ask us on whatsapp
                </p>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-2 lg:block lg:min-w-[220px]">
                <div className="min-w-0 rounded-2xl bg-white/10 px-3 py-3 text-sm ring-1 ring-white/10 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300 sm:text-xs">SB Account</p>
                  <p className="mt-0.5 truncate text-sm font-black text-white sm:text-lg">{activeOrder.SBAccountNumber || 'Pending'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(fetchWalletRequest());
                    setShowTransactionHistory(true);
                  }}
                  className="min-w-0 rounded-2xl bg-orange-500 px-3 py-3 text-left text-sm text-white ring-1 ring-orange-300/40 lg:hidden"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-orange-50 sm:text-xs">Transaction</span>
                  <span className="mt-0.5 block truncate text-sm font-black sm:text-lg">History</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {pageMessage && (
          <div className="mb-3 hidden rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:mb-5 sm:block sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
            {pageMessage}
          </div>
        )}

        {(pageError || fundingError) && (
          <div className="mb-3 hidden rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 sm:mb-5 sm:block sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
            {pageError || fundingError}
          </div>
        )}

        <div className="grid gap-2 sm:gap-5 lg:grid-cols-[1.3fr,0.7fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="rounded-xl bg-purple-700 p-3 text-purple-50 shadow-sm sm:rounded-2xl sm:p-4">
                <p className="text-[10px] font-medium uppercase tracking-wide text-purple-200 sm:text-xs">Wallet Balance</p>
                <p className="mt-1 text-lg font-bold sm:mt-2 sm:text-2xl">{formatCurrency(walletBalance)}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-sky-100 p-3 sm:rounded-2xl sm:p-4">
                <p className="text-[10px] font-medium uppercase tracking-wide text-sky-700 sm:text-xs">Remaining Balance</p>
                <p className="mt-1 text-lg font-bold text-sky-950 sm:mt-2 sm:text-2xl">{formatCurrency(remainingBalance)}</p>
              </div>
            </div>

            <div className="mt-3 hidden sm:mt-6 lg:block">
              <div className="mb-1.5 flex items-center justify-between gap-3 sm:mb-2 sm:gap-4">
                <p className="text-xs font-semibold text-slate-800 sm:text-sm">Payment Progress</p>
                <p className="text-xs font-bold text-purple-700 sm:text-sm">{progress}%</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 sm:h-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 via-purple-600 to-emerald-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] leading-4 text-slate-500 sm:mt-3 sm:gap-2 sm:text-xs">
                <span>Created: {formatDate(activeOrder.createdAt)}</span>
                <span className="hidden sm:inline">•</span>
                <span>Shipping: {activeOrder.shippingAddress || 'Not provided'}</span>
                <span className="hidden sm:inline">•</span>
                <span className="capitalize">Collection: {collectionStatus}</span>
              </div>
            </div>
          </section>

          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => {
                setPageError('');
                setPageMessage('');
                setShowDepositModal(true);
              }}
              className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black text-white shadow-sm ring-1 ring-orange-300/40"
            >
              Deposit to Wallet
            </button>
          </div>

          <aside className="hidden rounded-2xl border border-orange-100 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-6 lg:block">
            <h2 className="text-base font-bold text-slate-950 sm:text-lg">Deposit to Wallet</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">Fund your wallet with Paystack, then pay for any product row.</p>
            <form className="mt-3 space-y-2 sm:mt-5 sm:space-y-3" onSubmit={handleFundWallet}>
              <input
                type="number"
                min="100"
                step="100"
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
                placeholder="Amount"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
                required
              />
              <button
                type="submit"
                disabled={fundingLoading}
                className="w-full rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
              >
                {fundingLoading ? 'Redirecting...' : 'Deposit'}
              </button>
            </form>
          </aside>
        </div>

        <section className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-6 sm:rounded-3xl">
          <div className="border-b border-slate-100 bg-white px-3 py-3 sm:px-6 sm:py-4">
            <h2 className="text-base font-bold text-slate-950 sm:text-lg">Products Under This Order</h2>
            <p className="mt-1 inline-flex rounded-full bg-orange-100 px-3 py-1 text-[11px] font-black text-orange-700 ring-1 ring-orange-200 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:font-normal sm:text-slate-500 sm:ring-0">
              Pay, replace, and track collection status per product.
            </p>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Creation Date</th>
                  <th className="px-5 py-3">Payment Type</th>
                  <th className="px-5 py-3">Payment Status</th>
                  <th className="px-5 py-3">Shipping Address</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Qty</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Collection</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {activeItems.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan="9">
                      No active products pending on this order.
                    </td>
                  </tr>
                ) : activeItems.map((item) => {
                  const due = Math.max(0, Number(item.subtotal || 0) - Number(item.paidAmount || 0));
                  const fulfillmentDisplay = getItemFulfillmentDisplay(item);
                  return (
                    <tr key={item._id}>
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(item.addedAt || activeOrder.createdAt)}</td>
                      <td className="px-5 py-4 capitalize">{item.paymentType || activeOrder.paymentType}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${getStatusPill(item.paymentStatus)}`}>
                          {item.paymentStatus || 'unpaid'}
                        </span>
                      </td>
                      <td className="min-w-[220px] px-5 py-4">{activeOrder.shippingAddress || 'N/A'}</td>
                      <td className="min-w-[220px] px-5 py-4">
                        <p className="font-semibold text-slate-900">{item.productName}</p>
                        {(item.variationName || getSelectedOptionsText(item)) && (
                          <p className="mt-1 text-xs text-slate-500">{item.variationName || getSelectedOptionsText(item)}</p>
                        )}
                        {item.requiresReplacement && (
                          <span className="mt-2 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                            out of market
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">{item.quantity}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusPill(fulfillmentDisplay.status)}`}>
                          {fulfillmentDisplay.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openReplaceModal(item)}
                            disabled={lockedOrderStatuses.has(activeOrder.status)}
                            className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:border-purple-400 hover:bg-purple-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-white disabled:text-slate-300"
                          >
                            Change Product
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePayItem(item)}
                            disabled={due <= 0 || payingItemId === item._id}
                            className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
                          >
                            {due <= 0 ? 'Paid' : payingItemId === item._id ? 'Paying...' : `Pay ${formatCurrency(due)}`}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-orange-50 text-sm font-bold text-slate-950">
                  <td className="px-5 py-4" colSpan="6">Total Amount</td>
                  <td className="px-5 py-4">{formatCurrency(activeItemsTotalAmount)}</td>
                  <td className="px-5 py-4" colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-1.5 p-2 sm:space-y-3 sm:p-4 lg:hidden">
            {activeItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-500 sm:rounded-2xl sm:p-6 sm:text-sm">
                No active products pending on this order.
              </div>
            ) : activeItems.map((item, index) => {
              const due = Math.max(0, Number(item.subtotal || 0) - Number(item.paidAmount || 0));
              const fulfillmentDisplay = getItemFulfillmentDisplay(item);
              const cardStyle = getMobileProductCardStyle(index);
              return (
                <div key={item._id} className={`rounded-xl border p-2 shadow-sm sm:rounded-2xl sm:p-4 ${cardStyle}`}>
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div>
                      <p className="text-sm font-bold leading-5 text-slate-950 sm:text-base">{item.productName}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">{formatDate(item.addedAt || activeOrder.createdAt)} • Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-950 sm:text-base">{formatCurrency(item.subtotal)}</p>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px] sm:mt-3 sm:gap-2 sm:text-xs">
                    <span className={`rounded-full border px-2 py-0.5 font-bold capitalize sm:px-2.5 sm:py-1 ${getStatusPill(item.paymentStatus)}`}>
                      {item.paymentStatus || 'unpaid'}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 font-bold sm:px-2.5 sm:py-1 ${getStatusPill(fulfillmentDisplay.status)}`}>
                      {fulfillmentDisplay.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-4 text-slate-500 sm:mt-3 sm:text-xs">{activeOrder.shippingAddress || 'No shipping address'}</p>
                  <div className="mt-2 flex gap-1.5 sm:mt-4 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => openReplaceModal(item)}
                      disabled={lockedOrderStatuses.has(activeOrder.status)}
                      className="flex-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-1.5 text-center text-[10px] font-bold text-purple-700 disabled:cursor-not-allowed disabled:bg-white disabled:text-slate-300 sm:px-3 sm:py-2 sm:text-xs"
                    >
                      Change Product
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePayItem(item)}
                      disabled={due <= 0 || payingItemId === item._id}
                      className="flex-1 rounded-full bg-orange-500 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-orange-600 disabled:bg-orange-300 sm:px-3 sm:py-2 sm:text-xs"
                    >
                      {due <= 0 ? 'Paid' : payingItemId === item._id ? 'Paying...' : 'Pay'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {deliveredItems.length > 0 && (
          <section className="mt-2 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm sm:mt-6 sm:rounded-3xl">
            <button
              type="button"
              onClick={() => setShowDeliveredProductsModal(true)}
              className="block w-full border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-sky-50 to-purple-50 px-3 py-3 text-left sm:px-6 sm:py-4 lg:pointer-events-none"
            >
              <h2 className="text-base font-black text-slate-950 sm:text-lg">Delivered Products</h2>
              <p className="mt-1 text-[11px] font-bold text-emerald-700 sm:text-sm">
                Receipts are available for products that have been delivered.
              </p>
            </button>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Delivered</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Qty</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {deliveredItems.map((item) => (
                    <tr key={`delivered-${item._id}`}>
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(item.fulfilledAt || activeOrder.updatedAt)}</td>
                      <td className="min-w-[240px] px-5 py-4">
                        <p className="font-bold text-slate-950">{item.productName}</p>
                        {(item.variationName || getSelectedOptionsText(item)) && (
                          <p className="mt-1 text-xs text-slate-500">{item.variationName || getSelectedOptionsText(item)}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">{Number(item.quantity || 1).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">{formatCurrency(item.subtotal)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${getStatusPill(item.fulfillmentStatus)}`}>
                          {item.fulfillmentStatus || 'delivered'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openReceipt(item)}
                          disabled={receiptLoadingId === item._id}
                          className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-white hover:bg-orange-600 disabled:bg-orange-300"
                        >
                          {receiptLoadingId === item._id ? 'Loading...' : 'View Receipt'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </section>
        )}

        <section className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5 lg:hidden">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-800">Payment Progress</p>
            <p className="text-xs font-bold text-purple-700">{progress}%</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 via-purple-600 to-emerald-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] leading-4 text-slate-500">
            <span>Created: {formatDate(activeOrder.createdAt)}</span>
            <span>Shipping: {activeOrder.shippingAddress || 'Not provided'}</span>
            <span className="capitalize">Collection: {collectionStatus}</span>
          </div>
        </section>

        {previousSBAccountsSection}

        <section className="mt-6 hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:block">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Statement of Account</h2>
              <p className="text-sm text-slate-500">Wallet deposits and product payments made through Paystack or backoffice.</p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(fetchWalletRequest())}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-orange-400 hover:text-orange-600"
            >
              Refresh
            </button>
          </div>

          {walletLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              Loading statement...
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              No transactions yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Narration</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {transactions.map((transaction) => (
                    <tr key={transaction._id}>
                      <td className="whitespace-nowrap px-3 py-4 text-slate-500">{transaction.date}</td>
                      <td className="min-w-[280px] px-3 py-4 font-medium text-slate-800">{getTransactionNarration(transaction)}</td>
                      <td className="px-3 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          isDebitTransaction(transaction) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {transaction.direction}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-4 font-bold ${
                        isDebitTransaction(transaction) ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {isDebitTransaction(transaction) ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-slate-700">{formatCurrency(transaction.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showTransactionHistory && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-2 sm:p-3 lg:hidden">
          <div className="flex max-h-full min-h-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
              <div>
                <h2 className="text-base font-bold text-slate-950 sm:text-lg">Statement of Account</h2>
                <p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">Deposits and product payments</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransactionHistory(false)}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 sm:px-3 sm:py-1.5 sm:text-xs"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 sm:p-4">
              {walletLoading ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500 sm:rounded-2xl sm:py-10 sm:text-sm">
                  Loading statement...
                </div>
              ) : transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500 sm:rounded-2xl sm:py-10 sm:text-sm">
                  No transactions yet.
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction._id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:rounded-2xl sm:p-4">
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-xs font-bold text-slate-900 sm:text-sm">{getTransactionNarration(transaction)}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">{transaction.date}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:py-1 sm:text-xs ${
                          isDebitTransaction(transaction) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {transaction.direction}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 sm:mt-4 sm:gap-3">
                        <span className={`text-sm font-bold sm:text-base ${
                          isDebitTransaction(transaction) ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {isDebitTransaction(transaction) ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                          Bal: {formatCurrency(transaction.balance)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 lg:hidden">
          <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Deposit to Wallet</h2>
                <p className="mt-1 text-xs text-slate-500">Enter amount and continue to Paystack.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleFundWallet}>
              <input
                type="number"
                min="100"
                step="100"
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
                placeholder="Amount"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={fundingLoading}
                className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {fundingLoading ? 'Redirecting...' : 'Deposit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showDeliveredProductsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-2 sm:p-3 lg:hidden">
          <div className="flex max-h-full min-h-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-2 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-sky-50 to-purple-50 px-3 py-3 sm:px-5 sm:py-4">
              <div>
                <h2 className="text-base font-black text-slate-950 sm:text-lg">Delivered Products</h2>
                <p className="mt-0.5 text-[10px] font-bold text-emerald-700 sm:text-xs">
                  Open a delivered product receipt for preview, print or share.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeliveredProductsModal(false)}
                className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-black text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 sm:p-4">
              <div className="grid gap-1.5 sm:gap-3">
                {deliveredItems.map((item, index) => (
                  <div key={`delivered-modal-${item._id}`} className={`rounded-xl border p-2 shadow-sm sm:rounded-2xl sm:p-4 ${getMobileProductCardStyle(index + activeItems.length)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black leading-5 text-slate-950 sm:text-base">{item.productName}</p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-500 sm:text-xs">
                          Delivered: {formatDate(item.fulfilledAt || activeOrder.updatedAt)} | Qty {Number(item.quantity || 1).toLocaleString()}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-slate-950 sm:text-base">{formatCurrency(item.subtotal)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black capitalize sm:px-2.5 sm:py-1 sm:text-xs ${getStatusPill(item.fulfillmentStatus)}`}>
                        {item.fulfillmentStatus || 'delivered'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openReceipt(item)}
                        disabled={receiptLoadingId === item._id}
                        className="rounded-full bg-orange-500 px-3 py-1.5 text-[10px] font-black text-white shadow-sm disabled:bg-orange-300 sm:px-4 sm:py-2 sm:text-xs"
                      >
                        {receiptLoadingId === item._id ? 'Loading...' : 'Receipt'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {alertText && showMobileAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:hidden">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full ${
              alertIsError ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {alertIsError ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <h3 className="text-center text-base font-bold text-slate-950">
              {alertIsError ? 'Action Failed' : 'Action Successful'}
            </h3>
            <p className="mt-2 text-center text-sm leading-6 text-slate-600">{alertText}</p>
            <button
              type="button"
              onClick={() => {
                setShowMobileAlert(false);
                setPageMessage('');
                setPageError('');
              }}
              className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold text-white ${
                alertIsError ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {replaceItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-3 sm:p-5">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Change Product</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">{replaceItem.productName}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select another available product. Quantity will remain {Number(replaceItem.quantity || 1).toLocaleString()}.
                </p>
              </div>
              <button
                type="button"
                onClick={closeReplaceModal}
                disabled={replaceLoading}
                className="self-start rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed"
              >
                Close
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1fr_320px]">
              <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={replacementSearch}
                    onChange={(event) => setReplacementSearch(event.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => dispatch(fetchProductsRequest({ search: replacementSearch }))}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    Search
                  </button>
                </div>

                {productsLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
                  </div>
                ) : filteredReplacementProducts.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
                    No available product found.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {filteredReplacementProducts.map((product) => {
                      const selected = product._id === replacementProductId;
                      return (
                        <button
                          key={product._id}
                          type="button"
                          onClick={() => handleReplacementProductSelect(product)}
                          className={`overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md ${
                            selected ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-100'
                          }`}
                        >
                          <div className="aspect-[4/3] bg-slate-100">
                            <img
                              src={getProductImage(product)}
                              alt={product.name}
                              onError={handleImageFallback}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <p className="line-clamp-2 text-sm font-bold text-slate-900">{product.name}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{product.description}</p>
                            <p className="mt-2 text-sm font-extrabold text-emerald-700">
                              {product.hasVariations ? 'From ' : ''}{formatCurrency(getDisplayPrice(product))}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <aside className="border-t border-slate-100 bg-slate-50 p-5 lg:border-l lg:border-t-0">
                <h3 className="text-base font-bold text-slate-950">Replacement Summary</h3>
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Old item</span>
                    <span className="font-bold text-slate-900">{formatCurrency(replaceItem.subtotal)}</span>
                  </div>
                  <div className="mt-3 flex justify-between gap-3">
                    <span className="text-slate-500">New item</span>
                    <span className="font-bold text-slate-900">{formatCurrency(replacementSubtotal)}</span>
                  </div>
                  {replacePaidAmount > 0 && (
                    <div className="mt-3 flex justify-between gap-3">
                      <span className="text-slate-500">Old payment reversed</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(replacePaidAmount)}</span>
                    </div>
                  )}
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">New order total</span>
                      <span className="font-bold text-slate-900">{formatCurrency(replacementOrderTotal)}</span>
                    </div>
                    <div className="mt-3 flex justify-between gap-3">
                      <span className="text-slate-500">New item payment</span>
                      <span className={`font-bold ${replacementWillBePaid ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {replacementWillBePaid ? formatCurrency(replacementSubtotal) : 'Waiting for payment'}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between gap-3">
                      <span className="text-slate-500">Remaining balance</span>
                      <span className="font-bold text-amber-700">{formatCurrency(replacementRemainingBalance)}</span>
                    </div>
                    <div className="mt-3 flex justify-between gap-3">
                      <span className="text-slate-500">Wallet after change</span>
                      <span className="font-bold text-purple-700">{formatCurrency(projectedWalletBalance)}</span>
                    </div>
                  </div>
                </div>

                {selectedReplacementProduct && activeReplacementVariations.length > 0 && (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-bold text-slate-700">Variation</label>
                    <MobileVariationDropdown
                      value={replacementVariationId}
                      options={activeReplacementVariations}
                      onChange={setReplacementVariationId}
                    />
                    <select
                      value={replacementVariationId}
                      onChange={(event) => setReplacementVariationId(event.target.value)}
                      className="hidden w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:block"
                    >
                      <option value="">Select variation</option>
                      {activeReplacementVariations.map((variation) => (
                        <option key={variation._id} value={variation._id}>
                          {getVariationLabel(variation)} - {formatCurrency(calculateCustomerSellingPrice(variation.price))}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedReplacementProduct && (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Selected</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{selectedReplacementProduct.name}</p>
                  </div>
                )}

                {replaceError && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {replaceError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleReplaceItem}
                  disabled={replaceLoading || !replacementProductId}
                  className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {replaceLoading ? 'Updating...' : 'Update Product'}
                </button>
              </aside>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal
        receipt={receipt}
        onClose={() => setReceipt(null)}
        fallbackCustomerName={customerName}
      />
    </div>
  );
};

export default Orders;
