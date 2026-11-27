"use strict";

/* =====================================================
   1. UTILITÁRIOS
   ===================================================== */
const $ = s => document.querySelector(s);
let toastTimer;
function aviso(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 4000);
}

/* =====================================================
   2. SONS (Web Audio API) – tons suaves e aconchegantes
   ===================================================== */
let ctx = null, mestre = null, efeitosOn = true;

function audio() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (A) ctx = new A();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Saída com um eco quente e curto (dá o toque "cozy")
function saida(a) {
  if (mestre) return mestre;
  mestre = a.createGain();
  mestre.gain.value = 3;
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 5;
  comp.connect(a.destination);
  const atraso = a.createDelay();
  atraso.delayTime.value = 0.23;
  const fb = a.createGain();
  fb.gain.value = 0.32;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1500;
  const wet = a.createGain();
  wet.gain.value = 0.35;
  mestre.connect(comp);
  mestre.connect(atraso);
  atraso.connect(lp);
  lp.connect(fb);
  fb.connect(atraso);
  lp.connect(wet);
  wet.connect(comp);
  return mestre;
}

function nota(freq, inicio, dur, o = {}) {
  const a = audio();
  if (!a) return;
  const { tipo = "sine", vol = 0.16, filtro = 1800, ataque = 0.015 } = o;
  const t = a.currentTime + inicio;
  const osc = a.createOscillator();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t);
  f.type = "lowpass";
  f.frequency.value = filtro;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(f);
  f.connect(g);
  g.connect(saida(a));
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// Som de caixa de música: nota + harmónicos suaves
function sino(freq, inicio, dur = 0.9, vol = 0.14) {
  nota(freq, inicio, dur, { vol, filtro: 3000 });
  nota(freq * 2, inicio, dur * 0.6, { vol: vol * 0.3, filtro: 3500 });
  nota(freq * 3, inicio, dur * 0.35, { vol: vol * 0.1, filtro: 3500 });
}

const SONS = {
  // clique: um "toc" de madeira, muito curto
  clique() {
    nota(440, 0, 0.1, { tipo: "triangle", vol: 0.12, filtro: 1300 });
    nota(330, 0.02, 0.08, { tipo: "sine", vol: 0.06, filtro: 1000 });
  },
  // menos de 50%: três notas a descer, suaves (um "aww" gentil)
  erro() {
    nota(392, 0, 0.4, { tipo: "triangle", vol: 0.14, filtro: 900 });
    nota(330, 0.2, 0.5, { tipo: "triangle", vol: 0.13, filtro: 850 });
    nota(262, 0.42, 0.8, { tipo: "triangle", vol: 0.12, filtro: 800 });
  },
  // mais de 50%: arpejo ascendente caloroso (Dó maior)
  completo() {
    sino(523.25, 0, 0.8);
    sino(659.25, 0.14, 0.8);
    sino(783.99, 0.28, 1.1);
  },
  // 100%: caixa de música em festa e acorde final
  perfeito() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => sino(f, i * 0.11, 0.9, 0.13));
    [523.25, 659.25, 783.99, 1046.5].forEach(f => sino(f, 0.8, 1.9, 0.12));
  }
};

function som(nome) {
  if (!efeitosOn) return;
  try { SONS[nome](); } catch (e) { /* o som nunca deve partir o site */ }
}

/* =====================================================
   3. MÚSICA DE FUNDO (YouTube IFrame API)
   ===================================================== */
let yt = null, ytPronto = false, musicaOn = true, musicaIniciada = false, volumeMusica = 15;

function carregarMusica(cfg) {
  volumeMusica = cfg.volume;
  window.onYouTubeIframeAPIReady = () => {
    yt = new YT.Player("yt", {
      height: "1",
      width: "1",
      videoId: cfg.youtubeId,
      playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: cfg.youtubeId, playsinline: 1, rel: 0 },
      events: {
        onReady: e => {
          ytPronto = true;
          e.target.setVolume(volumeMusica);
          if (musicaIniciada && musicaOn) e.target.playVideo();
        },
        onError: () => aviso("Não foi possível carregar a música 😔 Verifica a internet e abre o site com um servidor local.")
      }
    });
  };
  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(s);
}

// Os browsers só deixam tocar som depois de o utilizador interagir
function primeiroGesto() {
  musicaIniciada = true;
  audio();
  if (ytPronto && musicaOn) { yt.setVolume(volumeMusica); yt.playVideo(); }
  ["pointerdown", "keydown"].forEach(ev => removeEventListener(ev, primeiroGesto));
}
["pointerdown", "keydown"].forEach(ev => addEventListener(ev, primeiroGesto));

$("#musica").onclick = e => {
  musicaOn = !musicaOn;
  e.currentTarget.classList.toggle("off", !musicaOn);
  if (ytPronto) {
    if (musicaOn) { yt.setVolume(volumeMusica); yt.playVideo(); } else yt.pauseVideo();
  }
};
$("#efeitos").onclick = e => {
  efeitosOn = !efeitosOn;
  e.currentTarget.classList.toggle("off", !efeitosOn);
};

