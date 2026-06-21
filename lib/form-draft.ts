import { type AppointmentForm, type StepId, emptyForm } from "./appointment"

const STORAGE_KEY = "apo-check-form-draft"

export interface FormDraft {
  form: AppointmentForm
  stepIndex: number
  completed: StepId[]
}

function isStepId(value: unknown): value is StepId {
  return value === "schedule" || value === "qualify" || value === "confirm"
}

function parseDraft(raw: string): FormDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<FormDraft>
    if (!parsed.form || typeof parsed.form !== "object") return null

    const stepIndex =
      typeof parsed.stepIndex === "number" && parsed.stepIndex >= 0 ? parsed.stepIndex : 0
    const completed = Array.isArray(parsed.completed)
      ? parsed.completed.filter(isStepId)
      : []

    return {
      form: { ...emptyForm, ...parsed.form },
      stepIndex,
      completed,
    }
  } catch {
    return null
  }
}

export function loadFormDraft(): FormDraft | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return parseDraft(raw)
}

export function saveFormDraft(draft: FormDraft): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export function clearFormDraft(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}
