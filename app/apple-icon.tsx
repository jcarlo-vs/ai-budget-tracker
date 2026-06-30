import { ImageResponse } from "next/og";

// iOS home-screen icon (apple-touch-icon). Drawn as SVG paths so the ₱ always
// renders regardless of font glyph coverage. Dark "liquid glass" gradient with a
// glowing cyan peso mark, matching the app's Apple-dark theme. iOS masks it to a
// squircle, so it's intentionally full-bleed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const accent = "#2ed3ff";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(135% 135% at 30% 0%, #16294a 0%, #0a1122 52%, #000000 100%)",
        }}
      >
        <svg width="118" height="118" viewBox="0 0 100 100" fill="none">
          {/* stem */}
          <path d="M40 18 V84" stroke={accent} strokeWidth="11" strokeLinecap="round" />
          {/* P bowl */}
          <path
            d="M40 18 H61 a16.5 16.5 0 0 1 0 33 H40"
            stroke={accent}
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* two peso bars */}
          <path d="M22 44 H66" stroke={accent} strokeWidth="9" strokeLinecap="round" />
          <path d="M22 57 H66" stroke={accent} strokeWidth="9" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
