"use client"

import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Field } from "./field"
import { YesNoToggle } from "./yes-no-toggle"
import { Textarea } from "@/components/ui/textarea"
import {
  type AppointmentForm,
  type YesNo,
  NG_ANSWERS,
} from "@/lib/appointment"

interface ConfirmStepProps {
  form: AppointmentForm
  errorMap: Partial<Record<keyof AppointmentForm, string>>
  onChangeHasQuestions: (v: YesNo) => void
  onChangeQuestionDetail: (v: string) => void
  onJump: (stepIndex: number) => void
}

function yn(v: YesNo): string {
  if (v === "yes") return "はい"
  if (v === "no") return "いいえ"
  return "未入力"
}

export function ConfirmStep({
  form,
  errorMap,
  onChangeHasQuestions,
  onChangeQuestionDetail,
  onJump,
}: ConfirmStepProps) {
  const qualifyItems: { label: string; value: YesNo; key: keyof AppointmentForm }[] = [
    { label: "建物オーナー", value: form.isBuildingOwner, key: "isBuildingOwner" },
    { label: "情報公開の承諾", value: form.consentDisclosure, key: "consentDisclosure" },
    { label: "電気代 8,000円以上", value: form.electricityOver8000, key: "electricityOver8000" },
    { label: "75歳以下", value: form.ageUnder75, key: "ageUnder75" },
  ]

  const ngList = qualifyItems.filter((it) => NG_ANSWERS[it.key] === it.value)

  return (
    <div className="flex flex-col gap-4">
      {/* 適格チェックの警告 */}
      {ngList.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border-2 border-destructive bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-bold text-destructive">要確認: 条件に合わない回答があります</p>
            <p className="mt-0.5 text-foreground">
              {ngList.map((it) => it.label).join(" / ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              そのまま登録できますが、上長への確認を推奨します。
            </p>
          </div>
        </div>
      )}

      {/* 日時 */}
      <SummaryBlock title="アポ日時" onEdit={() => onJump(0)}>
        <Row label="日付" value={form.date ? `${form.date}（${form.weekday}）` : "未入力"} />
        <Row label="時間" value={form.time || "未入力"} />
      </SummaryBlock>

      {/* お客様情報 */}
      <SummaryBlock title="お客様情報" onEdit={() => onJump(1)}>
        <Row label="氏名" value={`${form.lastName} ${form.firstName}`.trim() || "未入力"} />
        <Row label="電話" value={form.phone || "未入力"} />
        <Row label="住所" value={form.address || "未入力"} />
        <Row
          label="人数"
          value={
            form.adultCount || form.childCount
              ? `大人 ${form.adultCount || "0"}人 / 子供 ${form.childCount || "0"}人`
              : "未入力"
          }
        />
      </SummaryBlock>

      {/* ヒアリング内容 */}
      <SummaryBlock title="ヒアリング内容" onEdit={() => onJump(2)}>
        {qualifyItems.map((it) => {
          const isNg = NG_ANSWERS[it.key] === it.value
          return (
            <div key={it.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{it.label}</span>
              <span
                className={cn(
                  "flex items-center gap-1 text-sm font-semibold",
                  isNg ? "text-destructive" : "text-foreground",
                )}
              >
                {isNg ? (
                  <AlertTriangle className="size-3.5" />
                ) : (
                  <CheckCircle2 className="size-3.5 text-primary" />
                )}
                {yn(it.value)}
              </span>
            </div>
          )
        })}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-muted-foreground">ソーラー検討</span>
          <span className="text-sm font-semibold text-foreground">
            {form.solarConsidered === "yes"
              ? "あり"
              : form.solarConsidered === "no"
                ? "なし"
                : "未入力"}
          </span>
        </div>
        {form.solarConsidered === "yes" && (
          <>
            <Row label="検討時期" value={form.solarConsideredTime || "未入力"} />
            <Row label="検討理由" value={form.solarConsideredReason || "未入力"} />
          </>
        )}
        <Row label="立面図の有無" value={form.elevationDrawing || "未入力"} />
        <Row label="建物外観の撮影許可" value={yn(form.exteriorPhotoPermission)} />
      </SummaryBlock>

      {/* 質問事項 */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <Field label="お客様からの質問はありますか?" error={errorMap.hasQuestions}>
          <YesNoToggle
            name="質問事項の有無"
            value={form.hasQuestions}
            onChange={onChangeHasQuestions}
            yesLabel="あり"
            noLabel="なし"
          />
        </Field>
        {form.hasQuestions === "yes" && (
          <Field label="質問内容" htmlFor="questionDetail" error={errorMap.questionDetail}>
            <Textarea
              id="questionDetail"
              value={form.questionDetail}
              onChange={(e) => onChangeQuestionDetail(e.target.value)}
              placeholder="お客様から受けた質問を記入"
              rows={3}
              className="text-base"
            />
          </Field>
        )}
      </div>
    </div>
  )
}

function SummaryBlock({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-medium text-primary"
        >
          <Pencil className="size-3" />
          修正
        </button>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const empty = value === "未入力"
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right text-sm font-medium",
          empty ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  )
}
