import { ImageResponse } from "next/og";

import { BACKGROUND } from "@/lib/theme";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * L'icône dérive d'un emoji, donc elle se rend au build plutôt qu'en SVG :
 * un `<text>` emoji dans un SVG s'affiche avec la police du système, et change
 * de dessin d'une machine à l'autre. Satori le rastérise une fois pour toutes.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        fontSize: 46,
        background: BACKGROUND,
        borderRadius: 14,
      }}
    >
      📗
    </div>,
    { ...size, emoji: "noto" },
  );
}
