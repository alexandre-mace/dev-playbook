import { highlightCode } from "@/lib/highlight";

import { STACKS } from "./index";
import type { Screen, Stack, Track } from "./types";

/** Un écran, plus son code déjà coloré en HTML. */
export interface HighlightedScreen extends Screen {
  html: string;
}

export interface HighlightedTrack extends Omit<Track, "screens"> {
  screens: HighlightedScreen[];
}

export interface HighlightedStack extends Omit<Stack, "tracks"> {
  tracks: HighlightedTrack[];
}

/**
 * Colore tout le playbook. Appelé depuis un Server Component, donc au build :
 * le résultat part en props, Shiki ne traverse pas.
 */
export async function highlightStacks(): Promise<HighlightedStack[]> {
  return Promise.all(
    STACKS.map(async (stack) => ({
      ...stack,
      tracks: await Promise.all(
        stack.tracks.map(async (track) => ({
          ...track,
          screens: await Promise.all(
            track.screens.map(async (screen) => ({
              ...screen,
              html: await highlightCode(
                screen.code,
                screen.language,
                screen.highlightedLines,
              ),
            })),
          ),
        })),
      ),
    })),
  );
}
