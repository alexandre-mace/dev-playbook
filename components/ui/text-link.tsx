import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Lien texte pour la prose : la voix « action » du kit (primary) sans la
 * boîte du bouton. Souligné discret (decoration-primary/40) qui devient
 * plein au survol ; même style que le lien du footer made-with-love.
 */
function TextLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      className={cn(
        "rounded-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 outline-none transition-colors hover:decoration-primary focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  )
}

export { TextLink }
