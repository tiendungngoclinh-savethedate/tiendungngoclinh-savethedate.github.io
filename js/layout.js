/* Bố cục hai section ảnh (vườn + veil) theo trang Canva.
   Canva không co các khối này theo một tỉ lệ duy nhất: ở điện thoại và máy tính bảng, kích thước ảnh theo bề rộng
   nhưng khoảng cách dọc, chiều cao section, lề chữ và cỡ ảnh nền đổi theo đường cong riêng; từ ~1095px mới quay lại
   tỉ lệ thuần (u = bề rộng / 1265, trần 1,08). Các số dưới đây đo từ Canva ở nhiều bề rộng rồi nội suy tuyến tính. */

const DESIGN_H = 1595.5;   // chiều cao thiết kế của mỗi section (đơn vị u)
const GARDEN_M3 = 171.2;   // lề chữ "Eternally his" ở bố cục máy tính (u)
const BG_GARDEN_W = 2400;  // ảnh nền vườn ở bố cục máy tính (u)
const BASE_W = 1265;
const MAX_U = 1.08;
export const R3_MIN_W = 1095;

// W | uG | offG | hoffG | uV | offV | hoffV | lề chữ | rộng ảnh nền vườn
// u: px cho mỗi đơn vị thiết kế · off: độ lệch dọc của nội dung · hoff: phần chiều cao cộng thêm ngoài DESIGN_H·u
const TABLE = [
  [320, 0.26105, 37.0, 82.3, 0.26908, 107.8, 233.5, 25.6, 1954.5],
  [375, 0.30898, 36.5, 81.1, 0.31529, 106.7, 231.1, 30.0, 2051.3],
  [414, 0.34109, 36.0, 80.0, 0.3483, 104.9, 226.9, 33.1, 2108.5],
  [520, 0.42834, 33.5, 74.6, 0.43729, 97.2, 210.7, 41.6, 2230.5],
  [560, 0.45672, 32.7, 72.6, 0.46633, 94.5, 204.7, 44.8, 2267.0],
  [580, 0.4779, 31.7, 70.4, 0.48772, 91.7, 198.6, 46.4, 2283.8],
  [600, 0.4893, 31.4, 69.8, 0.4996, 90.6, 196.3, 48.0, 2299.7],
  [700, 0.57678, 27.4, 60.8, 0.58886, 78.6, 170.1, 56.0, 2368.0],
  [785, 0.65705, 23.4, 52.1, 0.66675, 67.0, 145.1, 59.6, 2414.6],
  [884, 0.76082, 17.6, 39.3, 0.76367, 51.5, 111.5, 60.7, 2459.3],
  [970, 0.85156, 12.4, 27.6, 0.84816, 37.4, 81.1, 61.5, 2491.6],
  [1070, 0.94788, 6.9, 15.2, 0.93715, 22.5, 48.8, 62.3, 2523.5],
  [1090, 0.96882, 5.6, 12.4, 0.95669, 19.0, 41.4, 62.4, 2529.3],
];
const COLS = TABLE[0].length;

/* Section veil của nhà gái: bốn khung ảnh dọc 2:3 (ảnh lớn bên trái + ba ảnh xếp dọc bên phải), đo từ Canva nhà gái.
   Cùng hệ đơn vị u với section vườn. Chỉ lề trên G (px) thay đổi phi tuyến theo bề rộng, còn lại là bội số của u. */
const VEIL_G = [[320, 64.7], [390, 68.8], [425, 70.4], [520, 73.9], [715, 78.7], [885, 81.5], [970, 82.5], [1075, 83.6]];
// rộng ảnh nền veil (px) ở bố cục điện thoại / máy tính bảng
const VEIL_BGW = [[320, 1171.1], [390, 1242.9], [425, 1272.3], [520, 1336.5], [715, 1424.3], [885, 1473.9], [970, 1493], [1075, 1513], [1095, 1517]];
const VEIL_BG_RATIO = 1.5037; // cao / rộng của ảnh nền
const VEIL_BG_LEFT = 0.4723;  // tâm ảnh nền lệch trái so với tâm khung: left = W/2 − 0,4723·rộng

/** Nội suy tuyến tính mọi cột của bảng tại bề rộng W (kẹp ở hai đầu). */
function row(W) {
  const last = TABLE[TABLE.length - 1];
  if (W >= last[0]) return last;
  const i = TABLE.findIndex((r) => r[0] > W);
  const a = TABLE[i - 1];
  const b = TABLE[i];
  const t = (W - a[0]) / (b[0] - a[0]);
  return Array.from({ length: COLS }, (_, c) => a[c] + (b[c] - a[c]) * t);
}


