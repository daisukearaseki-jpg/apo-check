import * as holidayJp from "@holiday-jp/holiday_jp"

export type YesNo = "yes" | "no" | ""

export type YesNoUnknown = "yes" | "no" | "unknown" | ""

export type YesUnknown = "yes" | "unknown" | ""

export interface AppointmentForm {
  // ステップ1: アポ日時
  lastName: string
  date: string
  weekday: string
  time: string
  // ステップ2: ヒアリング内容
  isBuildingOwner: YesNo
  consentDisclosure: YesNo
  electricityOver8000: YesUnknown
  electricityAmount: string
  ageUnder75: YesNo
  solarConsidered: YesNo
  solarConsideredTime: string
  solarConsideredReason: string
  elevationDrawing: string
  // ステップ3: 質問事項
  hasQuestions: YesNo
  questionDetail: string
}

export const emptyForm: AppointmentForm = {
  lastName: "",
  date: "",
  weekday: "",
  time: "",
  isBuildingOwner: "",
  consentDisclosure: "",
  electricityOver8000: "",
  electricityAmount: "",
  ageUnder75: "",
  solarConsidered: "",
  solarConsideredTime: "",
  solarConsideredReason: "",
  elevationDrawing: "",
  hasQuestions: "",
  questionDetail: "",
}

export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const

const JST = "Asia/Tokyo"

// 日本時間の本日（YYYY-MM-DD）
export function getMinAppointmentDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function isPastDate(date: string, now = new Date()): boolean {
  if (!date) return false
  return date < getMinAppointmentDate(now)
}

// 日本時間の現在時刻（HH:MM）
export function getCurrentTimeJst(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now)
}

export function isPastDateTime(date: string, time: string, now = new Date()): boolean {
  if (!date || !time) return false
  if (isPastDate(date, now)) return true
  if (date > getMinAppointmentDate(now)) return false
  return time <= getCurrentTimeJst(now)
}

// 日付(YYYY-MM-DD)から曜日ラベルを取得
export function getWeekdayLabel(date: string): string {
  if (!date) return ""
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ""
  return WEEKDAYS[d.getDay()]
}

// 日付が祝日かどうか
export function isHoliday(date: string): boolean {
  if (!date) return false
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return false
  return holidayJp.isHoliday(d)
}

// 予約枠の区分
export type SlotCategory = "weekday" | "thursday" | "weekend" | "none"

// 区分ごとの予約枠
const SLOTS_BY_CATEGORY: Record<SlotCategory, string[]> = {
  weekday: ["11:00", "13:00", "14:00", "16:00"], // 月・金
  thursday: ["11:00"], // 木
  weekend: ["14:00", "16:30"], // 土日祝
  none: [], // 火・水(予約枠なし)
}

// 日付から予約枠の区分を判定
export function getSlotCategory(date: string): SlotCategory {
  if (!date) return "none"
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return "none"
  const day = d.getDay() // 0:日 1:月 ... 6:土
  if (day === 0 || day === 6 || holidayJp.isHoliday(d)) return "weekend"
  if (day === 4) return "thursday"
  if (day === 1 || day === 5) return "weekday"
  return "none" // 火・水
}

// 日付に応じた時間枠（曜日区分のみ）
function getBaseTimeSlots(date: string): string[] {
  return SLOTS_BY_CATEGORY[getSlotCategory(date)]
}

// 現在日時以前を除いた、選択可能な時間枠
export function getAvailableTimeSlots(date: string, now = new Date()): string[] {
  if (!date || isPastDate(date, now) || getSlotCategory(date) === "none") return []
  const slots = getBaseTimeSlots(date)
  if (date > getMinAppointmentDate(now)) return slots
  const currentTime = getCurrentTimeJst(now)
  return slots.filter((slot) => slot > currentTime)
}

export function isBookableDate(date: string, now = new Date()): boolean {
  return getAvailableTimeSlots(date, now).length > 0
}

/** @deprecated getAvailableTimeSlots を使用 */
export function getTimeSlots(date: string): string[] {
  return getBaseTimeSlots(date)
}

export type StepId = "schedule" | "qualify" | "confirm"

export interface StepMeta {
  id: StepId
  title: string
  short: string
}

export const STEPS: StepMeta[] = [
  { id: "schedule", title: "アポ日時", short: "アポ日時" },
  { id: "qualify", title: "詳細確認", short: "詳細確認" },
  { id: "confirm", title: "最終確認", short: "最終確認" },
]

export interface FieldError {
  field: keyof AppointmentForm
  message: string
}

export function formatElectricityAmount(value: string): string {
  return value.replace(/[^\d]/g, "")
}

// 適格項目: NGとなる回答 (商談を進められない可能性が高い回答)
export const NG_ANSWERS: Partial<Record<keyof AppointmentForm, YesNo | YesUnknown>> = {
  isBuildingOwner: "no",
  consentDisclosure: "no",
  ageUnder75: "no",
}

export function validateStep(step: StepId, form: AppointmentForm): FieldError[] {
  const errors: FieldError[] = []
  const req = (field: keyof AppointmentForm, message: string) => {
    if (!String(form[field]).trim()) errors.push({ field, message })
  }

  if (step === "schedule") {
    req("lastName", "お客様名（姓）を入力してください")
    req("date", "日付を選択してください")
    if (form.date && isPastDate(form.date)) {
      errors.push({ field: "date", message: "本日以降の日付を選択してください" })
    }
    if (form.date && getSlotCategory(form.date) === "none") {
      errors.push({ field: "date", message: "火・水は予約枠がありません。別の日を選択してください" })
    }
    if (form.date && !isBookableDate(form.date)) {
      errors.push({ field: "date", message: "この日付に選択可能な時間がありません。別の日を選択してください" })
    }
    req("time", "時間を選択してください")
    if (form.date && form.time && !getAvailableTimeSlots(form.date).includes(form.time)) {
      errors.push({ field: "time", message: "過去の時間は選択できません" })
    }
  }

  if (step === "qualify") {
    req("isBuildingOwner", "建物オーナーかどうかを選択してください")
    req("consentDisclosure", "設置写真と発電データの公開について選択してください")
    req("electricityOver8000", "電気代の確認を選択してください")
    if (form.electricityOver8000 === "yes" && !form.electricityAmount.trim()) {
      errors.push({ field: "electricityAmount", message: "月額の電気代を入力してください" })
    }
    req("ageUnder75", "年齢の確認を選択してください")
    req("solarConsidered", "ソーラーシステムの検討有無を選択してください")
    if (form.solarConsidered === "yes") {
      if (!form.solarConsideredTime.trim()) {
        errors.push({ field: "solarConsideredTime", message: "検討した時期を入力してください" })
      }
      if (!form.solarConsideredReason.trim()) {
        errors.push({ field: "solarConsideredReason", message: "検討理由を入力してください" })
      }
    }
    req("elevationDrawing", "立面図の有無を選択してください")
    req("hasQuestions", "聞きたい事・ご心配な事の有無を選択してください")
    if (form.hasQuestions === "yes" && !form.questionDetail.trim()) {
      errors.push({ field: "questionDetail", message: "内容を入力してください" })
    }
  }

  return errors
}
