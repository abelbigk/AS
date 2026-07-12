const allowedOrigins = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://localhost:19006",
  "http://localhost:3000",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
  "http://127.0.0.1:8083",
  "http://127.0.0.1:3000",
  "https://as-wryo.onrender.com",
  "exp://127.0.0.1:8081",
  "exp://localhost:8081",
];

const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Check regex pattern for localhost variants
  if (localhostPattern.test(origin)) {
    return true;
  }
  
  return false;
}
