import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCartRequest } from '../redux/slices/cartSlice';
import { handleImageFallback, PRODUCT_FALLBACK_IMAGE, resolveImageUrl } from '../utils/image';

const ProductCard = ({ product, compact = false }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.cart);

  const handleAddToCart = (e) => {
    e.preventDefault();
    dispatch(addToCartRequest({ productId: product._id, quantity: 1 }));
  };

  const imageUrl = product.images && product.images.length > 0
    ? resolveImageUrl(product.images[0])
    : PRODUCT_FALLBACK_IMAGE;

  return (
    <div className={`card group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${compact ? 'max-w-[210px] mx-auto' : ''}`}>
      <Link to={`/product/${product._id}`}>
        <div className={`${compact ? 'aspect-[1/1]' : 'aspect-[4/3]'} bg-gray-100 relative overflow-hidden rounded-t-lg`}>
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={handleImageFallback}
          />
          {product.allowInstallment && (
            <span className={`absolute top-1.5 left-1.5 bg-green-500 text-white rounded ${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-1.5 py-0.5'}`}>
              Installment
            </span>
          )}
        </div>
      </Link>
      <div className={compact ? 'p-1.5 sm:p-2' : 'p-2'}>
        <Link to={`/product/${product._id}`}>
          <h3 className={`font-medium text-gray-800 hover:text-primary-600 leading-tight line-clamp-2 ${compact ? 'text-[11px] sm:text-xs' : 'text-xs'}`}>
            {product.name}
          </h3>
        </Link>
        <p className={`text-gray-400 mt-0.5 line-clamp-1 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {product.description}
        </p>
        <div className={`mt-1 flex items-center justify-between ${compact ? 'gap-0.5' : 'gap-1'}`}>
          <span className={`font-bold text-primary-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            ₦{product.price?.toLocaleString()}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={loading || product.stock === 0}
            className={`${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'} rounded font-medium ${
              product.stock === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {product.stock === 0 ? 'Out' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
