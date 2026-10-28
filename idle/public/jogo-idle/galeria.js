import { applyCsrfHeaders, rejectIfFailed } from "./http.js";

const fmt = new Intl.NumberFormat("pt-BR");

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
  if (!res.ok) return rejectIfFailed(res, data, location);
  if (data.success === false) {
    const err = new Error(data.error || `Erro ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? fmt.format(Math.floor(x)) : "—";
}

function ms(v) {
  const x = Math.floor(Number(v) || 0);
  if (x <= 0) return "—";
  const s = Math.floor(x / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function statCard(label, value, { muted = false } = {}) {
  return `<div class="galeria-stat${muted ? " is-muted" : ""}">
    <div class="galeria-stat__value">${value}</div>
    <div class="galeria-stat__label">${label}</div>
  </div>`;
}

function grid(cards) {
  return `<div class="galeria-grid">${cards.join("")}</div>`;
}

const CATEGORIES = [
  ["soulReaper", "Ceifador de Almas"],
  ["ancientSlayer", "Carrasco dos Antigos"],
  ["deathChild", "Filho da Morte"],
  ["fortuneLord", "Senhor da Fortuna"],
  ["relicCollector", "Colecionador de Relíquias"],
  ["divineStrike", "Golpe Divino"],
  ["enduranceLegend", "Lenda da Resistência"],
  ["lightningExecutor", "Executor Relâmpago"],
];

let rankPage = 1;
let fameLoaded = false;

function showTab(name) {
  document.querySelectorAll(".galeria-tab").forEach((btn) => {
    const on = btn.dataset.tab === name;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll(".galeria-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });
  if (name === "fame" && !fameLoaded) loadFame();
}

async function loadJourney() {
  const loading = document.getElementById("journey-loading");
  const empty = document.getElementById("journey-empty");
  const errEl = document.getElementById("journey-error");
  const content = document.getElementById("journey-content");
  const banner = document.getElementById("journey-banner");
  loading.hidden = false;
  empty.hidden = true;
  errEl.hidden = true;
  content.hidden = true;

  try {
    const period = document.getElementById("journey-period").value;
    const data = await api(`/api/jogo-idle/journey?period=${encodeURIComponent(period)}`);
    const j = data.journey;
    loading.hidden = true;

    if (j.collectionStartedAt) {
      const d = new Date(j.collectionStartedAt);
      banner.hidden = false;
      banner.textContent = `Coleta detalhada desde ${d.toLocaleString("pt-BR")}. Totais importados do histórico anterior aparecem separados (ouro não classificado).`;
      if (j.insufficientHistory) {
        banner.textContent += " Período parcial — ainda não há 30 dias de dados.";
      }
    }

    document.getElementById("journey-privacy").checked = Boolean(
      j.privacy?.hideFromPublicRankings,
    );

    const t = j.totals || {};
    const hasAny =
      (t.kills || 0) + (t.bossKills || 0) + (t.playMs || 0) + (t.faints || 0) > 0 ||
      (j.imported?.kills || 0) > 0;
    if (!hasAny) {
      empty.hidden = false;
      return;
    }

    const combat = grid([
      statCard("Monstros", n(t.kills)),
      statCard("Chefes", n(t.bossKills)),
      statCard("Mortes (desmaios)", n(t.faints)),
      statCard("Batalhas vencidas", n(t.battlesWon)),
      statCard("Batalhas perdidas", n(t.battlesLost)),
      statCard("Dano causado", n(t.damageDealt)),
      statCard("Dano recebido", n(t.damageTaken)),
      statCard("Críticos", n(t.crits)),
      statCard("Habilidades", n(t.skillUses)),
      statCard("Poções", n(t.potionUses)),
    ]);

    const economy = grid([
      statCard("Saldo atual", n(j.currentGold)),
      statCard("Ouro (caça)", n(t.goldEarnedCombat)),
      statCard("Ouro (vendas)", n(t.goldEarnedSell)),
      statCard(
        "Ouro histórico (não classificado)",
        n(t.goldEarnedUnclassified),
        { muted: !(t.goldEarnedUnclassified > 0) },
      ),
      statCard("Gasto mercador", n(t.goldSpentMerchant)),
      statCard("Gasto ritual", n(t.goldSpentRitual)),
      statCard("Maior recompensa", n(t.maxGoldReward)),
    ]);

    const items = grid([
      statCard("Itens encontrados", n(t.itemsFound)),
      ...["common", "uncommon", "rare", "epic", "legendary"].map((r) =>
        statCard(r, n(t.byRarity?.[r] || 0)),
      ),
      statCard("Vendidos", n(t.itemsSold)),
      statCard("Comprados", n(t.itemsBought)),
      statCard("Refinos", n(t.refineSuccess)),
    ]);

    const explore = grid([
      statCard("Tempo em caça", ms(t.playMs)),
      statCard("Tempo combate (online)", ms(t.combatMs)),
      statCard("Tempo offline", ms(t.offlineMs)),
      statCard("XP recebido", n(t.xpEarned)),
      statCard("Nível máx.", n(t.maxLevelReached)),
      statCard("Ascensões", n(t.ascensions)),
      statCard("Regiões", n((t.zonesVisited || []).length)),
    ]);

    const recs = j.records || {};
    const recordLines = [
      ["Vitória mais rápida", recs.fastestWin],
      ["Vitória mais longa", recs.longestWin],
      ["Chefe mais rápido", recs.fastestBoss],
      ["Chefe mais longo", recs.longestBoss],
      ["Maior golpe", recs.maxDamageHit],
    ]
      .filter(([, r]) => r && Number(r.value) > 0)
      .map(([label, r]) => {
        const val =
          label.includes("golpe") ? n(r.value) : ms(r.value);
        const ctx = [r.enemyName, r.zoneId, r.at ? new Date(r.at).toLocaleDateString("pt-BR") : null]
          .filter(Boolean)
          .join(" · ");
        return `<div class="galeria-record"><strong>${label}:</strong> ${val}${
          ctx ? ` — ${ctx}` : ""
        }</div>`;
      });

    content.innerHTML = `
      <p class="galeria-block-title">${j.character?.name || "Aventureiro"} · ${
        j.character?.classId || ""
      } · Nv. ${j.character?.level || "—"}</p>
      <p class="galeria-block-title">Combate</p>${combat}
      <p class="galeria-block-title">Economia</p>${economy}
      <p class="galeria-block-title">Itens</p>${items}
      <p class="galeria-block-title">Exploração</p>${explore}
      <p class="galeria-block-title">Recordes de batalha (somente online válidos)</p>
      <div class="galeria-records">${
        recordLines.length
          ? recordLines.join("")
          : '<p class="galeria-state">Nenhum recorde de duração ainda.</p>'
      }</div>
    `;
    content.hidden = false;
  } catch (e) {
    loading.hidden = true;
    errEl.hidden = false;
    errEl.textContent = e.message || "Falha ao carregar jornada";
  }
}

async function loadFame() {
  const loading = document.getElementById("fame-loading");
  const errEl = document.getElementById("fame-error");
  const content = document.getElementById("fame-content");
  loading.hidden = false;
  errEl.hidden = true;
  content.hidden = true;

  try {
    const data = await api("/api/jogo-idle/fame/overview");
    fameLoaded = true;

    const scope = document.getElementById("galeria-scope");
    scope.hidden = false;
    scope.textContent =
      data.scope === "global"
        ? data.label
        : `⚠ ${data.label || "Ambiente local — não representa o servidor de produção"}`;

    const g = data.globals || {};
    document.getElementById("fame-globals").innerHTML = [
      ["Aventureiros", g.playerCount],
      ["Personagens", g.characterCount],
      ["Monstros", g.kills],
      ["Chefes", g.bossKills],
      ["Mortes", g.faints],
      ["Ouro conquistado", g.goldEarnedTotal],
      ["Itens", g.itemsFound],
      ["Tempo de combate", null],
    ]
      .map(([label, val]) =>
        label === "Tempo de combate"
          ? statCard(label, ms(g.combatMs))
          : statCard(label, n(val)),
      )
      .join("");

    const hall = data.hall || {};
    document.getElementById("fame-hall").innerHTML = CATEGORIES.map(([key, title]) => {
      const entry = hall[key];
      if (!entry || entry.vacant) {
        return `<article class="galeria-hall-card is-vacant">
          <p class="galeria-hall-card__title">${title}</p>
          <p class="galeria-hall-card__name">Aguardando um feito</p>
          <p class="galeria-hall-card__meta">Nenhum recordista ainda</p>
        </article>`;
      }
      return `<article class="galeria-hall-card">
        <p class="galeria-hall-card__title">${entry.title || title}</p>
        <p class="galeria-hall-card__name">${entry.characterName || "—"}</p>
        <p class="galeria-hall-card__meta">${n(entry.value)}${
          entry.classId ? ` · ${entry.classId}` : ""
        }${entry.level != null ? ` · Nv.${entry.level}` : ""}</p>
      </article>`;
    }).join("");

    const sel = document.getElementById("fame-category");
    if (!sel.options.length) {
      CATEGORIES.forEach(([key, title]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = title;
        sel.appendChild(opt);
      });
    }

    content.hidden = false;
    loading.hidden = true;
    await loadRanking();
  } catch (e) {
    loading.hidden = true;
    errEl.hidden = false;
    errEl.textContent = e.message || "Falha ao carregar a galeria";
  }
}

async function loadRanking() {
  const cat = document.getElementById("fame-category").value || "soulReaper";
  const box = document.getElementById("fame-ranking");
  box.innerHTML = `<p class="galeria-state">Carregando ranking…</p>`;
  try {
    const data = await api(
      `/api/jogo-idle/fame/rankings?category=${encodeURIComponent(cat)}&page=${rankPage}&limit=10`,
    );
    if (!data.rows?.length) {
      box.innerHTML = `<p class="galeria-state">Sem entradas nesta categoria.</p>`;
      return;
    }
    const selfId = data.self?.characterId;
    box.innerHTML =
      data.rows
        .map(
          (row) => `<div class="galeria-rank-row${
            data.self && row.rank === data.self.rank ? " is-self" : ""
          }">
        <span class="galeria-rank-row__rank">#${row.rank}</span>
        <div>
          <strong>${row.characterName}</strong>
          <div style="font-size:0.8rem;color:#9bb0c4">${
            row.classId || ""
          }${row.level != null ? ` · Nv.${row.level}` : ""}${
            row.anonymous ? " · anônimo" : ""
          }</div>
        </div>
        <strong style="color:var(--gold-bright)">${
          cat.includes("lightning") || cat.includes("endurance")
            ? ms(row.value)
            : n(row.value)
        }</strong>
      </div>`,
        )
        .join("") +
      (data.self
        ? `<p class="galeria-compare-note">Sua posição: #${data.self.rank}</p>`
        : "") +
      `<p class="galeria-compare-note">Total: ${data.total} · Página ${data.page || rankPage}</p>`;
    void selfId;
  } catch (e) {
    box.innerHTML = `<p class="galeria-state galeria-state--err">${e.message}</p>`;
  }
}

