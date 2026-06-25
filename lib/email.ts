import { type AppointmentForm, type YesNo, formatDateWithWeekday } from "./appointment"

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

function lineHtml(label: string, valueHtml: string): string {
  return `<p style="margin:0.25em 0">・${escapeHtml(label)}：${valueHtml}</p>`
}

function sectionTitle(title: string): string {
  return `<p style="margin:1em 0 0.25em;font-weight:bold">■ ${escapeHtml(title)}</p>`
}

function divider(): string {
  return `<p style="margin:0.5em 0;color:#888">━━━━━━━━━━━━━━━━</p>`
}

function formatRegisteredAt(date: Date): string {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .split("-")
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
  return `${Number(y)}/${Number(m)}/${Number(d)} ${time}`
}

function formatAppointmentDateTime(form: AppointmentForm): string {
  if (!form.date && !form.time) return "未入力"
  const datePart = form.date ? formatDateWithWeekday(form.date) : ""
  return [datePart, form.time].filter(Boolean).join(" ")
}

export function buildAppointmentEmail(
  form: AppointmentForm,
  registeredAt = new Date(),
  sheetRowUrl?: string,
) {
  const name = form.lastName.trim()
  const subject = `【アポ取得】${name} 様 / ${form.date} ${form.time}`
  const registeredAtLabel = formatRegisteredAt(registeredAt)
  const appointmentDateTime = formatAppointmentDateTime(form)

  const hearingLines = [
    line("建物オーナー", yn(form.isBuildingOwner)),
    line("設置写真と発電データの公開", yn(form.consentDisclosure)),
    line("電気代 8,000円以上", yu(form.electricityOver8000)),
    ...(form.electricityOver8000 === "yes"
      ? [line("月額の電気代", form.electricityAmount || "未入力")]
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
      "聞いておきたいこと、メモ",
      form.hasQuestions === "yes" ? "あり" : form.hasQuestions === "no" ? "なし" : "未入力",
    ),
    ...(form.hasQuestions === "yes"
      ? [line("内容", form.questionDetail || "未入力")]
      : []),
  ]

  const text = [
    line("登録日時", registeredAtLabel),
    ...(sheetRowUrl ? [line("スプレッドシート", sheetRowUrl), ""] : []),
    "━━━━━━━━━━━━━━━━",
    "■ アポ日時",
    "━━━━━━━━━━━━━━━━",
    line("アポ日時", appointmentDateTime),
    line("お客様名(姓だけ)", name || "未入力"),
    line("日付", formatDateWithWeekday(form.date) || "未入力"),
    line("時間", form.time),
    line("アポ取得者", form.apoGetter || "未入力"),
    line("ペア", form.pair || "未入力"),
    line("ボイレコ番号", form.voirecoNumber || "未入力"),
    line("地図番号", form.mapNumber || "未入力"),
    "",
    "━━━━━━━━━━━━━━━━",
    "■ 詳細情報",
    "━━━━━━━━━━━━━━━━",
    ...hearingLines,
  ].join("\n")

  const html = [
    `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111">`,
    lineHtml("登録日時", escapeHtml(registeredAtLabel)),
    ...(sheetRowUrl
      ? [
          lineHtml(
            "スプレッドシート",
            `<a href="${escapeHtml(sheetRowUrl)}" style="color:#2563eb">登録行を開く</a>`,
          ),
        ]
      : []),
    divider(),
    sectionTitle("アポ日時"),
    divider(),
    lineHtml("アポ日時", escapeHtml(appointmentDateTime)),
    lineHtml("お客様名(姓だけ)", escapeHtml(name || "未入力")),
    lineHtml("日付", escapeHtml(formatDateWithWeekday(form.date) || "未入力")),
    lineHtml("時間", escapeHtml(form.time)),
    lineHtml("アポ取得者", escapeHtml(form.apoGetter || "未入力")),
    lineHtml("ペア", escapeHtml(form.pair || "未入力")),
    lineHtml("ボイレコ番号", escapeHtml(form.voirecoNumber || "未入力")),
    lineHtml("地図番号", escapeHtml(form.mapNumber || "未入力")),
    divider(),
    sectionTitle("詳細情報"),
    divider(),
    ...hearingLines.map((entry) => {
      const colon = entry.indexOf("：")
      const label = colon >= 0 ? entry.slice(1, colon) : entry
      const value = colon >= 0 ? entry.slice(colon + 1) : ""
      return lineHtml(label, escapeHtml(value))
    }),
    `</div>`,
  ].join("")

  return { subject, text, html }
}
