/* Xem ảnh phóng to (lightbox) cho nhóm ảnh vườn: chạm ảnh → toàn màn hình, trước/sau, vuốt, phím mũi tên,
   và zoom (nút +/−, lăn chuột, chụm hai ngón, chạm đúp, kéo để xem các góc khi đã phóng). */

const SWIPE_MIN = 50;        // px: vuốt ngang tối thiểu để chuyển ảnh
const SWIPE_DOWN_MIN = 90;   // px: vuốt xuống tối thiểu để đóng
const SCALES = [1, 1.5, 2, 2.5, 3];
export const MIN_SCALE = SCALES[0];
export const MAX_SCALE = SCALES[SCALES.length - 1];
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_ZOOM = 2.5;

/** Chỉ số đi vòng tròn: -1 → ảnh cuối, n → ảnh đầu. */
export function wrapIndex(i, n) {
  return n > 0 ? ((i % n) + n) % n : 0;
}

/** Đổi cử chỉ vuốt (dx, dy tính bằng px) thành hành động; cử chỉ ngắn hoặc chéo mơ hồ thì bỏ qua. */
export function swipeAction(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax >= SWIPE_MIN && ax > ay * 1.5) return dx < 0 ? "next" : "prev";
  if (dy >= SWIPE_DOWN_MIN && ay > ax * 1.5) return "close";
  return null;
}

/** Nấc zoom kế tiếp (in/out), kể cả khi đang ở giá trị lẻ sau khi chụm hai ngón. */
export function nextScale(scale, dir) {
  if (dir === "in") return SCALES.find((s) => s > scale + 1e-6) ?? MAX_SCALE;
  return [...SCALES].reverse().find((s) => s < scale - 1e-6) ?? MIN_SCALE;
}

/** Kẹp độ dịch ảnh để mép ảnh không trượt vào trong khung; ở 100% ảnh luôn nằm giữa. */
export function clampPan(x, y, scale, w, h) {
  const maxX = Math.max(0, (w * scale - w) / 2);
  const maxY = Math.max(0, (h * scale - h) / 2);
  return { x: Math.max(-maxX, Math.min(maxX, x)) || 0, y: Math.max(-maxY, Math.min(maxY, y)) || 0 };
}

/* Độ dịch mới để điểm đang trỏ đứng yên khi đổi tỉ lệ.
   (vx, vy) = vị trí con trỏ so với tâm bố cục của ảnh (chưa tính độ dịch); phép biến đổi là translate(t) scale(s)
   quanh tâm nên điểm nội dung p thoả s·p + t = v → t' = t·(s'/s) + v·(1 − s'/s). */
export function focalPan(x, y, vx, vy, oldScale, newScale) {
  const r = newScale / oldScale;
  return { x: x * r + vx * (1 - r), y: y * r + vy * (1 - r) };
}

/** Tỉ lệ theo khoảng cách hai ngón tay lúc bắt đầu và hiện tại, kẹp trong 100–300%. */
export function pinchScale(startScale, startDist, dist) {
  if (!startDist) return startScale;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, startScale * (dist / startDist)));
}

