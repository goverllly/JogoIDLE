import { applyCsrfHeaders, rejectIfFailed } from "./http.js";

const fmt = new Intl.NumberFormat("pt-BR");

const STATUS_LABEL = {
  locked: "Bloqueado",
  available: "Disponível",
  in_progress: "Em progresso",
  completed: "Concluído",
};

function apiPath(path) {
  if (path.startsWith("/api/jogo-idle/")) return path;
  if (path.startsWith("/api/")) return `/api/jogo-idle${path.slice(4)}`;
  return path;
}

async function api(path, opts = {}) {
  const url = apiPath(path);
  const headers = applyCsrfHeaders(
    url,
    { method: opts.method, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } },
    document.cookie,
    location.origin,
  );
  const res = await fetch(url, {
    credentials: "same-origin",
    ...opts,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    try {
      return rejectIfFailed(res, data, location);
    } catch (err) {
      err.missingRequirements = data.missingRequirements;
      throw err;
    }
  }
  if (data.success === false) {
    const err = new Error(data.error || `Erro ${res.status}`);
    err.code = data.code;
    err.missingRequirements = data.missingRequirements;
    err.status = res.status;
    throw err;
  }
  return data;
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? fmt.format(Math.floor(x)) : "—";
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const els = {
  loading: document.getElementById("cronicas-loading"),
  layout: document.getElementById("cronicas-layout"),
  gallery: document.getElementById("cronicas-gallery"),
  detail: document.getElementById("cronicas-detail"),
  season: document.getElementById("cronicas-season"),
  error: document.getElementById("cronicas-error"),
};

let view = null;
let selectedId = null;
let entering = false;
let xpToNext = null;

function setError(text) {
  if (!text) {
    els.error.hidden = true;
    els.error.textContent = "";
    return;
  }
  els.error.textContent = text;
  els.error.hidden = false;
}

function cardById(id) {
  return view?.cards?.find((c) => c.id === id) || null;
}

function activeCard() {
  return view?.cards?.find((c) => c.isActive) || cardById(view?.currentChapterId) || null;
}

function campaignProgressLabel() {
  const cards = view?.cards || [];
  const done = cards.filter((c) => c.status === "completed").length;
  return `${done} / ${cards.length || 4}`;
}

function regionState(card, region) {
  if (card.status === "locked") return "locked";
  const level = Number(card.level) || 0;
  if (level < region.levelMin) return "locked";
  if (level > region.levelMax) return "done";
  return "current";
}

function missionText(card) {
  if (card.status === "locked") {
    if (card.missingRequirements?.length) {
      return `Desbloqueie este capítulo cumprindo os requisitos abaixo.`;
    }
    return "Requisitos de desbloqueio ainda não disponíveis.";
  }
  const name = card.campaignMission || card.unlockMission;
  if (name) return name;
  if (card.id === "I") return "A Seiva dos Deuses";
  return "Nenhuma missão de campanha registrada para este capítulo.";
}

function ctaFor(card) {
  if (card.isActive) {
    return { label: "Continuar jornada", mode: "continue", disabled: false, ghost: false };
  }
  if (card.status === "locked") {
    return { label: "Requisitos para desbloquear", mode: "requirements", disabled: false, ghost: true };
  }
  if (card.status === "completed") {
    return { label: "Retornar ao capítulo", mode: "enter", disabled: entering, ghost: false };
  }
  return { label: "Entrar no capítulo", mode: "enter", disabled: entering, ghost: false };
}

function renderSeason() {
  const active = activeCard();
  els.season.hidden = false;
  els.season.innerHTML = `
    <div class="cronicas-season__item">
      <span class="cronicas-season__label">Temporada</span>
      <span class="cronicas-season__value cronicas-season__value--gold">${esc(view.seasonKey || "—")}</span>
    </div>
    <div class="cronicas-season__item">
      <span class="cronicas-season__label">Classificação</span>
      <span class="cronicas-season__value">${esc(view.classification || "—")}</span>
    </div>
    <div class="cronicas-season__item">
      <span class="cronicas-season__label">Capítulo ativo</span>
      <span class="cronicas-season__value">${active ? `Cap. ${esc(active.number)} · ${esc(active.name)}` : "—"}</span>
    </div>
    <div class="cronicas-season__item">
      <span class="cronicas-season__label">Campanha</span>
      <span class="cronicas-season__value">${esc(campaignProgressLabel())} concluídos</span>
    </div>
  `;
}

function renderGallery() {
  const cards = view?.cards || [];
  els.gallery.innerHTML = cards
    .map((card) => {
      const selected = card.id === selectedId;
      const active = card.isActive;
      const levelChip =
        card.status !== "locked"
          ? `<span class="cronicas-card__level-chip">Nv. ${n(card.level)}</span>`
          : "";
      return `<button
        type="button"
        class="cronicas-card${selected ? " is-selected" : ""}${active ? " is-active-chapter" : ""}${card.status === "locked" ? " is-locked" : ""}"
        role="option"
        aria-selected="${selected ? "true" : "false"}"
        data-chapter-id="${esc(card.id)}"
        aria-label="Capítulo ${esc(card.number)} — ${esc(card.name)}"
      >
        <span class="cronicas-card__meta">
          <span class="cronicas-card__badge" data-status="${esc(card.status)}">${esc(STATUS_LABEL[card.status] || card.status)}</span>
          ${active ? `<span class="cronicas-card__active-tag">Ativo</span>` : ""}
          ${levelChip}
        </span>
        <span class="cronicas-card__art-wrap">
          <img class="cronicas-card__art" src="${esc(card.art)}" alt="" width="1024" height="1536" loading="lazy" decoding="async" />
        </span>
        <p class="cronicas-card__name">${esc(card.name)}</p>
      </button>`;
    })
    .join("");
}

function renderRegions(card) {
  const regions = card.regions || [];
  if (!regions.length) return "<p class='cronicas-detail__hint'>Regiões indisponíveis.</p>";
  return `<ul class="cronicas-regions">${regions
    .map((r) => {
      const st = regionState(card, r);
      const label =
        st === "current" ? "Atual" : st === "done" ? "Concluída" : "Bloqueada";
      return `<li class="is-${st}" title="${esc(label)}">
        <span class="cronicas-regions__dot" aria-hidden="true"></span>
        <span>${esc(r.name)}</span>
        <span class="cronicas-regions__range">${r.levelMin}–${r.levelMax}</span>
      </li>`;
    })
    .join("")}</ul>`;
}

function renderDetail() {
  const card = cardById(selectedId);
  if (!card) {
    els.detail.innerHTML = `<p class="cronicas-detail__hint">Selecione um capítulo para ver os detalhes.</p>`;
    return;
  }

  const locked = card.status === "locked";
  const levelText = locked ? "—" : `${n(card.level)} / 500`;
  const xpText = locked ? "—" : n(card.xp);
  const xpNext =
    !locked && card.isActive && xpToNext != null
      ? ` · próximo nível: ${n(xpToNext)} XP`
      : "";
  const mission = missionText(card);
  const missing =
    locked && card.missingRequirements?.length
      ? `<h3 id="cronicas-requirements">Requisitos restantes</h3><ul class="plain">${card.missingRequirements
          .map((m) => `<li>${esc(m)}</li>`)
          .join("")}</ul>`
      : locked
        ? `<h3 id="cronicas-requirements">Requisitos</h3><p class="cronicas-mission">Informação indisponível no momento.</p>`
        : "";
  const rewards = (card.rewards || []).map((r) => `<li>${esc(r)}</li>`).join("");
  const legacyHit =
    view?.legacy?.chaptersCompletedEver?.includes(card.id) && locked
      ? `<span class="cronicas-legacy-badge">Já conquistou historicamente</span>`
      : "";
  const cta = ctaFor(card);
  const pct = locked ? 0 : card.progressPct || 0;

  els.detail.innerHTML = `
    <div class="cronicas-detail__grid">
      <div>
        <p class="cronicas-detail__kicker">Capítulo ${esc(card.number)}</p>
        <h2>${esc(card.name)}</h2>
        <p class="cronicas-detail__class">${esc(card.classification)} · ${esc(STATUS_LABEL[card.status] || card.status)}</p>
        ${legacyHit}
        <dl class="cronicas-detail__stats">
          <div><dt>Nível</dt><dd>${levelText}</dd></div>
          <div><dt>XP no capítulo</dt><dd>${xpText}${esc(xpNext)}</dd></div>
          <div><dt>Chefe final</dt><dd>${esc(card.finalBoss)}</dd></div>
        </dl>
      </div>
      <div>
        <h3>Progresso do capítulo</h3>
        <div class="cronicas-progress" aria-hidden="${locked ? "true" : "false"}">
          <div class="cronicas-progress__bar">
            <div class="cronicas-progress__fill" style="width:${pct}%"></div>
          </div>
          <p class="cronicas-progress__label">${
            locked
              ? "Progresso oculto até desbloquear"
              : `${pct}% da jornada até o nível 500`
          }</p>
        </div>
        <h3>Missão</h3>
        <p class="cronicas-mission"><strong>${esc(mission)}</strong></p>
        ${missing}
      </div>
      <div>
        <h3>Regiões</h3>
        ${renderRegions(card)}
      </div>
      <div>
        <h3>Recompensas</h3>
        <ul class="plain">${rewards || "<li>—</li>"}</ul>
        <button type="button"
          class="cronicas-cta${cta.ghost ? " cronicas-cta--ghost" : ""}${entering ? " is-busy" : ""}"
          id="cronicas-cta"
          data-mode="${esc(cta.mode)}"
          ${cta.disabled ? "disabled" : ""}>
          ${esc(cta.label)}
        </button>
      </div>
    </div>
  `;

  document.getElementById("cronicas-cta")?.addEventListener("click", () => handleCta(card));
}

function handleCta(card) {
  const cta = ctaFor(card);
  if (cta.mode === "continue") {
    window.location.assign("/jogo-idle/play.html");
    return;
  }
  if (cta.mode === "requirements") {
    document.getElementById("cronicas-requirements")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  if (cta.mode === "enter") enterChapter(card.id);
}

function selectChapter(id) {
  selectedId = id;
  renderGallery();
  renderDetail();
}

function moveSelection(delta) {
  const cards = view?.cards || [];
  if (!cards.length) return;
  const idx = Math.max(0, cards.findIndex((c) => c.id === selectedId));
  const next = cards[(idx + delta + cards.length) % cards.length];
  selectChapter(next.id);
  els.gallery.querySelector(`[data-chapter-id="${next.id}"]`)?.focus();
}

async function enterChapter(chapterId) {
  if (entering) return;
  const card = cardById(chapterId);
  if (!card?.canEnter || card.isActive) return;
  entering = true;
  setError("");
  renderDetail();
  try {
    const data = await api("/api/jogo-idle/chapters/enter", {
      method: "POST",
      body: JSON.stringify({ chapterId }),
    });
    view = data.chapters;
    selectedId = data.chapters?.currentChapterId || chapterId;
    renderSeason();
    renderGallery();
    renderDetail();
  } catch (err) {
    const missing = err.missingRequirements?.length
      ? ` Faltam: ${err.missingRequirements.join("; ")}.`
      : "";
    setError(`${err.message || "Não foi possível entrar."}${missing}`);
  } finally {
    entering = false;
    renderDetail();
  }
}

async function boot() {
  try {
    const [chaptersData, meData] = await Promise.all([
      api("/api/jogo-idle/chapters"),
      api("/api/jogo-idle/me").catch(() => null),
    ]);
    view = chaptersData.chapters;
    const meXp = meData?.character?.experienceToNext;
    xpToNext = Number.isFinite(Number(meXp)) ? Number(meXp) : null;
    selectedId =
      view.currentChapterId ||
      view.cards?.find((c) => c.isActive)?.id ||
      view.cards?.[0]?.id ||
      "I";
    els.loading.hidden = true;
    els.layout.hidden = false;
    renderSeason();
    renderGallery();
    renderDetail();
  } catch (err) {
    els.loading.textContent = err.message || "Falha ao carregar as Crônicas.";
    setError(err.message || "Falha ao carregar.");
  }
}

els.gallery.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-chapter-id]");
  if (!btn) return;
  selectChapter(btn.dataset.chapterId);
});

els.gallery.addEventListener("keydown", (ev) => {
  if (ev.key === "ArrowRight" || ev.key === "ArrowDown") {
    ev.preventDefault();
    moveSelection(1);
  } else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") {
    ev.preventDefault();
    moveSelection(-1);
  } else if (ev.key === "Enter") {
    const card = cardById(selectedId);
    if (!card) return;
    ev.preventDefault();
    handleCta(card);
  }
});

boot();
