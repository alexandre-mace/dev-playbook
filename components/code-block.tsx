"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const ETIQUETTES: Record<string, string> = {
  bash: "shell",
  js: "javascript",
  makefile: "make",
  md: "markdown",
  tsx: "tsx",
  ts: "typescript",
};

/**
 * Le bloc de code : une barre de titre qui porte le chemin du fichier, puis le HTML
 * coloré au build. Le composant est client pour la seule copie.
 */
export function CodeBlock({
  html,
  code,
  fichier,
  langage,
  className,
}: {
  html: string;
  code: string;
  fichier?: string;
  langage: string;
  className?: string;
}) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    await navigator.clipboard.writeText(code);
    setCopie(true);
    setTimeout(() => setCopie(false), 1600);
  }

  return (
    <div className={cn("flex min-h-0 flex-col border-y bg-code", className)}>
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <span className="truncate font-mono text-xs text-muted-foreground">
          {fichier ?? ETIQUETTES[langage] ?? langage}
        </span>
        {fichier && (
          <span className="ml-auto shrink-0 font-mono text-[10px] tracking-wide text-code-gutter uppercase">
            {ETIQUETTES[langage] ?? langage}
          </span>
        )}
        <button
          type="button"
          onClick={copier}
          aria-label="Copier le code"
          className={cn(
            "shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
            !fichier && "ml-auto",
          )}
        >
          {copie ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>

      <div
        // biome-ignore lint/security/noDangerouslySetInnerHtml: markup produit au build par Shiki, depuis des constantes du dépôt.
        dangerouslySetInnerHTML={{ __html: html }}
        className="min-h-0 flex-1 overflow-auto py-4 font-mono text-[13px] leading-[1.7] [&_pre]:min-w-fit"
      />
    </div>
  );
}
