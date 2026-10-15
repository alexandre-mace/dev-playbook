"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CodeBlock } from "@/components/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HighlightedScreen } from "@/lib/playbook/render";
import { cn } from "@/lib/utils";

/** Le champ de saisie a la priorité sur les flèches. */
function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.getAttribute("role") === "tab"
  );
}

export function Deck({
  screens,
  start,
  onPosition,
  focusOnMount,
}: {
  screens: HighlightedScreen[];
  /** Position restaurée quand on revient sur une piste déjà parcourue. */
  start: number;
  onPosition: (index: number) => void;
  /** Vrai dès le premier changement d'onglet : le deck prend alors le focus. */
  focusOnMount: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [emblaRef, embla] = useEmblaCarousel({
    align: "center",
    startIndex: start,
    containScroll: "trimSnaps",
  });
  const [index, setIndex] = useState(start);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => {
      const current = embla.selectedScrollSnap();
      setIndex(current);
      onPosition(current);
    };
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla, onPosition]);

  // Le deck remonte à chaque changement d'onglet : il prend le focus en arrivant,
  // pour que les flèches le pilotent au lieu de piloter la liste d'onglets.
  useEffect(() => {
    if (focusOnMount) container.current?.focus({ preventScroll: true });
  }, [focusOnMount]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        embla?.scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        embla?.scrollNext();
      } else if (event.key === "Home") {
        event.preventDefault();
        embla?.scrollTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        embla?.scrollTo(screens.length - 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [embla, screens.length]);

  return (
    // tabIndex -1 : pas un arrêt de tabulation, mais le focus s'y pose après un
    // changement d'onglet, pour que les flèches pilotent le deck et non la liste.
    <div
      ref={container}
      tabIndex={-1}
      className="flex flex-col gap-4 outline-none"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-4 flex touch-pan-y items-stretch">
          {screens.map((screen, rank) => (
            <div
              key={screen.id}
              className="min-w-0 shrink-0 grow-0 basis-full pl-4 lg:basis-[88%] xl:basis-[80%]"
            >
              <Card screen={screen} active={rank === index} />
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
          onClick={() => embla?.scrollPrev()}
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
          onClick={() => embla?.scrollNext()}
          disabled={index === screens.length - 1}
          aria-label="Écran suivant"
          aria-keyshortcuts="ArrowRight"
          title="Écran suivant (→)"
        >
          <ArrowRight />
        </Button>

        <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
          {screens.map((screen, rank) => (
            // La barre reste fine à l'œil, mais le bouton fait 24px de haut :
            // WCAG 2.5.8 mesure la cible, pas le trait qu'on y voit.
            <button
              key={screen.id}
              type="button"
              tabIndex={-1}
              title={`${rank + 1}. ${screen.title}`}
              onClick={() => embla?.scrollTo(rank)}
              className="group/segment flex h-6 flex-1 items-center"
            >
              <span
                className={cn(
                  "h-1 w-full rounded-full transition-colors",
                  rank === index
                    ? "bg-primary"
                    : "bg-border group-hover/segment:bg-primary/40",
                )}
              />
            </button>
          ))}
        </div>

        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {index + 1} / {screens.length}
        </span>
      </div>
    </div>
  );
}

function Card({
  screen,
  active,
}: {
  screen: HighlightedScreen;
  active: boolean;
}) {
  return (
    <article
      aria-hidden={!active}
      // inert : la carte voisine sort aussi de l'ordre de tabulation, sinon on
      // traverse autant de boutons Copier invisibles qu'il y a d'écrans.
      inert={!active}
      // 21rem : ce que prennent l'en-tête, les onglets, les commandes et le footer.
      // Le pari, pas la contrainte : la page ne défile en général pas, et le clamp
      // la laisse défiler plutôt que d'écraser le code sur un écran trop court.
      className={cn(
        "flex h-[min(70vh,42rem)] flex-col overflow-hidden rounded-xl border bg-card transition-opacity duration-300 md:h-[clamp(22rem,calc(100dvh_-_21rem),42rem)]",
        !active && "opacity-45",
      )}
    >
      <header className="shrink-0 px-6 pt-4 pb-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <Badge variant="secondary" className="font-mono">
            {screen.rank}
          </Badge>
          <h3 className="text-lg font-semibold tracking-tight text-balance">
            {screen.title}
          </h3>
          <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
            {screen.source}
          </span>
        </div>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-pretty text-muted-foreground">
          {screen.intent}
        </p>
      </header>

      <CodeBlock
        html={screen.html}
        code={screen.code}
        file={screen.file}
        language={screen.language}
        className="min-h-0 flex-1"
      />

      {screen.pitfall && (
        <footer className="flex shrink-0 gap-3 px-6 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">Le piège. </span>
            {screen.pitfall}
          </p>
        </footer>
      )}
    </article>
  );
}
