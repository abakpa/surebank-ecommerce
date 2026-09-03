import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/api';

const CustomerExperiences = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/product-reviews`);
        setReviews(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  return (
    <section className="min-h-screen bg-gray-50 py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Customer experiences</h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            What customers say about using Sure-Bank Stores.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm">
                <div className="mb-4 h-5 w-28 animate-pulse rounded bg-orange-100" />
                <div className="space-y-3">
                  <div className="h-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="mt-5 h-4 w-32 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => {
              const rating = Math.max(0, Math.min(5, Number(review.rating || 0)));

              return (
                <article key={review._id} className="bg-white rounded-lg border border-gray-100 p-5 shadow-sm">
                  <div className="mb-3 text-orange-500">
                    {'★'.repeat(rating)}
                    <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
                  </div>
                  <p className="text-sm leading-6 text-gray-700">"{review.review}"</p>
                  <p className="mt-4 text-sm font-semibold text-gray-900">
                    {review.customerName || 'Customer'}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">No customer experiences yet</h2>
            <p className="mt-2 text-sm text-gray-600">Customer reviews will appear here when they are available.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CustomerExperiences;
