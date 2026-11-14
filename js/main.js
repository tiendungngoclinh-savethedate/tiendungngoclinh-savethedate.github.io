import { WEDDING_AT, timeLeft, pad2 } from "./countdown.js";
import { fetchWishes, normalizeWishes, splitRows, wishCard } from "./wishes.js";
import { applyNoOrphan, observeNoOrphan } from "./typography.js";
import { initLightbox } from "./lightbox.js";
import { initLayout } from "./layout.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Footer dùng chung ---------- */
const footerTpl = $("#footer-tpl");
$$("[data-footer]").forEach((slot) => slot.replaceWith(footerTpl.content.cloneNode(true)));

/* Chống mồ côi chữ ở mọi đoạn văn (làm trước hiệu ứng gõ chữ để NBSP được giữ lại) */
applyNoOrphan(document.body);
observeNoOrphan(document.body);

/* Bố cục hai section ảnh (vườn + veil) theo Canva: gán --u, --off, --h… theo bề rộng khung */
initLayout($(".sec--garden"), $(".sec--veil"));

/* Chạm 4 ảnh vườn để xem phóng to */
initLightbox($$(".sec--garden .g"), $("#lightbox"));

/* ---------- Router theo hash: #/ · #/invitation · #/details · #/story ---------- */
const ROUTES = { "": "envelope", "#/": "envelope", "#/invitation": "invitation", "#/details": "details", "#/story": "story" };
let revealObserver;

// Hiệu ứng xuất hiện kiểu Canva ([data-fx]): kích hoạt khi cuộn tới, độ trễ/thời lượng đặt bằng --dl/--dur trong CSS
let fxObserver;

// Hiệu ứng "gõ chữ" của Canva: tách từng ký tự, hiện lần lượt từ trái sang phải; mỗi dòng (<br>) bắt đầu sau khi dòng trước xong.
// Chỉ số --i của từng ký tự nhân với --ty-step trong CSS để ra độ trễ.
function splitTyping(el) {
  if (el.dataset.typed) return;
  el.dataset.typed = "1";
  const label = [...el.childNodes].map((n) => (n.nodeName === "BR" ? " " : n.textContent)).join("").replace(/\s+/g, " ").trim();
  const wrap = document.createElement("span");
  wrap.setAttribute("aria-hidden", "true");
  let i = 0;
  el.childNodes.forEach((node) => {
    if (node.nodeName === "BR") {
      i += 6; // nghỉ một nhịp giữa hai dòng
      wrap.append(document.createElement("br"));
      return;
    }
    (node.textContent.match(/[^ \t\r\n]+|[ \t\r\n]+/g) ?? []).forEach((chunk) => { // NBSP nằm trong "từ" nên 2 từ cuối vẫn dính nhau
      if (/^[ \t\r\n]/.test(chunk)) return wrap.append(" ");
      const word = document.createElement("span");
      word.className = "ty-w";
      [...chunk].forEach((ch) => {
        const c = document.createElement("span");
        c.className = "ty-c";
        c.style.setProperty("--i", i++);
        c.textContent = ch;
        word.append(c);
      });
      wrap.append(word);
    });
  });
  el.setAttribute("aria-label", label);
  el.replaceChildren(wrap);
}

function observeFx(root) {
  $$('[data-fx="type"]:not([data-typed])', root).forEach(splitTyping);
  const items = $$("[data-fx]:not(.fx-in)", root);
  if (reduceMotion || !("IntersectionObserver" in window)) return items.forEach((el) => el.classList.add("fx-in"));
  // Phần tử có data-fx-group chạy cùng nhau (nối tiếp theo --dl) ngay khi cả khối .sec vào màn, như Canva
  fxObserver ??= new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const group = e.target.matches(".sec, .detail") ? $$("[data-fx-group]", e.target) : [e.target];
      group.forEach((el) => el.classList.add("fx-in"));
      fxObserver.unobserve(e.target);
    }),
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );
  items.forEach((el) => fxObserver.observe(el.hasAttribute("data-fx-group") ? el.closest(".sec, .detail") : el));
}

/* Trang "Thông tin lễ cưới": mỗi khối .detail hiện lần lượt từng dòng (trồi lên, icon phóng nhẹ) như hiệu ứng Canva */
function prepareDetailFx() {
  $$("#view-details .detail").forEach((d) => {
    d.toggleAttribute("data-reveal", false);
    [...d.children].forEach((c, i) => {
      c.dataset.fx = c.matches(".detail__icon") ? "zoom" : "rise";
      c.setAttribute("data-fx-group", "");
      c.style.setProperty("--dl", `${Math.min(i * 0.1, 1).toFixed(2)}s`);
    });
  });
}
prepareDetailFx();

