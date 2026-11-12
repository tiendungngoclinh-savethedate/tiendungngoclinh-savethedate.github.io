import { WEDDING_AT, timeLeft, pad2 } from "./countdown.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Footer dùng chung ---------- */
const footerTpl = $("#footer-tpl");
$$("[data-footer]").forEach((slot) => slot.replaceWith(footerTpl.content.cloneNode(true)));

/* ---------- Router theo hash: #/ · #/invitation · #/details · #/story ---------- */
const ROUTES = { "": "envelope", "#/": "envelope", "#/invitation": "invitation", "#/details": "details", "#/story": "story" };
let revealObserver;

function show(name) {
  $$(".view").forEach((v) => (v.hidden = v.id !== `view-${name}`));
  window.scrollTo({ top: 0, behavior: "instant" });
  document.title = name === "envelope" ? "Thiệp mời · Tiến Dũng & Ngọc Linh · 29.11.2026" : document.title;
  observeReveals($(`#view-${name}`));
}

function route() {
  const name = ROUTES[location.hash] ?? "envelope";
  show(name);
}

function observeReveals(root) {
  const items = $$("[data-reveal]:not(.is-in)", root);
  if (reduceMotion || !("IntersectionObserver" in window)) return items.forEach((el) => el.classList.add("is-in"));
  revealObserver ??= new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); revealObserver.unobserve(e.target); } }),
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
  );
  items.forEach((el) => revealObserver.observe(el));
}

window.addEventListener("hashchange", route);
route();

/* ---------- Tải trước toàn bộ ảnh khi trình duyệt rảnh, để chuyển trang không bị trống ---------- */
const preloadAll = () => {
  const urls = new Set($$("img").map((i) => i.getAttribute("src")));
  urls.forEach((src) => { const im = new Image(); im.decoding = "async"; im.src = src; });
};
const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
window.addEventListener("load", () => idle(preloadAll));

/* ---------- Mở phong bì ---------- */
const envelope = $("#envelope-btn");
envelope.addEventListener("click", () => {
  if (envelope.classList.contains("is-open")) return;
  envelope.classList.add("is-open");
  setMusic(true); // bấm phong bì là thao tác của khách nên trình duyệt cho phát nhạc
  setTimeout(() => { location.hash = "#/invitation"; envelope.classList.remove("is-open"); }, reduceMotion ? 0 : 950);
});

/* ---------- Đếm ngược ---------- */
const units = Object.fromEntries($$("[data-unit]").map((el) => [el.dataset.unit, el]));
function tick() {
  const left = timeLeft(WEDDING_AT);
  for (const [key, el] of Object.entries(units)) {
    const text = key === "days" ? String(left[key]).padStart(2, "0") : pad2(left[key]);
    if (el.textContent !== text) el.textContent = text;
  }
}
tick();
setInterval(tick, 1000);

/* ---------- Sao chép số tài khoản ---------- */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    btn.textContent = "Đã chép ✓";
  } catch {
    btn.textContent = "Chép thủ công nhé";
  }
  setTimeout(() => (btn.textContent = "Sao chép"), 2000);
});

/* ---------- Nhạc nền (YouTube, chỉ phát khi bấm) ---------- */
const VIDEO_ID = "wa-V13gNSOw";
const musicBtns = $$("#music-btn, #music-fab");
const musicSlot = $("#music-slot");
let musicOn = false;

function setMusic(on) {
  musicOn = on;
  musicBtns.forEach((b) => {
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", on ? "Tắt nhạc" : "Bật nhạc");
  });
  if (on) {
    const f = document.createElement("iframe");
    f.title = "Nhạc nền";
    f.allow = "autoplay";
    f.src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&loop=1&playlist=${VIDEO_ID}&controls=0&playsinline=1`;
    musicSlot.replaceChildren(f);
  } else {
    musicSlot.replaceChildren();
  }
}
musicBtns.forEach((b) => b.addEventListener("click", () => setMusic(!musicOn)));

// Nút nhạc nổi chỉ hiện từ khi mở phong bì trở đi
const fab = $("#music-fab");
const syncFab = () => { fab.hidden = (ROUTES[location.hash] ?? "envelope") === "envelope"; };
window.addEventListener("hashchange", syncFab);
syncFab();

/* ---------- RSVP ---------- */
// Dán link Web app của Google Apps Script vào đây (xem apps-script/Code.gs). Để trống thì dùng Netlify Forms.
const SHEET_URL = "https://script.google.com/macros/s/AKfycbyJc9ri0d8jiA17Cfwx4OL0PIHC6A_udO1l_7lIGl-MyXRfJYbNDJlXhtDDv4pZeEUU/exec";
const dialog = $("#rsvp");
const form = $("#rsvp-form");
const msg = $("#rsvp-msg");

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-open-rsvp]")) { msg.textContent = ""; msg.classList.remove("is-error"); dialog.showModal(); }
  if (e.target.closest("[data-close-rsvp]") || e.target === dialog) dialog.close();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submit = $("button[type=submit]", form);
  submit.disabled = true;
  msg.classList.remove("is-error");
  msg.textContent = "Đang gửi…";
  try {
    const body = new URLSearchParams(new FormData(form)).toString();
    if (SHEET_URL) {
      // Google Apps Script không trả CORS nên dùng no-cors: lỗi mạng sẽ throw, còn gửi được thì coi là thành công
      await fetch(SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    } else {
      const res = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }
    msg.textContent = "Cảm ơn bạn! Chúng mình đã nhận được xác nhận ♥";
    form.reset();
    setTimeout(() => dialog.close(), 2200);
  } catch (err) {
    console.error("RSVP failed", err);
    msg.classList.add("is-error");
    msg.textContent = "Chưa gửi được, bạn thử lại hoặc nhắn trực tiếp cho chúng mình nhé.";
  } finally {
    submit.disabled = false;
  }
});
