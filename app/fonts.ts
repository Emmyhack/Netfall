import { JetBrains_Mono, Outfit } from 'next/font/google';
import localFont from 'next/font/local';

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
 *   Archivo         the wordmark only, vendored as a 1.2KB instance subset —
 *                   see the note above its declaration.
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
  // 300 renders nowhere and 700 only ever applied to the wordmark, which is
  // set in the display face. Three weights is the whole page.
  weight: ['400', '500', '600'],
});

/*
 * `optional` rather than `swap`. The display face is set very large and
 * stretched to 118%, so no metric-adjusted fallback can match its advance
 * widths — when it swapped in, the hero headline reflowed from two lines to
 * three and cost 0.10 CLS on the corridor pages. With `optional` the browser
 * uses the fallback for that load if the font is not ready, caches it, and
 * uses it from the next visit on. Nothing moves either way.
 */
/*
 * The display face renders exactly one thing: the wordmark. Loading all of
 * Archivo for that put an 88KB preloaded variable font on the critical path
 * of every page in service of seven characters — the largest single item the
 * LCP text had to share bandwidth with. This file is the same face instanced
 * at the wordmark's exact axes (width 112, weight 700) and subset to its
 * letters: 1.2KB. Archivo is OFL-licensed; the licence and provenance are in
 * assets/fonts/.
 */
export const archivo = localFont({
  src: '../assets/fonts/archivo-wordmark.woff2',
  weight: '700',
  display: 'swap',
  variable: '--font-display',
  // Six letters cannot render body copy; if the wordmark ever says anything
  // else, the UI face is the fallback rather than invisible tofu.
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  adjustFontFallback: false,
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export const fontVariables = [outfit.variable, archivo.variable, jetbrainsMono.variable].join(' ');