function show(name) {
  $$(".view").forEach((v) => (v.hidden = v.id !== `view-${name}` && !v.classList.contains("is-leaving")));
  window.scrollTo({ top: 0, behavior: "instant" });
  document.title = name === "envelope" ? "Thiệp mời · Tiến Dũng & Ngọc Linh · 29.11.2026" : document.title;
  observeReveals($(`#view-${name}`));
  observeFx($(`#view-${name}`));
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
  const urls = new Set($$("img").map((i) => i.getAttribute("src")).filter(Boolean)); // ảnh popup xem ảnh chưa có src
  urls.forEach((src) => { const im = new Image(); im.decoding = "async"; im.src = src; });
};
const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
window.addEventListener("load", () => idle(preloadAll));

/* ---------- Mở phong bì ---------- */
const envelope = $("#envelope-btn");
const envelopeView = $("#view-envelope");
envelope.addEventListener("pointerenter", preloadAll, { once: true }); // rê chuột vào là bắt đầu tải sẵn ảnh trang sau
envelope.addEventListener("click", () => {
  if (envelope.classList.contains("is-open")) return;
  envelope.classList.add("is-open");
  setMusic(true); // bấm phong bì là thao tác của khách nên trình duyệt cho phát nhạc
  preloadAll();
  if (reduceMotion) { location.hash = "#/invitation"; envelope.classList.remove("is-open"); return; }
  // Chuyển trang sớm và giao thoa: phong bì mờ dần phủ lên trang thiệp đang hiện ra, không còn khoảng trống chờ
  setTimeout(() => {
    envelopeView.classList.add("is-leaving");
    location.hash = "#/invitation";
    setTimeout(() => {
      envelopeView.classList.remove("is-leaving");
      envelope.classList.remove("is-open");
      if ((ROUTES[location.hash] ?? "envelope") !== "envelope") envelopeView.hidden = true;
    }, 650);
  }, 380);
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

/* ---------- Nhạc nền (file MP3, chỉ phát khi bấm) ---------- */
const fab = $("#music-fab");
const music = new Audio("assets/audio/a-thousand-years.mp3"); // Brooklyn Duo – A Thousand Years (wedding version)
music.loop = true;
music.preload = "none";
let musicOn = false;
// Tải sẵn nhạc ngay khi trang rảnh (trước cả khi ảnh các trang sau được tải), để bấm phong bì là có tiếng liền, không phải chờ tải ~4,8MB
window.addEventListener("load", () => idle(() => { if (!musicOn) { music.preload = "auto"; music.load(); } }));

function renderMusic(on) {
  musicOn = on;
  fab.setAttribute("aria-pressed", String(on));
  fab.setAttribute("aria-label", on ? "Tắt nhạc" : "Bật nhạc");
  $$("[data-play-music]").forEach((b) => { b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Tắt nhạc" : "Bật nhạc"); });
}

function setMusic(on) {
  if (on === musicOn) return;
  renderMusic(on);
  if (on) {
    // Trình duyệt từ chối phát (ví dụ chưa có thao tác của khách) thì trả nút về trạng thái tắt
    music.play().catch(() => renderMusic(false));
  } else {
    music.pause();
  }
}
fab.addEventListener("click", () => setMusic(!musicOn));
$$("[data-play-music]").forEach((b) => b.addEventListener("click", () => setMusic(!musicOn)));

// Nút nhạc nổi chỉ hiện từ khi mở phong bì trở đi
const giftFab = $("#gift-fab");
const giftDialog = $("#gift-dialog");
const syncFab = () => { const hide = (ROUTES[location.hash] ?? "envelope") === "envelope"; fab.hidden = hide; giftFab.hidden = hide; };
document.addEventListener("click", (e) => { if (e.target.closest("[data-open-gift]") && !giftDialog.open) giftDialog.showModal(); }); // nút nổi và hộp quà trong trang đều mở cùng một hộp thoại
giftDialog.addEventListener("click", (e) => { if (e.target.closest("[data-close-gift]") || e.target === giftDialog) giftDialog.close(); });
// Nút "Sao chép số tài khoản": ghi vào clipboard, đổi chữ nút 2 giây để báo đã chép
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  const text = btn.dataset.copy;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    (btn.closest("dialog") ?? document.body).appendChild(ta); ta.select(); // trong hộp thoại modal thì gắn vào chính hộp thoại
    try { document.execCommand("copy"); } finally { ta.remove(); }
  }
  const label = btn.textContent;
  btn.textContent = btn.dataset.copyDone || "ĐÃ SAO CHÉP";
  setTimeout(() => { btn.textContent = label; }, 2000);
});
window.addEventListener("hashchange", syncFab);
syncFab();

/* ---------- RSVP ---------- */
// Dán link Web app của Google Apps Script vào đây (xem apps-script/Code.gs). Để trống thì dùng Netlify Forms.
const SHEET_URL = "https://script.google.com/macros/s/AKfycby4IYyMTYskCWZkB9gGIc2XcC_V2wR7sVb_hZc2auM69o_CYO4TYsRKNmsvy93x4BCB/exec";
// Hai biểu mẫu riêng: "Xác nhận tham dự" (có đến không, số người, lời chúc tuỳ chọn) và "Gửi lời chúc" (chỉ tên + lời chúc)
const forms = [
  { key: "rsvp", dialog: $("#rsvp"), form: $("#rsvp-form"), msg: $("#rsvp-msg"), thanks: "Cảm ơn bạn! Chúng mình đã nhận được xác nhận ♥" },
  { key: "wish", dialog: $("#wish"), form: $("#wish-form"), msg: $("#wish-msg"), thanks: "Cảm ơn bạn! Chúng mình đã nhận được lời chúc ♥" },
];

document.addEventListener("click", (e) => {
  for (const f of forms) {
    if (e.target.closest(`[data-open-${f.key}]`)) { f.msg.textContent = ""; f.msg.classList.remove("is-error"); f.dialog.showModal(); }
    if (e.target.closest(`[data-close-${f.key}]`) || e.target === f.dialog) f.dialog.close();
  }
});

/* Gửi lời chúc: báo "cảm ơn" và hiện thẻ của khách ngay (Apps Script trả lời mất ~1,5–3 giây), việc gửi chạy ngầm.
   Rớt mạng thì tự thử lại; vẫn chưa được thì lưu trong máy và gửi lại ở lần mở trang sau / khi có mạng. */
const PENDING_KEY = "wedding-wishes-pending";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]"); } catch { return []; } };
const writePending = (list) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch { /* bộ nhớ bị chặn: bỏ qua */ } };

