/**
 * Le modèle du playbook.
 *
 * Une pile a des pistes, une piste a des écrans, un écran montre un bout de code
 * et dit ce qu'il décide. Tout est écrit à la main dans lib/playbook/ : le contenu
 * est cuit au build, la page ne va rien chercher.
 */

export interface Screen {
  /** Identifiant stable, utilisé dans l'ancre de l'URL. */
  id: string;
  /** Le rang dans la piste, affiché tel quel : "1", "2 bis", "Piège". */
  rank: string;
  title: string;
  /** Une phrase : ce que cette étape décide, pas ce qu'elle fait. */
  intent: string;
  /** Chemin du fichier concerné, affiché en tête du bloc de code. */
  file?: string;
  language: string;
  code: string;
  /** Le détail qui coûte une heure quand on ne le connaît pas. */
  pitfall?: string;
  /** D'où vient la règle, dans dev-standards. */
  source: string;
  /** Lignes surlignées dans le bloc, en base 1. */
  highlightedLines?: number[];
}

export interface Track {
  id: string;
  label: string;
  /** Ce que la piste couvre, une ligne, sous les onglets. */
  summary: string;
  screens: Screen[];
}

export interface Stack {
  id: string;
  label: string;
  /** Le nom court affiché dans l'onglet quand la place manque. */
  shortLabel: string;
  /** La thèse de la pile, une phrase. */
  thesis: string;
  /** Le fichier de dev-standards qui fait autorité. */
  guideline: string;
  tracks: Track[];
}
