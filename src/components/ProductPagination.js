import React from 'react';

const ProductPagination = ({ pagination, onPageChange }) => {
  const page = Number(pagination?.page || 1);
  const totalPages = Number(pagination?.totalPages || 1);
  const total = Number(pagination?.total || 0);

  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((pageNumber) => (
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(pageNumber - page) <= 1
    ));

  return (
    <nav className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 shadow-sm sm:flex-row sm:px-4">
      <p className="text-xs font-medium text-gray-500">
        Page {page} of {totalPages}{total ? ` • ${total} products` : ''}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-orange-400 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {pages.map((pageNumber, index) => {
          const previousPage = pages[index - 1];
          const showGap = previousPage && pageNumber - previousPage > 1;

          return (
            <React.Fragment key={pageNumber}>
              {showGap && <span className="px-1 text-xs text-gray-400">...</span>}
              <button
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={`h-9 min-w-9 rounded-lg px-3 text-xs font-semibold transition ${
                  pageNumber === page
                    ? 'bg-orange-500 text-white'
                    : 'border border-gray-200 text-gray-700 hover:border-orange-400 hover:text-orange-600'
                }`}
              >
                {pageNumber}
              </button>
            </React.Fragment>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-orange-400 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
};

export default ProductPagination;
