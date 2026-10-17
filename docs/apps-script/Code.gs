function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  // --- births ---
  if (data.type === 'birth') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('births') || ss.insertSheet('births');
    if (sh.getLastRow() === 0) {
      sh.appendRow(['时间','出生日期','出生年','年龄','性别','称呼','历法','来源','sessionId','解读类型','关系类型']);
    }
    sh.appendRow([new Date(), data.date, data.birthYear, data.age, data.gender,
                  data.name, data.calendar, data.source, data.sessionId, data.readingKind, data.relationshipType]);
    return ContentService.createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // --- email reports ---
  if (data.type === 'email_report') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('emails') || ss.insertSheet('emails');
    if (sh.getLastRow() === 0) {
      sh.appendRow(['時間', '郵箱', '稱呼', '出生資訊']);
    }
    sh.appendRow([new Date(), data.email, data.name, data.birthSummary]);
    return ContentService.createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // --- feedback and unlock claims (anything else) ---
  function safe(v) {
    v = (v === undefined || v === null) ? '' : String(v);
    return /^[=+\-@]/.test(v) ? "'" + v : v;  // stop spreadsheet formulas in public input
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('feedback') || ss.insertSheet('feedback');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['時間', '類型', '內容', '頁面', 'sessionId']);
  }
  sh.appendRow([new Date(), safe(data.type), safe(data.description), safe(data.page), safe(data.sessionId)]);
  return ContentService.createTextOutput(JSON.stringify({ok:true}))
    .setMimeType(ContentService.MimeType.JSON);
}
