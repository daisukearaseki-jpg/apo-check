import { NextResponse } from "next/server"

import { getAvailableSlotsForDate, getBookableDatesInMonth } from "@/lib/availability"
import { isSheetsConfigured } from "@/lib/google-sheets"

function parseMonthParam(month: string | null): { year: number; month: number } | null {
  if (!month) return null
  const match = month.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const monthNum = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return null
  }

  return { year, month: monthNum }
}

function parseDateParam(date: string | null): string | null {
  if (!date) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return date
}

export async function GET(req: Request) {
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      {
        error: "GAS の設定が完了していません（GAS_WEB_APP_URL / GAS_API_SECRET）",
      },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(req.url)
  const monthParam = searchParams.get("month")
  const dateParam = searchParams.get("date")

  try {
    if (monthParam) {
      const parsed = parseMonthParam(monthParam)
      if (!parsed) {
        return NextResponse.json({ error: "month は YYYY-MM 形式で指定してください" }, { status: 400 })
      }

      const bookableDates = await getBookableDatesInMonth(parsed.year, parsed.month)
      return NextResponse.json({ bookableDates })
    }

    if (dateParam) {
      const date = parseDateParam(dateParam)
      if (!date) {
        return NextResponse.json({ error: "date は YYYY-MM-DD 形式で指定してください" }, { status: 400 })
      }

      const slots = await getAvailableSlotsForDate(date)
      return NextResponse.json({
        slots,
        bookable: slots.length > 0,
      })
    }

    return NextResponse.json(
      { error: "date または month クエリパラメータが必要です" },
      { status: 400 },
    )
  } catch (error) {
    console.error("Availability API error:", error)
    const message = error instanceof Error ? error.message : "空き枠の取得に失敗しました"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
