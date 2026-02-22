export const endpoint =
  import.meta.env.PROD_ENDPOINT ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001"