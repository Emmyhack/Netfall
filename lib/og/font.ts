/**
 * Fonts for the generated images.
 *
 * Satori (behind next/og) needs raw TTF data. Google Fonts serves TTF when
 * the user agent predates woff2, so the CSS is requested with an old UA and
 * the underlying file fetched from the URL it names. Runs at build time only
 * — the same moment next/font already talks to the same host — and caches
 * per weight.
 */
const cache = new Map<number, Promise<ArrayBuffer>>();

export function outfitFont(weight: 500 | 600): Promise<ArrayBuffer> {
  const cached = cache.get(weight);
  if (cached) return cached;

  const loading = (async () => {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Outfit:wght@${weight}&display=swap`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1)' } },
    ).then((response) => response.text());

    const match = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/);
    if (!match?.[1]) throw new Error(`No TTF source in Google Fonts CSS for weight ${weight}`);

    const font = await fetch(match[1]).then((response) => response.arrayBuffer());
    return font;
  })();

  cache.set(weight, loading);
  return loading;
}
