export const corsHeaders = {
  // Be permissive: browsers may send preflight with multiple headers.
  // This edge function must explicitly allow the headers in the OPTIONS response.
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};
