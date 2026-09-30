/** @type {import('next').NextConfig} */
const nextConfig = {
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
