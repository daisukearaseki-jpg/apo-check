"use client"

import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { YesNo } from "@/lib/appointment"

interface YesNoToggleProps {
  value: YesNo
  onChange: (value: YesNo) => void
  yesLabel?: string
  noLabel?: string
  /** "no" を選んだ時に注意表示するか */
  warnOnNo?: boolean
  name: string
}

export function YesNoToggle({
  value,
  onChange,
  yesLabel = "はい",
  noLabel = "いいえ",
  warnOnNo = false,
  name,
}: YesNoToggleProps) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-3">
      <button
        type="button"
        role="radio"
        aria-checked={value === "yes"}
        onClick={() => onChange("yes")}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-base font-semibold transition-colors",
          "active:scale-[0.98]",
          value === "yes"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground",
        )}
      >
        <Check className="size-5" />
        {yesLabel}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "no"}
        onClick={() => onChange("no")}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-base font-semibold transition-colors",
          "active:scale-[0.98]",
          value === "no"
            ? warnOnNo
              ? "border-destructive bg-destructive text-white"
              : "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground",
        )}
      >
        <X className="size-5" />
        {noLabel}
      </button>
    </div>
  )
}
