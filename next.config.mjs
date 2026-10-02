/*
 * Production-only content security policy. Every script, style, font, image
 * and request is same-origin: fonts are self-hosted by next/font, quotes go
 * to our own /api routes, and the only inline scripts are the theme
 * bootstrap and JSON-LD. 'unsafe-inline' for scripts is the price of keeping
 * pages statically generated (nonces would force every page dynamic); the
 * origin lock is what this policy is for. Dev keeps eval for fast refresh.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  // No includeSubDomains/preload: both are hard to reverse on a domain whose
  // other subdomains this app does not control.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

/*
 * Whether the alert and enquiry backends are configured, decided at build
 * time and inlined into the forms. The server re-checks on every request
 * (lib/server/features.ts); this only decides whether the browser shows a
 * working form or says plainly that the feature is not on yet. Changing
 * these variables therefore needs a redeploy.
 */
const has = (...names) => names.every((name) => Boolean(process.env[name]));
const storageReady =
  has('KV_REST_API_URL', 'KV_REST_API_TOKEN') || has('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN');
const emailReady = has('RESEND_API_KEY', 'EMAIL_FROM');
const alertsReady = storageReady && emailReady && (process.env.ALERTS_TOKEN_SECRET?.length ?? 0) >= 32;
const enquiriesReady = storageReady && emailReady && has('ENQUIRY_INBOX');

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_ALERTS_READY: alertsReady ? '1' : '0',
    NEXT_PUBLIC_ENQUIRIES_READY: enquiriesReady ? '1' : '0',
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
