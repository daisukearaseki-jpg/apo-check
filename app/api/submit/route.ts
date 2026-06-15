import { NextResponse } from "next/server"
import { Resend } from "resend"

import { type AppointmentForm, validateStep } from "@/lib/appointment"
import { buildAppointmentEmail } from "@/lib/email"
import type { PhotoAttachment } from "@/lib/photo"

interface SubmitBody extends AppointmentForm {
  photo?: PhotoAttachment
}

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "メール送信の設定が完了していません（RESEND_API_KEY）" },
      { status: 503 },
    )
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  let body: SubmitBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 })
  }

  const { photo, ...form } = body

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

  if (!photo?.data) {
    return NextResponse.json(
      { error: "建物の外観写真が添付されていません" },
      { status: 422 },
    )
  }

  const to = process.env.NOTIFICATION_EMAIL ?? "daisuke.araseki@gmail.com"
  const from = process.env.RESEND_FROM ?? "Apo Check <onboarding@resend.dev>"
  const { subject, text, html } = buildAppointmentEmail(form, true)

  const idempotencyKey = `appointment/${form.date}/${form.time}/${form.phone.replace(/\D/g, "")}`

  const { data, error } = await resend.emails.send(
    {
      from,
      to: [to],
      subject,
      text,
      html,
      attachments: [
        {
          filename: photo.filename || "apo-photo.jpg",
          content: photo.data,
          contentType: photo.contentType || "image/jpeg",
        },
      ],
    },
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
