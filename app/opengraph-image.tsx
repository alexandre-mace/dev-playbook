import { ImageResponse } from "next/og";

import { DESCRIPTION, TITRE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 88,
        background: "#FAF8F0",
        color: "#171717",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, color: "#0737FF" }}>
        {"</>"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 88, fontWeight: 600, letterSpacing: -2 }}>
          {TITRE}
        </div>
        <div style={{ fontSize: 34, color: "#6b6a63", lineHeight: 1.4 }}>
          {DESCRIPTION}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#6b6a63" }}>
        Symfony + React · Next.js · TanStack Start
      </div>
    </div>,
    size,
  );
}
