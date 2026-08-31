import { Brand } from "@/components/brand";
import { SOURCE, TITRE } from "@/lib/site";

/** La marque GitHub n'est plus dans lucide : le mark est inline. */
function MarqueGithub({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

/**
 * La marque, la description sur la même ligne, et la source en icône.
 *
 * Le titre de la page vit ici : l'écran appartient au deck, un hero prendrait
 * la place du code.
 */
export function Entete({ tagline }: { tagline: string }) {
  return (
    <header className="flex items-center justify-between gap-4 py-3">
      {/* items-center et non items-baseline : Brand est un inline-flex dont le
          premier enfant est le logo, et la ligne de base d'une image est son bord
          inférieur. La tagline se retrouverait alignée sous le texte de la marque. */}
      <div className="flex min-w-0 items-center gap-3">
        <Brand name={TITRE} logo="/mark.svg" href="/" />
        <p className="hidden truncate text-sm leading-none text-muted-foreground md:block">
          {tagline}
        </p>
      </div>
      <a
        href={SOURCE}
        target="_blank"
        rel="noreferrer"
        aria-label="dev-standards sur GitHub"
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <MarqueGithub className="size-4" />
      </a>
    </header>
  );
}
