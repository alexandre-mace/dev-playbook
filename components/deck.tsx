"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CodeBlock } from "@/components/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EcranColore } from "@/lib/playbook/rendu";
import { cn } from "@/lib/utils";

/** Le champ de saisie a la priorité sur les flèches. */
function saisieEnCours(cible: EventTarget | null) {
  if (!(cible instanceof HTMLElement)) return false;
  return (
    cible.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(cible.tagName) ||
    cible.getAttribute("role") === "tab"
  );
}

export function Deck({
  ecrans,
  depart,
  onPosition,
  focusAuMontage,
}: {
  ecrans: EcranColore[];
  /** Position restaurée quand on revient sur une piste déjà parcourue. */
  depart: number;
  onPosition: (index: number) => void;
  /** Vrai dès le premier changement d'onglet : le deck prend alors le focus. */
  focusAuMontage: boolean;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const [emblaRef, embla] = useEmblaCarousel({
    align: "center",
    startIndex: depart,
    containScroll: "trimSnaps",
  });
  const [index, setIndex] = useState(depart);

  useEffect(() => {
    if (!embla) return;
    const surSelection = () => {
      const courant = embla.selectedScrollSnap();
      setIndex(courant);
      onPosition(courant);
    };
    embla.on("select", surSelection);
    return () => {
      embla.off("select", surSelection);
    };
  }, [embla, onPosition]);

  // Le deck remonte à chaque changement d'onglet : il prend le focus en arrivant,
  // pour que les flèches le pilotent au lieu de piloter la liste d'onglets.
  useEffect(() => {
    if (focusAuMontage) conteneur.current?.focus({ preventScroll: true });
  }, [focusAuMontage]);

  const precedent = useCallback(() => embla?.scrollPrev(), [embla]);
  const suivant = useCallback(() => embla?.scrollNext(), [embla]);

  useEffect(() => {
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.metaKey || evenement.ctrlKey || evenement.altKey) return;
      if (saisieEnCours(evenement.target)) return;

      if (evenement.key === "ArrowLeft") {
        evenement.preventDefault();
        embla?.scrollPrev();
      } else if (evenement.key === "ArrowRight") {
        evenement.preventDefault();
        embla?.scrollNext();
      } else if (evenement.key === "Home") {
        evenement.preventDefault();
        embla?.scrollTo(0);
      } else if (evenement.key === "End") {
        evenement.preventDefault();
        embla?.scrollTo(ecrans.length - 1);
      }
    }

    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [embla, ecrans.length]);

  return (
    // tabIndex -1 : pas un arrêt de tabulation, mais le focus s'y pose après un
    // changement d'onglet, pour que les flèches pilotent le deck et non la liste.
    <div
      ref={conteneur}
      tabIndex={-1}
      className="flex flex-col gap-4 outline-none"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-4 flex touch-pan-y items-stretch">
          {ecrans.map((ecran, rang) => (
            <div
              key={ecran.id}
              className="min-w-0 shrink-0 grow-0 basis-full pl-4 lg:basis-[88%] xl:basis-[80%]"
            >
              <Carte ecran={ecran} actif={rang === index} />
            </div>
          ))}
        </div>
      </div>

      {/* Les commandes ferment le deck : la page tenant en général dans le viewport,
          elles sont sous les yeux, et le nombre d'écrans se lit dès l'arrivée. */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Le raccourci vit sur le bouton : un rappel clavier à côté redoublait
            les deux mêmes flèches. */}
        <Button
          variant="secondary"
          size="icon"
          className="size-8"
          onClick={precedent}
          disabled={index === 0}
          aria-label="Écran précédent"
          aria-keyshortcuts="ArrowLeft"
          title="Écran précédent (←)"
        >
          <ArrowLeft />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="size-8"
          onClick={suivant}
          disabled={index === ecrans.length - 1}
          aria-label="Écran suivant"
          aria-keyshortcuts="ArrowRight"
          title="Écran suivant (→)"
        >
          <ArrowRight />
        </Button>

        <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
          {ecrans.map((ecran, rang) => (
            <button
              key={ecran.id}
              type="button"
              tabIndex={-1}
              title={`${rang + 1}. ${ecran.titre}`}
              onClick={() => embla?.scrollTo(rang)}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                rang === index ? "bg-primary" : "bg-border hover:bg-primary/40",
              )}
            />
          ))}
        </div>

        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {index + 1} / {ecrans.length}
        </span>
      </div>
    </div>
  );
}

function Carte({ ecran, actif }: { ecran: EcranColore; actif: boolean }) {
  return (
    <article
      aria-hidden={!actif}
      // inert : la carte voisine sort aussi de l'ordre de tabulation, sinon on
      // traverse autant de boutons Copier invisibles qu'il y a d'écrans.
      inert={!actif}
      className={cn(
        // 21rem : ce que prennent l'en-tête, les onglets, les commandes et le footer.
        // Le pari, pas la contrainte : la page ne défile en général pas, et le clamp
        // la laisse défiler plutôt que d'écraser le code sur un écran trop court.
        "flex h-[min(70vh,42rem)] flex-col overflow-hidden rounded-xl border bg-card transition-opacity duration-300 md:h-[clamp(22rem,calc(100dvh_-_21rem),42rem)]",
        !actif && "opacity-45",
      )}
    >
      <header className="shrink-0 px-6 pt-4 pb-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <Badge variant="secondary" className="font-mono">
            {ecran.rang}
          </Badge>
          <h3 className="text-lg font-semibold tracking-tight text-balance">
            {ecran.titre}
          </h3>
          <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
            {ecran.source}
          </span>
        </div>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-pretty text-muted-foreground">
          {ecran.intention}
        </p>
      </header>

      <CodeBlock
        html={ecran.html}
        code={ecran.code}
        fichier={ecran.fichier}
        langage={ecran.langage}
        className="min-h-0 flex-1"
      />

      {ecran.piege && (
        <footer className="flex shrink-0 gap-3 px-6 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">Le piège. </span>
            {ecran.piege}
          </p>
        </footer>
      )}
    </article>
  );
}
