import { NEXT } from "./next";
import { SYMFONY_REACT } from "./symfony-react";
import { TANSTACK_START } from "./tanstack-start";
import type { Pile } from "./types";

/** L'ordre des piles, celui du README de dev-standards. */
export const PILES: Pile[] = [SYMFONY_REACT, NEXT, TANSTACK_START];

export type { Ecran, Pile, Piste } from "./types";
