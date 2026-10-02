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

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  /*
   * The development harnesses under /_dev must answer a real 404 in
   * production. The layout's notFound() guard cannot do that on its own:
   * the root loading boundary makes dynamic routes stream, so the 200 header
   * is already sent by the time the guard throws, and only the page content
   * becomes the 404. Rewriting to a path no route matches settles it at the
   * routing layer, before anything renders. The guard stays as second line.
   */
  async rewrites() {
    if (process.env.NODE_ENV !== 'production') return { beforeFiles: [] };
    return {
      // beforeFiles, deliberately: a plain rewrite array runs afterFiles,
      // which is after real routes have matched — the harness pages matched
      // first and the rewrite never fired.
      beforeFiles: [{ source: '/_dev/:path*', destination: '/_dev-disabled' }],
    };
  },
};

export default nextConfig;
