import { ImageResponse } from 'next/og';

// Social card generated at build/request time from real product copy.
export const runtime = 'nodejs';
export const alt = 'AfriPuente — Local money. Connected continents.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#080D19',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <path d="M3 21h26" stroke="#62F0BC" strokeWidth="2.5" strokeLinecap="round" />
            <path
              d="M5 21c0-7.2 4.9-12 11-12s11 4.8 11 12"
              stroke="#9187FF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="16" cy="9" r="3" fill="#62F0BC" />
          </svg>
          <div style={{ color: '#F3F6FB', fontSize: 34, fontWeight: 600 }}>AfriPuente</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#F3F6FB', fontSize: 72, fontWeight: 600, lineHeight: 1.1 }}>
            Your money.
          </div>
          <div style={{ color: '#62F0BC', fontSize: 72, fontWeight: 600, lineHeight: 1.1 }}>
            Across continents.
          </div>
          <div style={{ color: '#9AA7BD', fontSize: 28, marginTop: 24, maxWidth: 900 }}>
            Pay from Nigeria to Bolivia with clear fees and payment tracking, powered by Pollar on
            Stellar.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, color: '#9AA7BD', fontSize: 22 }}>
          <span style={{ color: '#62F0BC' }}>NGN</span>
          <span>→</span>
          <span>USDC on Stellar</span>
          <span>→</span>
          <span style={{ color: '#9187FF' }}>BOB</span>
        </div>
      </div>
    ),
    size,
  );
}
