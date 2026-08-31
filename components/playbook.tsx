"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Deck } from "@/components/deck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextLink } from "@/components/ui/text-link";
import type { PileColoree } from "@/lib/playbook/rendu";
import { SOURCE } from "@/lib/site";

/** L'ancre porte la pile, la piste et l'écran : un lien tombe au bon endroit. */
function lireAncre(piles: PileColoree[]) {
  const [pileId, pisteId, rang] = window.location.hash.slice(1).split("/");
  const pile = piles.find((candidate) => candidate.id === pileId);
  const piste = pile?.pistes.find((candidate) => candidate.id === pisteId);
  if (!pile || !piste) return null;

  const index = Number(rang);
  return {
    pileId: pile.id,
    pisteId: piste.id,
    ecran: Number.isInteger(index)
      ? Math.min(Math.max(index, 0), piste.ecrans.length - 1)
      : 0,
  };
}

export function Playbook({ piles }: { piles: PileColoree[] }) {
  const [pileId, setPileId] = useState(piles[0].id);
  const [pisteId, setPisteId] = useState(piles[0].pistes[0].id);
  /** Position par piste, pour revenir là où on avait laissé. */
  const positions = useRef<Record<string, number>>({});
  /** Incrémenté à la restauration d'ancre, pour forcer un remontage du deck. */
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const ancre = lireAncre(piles);
    if (!ancre) return;

    positions.current[`${ancre.pileId}/${ancre.pisteId}`] = ancre.ecran;
    setPileId(ancre.pileId);
    setPisteId(ancre.pisteId);
    setRevision((precedent) => precedent + 1);
  }, [piles]);

  const pile = piles.find((candidate) => candidate.id === pileId) ?? piles[0];
  const piste =
    pile.pistes.find((candidate) => candidate.id === pisteId) ?? pile.pistes[0];
  const cle = `${pile.id}/${piste.id}`;

  /** L'ancre suit tout ce qui change : la pile, la piste, l'écran. */
  function ecrireAncre(cleVisee: string, index: number) {
    window.history.replaceState(null, "", `#${cleVisee}/${index}`);
  }

  function noterPosition(index: number) {
    positions.current[cle] = index;
    ecrireAncre(cle, index);
  }

  function changerDePile(valeur: string) {
    setPileId(valeur);
    const cleVisee = `${valeur}/${pisteId}`;
    ecrireAncre(cleVisee, positions.current[cleVisee] ?? 0);
  }

  function changerDePiste(valeur: string) {
    setPisteId(valeur);
    const cleVisee = `${pileId}/${valeur}`;
    ecrireAncre(cleVisee, positions.current[cleVisee] ?? 0);
  }

  return (
    <Tabs
      value={pileId}
      onValueChange={(valeur) => changerDePile(valeur as string)}
    >
      <TabsList className="max-w-full overflow-x-auto">
        {piles.map((candidate) => (
          <TabsTrigger key={candidate.id} value={candidate.id} className="px-3">
            <span className="hidden sm:inline">{candidate.label}</span>
            <span className="sm:hidden">{candidate.labelCourt}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {piles.map((candidate) => (
        <TabsContent key={candidate.id} value={candidate.id} className="mt-6">
          <p className="max-w-3xl text-sm leading-relaxed text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">
              {candidate.these}
            </span>{" "}
            <TextLink
              href={`${SOURCE}/blob/main/${candidate.guideline.split(" ")[0]}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs"
            >
              {candidate.guideline}
              <ExternalLink className="size-3" />
            </TextLink>
          </p>

          <Tabs
            value={pisteId}
            onValueChange={(valeur) => changerDePiste(valeur as string)}
            className="mt-6"
          >
            <TabsList variant="line" className="max-w-full overflow-x-auto">
              {candidate.pistes.map((candidatePiste) => (
                <TabsTrigger
                  key={candidatePiste.id}
                  value={candidatePiste.id}
                  className="px-3"
                >
                  {candidatePiste.label}
                  <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                    {candidatePiste.ecrans.length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {candidate.pistes.map((candidatePiste) => (
              <TabsContent
                key={candidatePiste.id}
                value={candidatePiste.id}
                className="mt-5"
              >
                <p className="mb-5 max-w-3xl text-sm text-pretty text-muted-foreground">
                  {candidatePiste.resume}
                </p>
                {/* Base UI garde un panneau monté après sa première activation.
                    Sans cette garde, chaque piste deja vue laisserait un deck vivant
                    derriere elle, qui écouterait les flèches et écrirait l'ancre. */}
                {candidate.id === pileId && candidatePiste.id === pisteId && (
                  <Deck
                    key={`${cle}-${revision}`}
                    ecrans={candidatePiste.ecrans}
                    depart={positions.current[cle] ?? 0}
                    onPosition={noterPosition}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      ))}
    </Tabs>
  );
}
