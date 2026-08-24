import React from 'react';

const ProductCardSkeleton = ({ compact = false }) => (
  <div
    className={`card overflow-hidden rounded-lg bg-white shadow-sm ${compact ? 'mx-auto max-w-[210px]' : ''}`}
    aria-hidden="true"
  >
    <div className={`${compact ? 'aspect-[1/1]' : 'aspect-[4/3]'} relative flex items-center justify-center overflow-hidden bg-gray-100`}>
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100" />
      <div className="relative flex h-full w-full flex-col items-center justify-center px-3 text-center">
        <div className="mb-2 h-8 w-8 animate-pulse rounded-full bg-orange-100" />
        <p className="text-[10px] font-black uppercase tracking-normal text-gray-500 sm:text-xs">
          Sure-Bank Stores
        </p>
        <p className="mt-0.5 text-[9px] font-semibold text-gray-400 sm:text-[10px]">
          Product
        </p>
      </div>
    </div>
    <div className={compact ? 'p-1.5 sm:p-2' : 'p-2'}>
      <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />
      <div className="mt-1 h-2.5 w-2/3 animate-pulse rounded bg-gray-100" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
        <div className={`${compact ? 'h-5 w-8' : 'h-6 w-10'} animate-pulse rounded bg-gray-200`} />
      </div>
    </div>
  </div>
);

export default ProductCardSkeleton;
