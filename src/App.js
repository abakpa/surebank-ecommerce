import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchCartRequest } from './redux/slices/cartSlice';
import { fetchCategoriesRequest } from './redux/slices/productSlice';

// Layout
import Header from './components/Header';
import Footer from './components/Footer';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import WhatsAppSupport from './components/WhatsAppSupport';
import MobileBottomNav from './components/MobileBottomNav';

// Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import Orders from './pages/Orders';
import OrderConfirmation from './pages/OrderConfirmation';
import PaymentVerify from './pages/PaymentVerify';
import Wallet from './pages/Wallet';
import WalletPaymentVerify from './pages/WalletPaymentVerify';
import MyDS from './pages/MyDS';
import Account from './pages/Account';
import TermsAndConditions from './pages/TermsAndConditions';
import ForgotPassword from './pages/ForgotPassword';
import ChangePassword from './pages/ChangePassword';
import AdminResetPassword from './pages/AdminResetPassword';

// Layout wrapper component
const Layout = ({ children }) => {
  const location = useLocation();
  const isPaymentPage = location.pathname.startsWith('/payment/');
  const isProductDetailPage = /^\/product\/[^/]+/.test(location.pathname);
  const shouldHideFooter = (
    isProductDetailPage ||
    location.pathname === '/products' ||
    location.pathname.startsWith('/products/category/') ||
    location.pathname === '/orders' ||
    location.pathname === '/my-ds'
  );

  // Only hide header/footer on payment verification page
  if (isPaymentPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PwaInstallPrompt />
      <Header />
      <main className="flex-1 bg-gray-50 pb-20 md:pb-0">{children}</main>
      <WhatsAppSupport />
      <MobileBottomNav />
      {!shouldHideFooter && <Footer />}
    </div>
  );
};

function AppRoutes() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchCartRequest());
    dispatch(fetchCategoriesRequest());
  }, [dispatch]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/category/:categoryId" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin-reset-password" element={<AdminResetPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/my-ds" element={<MyDS />} />
        <Route path="/account" element={<Account />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
        <Route path="/payment/verify" element={<PaymentVerify />} />
        <Route path="/payment/wallet/verify" element={<WalletPaymentVerify />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
