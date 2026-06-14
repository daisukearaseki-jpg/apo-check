import * as holidayJp from "@holiday-jp/holiday_jp"

export type YesNo = "yes" | "no" | ""

export interface AppointmentForm {
  // ステップ1: アポ日時
  date: string
  weekday: string
  time: string
  // ステップ2: お客様情報
  lastName: string
  firstName: string
  phone: string
  address: string
  plusCode: string
  // ステップ3: ヒアリング内容
  isBuildingOwner: YesNo
  consentDisclosure: YesNo
  electricityOver8000: YesNo
  ageUnder75: YesNo
  solarConsidered: YesNo
  solarConsideredTime: string
  solarConsideredReason: string
  elevationDrawing: string
  exteriorPhotoPermission: YesNo
  // ステップ4: 質問事項
  hasQuestions: YesNo
  questionDetail: string
}

export const DEFAULT_ADDRESS = "東京都"

export const emptyForm: AppointmentForm = {
  date: "",
  weekday: "",
  time: "",
  lastName: "",
  firstName: "",
  phone: "",
  address: DEFAULT_ADDRESS,
  plusCode: "",
  isBuildingOwner: "",
  consentDisclosure: "",
  electricityOver8000: "",
  ageUnder75: "",
  solarConsidered: "",
  solarConsideredTime: "",
  solarConsideredReason: "",
  elevationDrawing: "",
  exteriorPhotoPermission: "",
  hasQuestions: "",
  questionDetail: "",
}

export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const

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

// 日付に応じた予約可能な時間枠を返す
export function getTimeSlots(date: string): string[] {
  return SLOTS_BY_CATEGORY[getSlotCategory(date)]
}

export type StepId = "schedule" | "customer" | "qualify" | "confirm"

export interface StepMeta {
  id: StepId
  title: string
  short: string
}

export const STEPS: StepMeta[] = [
  { id: "schedule", title: "アポ日時", short: "アポ日時" },
  { id: "customer", title: "お客様情報", short: "お客様情報" },
  { id: "qualify", title: "詳細確認", short: "詳細確認" },
  { id: "confirm", title: "最終確認", short: "最終確認" },
]

export interface FieldError {
  field: keyof AppointmentForm
  message: string
}

// 半角数字のみ抽出
export function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "")
}

// 電話番号の簡易フォーマット (ハイフンは保持しつつ数字以外を除去)
export function formatPhone(value: string): string {
  return value.replace(/[^\d-]/g, "")
}

export function isValidPhone(value: string): boolean {
  const d = digitsOnly(value)
  return d.length >= 10 && d.length <= 11
}

// 適格項目: NGとなる回答 (商談を進められない可能性が高い回答)
export const NG_ANSWERS: Partial<Record<keyof AppointmentForm, YesNo>> = {
  isBuildingOwner: "no",
  consentDisclosure: "no",
  electricityOver8000: "no",
  ageUnder75: "no",
}

export function validateStep(step: StepId, form: AppointmentForm): FieldError[] {
  const errors: FieldError[] = []
  const req = (field: keyof AppointmentForm, message: string) => {
    if (!String(form[field]).trim()) errors.push({ field, message })
  }

  if (step === "schedule") {
    req("date", "日付を選択してください")
    if (form.date && getSlotCategory(form.date) === "none") {
      errors.push({ field: "date", message: "火・水は予約枠がありません。別の日を選択してください" })
    }
    req("time", "時間を選択してください")
  }

  if (step === "customer") {
    req("lastName", "姓を入力してください")
    req("firstName", "名を入力してください")
    if (!form.phone.trim()) {
      errors.push({ field: "phone", message: "電話番号を入力してください" })
    } else if (!isValidPhone(form.phone)) {
      errors.push({ field: "phone", message: "電話番号は10〜11桁で入力してください" })
    }
    req("address", "住所を入力してください")
  }

  if (step === "qualify") {
    req("isBuildingOwner", "建物オーナーかどうかを選択してください")
    req("consentDisclosure", "情報公開の承諾を選択してください")
    req("electricityOver8000", "電気代の確認を選択してください")
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
    req("exteriorPhotoPermission", "建物外観の撮影許可を選択してください")
  }

  if (step === "confirm") {
    req("hasQuestions", "質問事項の有無を選択してください")
    if (form.hasQuestions === "yes" && !form.questionDetail.trim()) {
      errors.push({ field: "questionDetail", message: "質問内容を入力してください" })
    }
  }

  return errors
}
