"use client"

import * as React from "react"
import { ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Bouton flottant de retour en haut, qui apparaît une fois la page défilée.
 *
 * Reprend l'allure du bouton outline en taille icône, mais autosuffisant sur
 * <button> natif : le site du registry garde son propre bouton, un import
 * `@/components/ui/button` n'y résoudrait pas sur la bonne implémentation.
 */
function BackToTop({
  threshold = 300,
  smooth = true,
  label = "Revenir en haut de la page",
  className,
}: {
  /** Défilement, en pixels, à partir duquel le bouton apparaît. */
  threshold?: number
  smooth?: boolean
  label?: string
  className?: string
}) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const surDefilement = () => setVisible(window.scrollY > threshold)
    surDefilement()
    window.addEventListener("scroll", surDefilement, { passive: true })
    return () => window.removeEventListener("scroll", surDefilement)
  }, [threshold])

  return (
    <button type="button"
      aria-label={label}
      onClick={() =>
        window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" })
      }
      className={cn(
        "fixed right-5 bottom-5 z-50 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium transition-all duration-300 outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-16 opacity-0",
        className,
      )}
    >
      <ArrowUp className="size-4" />
    </button>
  )
}

export { BackToTop }