// Som de clique em qualquer botão do site
document.addEventListener("click", e => {
  if (e.target.closest("button, .btn")) som("clique");
});

/* =====================================================
   4. TEMA CLARO / ESCURO
   ===================================================== */
$("#tema").onclick = () => {
  const d = document.documentElement;
  const escuro = d.dataset.theme ? d.dataset.theme === "dark" : matchMedia("(prefers-color-scheme:dark)").matches;
  d.dataset.theme = escuro ? "light" : "dark";
  try { localStorage.setItem("tema", d.dataset.theme); } catch (e) {}
};
try {
  const t = localStorage.getItem("tema");
  if (t) document.documentElement.dataset.theme = t;
} catch (e) {}

/* =====================================================
   5. DADOS (JSON) + CRUZADINHA
   ===================================================== */
async function iniciar() {
  let D;
  try {
    const r = await fetch("dados.json");
    if (!r.ok) throw new Error(r.status);
    D = await r.json();
  } catch (e) {
    $("#now").textContent = "Não foi possível carregar os dados. Abre o projeto com um servidor local (por exemplo, a extensão Live Server do VS Code).";
    return;
  }

  carregarMusica(D.musica);

  // Cartões de conceitos
  $("#cartoes").innerHTML = D.conceitos.map(c =>
    `<div class="card"><div class="ic">${c.icone}</div><h3>${c.titulo}</h3><p>${c.texto}</p>` +
    `<div class="tags">${c.etiquetas.map(t => `<span>${t}</span>`).join("")}</div></div>`).join("");

  // Palavras
  const W = D.palavras.map(p => ({ t: p.palavra, r: p.linha, c: p.coluna, d: p.direcao, e: p.emoji, q: p.pista }));
  const R = D.grelha.linhas, C = D.grelha.colunas, TOTAL = W.length;
  const map = {}, inp = {}, starts = {};

  W.forEach((w, i) => {
    w.k = [];
    for (let j = 0; j < w.t.length; j++) {
      const k = (w.r + (w.d === "V" ? j : 0)) + "-" + (w.c + (w.d === "H" ? j : 0));
      w.k.push(k);
      (map[k] = map[k] || { ch: w.t[j], ws: [] }).ws.push(i);
    }
    starts[w.r + "-" + w.c] = 1;
  });
  Object.keys(starts)
    .sort((a, b) => {
      const [x, y] = a.split("-").map(Number), [p, q] = b.split("-").map(Number);
      return x - p || y - q;
    })
    .forEach((k, i) => starts[k] = i + 1);
  W.forEach(w => w.n = starts[w.r + "-" + w.c]);

  let cur = null, last = null, tick = null, secs = 0, done = false;
  const cw = $("#cw");

  // Grelha
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const k = r + "-" + c, d = document.createElement("div");
    d.className = "c";
    if (map[k]) {
      d.classList.add("a");
      if (starts[k]) {
        const n = document.createElement("span");
        n.className = "n";
        n.textContent = starts[k];
        d.appendChild(n);
      }
      const i = document.createElement("input");
      i.maxLength = 1;
      i.autocomplete = "off";
      i.autocapitalize = "characters";
      i.setAttribute("aria-label", "Linha " + (r + 1) + ", coluna " + (c + 1));
      inp[k] = i;

      i.addEventListener("pointerdown", () => i._w = document.activeElement === i);
      i.addEventListener("click", () => {
        const ws = map[k].ws;
        if (i._w && ws.length > 1 && ws.includes(cur)) sel(ws.find(x => x !== cur), k);
      });
      i.addEventListener("focus", () => {
        last = k;
        if (cur === null || !W[cur].k.includes(k)) {
          const ws = map[k].ws;
          sel(ws.find(x => cur !== null && W[x].d === W[cur].d) ?? ws[0], k, true);
        } else paint();
      });
      i.addEventListener("input", () => {
        i.value = i.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
        if (i.value) {
          start();
          const j = W[cur].k.indexOf(k), nx = W[cur].k[j + 1];
          if (nx) inp[nx].focus();
        }
        upd();
      });
      i.addEventListener("keydown", e => {
        const m = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
        if (m) {
          e.preventDefault();
          let [rr, cc] = k.split("-").map(Number);
          for (let s = 0; s < C; s++) {
            rr += m[0]; cc += m[1];
            if (inp[rr + "-" + cc]) { inp[rr + "-" + cc].focus(); break; }
          }
        } else if (e.key === "Backspace") {
          e.preventDefault();
          if (i.value) { i.value = ""; upd(); }
          else {
            const j = W[cur].k.indexOf(k);
            if (j > 0) { const p = inp[W[cur].k[j - 1]]; p.value = ""; p.focus(); upd(); }
          }
        }
      });
      d.appendChild(i);
    }
    cw.appendChild(d);
  }

  function sel(i, k, nofocus) {
    cur = i;
    paint();
    if (!nofocus && k) inp[k].focus();
  }

  function paint() {
    document.querySelectorAll(".c.hl").forEach(e => e.classList.remove("hl"));
    document.querySelectorAll(".cl button.on").forEach(e => e.classList.remove("on"));
    if (cur === null) return;
    const w = W[cur];
    w.k.forEach(k => inp[k].parentElement.classList.add("hl"));
    const b = document.querySelector('.cl button[data-i="' + cur + '"]');
    if (b) b.classList.add("on");
    $("#now").innerHTML = "<em>" + w.n + (w.d === "H" ? " ➡️" : " ⬇️") + "</em> <span style='font-size:32px;vertical-align:middle'>" +
      w.e + "</span> " + w.q + " <span style='color:var(--muted)'>(" + w.t.length + " letras)</span>";
  }

  // Pistas
  function pistas(d, el) {
    W.map((w, i) => [w, i]).filter(([w]) => w.d === d).sort((a, b) => a[0].n - b[0].n).forEach(([w, i]) => {
      const b = document.createElement("button");
      b.dataset.i = i;
      b.innerHTML = "<span class='em'>" + w.e + "</span><span><b>" + w.n + (w.d === "H" ? " ➡️" : " ⬇️") + "</b> " + w.q + "</span>";
      b.onclick = () => sel(i, w.k.find(x => !inp[x].value) || w.k[0]);
      el.appendChild(b);
    });
  }
  pistas("H", $("#ch"));
  pistas("V", $("#cv"));

  const completa = w => w.k.map(k => inp[k].value).join("");

  // Pontuação: palavras reveladas NÃO contam
  function upd() {
    let n = 0;
    W.forEach((w, i) => {
      const ok = completa(w) === w.t && !w.rev;
      if (ok) n++;
      const b = document.querySelector('.cl button[data-i="' + i + '"]');
      if (b) { b.classList.toggle("done", ok); b.classList.toggle("rev", !!w.rev); }
    });
    $("#cnt").textContent = n + "/" + TOTAL;
    $("#bar").style.width = n / TOTAL * 100 + "%";
    return n;
  }

  function start() {
    if (!tick && !done) {
      tick = setInterval(() => {
        secs++;
        $("#tm").textContent = String(Math.floor(secs / 60)).padStart(2, "0") + ":" + String(secs % 60).padStart(2, "0");
      }, 1000);
    }
  }
  function stop() { clearInterval(tick); tick = null; }

  // Verificar
  $("#bv").onclick = () => {
    Object.keys(inp).forEach(k => {
      const p = inp[k].parentElement;
      p.classList.remove("ok", "bad", "rv");
      if (inp[k].value) p.classList.add(inp[k].value === map[k].ch ? "ok" : "bad");
      if (inp[k].value === map[k].ch && map[k].ws.every(i => W[i].rev)) { p.classList.remove("ok"); p.classList.add("rv"); }
    });
    const n = upd(), rv = W.filter(w => w.rev).length, r = $("#res");
    if (W.every(w => completa(w) === w.t)) { done = true; stop(); }

    if (rv && n < TOTAL && done) {
      r.style.color = "var(--accent)";
      r.textContent = "Terminaste, mas " + rv + (rv > 1 ? " palavras reveladas não contam" : " palavra revelada não conta") + ": pontuação " + n + "/" + TOTAL + " 👁";
    } else if (n === TOTAL) {
      r.style.color = "var(--ok)";
      r.textContent = "🎉 Parabéns! Completaste a cruzadinha em " + $("#tm").textContent + "!";
    } else {
      r.style.color = "var(--accent)";
      r.textContent = "Acertaste em " + n + " de " + TOTAL + " palavras. Continua a tentar! 💪";
    }

    // Som do resultado (pequeno atraso para não se sobrepor ao "toc" do botão)
    const proporcao = n / TOTAL;
    setTimeout(() => som(n === TOTAL ? "perfeito" : proporcao > 0.5 ? "completo" : "erro"), 220);
  };

  $("#bh").onclick = () => {
    if (!last) return;
    inp[last].value = map[last].ch;
    start();
    upd();
  };
  $("#br").onclick = () => {
    if (cur === null) return;
    W[cur].rev = true;
    W[cur].k.forEach(k => inp[k].value = map[k].ch);
    start();
    upd();
  };
  $("#bc").onclick = () => {
    W.forEach(w => w.rev = false);
    Object.values(inp).forEach(i => { i.value = ""; i.parentElement.classList.remove("ok", "bad", "rv"); });
    stop();
    secs = 0;
    done = false;
    $("#tm").textContent = "00:00";
    $("#res").textContent = "";
    upd();
  };
}

iniciar();
