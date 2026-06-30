/* ==========================================================
   PULLA - QUINIELAS DE FÚTBOL
   app.js  —  Lógica principal
   ========================================================== */

// ══════════════════════════════════════════════════════════════
//  NAVEGACIÓN POR SECCIONES
// ══════════════════════════════════════════════════════════════

function navigateTo(section) {
  // Paneles
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('panel-' + section);
  if (target) target.classList.add('active');

  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  // Bottom nav
  document.querySelectorAll('.bnav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  // Actualizar resumen al entrar en Finalizar
  if (section === 'finalizar') updateSummary();
}

function updateSummary() {
  const matchEl  = document.getElementById('summaryMatch');
  const countEl  = document.getElementById('summaryCount');
  const prizeEl  = document.getElementById('summaryPrize');
  const liveEl   = document.getElementById('summaryLive');
  if (matchEl)  matchEl.textContent  = `${state.teamA} vs ${state.teamB}`;
  if (countEl)  countEl.textContent  = state.participants.length;
  if (prizeEl)  prizeEl.textContent  = formatCOP(state.cuota * state.participants.length);
  if (liveEl)   liveEl.textContent   = state.liveA !== null
    ? `${state.liveA} : ${state.liveB}`
    : '—';
}

// ID único del partido (para Supabase). Puedes cambiarlo por partido.
const MATCH_ID = 'pulla-match-v1';

// ── Estado global ─────────────────────────────────────────────
const state = {
  matchId:      MATCH_ID,
  teamA:        'Equipo A',
  teamAFlag:    '🏳️',
  teamB:        'Equipo B',
  teamBFlag:    '🏳️',
  cuota:        50000,
  participants: [],
  closed:       false,
  finished:     false,
  editingId:    null,
  liveA:        null,   // null = no iniciado
  liveB:        null,
  searchTerm:   '',
};

// ── Guardar en DB (debounced) ─────────────────────────────────
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const payload = buildPayload();
    await dbSaveMatch(payload);
  }, 600);
}

function buildPayload() {
  return {
    matchId:      state.matchId,
    teamA:        state.teamA,
    teamAFlag:    state.teamAFlag,
    teamB:        state.teamB,
    teamBFlag:    state.teamBFlag,
    cuota:        state.cuota,
    participants: state.participants,
    closed:       state.closed,
    finished:     state.finished,
    liveA:        state.liveA,
    liveB:        state.liveB,
  };
}

async function loadAndRestore() {
  const { data } = await dbLoadMatch(MATCH_ID);
  if (!data) return;

  const d = data;
  // Retrocompatibilidad con datos guardados antes (Colombia vs rival)
  state.teamA        = d.teamA        || 'Colombia'      || 'Equipo A';
  state.teamAFlag    = d.teamAFlag    || '🇨🇴'           || '🏳️';
  state.teamB        = d.teamB        || d.rival         || 'Equipo B';
  state.teamBFlag    = d.teamBFlag    || d.rivalFlag     || '🏳️';
  state.cuota        = d.cuota        || 50000;
  state.participants = (d.participants || []).map(p => ({
    id:   p.id,
    name: p.name,
    a:    p.a    ?? p.col   ?? 0,  // compat con campo viejo 'col'
    b:    p.b    ?? p.rival ?? 0,  // compat con campo viejo 'rival'
    paid: p.paid || false,
  }));
  state.closed       = d.closed       || false;
  state.finished     = d.finished     || false;
  state.liveA        = d.liveA        ?? d.liveCol ?? null;
  state.liveB        = d.liveB        ?? d.liveRiv ?? null;

  // Restaurar campos
  document.getElementById('teamA').value = state.teamA === 'Equipo A' ? '' : state.teamA;
  document.getElementById('teamB').value = state.teamB === 'Equipo B' ? '' : state.teamB;
  document.getElementById('cuota').value = state.cuota;

  if (state.closed || state.finished) applyClosedUI();
  if (state.finished) applyFinishedUI();

  updateTeams();
  updatePrize();
  renderTable();

  if (state.liveA !== null) {
    document.getElementById('liveA').value = state.liveA;
    document.getElementById('liveB').value = state.liveB;
    showLiveDisplay();
    renderRanking();
  }
}

