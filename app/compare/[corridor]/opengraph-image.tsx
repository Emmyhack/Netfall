import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { outfitFont } from '@/lib/og/font';
import { SpreadMotif } from '@/lib/og/SpreadMotif';
import { OG } from '@/lib/og/theme';
import { getCorridor } from '@/lib/corridors';
import { corridorInsight } from '@/lib/corridorInsight';
import { formatBps, formatDecimal } from '@/lib/format';

export const size = { width: OG.width, height: OG.height };
export const contentType = 'image/png';

export function generateImageMetadata({ params }: { params: { corridor: string } }) {
  const corridor = getCorridor(params.corridor);
  return [
    {
      id: 'og',
      size,
      contentType,
      alt: corridor
        ? `${corridor.from} to ${corridor.to} compared across ${corridor.providers.length} providers on Netfall`
        : 'Netfall corridor comparison',
    },
  ];
}

/**
 * One share card per corridor, generated at build alongside the page. The
 * spread figure is the same seeded measurement the page copy uses, so the
 * card and the page cannot disagree.
 */
export default async function CorridorOpenGraphImage({
  params,
}: {
  params: { corridor: string };
}) {
  const corridor = getCorridor(params.corridor);
  if (!corridor) notFound();

  const insight = corridorInsight(corridor);
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
            {corridor.providers.length} providers compared
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 132,
              fontWeight: 500,
              color: OG.ink,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {corridor.from} → {corridor.to}
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: OG.ink2 }}>
            {corridor.fromName} into {corridor.toName}, ranked by what actually lands
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <SpreadMotif width={1056} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26 }}>
            <div style={{ display: 'flex', color: OG.ink2 }}>
              {/* ISO code rather than the currency symbol: the subset TTF the
                  renderer gets has no naira or cedi glyph, and a tofu box on
                  a share card is worse than the plainer form. */}
              best and worst are {formatBps(insight.measuredDispersionBps)} apart on{' '}
              {formatDecimal(insight.sampleAmount, { decimals: 0 })} {corridor.from}
            </div>
            <div style={{ display: 'flex', color: OG.ink3 }}>netfall.io</div>
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
