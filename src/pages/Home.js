import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeaturedProductsRequest, fetchCategoriesRequest, fetchProductsRequest } from '../redux/slices/productSlice';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import ProductSearchAutocomplete from '../components/ProductSearchAutocomplete';
import { handleImageFallback, resolveImageUrl } from '../utils/image';
import { getProductDisplayPrice } from '../utils/pricing';

const fallbackHeroSlides = [
  {
    id: 1,
    image: '/images/hero-phones.jpg',
    title: 'Latest Smartphones',
    subtitle: 'Get the newest phones with flexible payment options',
    category: 'Phones',
    link: '/products',
  },
  {
    id: 2,
    image: '/images/hero-electronics.jpg',
    title: 'Premium Electronics',
    subtitle: 'Top-quality gadgets at unbeatable prices',
    category: 'Electronics',
    link: '/products',
  },
  {
    id: 3,
    image: '/images/hero-furniture.jpg',
    title: 'Modern Furniture',
    subtitle: 'Transform your space with stylish furniture',
    category: 'Furniture',
    link: '/products',
  },
  {
    id: 4,
    image: '/images/hero-powerbank.jpg',
    title: 'Power Banks & Accessories',
    subtitle: 'Stay charged on the go with powerful accessories',
    category: 'Accessories',
    link: '/products',
  },
];

const isValidHeroImage = (imagePath = '') => {
  const value = String(imagePath || '').trim();
  if (!value) return false;
  if (value.startsWith('data:')) return false;
  if (value.startsWith('/uploads/')) return false;
  return /^https?:\/\//i.test(value) || value.startsWith('/');
};

