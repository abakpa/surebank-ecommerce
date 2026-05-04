import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeaturedProductsRequest, fetchCategoriesRequest, fetchProductsRequest } from '../redux/slices/productSlice';
import ProductCard from '../components/ProductCard';
import { PRODUCT_FALLBACK_IMAGE, resolveImageUrl } from '../utils/image';

const heroSlides = [
  {
    id: 1,
    image: '/images/hero-phones.jpg',
    title: 'Latest Smartphones',
    subtitle: 'Get the newest phones with flexible payment options',
    category: 'Phones',
    gradient: 'from-gray-900/70 to-gray-800/70',
  },
  {
    id: 2,
    image: '/images/hero-electronics.jpg',
    title: 'Premium Electronics',
    subtitle: 'Top-quality gadgets at unbeatable prices',
    category: 'Electronics',
    gradient: 'from-gray-800/70 to-gray-900/70',
  },
  {
    id: 3,
    image: '/images/hero-furniture.jpg',
    title: 'Modern Furniture',
    subtitle: 'Transform your space with stylish furniture',
    category: 'Furniture',
    gradient: 'from-amber-900/70 to-orange-900/70',
  },
  {
    id: 4,
    image: '/images/hero-powerbank.jpg',
    title: 'Power Banks & Accessories',
    subtitle: 'Stay charged on the go with powerful accessories',
    category: 'Accessories',
    gradient: 'from-green-900/70 to-teal-900/70',
  },
];