async function postWish(body) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (SHEET_URL) {
    // Google Apps Script không trả CORS nên dùng no-cors: lỗi mạng sẽ throw, còn gửi được thì coi là thành công
    await fetch(SHEET_URL, { method: "POST", mode: "no-cors", keepalive: true, headers, body });
    return;
  }
  const res = await fetch("/", { method: "POST", keepalive: true, headers, body });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function deliver(body, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { await postWish(body); return true; } catch (err) {
      console.error("Gửi lời chúc chưa được", err);
      if (i < tries - 1) await sleep(1000 * 2 ** i);
    }
  }
  return false;
}

let flushing = false;
async function flushPending() {
  if (flushing) return;
  flushing = true;
  try {
    const queue = readPending();
    writePending([]);
    for (const body of queue) if (!(await deliver(body, 1))) writePending([...readPending(), body]);
  } finally { flushing = false; }
}
addEventListener("online", flushPending);

for (const { form, dialog, msg, thanks } of forms) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const submit = $("button[type=submit]", form);
    const data = new FormData(form);
    const body = new URLSearchParams(data).toString();
    submit.disabled = true; // tránh bấm hai lần trong lúc hộp thoại chưa đóng
    msg.classList.remove("is-error");
    msg.textContent = thanks;
    showOwnWish(String(data.get("ten") ?? ""), String(data.get("loi-chuc") ?? "")); // xác nhận không kèm lời chúc thì không có thẻ để hiện
    form.reset();
    deliver(body).then((ok) => { if (!ok) writePending([...readPending(), body]); });
    setTimeout(() => { dialog.close(); submit.disabled = false; }, 1600);
  });
}

