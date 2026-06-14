"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, ClipboardCheck, MapPin, RotateCcw } from "lucide-react"
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
  getTimeSlots,
  getWeekdayLabel,
  getSlotCategory,
  isHoliday,
  validateStep,
  formatPhone,
} from "@/lib/appointment"
import { encodePlusCode, normalizePlusCode, PLUS_CODE_LABEL } from "@/lib/plus-code"
import { Stepper } from "./stepper"
import { Field } from "./field"
import { YesNoToggle } from "./yes-no-toggle"
import { ChipSelect } from "./chip-select"
import { ConfirmStep } from "./confirm-step"
import type { PhotoAttachment } from "@/lib/photo"

export function AppointmentWizard() {
  const [form, setForm] = useState<AppointmentForm>(emptyForm)
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<FieldError[]>([])
  const [completed, setCompleted] = useState<StepId[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [photo, setPhoto] = useState<PhotoAttachment | null>(null)
  const [locating, setLocating] = useState(false)

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

  const timeSlots = useMemo(() => getTimeSlots(form.date), [form.date])

  // 日付変更時: 曜日を自動判定し、区分が変わるため時間選択をリセット
  function handleDateChange(date: string) {
    const weekday = getWeekdayLabel(date)
    const slots = getTimeSlots(date)
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
        body: JSON.stringify(photo ? { ...form, photo } : form),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error("送信に失敗しました", {
          description: typeof body.error === "string" ? body.error : "通信エラーが発生しました",
        })
        return
      }

      const description = `${form.lastName} ${form.firstName} 様 / ${form.date}(${form.weekday}) ${form.time}`
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

  function handleGetPlusCode() {
    if (!navigator.geolocation) {
      toast.error("この端末では位置情報を取得できません")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("plusCode", encodePlusCode(pos.coords.latitude, pos.coords.longitude))
        setLocating(false)
        toast.success("プラスコードを取得しました")
      },
      () => {
        setLocating(false)
        toast.error("位置情報の取得に失敗しました", {
          description: "ブラウザの位置情報を許可してください",
        })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  function handleReset() {
    setForm(emptyForm)
    setPhoto(null)
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
            <Field label="アポ日付" htmlFor="date" error={errorMap.date}>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-12 text-base"
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
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-6 text-center text-sm font-medium text-destructive">
                  火・水は予約枠がありません。
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
          </Card>
        )}

        {current.id === "customer" && (
          <Card className="flex flex-col gap-5 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="姓" htmlFor="lastName" error={errorMap.lastName}>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  placeholder="山田"
                  className="h-12 text-base"
                />
              </Field>
              <Field label="名" htmlFor="firstName" error={errorMap.firstName}>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  placeholder="太郎"
                  className="h-12 text-base"
                />
              </Field>
            </div>
            <Field label="電話番号" htmlFor="phone" error={errorMap.phone}>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => update("phone", formatPhone(e.target.value))}
                placeholder="09012345678"
                className="h-12 text-base"
              />
            </Field>
            <Field label="住所" htmlFor="address" error={errorMap.address}>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="渋谷区神宮前1-2-3 ○○マンション101"
                rows={2}
                className="text-base"
              />
            </Field>
            <Field label={PLUS_CODE_LABEL} htmlFor="plusCode">
              <div className="flex flex-col gap-2">
                <Input
                  id="plusCode"
                  value={form.plusCode}
                  onChange={(e) => update("plusCode", normalizePlusCode(e.target.value))}
                  placeholder="例: 8Q7X+4R"
                  className="h-12 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetPlusCode}
                  disabled={locating}
                  className="h-11 text-base"
                >
                  <MapPin className="size-4" />
                  {locating ? "取得中..." : "現在地から取得"}
                </Button>
              </div>
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
              <Field label="情報公開に承諾いただけますか?" error={errorMap.consentDisclosure}>
                <YesNoToggle
                  name="情報公開承諾"
                  value={form.consentDisclosure}
                  onChange={(v) => update("consentDisclosure", v)}
                  warnOnNo
                />
              </Field>
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <Field label="電気代は月8,000円以上ですか?" error={errorMap.electricityOver8000}>
                <YesNoToggle
                  name="電気代確認"
                  value={form.electricityOver8000}
                  onChange={(v) => update("electricityOver8000", v)}
                  warnOnNo
                />
              </Field>
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <Field label="ご家族に75歳以下の方はいらっしゃいますか?" error={errorMap.ageUnder75}>
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
            <Card className="flex flex-col gap-3 p-5">
              <Field label="建物外観の撮影許可" error={errorMap.exteriorPhotoPermission}>
                <YesNoToggle
                  name="建物外観の撮影許可"
                  value={form.exteriorPhotoPermission}
                  onChange={(v) => update("exteriorPhotoPermission", v)}
                />
              </Field>
            </Card>
          </div>
        )}

        {current.id === "confirm" && (
          <ConfirmStep
            form={form}
            photo={photo}
            onChangePhoto={setPhoto}
            errorMap={errorMap}
            onChangeHasQuestions={(v) => update("hasQuestions", v)}
            onChangeQuestionDetail={(v) => update("questionDetail", v)}
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
