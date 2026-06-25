/** Google スプレッドシートの列定義（1行目ヘッダー） */
export const SHEET_HEADERS = [
  "登録日時",
  "アポ日付",
  "アポ時間",
  "お客様名",
  "アポ取得者",
  "ペア",
  "ボイレコ番号",
  "地図番号",
  "建物オーナー",
  "情報公開承諾",
  "電気代条件",
  "月額電気代",
  "75歳以下",
  "ソーラー検討",
  "検討時期",
  "検討理由",
  "立面図",
  "質問有無",
  "質問内容",
] as const

export const SHEET_COLUMN_COUNT = SHEET_HEADERS.length

/** 連携するスプレッドシート ID（gas/apo-sheet-api.gs と一致させる） */
export const SPREADSHEET_ID = "1OPCDS_J8HOQqtGxoUKlq8O_DIkZCD_ttcfYz_TXYT00"

/** 空き枠判定に使う列インデックス（0-based） */
export const SHEET_COL_APPOINTMENT_DATE = 1
export const SHEET_COL_APPOINTMENT_TIME = 2

/** スプレッドシート全体への URL */
export function buildSpreadsheetUrl(): string {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`
}

/** 登録行への Google スプレッドシート URL */
export function buildSpreadsheetRowUrl(sheetGid: number, row: number): string {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${sheetGid}&range=A${row}`
}
