import { colorer } from "@/lib/highlight";

import { PILES } from "./index";
import type { Ecran, Pile, Piste } from "./types";

/** Un écran, plus son code déjà coloré en HTML. */
export interface EcranColore extends Ecran {
  html: string;
}

export interface PisteColoree extends Omit<Piste, "écrans"> {
  ecrans: EcranColore[];
}

export interface PileColoree extends Omit<Pile, "pistes"> {
  pistes: PisteColoree[];
}

/**
 * Colore tout le playbook. Appelé depuis un Server Component, donc au build :
 * le résultat part en props, Shiki ne traverse pas.
 */
export async function colorerPiles(): Promise<PileColoree[]> {
  return Promise.all(
    PILES.map(async (pile) => ({
      ...pile,
      pistes: await Promise.all(
        pile.pistes.map(async (piste) => ({
          ...piste,
          ecrans: await Promise.all(
            piste.ecrans.map(async (ecran) => ({
              ...ecran,
              html: await colorer(ecran.code, ecran.langage, ecran.surligne),
            })),
          ),
        })),
      ),
    })),
  );
}
