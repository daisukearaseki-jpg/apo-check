"use client"

import { Check, HelpCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { YesNoUnknown } from "@/lib/appointment"

interface YesNoUnknownToggleProps {
  value: YesNoUnknown
  onChange: (value: YesNoUnknown) => void
  warnOnNo?: boolean
  name: string
}

export function YesNoUnknownToggle({
  value,
  onChange,
  warnOnNo = false,
  name,
}: YesNoUnknownToggleProps) {
  const options: { id: YesNoUnknown; label: string; icon: typeof Check }[] = [
    { id: "yes", label: "はい", icon: Check },
    { id: "no", label: "いいえ", icon: X },
    { id: "unknown", label: "不明", icon: HelpCircle },
  ]

  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-3 gap-2">
      {options.map(({ id, label, icon: Icon }) => {
        const selected = value === id
        const warn = warnOnNo && id === "no" && selected
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3.5 text-sm font-semibold transition-colors",
              "active:scale-[0.98]",
              selected && !warn && "border-primary bg-primary text-primary-foreground",
              selected && warn && "border-destructive bg-destructive text-white",
              !selected && "border-border bg-card text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
