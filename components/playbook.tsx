"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Deck } from "@/components/deck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextLink } from "@/components/ui/text-link";
import type { HighlightedStack } from "@/lib/playbook/render";
import { SOURCE } from "@/lib/site";

/** L'ancre porte la pile, la piste et l'écran : un lien tombe au bon endroit. */
function readAnchor(stacks: HighlightedStack[]) {
  const [stackId, trackId, rank] = window.location.hash.slice(1).split("/");
  const stack = stacks.find((candidate) => candidate.id === stackId);
  const track = stack?.tracks.find((candidate) => candidate.id === trackId);
  if (!stack || !track) return null;

  const index = Number(rank);
  return {
    stackId: stack.id,
    trackId: track.id,
    screen: Number.isInteger(index)
      ? Math.min(Math.max(index, 0), track.screens.length - 1)
      : 0,
  };
}

export function Playbook({ stacks }: { stacks: HighlightedStack[] }) {
  const [stackId, setStackId] = useState(stacks[0].id);
  const [trackId, setTrackId] = useState(stacks[0].tracks[0].id);
  /** Position par piste, pour revenir là où on avait laissé. */
  const positions = useRef<Record<string, number>>({});
  /** Incrémenté à la restauration d'ancre, pour forcer un remontage du deck. */
  const [revision, setRevision] = useState(0);
  /** Passe à vrai au premier changement d'onglet, et le deck prend alors le focus. */
  const [focusOnMount, setFocusOnMount] = useState(false);

  useEffect(() => {
    const anchor = readAnchor(stacks);
    if (!anchor) return;

    positions.current[`${anchor.stackId}/${anchor.trackId}`] = anchor.screen;
    setStackId(anchor.stackId);
    setTrackId(anchor.trackId);
    setRevision((previous) => previous + 1);
  }, [stacks]);

  const stack =
    stacks.find((candidate) => candidate.id === stackId) ?? stacks[0];
  const track =
    stack.tracks.find((candidate) => candidate.id === trackId) ??
    stack.tracks[0];
  const trackKey = `${stack.id}/${track.id}`;

  /** L'ancre suit tout ce qui change : la pile, la piste, l'écran. */
  function writeAnchor(key: string, index: number) {
    window.history.replaceState(null, "", `#${key}/${index}`);
  }

  function recordPosition(index: number) {
    positions.current[trackKey] = index;
    writeAnchor(trackKey, index);
  }

  function changeStack(value: string) {
    setFocusOnMount(true);
    setStackId(value);
    const targetKey = `${value}/${trackId}`;
    writeAnchor(targetKey, positions.current[targetKey] ?? 0);
  }

  function changeTrack(value: string) {
    setFocusOnMount(true);
    setTrackId(value);
    const targetKey = `${stackId}/${value}`;
    writeAnchor(targetKey, positions.current[targetKey] ?? 0);
  }

  return (
    <Tabs
      value={stackId}
      onValueChange={(value) => changeStack(value as string)}
    >
      <TabsList className="max-w-full overflow-x-auto">
        {stacks.map((candidate) => (
          <TabsTrigger key={candidate.id} value={candidate.id} className="px-3">
            <span className="hidden sm:inline">{candidate.label}</span>
            <span className="sm:hidden">{candidate.shortLabel}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {stacks.map((candidate) => (
        <TabsContent key={candidate.id} value={candidate.id} className="mt-3">
          <p className="max-w-4xl text-sm leading-relaxed text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">
              {candidate.thesis}
            </span>{" "}
            <TextLink
              href={`${SOURCE}/blob/main/${candidate.guideline.split(" ")[0]}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-baseline gap-1 font-mono text-xs"
            >
              {candidate.guideline}
              <ExternalLink className="size-3 self-center" />
            </TextLink>
          </p>

          <Tabs
            value={trackId}
            onValueChange={(value) => changeTrack(value as string)}
            className="mt-4"
          >
            <TabsList className="max-w-full overflow-x-auto">
              {candidate.tracks.map((candidateTrack) => (
                <TabsTrigger
                  key={candidateTrack.id}
                  value={candidateTrack.id}
                  className="px-3"
                >
                  {candidateTrack.label}
                  <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                    {candidateTrack.screens.length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {candidate.tracks.map((candidateTrack) => (
              <TabsContent
                key={candidateTrack.id}
                value={candidateTrack.id}
                className="mt-3"
              >
                {/* Base UI garde un panneau monté après sa première activation.
                    Sans cette garde, chaque piste deja vue laisserait un deck vivant
                    derriere elle, qui écouterait les flèches et écrirait l'ancre. */}
                {candidate.id === stackId && candidateTrack.id === trackId && (
                  <Deck
                    key={`${trackKey}-${revision}`}
                    focusOnMount={focusOnMount}
                    screens={candidateTrack.screens}
                    start={positions.current[trackKey] ?? 0}
                    onPosition={recordPosition}
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
