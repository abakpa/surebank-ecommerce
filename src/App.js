import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchCartRequest } from './redux/slices/cartSlice';
import { fetchCategoriesRequest } from './redux/slices/productSlice';

// Layout
import Header from './components/Header';
import Footer from './components/Footer';
import PwaInstallPrompt from './components/PwaInstallPrompt';

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

// Layout wrapper component
const Layout = ({ children }) => {
  const location = useLocation();
  const isPaymentPage = location.pathname.startsWith('/payment/');

  // Only hide header/footer on payment verification page
  if (isPaymentPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PwaInstallPrompt />
      <Header />
      <main className="flex-1 bg-gray-50">{children}</main>
      <Footer />
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
        <Route path="/register" element={<Register />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/wallet" element={<Wallet />} />
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
