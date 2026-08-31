import { Brand } from "@/components/brand";
import { PageHero } from "@/components/page-hero";
import { Playbook } from "@/components/playbook";
import { colorerPiles } from "@/lib/playbook/rendu";
import { DESCRIPTION, SOURCE, TITRE } from "@/lib/site";

export default async function Page() {
  // Coloration au build : le navigateur ne reçoit que du HTML déjà coloré.
  const piles = await colorerPiles();

  return (
    <div className="mx-auto flex min-h-dvh max-w-[92rem] flex-col px-4 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-5">
        <Brand name={TITRE} logo="/mark.svg" href="/" />
        <div className="flex items-center gap-4">
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Touche>←</Touche>
            <Touche>→</Touche>
            <span>pour défiler</span>
          </p>
          <a
            href={SOURCE}
            target="_blank"
            rel="noreferrer"
            className="rounded-md text-sm text-muted-foreground underline decoration-primary/40 underline-offset-4 transition-colors outline-none hover:text-foreground hover:decoration-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            dev-standards
          </a>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-10 pt-8 pb-16">
        <PageHero title="Une feature full‑stack, dans chaque pile" width="3xl">
          {DESCRIPTION} Chaque écran montre{" "}
          <span className="font-medium text-foreground">
            le code qu'on écrirait aujourd'hui
          </span>
          , et le piège qui va avec.
        </PageHero>

        <Playbook piles={piles} />
      </main>

      <footer className="border-t py-6 text-sm text-muted-foreground">
        Le contenu vient des guidelines de{" "}
        <a
          href={SOURCE}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
        >
          dev-standards
        </a>
        . Quand elles bougent, cette page bouge.
      </footer>
    </div>
  );
}

function Touche({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-card px-1 font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}
