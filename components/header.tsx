import { Brand } from "@/components/brand";
import { GithubMark } from "@/components/icons";
import { SOURCE, TITLE } from "@/lib/site";

/**
 * La marque, la description sur la même ligne, et la source en icône.
 *
 * Le titre de la page vit ici : l'écran appartient au deck, un hero prendrait
 * la place du code.
 */
export function Header({ tagline }: { tagline: string }) {
  return (
    <header className="flex items-center justify-between gap-4 py-3">
      {/* items-center et non items-baseline : Brand est un inline-flex dont le
          premier enfant est le logo, et la ligne de base d'une image est son bord
          inférieur. La tagline se retrouverait alignée sous le texte de la marque. */}
      <div className="flex min-w-0 items-center gap-3">
        <Brand name={TITLE} logo="/mark.svg" href="/" />
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
        <GithubMark className="size-4" />
      </a>
    </header>
  );
}
