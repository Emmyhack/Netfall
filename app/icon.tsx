import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/**
 * The favicon: the spread bar reduced to its smallest legible form — the
 * axis, one ordinary tick, and the tall mint-capped best tick. Reads at 16px
 * because it is three shapes, not a wordmark.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#151515',
          borderRadius: 14,
        }}
      >
        {/* axis */}
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 31,
            width: 44,
            height: 3,
            backgroundColor: '#efeef3',
          }}
        />
        {/* an ordinary tick */}
        <div
          style={{
            position: 'absolute',
            left: 24,
            top: 24,
            width: 4,
            height: 17,
            backgroundColor: '#65657e',
          }}
        />
        {/* the best tick */}
        <div
          style={{
            position: 'absolute',
            left: 47,
            top: 14,
            width: 7,
            height: 37,
            backgroundColor: '#6affc5',
          }}
        />
      </div>
    ),
    size,
  );
}
