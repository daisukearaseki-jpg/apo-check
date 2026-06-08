"use client"

import { cn } from "@/lib/utils"

interface ChipSelectProps {
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  columns?: number
  suffix?: string
  ariaLabel: string
}

export function ChipSelect({
  options,
  value,
  onChange,
  columns = 4,
  suffix = "",
  ariaLabel,
}: ChipSelectProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const selected = value === opt
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-lg border-2 px-2 py-2.5 text-sm font-semibold transition-colors active:scale-[0.97]",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            {opt}
            {suffix}
          </button>
        )
      })}
    </div>
  )
}
