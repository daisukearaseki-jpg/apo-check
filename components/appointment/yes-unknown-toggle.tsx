"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { YesUnknown } from "@/lib/appointment"

interface YesUnknownToggleProps {
  value: YesUnknown
  onChange: (value: YesUnknown) => void
  name: string
}

export function YesUnknownToggle({ value, onChange, name }: YesUnknownToggleProps) {
  const options: { id: YesUnknown; label: string; icon?: typeof Check }[] = [
    { id: "yes", label: "はい", icon: Check },
    { id: "unknown", label: "不明" },
  ]

  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-3">
      {options.map(({ id, label, icon: Icon }) => {
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-base font-semibold transition-colors",
              "active:scale-[0.98]",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            {Icon ? <Icon className="size-5" /> : null}
            {label}
          </button>
        )
      })}
    </div>
  )
}
