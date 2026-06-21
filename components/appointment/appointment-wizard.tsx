"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, ClipboardCheck, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"

import {
  type AppointmentForm,
  type FieldError,
  type StepId,
  emptyForm,
  STEPS,
  getAvailableTimeSlots,
  getWeekdayLabel,
  getSlotCategory,
  isHoliday,
  validateStep,
  formatElectricityAmount,
} from "@/lib/appointment"
import { Stepper } from "./stepper"
import { Field } from "./field"
import { YesNoToggle } from "./yes-no-toggle"
import { YesUnknownToggle } from "./yes-unknown-toggle"
import { ChipSelect } from "./chip-select"
import { ConfirmStep } from "./confirm-step"
import { AppointmentDatePicker } from "./date-picker"
import { MemberCombobox } from "./member-combobox"

export function AppointmentWizard() {
  const [form, setForm] = useState<AppointmentForm>(emptyForm)
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<FieldError[]>([])
  const [completed, setCompleted] = useState<StepId[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const current = STEPS[stepIndex]
  const errorMap = useMemo(() => {
    const m: Partial<Record<keyof AppointmentForm, string>> = {}
    for (const e of errors) m[e.field] = e.message
    return m
  }, [errors])

  function update<K extends keyof AppointmentForm>(key: K, value: AppointmentForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errorMap[key]) setErrors((prev) => prev.filter((e) => e.field !== key))
  }

  useEffect(() => {
    if (current.id !== "schedule") return
    const timer = setInterval(() => setNowTick(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [current.id])

  const now = useMemo(() => new Date(nowTick), [nowTick])
  const timeSlots = useMemo(
    () => getAvailableTimeSlots(form.date, now),
    [form.date, now],
  )

  // 時刻経過で選択中の時間が無効になったら解除
  useEffect(() => {
    if (!form.date || !form.time) return
    if (!getAvailableTimeSlots(form.date, now).includes(form.time)) {
      setForm((prev) => ({ ...prev, time: "" }))
    }
  }, [form.date, form.time, now])

  // 日付変更時: 曜日を自動判定し、区分が変わるため時間選択をリセット
  function handleDateChange(date: string) {
    const weekday = getWeekdayLabel(date)
    const slots = getAvailableTimeSlots(date, now)
    setForm((prev) => ({
      ...prev,
      date,
      weekday,
      // 新しい日付の枠に含まれない時間は解除
      time: slots.includes(prev.time) ? prev.time : "",
    }))
    setErrors((prev) => prev.filter((e) => e.field !== "date" && e.field !== "time"))
    if (date && getSlotCategory(date) === "none") {
      toast.error("火・水は予約枠がありません", {
        description: "月金・木・土日祝のいずれかを選択してください",
      })
    }
  }

  function goNext() {
    const found = validateStep(current.id, form)
    if (found.length > 0) {
      setErrors(found)
      toast.error("未入力・誤りがあります", {
        description: `${found.length}件の項目を確認してください`,
      })
      return
    }
    setErrors([])
    setCompleted((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]))
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function goBack() {
    setErrors([])
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  async function handleSubmit() {
    const found = validateStep("confirm", form)
    if (found.length > 0) {
      setErrors(found)
      toast.error("未入力の項目があります")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error("送信に失敗しました", {
          description: typeof body.error === "string" ? body.error : "通信エラーが発生しました",
        })
        return
      }

      const description = `${form.lastName} 様 / ${form.date}(${form.weekday}) ${form.time}`
      toast.success("アポ情報を送信しました", { description })
      handleReset()
    } catch {
      toast.error("送信に失敗しました", {
        description: "ネットワークエラーが発生しました",
      })
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setForm(emptyForm)
    setErrors([])
    setCompleted([])
    setStepIndex(0)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <ClipboardCheck className="size-5 text-primary" />
          <h1 className="text-base font-bold text-foreground">アポ取得アプリ</h1>
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-32 pt-5">
        <Stepper current={current.id} completed={completed} />

        <h2 className="mb-5 mt-6 text-xl font-bold tracking-tight text-foreground text-balance">
          {current.title}
        </h2>

        {current.id === "schedule" && (
          <Card className="flex flex-col gap-5 p-5">
            <Field label="お客様名" htmlFor="lastName" error={errorMap.lastName}>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="お客様名"
                className="h-12 text-base"
              />
            </Field>

            <Field label="アポ日付" htmlFor="date" error={errorMap.date}>
              <AppointmentDatePicker
                id="date"
                value={form.date}
                onChange={handleDateChange}
              />
              {form.date && form.weekday && (
                <p className="mt-2 text-sm font-medium text-foreground">
                  {form.date}（{form.weekday}）
                  {isHoliday(form.date) && (
                    <span className="ml-1 rounded bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-foreground">
                      祝日
                    </span>
                  )}
                </p>
              )}
            </Field>

            <Field label="時間" error={errorMap.time}>
              {!form.date ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  先に日付を選択してください
                </p>
              ) : timeSlots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  選択可能な時間がありません。
                  <br />
                  別の日付を選択してください。
                </p>
              ) : (
                <ChipSelect
                  ariaLabel="時間"
                  options={timeSlots}
                  value={form.time}
                  onChange={(v) => update("time", v)}
                  columns={2}
                />
              )}
            </Field>

            <Field label="アポ取得者" htmlFor="apoGetter" error={errorMap.apoGetter}>
              <MemberCombobox
                id="apoGetter"
                value={form.apoGetter}
                onChange={(v) => update("apoGetter", v)}
              />
            </Field>

            <Field label="ペア" htmlFor="pair" error={errorMap.pair}>
              <MemberCombobox
                id="pair"
                value={form.pair}
                onChange={(v) => update("pair", v)}
              />
            </Field>

            <Field label="ボイレコ番号" htmlFor="voirecoNumber" error={errorMap.voirecoNumber}>
              <Input
                id="voirecoNumber"
                value={form.voirecoNumber}
                onChange={(e) => update("voirecoNumber", e.target.value)}
                placeholder="番号を入力"
                className="h-12 text-base"
              />
            </Field>

            <Field label="地図番号" htmlFor="mapNumber" error={errorMap.mapNumber}>
              <Input
                id="mapNumber"
                value={form.mapNumber}
                onChange={(e) => update("mapNumber", e.target.value)}
                placeholder="番号を入力"
                className="h-12 text-base"
              />
            </Field>
          </Card>
        )}

        {current.id === "qualify" && (
          <div className="flex flex-col gap-4">
            <Card className="flex flex-col gap-3 p-5">
              <Field label="建物オーナーですか?" error={errorMap.isBuildingOwner}>
                <YesNoToggle
                  name="建物オーナー確認"
                  value={form.isBuildingOwner}
                  onChange={(v) => update("isBuildingOwner", v)}
                  warnOnNo
                />
              </Field>
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <Field label="設置写真と発電データの公開に承諾いただけますか?" error={errorMap.consentDisclosure}>
                <YesNoToggle
                  name="設置写真と発電データの公開承諾"
                  value={form.consentDisclosure}
                  onChange={(v) => update("consentDisclosure", v)}
                  warnOnNo
                />
              </Field>
            </Card>
            <Card className="flex flex-col gap-4 p-5">
              <Field label="電気代は月8,000円以上ですか?" error={errorMap.electricityOver8000}>
                <YesUnknownToggle
                  name="電気代確認"
                  value={form.electricityOver8000}
                  onChange={(v) => {
                    update("electricityOver8000", v)
                    if (v !== "yes") update("electricityAmount", "")
                  }}
                />
              </Field>
              {form.electricityOver8000 === "yes" && (
                <div className="flex flex-col gap-4 border-t border-border pt-4">
                  <Field label="月額の電気代（円）" htmlFor="electricityAmount" error={errorMap.electricityAmount}>
                    <Input
                      id="electricityAmount"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.electricityAmount}
                      onChange={(e) => update("electricityAmount", formatElectricityAmount(e.target.value))}
                      placeholder="12000"
                      className="h-12 text-base"
                    />
                  </Field>
                </div>
              )}
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <Field label="ご同居のご家族に75歳以下の方はいらっしゃいますか?" error={errorMap.ageUnder75}>
                <YesNoToggle
                  name="年齢確認"
                  value={form.ageUnder75}
                  onChange={(v) => update("ageUnder75", v)}
                  warnOnNo
                />
              </Field>
            </Card>
            <Card className="flex flex-col gap-4 p-5">
              <Field label="ソーラーシステムを検討したことはありますか?" error={errorMap.solarConsidered}>
                <YesNoToggle
                  name="ソーラー検討有無"
                  value={form.solarConsidered}
                  onChange={(v) => update("solarConsidered", v)}
                  yesLabel="あり"
                  noLabel="なし"
                />
              </Field>
              {form.solarConsidered === "yes" && (
                <div className="flex flex-col gap-4 border-t border-border pt-4">
                  <Field label="検討した時期" htmlFor="solarConsideredTime" error={errorMap.solarConsideredTime}>
                    <Input
                      id="solarConsideredTime"
                      value={form.solarConsideredTime}
                      onChange={(e) => update("solarConsideredTime", e.target.value)}
                      placeholder="2024年春頃 / 半年前 など"
                      className="h-12 text-base"
                    />
                  </Field>
                  <Field label="検討理由" htmlFor="solarConsideredReason" error={errorMap.solarConsideredReason}>
                    <Textarea
                      id="solarConsideredReason"
                      value={form.solarConsideredReason}
                      onChange={(e) => update("solarConsideredReason", e.target.value)}
                      placeholder="電気代の高騰が気になった など"
                      rows={3}
                      className="text-base"
                    />
                  </Field>
                </div>
              )}
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <Field label="立面図の有無" error={errorMap.elevationDrawing}>
                <ChipSelect
                  ariaLabel="立面図の有無"
                  options={["あり", "不明"]}
                  value={form.elevationDrawing}
                  onChange={(v) => update("elevationDrawing", v)}
                  columns={2}
                />
              </Field>
            </Card>
            <Card className="flex flex-col gap-4 p-5">
              <Field
                label="無料シュミレーションを作るにあたり、先に聞いておきたい事や、ご心配な事はありますか?"
                error={errorMap.hasQuestions}
              >
                <YesNoToggle
                  name="聞きたい事・ご心配な事"
                  value={form.hasQuestions}
                  onChange={(v) => {
                    update("hasQuestions", v)
                    if (v !== "yes") update("questionDetail", "")
                  }}
                  yesLabel="あり"
                  noLabel="なし"
                />
              </Field>
              {form.hasQuestions === "yes" && (
                <Field label="内容" htmlFor="questionDetail" error={errorMap.questionDetail}>
                  <Textarea
                    id="questionDetail"
                    value={form.questionDetail}
                    onChange={(e) => update("questionDetail", e.target.value)}
                    placeholder="お客様から聞いた内容を記入"
                    rows={3}
                    className="text-base"
                  />
                </Field>
              )}
            </Card>
          </div>
        )}

        {current.id === "confirm" && (
          <ConfirmStep
            form={form}
            onJump={(i) => {
              setErrors([])
              setStepIndex(i)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        )}
      </main>

      {/* 固定フッターのナビゲーション */}
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {stepIndex > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className="h-12 flex-1 text-base"
            >
              <ChevronLeft className="size-5" />
              戻る
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="h-12 flex-1 text-base"
            >
              <RotateCcw className="size-4" />
              クリア
            </Button>
          )}

          {stepIndex < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext} className="h-12 flex-[2] text-base font-bold">
              次へ
              <ChevronRight className="size-5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-12 flex-[2] text-base font-bold"
            >
              <ClipboardCheck className="size-5" />
              {submitting ? "送信中..." : "この内容で登録"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
