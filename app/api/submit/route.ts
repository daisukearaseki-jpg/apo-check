import { NextResponse } from "next/server"
import { Resend } from "resend"

import { type AppointmentForm, validateStep } from "@/lib/appointment"
import { buildAppointmentEmail } from "@/lib/email"

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "メール送信の設定が完了していません（RESEND_API_KEY）" },
      { status: 503 },
    )
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  let form: AppointmentForm
  try {
    form = await req.json()
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 })
  }

  const errors = [
    ...validateStep("schedule", form),
    ...validateStep("customer", form),
    ...validateStep("qualify", form),
    ...validateStep("confirm", form),
  ]
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "入力内容に不備があります", details: errors },
      { status: 422 },
    )
  }

  const to = process.env.NOTIFICATION_EMAIL ?? "daisuke.araseki@gmail.com"
  const from = process.env.RESEND_FROM ?? "アポ取得チェック <onboarding@resend.dev>"
  const { subject, html, text } = buildAppointmentEmail(form)

  const idempotencyKey = `appointment/${form.date}/${form.time}/${form.phone}/${form.lastName}${form.firstName}`

  const { data, error } = await resend.emails.send(
    { from, to: [to], subject, html, text },
    { idempotencyKey },
  )

  if (error) {
    console.error("Resend error:", error)
    return NextResponse.json(
      { error: "メール送信に失敗しました。しばらくしてから再度お試しください。" },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, id: data?.id })
}
