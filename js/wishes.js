/* Sổ lời chúc: đọc từ Google Sheet (Apps Script ?action=wishes) và vẽ thành các tấm thiệp nhỏ. */
import { keepTailTogether } from "./typography.js";
export { keepTailTogether };

const NAME_MAX = 80;
const TEXT_MAX = 400;

/** Làm sạch dữ liệu từ ngoài vào: chỉ giữ {name, message} dạng chuỗi, cắt độ dài. */
export function normalizeWishes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((w) => {
    if (!w || typeof w.name !== "string" || typeof w.message !== "string") return [];
    const name = w.name.trim().slice(0, NAME_MAX);
    const message = w.message.trim().slice(0, TEXT_MAX);
    return name && message ? [{ name, message }] : [];
  });
}

export async function fetchWishes(sheetUrl, signal) {
  const res = await fetch(`${sheetUrl}?action=wishes`, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data?.ok ? normalizeWishes(data.wishes) : [];
}

/** Vẽ một tấm thiệp. Chỉ dùng textContent nên nội dung khách nhập không thể chèn HTML. */
export function wishCard({ name, message }, index) {
  const li = document.createElement("li");
  li.className = "wish";
  li.style.setProperty("--i", String(index % 9));
  const text = document.createElement("p");
  text.className = "wish__text";
  text.textContent = keepTailTogether(message);
  const by = document.createElement("p");
  by.className = "wish__by";
  by.textContent = name;
  li.append(text, by); // lời chúc trước, tên ký ở cuối (như một tấm thiệp lưu bút)
  return li;
}

/** Chia danh sách vào `rows` hàng theo kiểu xoay vòng, giữ thứ tự mới → cũ trong từng hàng. */
export function splitRows(list, rows) {
  const out = Array.from({ length: Math.max(1, rows) }, () => []);
  list.forEach((item, i) => out[i % out.length].push(item));
  return out;
}