/* ---------- Lời chúc: đọc từ Google Sheet ---------- */
// Ít lời chúc → xếp lưới tĩnh. Nhiều → tự trôi ngang (2 hàng ngược chiều), rê chuột/chạm để dừng, "Xem tất cả" mở hộp cuộn.
const STATIC_MAX = 5;      // từng này lời chúc trở xuống thì không cần chạy tự động
const TWO_ROWS_FROM = 10;  // từ đây trở lên chạy 2 hàng (chỉ trên màn rộng)
const wideScreen = matchMedia("(min-width: 700px)");
const SECONDS_PER_CARD = 7;
const wishesSec = $("#wishes");
const wishesList = $("#wishes-list");
const wishesMarquee = $("#wishes-marquee");
const wishesAllBtn = $("#wishes-all-btn");
const wishesDialog = $("#wishes-dialog");
let wishes = [];

function marqueeRow(items) {
  const row = document.createElement("div");
  row.className = "marquee__row";
  row.style.setProperty("--dur", `${Math.max(30, items.length * SECONDS_PER_CARD)}s`);
  const track = document.createElement("ul");
  track.className = "marquee__track";
  const copy = (hidden) => items.map((w, i) => { const li = wishCard(w, i); if (hidden) li.setAttribute("aria-hidden", "true"); return li; });
  track.append(...copy(false), ...copy(true)); // hai bản giống hệt để vòng lặp liền mạch
  row.append(track);
  return row;
}

// Thiệp chỉ bay vào khi cuộn tới (nếu không, hiệu ứng chạy lúc trang vừa tải khi khách chưa nhìn thấy)
let wishObserver;
function revealWishCards(cards) {
  if (reduceMotion || !("IntersectionObserver" in window)) return cards.forEach((c) => c.classList.add("is-in"));
  wishObserver ??= new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); wishObserver.unobserve(e.target); } }),
    { threshold: 0.2 },
  );
  cards.forEach((c) => wishObserver.observe(c));
}

function renderWishes() {
  const n = wishes.length;
  const auto = n > STATIC_MAX && !reduceMotion;
  wishesMarquee.hidden = !auto;
  wishesList.hidden = auto;
  wishesAllBtn.hidden = n <= STATIC_MAX;
  wishesMarquee.replaceChildren();
  wishesList.replaceChildren();
  if (auto) {
    // Điện thoại chỉ 1 hàng (gọn hơn, thẻ rộng hơn để đọc); màn rộng mới chia 2 hàng ngược chiều
    wishesMarquee.append(...splitRows(wishes, n >= TWO_ROWS_FROM && wideScreen.matches ? 2 : 1).map(marqueeRow));
  } else {
    wishesList.append(...wishes.slice(0, STATIC_MAX + 1).map((w, i) => wishCard(w, i)));
    revealWishCards($$(".wish", wishesList));
  }
  if (auto) { wishesMarquee.setAttribute("data-reveal", ""); wishesMarquee.classList.remove("is-in"); observeReveals(wishesSec); }
}

wideScreen.addEventListener("change", () => { if (wishes.length) renderWishes(); }); // xoay máy / đổi cỡ cửa sổ thì chia lại hàng

async function loadWishes() {
  if (!SHEET_URL) return;
  try {
    wishes = await fetchWishes(SHEET_URL);
  } catch (err) {
    console.error("Không tải được lời chúc", err);
    return; // lỗi mạng: giữ ẩn mục này, thiệp vẫn dùng bình thường
  }
  if (!wishes.length) $("#wishes-lead").textContent = "Hãy là người đầu tiên gửi lời chúc đến chúng mình ♥";
  wishesSec.hidden = false;
  renderWishes();
}

// Khách vừa gửi xong thì hiện luôn lời chúc của họ (Sheet cập nhật chậm hơn một nhịp)
function showOwnWish(name, message) {
  const [w] = normalizeWishes([{ name, message }]);
  if (!w || !SHEET_URL) return;
  wishes = [w, ...wishes];
  $("#wishes-lead").textContent = "Cảm ơn mọi người đã gửi những lời chúc đến chúng mình ♥";
  wishesSec.hidden = false;
  renderWishes();
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-open-wishes]")) {
    const all = wishes.map((w, i) => wishCard(w, i));
    all.forEach((c) => c.classList.add("is-in"));
    $("#wishes-all").replaceChildren(...all);
    wishesDialog.showModal();
  }
  if (e.target.closest("[data-close-wishes]") || e.target === wishesDialog) wishesDialog.close();
});
loadWishes();
flushPending(); // gửi nốt lời chúc còn kẹt từ lần trước (nếu có)

