/************************************************************
 * BISC Audit Simulation 2026 — Registration endpoint
 * Google Apps Script Web App  ->  Google Sheet + Google Drive
 *
 * CÁCH CÀI (làm 1 lần, ~5 phút):
 *  1. Mở Google Sheet của bạn -> Tiện ích mở rộng (Extensions)
 *     -> Apps Script
 *  2. Xoá hết code mẫu, dán TOÀN BỘ file này vào
 *  3. Sửa SHARED_TOKEN ở dưới thành 1 chuỗi bí mật của riêng bạn
 *  4. Bấm Deploy -> New deployment -> chọn type "Web app"
 *       Execute as:      Me (email của bạn)
 *       Who has access:  Anyone            <-- BẮT BUỘC
 *  5. Authorize -> Advanced -> Go to project (unsafe) -> Allow
 *  6. Copy "Web app URL" (dạng .../exec) rồi gửi lại cho Claude
 ************************************************************/

/* ====== CẤU HÌNH ====== */
var SHEET_NAME    = 'DangKy';        // tab sẽ tự tạo nếu chưa có
var DRIVE_FOLDER  = 'BISC-CV-2026';  // folder Drive lưu CV, tự tạo nếu chưa có
var SHARED_TOKEN  = 'bisc-landing-event-14092026';  // <-- ĐỔI CHUỖI NÀY
var MAX_CV_BYTES  = 5 * 1024 * 1024; // 5MB
var NOTIFY_EMAIL  = '';              // để trống nếu không muốn nhận mail báo

var HEADERS = [
  'Thời gian', 'Họ và tên', 'Số điện thoại', 'Email', 'Trường đại học',
  'Tư vấn viên BISC', 'Tình trạng offer', 'CFAB/ACCA Assurance',
  'Link CV', 'Tên file CV', 'Nguồn'
];

var ADVISOR = {
  'van-anh': 'Vân Anh',
  'luong': 'Lương',
  'not-student': 'Chưa phải học viên BISC'
};
var OFFER = {
  'none': 'Chưa có offer',
  'big4': 'Đã có offer Big4',
  'nonbig': 'Đã có offer Nonbig',
  'other': 'Khác'
};
var ASSURANCE = {
  'studied-or-studying': 'Đã/đang học',
  'not-studied': 'Chưa học'
};

/* ====== ENDPOINT ====== */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return json({ ok: false, error: 'busy' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty' });
    }

    var d = JSON.parse(e.postData.contents);

    // Chống bot: honeypot phải rỗng + token phải khớp
    if (d.company) return json({ ok: true, skipped: true });
    if (d.token !== SHARED_TOKEN) return json({ ok: false, error: 'unauthorized' });

    var missing = ['fullname', 'phone', 'email', 'university', 'advisor', 'assurance_status']
      .filter(function (k) { return !String(d[k] || '').trim(); });
    if (missing.length) {
      return json({ ok: false, error: 'missing:' + missing.join(',') });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(d.email).trim())) {
      return json({ ok: false, error: 'bad_email' });
    }
    if (!/^[0-9+\s().-]{8,20}$/.test(String(d.phone).trim())) {
      return json({ ok: false, error: 'bad_phone' });
    }

    // --- CV -> Drive ---
    var cvUrl = '', cvName = '';
    if (d.cv && d.cv.data) {
      var bytes = Utilities.base64Decode(d.cv.data);
      if (bytes.length > MAX_CV_BYTES) {
        return json({ ok: false, error: 'cv_too_large' });
      }
      cvName = safeName(d.fullname) + '_' + stamp() + '.pdf';
      var blob = Utilities.newBlob(bytes, 'application/pdf', cvName);
      var file = folder().createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      cvUrl = file.getUrl();
    }

    // --- Ghi vào Sheet ---
    var sh = sheet();
    sh.appendRow([
      new Date(),
      String(d.fullname).trim(),
      "'" + String(d.phone).trim(),   // dấu ' giữ số 0 đầu, không bị Sheet cắt
      String(d.email).trim(),
      String(d.university).trim(),
      ADVISOR[d.advisor] || d.advisor || '',
      OFFER[d.offer] || d.offer || '',
      ASSURANCE[d.assurance_status] || d.assurance_status || '',
      cvUrl,
      cvName,
      String(d.source || '').slice(0, 300)
    ]);

    if (NOTIFY_EMAIL) {
      try {
        MailApp.sendEmail(
          NOTIFY_EMAIL,
          'Đăng ký mới: ' + d.fullname + ' — BISC Audit Simulation 2026',
          [d.fullname, d.phone, d.email, d.university, cvUrl].join('\n')
        );
      } catch (ignore) {}
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json({ ok: true, service: 'bisc-registration', ts: new Date().toISOString() });
}

/* ====== HELPERS ====== */

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#092C3B')
      .setFontColor('#FFC000');
    sh.setFrozenRows(1);
    sh.setColumnWidth(2, 180);
    sh.setColumnWidth(4, 220);
    sh.setColumnWidth(5, 220);
    sh.setColumnWidth(9, 260);
  }
  return sh;
}

function folder() {
  var it = DriveApp.getFoldersByName(DRIVE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER);
}

function safeName(s) {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'CV';
}

function stamp() {
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd-HHmmss');
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* Chạy hàm này 1 lần trong editor để tạo sẵn header + folder và
   để Google hỏi quyền trước khi deploy (tuỳ chọn). */
function setupOnce() {
  sheet();
  folder();
  Logger.log('OK — sheet "%s" và folder "%s" đã sẵn sàng.', SHEET_NAME, DRIVE_FOLDER);
}
