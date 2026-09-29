'use client';

/**
 * Catches failures in the root layout itself, which is the one case the
 * route-level boundary cannot reach. It replaces the whole document, so it
 * ships its own html and body and cannot rely on the app's stylesheet or
 * fonts having loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#efeef3',
          color: '#151515',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          lineHeight: 1.55,
        }}
      >
        <main style={{ maxWidth: '36rem' }}>
          <h1 style={{ margin: 0, fontSize: '2.5rem', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            Netfall could not load
          </h1>
          <p style={{ marginTop: '1.5rem', fontSize: '1.125rem', color: '#333333' }}>
            The application failed to start. Nothing was sent anywhere, and no transfer was
            initiated — Netfall never holds funds.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem',
              padding: '14px 24px',
              borderRadius: '123px',
              border: '1px solid #151515',
              backgroundColor: '#151515',
              color: '#efeef3',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#65657e' }}>
              Reference {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
