import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Les couleurs des images rendues au build : icône, icône iOS, image OG.
 *
 * Satori ne lit ni feuille de style ni variable CSS, donc ces images portent
 * leurs couleurs en littéral. Celles qui existent en hexadécimal dans
 * `globals.css` sont lues ici plutôt que recopiées dans chaque fichier, pour
 * qu'un changement de thème ne laisse aucune d'elles derrière.
 *
 * Ce module lit le disque : il n'est importé que par les routes d'image, qui
 * s'exécutent au build. Il n'a rien à faire dans `lib/site.ts`, que
 * `components/playbook.tsx` importe et qui part donc dans le bundle client.
 */
function token(name: string): string {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const found = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!found) {
    throw new Error(`Token --${name} introuvable, ou pas en hexadécimal`);
  }
  return found[1];
}

export const BACKGROUND = token("background");
export const ACCENT = token("primary");

// Ces deux-là n'ont pas de jumeau lisible : --foreground et --muted-foreground
// sont déclarés en OkLCh, que Satori ne sait pas interpréter. Approximations
// assumées, à reprendre à la main si le thème bouge.
export const TEXT = "#171717";
export const MUTED = "#6b6a63";
