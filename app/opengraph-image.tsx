import { ImageResponse } from 'next/og';
import { outfitFont } from '@/lib/og/font';
import { SpreadMotif } from '@/lib/og/SpreadMotif';
import { OG } from '@/lib/og/theme';
import { computeCoverage } from '@/lib/coverage';
import { formatBps } from '@/lib/format';

/** Live figures refresh on this cadence rather than freezing at build. */
export const revalidate = 300;

export const size = { width: OG.width, height: OG.height };
export const contentType = 'image/png';
export const alt = 'Netfall — see what actually lands';

/**
 * The share card for the site. Every figure on it is measured from the data
 * layer, the same as the pages; nothing is typed into the artwork.
 */
export default async function OpenGraphImage() {
  const coverage = await computeCoverage();
  const [medium, semibold] = await Promise.all([outfitFont(500), outfitFont(600)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: OG.paper,
          padding: 72,
          fontFamily: 'Outfit',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 600, color: OG.ink }}>
            Netfall
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              color: OG.ink3,
              border: `2px solid ${OG.rule}`,
              borderRadius: 123,
              padding: '10px 28px',
            }}
          >
            {coverage.providerCount} providers · {coverage.corridorCount} corridors
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 108,
            fontWeight: 500,
            color: OG.ink,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            maxWidth: 900,
          }}
        >
          See what actually lands
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <SpreadMotif width={1056} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26 }}>
            <div style={{ display: 'flex', color: OG.ink2 }}>
              Every provider, ranked by what arrives
            </div>
            <div style={{ display: 'flex', color: OG.ink3 }}>
              median spread {formatBps(coverage.medianDispersionBps)}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Outfit', data: medium, weight: 500 },
        { name: 'Outfit', data: semibold, weight: 600 },
      ],
    },
  );
}