/** Nội suy tuyến tính bảng [[W, giá trị]…] (kẹp ở hai đầu). */
function interp(table, W) {
  if (W <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (W >= last[0]) return last[1];
  const i = table.findIndex((r) => r[0] > W);
  const [w0, v0] = table[i - 1];
  const [w1, v1] = table[i];
  return v0 + ((v1 - v0) * (W - w0)) / (w1 - w0);
}

/** Dựng thông số veil: x tính bằng u so với tâm khung, y/h tính bằng px. */
function veilBlock(u, G, h, bgw, tf, d) {
  return {
    u, h, bgw, tf, tx: d.tx, ty: d.ty(u, G),
    mx: d.mx, my: d.my(u, G), mw: d.mw, mh: d.mh,
    ax: d.ax, ay: G, aw: d.aw, ah: d.ah, by: d.by(u, G),
    cy: d.cy(u, G), cw: d.cw, ch: d.ch,
  };
}

const VEIL_TABLET = { tx: -404.1, ty: (u, G) => G - 61.4 * u, mx: -486.6, my: (u, G) => G + 99.5 * u, mw: 769.3, mh: 1156.9,
  ax: 185.9, aw: 294.5, ah: 442.9, by: (u, G) => G + 451.7 * u, cy: (u, G) => G + 903.8 * u, cw: 300.7, ch: 452.1 };
const VEIL_DESKTOP = { tx: -420.3, ty: (u) => 15.6 * u, mx: -506, my: (u) => 182.9 * u, mw: 799.9, mh: 1202.9,
  ax: 193.3, aw: 306.4, ah: 460.7, by: (u) => 549.1 * u, cy: (u) => 1019 * u, cw: 312.7, ch: 470.2 };

/** Bố cục máy tính: tỉ lệ thuần, khối 1265u căn giữa. */
function desktop(W) {
  const u = Math.min(MAX_U, W / BASE_W);
  const block = (W - BASE_W * u) / 2;
  const h = DESIGN_H * u;
  const bgw = W <= 1265 ? 1.1376 * W : 1439.1 + (W - 1265) * 0.9037;
  return {
    garden: { u, off: 0, h, m: block + GARDEN_M3 * u, bgw: BG_GARDEN_W * u },
    veil: veilBlock(u, 79.5 * u, 1566.9 * u, bgw, 1, VEIL_DESKTOP),
  };
}

/** Bố cục điện thoại / máy tính bảng: nội suy theo bảng đo. */
function tablet(W) {
  const k = W < TABLE[0][0] ? W / TABLE[0][0] : 1; // màn hình rất hẹp: co tỉ lệ
  const Wc = Math.max(W, TABLE[0][0]);
  const [, uG, offG, hoffG, uV, , , m, bgw] = row(Wc);
  const uv = uV * k;
  const G = interp(VEIL_G, Wc) * k;
  return {
    garden: { u: uG * k, off: offG * k, h: (hoffG + DESIGN_H * uG) * k, m: m * k, bgw: bgw * k },
    veil: veilBlock(uv, G, 2 * G + 1352 * uv, interp(VEIL_BGW, Wc) * k, 0.962, VEIL_TABLET),
  };
}

/** Thông số bố cục hai section ảnh ở bề rộng khung W (px). */
export function layoutFor(W) {
  return W >= R3_MIN_W ? desktop(W) : tablet(W);
}

const px = (v, d) => `${v.toFixed(d)}px`;

/** Đổi thông số của section vườn thành các biến CSS (chuỗi) để gán vào style. */
export function cssVars(s) {
  return { "--u": px(s.u, 5), "--off": px(s.off, 2), "--h": px(s.h, 2), "--m": px(s.m, 2), "--bgw": px(s.bgw, 2) };
}

/** Biến CSS của section veil: số không đơn vị là bội số của u, còn lại là px. */
export function veilVars(s) {
  const n = (v) => String(Math.round(v * 1000) / 1000);
  return {
    "--u": px(s.u, 5), "--h": px(s.h, 2), "--vbgw": px(s.bgw, 2), "--vtf": n(s.tf),
    "--vtx": n(s.tx), "--vty": px(s.ty, 2),
    "--vmx": n(s.mx), "--vmy": px(s.my, 2), "--vmw": n(s.mw), "--vmh": n(s.mh),
    "--vax": n(s.ax), "--vay": px(s.ay, 2), "--vaw": n(s.aw), "--vah": n(s.ah), "--vby": px(s.by, 2),
    "--vcy": px(s.cy, 2), "--vcw": n(s.cw), "--vch": n(s.ch),
  };
}

/** Gán biến bố cục cho hai section và cập nhật khi bề rộng khung đổi. */
export function initLayout(garden, veil) {
  if (!garden || !veil) return;
  const apply = () => {
    const W = garden.clientWidth;
    if (!W) return;
    const L = layoutFor(W);
    for (const [el, vars] of [[garden, cssVars(L.garden)], [veil, veilVars(L.veil)]]) {
      for (const [name, value] of Object.entries(vars)) el.style.setProperty(name, value);
    }
  };
  apply();
  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); };
  if (typeof ResizeObserver === "function") new ResizeObserver(schedule).observe(garden);
  else window.addEventListener("resize", schedule);
}