// ── Utilidades ────────────────────────────────────────────────
function formatCOP(n) {
  if (!n && n !== 0) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

function getResult(a, b) {
  a = parseInt(a); b = parseInt(b);
  if (a > b)   return { label: `Gana ${escHtml(state.teamA)}`, cls: 'result-win',  exportCls: 'export-win',  rank: 0 };
  if (a === b) return { label: 'Empate',                       cls: 'result-draw', exportCls: 'export-draw', rank: 1 };
  return            { label: `Gana ${escHtml(state.teamB)}`,   cls: 'result-lose', exportCls: 'export-lose', rank: 2 };
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Banderas por país ─────────────────────────────────────────
const FLAGS = {
  colombia: '🇨🇴',
  argentina: '🇦🇷', brasil: '🇧🇷', brazil: '🇧🇷', mexico: '🇲🇽', méxico: '🇲🇽',
  españa: '🇪🇸', espana: '🇪🇸', spain: '🇪🇸', alemania: '🇩🇪', germany: '🇩🇪',
  francia: '🇫🇷', france: '🇫🇷', italia: '🇮🇹', italy: '🇮🇹',
  portugal: '🇵🇹', 'estados unidos': '🇺🇸', 'ee.uu': '🇺🇸', usa: '🇺🇸',
  uruguay: '🇺🇾', chile: '🇨🇱', ecuador: '🇪🇨', peru: '🇵🇪', perú: '🇵🇪',
  venezuela: '🇻🇪', bolivia: '🇧🇴', paraguay: '🇵🇾', panama: '🇵🇦', panamá: '🇵🇦',
  'costa rica': '🇨🇷', honduras: '🇭🇳', 'el salvador': '🇸🇻', guatemala: '🇬🇹',
  england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', holanda: '🇳🇱', netherlands: '🇳🇱',
  bélgica: '🇧🇪', belgica: '🇧🇪', belgium: '🇧🇪', croacia: '🇭🇷', croatia: '🇭🇷',
  marruecos: '🇲🇦', morocco: '🇲🇦', senegal: '🇸🇳', ghana: '🇬🇭', nigeria: '🇳🇬',
  japón: '🇯🇵', japon: '🇯🇵', japan: '🇯🇵', corea: '🇰🇷', korea: '🇰🇷',
  australia: '🇦🇺', canada: '🇨🇦', canadá: '🇨🇦',
  suiza: '🇨🇭', switzerland: '🇨🇭', polonia: '🇵🇱', poland: '🇵🇱',
  serbia: '🇷🇸', dinamarca: '🇩🇰', denmark: '🇩🇰', suecia: '🇸🇪', sweden: '🇸🇪',
  noruega: '🇳🇴', norway: '🇳🇴', escocia: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  gales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', turquia: '🇹🇷', turquía: '🇹🇷', turkey: '🇹🇷',
  egipto: '🇪🇬', egypt: '🇪🇬', tunez: '🇹🇳', túnez: '🇹🇳', tunisia: '🇹🇳',
  argelia: '🇩🇿', algeria: '🇩🇿', camerun: '🇨🇲', camerún: '🇨🇲', cameroon: '🇨🇲',
  costa: '🇨🇮', 'costa de marfil': '🇨🇮', 'ivory coast': '🇨🇮',
  arabia: '🇸🇦', 'arabia saudita': '🇸🇦', 'saudi arabia': '🇸🇦',
  iran: '🇮🇷', irán: '🇮🇷', irak: '🇮🇶', iraq: '🇮🇶', qatar: '🇶🇦',
  china: '🇨🇳', india: '🇮🇳', 'nueva zelanda': '🇳🇿', 'new zealand': '🇳🇿',
  jamaica: '🇯🇲', 'republica dominicana': '🇩🇴', 'república dominicana': '🇩🇴',
  cuba: '🇨🇺', haiti: '🇭🇹', haití: '🇭🇹', curazao: '🇨🇼', curaçao: '🇨🇼',
};

function getFlag(name) {
  return FLAGS[name.trim().toLowerCase()] || '🏳️';
}

// ── Actualizar UI de ambos equipos ──────────────────────────────
function updateTeams() {
  const valA = document.getElementById('teamA').value.trim();
  const valB = document.getElementById('teamB').value.trim();
  state.teamA = valA || 'Equipo A';
  state.teamB = valB || 'Equipo B';
  state.teamAFlag = getFlag(state.teamA);
  state.teamBFlag = getFlag(state.teamB);

  document.getElementById('teamAFlag').textContent        = state.teamAFlag;
  document.getElementById('teamANameDisplay').textContent = state.teamA;
  document.getElementById('teamBFlag').textContent        = state.teamBFlag;
  document.getElementById('teamBNameDisplay').textContent = state.teamB;

  document.getElementById('teamAScoreLabel').textContent  = state.teamA;
  document.getElementById('teamBScoreLabel').textContent  = state.teamB;

  document.getElementById('liveTeamAName').textContent    = state.teamA;
  document.getElementById('liveTeamAFlag').textContent    = state.teamAFlag;
  document.getElementById('liveTeamBName').textContent    = state.teamB;
  document.getElementById('liveTeamBFlag').textContent    = state.teamBFlag;

  const th = document.querySelector('.th-score');
  if (th) th.innerHTML = `Marcador <span id="teamAHead">${escHtml(state.teamA)}</span> vs <span id="teamBHead">${escHtml(state.teamB)}</span>`;

  scheduleSave();
}

// ── Actualizar cuota y pozo ───────────────────────────────────
function updatePrize() {
  const raw = parseFloat(document.getElementById('cuota').value) || 0;
  state.cuota = raw;
  const total      = raw * state.participants.length;
  const paidCount  = state.participants.filter(p => p.paid).length;
  const collected  = raw * paidCount;
  const pending    = state.participants.length - paidCount;

  document.getElementById('prizeAmount').textContent = formatCOP(total);
  document.getElementById('prizeSub').textContent =
    `${state.participants.length} participante${state.participants.length !== 1 ? 's' : ''} × ${formatCOP(raw)}`;

  // Línea de cobro
  const collectedEl = document.getElementById('prizeCollected');
  if (collectedEl) {
    collectedEl.innerHTML = `
      <span class="collect-item collect-ok">
        ✅ Recogido: <strong>${formatCOP(collected)}</strong>
        <em>(${paidCount} pagaron)</em>
      </span>
      ${pending > 0 ? `<span class="collect-item collect-pending">
        ⏳ Faltan: <strong>${formatCOP(raw * pending)}</strong>
        <em>(${pending} por pagar)</em>
      </span>` : `<span class="collect-item collect-done">🎉 ¡Todos pagaron!</span>`}
    `;
  }
  scheduleSave();
}

// ── Toggle pago de participante ───────────────────────────────
function togglePaid(id) {
  const p = state.participants.find(p => p.id === id);
  if (!p) return;
  p.paid = !p.paid;
  renderTable();
  updatePrize();
  scheduleSave();
  showToast(p.paid ? `💰 ${p.name} marcado como pagó` : `↩️ ${p.name} marcado como pendiente`);
}

// ── Agregar participante ──────────────────────────────────────
function addParticipant() {
  if (state.closed || state.finished) {
    showToast('⛔ Las inscripciones están cerradas');
    return;
  }

  const nameEl  = document.getElementById('participantName');
  const scoreAEl = document.getElementById('scoreA');
  const scoreBEl = document.getElementById('scoreB');

  const name = nameEl.value.trim();
  const a = parseInt(scoreAEl.value) || 0;
  const b = parseInt(scoreBEl.value) || 0;

  if (!name) { showToast('⚠️ Ingresa el nombre del participante'); nameEl.focus(); return; }

  if (state.editingId) {
    const p = state.participants.find(p => p.id === state.editingId);
    if (p) { p.name = name; p.a = a; p.b = b; }
    state.editingId = null;
    document.getElementById('addBtn').textContent = '＋ Inscribir';
    document.getElementById('addHint').textContent = 'Ingresa el nombre y el marcador que crees que quedará el partido';
    showToast(`✅ ${name} actualizado`);
  } else {
    state.participants.push({ id: uid(), name, a, b, paid: false });
    showToast(`🎉 ${name} inscrito con ${a}:${b}`);
  }

  nameEl.value = '';
  scoreAEl.value = 0;
  scoreBEl.value = 0;
  nameEl.focus();

  renderTable();
  updatePrize();
  if (state.liveA !== null) renderRanking();
  scheduleSave();
}

// ── Editar participante ───────────────────────────────────────
function editParticipant(id) {
  if (state.closed || state.finished) return;
  const p = state.participants.find(p => p.id === id);
  if (!p) return;

  state.editingId = id;
  document.getElementById('participantName').value = p.name;
  document.getElementById('scoreA').value          = p.a;
  document.getElementById('scoreB').value          = p.b;
  document.getElementById('addBtn').textContent    = '✏️ Guardar cambio';
  document.getElementById('addHint').textContent   = `Editando a: ${p.name}`;
  document.getElementById('participantName').focus();
  document.getElementById('addSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Eliminar participante ─────────────────────────────────────
function deleteParticipant(id) {
  if (state.closed || state.finished) return;
  const p = state.participants.find(p => p.id === id);
  if (!p) return;
  if (!confirm(`¿Eliminar a ${p.name}?`)) return;

  state.participants = state.participants.filter(x => x.id !== id);
  if (state.editingId === id) {
    state.editingId = null;
    document.getElementById('addBtn').textContent    = '＋ Inscribir';
    document.getElementById('participantName').value = '';
    document.getElementById('scoreA').value          = 0;
    document.getElementById('scoreB').value          = 0;
    document.getElementById('addHint').textContent   = 'Ingresa el nombre y el marcador que crees que quedará el partido';
  }

  renderTable();
  updatePrize();
  if (state.liveA !== null) renderRanking();
  scheduleSave();
  showToast(`🗑️ ${p.name} eliminado`);
}

// ══════════════════════════════════════════════════════════════
//  RENDER TABLA DE PARTICIPANTES
// ══════════════════════════════════════════════════════════════

function renderTable() {
  const tbody       = document.getElementById('participantsList');
  const empty       = document.getElementById('emptyState');
  const noResults   = document.getElementById('noResultsState');
  const term        = state.searchTerm.trim().toLowerCase();

  if (state.participants.length === 0) {
    tbody.innerHTML = '';
    empty.classList.add('visible');
    noResults.classList.remove('visible');
    renderScoreboardStats();
    return;
  }
  empty.classList.remove('visible');

  // El # de fila refleja la posición real en la lista completa (no la filtrada)
  const indexed = state.participants.map((p, i) => ({ p, num: i + 1 }));
  const filtered = term
    ? indexed.filter(({ p }) => p.name.toLowerCase().includes(term))
    : indexed;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    noResults.classList.add('visible');
    renderScoreboardStats();
    return;
  }
  noResults.classList.remove('visible');

  tbody.innerHTML = filtered.map(({ p, num }) => {
    const res = getResult(p.a, p.b);
    const actionsHtml = (state.closed || state.finished)
      ? `<div class="action-cell">
           <label class="pay-check ${p.paid ? 'is-paid' : ''}">
             <input type="checkbox" ${p.paid ? 'checked' : ''} onchange="togglePaid('${p.id}')"/>
             <span class="pay-check-box">${p.paid ? '✓' : ''}</span>
             <span class="pay-check-label">${p.paid ? 'Pagó' : 'Pendiente'}</span>
           </label>
         </div>`
      : `<div class="action-cell">
           <label class="pay-check ${p.paid ? 'is-paid' : ''}">
             <input type="checkbox" ${p.paid ? 'checked' : ''} onchange="togglePaid('${p.id}')"/>
             <span class="pay-check-box">${p.paid ? '✓' : ''}</span>
             <span class="pay-check-label">${p.paid ? 'Pagó' : 'Pendiente'}</span>
           </label>
           <button class="btn btn-edit"   onclick="editParticipant('${p.id}')">✏️ Editar</button>
           <button class="btn btn-delete" onclick="deleteParticipant('${p.id}')">🗑️ Eliminar</button>
         </div>`;

    return `
      <tr>
        <td class="td-num">${num}</td>
        <td class="td-name">${escHtml(p.name)}</td>
        <td class="td-score">
          <span class="score-pill">
            <span class="score-col">${p.a}</span>
            <span class="score-div">:</span>
            <span class="score-riv">${p.b}</span>
          </span>
        </td>
        <td class="td-result"><span class="result-tag ${res.cls}">${res.label}</span></td>
        <td class="td-actions">${actionsHtml}</td>
      </tr>`;
  }).join('');

  renderScoreboardStats();
}

// ══════════════════════════════════════════════════════════════
//  BUSCADOR DE PARTICIPANTES
// ══════════════════════════════════════════════════════════════

function searchParticipants() {
  const input = document.getElementById('searchParticipants');
  state.searchTerm = input.value;

  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = state.searchTerm ? 'flex' : 'none';

  renderTable();
}

function clearSearch() {
  state.searchTerm = '';
  const input = document.getElementById('searchParticipants');
  if (input) input.value = '';
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  renderTable();
  input.focus();
}

// ══════════════════════════════════════════════════════════════
//  TOP MARCADORES — conteo de predicciones repetidas
// ══════════════════════════════════════════════════════════════

function renderScoreboardStats() {
  const wrap = document.getElementById('scoreboardStats');
  if (!wrap) return; // el panel aún no existe en el HTML

  const total = state.participants.length;

  if (total === 0) {
    wrap.innerHTML = `
      <div class="empty-state visible">
        <span class="empty-icon">📊</span>
        <p>Aún no hay marcadores registrados.<br/>Inscribe participantes para ver el top.</p>
      </div>`;
    return;
  }

  // ── Agrupar por marcador exacto ──────────────────────────────
  const counts = {}; // "a-b" -> cantidad
  state.participants.forEach(p => {
    const key = `${p.a}-${p.b}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  const entries = Object.entries(counts)
    .map(([key, count]) => {
      const [col, riv] = key.split('-');
      return { col, riv, count };
    })
    .sort((a, b) => b.count - a.count);

  // ── Asignar posición Top por ranking real (dense ranking) ────
  // El grupo con más votos es Top 1, el siguiente grupo distinto es Top 2,
  // el siguiente es Top 3 — sin saltos, igual que en una carrera.
  // Empates en el mismo conteo comparten la misma posición.
  const uniqueCounts = [...new Set(entries.map(e => e.count))].sort((a, b) => b - a);
  const countToRank = {}; // count -> posición (1, 2, 3...)
  uniqueCounts.forEach((c, idx) => { countToRank[c] = idx + 1; });

  // Agrupar entries por su posición de ranking; solo mostramos Top 1-3 en destacado
  const topGroups = {}; // rank -> [entries]
  const noTop = [];
  entries.forEach(e => {
    const rank = countToRank[e.count];
    if (rank > 3) { noTop.push(e); return; }
    if (!topGroups[rank]) topGroups[rank] = [];
    topGroups[rank].push(e);
  });

  let topHtml = '';
  [1, 2, 3].forEach(lvl => {
    if (!topGroups[lvl]) return;
    topGroups[lvl].forEach(e => {
      topHtml += `
        <div class="score-rank-row rank-top-${lvl}">
          <span class="score-rank-badge">TOP ${lvl}</span>
          <span class="score-rank-pill">
            <span class="score-col">${e.col}</span><span class="score-div">:</span><span class="score-riv">${e.riv}</span>
          </span>
          <span class="score-rank-count">${e.count} ${e.count === 1 ? 'persona' : 'personas'}</span>
        </div>`;
    });
  });

  // Marcadores fuera del Top 3 se listan aparte
  let restHtml = '';
  if (noTop.length > 0) {
    restHtml = `
      <div class="score-rest-list">
        ${noTop.map(e => `
          <div class="score-rest-row">
            <span class="score-rank-pill small">
              <span class="score-col">${e.col}</span><span class="score-div">:</span><span class="score-riv">${e.riv}</span>
            </span>
            <span class="score-rank-count">${e.count} ${e.count === 1 ? 'persona' : 'personas'}</span>
          </div>`).join('')}
      </div>`;
  }

  // ── Marcador único (frecuencia exactamente 1) ────────────────
  const uniques = entries.filter(e => e.count === 1);
  let uniqueHtml = '';
  if (uniques.length > 0) {
    uniqueHtml = `
      <div class="score-highlight unique">
        <span class="score-highlight-label">🎯 Marcador único</span>
        <div class="score-highlight-items">
          ${uniques.map(e => `<span class="score-rank-pill small">
              <span class="score-col">${e.col}</span><span class="score-div">:</span><span class="score-riv">${e.riv}</span>
            </span>`).join('')}
        </div>
      </div>`;
  }

  // ── Marcador con menos registros (mínima frecuencia entre los que sí tienen votos) ──
  const minCount = Math.min(...entries.map(e => e.count));
  const leastCommon = entries.filter(e => e.count === minCount);
  let leastHtml = '';
  if (leastCommon.length > 0 && entries.length > 1) {
    leastHtml = `
      <div class="score-highlight least">
        <span class="score-highlight-label">📉 Menos repetido</span>
        <div class="score-highlight-items">
          ${leastCommon.map(e => `<span class="score-rank-pill small">
              <span class="score-col">${e.col}</span><span class="score-div">:</span><span class="score-riv">${e.riv}</span>
            </span>`).join('')} <span class="score-rank-count">(${minCount} ${minCount === 1 ? 'persona' : 'personas'})</span>
        </div>
      </div>`;
  }

  // ── Marcadores razonables (0-0 a 5-5) que nadie ha dicho ──────
  const saidSet = new Set(Object.keys(counts));
  const neverSaid = [];
  for (let c = 0; c <= 5; c++) {
    for (let r = 0; r <= 5; r++) {
      const key = `${c}-${r}`;
      if (!saidSet.has(key)) neverSaid.push({ col: c, riv: r });
    }
  }
  let neverHtml = '';
  if (neverSaid.length > 0) {
    neverHtml = `
      <div class="score-highlight never">
        <span class="score-highlight-label">🚫 Nadie ha dicho (sugeridos 0-0 a 5-5)</span>
        <div class="score-highlight-items wrap">
          ${neverSaid.slice(0, 20).map(e => `<span class="score-rank-pill tiny">
              <span class="score-col">${e.col}</span><span class="score-div">:</span><span class="score-riv">${e.riv}</span>
            </span>`).join('')}
          ${neverSaid.length > 20 ? `<span class="score-more">+${neverSaid.length - 20} más</span>` : ''}
        </div>
      </div>`;
  }

  wrap.innerHTML = `
    <div class="score-top-list">${topHtml}</div>
    ${restHtml}
    <div class="score-highlights-grid">
      ${uniqueHtml}
      ${leastHtml}
    </div>
    ${neverHtml}
  `;
}

// ══════════════════════════════════════════════════════════════
//  MARCADOR EN VIVO
// ══════════════════════════════════════════════════════════════

function updateLiveScore() {
  const a = parseInt(document.getElementById('liveA').value) || 0;
  const b = parseInt(document.getElementById('liveB').value) || 0;
  state.liveA = a;
  state.liveB = b;
  showLiveDisplay();
  renderRanking();
  scheduleSave();
  showToast(`🔴 Marcador actualizado: ${a} : ${b}`);
}

function showLiveDisplay() {
  const d = document.getElementById('liveDisplay');
  d.style.display = 'block';
  document.getElementById('liveSbScore').textContent =
    `${state.liveA} : ${state.liveB}`;
  document.getElementById('liveSbTeamA').textContent =
    `${state.teamAFlag} ${state.teamA}`;
  document.getElementById('liveSbTeamB').textContent =
    `${state.teamBFlag} ${state.teamB}`;
  document.getElementById('rankingCard').style.display = 'block';
}

// ── Renderizar ranking ────────────────────────────────────────
function renderRanking() {
  if (state.liveA === null) return;

  const liveA = state.liveA;
  const liveB = state.liveB;
  const totalPot = state.cuota * state.participants.length;

  // Clasificar cada participante
  const ranked = state.participants.map(p => {
    const exactMatch = (p.a === liveA && p.b === liveB);

    // Distancia = diferencia de goles totales predichos vs en vivo
    const distScore = Math.abs((p.a - p.b) - (liveA - liveB));

    // Resultado predicho vs resultado en vivo
    const predRes = getResult(p.a, p.b);
    const liveRes = getResult(liveA, liveB);
    const resultMatch = predRes.rank === liveRes.rank;

    // ── Verificar si el marcador todavía es alcanzable ──
    // Si los goles en vivo ya superaron lo que predijo para cualquier equipo,
    // esa predicción está matemáticamente eliminada
    const aEliminado     = liveA > p.a;
    const bEliminado     = liveB > p.b;
    const stillPossible  = !aEliminado && !bEliminado;

    return { ...p, exactMatch, distScore, resultMatch: resultMatch && stillPossible, stillPossible };
  });

  // Ordenar: primero exacto, luego por distancia, luego resultado correcto
  ranked.sort((a, b) => {
    if (a.exactMatch && !b.exactMatch) return -1;
    if (!a.exactMatch && b.exactMatch) return 1;
    if (a.resultMatch && !b.resultMatch) return -1;
    if (!a.resultMatch && b.resultMatch) return 1;
    return a.distScore - b.distScore;
  });

  // Calcular ganancias estimadas: pozo / número de personas con predicción exacta
  const exactCount = ranked.filter(p => p.exactMatch).length;

  const tbody = document.getElementById('rankingBody');
  tbody.innerHTML = ranked.map((p, i) => {
    const pos = i + 1;

    let statusHtml;
    if (p.exactMatch) {
      statusHtml = `<span class="rank-tag rank-exact">🎯 Exacto</span>`;
    } else if (p.resultMatch) {
      statusHtml = `<span class="rank-tag rank-close">✅ Resultado OK</span>`;
    } else {
      statusHtml = `<span class="rank-tag rank-far">❌ Sin acertar</span>`;
    }

    let ganancia = '—';
    if (p.exactMatch && exactCount > 0) {
      ganancia = `<span class="rank-earn">${formatCOP(totalPot / exactCount)}</span>`;
    } else if (!p.exactMatch && p.resultMatch) {
      ganancia = `<span style="color:rgba(255,255,255,0.35);font-size:12px;">Depende</span>`;
    }

    const medalEmoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}`;

    return `
      <tr class="${p.exactMatch ? 'rank-row-exact' : ''}">
        <td class="td-num rank-pos">${medalEmoji}</td>
        <td class="td-name">${escHtml(p.name)}</td>
        <td class="td-score">
          <span class="score-pill">
            <span class="score-col">${p.a}</span>
            <span class="score-div">:</span>
            <span class="score-riv">${p.b}</span>
          </span>
        </td>
        <td class="td-result">${statusHtml}</td>
        <td class="td-earn">${ganancia}</td>
      </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  FINALIZAR PARTIDO
// ══════════════════════════════════════════════════════════════

function confirmFinishMatch() {
  if (state.liveA === null) {
    showToast('⚠️ Primero ingresa el marcador en vivo');
    return;
  }
  document.getElementById('finishModalOverlay').classList.add('active');
}

function cancelFinish() {
  document.getElementById('finishModalOverlay').classList.remove('active');
}

async function finishMatch() {
  cancelFinish();
  state.finished = true;
  state.closed   = true;

  applyClosedUI();
  applyFinishedUI();

  // Calcular ganadores finales
  const winners = state.participants.filter(p =>
    p.a === state.liveA && p.b === state.liveB
  );
  const totalPot   = state.cuota * state.participants.length;
  const prizeEach  = winners.length > 0 ? totalPot / winners.length : 0;

  // Mostrar modal de resultado
  const liveRes = getResult(state.liveA, state.liveB);
  const contentEl = document.getElementById('resultContent');
  contentEl.innerHTML = `
    <div class="final-scoreboard">
      <span>${state.teamAFlag} ${escHtml(state.teamA)}</span>
      <span class="final-score">${state.liveA} : ${state.liveB}</span>
      <span>${state.teamBFlag} ${escHtml(state.teamB)}</span>
    </div>
    <div style="margin:16px 0;">
      <span class="result-tag ${liveRes.cls}">${liveRes.label}</span>
    </div>
    ${winners.length > 0
      ? `<p class="final-winners-label">🏆 Ganadores del pozo (${formatCOP(prizeEach)} c/u):</p>
         <ul class="final-winners-list">
           ${winners.map(w => `<li>🎉 ${escHtml(w.name)} — predicción ${w.a}:${w.b}</li>`).join('')}
         </ul>`
      : `<p class="final-no-winner">😔 Nadie acertó el marcador exacto.</p>`
    }
    <p class="final-total">Pozo total: <strong>${formatCOP(totalPot)}</strong></p>
  `;
  document.getElementById('resultModalOverlay').classList.add('active');

  // Guardar en historial antes de persistir el estado final
  await dbSaveHistory({
    matchId:      state.matchId,
    teamA:        state.teamA,
    teamAFlag:    state.teamAFlag,
    teamB:        state.teamB,
    teamBFlag:    state.teamBFlag,
    cuota:        state.cuota,
    participants: state.participants,
    liveA:        state.liveA,
    liveB:        state.liveB,
    winners:      winners.map(w => ({ name: w.name, a: w.a, b: w.b })),
    prizeEach:    prizeEach,
    totalPot:     totalPot,
    finishedAt:   new Date().toISOString(),
  });

  await dbSaveMatch(buildPayload());
  renderTable();
  renderRanking();
  showToast('🏁 Partido finalizado y guardado');
}

function closeResultModal() {
  document.getElementById('resultModalOverlay').classList.remove('active');
}

// ── Aplicar UI de inscripciones cerradas ──────────────────────
function applyClosedUI() {
  ['teamA', 'teamB', 'cuota', 'participantName', 'scoreA', 'scoreB'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });
  const addBtn = document.getElementById('addBtn');
  if (addBtn) addBtn.disabled = true;

  const closeBtn = document.getElementById('closeRegBtn');
  if (closeBtn) { closeBtn.disabled = true; closeBtn.style.opacity = '0.4'; closeBtn.style.cursor = 'not-allowed'; }

  const badge = document.getElementById('statusBadge');
  badge.classList.remove('open');
  badge.classList.add('closed');
  badge.innerHTML = '<span class="status-dot"></span><span class="status-text">Inscripciones cerradas 🔒</span>';
}

// ── Aplicar UI de partido finalizado ─────────────────────────
function applyFinishedUI() {
  const finBtn = document.getElementById('finishMatchBtn');
  if (finBtn) { finBtn.disabled = true; finBtn.style.opacity = '0.4'; finBtn.style.cursor = 'not-allowed'; }
  ['liveA','liveB'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });
  const updBtn = document.querySelector('.btn-live-update');
  if (updBtn) { updBtn.disabled = true; updBtn.style.opacity = '0.4'; }
}

// ══════════════════════════════════════════════════════════════
//  CERRAR INSCRIPCIONES
// ══════════════════════════════════════════════════════════════

function confirmCloseRegistration() {
  if (state.participants.length === 0) {
    showToast('⚠️ Agrega al menos un participante primero');
    return;
  }
  document.getElementById('modalOverlay').classList.add('active');
}

function cancelClose() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function closeRegistration() {
  state.closed = true;
  cancelClose();
  applyClosedUI();
  renderTable();
  scheduleSave();
  showToast('🔒 Inscripciones cerradas. ¡Ya no se puede modificar!');
}

// ══════════════════════════════════════════════════════════════
//  EXPORTAR IMAGEN
// ══════════════════════════════════════════════════════════════

async function exportImage() {
  if (state.participants.length === 0) {
    showToast('⚠️ No hay participantes para exportar');
    return;
  }

  document.getElementById('exportMatchLabel').textContent =
    `${state.teamAFlag} ${state.teamA} vs ${state.teamBFlag} ${state.teamB}`;
  document.getElementById('exportPrize').textContent =
    formatCOP(state.cuota * state.participants.length);

  const exportBody = document.getElementById('exportTableBody');
  exportBody.innerHTML = state.participants.map((p, i) => {
    const res = getResult(p.a, p.b);
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escHtml(p.name)}</td>
        <td>
          <span class="export-score-pill">
            <span class="export-col">${p.a}</span>
            <span class="export-div"> : </span>
            <span class="export-riv">${p.b}</span>
          </span>
        </td>
        <td><span class="export-tag ${res.exportCls}">${res.label}</span></td>
      </tr>`;
  }).join('');

  const preview = document.getElementById('exportPreview');
  preview.style.display = 'block';

  try {
    if (!window.html2canvas) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }
    showToast('📸 Generando imagen...');

    const canvas = await html2canvas(document.getElementById('exportInner'), {
      backgroundColor: '#0A1628',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    preview.style.display = 'none';

    const link = document.createElement('a');
    const safeName = `${state.teamA}-vs-${state.teamB}`.toLowerCase().replace(/\s+/g, '-');
    link.download = `pulla-${safeName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('✅ ¡Imagen descargada!');
  } catch (err) {
    preview.style.display = 'none';
    console.error(err);
    showToast('❌ Error al generar imagen. Intenta de nuevo.');
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ══════════════════════════════════════════════════════════════
//  LIMPIAR / NUEVO PARTIDO
// ══════════════════════════════════════════════════════════════

function confirmClearMatch() {
  document.getElementById('clearModalOverlay').classList.add('active');
}

function cancelClear() {
  document.getElementById('clearModalOverlay').classList.remove('active');
}

async function clearMatch() {
  cancelClear();
  await dbClearMatch(state.matchId);

  // Resetear estado
  state.teamA        = 'Equipo A';
  state.teamAFlag    = '🏳️';
  state.teamB        = 'Equipo B';
  state.teamBFlag    = '🏳️';
  state.cuota        = 50000;
  state.participants = [];
  state.closed       = false;
  state.finished     = false;
  state.editingId    = null;
  state.liveA        = null;
  state.liveB        = null;

  // Restaurar campos
  document.getElementById('teamA').value  = '';
  document.getElementById('teamB').value  = '';
  document.getElementById('cuota').value  = 50000;
  document.getElementById('teamA').disabled        = false;
  document.getElementById('teamB').disabled        = false;
  document.getElementById('cuota').disabled        = false;
  document.getElementById('participantName').disabled = false;
  document.getElementById('scoreA').disabled       = false;
  document.getElementById('scoreB').disabled       = false;

  const addBtn = document.getElementById('addBtn');
  addBtn.disabled    = false;
  addBtn.textContent = '＋ Inscribir';

  const closeBtn = document.getElementById('closeRegBtn');
  closeBtn.disabled  = false;
  closeBtn.style.opacity = '1';
  closeBtn.style.cursor  = 'pointer';

  const finBtn = document.getElementById('finishMatchBtn');
  finBtn.disabled  = false;
  finBtn.style.opacity = '1';
  finBtn.style.cursor  = 'pointer';

  const updBtn = document.querySelector('.btn-live-update');
  if (updBtn) { updBtn.disabled = false; updBtn.style.opacity = '1'; }

  const badge = document.getElementById('statusBadge');
  badge.classList.remove('closed');
  badge.classList.add('open');
  badge.innerHTML = '<span class="status-dot"></span><span class="status-text">Inscripciones abiertas</span>';

  document.getElementById('liveA').value   = 0;
  document.getElementById('liveB').value   = 0;
  document.getElementById('liveA').disabled = false;
  document.getElementById('liveB').disabled = false;
  document.getElementById('liveDisplay').style.display  = 'none';
  document.getElementById('rankingCard').style.display  = 'none';
  document.getElementById('addHint').textContent = 'Ingresa el nombre y el marcador que crees que quedará el partido';

  updateTeams();
  updatePrize();
  renderTable();
  showToast('🆕 Partido limpiado. ¡Listo para una nueva pulla!');
}


// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();

  document.getElementById('teamA').addEventListener('input', updateTeams);
  document.getElementById('teamA').addEventListener('change', updateTeams);
  document.getElementById('teamB').addEventListener('input', updateTeams);
  document.getElementById('teamB').addEventListener('change', updateTeams);
  document.getElementById('cuota').addEventListener('input', updatePrize);
  document.getElementById('participantName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addParticipant();
  });
  document.getElementById('searchParticipants').addEventListener('input', searchParticipants);

  await loadAndRestore();

  // Si no había datos previos, inicializar
  if (!state.participants.length && !state.closed) {
    updateTeams();
    updatePrize();
    renderTable();
  }
});