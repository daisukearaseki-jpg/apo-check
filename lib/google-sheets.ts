import { type AppointmentForm, type YesNo, type YesUnknown, formatDateWithWeekday } from "@/lib/appointment"
import { SHEET_COLUMN_COUNT, SHEET_HEADERS } from "@/lib/sheets-config"

export interface OccupiedSlot {
  date: string
  time: string
}

export class SlotConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SlotConflictError"
  }
}

const JST = "Asia/Tokyo"

export function isSheetsConfigured(): boolean {
  return Boolean(process.env.GAS_WEB_APP_URL?.trim() && process.env.GAS_API_SECRET?.trim())
}

function getGasUrl(): string {
  const url = process.env.GAS_WEB_APP_URL?.trim()
  if (!url) throw new Error("GAS_WEB_APP_URL is not set")
  return url
}

function getGasSecret(): string {
  const secret = process.env.GAS_API_SECRET?.trim()
  if (!secret) throw new Error("GAS_API_SECRET is not set")
  return secret
}

interface GasResponse {
  ok?: boolean
  slots?: OccupiedSlot[]
  error?: string
  code?: number
}

async function parseGasResponse(res: Response): Promise<GasResponse> {
  const text = await res.text()
  let body: GasResponse
  try {
    body = JSON.parse(text) as GasResponse
  } catch {
    throw new Error(
      `スプレッドシート連携の応答が不正です: ${text.slice(0, 120)}`,
    )
  }
  if (body.error) {
    if (body.code === 409) {
      throw new SlotConflictError(body.error)
    }
    throw new Error(body.error)
  }
  if (!res.ok) {
    throw new Error("スプレッドシート連携に失敗しました")
  }
  return body
}

async function callGasGet(action: string): Promise<GasResponse> {
  const url = new URL(getGasUrl())
  url.searchParams.set("action", action)
  url.searchParams.set("token", getGasSecret())

  const res = await fetch(url.toString(), { cache: "no-store" })
  return parseGasResponse(res)
}

function yn(value: YesNo): string {
  if (value === "yes") return "はい"
  if (value === "no") return "いいえ"
  return ""
}

function yu(value: YesUnknown): string {
  if (value === "yes") return "はい"
  if (value === "unknown") return "不明"
  return ""
}

function solarLabel(value: YesNo): string {
  if (value === "yes") return "あり"
  if (value === "no") return "なし"
  return ""
}

export function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number" && Number.isFinite(value)) {
    const utcMs = Math.round((value - 25569) * 86400 * 1000)
    const d = new Date(utcMs)
    if (Number.isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: JST,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d)
  }

  const raw = String(value).trim()
  if (!raw) return null

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`
  }

  const slash = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (slash) {
    return `${slash[1]}-${slash[2].padStart(2, "0")}-${slash[3].padStart(2, "0")}`
  }

  const parsed = new Date(`${raw}T00:00:00`)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, "0")
    const d = String(parsed.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  return null
}

export function normalizeTime(value: unknown): string | null {
  if (value === null || value === undefined) return null

  if (typeof value === "number" && Number.isFinite(value)) {
    const totalMinutes = Math.round(value * 24 * 60)
    const hours = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }

  const raw = String(value).trim()
  if (!raw) return null

  const match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  return `${match[1].padStart(2, "0")}:${match[2]}`
}

export async function readOccupiedSlots(): Promise<OccupiedSlot[]> {
  const body = await callGasGet("occupied")
  return body.slots ?? []
}

export function isSlotOccupied(
  occupied: OccupiedSlot[],
  date: string,
  time: string,
): boolean {
  const normalizedTime = normalizeTime(time)
  if (!normalizedTime) return false
  return occupied.some((slot) => slot.date === date && slot.time === normalizedTime)
}

function formatRegisteredAt(date: Date): string {
  return date.toLocaleString("ja-JP", { timeZone: JST })
}

export function formToRow(form: AppointmentForm, registeredAt: Date): string[] {
  return [
    formatRegisteredAt(registeredAt),
    formatDateWithWeekday(form.date),
    form.time,
    form.lastName.trim(),
    form.apoGetter,
    form.pair,
    form.voirecoNumber,
    form.mapNumber,
    yn(form.isBuildingOwner),
    yn(form.consentDisclosure),
    yu(form.electricityOver8000),
    form.electricityAmount,
    yn(form.ageUnder75),
    solarLabel(form.solarConsidered),
    form.solarConsideredTime,
    form.solarConsideredReason,
    form.elevationDrawing,
    solarLabel(form.hasQuestions),
    form.questionDetail,
    "",
  ]
}

export async function appendAppointment(
  form: AppointmentForm,
  registeredAt: Date,
): Promise<void> {
  const row = formToRow(form, registeredAt)
  if (row.length !== SHEET_COLUMN_COUNT) {
    throw new Error("シート列定義の件数が一致しません")
  }

  const url = new URL(getGasUrl())
  url.searchParams.set("action", "append")
  url.searchParams.set("token", getGasSecret())
  url.searchParams.set(
    "payload",
    JSON.stringify({
      date: form.date,
      time: form.time,
      row,
    }),
  )

  const res = await fetch(url.toString(), { cache: "no-store" })
  const parsed = await parseGasResponse(res)
  if (!parsed.ok) {
    throw new Error("スプレッドシートへの登録に失敗しました")
  }
}

export function assertSheetsReady(): void {
  if (!isSheetsConfigured()) {
    throw new Error("GAS の設定が完了していません（GAS_WEB_APP_URL / GAS_API_SECRET）")
  }

  if (SHEET_HEADERS.length !== SHEET_COLUMN_COUNT) {
    throw new Error("シート列定義の件数が一致しません")
  }
}
