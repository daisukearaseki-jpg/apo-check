"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  WEEKDAYS,
  getMinAppointmentDate,
  getSlotCategory,
  isHoliday,
} from "@/lib/appointment"

interface AppointmentDatePickerProps {
  value: string
  onChange: (date: string) => void
  id?: string
}

function getTodayParts() {
  const [year, month, day] = getMinAppointmentDate().split("-").map(Number)
  return { year, month, day }
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function monthIndex(year: number, month: number) {
  return year * 12 + (month - 1)
}

export function AppointmentDatePicker({ value, onChange, id }: AppointmentDatePickerProps) {
  const today = useMemo(() => getTodayParts(), [])
  const [viewYear, setViewYear] = useState(today.year)
  const [viewMonth, setViewMonth] = useState(today.month)

  const minIndex = monthIndex(today.year, today.month)
  const viewIndex = monthIndex(viewYear, viewMonth)
  const canGoPrev = viewIndex > minIndex

  const cells = useMemo(() => {
    const minDate = getMinAppointmentDate()
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
    const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay()
    const result: ({ day: number; date: string } | null)[] = []

    for (let i = 0; i < firstDow; i++) result.push(null)

    for (let day = 1; day <= daysInMonth; day++) {
      const date = toDateString(viewYear, viewMonth, day)
      if (date < minDate) {
        result.push(null)
      } else {
        result.push({ day, date })
      }
    }

    while (result.length % 7 !== 0) result.push(null)
    return result
  }, [viewYear, viewMonth])

  function goPrevMonth() {
    if (!canGoPrev) return
    if (viewMonth === 1) {
      setViewYear((y) => y - 1)
      setViewMonth(12)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function goNextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1)
      setViewMonth(1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  return (
    <div id={id} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={goPrevMonth}
          disabled={!canGoPrev}
          aria-label="前の月"
          className="size-9"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <p className="text-base font-bold text-foreground">
          {viewYear}年{viewMonth}月
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={goNextMonth}
          aria-label="次の月"
          className="size-9"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="アポ日付">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-1 text-center text-xs font-semibold text-muted-foreground"
            role="columnheader"
          >
            {w}
          </div>
        ))}

        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="aspect-square" aria-hidden />
          }

          const selected = value === cell.date
          const noSlots = getSlotCategory(cell.date) === "none"
          const holiday = isHoliday(cell.date)

          return (
            <button
              key={cell.date}
              type="button"
              role="gridcell"
              aria-selected={selected}
              aria-label={`${cell.date}${holiday ? " 祝日" : ""}${noSlots ? " 予約不可" : ""}`}
              onClick={() => onChange(cell.date)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg border-2 text-sm font-semibold transition-colors active:scale-[0.97]",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : noSlots
                    ? "border-border/60 bg-muted/40 text-muted-foreground"
                    : "border-border bg-card text-foreground",
              )}
            >
              {cell.day}
              {holiday && !selected && (
                <span className="absolute bottom-1 size-1 rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
