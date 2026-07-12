// Default allowed origins for development
const devOrigins = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://localhost:19006",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
  "http://127.0.0.1:8083",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "exp://127.0.0.1:8081",
  "exp://localhost:8081",
];

// Production origins
const prodOrigins = [
  "https://as-wryo.onrender.com",
];

// Get allowed origins based on environment
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || [];
  
  if (process.env.NODE_ENV === "production") {
    // In production, include explicitly configured origins + production hardcoded origins
    return [...prodOrigins, ...envOrigins];
  }
  
  // In development, include all dev origins + any explicitly configured ones
  return [...devOrigins, ...envOrigins];
}

const allowedOrigins = getAllowedOrigins();
const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Allow any localhost variant (including for testing local app against production backend)
  if (localhostPattern.test(origin)) {
    return true;
  }
  
  return false;
}
