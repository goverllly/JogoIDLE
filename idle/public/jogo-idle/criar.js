/** Studio de Criação 2.0 — Classe → Aparência → Confirmar */
import { DEFAULT_LOOK } from "./appearance.js";
import { CLASS_HALLS, normalizeClassId } from "./class-halls.js";
import { applyCsrfHeaders, rejectIfFailed } from "./http.js";

const CLASS_ICON = {
  GUERREIRO: "/jogo-idle/assets/classes/guerreiro.png",
  BARBARO: "/jogo-idle/assets/classes/barbaro.png",
  MAGO: "/jogo-idle/assets/classes/mago.png",
  ARQUEIRO: "/jogo-idle/assets/classes/arqueiro.png",
};

const requestedClass = normalizeClassId(new URLSearchParams(location.search).get("class") || "GUERREIRO");

const state = {
  step: 1,
  classes: [],
  cosmetics: null,
  classId: requestedClass,
  name: "",
  appearance: { ...DEFAULT_LOOK, helmet: false },
  previewReady: false,
};

const els = {
  name: document.getElementById("hero-name"),
  classGrid: document.getElementById("class-grid"),
  summary: document.getElementById("summary-text"),
  summaryBlock: document.getElementById("summary-block"),
  lookBody: document.getElementById("look-body"),
  panelLook: document.getElementById("panel-look"),
  skin: document.getElementById("swatch-skin"),
  armor: document.getElementById("swatch-armor"),
  metal: document.getElementById("swatch-metal"),
  metalBlock: document.getElementById("metal-block"),
  metalLabel: document.getElementById("metal-label"),
  cape: document.getElementById("swatch-cape"),
  toggleHelmet: document.getElementById("toggle-helmet"),
  toggleCape: document.getElementById("toggle-cape"),
  stance: document.getElementById("stance-grid"),
  scale: document.getElementById("scale-range"),
  scaleVal: document.getElementById("scale-val"),
  frame: document.getElementById("preview-frame"),
  btnBack: document.getElementById("btn-back"),
  btnReset: document.getElementById("btn-reset"),
  btnNext: document.getElementById("btn-next"),
  btnCreate: document.getElementById("btn-create"),
  footerMsg: document.getElementById("footer-msg"),
  err: document.getElementById("err"),
};

if (els.frame) {
  els.frame.src = `/jogo-idle/preview.html?hall=1&class=${encodeURIComponent(state.classId)}`;
}

function partsFor(classId) {
  return state.cosmetics?.parts?.[classId] || {};
}

function hasHelmet(classId = state.classId) {
  return Boolean(partsFor(classId).helmet);
}

function hexCss(hex) {
  const n = Number(hex);
  if (!Number.isFinite(n)) return "#888";
  return `#${n.toString(16).padStart(6, "0")}`;
}

function setErr(msg) {
  if (!msg) {
    els.err.hidden = true;
    els.err.textContent = "";
    return;
  }
  els.err.hidden = false;
  els.err.textContent = msg;
}

function pushPreview() {
  const win = els.frame?.contentWindow;
  if (!win) return;
  win.postMessage(
    {
      type: "jogo-idle:preview",
      classId: state.classId,
      appearance: { ...state.appearance },
    },
    window.location.origin,
  );
}

function pushCamera(view) {
  els.frame?.contentWindow?.postMessage(
    { type: "jogo-idle:preview-camera", view },
    window.location.origin,
  );
}

function classLabel(id) {
  return state.classes.find((c) => c.id === id)?.name || id;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderClasses() {
  const list = state.classes.length
    ? state.classes
    : [
        { id: "GUERREIRO", name: "Guerreiro", description: "" },
        { id: "BARBARO", name: "Bárbaro", description: "" },
        { id: "MAGO", name: "Mago", description: "" },
        { id: "ARQUEIRO", name: "Arqueiro", description: "" },
      ];
  els.classGrid.innerHTML = list
    .map((cls) => {
      const on = cls.id === state.classId ? " is-on" : "";
      const hall = CLASS_HALLS[cls.id] || CLASS_HALLS.GUERREIRO;
      const icon = CLASS_ICON[cls.id] || hall.crest;
      const mark = icon
        ? `<img class="studio-class-card__icon" src="${icon}" alt="" />`
        : `<span class="studio-class-card__icon studio-class-card__icon--fallback" aria-hidden="true">◆</span>`;
      return `<button type="button" class="studio-class-card${on}" data-class="${cls.id}" style="--class-accent:${hall.accent};--class-glow:${hall.glow}">
        ${mark}
        <span class="studio-class-card__name">${escapeHtml(cls.name)}</span>
        <span class="studio-class-card__desc">${escapeHtml(cls.description || "")}</span>
      </button>`;
    })
    .join("");
  els.classGrid.querySelectorAll("[data-class]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.classId = btn.getAttribute("data-class");
      if (!hasHelmet()) state.appearance.helmet = false;
      renderClasses();
      renderLookControls();
      pushPreview();
      updateSummary();
    });
  });
}

