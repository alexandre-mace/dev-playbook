import { NEXT } from "./next";
import { SYMFONY_REACT } from "./symfony-react";
import { TANSTACK_START } from "./tanstack-start";
import type { Stack } from "./types";

/** L'ordre des piles, celui du README de dev-standards. */
export const STACKS: Stack[] = [SYMFONY_REACT, NEXT, TANSTACK_START];

export type { Screen, Stack, Track } from "./types";
