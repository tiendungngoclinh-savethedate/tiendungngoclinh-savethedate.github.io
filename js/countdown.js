// Ngày giờ lễ cưới: 10:00 Chủ nhật 29/11/2026 (giờ Việt Nam, UTC+7)
export const WEDDING_AT = Date.parse("2026-11-29T10:00:00+07:00");

/** Tính thời gian còn lại; trả về toàn 0 khi đã qua giờ cưới. */
export function timeLeft(target, now = Date.now()) {
  const total = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export const pad2 = (n) => String(n).padStart(2, "0");