function renderSwatches(container, items, field) {
  container.innerHTML = (items || [])
    .map((item) => {
      const id = item.id;
      const on = state.appearance[field] === id ? " is-on" : "";
      const title = item.name || id;
      return `<button type="button" class="studio-swatch${on}" data-field="${field}" data-id="${id}" title="${escapeHtml(title)}" style="background:${hexCss(item.hex)}" aria-label="${escapeHtml(title)}"></button>`;
    })
    .join("");
  container.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.appearance = {
        ...state.appearance,
        [btn.getAttribute("data-field")]: btn.getAttribute("data-id"),
      };
      renderLookControls();
      pushPreview();
      updateSummary();
    });
  });
}

function renderLookControls() {
  const c = state.cosmetics || {};
  renderSwatches(els.skin, c.skins, "skin");
  renderSwatches(els.armor, c.armors, "armor");
  renderSwatches(els.cape, c.capes, "capeColor");

  const helmetOk = hasHelmet();
  els.metalBlock.hidden = !helmetOk;
  els.toggleHelmet.hidden = !helmetOk;
  if (helmetOk) {
    const label = partsFor().helmet?.label || "Elmo";
    els.metalLabel.textContent = `Metal / ${label}`;
    els.toggleHelmet.textContent = label;
    renderSwatches(els.metal, c.metals, "metal");
    els.toggleHelmet.classList.toggle("is-on", state.appearance.helmet !== false);
  } else {
    state.appearance.helmet = false;
  }

  const capeLabel = partsFor().cape?.label || "Capa";
  els.toggleCape.textContent = capeLabel;
  els.toggleCape.classList.toggle("is-on", state.appearance.cape !== false);

  const stances = c.stances || [
    { id: "Idle", name: "Guarda" },
    { id: "Unarmed_Idle", name: "Relaxado" },
    { id: "2H_Melee_Idle", name: "Armas em riste" },
    { id: "Spellcasting", name: "Canalizando" },
  ];
  els.stance.innerHTML = stances
    .map((s) => {
      const on = state.appearance.stance === s.id ? " is-on" : "";
      return `<button type="button" class="studio-stance${on}" data-stance="${s.id}">${escapeHtml(s.name)}</button>`;
    })
    .join("");
  els.stance.querySelectorAll("[data-stance]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.appearance = { ...state.appearance, stance: btn.getAttribute("data-stance") };
      renderLookControls();
      pushPreview();
    });
  });

  els.scale.value = String(state.appearance.scale ?? 1);
  els.scaleVal.textContent = Number(state.appearance.scale ?? 1).toFixed(2);
}

function updateSummary() {
  const a = state.appearance;
  const helm = hasHelmet()
    ? a.helmet !== false
      ? ` · ${partsFor().helmet?.label || "Elmo"} visível`
      : ` · ${partsFor().helmet?.label || "Elmo"} oculto`
    : "";
  const cape = a.cape !== false ? ` · ${partsFor().cape?.label || "Capa"}` : " · sem capa";
  els.summary.innerHTML = `<strong>${escapeHtml(state.name || "—")}</strong> · ${escapeHtml(classLabel(state.classId))}<br/>Pele ${a.skin} · Vestimenta ${a.armor} · Capa ${a.capeColor}${helm}${cape} · Escala ${Number(a.scale).toFixed(2)}`;
}

function setStep(step) {
  state.step = step;
  document.querySelectorAll("[data-step-pill]").forEach((el) => {
    const n = Number(el.getAttribute("data-step-pill"));
    el.classList.toggle("is-on", n === step);
    el.classList.toggle("is-done", n < step);
  });

  const lookOnly = step >= 2;
  els.panelLook.style.opacity = lookOnly ? "1" : "0.55";
  els.panelLook.style.pointerEvents = lookOnly ? "auto" : "none";
  els.summaryBlock.hidden = step < 3;

  els.btnBack.hidden = step === 1;
  els.btnNext.hidden = step === 3;
  els.btnCreate.hidden = step !== 3;

  if (step === 1) {
    els.footerMsg.textContent = "Etapa 1: escolha classe e nome.";
  } else if (step === 2) {
    els.footerMsg.textContent = "Etapa 2: personalize a aparência. O elmo começa oculto para você ver o rosto.";
  } else {
    els.footerMsg.textContent =
      "Esta será a aparência definitiva do seu personagem. Após a criação, não será possível alterar suas características visuais.";
    updateSummary();
  }
  setErr("");
}

