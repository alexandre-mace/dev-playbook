/**
 * Le modèle du playbook.
 *
 * Une pile a des pistes, une piste a des écrans, un écran montre un bout de code
 * et dit ce qu'il décide. Tout est écrit à la main dans lib/playbook/ : le contenu
 * est cuit au build, la page ne va rien chercher.
 */

export interface Ecran {
  /** Identifiant stable, utilisé dans l'ancre de l'URL. */
  id: string;
  /** Le rang dans la piste, affiché tel quel : "1", "2 bis", "Piège". */
  rang: string;
  titre: string;
  /** Une phrase : ce que cette étape décide, pas ce qu'elle fait. */
  intention: string;
  /** Chemin du fichier concerné, affiché en tête du bloc de code. */
  fichier?: string;
  langage: string;
  code: string;
  /** Le détail qui coûte une heure quand on ne le connaît pas. */
  piege?: string;
  /** D'où vient la règle, dans dev-standards. */
  source: string;
  /** Lignes surlignées dans le bloc, en base 1. */
  surligne?: number[];
}

export interface Piste {
  id: string;
  label: string;
  /** Ce que la piste couvre, une ligne, sous les onglets. */
  resume: string;
  ecrans: Ecran[];
}

export interface Pile {
  id: string;
  label: string;
  /** Le nom court affiché dans l'onglet quand la place manque. */
  labelCourt: string;
  /** La thèse de la pile, une phrase. */
  these: string;
  /** Le fichier de dev-standards qui fait autorité. */
  guideline: string;
  pistes: Piste[];
}