async function runCompare() {
  const a = document.getElementById("compare-a").value.trim();
  const b = document.getElementById("compare-b").value.trim();
  const box = document.getElementById("fame-compare");
  if (!a || !b) {
    box.innerHTML = `<p class="galeria-state galeria-state--err">Informe os dois IDs.</p>`;
    return;
  }
  box.innerHTML = `<p class="galeria-state">Comparando…</p>`;
  try {
    const data = await api(
      `/api/jogo-idle/fame/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,
    );
    const side = (s) => `
      <article class="galeria-compare-card">
        <h4>${s.characterName}</h4>
        <p>${s.classId || "—"} · Nv.${s.level ?? "—"}</p>
        <ul>
          <li>Monstros: ${n(s.kills)}</li>
          <li>Chefes: ${n(s.bossKills)}</li>
          <li>Mortes: ${n(s.faints)}</li>
          <li>Ouro: ${n(s.goldEarned)}</li>
          <li>Dano: ${n(s.damageDealt)}</li>
          <li>Combate: ${ms(s.combatMs)}</li>
          <li>Melhor golpe: ${s.maxDamageHit != null ? n(s.maxDamageHit) : "—"}</li>
        </ul>
      </article>`;
    box.innerHTML = `<div class="galeria-compare-grid">${side(data.a)}${side(data.b)}</div>
      <p class="galeria-compare-note">${data.note || ""}</p>`;
  } catch (e) {
    box.innerHTML = `<p class="galeria-state galeria-state--err">${e.message}</p>`;
  }
}

document.querySelectorAll(".galeria-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    showTab(btn.dataset.tab);
  });
});

document.getElementById("journey-period").addEventListener("change", loadJourney);

document.getElementById("journey-privacy").addEventListener("change", async (ev) => {
  try {
    await api("/api/jogo-idle/journey/privacy", {
      method: "PATCH",
      body: JSON.stringify({ hideFromPublicRankings: ev.target.checked }),
    });
  } catch (e) {
    alert(e.message);
    ev.target.checked = !ev.target.checked;
  }
});

document.getElementById("fame-category").addEventListener("change", () => {
  rankPage = 1;
  loadRanking();
});
document.getElementById("fame-rank-prev").addEventListener("click", () => {
  if (rankPage > 1) {
    rankPage -= 1;
    loadRanking();
  }
});
document.getElementById("fame-rank-next").addEventListener("click", () => {
  rankPage += 1;
  loadRanking();
});
document.getElementById("compare-go").addEventListener("click", runCompare);

loadJourney();
