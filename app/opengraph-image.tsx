import { ImageResponse } from "next/og";

import { DESCRIPTION, TITLE } from "@/lib/site";
import { ACCENT, BACKGROUND, MUTED, TEXT } from "@/lib/theme";

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
        background: BACKGROUND,
        color: TEXT,
      }}
    >
      <div style={{ display: "flex", fontSize: 30, color: ACCENT }}>
        {"</>"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 88, fontWeight: 600, letterSpacing: -2 }}>
          {TITLE}
        </div>
        <div style={{ fontSize: 34, color: MUTED, lineHeight: 1.4 }}>
          {DESCRIPTION}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
        Symfony + React, Next.js, TanStack Start
      </div>
    </div>,
    size,
  );
}