const Home = () => {
  const dispatch = useDispatch();
  const { featuredProducts, products, productsPagination, categories, productsLoading, productsAppending, productsLoaded } = useSelector((state) => state.products);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [productsPage, setProductsPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    subCategoryId: '',
  });
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const mobileCategoryMenuRef = useRef(null);
  const desktopCategoryMenuRef = useRef(null);
  const loadMoreRef = useRef(null);
  const productHeroSlides = useMemo(() => (
    (featuredProducts || [])
      .map((product) => {
        const image = (product.images || []).find(isValidHeroImage);
        if (!image) return null;

        return {
          id: product._id,
          image: resolveImageUrl(image, { width: 900, height: 700, crop: 'limit' }),
          title: product.name || 'Featured Product',
          subtitle: `From ₦${getProductDisplayPrice(product).toLocaleString()}`,
          category: 'Featured Product',
          link: `/product/${product._id}`,
          isProduct: true,
        };
      })
      .filter(Boolean)
      .slice(0, 6)
  ), [featuredProducts]);
  const activeHeroSlides = productHeroSlides.length > 0 ? productHeroSlides : fallbackHeroSlides;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % activeHeroSlides.length);
  }, [activeHeroSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + activeHeroSlides.length) % activeHeroSlides.length);
  }, [activeHeroSlides.length]);

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
    setProductsPage(1);
  };

  const handleSearchSuggestionSelect = (productName) => {
    setFilters((prev) => ({
      ...prev,
      search: productName,
    }));
    setProductsPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categoryId: '',
      subCategoryId: '',
    });
    setProductsPage(1);
    setCategoryMenuOpen(false);
  };

  const selectedCategory = categories.find((category) => category._id === filters.categoryId);
  const selectedSubCategory = selectedCategory?.subcategories?.find(
    (subCategory) => subCategory._id === filters.subCategoryId
  );

  const handleCategorySelect = (categoryId, subCategoryId = '') => {
    setFilters((prev) => ({ ...prev, categoryId, subCategoryId }));
    setProductsPage(1);
    setCategoryMenuOpen(false);
  };

  const renderProductSearchCard = (categoryMenuRef, className = '', showFilters = true) => (
    <div className={`rounded-xl sm:rounded-2xl bg-white p-2 sm:p-5 shadow-sm ${className}`}>
      <div className={`${showFilters ? 'grid grid-cols-[minmax(0,1fr)_120px] sm:grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px_auto]' : 'grid grid-cols-1'} gap-2 sm:gap-3`}>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600 sm:left-4 sm:h-4 sm:w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
          </svg>
          <ProductSearchAutocomplete
            value={filters.search}
            onChange={handleFilterChange}
            onSelect={handleSearchSuggestionSelect}
            products={products}
            placeholder="Search by product name"
            inputClassName="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:px-4 sm:py-3 sm:pl-11"
          />
        </div>
        {showFilters && (
          <>
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
          </>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    dispatch(fetchFeaturedProductsRequest({ limit: 20 }));
    dispatch(fetchCategoriesRequest());
  }, [dispatch]);

  useEffect(() => {
    setCurrentSlide((slide) => Math.min(slide, activeHeroSlides.length - 1));
  }, [activeHeroSlides.length]);

  useEffect(() => {
    const queryFilters = {
      page: productsPage,
      limit: 20,
    };

    if (filters.search) queryFilters.search = filters.search;
    if (filters.categoryId) queryFilters.categoryId = filters.categoryId;
    if (filters.subCategoryId) queryFilters.subCategoryId = filters.subCategoryId;
    if (productsPage > 1) queryFilters.append = true;

    dispatch(fetchProductsRequest(queryFilters));
  }, [dispatch, filters, productsPage]);

  useEffect(() => {
    const loadMoreTarget = loadMoreRef.current;
    if (!loadMoreTarget) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          productsLoaded &&
          !productsLoading &&
          !productsAppending &&
          productsPagination.hasNextPage
        ) {
          setProductsPage((page) => page + 1);
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(loadMoreTarget);
    return () => observer.disconnect();
  }, [
    productsLoaded,
    productsLoading,
    productsAppending,
    productsPagination.hasNextPage,
  ]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideMobileMenu = mobileCategoryMenuRef.current?.contains(event.target);
      const clickedInsideDesktopMenu = desktopCategoryMenuRef.current?.contains(event.target);

      if (!clickedInsideMobileMenu && !clickedInsideDesktopMenu) {
        setCategoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div>
      <section className="bg-gray-50 px-4 py-2 sm:hidden">
        {renderProductSearchCard(mobileCategoryMenuRef, '', false)}
      </section>

      {/* Hero Product Card Carousel */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 py-3 sm:py-6 md:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {activeHeroSlides.map((slide, index) => (
                <div key={slide.id} className="w-full flex-none px-0.5 sm:px-2">
                  <Link
                    to={slide.link}
                    onClick={() => setIsAutoPlaying(false)}
                    className="grid min-h-[150px] grid-cols-[minmax(0,1.05fr)_minmax(120px,0.95fr)] overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl transition hover:-translate-y-0.5 hover:shadow-emerald-950/30 sm:min-h-[260px] sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] md:min-h-[300px] md:rounded-3xl"
                    aria-label={`View ${slide.title}`}
                  >
                    <div className="flex flex-col justify-center bg-slate-950 p-3 text-white sm:p-7 md:p-8">
                      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300 sm:mb-2 sm:text-xs">
                        Sure-Bank Stores Product
                      </p>
                      <h1 className="line-clamp-2 text-base font-bold leading-tight sm:text-3xl md:text-4xl">
                        {slide.title}
                      </h1>
                      <p className="mt-1.5 text-xs font-semibold text-amber-300 sm:mt-4 sm:text-xl">
                        {slide.subtitle}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] text-slate-200 sm:mt-6 sm:gap-2 sm:text-xs">
                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Pay small small</span>
                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Pickup</span>
                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Delivery</span>
                      </div>
                    </div>

                    <div className="relative flex min-h-[150px] items-center justify-center bg-gradient-to-br from-gray-50 via-white to-emerald-50 p-2 sm:min-h-[260px] sm:p-6 md:min-h-[300px]">
                      <div className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm sm:right-5 sm:top-5 sm:px-3 sm:py-1 sm:text-xs">
                        {slide.category}
                      </div>
                      <img
                        src={slide.image}
                        alt={slide.title}
                        onError={handleImageFallback}
                        className="h-[122px] w-full object-contain sm:h-[210px] md:h-[240px]"
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => {
            prevSlide();
            setIsAutoPlaying(false);
            setTimeout(() => setIsAutoPlaying(true), 5000);
          }}
          className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all hover:scale-110 z-10"
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
          className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all hover:scale-110 z-10"
          aria-label="Next slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-1.5 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-3 z-10">
          {activeHeroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 ${
                index === currentSlide
                  ? 'w-4 sm:w-8 h-1.5 sm:h-2.5 bg-white rounded-full'
                  : 'w-1.5 sm:w-2.5 h-1.5 sm:h-2.5 bg-white/50 hover:bg-white/70 rounded-full'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{
              width: `${((currentSlide + 1) / activeHeroSlides.length) * 100}%`,
            }}
          />
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

          {renderProductSearchCard(desktopCategoryMenuRef, 'mb-3 hidden sm:block sm:mb-8')}

          {productsLoading || !productsLoaded ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: 10 }).map((_, index) => (
                <ProductCardSkeleton key={`home-product-skeleton-${index}`} compact />
              ))}
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
          <div ref={loadMoreRef} className="h-8" aria-hidden="true" />
          {productsAppending && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <ProductCardSkeleton key={`home-more-product-skeleton-${index}`} compact />
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default Home;
