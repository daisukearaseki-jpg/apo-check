"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { STEPS, type StepId } from "@/lib/appointment"

interface StepperProps {
  current: StepId
  completed: StepId[]
}

export function Stepper({ current, completed }: StepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === current)

  return (
    <nav aria-label="入力ステップ" className="w-full">
      <ol className="flex items-center">
        {STEPS.map((step, i) => {
          const isDone = completed.includes(step.id)
          const isCurrent = step.id === current
          return (
            <li key={step.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    isDone && !isCurrent && "border-primary bg-primary/10 text-primary",
                    !isCurrent && !isDone && "border-border bg-card text-muted-foreground",
                  )}
                >
                  {isDone && !isCurrent ? <Check className="size-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {step.short}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 flex-1 rounded-full transition-colors",
                    i < currentIndex ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
