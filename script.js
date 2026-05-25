/* =========================================================
   Терминал, кастомный курсор, часы
   ========================================================= */
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- кастомный курсор ---------- */
  const cursor = document.querySelector("[data-cursor]");
  let mx = innerWidth / 2, my = innerHeight / 2;
  let cx = mx, cy = my;
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; });
  addEventListener("pointerdown", () => cursor?.classList.add("is-down"));
  addEventListener("pointerup",   () => cursor?.classList.remove("is-down"));

  const lerp = (a, b, n) => a + (b - a) * n;
  const tick = () => {
    cx = lerp(cx, mx, 0.28);
    cy = lerp(cy, my, 0.28);
    if (cursor) cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // hover-состояние курсора
  document.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor?.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => cursor?.classList.remove("is-hover"));
  });

  /* ---------- ВОЛНА по буквам имени ---------- */
  const wave = document.querySelector("[data-wave]");
  if (wave && !reduced) {
    const chars = wave.querySelectorAll(".ch");
    let raf = null;
    let active = false;
    let pmx = -1000, pmy = -1000;
    const targets = new WeakMap();

    const onMove = (e) => {
      pmx = e.clientX;
      pmy = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const loop = () => {
      raf = null;
      const radius = 180;
      let needsNextFrame = false;

      chars.forEach((ch) => {
        const r = ch.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top  + r.height / 2;
        const dx = pmx - cx;
        const dy = pmy - cy;
        const dist = Math.hypot(dx, dy);

        let lift = 0;
        if (active && dist < radius) {
          const k = 1 - dist / radius;
          // плавный подъём с лёгкой "массой"
          lift = -Math.pow(k, 1.6) * 28;
        }

        const prev = targets.get(ch) ?? 0;
        const next = prev + (lift - prev) * 0.18;
        targets.set(ch, next);
        ch.style.transform = `translate3d(0, ${next.toFixed(2)}px, 0)`;

        if (Math.abs(next) > 0.1 || lift !== 0) needsNextFrame = true;
      });

      if (needsNextFrame) raf = requestAnimationFrame(loop);
    };

    wave.addEventListener("pointerenter", () => {
      active = true;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    wave.addEventListener("pointerleave", () => {
      active = false;
      pmx = -1e6; pmy = -1e6;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    wave.addEventListener("pointermove", onMove);
  }

  /* ---------- STICKERS: parallax от мыши ---------- */
  const stickersBox = document.querySelector("[data-stickers]");
  if (stickersBox && !reduced) {
    const items = stickersBox.querySelectorAll(".sticker");
    const depths = [0.05, 0.08, 0.06, 0.09];

    let cmx = 0, cmy = 0;
    let pcx = 0, pcy = 0;
    addEventListener("pointermove", (e) => {
      cmx = (e.clientX - innerWidth / 2)  / innerWidth;
      cmy = (e.clientY - innerHeight / 2) / innerHeight;
    });

    const lerp = (a, b, n) => a + (b - a) * n;
    const tick = () => {
      pcx = lerp(pcx, cmx, 0.06);
      pcy = lerp(pcy, cmy, 0.06);
      items.forEach((el, i) => {
        const d = depths[i] || 0.06;
        const tx = -pcx * d * 240;
        const ty = -pcy * d * 240;
        el.style.setProperty("--px", `${tx.toFixed(2)}px`);
        el.style.setProperty("--py", `${ty.toFixed(2)}px`);
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- терминал: посимвольная печать ---------- */
  const target = document.querySelector("[data-code]");
  if (target) {
    const tokens = [
      { t: "const ", c: "tok-key" },
      { t: "butov", c: "tok-var" },
      { t: " " },
      { t: "=", c: "tok-punct" },
      { t: " " },
      { t: "{", c: "tok-punct", pause: 320 },
      { t: "\n  " },
      { t: "craft", c: "tok-prop" },
      { t: ":", c: "tok-punct" },
      { t: " " },
      { t: "'sites with vibe'", c: "tok-str" },
      { t: ",", c: "tok-punct", pause: 240 },
      { t: "\n  " },
      { t: "ship", c: "tok-prop" },
      { t: ":", c: "tok-punct" },
      { t: " " },
      { t: "true", c: "tok-bool" },
      { t: ",", c: "tok-punct", pause: 280 },
      { t: "\n  " },
      { t: "// available", c: "tok-cmt", pause: 200 },
      { t: "\n" },
      { t: "}", c: "tok-punct" },
    ];

    const spans = tokens.map((tok) => {
      const s = document.createElement("span");
      if (tok.c) s.className = tok.c;
      target.appendChild(s);
      return s;
    });
    const caret = document.createElement("span");
    caret.className = "caret";
    target.appendChild(caret);

    if (reduced) {
      tokens.forEach((tok, i) => (spans[i].textContent = tok.t));
    } else {
      const charDelay = () => 18 + Math.random() * 26;
      let tokenIdx = 0, charIdx = 0;
      const type = () => {
        if (tokenIdx >= tokens.length) {
          // печать закончена — запускаем живой цикл комментария
          startCommentCycle();
          return;
        }
        const tok = tokens[tokenIdx];
        const span = spans[tokenIdx];
        if (charIdx < tok.t.length) {
          span.textContent += tok.t[charIdx];
          charIdx++;
          setTimeout(type, charDelay());
        } else {
          const wait = tok.pause || 0;
          tokenIdx++; charIdx = 0;
          setTimeout(type, wait);
        }
      };

      // комментарий-токен — последняя строка перед \n и }
      const cmtSpan = spans.find((_, i) => tokens[i].c === "tok-cmt");
      const phrases = ["available", "shipping", "in the zone", "open to chat"];
      let phraseIdx = 0;

      const setComment = (text) => {
        if (cmtSpan) cmtSpan.textContent = text;
      };
      const typeText = (full, prefix, onDone) => {
        let i = 0;
        const tk = () => {
          if (i > full.length) { onDone && onDone(); return; }
          setComment(prefix + full.slice(0, i));
          i++;
          setTimeout(tk, 35 + Math.random() * 30);
        };
        tk();
      };
      const eraseText = (prefix, current, onDone) => {
        let i = current.length;
        const er = () => {
          if (i < 0) { onDone && onDone(); return; }
          setComment(prefix + current.slice(0, i));
          i--;
          setTimeout(er, 24);
        };
        er();
      };

      const startCommentCycle = () => {
        const prefix = "// ";
        const loop = () => {
          const current = phrases[phraseIdx];
          const next = phrases[(phraseIdx + 1) % phrases.length];
          // подождать, потом стереть и напечатать новую
          setTimeout(() => {
            eraseText(prefix, current, () => {
              setTimeout(() => {
                typeText(next, prefix, () => {
                  phraseIdx = (phraseIdx + 1) % phrases.length;
                  loop();
                });
              }, 200);
            });
          }, 3500);
        };
        loop();
      };

      // стартуем после анимации появления окна
      setTimeout(type, 1400);
    }
  }

  /* ---------- живые часы ---------- */
  const timeEl = document.querySelector("[data-time]");
  if (timeEl) {
    const update = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      timeEl.textContent = `moscow · ${hh}:${mm}`;
    };
    update();
    setInterval(update, 30 * 1000);
  }
})();
