import { Brand } from "@/components/brand";
import { MadeWithLove } from "@/components/made-with-love";
import { PageHero } from "@/components/page-hero";
import { Playbook } from "@/components/playbook";
import { TextLink } from "@/components/ui/text-link";
import { colorerPiles } from "@/lib/playbook/rendu";
import { SOURCE, TITRE } from "@/lib/site";

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
          <TextLink
            href={SOURCE}
            target="_blank"
            rel="noreferrer"
            className="text-sm"
          >
            dev-standards
          </TextLink>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-10 pt-8 pb-16">
        <PageHero
          title="Comment se fait une feature, stack par stack"
          width="3xl"
        >
          Les guidelines de dev-standards, montrées{" "}
          <span className="font-medium text-foreground">en code</span> : la
          séquence complète d'une feature, les patterns du moment, et les
          pièges.
        </PageHero>

        <Playbook piles={piles} />
      </main>

      <MadeWithLove className="mt-0 pb-10" />
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
