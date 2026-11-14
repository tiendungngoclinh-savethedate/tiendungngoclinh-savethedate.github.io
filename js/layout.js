/* Bố cục hai section ảnh (vườn + veil) theo trang Canva.
   Canva không co các khối này theo một tỉ lệ duy nhất: ở điện thoại và máy tính bảng, kích thước ảnh theo bề rộng
   nhưng khoảng cách dọc, chiều cao section, lề chữ và cỡ ảnh nền đổi theo đường cong riêng; từ ~1095px mới quay lại
   tỉ lệ thuần (u = bề rộng / 1265, trần 1,08). Các số dưới đây đo từ Canva ở nhiều bề rộng rồi nội suy tuyến tính. */

const DESIGN_H = 1595.5;   // chiều cao thiết kế của mỗi section (đơn vị u)
const GARDEN_M3 = 171.2;   // lề chữ "Eternally his" ở bố cục máy tính (u)
const VEIL_M3 = 113.2;     // lề tiêu đề "We decided on forever!" ở bố cục máy tính (u)
const BG_GARDEN_W = 2400;  // ảnh nền vườn ở bố cục máy tính (u)
const VEIL_SHIFT = 19.8;   // cụm ảnh veil lệch sang phải so với bố cục máy tính (u)
const BASE_W = 1265;
const MAX_U = 1.08;
const CS_DESKTOP = 410.9;  // ô vuông thứ ba của veil ở bố cục máy tính
const CS_TABLET = 407.8;   // …ở máy tính bảng (từ ~590px)
const CS_SMALL = 378.7;    // …và ở khổ điện thoại hẹp (bằng hai ô trên)
const CS_BREAK_W = 590;
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

/** Bố cục máy tính: tỉ lệ thuần, khối 1265u căn giữa. */
function desktop(W) {
  const u = Math.min(MAX_U, W / BASE_W);
  const block = (W - BASE_W * u) / 2;
  const h = DESIGN_H * u;
  return {
    garden: { u, off: 0, h, m: block + GARDEN_M3 * u, bgw: BG_GARDEN_W * u },
    veil: { u, off: 0, h, m: block + VEIL_M3 * u, sv: 0, cs: CS_DESKTOP },
  };
}

/** Bố cục điện thoại / máy tính bảng: nội suy theo bảng đo. */
function tablet(W) {
  const k = W < TABLE[0][0] ? W / TABLE[0][0] : 1; // màn hình rất hẹp: co tỉ lệ
  const [, uG, offG, hoffG, uV, offV, hoffV, m, bgw] = row(Math.max(W, TABLE[0][0]));
  return {
    garden: { u: uG * k, off: offG * k, h: (hoffG + DESIGN_H * uG) * k, m: m * k, bgw: bgw * k },
    veil: {
      u: uV * k,
      off: offV * k,
      h: (hoffV + DESIGN_H * uV) * k,
      m: m * k,
      sv: VEIL_SHIFT * uV * k,
      cs: W >= CS_BREAK_W ? CS_TABLET : CS_SMALL,
    },
  };
}

/** Thông số bố cục hai section ảnh ở bề rộng khung W (px). */
export function layoutFor(W) {
  return W >= R3_MIN_W ? desktop(W) : tablet(W);
}

const px = (v, d) => `${v.toFixed(d)}px`;

/** Đổi thông số của một section thành các biến CSS (chuỗi) để gán vào style. */
export function cssVars(s) {
  const vars = { "--u": px(s.u, 5), "--off": px(s.off, 2), "--h": px(s.h, 2), "--m": px(s.m, 2) };
  if ("bgw" in s) vars["--bgw"] = px(s.bgw, 2);
  if ("sv" in s) vars["--sv"] = px(s.sv, 3);
  if ("cs" in s) vars["--cs"] = String(s.cs);
  return vars;
}

/** Gán biến bố cục cho hai section và cập nhật khi bề rộng khung đổi. */
export function initLayout(garden, veil) {
  if (!garden || !veil) return;
  const apply = () => {
    const W = garden.clientWidth;
    if (!W) return;
    const L = layoutFor(W);
    for (const [el, s] of [[garden, L.garden], [veil, L.veil]]) {
      for (const [name, value] of Object.entries(cssVars(s))) el.style.setProperty(name, value);
    }
  };
  apply();
  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); };
  if (typeof ResizeObserver === "function") new ResizeObserver(schedule).observe(garden);
  else window.addEventListener("resize", schedule);
}
