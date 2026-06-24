/**
 * アポ取得アプリ連携用 Google Apps Script
 *
 * セットアップ:
 * 1. スプレッドシート → 拡張機能 → Apps Script を開く
 * 2. このファイルの内容を貼り付けて保存
 * 3. 関数 setupApiSecret を1回実行 → ログに出た API_SECRET を控える
 * 4. デプロイ → 新しいデプロイ → 種類: ウェブアプリ
 *    - 実行ユーザー: 自分
 *    - アクセスできるユーザー: 全員
 * 5. 表示された URL を .env の GAS_WEB_APP_URL に設定
 */

var SHEET_HEADERS = [
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
];

/** 空き枠判定: B列=アポ日付, C列=アポ時間（1-based で 2, 3） */
var COL_APPOINTMENT_DATE = 2;
var COL_APPOINTMENT_TIME = 3;

/** 連携するスプレッドシート ID（必ずここを確認） */
var SPREADSHEET_ID = "1OPCDS_J8HOQqtGxoUKlq8O_DIkZCD_ttcfYz_TXYT00";

/** 書き込み先シート名（空なら先頭シート） */
var SHEET_NAME = "シート1";

function getApiSecret_() {
  var secret = PropertiesService.getScriptProperties().getProperty("API_SECRET");
  if (!secret) {
    throw new Error("API_SECRET が未設定です。setupApiSecret を1回実行してください");
  }
  return secret;
}

function verifyToken_(token) {
  return token && token === getApiSecret_();
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getDataSheet_() {
  var ss = getSpreadsheet_();
  if (SHEET_NAME) {
    var named = ss.getSheetByName(SHEET_NAME);
    if (!named) throw new Error("シートが見つかりません: " + SHEET_NAME);
    return named;
  }
  return ss.getSheets()[0];
}

function ensureHeaders_() {
  var sheet = getDataSheet_();
  var first = sheet.getRange(1, 1, 1, SHEET_HEADERS.length).getValues()[0];
  if (first[0] && String(first[0]).indexOf("登録日時") !== -1) return;
  sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
}

function normalizeDate_(value) {
  if (value === null || value === undefined || value === "") return null;

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, "Asia/Tokyo", "yyyy-MM-dd");
  }

  var raw = String(value).trim();
  if (!raw) return null;

  // 2026-06-25（金）, 2026/6/28(日) 形式
  var withWeekday = raw.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})[（(][日月火水木金土][）)]$/);
  if (withWeekday) {
    raw = withWeekday[1];
  }

  var iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return (
      iso[1] +
      "-" +
      ("0" + iso[2]).slice(-2) +
      "-" +
      ("0" + iso[3]).slice(-2)
    );
  }

  var slash = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slash) {
    return (
      slash[1] +
      "-" +
      ("0" + slash[2]).slice(-2) +
      "-" +
      ("0" + slash[3]).slice(-2)
    );
  }

  return null;
}

function normalizeTime_(value) {
  if (value === null || value === undefined || value === "") return null;

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, "Asia/Tokyo", "HH:mm");
  }

  if (typeof value === "number" && isFinite(value)) {
    var totalMinutes = Math.round(value * 24 * 60);
    var hours = Math.floor(totalMinutes / 60) % 24;
    var minutes = totalMinutes % 60;
    return ("0" + hours).slice(-2) + ":" + ("0" + minutes).slice(-2);
  }

  var raw = String(value).trim();
  if (!raw) return null;

  var match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  return ("0" + match[1]).slice(-2) + ":" + match[2];
}

function readOccupiedSlots_() {
  var sheet = getDataSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet
    .getRange(2, COL_APPOINTMENT_DATE, lastRow, COL_APPOINTMENT_TIME)
    .getDisplayValues();
  var slots = [];

  for (var i = 0; i < values.length; i++) {
    var date = normalizeDate_(values[i][0]);
    var time = normalizeTime_(values[i][1]);
    if (date && time) {
      slots.push({ date: date, time: time });
    }
  }

  return slots;
}

function isSlotOccupied_(date, time) {
  var normalizedTime = normalizeTime_(time);
  if (!normalizedTime) return false;

  var slots = readOccupiedSlots_();
  for (var i = 0; i < slots.length; i++) {
    if (slots[i].date === date && slots[i].time === normalizedTime) return true;
  }
  return false;
}

function doGet(e) {
  try {
    var token = e.parameter.token;
    if (!verifyToken_(token)) {
      return jsonOutput_({ error: "認証に失敗しました" });
    }

    var action = e.parameter.action || "occupied";

    if (action === "occupied") {
      ensureHeaders_();
      return jsonOutput_({ slots: readOccupiedSlots_() });
    }

    if (action === "append") {
      if (!e.parameter.payload) {
        return jsonOutput_({ error: "payload が必要です" });
      }
      var body = JSON.parse(e.parameter.payload);
      return handleAppend_(body);
    }

    return jsonOutput_({ error: "不明な action です" });
  } catch (err) {
    return jsonOutput_({ error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (!verifyToken_(body.token)) {
      return jsonOutput_({ error: "認証に失敗しました" });
    }

    if (body.action === "append") {
      return handleAppend_(body);
    }

    return jsonOutput_({ error: "不明な action です" });
  } catch (err) {
    return jsonOutput_({ error: String(err.message || err) });
  }
}

function handleAppend_(body) {
  var date = normalizeDate_(body.date);
  var time = normalizeTime_(body.time);
  var row = body.row;

  if (!date || !time) {
    return jsonOutput_({ error: "日付と時間が不正です" });
  }
  if (!row || !Array.isArray(row) || row.length < 2) {
    return jsonOutput_({ error: "登録データが不正です" });
  }

  ensureHeaders_();

  if (isSlotOccupied_(date, time)) {
    return jsonOutput_({
      error: "この日時は既に予約されています。別の日時を選択してください",
      code: 409,
    });
  }

  var sheet = getDataSheet_();
  sheet.appendRow(row);
  return jsonOutput_({ ok: true });
}

/** 初回のみ実行: API_SECRET を生成して Script Properties に保存 */
function setupApiSecret() {
  var secret = Utilities.getUuid() + Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty("API_SECRET", secret);
  Logger.log("API_SECRET（.env の GAS_API_SECRET に設定）: " + secret);
}
