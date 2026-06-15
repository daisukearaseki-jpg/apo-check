import { type AppointmentForm, type YesNo, digitsOnly } from "./appointment"
import { plusCodeMapsUrl } from "./plus-code"

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function phoneText(phone: string): string {
  return phone.trim() || "未入力"
}

function phoneHtml(phone: string): string {
  const display = escapeHtml(phoneText(phone))
  const digits = digitsOnly(phone)
  if (!digits) return display
  return `<a href="tel:${digits}">${display}</a>`
}

function urlHtml(url: string): string {
  const escaped = escapeHtml(url)
  return `<a href="${escaped}">${escaped}</a>`
}

function lineHtml(label: string, valueHtml: string): string {
  return `<p style="margin:0.25em 0">・${escapeHtml(label)}：${valueHtml}</p>`
}

function sectionTitle(title: string): string {
  return `<p style="margin:1em 0 0.25em;font-weight:bold">■ ${escapeHtml(title)}</p>`
}

function divider(): string {
  return `<p style="margin:0.5em 0;color:#888">━━━━━━━━━━━━━━━━</p>`
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
    line("電話", phoneText(form.phone)),
    line("住所", form.address),
    ...(form.plusCode.trim()
      ? [line("地図リンク", plusCodeMapsUrl(form.plusCode))]
      : [line("地図リンク", "未入力")]),
    "",
    "━━━━━━━━━━━━━━━━",
    "■ 詳細確認",
    "━━━━━━━━━━━━━━━━",
    ...hearingLines,
    "",
    line("添付写真", hasPhoto ? "1枚（メールに添付）" : "なし"),
  ].join("\n")

  const mapUrl = form.plusCode.trim() ? plusCodeMapsUrl(form.plusCode) : ""

  const html = [
    `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111">`,
    `<p style="margin:0.25em 0;font-weight:bold">【アポ取得アプリ】新規登録</p>`,
    lineHtml("登録日時", escapeHtml(registeredAt)),
    divider(),
    sectionTitle("アポ日時"),
    divider(),
    lineHtml("日付", escapeHtml(`${form.date}（${form.weekday}）`)),
    lineHtml("時間", escapeHtml(form.time)),
    divider(),
    sectionTitle("お客様情報"),
    divider(),
    lineHtml("氏名", escapeHtml(name)),
    lineHtml("電話", phoneHtml(form.phone)),
    lineHtml("住所", escapeHtml(form.address)),
    mapUrl
      ? lineHtml("地図リンク", urlHtml(mapUrl))
      : lineHtml("地図リンク", escapeHtml("未入力")),
    divider(),
    sectionTitle("詳細確認"),
    divider(),
    ...hearingLines.map((entry) => {
      const colon = entry.indexOf("：")
      const label = colon >= 0 ? entry.slice(1, colon) : entry
      const value = colon >= 0 ? entry.slice(colon + 1) : ""
      return lineHtml(label, escapeHtml(value))
    }),
    lineHtml("添付写真", escapeHtml(hasPhoto ? "1枚（メールに添付）" : "なし")),
    `</div>`,
  ].join("")

  return { subject, text, html }
}
