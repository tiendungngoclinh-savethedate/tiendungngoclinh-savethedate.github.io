/* Sự kiện lễ cưới → file .ics (iPhone/Android/Outlook) và link Google Calendar. */
export const EVENT = Object.freeze({
  uid: "tiendung-ngoclinh-20261129@dung-linh-wedding",
  title: "Lễ cưới Tiến Dũng & Ngọc Linh",
  description: "Tiệc cưới lúc 10:00 (giờ Việt Nam). Trân trọng kính mời bạn đến dự tiệc cưới của Tiến Dũng và Ngọc Linh. Thiệp mời: https://tiendungngoclinh-savethedate.io.vn",
  location: "Nhà văn hoá Tổ dân phố 12, Đường Mậu Lương, Phường Kiến Hưng, Hà Nội",
  start: Date.parse("2026-11-29T10:00:00+07:00"),
  end: Date.parse("2026-11-29T13:00:00+07:00"),
});

export const TZID = "Asia/Ho_Chi_Minh";

/** ms → "YYYYMMDDTHHMMSS" theo giờ Việt Nam (UTC+7, không có giờ mùa hè) */
export function toVnStamp(ms) {
  return new Date(ms + 7 * 3600_000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "");
}

/** ms → "YYYYMMDDTHHMMSSZ" (UTC) */
export function toUtcStamp(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const escapeText = (s) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const utf8Length = (ch) => new TextEncoder().encode(ch).length; // chạy được cả ở trình duyệt (không cần Buffer của Node)

/** Gập dòng theo RFC 5545: tối đa 75 byte/dòng, dòng nối tiếp bắt đầu bằng 1 dấu cách; không cắt giữa ký tự UTF-8. */
function fold(line) {
  const out = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = utf8Length(ch);
    const limit = out.length === 0 ? 75 : 74; // dòng nối tiếp tốn 1 byte cho dấu cách đầu dòng
    if (bytes + n > limit) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.map((l, i) => (i === 0 ? l : ` ${l}`));
}

export function buildIcs(ev, dtstamp = toUtcStamp(Date.now())) {
  // Dùng giờ UTC và bỏ khối múi giờ/METHOD: bản tối giản nhất, iPhone (Safari) và Apple Lịch đọc chắc chắn, Outlook/Android cũng đọc được.
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tien Dung & Ngoc Linh//Wedding//VI",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toUtcStamp(ev.start)}`,
    `DTEND:${toUtcStamp(ev.end)}`,
    "STATUS:CONFIRMED",
    `SUMMARY:${escapeText(ev.title)}`,
    `DESCRIPTION:${escapeText(ev.description)}`,
    `LOCATION:${escapeText(ev.location)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-P1D",
    `DESCRIPTION:${escapeText(ev.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.flatMap(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(ev) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${toVnStamp(ev.start)}/${toVnStamp(ev.end)}`,
    ctz: TZID,
    details: ev.description,
    location: ev.location,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** "ios" | "android" | "other". iPadOS mới tự nhận là Macintosh nhưng có màn hình cảm ứng. */
export function detectPlatform(userAgent, maxTouchPoints = 0) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

/** Trình duyệt tích hợp trong app (Messenger/Facebook/Zalo/Instagram/Line/TikTok...) không mở được file lịch .ics. */
export function isInAppBrowser(userAgent) {
  return /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Zalo|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat/i.test(userAgent);
}
