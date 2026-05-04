import { API_URL } from "./api";

export const resolveImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `${API_URL}${imagePath}`;
};

export const PRODUCT_FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#f3f4f6" />
      <rect x="120" y="80" width="160" height="120" rx="12" fill="#d1d5db" />
      <circle cx="165" cy="120" r="16" fill="#9ca3af" />
      <path d="M130 185l42-42 30 30 26-26 42 38H130z" fill="#9ca3af" />
      <text x="200" y="245" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#6b7280">
        No Image
      </text>
    </svg>
  `);

export const handleImageFallback = (event) => {
  if (event.currentTarget.dataset.fallbackApplied === "true") {
    return;
  }

  event.currentTarget.dataset.fallbackApplied = "true";
  event.currentTarget.src = PRODUCT_FALLBACK_IMAGE;
};
