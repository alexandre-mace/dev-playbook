import { ImageResponse } from "next/og";

import { BACKGROUND } from "@/lib/theme";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** L'icône de l'écran d'accueil iOS, au même dessin que `icon.tsx`. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        fontSize: 128,
        background: BACKGROUND,
      }}
    >
      📗
    </div>,
    { ...size, emoji: "noto" },
  );
}
