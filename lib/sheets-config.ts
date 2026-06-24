/** Google スプレッドシートの列定義（1行目ヘッダー） */
export const SHEET_HEADERS = [
  "日付",
  "時間",
  "お客様名",
  "曜日",
  "アポ取得者",
  "ペア",
  "ボイレコ番号",
  "地図番号",
  "建物オーナー",
  "公開承諾",
  "電気代8000以上",
  "月額電気代",
  "75歳以下",
  "ソーラー検討",
  "検討時期",
  "検討理由",
  "立面図",
  "質問有無",
  "質問内容",
  "備考",
  "登録日時",
] as const

export const SHEET_COLUMN_COUNT = SHEET_HEADERS.length
