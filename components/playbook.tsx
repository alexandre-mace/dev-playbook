"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Deck } from "@/components/deck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  function noterPosition(index: number) {
    positions.current[cle] = index;
    window.history.replaceState(null, "", `#${cle}/${index}`);
  }

  // flex-col sur les Tabs : shadcn base-nova ecrit encore les variantes d'orientation en
  // data-horizontal:, donc l'attribut booleen [data-horizontal]. Base UI 1.7 n'en emet
  // aucun, il ecrit data-orientation="horizontal", et sans ce flex-col la liste d'onglets
  // et les panneaux se rangent en ligne. Corrige dans le kit, a retirer d'ici des que le
  // registry est publie et que pnpm dlx shadcn add @alexandremace/tabs a repris le fichier.
  return (
    <Tabs
      value={pileId}
      onValueChange={(valeur) => setPileId(valeur as string)}
      className="flex-col"
    >
      <TabsList className="h-auto w-full max-w-full flex-nowrap overflow-x-auto p-1 sm:w-fit">
        {piles.map((candidate) => (
          <TabsTrigger
            key={candidate.id}
            value={candidate.id}
            className="h-9 flex-none px-4 text-sm"
          >
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
            <a
              href={`${SOURCE}/blob/main/${candidate.guideline.split(" ")[0]}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
            >
              <span className="font-mono text-xs">{candidate.guideline}</span>
              <ExternalLink className="size-3" />
            </a>
          </p>

          <Tabs
            value={pisteId}
            onValueChange={(valeur) => setPisteId(valeur as string)}
            className="mt-6 flex-col"
          >
            <TabsList
              variant="line"
              className="h-auto max-w-full flex-wrap justify-start gap-y-1 p-0"
            >
              {candidate.pistes.map((candidatePiste) => (
                <TabsTrigger
                  key={candidatePiste.id}
                  value={candidatePiste.id}
                  className="h-8 flex-none px-3"
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
