import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { Resend } from "resend"

import { type AppointmentForm, validateForm } from "@/lib/appointment"
import { buildAppointmentEmail } from "@/lib/email"

const DEFAULT_NOTIFICATION_RECIPIENTS = [
  "daisuke.araseki@gmail.com",
  "matsui@smart-re-house.com",
] as const

const RESEND_SANDBOX_RECIPIENT = "daisuke.araseki@gmail.com"

function isResendSandboxFrom(from: string): boolean {
  return from.includes("@resend.dev")
}

function getNotificationRecipients(from: string): string[] {
  const configured = process.env.NOTIFICATION_EMAIL?.trim()
  const extras = configured
    ? configured.split(",").map((e) => e.trim()).filter(Boolean)
    : []
  const recipients = [...new Set([...DEFAULT_NOTIFICATION_RECIPIENTS, ...extras])]

  if (!isResendSandboxFrom(from)) return recipients

  // onboarding@resend.dev は Resend アカウント所有者へのテスト送信のみ可
  const sandboxRecipient =
    process.env.RESEND_SANDBOX_RECIPIENT?.trim() || RESEND_SANDBOX_RECIPIENT
  const skipped = recipients.filter((email) => email !== sandboxRecipient)
  if (skipped.length > 0) {
    console.warn(
      "Resend sandbox from address: skipping recipients until domain is verified:",
      skipped.join(", "),
    )
  }
  return [sandboxRecipient]
}

function buildIdempotencyKey(form: AppointmentForm): string {
  const hash = createHash("sha256").update(JSON.stringify(form)).digest("hex").slice(0, 32)
  return `appointment/${hash}`
}

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

  const errors = validateForm(form)
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "入力内容に不備があります", details: errors },
      { status: 422 },
    )
  }

  const from = process.env.RESEND_FROM ?? "Apo Check <onboarding@resend.dev>"
  const to = getNotificationRecipients(from)
  const registeredAt = new Date()
  const { subject, text, html } = buildAppointmentEmail(form, registeredAt)

  const idempotencyKey = buildIdempotencyKey(form)

  const { data, error } = await resend.emails.send(
    {
      from,
      to,
      subject,
      text,
      html,
    },
    { idempotencyKey },
  )

  if (error) {
    console.error("Resend error:", error)
    const details = typeof error.message === "string" ? error.message : undefined
    return NextResponse.json(
      { error: "メール送信に失敗しました", details },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, id: data?.id })
}
