import { OpenLocationCode } from "open-location-code"

const olc = new OpenLocationCode()

export function encodePlusCode(lat: number, lng: number): string {
  return olc.encode(lat, lng, OpenLocationCode.CODE_PRECISION_NORMAL)
}

export function normalizePlusCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "")
}

export function plusCodeMapsUrl(code: string): string {
  const normalized = normalizePlusCode(code)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`plus_code:${normalized}`)}`
}
