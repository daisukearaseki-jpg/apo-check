import { type AppointmentForm, type YesNo } from "./appointment"
import { plusCodeMapsUrl, PLUS_CODE_LABEL } from "./plus-code"

function yn(v: YesNo): string {
  if (v === "yes") return "はい"
  if (v === "no") return "いいえ"
  return "未入力"
}

function yu(v: string): string {
  if (v === "yes") return "はい"
  if (v === "unknown") return "不明"
  return "未入力"
}

function line(label: string, value: string): string {
  return `・${label}：${value}`
}

export function buildAppointmentEmail(form: AppointmentForm, hasPhoto = false) {
  const name = `${form.lastName} ${form.firstName}`.trim()
  const subject = `【アポ取得】${name} 様 / ${form.date} ${form.time}`
  const registeredAt = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })

  const hearingLines = [
    line("建物オーナー", yn(form.isBuildingOwner)),
    line("設置写真と発電データの公開", yn(form.consentDisclosure)),
    line("電気代 8,000円以上", yu(form.electricityOver8000)),
    ...(form.electricityOver8000 === "yes"
      ? [line("月額の電気代", form.electricityAmount ? `${form.electricityAmount}円` : "未入力")]
      : []),
    line("ご同居の75歳以下", yn(form.ageUnder75)),
    line(
      "ソーラー検討",
      form.solarConsidered === "yes" ? "あり" : form.solarConsidered === "no" ? "なし" : "未入力",
    ),
    ...(form.solarConsidered === "yes"
      ? [
          line("検討時期", form.solarConsideredTime),
          line("検討理由", form.solarConsideredReason),
        ]
      : []),
    line("立面図の有無", form.elevationDrawing || "未入力"),
    line(
      "聞きたい事・ご心配な事",
      form.hasQuestions === "yes" ? "あり" : form.hasQuestions === "no" ? "なし" : "未入力",
    ),
    ...(form.hasQuestions === "yes"
      ? [line("内容", form.questionDetail || "未入力")]
      : []),
  ]

  const text = [
    "【アポ取得アプリ】新規登録",
    line("登録日時", registeredAt),
    "",
    "━━━━━━━━━━━━━━━━",
    "■ アポ日時",
    "━━━━━━━━━━━━━━━━",
    line("日付", `${form.date}（${form.weekday}）`),
    line("時間", form.time),
    "",
    "━━━━━━━━━━━━━━━━",
    "■ お客様情報",
    "━━━━━━━━━━━━━━━━",
    line("氏名", name),
    line("電話", form.phone),
    line("住所", form.address),
    ...(form.plusCode.trim()
      ? [
          PLUS_CODE_LABEL,
          form.plusCode,
          line("地図リンク", plusCodeMapsUrl(form.plusCode)),
        ]
      : [line("Google MAP", "未入力")]),
    "",
    "━━━━━━━━━━━━━━━━",
    "■ 詳細確認",
    "━━━━━━━━━━━━━━━━",
    ...hearingLines,
    "",
    line("添付写真", hasPhoto ? "1枚（メールに添付）" : "なし"),
  ].join("\n")

  return { subject, text }
}
