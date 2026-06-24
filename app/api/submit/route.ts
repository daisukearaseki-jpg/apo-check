import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { Resend } from "resend"

import { getAvailableSlotsForDate } from "@/lib/availability"
import { type AppointmentForm, validateForm } from "@/lib/appointment"
import { buildAppointmentEmail } from "@/lib/email"
import {
  appendAppointment,
  isSheetsConfigured,
  isSlotOccupied,
  readOccupiedSlots,
  SlotConflictError,
} from "@/lib/google-sheets"

const DEFAULT_NOTIFICATION_RECIPIENTS = ["daisuke.araseki@gmail.com"] as const

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
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      {
        error: "GAS の設定が完了していません（GAS_WEB_APP_URL / GAS_API_SECRET）",
      },
      { status: 503 },
    )
  }

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

  const registeredAt = new Date()
  let allowedTimeSlots: string[] = []

  try {
    allowedTimeSlots = await getAvailableSlotsForDate(form.date, registeredAt)
  } catch (error) {
    console.error("Sheets read error:", error)
    return NextResponse.json({ error: "予約枠の確認に失敗しました" }, { status: 502 })
  }

  const errors = validateForm(form, registeredAt, { allowedTimeSlots })
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "入力内容に不備があります", details: errors },
      { status: 422 },
    )
  }

  try {
    const occupied = await readOccupiedSlots()
    if (isSlotOccupied(occupied, form.date, form.time)) {
      return NextResponse.json(
        { error: "この日時は既に予約されています。別の日時を選択してください" },
        { status: 409 },
      )
    }

    await appendAppointment(form, registeredAt)
  } catch (error) {
    if (error instanceof SlotConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Sheets write error:", error)
    const message = error instanceof Error ? error.message : "スプレッドシートへの登録に失敗しました"
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const from = process.env.RESEND_FROM ?? "Apo Check <onboarding@resend.dev>"
  const to = getNotificationRecipients(from)
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
      {
        ok: true,
        sheetSaved: true,
        emailSent: false,
        warning: "スプレッドシートへの登録は完了しましたが、メール送信に失敗しました",
        details,
      },
      { status: 200 },
    )
  }

  return NextResponse.json({ ok: true, sheetSaved: true, emailSent: true, id: data?.id })
}
