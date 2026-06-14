"use client"

import type { ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface FieldProps {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
}

export function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium leading-relaxed text-foreground">
        {label}
      </Label>
      {children}
      {error && (
        <p className={cn("flex items-center gap-1 text-xs font-medium text-destructive")}>
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
