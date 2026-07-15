import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, customer } = useSelector((state) => state.auth);
  const { totalItems } = useSelector((state) => state.cart);
  const { categories } = useSelector((state) => state.products);
  const categoryList = Array.isArray(categories) ? categories : [];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleMobileClose = () => {
    setMobileMenuOpen(false);
    setMobileCategoriesOpen(false);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center gap-3 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center min-w-0">
            <span className="text-xl sm:text-2xl font-bold text-primary-600 leading-none">Sure-Bank</span>
            <span className="ml-1 text-xs sm:text-sm text-gray-500">Stores</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary-600">
              Home
            </Link>
            <div className="relative group">
              <Link to="/products" className="text-gray-700 hover:text-primary-600">
                Products
              </Link>
              {categoryList.length > 0 && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2 max-h-96 overflow-y-auto">
                    {categoryList.map((category) => (
                      <div key={category._id} className="border-b border-gray-100 last:border-b-0">
                        <Link
                          to={`/products/category/${category._id}`}
                          className="block px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                        >
                          {category.name}
                        </Link>
                        {(category.subcategories || []).length > 0 && (
                          <div className="pb-2">
                            {category.subcategories.map((subCategory) => (
                              <Link
                                key={subCategory._id}
                                to={`/products/category/${category._id}?subcategory=${subCategory._id}`}
                                className="block px-6 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600"
                              >
                                {subCategory.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {isAuthenticated && (
              <>
                <Link to="/orders" className="text-gray-700 hover:text-primary-600">
                  My Orders
                </Link>
                <Link to="/my-ds" className="text-gray-700 hover:text-primary-600">
                  My DS
                </Link>
                <Link to="/account" className="text-gray-700 hover:text-primary-600">
                  Account
                </Link>
              </>
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Cart */}
            <Link to="/cart" className="relative">
              <svg className="w-6 h-6 text-orange-500 md:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-4">
                <span className="text-sm text-gray-600">Hi, {customer?.firstName}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-700 hover:text-primary-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <Link to="/login" className="text-sm text-gray-700 hover:text-primary-600">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              {isAuthenticated && (
                <div className="pb-3 mb-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-primary-600">Hi, {customer?.firstName} {customer?.lastName}</span>
                </div>
              )}
              <Link to="/" className="text-gray-700" onClick={handleMobileClose}>Home</Link>
              <div className="border-b border-gray-100 pb-4">
                <button
                  type="button"
                  onClick={() => setMobileCategoriesOpen((open) => !open)}
                  className="flex w-full items-center justify-between text-left text-gray-700"
                >
                  <span>Products</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${mobileCategoriesOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileCategoriesOpen && (
                  <div className="mt-3 space-y-3 pl-3 max-h-56 overflow-y-auto">
                    <Link to="/products" className="block text-sm text-gray-700" onClick={handleMobileClose}>
                      All Products
                    </Link>
                    {categoryList.map((category) => (
                      <div key={category._id} className="space-y-2">
                        <Link
                          to={`/products/category/${category._id}`}
                          className="block text-sm font-medium text-gray-700"
                          onClick={handleMobileClose}
                        >
                          {category.name}
                        </Link>
                        {(category.subcategories || []).length > 0 && (
                          <div className="space-y-2 pl-4">
                            {category.subcategories.map((subCategory) => (
                              <Link
                                key={subCategory._id}
                                to={`/products/category/${category._id}?subcategory=${subCategory._id}`}
                                className="block text-sm text-gray-500"
                                onClick={handleMobileClose}
                              >
                                {subCategory.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {isAuthenticated ? (
                <>
                  <Link to="/orders" className="text-gray-700" onClick={handleMobileClose}>My Orders</Link>
                  <Link to="/my-ds" className="text-gray-700" onClick={handleMobileClose}>My DS</Link>
                  <Link to="/account" className="text-gray-700" onClick={handleMobileClose}>Account</Link>
                  <button onClick={handleLogout} className="text-left text-gray-700">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700" onClick={handleMobileClose}>Login</Link>
                  <Link to="/register" className="text-gray-700" onClick={handleMobileClose}>Register</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
