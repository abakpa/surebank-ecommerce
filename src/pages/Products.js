import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductsRequest } from '../redux/slices/productSlice';
import ProductCard from '../components/ProductCard';

const Products = () => {
  const dispatch = useDispatch();
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const { products, categories, productsLoading, productsLoaded } = useSelector((state) => state.products);
  const searchCategoryId = searchParams.get('category') || '';
  const searchSubCategoryId = searchParams.get('subcategory') || '';
  const searchQuery = searchParams.get('search') || '';

  const [filters, setFilters] = useState({
    categoryId: categoryId || searchCategoryId,
    subCategoryId: searchSubCategoryId,
    search: searchQuery,
    minPrice: '',
    maxPrice: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const queryFilters = {};
    if (filters.categoryId) queryFilters.categoryId = filters.categoryId;
    if (filters.subCategoryId) queryFilters.subCategoryId = filters.subCategoryId;
    if (filters.search) queryFilters.search = filters.search;
    if (filters.minPrice) queryFilters.minPrice = filters.minPrice;
    if (filters.maxPrice) queryFilters.maxPrice = filters.maxPrice;

    dispatch(fetchProductsRequest(queryFilters));
  }, [dispatch, filters]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      categoryId: categoryId || searchCategoryId,
      subCategoryId: searchSubCategoryId,
      search: searchQuery,
    }));
  }, [categoryId, searchCategoryId, searchSubCategoryId, searchQuery]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'categoryId' ? { subCategoryId: '' } : {}),
    }));
  };

  const clearFilters = () => {
    setFilters({
      categoryId: '',
      subCategoryId: '',
      search: '',
      minPrice: '',
      maxPrice: '',
    });
  };

  const currentCategory = categories.find((c) => c._id === filters.categoryId);
  const subCategories = currentCategory?.subcategories || [];
  const groupedProducts = subCategories
    .map((subCategory) => ({
      subCategory,
      products: products.filter((product) => product.subCategoryId === subCategory._id),
    }))
    .filter((group) => group.products.length > 0);
  const uncategorizedProducts = products.filter((product) => !product.subCategoryId);
  const shouldGroupBySubCategory = Boolean(currentCategory && !filters.subCategoryId && subCategories.length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="md:w-64 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            className="mb-4 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 shadow-sm md:hidden"
          >
            <span>Filters</span>
            <svg className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`${showFilters ? 'block' : 'hidden'} md:block bg-white rounded-lg shadow p-4 md:sticky md:top-20`}>
            <h3 className="font-semibold text-lg mb-4">Filters</h3>

            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search products..."
                className="input-field"
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="categoryId"
                value={filters.categoryId}
                onChange={handleFilterChange}
                className="input-field"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {currentCategory && subCategories.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                <select
                  name="subCategoryId"
                  value={filters.subCategoryId}
                  onChange={handleFilterChange}
                  className="input-field"
                >
                  <option value="">All Subcategories</option>
                  {subCategories.map((subCategory) => (
                    <option key={subCategory._id} value={subCategory._id}>
                      {subCategory.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="minPrice"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  placeholder="Min"
                  className="input-field"
                />
                <input
                  type="number"
                  name="maxPrice"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  placeholder="Max"
                  className="input-field"
                />
              </div>
            </div>

            <button onClick={clearFilters} className="w-full btn-secondary text-sm">
              Clear Filters
            </button>
          </div>
        </aside>

        {/* Products Grid */}
        <main className="flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">
              {currentCategory ? currentCategory.name : 'All Products'}
            </h1>
            {currentCategory && subCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, subCategoryId: '' }))}
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    !filters.subCategoryId
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-300'
                  }`}
                >
                  All
                </button>
                {subCategories.map((subCategory) => (
                  <button
                    key={subCategory._id}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, subCategoryId: subCategory._id }))}
                    className={`rounded-full px-3 py-1 text-sm transition ${
                      filters.subCategoryId === subCategory._id
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    {subCategory.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {productsLoading || !productsLoaded ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No products found</p>
              <button onClick={clearFilters} className="mt-4 text-primary-600 hover:text-primary-700">
                Clear filters
              </button>
            </div>
          ) : shouldGroupBySubCategory ? (
            <div className="space-y-10">
              {groupedProducts.map((group) => (
                <section key={group.subCategory._id}>
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{group.subCategory.name}</h2>
                      <p className="text-sm text-gray-500">
                        {group.products.length} product{group.products.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {group.products.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                </section>
              ))}

              {uncategorizedProducts.length > 0 && (
                <section>
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Other Products</h2>
                    <p className="text-sm text-gray-500">
                      {uncategorizedProducts.length} product{uncategorizedProducts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {uncategorizedProducts.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Products;
