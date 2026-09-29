import { Archivo, JetBrains_Mono, Outfit } from 'next/font/google';

/**
 * The type stack, matched to MetaMask's.
 *
 * metamask.io self-hosts five faces, and every one of them is proprietary:
 *
 *   Euclid Circular B Regular / Medium  Swiss Typefaces   commercial licence
 *   MM Sans Variable (wght 400-900)     Ryan Bugden       bespoke, MetaMask-owned
 *   MM Poly Variable (RESO, wdth axes)  Ryan Bugden       bespoke, MetaMask-owned
 *   MM Sans Mono                        Ryan Bugden       bespoke, MetaMask-owned
 *
 * Euclid Circular B can be licensed from Swiss Typefaces. The three MM faces
 * were commissioned for MetaMask and are not available at any price, so the
 * closest open equivalents are used here, chosen on letterform rather than
 * vibe:
 *
 *   Outfit          stands in for Euclid Circular B. Geometric, near-circular
 *                   bowls, double-storey a, single-storey g, flat terminals,
 *                   tall x-height. The same geometric-grotesque construction,
 *                   and the same family as Onramper's Saans.
 *   Archivo         stands in for MM Poly on the hero line only, exactly as
 *                   MetaMask uses MM Poly. It is the one open variable face
 *                   with a real width axis (62-125%), which is what makes the
 *                   ultra-wide heavy display setting possible.
 *   JetBrains Mono  stands in for MM Sans Mono on numerals.
 *
 * To drop in the real Euclid Circular B once licensed, this is the only file
 * that changes: replace the `outfit` export with a next/font/local declaration
 * pointing at the woff2 files and keep the `--font-ui` variable name.
 */

export const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui',
  weight: ['300', '400', '500', '600', '700'],
});

/*
 * `optional` rather than `swap`. The display face is set very large and
 * stretched to 118%, so no metric-adjusted fallback can match its advance
 * widths — when it swapped in, the hero headline reflowed from two lines to
 * three and cost 0.10 CLS on the corridor pages. With `optional` the browser
 * uses the fallback for that load if the font is not ready, caches it, and
 * uses it from the next visit on. Nothing moves either way.
 */
export const archivo = Archivo({
  subsets: ['latin'],
  display: 'optional',
  variable: '--font-display',
  axes: ['wdth'],
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export const fontVariables = [outfit.variable, archivo.variable, jetbrainsMono.variable].join(' ');
