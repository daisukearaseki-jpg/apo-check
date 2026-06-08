import { type AppointmentForm, type YesNo } from "./appointment"

function yn(v: YesNo): string {
  if (v === "yes") return "はい"
  if (v === "no") return "いいえ"
  return "未入力"
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:140px">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:500">${value || "—"}</td></tr>`
}

export function buildAppointmentEmail(form: AppointmentForm) {
  const name = `${form.lastName} ${form.firstName}`.trim()
  const subject = `【アポ取得】${name} 様 / ${form.date} ${form.time}`

  const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9fafb;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:#2563eb;color:#fff;padding:16px 20px">
      <h1 style="margin:0;font-size:18px">アポ取得チェック — 新規登録</h1>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.9">${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>
    </div>
    <div style="padding:20px">
      <h2 style="margin:0 0 8px;font-size:15px;color:#111827">アポ日時</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${row("日付", form.date ? `${form.date}（${form.weekday}）` : "")}
        ${row("時間", form.time)}
      </table>
      <h2 style="margin:0 0 8px;font-size:15px;color:#111827">お客様情報</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${row("氏名", name)}
        ${row("電話", form.phone)}
        ${row("住所", form.address)}
        ${row("人数", `大人 ${form.adultCount || "0"}人 / 子供 ${form.childCount || "0"}人`)}
      </table>
      <h2 style="margin:0 0 8px;font-size:15px;color:#111827">適格確認</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${row("建物オーナー", yn(form.isBuildingOwner))}
        ${row("情報公開の承諾", yn(form.consentDisclosure))}
        ${row("電気代 8,000円以上", yn(form.electricityOver8000))}
        ${row("75歳以下", yn(form.ageUnder75))}
        ${row("ソーラー検討", form.solarConsidered === "yes" ? "あり" : form.solarConsidered === "no" ? "なし" : "未入力")}
        ${form.solarConsidered === "yes" ? row("検討時期", form.solarConsideredTime) : ""}
        ${form.solarConsidered === "yes" ? row("検討理由", form.solarConsideredReason) : ""}
      </table>
      <h2 style="margin:0 0 8px;font-size:15px;color:#111827">質問事項</h2>
      <table style="width:100%;border-collapse:collapse">
        ${row("質問の有無", form.hasQuestions === "yes" ? "あり" : form.hasQuestions === "no" ? "なし" : "未入力")}
        ${form.hasQuestions === "yes" ? row("質問内容", form.questionDetail) : ""}
      </table>
    </div>
  </div>
</body>
</html>`

  const text = [
    "【アポ取得チェック — 新規登録】",
    "",
    "■ アポ日時",
    `日付: ${form.date}（${form.weekday}）`,
    `時間: ${form.time}`,
    "",
    "■ お客様情報",
    `氏名: ${name}`,
    `電話: ${form.phone}`,
    `住所: ${form.address}`,
    `人数: 大人 ${form.adultCount || "0"}人 / 子供 ${form.childCount || "0"}人`,
    "",
    "■ 適格確認",
    `建物オーナー: ${yn(form.isBuildingOwner)}`,
    `情報公開の承諾: ${yn(form.consentDisclosure)}`,
    `電気代 8,000円以上: ${yn(form.electricityOver8000)}`,
    `75歳以下: ${yn(form.ageUnder75)}`,
    `ソーラー検討: ${form.solarConsidered === "yes" ? "あり" : form.solarConsidered === "no" ? "なし" : "未入力"}`,
    ...(form.solarConsidered === "yes"
      ? [`検討時期: ${form.solarConsideredTime}`, `検討理由: ${form.solarConsideredReason}`]
      : []),
    "",
    "■ 質問事項",
    `質問の有無: ${form.hasQuestions === "yes" ? "あり" : form.hasQuestions === "no" ? "なし" : "未入力"}`,
    ...(form.hasQuestions === "yes" ? [`質問内容: ${form.questionDetail}`] : []),
  ].join("\n")

  return { subject, html, text }
}