export function initLightbox(photos, dialog) {
  if (!photos.length || !dialog) return;
  const img = dialog.querySelector(".lightbox__img");
  const count = dialog.querySelector(".lightbox__count");
  const stage = dialog.querySelector(".lightbox__stage");
  const level = dialog.querySelector(".lightbox__level");
  const btnIn = dialog.querySelector('[data-zoom="in"]');
  const btnOut = dialog.querySelector('[data-zoom="out"]');
  const n = photos.length;
  let index = 0;
  let scale = 1;
  let tx = 0;
  let ty = 0;

  const srcOf = (p) => p.currentSrc || p.src;
  const preload = (k) => { const im = new Image(); im.src = srcOf(photos[wrapIndex(k, n)]); };

  /* ---------- Zoom ---------- */
  function apply() {
    img.style.transform = scale === 1 && !tx && !ty ? "" : `translate(${tx}px, ${ty}px) scale(${scale})`;
    level.textContent = `${Math.round(scale * 100)}%`;
    btnIn.disabled = scale >= MAX_SCALE - 1e-6;
    btnOut.disabled = scale <= MIN_SCALE + 1e-6;
    dialog.classList.toggle("is-zoomed", scale > 1);
  }

  function setScale(next, vx = 0, vy = 0) {
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    const pan = focalPan(tx, ty, vx, vy, scale, s);
    scale = s;
    ({ x: tx, y: ty } = clampPan(pan.x, pan.y, scale, img.offsetWidth, img.offsetHeight));
    apply();
  }

  // Vị trí con trỏ so với tâm bố cục của ảnh (tâm đang hiển thị trừ đi độ dịch hiện tại)
  function offsetFromCenter(clientX, clientY) {
    const r = img.getBoundingClientRect();
    return { vx: clientX - (r.left + r.width / 2 - tx), vy: clientY - (r.top + r.height / 2 - ty) };
  }

  const resetZoom = () => { scale = 1; tx = 0; ty = 0; apply(); };
  const zoomBy = (dir) => setScale(nextScale(scale, dir));

  /* ---------- Hiển thị ảnh ---------- */
  function show(k) {
    index = wrapIndex(k, n);
    const p = photos[index];
    resetZoom();
    img.classList.add("is-loading");
    img.onload = () => img.classList.remove("is-loading");
    img.src = srcOf(p);
    if (img.complete && img.naturalWidth) img.classList.remove("is-loading");
    img.alt = p.alt;
    count.textContent = `${index + 1} / ${n}`;
    preload(index + 1);
    preload(index - 1);
  }

  function open(k) {
    show(k);
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
  }

  const go = (step) => show(index + step);

  photos.forEach((p, k) => {
    p.tabIndex = 0;
    p.setAttribute("role", "button");
    p.setAttribute("aria-label", `Phóng to ảnh: ${p.alt}`);
    p.addEventListener("click", () => open(k));
    p.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(k); }
    });
  });

  /* ---------- Bấm nút / chạm nền ---------- */
  let suppressClick = false; // sau khi kéo ảnh, bỏ qua cú "click" thả tay để khỏi đóng nhầm
  dialog.addEventListener("click", (e) => {
    if (suppressClick) return;
    const zoomBtn = e.target.closest("[data-zoom]");
    if (zoomBtn) {
      const act = zoomBtn.dataset.zoom;
      if (act === "reset") resetZoom();
      else zoomBy(act);
      return;
    }
    if (e.target.closest(".lightbox__nav--prev")) return go(-1);
    if (e.target.closest(".lightbox__nav--next")) return go(1);
    // chạm vào nút đóng hoặc vùng tối quanh ảnh thì đóng; chạm vào chính ảnh thì giữ nguyên
    if (e.target.closest("[data-close-lightbox]") || (!e.target.closest(".lightbox__img") && !e.target.closest(".lightbox__zoom"))) dialog.close();
  });

  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomBy("in"); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomBy("out"); }
    else if (e.key === "0") { e.preventDefault(); resetZoom(); }
  });

  dialog.addEventListener("close", () => { document.body.style.overflow = ""; resetZoom(); });

  /* ---------- Lăn chuột, chạm đúp (chuột) ---------- */
  let lastWheel = 0;
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel < 90) return; // touchpad bắn rất nhiều sự kiện: mỗi lần chỉ nhảy một nấc
    lastWheel = now;
    const { vx, vy } = offsetFromCenter(e.clientX, e.clientY);
    setScale(nextScale(scale, e.deltaY < 0 ? "in" : "out"), vx, vy);
  }, { passive: false });

  img.addEventListener("dblclick", (e) => {
    const { vx, vy } = offsetFromCenter(e.clientX, e.clientY);
    if (scale > 1) resetZoom();
    else setScale(DOUBLE_TAP_ZOOM, vx, vy);
  });

  /* ---------- Cảm ứng / kéo: vuốt đổi ảnh (100%), kéo để xem các góc (khi đã phóng), chụm hai ngón ---------- */
  const pointers = new Map();
  let gesture = null;   // một ngón/chuột đang chạm: điểm bắt đầu + độ dịch lúc đó
  let pinch = null;     // hai ngón: khoảng cách và tỉ lệ lúc bắt đầu
  let lastTap = { t: 0, x: 0, y: 0 };
  const dist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  stage.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch { /* không bắt buộc */ }
    if (pointers.size === 2) {
      pinch = { d: dist(), scale };
      gesture = null;
      dialog.classList.add("is-dragging");
    } else if (pointers.size === 1) {
      gesture = { x: e.clientX, y: e.clientY, tx, ty, type: e.pointerType, moved: false };
    }
  });

  stage.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const mid = offsetFromCenter((a.x + b.x) / 2, (a.y + b.y) / 2);
      setScale(pinchScale(pinch.scale, pinch.d, dist()), mid.vx, mid.vy);
      suppressClick = true;
    } else if (gesture && scale > 1) {
      const dx = e.clientX - gesture.x;
      const dy = e.clientY - gesture.y;
      if (!gesture.moved && Math.hypot(dx, dy) > 3) { gesture.moved = true; dialog.classList.add("is-dragging"); }
      if (gesture.moved) {
        ({ x: tx, y: ty } = clampPan(gesture.tx + dx, gesture.ty + dy, scale, img.offsetWidth, img.offsetHeight));
        apply();
        suppressClick = true;
      }
    }
  });

  function endPointer(e, cancelled) {
    if (!pointers.has(e.pointerId)) return;
    const g = gesture;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      dialog.classList.remove("is-dragging");
      gesture = null;
      if (g && !cancelled) handleTap(e, g);
      setTimeout(() => { suppressClick = false; }, 0);
    }
  }

  function handleTap(e, g) {
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.type === "mouse") return;
    if (scale === 1) {
      const action = swipeAction(dx, dy);
      if (action === "next") return go(1);
      if (action === "prev") return go(-1);
      if (action === "close") return dialog.close();
    }
    // Chạm đúp (cảm ứng): phóng tới điểm chạm / thu về 100%
    if (Math.hypot(dx, dy) < 10 && e.target === img) {
      const now = performance.now();
      if (now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        lastTap = { t: 0, x: 0, y: 0 };
        if (scale > 1) resetZoom();
        else { const { vx, vy } = offsetFromCenter(e.clientX, e.clientY); setScale(DOUBLE_TAP_ZOOM, vx, vy); }
      } else {
        lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
    }
  }

  stage.addEventListener("pointerup", (e) => endPointer(e, false));
  stage.addEventListener("pointercancel", (e) => endPointer(e, true));
}
