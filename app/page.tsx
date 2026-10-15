import { Header } from "@/components/header";
import { MadeWithLove } from "@/components/made-with-love";
import { Playbook } from "@/components/playbook";
import { highlightStacks } from "@/lib/playbook/render";
import { DESCRIPTION } from "@/lib/site";

export default async function Page() {
  // Coloration au build : le navigateur ne reçoit que du HTML déjà coloré.
  const stacks = await highlightStacks();

  return (
    <div className="mx-auto flex min-h-dvh max-w-[92rem] flex-col px-4 sm:px-8">
      <Header tagline={DESCRIPTION} />

      <main className="flex flex-1 flex-col pt-1 pb-4">
        <h1 className="sr-only">
          Comment se fait une feature, stack par stack
        </h1>
        <Playbook stacks={stacks} />
      </main>

      <MadeWithLove className="mt-0 pb-4" />
    </div>
  );
}
