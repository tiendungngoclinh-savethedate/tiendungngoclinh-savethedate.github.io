/* Chống "mồ côi chữ": dòng cuối của mọi đoạn văn không bao giờ chỉ còn đúng 1 từ (cụt nghĩa).
   Cách làm: dính 2 từ cuối bằng khoảng trắng không ngắt (NBSP) nên chúng luôn xuống dòng cùng nhau. */
const NBSP = " ";
const MAX_PAIR = 24; // 2 từ cuối dài hơn mức này thì thôi, tránh làm tràn ngang ở màn hẹp
const WORD = /[^\s ]+/g;

export function wordCount(text) {
  return (text.match(WORD) ?? []).length;
}

const glue = (m, a, b, tail) => (a.length + 1 + b.length > MAX_PAIR ? m : `${a}${NBSP}${b}${tail}`);

/** Cho chữ giữ xuống dòng (white-space: pre-line): xử lý riêng từng dòng. */
export function keepTailTogether(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/([^\s ]+)[ \t]+([^\s ]+)(\s*)$/, glue))
    .join("\n");
}

/** Cho chữ chảy tự do (HTML thường): xuống dòng trong mã nguồn không có nghĩa nên chỉ xử lý 2 từ cuối của cả đoạn.
 *  Đoạn dưới 3 từ để nguyên (ép 2 từ không xuống dòng được có thể tràn khung). */
export function glueTail(text) {
  if (wordCount(text) < 3) return text;
  return text.replace(/([^\s ]+)\s+([^\s ]+)(\s*)$/, glue);
}

/* ---------- Áp dụng lên DOM ---------- */
const SKIP = "script,style,textarea,pre,code,svg,template,noscript,select,[data-no-orphan]";
const BLOCKISH = new Set(["P", "DIV", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6", "SECTION", "ARTICLE", "HEADER", "FOOTER", "FIGURE", "FIGCAPTION", "BUTTON", "A", "DIALOG", "LABEL", "TD", "TH", "DT", "DD", "BLOCKQUOTE", "MAIN", "NAV", "FORM", "BODY"]);

/** Text node này có nằm ở cuối một dòng/đoạn không (sau nó là hết khối hoặc <br>)? Gặp phần tử inline khác thì bỏ qua cho chắc. */
function endsLine(node) {
  let n = node;
  while (n) {
    let s = n.nextSibling;
    while (s && s.nodeType === 3 && !s.data.trim()) s = s.nextSibling;
    if (s) return s.nodeName === "BR";
    n = n.parentNode;
    if (!n || BLOCKISH.has(n.nodeName)) return true;
  }
  return true;
}

function processText(node) {
  const el = node.parentElement;
  if (!el || el.closest(SKIP)) return;
  const text = node.data;
  if (wordCount(text) < 3 || !endsLine(node)) return;
  const pre = getComputedStyle(el).whiteSpace.startsWith("pre");
  const next = pre ? keepTailTogether(text) : glueTail(text);
  if (next !== text) node.data = next;
}

export function applyNoOrphan(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
  nodes.forEach(processText);
}

/** Nội dung chèn vào sau (thẻ lời chúc, thông báo, footer...) cũng được xử lý tự động. */
export function observeNoOrphan(root = document.body) {
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") processText(r.target);
      else r.addedNodes.forEach((n) => (n.nodeType === 3 ? n.parentElement && processText(n) : n.nodeType === 1 && applyNoOrphan(n)));
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}