function resetLook() {
  const defaults = state.cosmetics?.studioDefaults || DEFAULT_LOOK;
  state.appearance = {
    ...DEFAULT_LOOK,
    ...defaults,
    helmet: hasHelmet() ? false : false,
  };
  renderLookControls();
  pushPreview();
  updateSummary();
}

els.toggleHelmet.addEventListener("click", () => {
  if (!hasHelmet()) return;
  state.appearance = { ...state.appearance, helmet: !state.appearance.helmet };
  renderLookControls();
  pushPreview();
  updateSummary();
});

els.toggleCape.addEventListener("click", () => {
  state.appearance = { ...state.appearance, cape: !state.appearance.cape };
  renderLookControls();
  pushPreview();
  updateSummary();
});

els.scale.addEventListener("input", () => {
  const v = Number(els.scale.value);
  state.appearance = { ...state.appearance, scale: v };
  els.scaleVal.textContent = v.toFixed(2);
  pushPreview();
});

els.name.addEventListener("input", () => {
  state.name = els.name.value.trim();
  updateSummary();
});

document.querySelectorAll("[data-cam]").forEach((btn) => {
  btn.addEventListener("click", () => pushCamera(btn.getAttribute("data-cam")));
});

els.btnBack.addEventListener("click", () => {
  if (state.step > 1) setStep(state.step - 1);
});

els.btnReset.addEventListener("click", () => {
  if (state.step === 1) {
    els.name.value = "";
    state.name = "";
    state.classId = state.classes[0]?.id || "GUERREIRO";
    renderClasses();
  }
  resetLook();
});

els.btnNext.addEventListener("click", () => {
  setErr("");
  if (state.step === 1) {
    const name = els.name.value.trim();
    if (name.length < 2 || name.length > 16) {
      setErr("Nome deve ter entre 2 e 16 caracteres.");
      return;
    }
    state.name = name;
    setStep(2);
    pushPreview();
    return;
  }
  if (state.step === 2) {
    setStep(3);
    pushCamera("front");
    pushPreview();
  }
});

els.btnCreate.addEventListener("click", async () => {
  setErr("");
  els.btnCreate.disabled = true;
  try {
    const res = await fetch("/api/jogo-idle/characters", {
      method: "POST",
      credentials: "same-origin",
      headers: applyCsrfHeaders(
        "/api/jogo-idle/characters",
        { method: "POST", headers: { "Content-Type": "application/json" } },
        document.cookie,
        location.origin,
      ),
      body: JSON.stringify({
        name: state.name,
        classId: state.classId,
        appearance: state.appearance,
      }),
    });
    const data = await res.json().catch(() => ({}));
    rejectIfFailed(res, data, location);
    window.location.href = "/jogo-idle/lobby.html";
  } catch (err) {
    setErr(err.message || "Falha ao criar personagem");
    els.btnCreate.disabled = false;
  }
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === "jogo-idle:preview-ready") {
    state.previewReady = true;
    pushPreview();
  }
});

els.frame?.addEventListener("load", () => {
  els.frame.contentWindow?.postMessage(
    { type: "jogo-idle:preview-ping" },
    window.location.origin,
  );
  pushPreview();
});

async function boot() {
  const res = await fetch("/api/jogo-idle/meta", { credentials: "same-origin" });
  const meta = await res.json();
  if (!res.ok) throw new Error(meta.error || "Falha ao carregar meta");
  state.classes = meta.classes || [];
  state.cosmetics = meta.cosmetics || null;
  const known = state.classes.some((cls) => cls.id === requestedClass);
  state.classId = known ? requestedClass : state.classes[0]?.id || "GUERREIRO";
  const d = state.cosmetics?.studioDefaults;
  if (d) state.appearance = { ...DEFAULT_LOOK, ...d, helmet: false };
  renderClasses();
  renderLookControls();
  setStep(1);
  pushPreview();
}

boot().catch((err) => setErr(err.message));
