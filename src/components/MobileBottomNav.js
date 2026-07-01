import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItems } = useSelector((state) => state.cart);

  const items = [
    {
      label: 'products',
      to: '/products',
      match: (pathname) => pathname === '/products' || pathname.startsWith('/product'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7.5 12 3 4 7.5m16 0-8 4.5m8-4.5v9L12 21m0-9L4 7.5m8 4.5v9M4 7.5v9l8 4.5" />
        </svg>
      ),
    },
    {
      label: 'cart',
      to: '/cart',
      match: (pathname) => pathname.startsWith('/cart'),
      badge: totalItems,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13 5.4 5M7 13l-2 7h14M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
        </svg>
      ),
    },
    {
      label: 'History',
      to: '/orders',
      match: (pathname) => pathname.startsWith('/orders') || pathname.startsWith('/order-confirmation'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m5-2a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
        </svg>
      ),
    },
    {
      label: 'account',
      to: '/account',
      match: (pathname) => pathname.startsWith('/account') || pathname.startsWith('/login') || pathname.startsWith('/register'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
      <div className="grid h-16 grid-cols-4">
        {items.map((item) => {
          const active = item.match(location.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                active ? 'text-orange-600' : 'text-gray-500 hover:text-gray-900'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative">
                {item.icon}
                {item.badge > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] leading-none text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
