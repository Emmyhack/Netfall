import { OG } from './theme';

/**
 * The spread bar, restated for Satori: an axis from worst to best with
 * provider ticks and the tall mint-capped best tick at the right end. Same
 * device as components/SpreadBar.tsx, drawn with flex divs because that is
 * the layout language the image renderer speaks.
 */
export function SpreadMotif({
  width,
  tickRatios = [0, 0.24, 0.58, 0.66, 0.71, 0.79, 0.84, 0.9],
}: {
  width: number;
  tickRatios?: readonly number[];
}) {
  const height = 72;
  const axisY = height / 2;

  return (
    <div style={{ display: 'flex', position: 'relative', width, height }}>
      {/* axis */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: axisY - 1,
          width,
          height: 2,
          backgroundColor: OG.rule,
        }}
      />
      {/* provider ticks */}
      {tickRatios.map((ratio, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: Math.round(ratio * (width - 4)),
            top: axisY - 16,
            width: 3,
            height: 32,
            backgroundColor: OG.ink3,
          }}
        />
      ))}
      {/* the best tick */}
      <div
        style={{
          position: 'absolute',
          left: width - 6,
          top: 0,
          width: 6,
          height,
          backgroundColor: OG.best,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: width - 22,
          top: -8,
          width: 22,
          height: 22,
          borderRadius: 22,
          backgroundColor: OG.mint,
        }}
      />
    </div>
  );
}
