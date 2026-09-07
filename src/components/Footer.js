import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/cart', label: 'Cart' },
  { to: '/orders', label: 'My Orders' },
  { to: '/customer-experiences', label: 'Customer Experiences' },
  { to: '/terms-and-conditions', label: 'Terms and Conditions' },
];

const paymentOptions = [
  {
    label: 'Outright Payment',
    description: 'Pay the full product amount once and proceed with pickup or delivery after your order is confirmed.',
  },
  {
    label: 'Pay Small Small',
    description: (
      <>
        Start with any amount and pay at your pace.{' '}
        <strong>Complete payment early to secure the current price and avoid price changes.</strong>
      </>
    ),
  },
  {
    label: 'No Fixed Duration',
    description: (
      <>
        There’s no fixed payment schedule—pay at your convenience,{' '}
        <strong>but complete payment early to secure the current price and avoid price changes.</strong>
      </>
    ),
  },
  {
    label: 'DS',
    description: (
      <div className="space-y-3">
        <h4 className="text-base font-bold text-slate-900">Save Daily. Achieve Your Goals.</h4>
        <p>
          It works just like the traditional <strong>AJO, ISUSU or AKAWO</strong>, but gives you a simple and
          convenient way to save towards important goals.
        </p>
        <p>
          <strong>Set a savings goal for:</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your children’s school fees</li>
          <li>Your house rent</li>
          <li>Your shop rent</li>
          <li>Business needs</li>
          <li>Other personal goals</li>
        </ul>
        <p>
          Choose a fixed daily savings amount, such as <strong>₦1,000, ₦5,000 or ₦10,000</strong>. You can make
          payments in any amount that is a multiple of your chosen daily amount.
        </p>
        <p>
          Once your savings reach <strong>31 times your selected daily amount</strong>, one daily contribution is
          deducted as the service charge, while the remaining amount becomes available to you.
        </p>
        <p>
          <strong>Need your money?</strong> Withdrawal requests are processed within <strong>24 hours on working days</strong>.
        </p>
        <p>
          <strong>Choose your goal. Set your daily amount. Start saving.</strong>
        </p>
      </div>
    ),
  },
];

const Footer = () => {
  const [activePaymentOption, setActivePaymentOption] = useState(null);

  return (
    <footer className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(220px,1.15fr)_minmax(0,2fr)] lg:items-start">
          <div>
            <h3 className="text-lg font-bold text-white">Sure-Bank Stores</h3>
            <p className="mt-2 max-w-md text-xs leading-5 text-slate-300 sm:text-sm">
              Quality products with flexible payments. Start with any amount, pay as you like, and collect after full payment.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.35fr)_minmax(150px,0.8fr)_minmax(190px,0.9fr)]">
            <div>
              <h4 className="text-sm font-semibold">Quick Links</h4>
              <ul className="mt-2 flex flex-wrap gap-2 text-xs sm:text-sm">
                {quickLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 transition hover:border-emerald-300 hover:bg-emerald-400/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold">Payment</h4>
              <ul className="mt-2 flex flex-wrap gap-2 text-xs sm:block sm:space-y-1.5 sm:text-sm">
                {paymentOptions.map((option) => (
                  <li key={option.label}>
                    <button
                      type="button"
                      onClick={() => setActivePaymentOption(option)}
                      className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-left text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-400/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/60 sm:w-full"
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold">Contact</h4>
              <ul className="mt-2 space-y-1 text-xs text-slate-300 sm:text-sm">
                <li>Email: support@surebank.com</li>
                <li>Phone: +234 703 917 3626</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-3 text-center text-xs text-slate-400 sm:text-left">
          <p>&copy; {new Date().getFullYear()} Sure-Bank Stores. All rights reserved.</p>
        </div>
      </div>

      {activePaymentOption && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-option-title"
          onClick={() => setActivePaymentOption(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Payment option</p>
                <h3 id="payment-option-title" className="mt-1 text-xl font-bold">
                  {activePaymentOption.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePaymentOption(null)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Close payment option"
              >
                X
              </button>
            </div>
            <div className="mt-4 text-sm leading-6 text-slate-600">
              {activePaymentOption.description}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
