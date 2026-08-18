import React from 'react';

const WhatsAppSupport = () => {
  const phoneNumber = '2347039173626';
  const message = encodeURIComponent('Hello, I need support with EasyToBuy.');
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with customer support on WhatsApp"
      className="fixed bottom-24 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:bg-[#1ebe5d] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-200 sm:bottom-5 sm:w-auto sm:gap-2 sm:px-4"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="h-7 w-7"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M16.04 3C9.42 3 4.03 8.34 4.03 14.9c0 2.1.56 4.15 1.61 5.95L4 29l8.35-1.62a12.2 12.2 0 0 0 3.69.57c6.62 0 12.01-5.34 12.01-11.9S22.66 3 16.04 3Zm0 22.9c-1.18 0-2.34-.19-3.45-.58l-.31-.1-4.96.96.97-4.82-.16-.29a9.83 9.83 0 0 1-1.51-5.22c0-5.43 4.45-9.85 9.92-9.85s9.92 4.42 9.92 9.85-4.45 10.05-9.92 10.05Zm5.44-7.37c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.78-1.49-1.75-1.66-2.04-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.68-1.62-.93-2.22-.25-.59-.5-.51-.68-.52h-.58c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.18 5.09 4.46.71.3 1.26.48 1.69.62.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.69.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
      </svg>
      <span className="hidden text-sm font-semibold sm:inline">Chat with us</span>
    </a>
  );
};

export default WhatsAppSupport;