const Home = () => {
  const dispatch = useDispatch();
  const { featuredProducts, products, categories, loading } = useSelector((state) => state.products);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    subCategoryId: '',
  });
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef(null);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'categoryId' ? { subCategoryId: '' } : {}),
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categoryId: '',
      subCategoryId: '',
    });
    setCategoryMenuOpen(false);
  };

  const selectedCategory = categories.find((category) => category._id === filters.categoryId);
  const selectedSubCategory = selectedCategory?.subcategories?.find(
    (subCategory) => subCategory._id === filters.subCategoryId
  );

  const handleCategorySelect = (categoryId, subCategoryId = '') => {
    setFilters((prev) => ({ ...prev, categoryId, subCategoryId }));
    setCategoryMenuOpen(false);
  };

  useEffect(() => {
    dispatch(fetchFeaturedProductsRequest({ limit: 8 }));
    dispatch(fetchCategoriesRequest());
  }, [dispatch]);

  useEffect(() => {
    const queryFilters = {};

    if (filters.search) queryFilters.search = filters.search;
    if (filters.categoryId) queryFilters.categoryId = filters.categoryId;
    if (filters.subCategoryId) queryFilters.subCategoryId = filters.subCategoryId;

    dispatch(fetchProductsRequest(queryFilters));
  }, [dispatch, filters]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setCategoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div>
      {/* Hero Carousel Section */}
      <section className="relative h-[120px] sm:h-[500px] md:h-[600px] overflow-hidden">
        {/* Slides */}
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === currentSlide
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-105'
            }`}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            {/* Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />

            {/* Content */}
            <div className="relative h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className={`max-w-xl transform transition-all duration-700 delay-200 ${
                  index === currentSlide
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-10 opacity-0'
                }`}>
                  <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[9px] sm:text-sm px-2 sm:px-4 py-0.5 sm:py-1 rounded-full mb-1 sm:mb-4">
                    {slide.category}
                  </span>
                  <h1 className="text-base sm:text-4xl md:text-6xl font-bold text-white mb-0.5 sm:mb-4 leading-tight">
                    {slide.title}
                  </h1>
                  <p className="text-[10px] sm:text-lg md:text-xl text-white/90 mb-2 sm:mb-8 max-w-[210px] sm:max-w-lg leading-tight">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                    <Link
                      to="/products"
                      className="bg-white text-center text-gray-900 px-3 sm:px-8 py-1.5 sm:py-3 rounded-lg text-[10px] sm:text-base font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
                    >
                      Shop Now
                    </Link>
                    <Link
                      to="/products"
                      className="hidden sm:block border-2 border-white text-center text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-all"
                    >
                      View Collection
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={() => {
            prevSlide();
            setIsAutoPlaying(false);
            setTimeout(() => setIsAutoPlaying(true), 5000);
          }}
          className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full transition-all hover:scale-110 z-10"
          aria-label="Previous slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => {
            nextSlide();
            setIsAutoPlaying(false);
            setTimeout(() => setIsAutoPlaying(true), 5000);
          }}
          className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full transition-all hover:scale-110 z-10"
          aria-label="Next slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-1.5 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-3 z-10">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 ${
                index === currentSlide
                  ? 'w-4 sm:w-8 h-1.5 sm:h-3 bg-white rounded-full'
                  : 'w-1.5 sm:w-3 h-1.5 sm:h-3 bg-white/50 hover:bg-white/70 rounded-full'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{
              width: `${((currentSlide + 1) / heroSlides.length) * 100}%`,
            }}
          />
        </div>
      </section>

      {/* Features Banner */}
      <section className="bg-emerald-600 text-white py-2 sm:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-2 sm:gap-4 text-[11px] sm:text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Free Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Flexible Payment Plans</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure Checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-3 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 sm:gap-3 mb-2 sm:mb-5 md:mb-12">
            <div>
              <h2 className="text-base sm:text-xl md:text-3xl font-bold mb-0.5 sm:mb-2">All Products</h2>
              <p className="text-[11px] sm:text-base text-gray-600">
                Browse everything available in the storefront
              </p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-base text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              View Full Catalog
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="mb-3 sm:mb-8 rounded-xl sm:rounded-2xl bg-white p-2 sm:p-5 shadow-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_120px] sm:grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px_auto] gap-2 sm:gap-3">
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by product name"
                className="w-full rounded-lg border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <div className="relative" ref={categoryMenuRef}>
                <button
                  type="button"
                  onClick={() => setCategoryMenuOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 outline-none transition hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <span className="truncate">
                    {selectedSubCategory
                      ? `${selectedCategory?.name} / ${selectedSubCategory.name}`
                      : selectedCategory
                        ? selectedCategory.name
                        : 'All Categories'}
                  </span>
                  <svg
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 transition-transform ${categoryMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {categoryMenuOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 sm:mt-2 max-h-56 sm:max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 sm:py-2 shadow-xl">
                    <button
                      type="button"
                      onClick={() => handleCategorySelect('', '')}
                      className={`block w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm transition hover:bg-emerald-50 hover:text-emerald-700 ${
                        !filters.categoryId ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((category) => (
                      <div key={category._id} className="border-t border-gray-100 first:border-t-0">
                        <button
                          type="button"
                          onClick={() => handleCategorySelect(category._id, '')}
                          className={`block w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium transition hover:bg-emerald-50 hover:text-emerald-700 ${
                            filters.categoryId === category._id && !filters.subCategoryId
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {category.name}
                        </button>
                        {(category.subcategories || []).length > 0 && (
                          <div className="pb-2">
                            {category.subcategories.map((subCategory) => (
                              <button
                                key={subCategory._id}
                                type="button"
                                onClick={() => handleCategorySelect(category._id, subCategory._id)}
                                className={`block w-full px-6 sm:px-7 py-1.5 sm:py-2 text-left text-xs sm:text-sm transition hover:bg-emerald-50 hover:text-emerald-700 ${
                                  filters.subCategoryId === subCategory._id
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'text-gray-500'
                                }`}
                              >
                                {subCategory.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="col-span-2 sm:col-span-1 rounded-lg border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 transition hover:border-emerald-500 hover:text-emerald-600 md:col-span-1"
              >
                Clear
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl bg-white py-12 text-center shadow-sm">
              <p className="text-gray-500 text-lg">No products available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} compact />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How SureBank Works Section - Emerald Green Background */}
      <section className="relative bg-emerald-700 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-8">
                Take control of your finances,{' '}
                <span className="text-emerald-200">you can start immediately.</span>
              </h2>

              {/* Step 1 */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-8 bg-amber-400 rounded-full"></div>
                  <h3 className="text-xl md:text-2xl font-bold">Search & Find</h3>
                </div>
                <p className="text-emerald-100 ml-4 pl-3">
                  Visit SureBank to find your desired item from our wide range of product offerings, select it and check the properties.
                </p>
              </div>

              {/* Step 2 */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-8 bg-amber-400 rounded-full"></div>
                  <h3 className="text-xl md:text-2xl font-bold">Plan & start your installment</h3>
                </div>
                <p className="text-emerald-100 ml-4 pl-3">
                  Choose your desired installment. You can choose between 4 - 48 weeks or 2 - 12 months. Then proceed to pay your first payment.
                </p>
              </div>

              {/* Step 3 */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-8 bg-amber-400 rounded-full"></div>
                  <h3 className="text-xl md:text-2xl font-bold">We will deliver at 50%</h3>
                </div>
                <p className="text-emerald-100 ml-4 pl-3">
                  Your desired item will be shipped to you before full payment at the mid-point of your installment. Start enjoying your product while you pay!
                </p>
              </div>

              <Link
                to="/products"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-900 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 shadow-lg"
              >
                Start Shopping
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Right Content - Phone Mockup with Products */}
            <div className="relative hidden lg:block">
              {/* Gold Background Shape */}
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-80 h-[500px] bg-amber-500 rounded-l-[60px]"></div>

              {/* Phone Frame */}
              <div className="relative z-10 mx-auto w-72">
                <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  <div className="bg-white rounded-[2.5rem] overflow-hidden">
                    {/* Phone Header */}
                    <div className="bg-emerald-600 px-6 py-8 text-center">
                      <h4 className="text-white text-2xl font-bold leading-tight">
                        Pay<br/>Small<br/>Small
                      </h4>
                    </div>

                    {/* Products Preview */}
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full">Latest</span>
                        <span className="text-emerald-600 text-xs">See all</span>
                      </div>

                      {/* Mini Product Cards */}
                      <div className="space-y-2">
                        {featuredProducts.slice(0, 3).map((product, idx) => (
                          <div key={product._id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <img
                              src={product.images?.[0] ? resolveImageUrl(product.images[0]) : PRODUCT_FALLBACK_IMAGE}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-emerald-600 font-bold">₦{product.price?.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose SureBank Section */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Choose SureBank?</h2>
            <p className="text-emerald-200 max-w-2xl mx-auto">
              We make it easy for you to own the things you love without breaking the bank
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-amber-400/50 transition-colors">
              <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Flexible Payments</h3>
              <p className="text-emerald-200 text-sm">Pay in daily, weekly, or monthly installments that fit your budget</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-amber-400/50 transition-colors">
              <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Early Delivery</h3>
              <p className="text-emerald-200 text-sm">Get your product delivered at 50% payment completion</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-amber-400/50 transition-colors">
              <div className="w-14 h-14 bg-amber-400 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">100% Secure</h3>
              <p className="text-emerald-200 text-sm">Your payments and data are protected with bank-level security</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-amber-400/50 transition-colors">
              <div className="w-14 h-14 bg-emerald-400 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">24/7 Support</h3>
              <p className="text-emerald-200 text-sm">Our support team is always available to help you</p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Options Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">Flexible Payment Options</h2>
            <p className="text-gray-600">Choose the payment plan that works best for you</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-gradient-to-br from-primary-50 to-white p-6 md:p-8 rounded-2xl text-center border border-primary-100 hover:shadow-xl transition-shadow">
              <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 hover:rotate-0 transition-transform">
                <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3">Outright Payment</h3>
              <p className="text-gray-600">Pay full price instantly and get your product delivered right away</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white p-6 md:p-8 rounded-2xl text-center border border-green-100 hover:shadow-xl transition-shadow">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 -rotate-3 hover:rotate-0 transition-transform">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3">Weekly Installments</h3>
              <p className="text-gray-600">Spread your payments over 4-52 weeks with easy weekly installments</p>
            </div>
            <div className="bg-gradient-to-br from-gray-100 to-white p-6 md:p-8 rounded-2xl text-center border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 hover:rotate-0 transition-transform">
                <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3">Monthly Installments</h3>
              <p className="text-gray-600">Spread your payments over 2-12 months with convenient monthly plans</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 md:py-32 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: "url('/images/cta-livingroom-tv.jpg')" }}
        />
        {/* Subtle Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/50" />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">
            Ready to Start Shopping?
          </h2>
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Join thousands of happy customers enjoying flexible payment options and quality products
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-block bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
            >
              Create Your Account
            </Link>
            <Link
              to="/products"
              className="inline-block bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
