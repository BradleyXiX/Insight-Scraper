import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "rgb(0, 0, 0)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgb(24, 169, 194)"
            strokeWidth="1.5"
            strokeLinecap="square"
          >
            <path d="M9 4 H5 V20 H9" />
            <path d="M15 4 H19 V20 H15" />
            <rect x="10" y="2.5" width="4" height="4" fill="rgb(24, 169, 194)" stroke="none" />
          </svg>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontSize: 64,
                fontWeight: 600,
                color: "rgb(250, 250, 250)",
                letterSpacing: -1,
              }}
            >
              INSIGHT
            </span>
            <span
              style={{
                fontSize: 64,
                fontWeight: 500,
                color: "rgb(250, 250, 250)",
                marginLeft: 16,
                fontFamily: "monospace",
              }}
            >
              SCRAPER
            </span>
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgb(155, 155, 155)",
            fontWeight: 400,
            textAlign: "center",
          }}
        >
          Every lead on the page, with the pitch already written.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
