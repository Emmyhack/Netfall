import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** The favicon mark at home-screen size. iOS applies its own corner mask. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#151515',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 86,
            width: 124,
            height: 8,
            backgroundColor: '#efeef3',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 68,
            top: 66,
            width: 10,
            height: 48,
            backgroundColor: '#65657e',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 132,
            top: 40,
            width: 20,
            height: 100,
            backgroundColor: '#6affc5',
          }}
        />
      </div>
    ),
    size,
  );
}
