import React, { useMemo, useState } from 'react';

const ProductSearchAutocomplete = ({
  value,
  onChange,
  onSelect,
  products = [],
  placeholder = 'Search products...',
  className = '',
  inputClassName = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const searchText = String(value || '').trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!searchText) return [];

    const seenNames = new Set();
    return (Array.isArray(products) ? products : [])
      .map((product) => String(product?.name || '').trim())
      .filter((name) => {
        if (!name) return false;
        const normalizedName = name.toLowerCase();
        if (seenNames.has(normalizedName)) return false;
        seenNames.add(normalizedName);
        return normalizedName.includes(searchText) || searchText.split(/\s+/).every((word) => normalizedName.includes(word));
      })
      .slice(0, 8);
  }, [products, searchText]);

  const showSuggestions = isFocused && searchText && suggestions.length > 0;

  const handleSuggestionClick = (productName) => {
    onSelect(productName);
    setIsFocused(false);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        name="search"
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-2 shadow-xl">
          {suggestions.map((productName) => (
            <button
              key={productName}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSuggestionClick(productName)}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              {productName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductSearchAutocomplete;
