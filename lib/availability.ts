import {
  getAvailableTimeSlots,
  getMinAppointmentDate,
  getSlotCategory,
  isPastDate,
} from "@/lib/appointment"
import { normalizeTime, readOccupiedSlots, type OccupiedSlot } from "@/lib/google-sheets"

export function filterOccupiedSlots(
  candidateSlots: string[],
  occupiedTimes: string[],
): string[] {
  const taken = new Set(
    occupiedTimes
      .map((time) => normalizeTime(time))
      .filter((time): time is string => Boolean(time)),
  )

  return candidateSlots.filter((slot) => {
    const normalized = normalizeTime(slot)
    return normalized ? !taken.has(normalized) : true
  })
}

function groupOccupiedByDate(occupied: OccupiedSlot[]): Map<string, string[]> {
  const map = new Map<string, string[]>()

  for (const slot of occupied) {
    const list = map.get(slot.date) ?? []
    list.push(slot.time)
    map.set(slot.date, list)
  }

  return map
}

export async function getAvailableSlotsForDate(
  date: string,
  now = new Date(),
): Promise<string[]> {
  const candidates = getAvailableTimeSlots(date, now)
  const occupied = await readOccupiedSlots()
  const occupiedTimes = occupied.filter((slot) => slot.date === date).map((slot) => slot.time)
  return filterOccupiedSlots(candidates, occupiedTimes)
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export async function getBookableDatesInMonth(
  year: number,
  month: number,
  now = new Date(),
): Promise<string[]> {
  const minDate = getMinAppointmentDate(now)
  const daysInMonth = new Date(year, month, 0).getDate()
  const occupied = await readOccupiedSlots()
  const occupiedByDate = groupOccupiedByDate(occupied)
  const bookableDates: string[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = toDateString(year, month, day)
    if (date < minDate || getSlotCategory(date) === "none") continue

    const candidates = getAvailableTimeSlots(date, now)
    const occupiedTimes = occupiedByDate.get(date) ?? []
    const available = filterOccupiedSlots(candidates, occupiedTimes)
    if (available.length > 0) bookableDates.push(date)
  }

  return bookableDates
}
