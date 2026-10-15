import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { DESCRIPTION, TITLE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Satori ne lit ni feuille de style ni variable CSS : l'image doit porter ses
 * couleurs en littéral. Celles qui existent en hexadécimal dans `globals.css`
 * sont donc lues au build plutôt que recopiées, pour qu'un changement de thème
 * ne laisse pas l'image derrière.
 */
function token(name: string): string {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const found = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!found)
    throw new Error(`Token --${name} introuvable, ou pas en hexadécimal`);
  return found[1];
}

const BACKGROUND = token("background");
const ACCENT = token("primary");

// Ces deux-là n'ont pas de jumeau lisible : --foreground et --muted-foreground
// sont déclarés en OkLCh, que Satori ne sait pas interpréter. Approximations
// assumées, à reprendre à la main si le thème bouge.
const TEXT = "#171717";
const MUTED = "#6b6a63";

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
