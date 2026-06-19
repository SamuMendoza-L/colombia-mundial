/* ==========================================================
   PULLA COLOMBIA - MUNDIAL 2026
   app.js  —  Lógica principal
   ========================================================== */

// ID único del partido (para Supabase). Puedes cambiarlo por partido.
const MATCH_ID = 'col-mundial-2026-v1';

// ── Estado global ─────────────────────────────────────────────
const state = {
  matchId:      MATCH_ID,
  rival:        'Rival',
  rivalFlag:    '🏳️',
  cuota:        50000,
  participants: [],
  closed:       false,
  finished:     false,
  editingId:    null,
  liveCol:      null,   // null = no iniciado
  liveRiv:      null,
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
    rival:        state.rival,
    rivalFlag:    state.rivalFlag,
    cuota:        state.cuota,
    participants: state.participants,
    closed:       state.closed,
    finished:     state.finished,
    liveCol:      state.liveCol,
    liveRiv:      state.liveRiv,
  };
}

async function loadAndRestore() {
  const { data } = await dbLoadMatch(MATCH_ID);
  if (!data) return;

  const d = data.matchId ? data : data; // Supabase devuelve la fila completa
  state.rival        = d.rival        || 'Rival';
  state.rivalFlag    = d.rivalFlag    || '🏳️';
  state.cuota        = d.cuota        || 50000;
  state.participants = d.participants || [];
  state.closed       = d.closed       || false;
  state.finished     = d.finished     || false;
  state.liveCol      = d.liveCol      ?? null;
  state.liveRiv      = d.liveRiv      ?? null;

  // Restaurar campos
  document.getElementById('rival').value = state.rival;
  document.getElementById('cuota').value = state.cuota;

  if (state.closed || state.finished) applyClosedUI();
  if (state.finished) applyFinishedUI();

  updateRival();
  updatePrize();
  renderTable();

  if (state.liveCol !== null) {
    document.getElementById('liveCol').value = state.liveCol;
    document.getElementById('liveRiv').value = state.liveRiv;
    showLiveDisplay();
    renderRanking();
  }
}

// ── Utilidades ────────────────────────────────────────────────
function formatCOP(n) {
  if (!n && n !== 0) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

function getResult(col, riv) {
  col = parseInt(col); riv = parseInt(riv);
  if (col > riv)   return { label: 'Victoria 🇨🇴', cls: 'result-win',  exportCls: 'export-win',  rank: 0 };
  if (col === riv) return { label: 'Empate',        cls: 'result-draw', exportCls: 'export-draw', rank: 1 };
  return              { label: 'Derrota',           cls: 'result-lose', exportCls: 'export-lose', rank: 2 };
}

function scoreMatches(p) {
  return p.col === state.liveCol && p.rival === state.liveRiv;
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
};

function getFlag(name) {
  return FLAGS[name.trim().toLowerCase()] || '🏳️';
}

// ── Actualizar UI rival ───────────────────────────────────────
function updateRival() {
  const val = document.getElementById('rival').value.trim();
  state.rival = val || 'Rival';
  state.rivalFlag = getFlag(state.rival);

  document.getElementById('rivalFlag').textContent       = state.rivalFlag;
  document.getElementById('rivalNameDisplay').textContent = state.rival;
  document.getElementById('rivalHead').textContent        = state.rival;
  document.getElementById('rivalScoreLabel').textContent  = state.rival;
  document.getElementById('liveRivalName').textContent    = state.rival;
  document.getElementById('liveFlagRival').textContent    = state.rivalFlag;
  document.getElementById('liveSbRival').textContent      = `${state.rivalFlag} ${state.rival}`;

  const th = document.querySelector('.th-score');
  if (th) th.innerHTML = `Marcador 🇨🇴 vs <span id="rivalHead">${escHtml(state.rival)}</span>`;

  scheduleSave();
}

// ── Actualizar cuota y pozo ───────────────────────────────────
function updatePrize() {
  const raw = parseFloat(document.getElementById('cuota').value) || 0;
  state.cuota = raw;
  const total = raw * state.participants.length;
  document.getElementById('prizeAmount').textContent = formatCOP(total);
  document.getElementById('prizeSub').textContent =
    `${state.participants.length} participante${state.participants.length !== 1 ? 's' : ''} × ${formatCOP(raw)}`;
  scheduleSave();
}

// ── Agregar participante ──────────────────────────────────────
function addParticipant() {
  if (state.closed || state.finished) {
    showToast('⛔ Las inscripciones están cerradas');
    return;
  }

  const nameEl     = document.getElementById('participantName');
  const scoreColEl = document.getElementById('scoreCol');
  const scoreRivEl = document.getElementById('scoreRival');

  const name = nameEl.value.trim();
  const col  = parseInt(scoreColEl.value) || 0;
  const riv  = parseInt(scoreRivEl.value) || 0;

  if (!name) { showToast('⚠️ Ingresa el nombre del participante'); nameEl.focus(); return; }

  if (state.editingId) {
    const p = state.participants.find(p => p.id === state.editingId);
    if (p) { p.name = name; p.col = col; p.rival = riv; }
    state.editingId = null;
    document.getElementById('addBtn').textContent = '＋ Inscribir';
    document.getElementById('addHint').textContent = 'Ingresa el nombre y el marcador que crees que quedará el partido';
    showToast(`✅ ${name} actualizado`);
  } else {
    state.participants.push({ id: uid(), name, col, rival: riv });
    showToast(`🎉 ${name} inscrito con ${col}:${riv}`);
  }

  nameEl.value = '';
  scoreColEl.value = 0;
  scoreRivEl.value = 0;
  nameEl.focus();

  renderTable();
  updatePrize();
  if (state.liveCol !== null) renderRanking();
  scheduleSave();
}

// ── Editar participante ───────────────────────────────────────
function editParticipant(id) {
  if (state.closed || state.finished) return;
  const p = state.participants.find(p => p.id === id);
  if (!p) return;

  state.editingId = id;
  document.getElementById('participantName').value = p.name;
  document.getElementById('scoreCol').value        = p.col;
  document.getElementById('scoreRival').value      = p.rival;
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
    document.getElementById('scoreCol').value        = 0;
    document.getElementById('scoreRival').value      = 0;
  }
  renderTable();
  updatePrize();
  if (state.liveCol !== null) renderRanking();
  scheduleSave();
  showToast(`🗑️ ${p.name} eliminado`);
}

// ── Renderizar tabla de participantes ─────────────────────────
function renderTable() {
  const tbody = document.getElementById('participantsList');
  const empty = document.getElementById('emptyState');

  if (state.participants.length === 0) {
    tbody.innerHTML = '';
    empty.classList.add('visible');
    return;
  }
  empty.classList.remove('visible');

  tbody.innerHTML = state.participants.map((p, i) => {
    const res = getResult(p.col, p.rival);
    const actionsHtml = (state.closed || state.finished)
      ? '<span style="color:rgba(255,255,255,0.2);font-size:12px;">—</span>'
      : `<div class="action-cell">
           <button class="btn btn-edit"   onclick="editParticipant('${p.id}')">✏️ Editar</button>
           <button class="btn btn-delete" onclick="deleteParticipant('${p.id}')">🗑️ Eliminar</button>
         </div>`;

    return `
      <tr>
        <td class="td-num">${i + 1}</td>
        <td class="td-name">${escHtml(p.name)}</td>
        <td class="td-score">
          <span class="score-pill">
            <span class="score-col">${p.col}</span>
            <span class="score-div">:</span>
            <span class="score-riv">${p.rival}</span>
          </span>
        </td>
        <td class="td-result"><span class="result-tag ${res.cls}">${res.label}</span></td>
        <td class="td-actions">${actionsHtml}</td>
      </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  MARCADOR EN VIVO
// ══════════════════════════════════════════════════════════════

function updateLiveScore() {
  const col = parseInt(document.getElementById('liveCol').value) || 0;
  const riv = parseInt(document.getElementById('liveRiv').value) || 0;
  state.liveCol = col;
  state.liveRiv = riv;
  showLiveDisplay();
  renderRanking();
  scheduleSave();
  showToast(`🔴 Marcador actualizado: ${col} : ${riv}`);
}

function showLiveDisplay() {
  const d = document.getElementById('liveDisplay');
  d.style.display = 'block';
  document.getElementById('liveSbScore').textContent =
    `${state.liveCol} : ${state.liveRiv}`;
  document.getElementById('liveSbRival').textContent =
    `${state.rivalFlag} ${state.rival}`;
  document.getElementById('rankingCard').style.display = 'block';
}

// ── Renderizar ranking ────────────────────────────────────────
function renderRanking() {
  if (state.liveCol === null) return;

  const liveCol = state.liveCol;
  const liveRiv = state.liveRiv;
  const totalPot = state.cuota * state.participants.length;

  // Clasificar cada participante
  const ranked = state.participants.map(p => {
    const exactMatch = (p.col === liveCol && p.rival === liveRiv);

    // Distancia = diferencia de goles totales predichos vs en vivo
    const distScore = Math.abs((p.col - p.rival) - (liveCol - liveRiv));

    // Resultado predicho vs resultado en vivo
    const predRes = getResult(p.col, p.rival);
    const liveRes = getResult(liveCol, liveRiv);
    const resultMatch = predRes.rank === liveRes.rank;

    // ── Verificar si el marcador todavía es alcanzable ──
    // Si los goles en vivo ya superaron lo que predijo para cualquier equipo,
    // esa predicción está matemáticamente eliminada
    const colEliminado  = liveCol > p.col;   // Colombia ya metió más goles de los que predijo
    const rivEliminado  = liveRiv > p.rival; // El rival ya metió más goles de los que predijo
    const stillPossible = !colEliminado && !rivEliminado;

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
    const predRes = getResult(p.col, p.rival);

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
            <span class="score-col">${p.col}</span>
            <span class="score-div">:</span>
            <span class="score-riv">${p.rival}</span>
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
  if (state.liveCol === null) {
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
    p.col === state.liveCol && p.rival === state.liveRiv
  );
  const totalPot   = state.cuota * state.participants.length;
  const prizeEach  = winners.length > 0 ? totalPot / winners.length : 0;

  // Mostrar modal de resultado
  const liveRes = getResult(state.liveCol, state.liveRiv);
  const contentEl = document.getElementById('resultContent');
  contentEl.innerHTML = `
    <div class="final-scoreboard">
      <span>🇨🇴 Colombia</span>
      <span class="final-score">${state.liveCol} : ${state.liveRiv}</span>
      <span>${state.rivalFlag} ${escHtml(state.rival)}</span>
    </div>
    <div style="margin:16px 0;">
      <span class="result-tag ${liveRes.cls}">${liveRes.label}</span>
    </div>
    ${winners.length > 0
      ? `<p class="final-winners-label">🏆 Ganadores del pozo (${formatCOP(prizeEach)} c/u):</p>
         <ul class="final-winners-list">
           ${winners.map(w => `<li>🎉 ${escHtml(w.name)} — predicción ${w.col}:${w.rival}</li>`).join('')}
         </ul>`
      : `<p class="final-no-winner">😔 Nadie acertó el marcador exacto.</p>`
    }
    <p class="final-total">Pozo total: <strong>${formatCOP(totalPot)}</strong></p>
  `;
  document.getElementById('resultModalOverlay').classList.add('active');

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
  ['rival', 'cuota', 'participantName', 'scoreCol', 'scoreRival'].forEach(id => {
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
  ['liveCol','liveRiv'].forEach(id => {
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
    `🇨🇴 Colombia vs ${state.rivalFlag} ${state.rival}`;
  document.getElementById('exportPrize').textContent =
    formatCOP(state.cuota * state.participants.length);

  const exportBody = document.getElementById('exportTableBody');
  exportBody.innerHTML = state.participants.map((p, i) => {
    const res = getResult(p.col, p.rival);
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escHtml(p.name)}</td>
        <td>
          <span class="export-score-pill">
            <span class="export-col">${p.col}</span>
            <span class="export-div"> : </span>
            <span class="export-riv">${p.rival}</span>
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
    link.download = `pulla-colombia-vs-${state.rival.toLowerCase().replace(/\s+/g, '-')}.png`;
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
//  INIT
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();

  document.getElementById('rival').addEventListener('input', updateRival);
  document.getElementById('rival').addEventListener('change', updateRival);
  document.getElementById('cuota').addEventListener('input', updatePrize);
  document.getElementById('participantName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addParticipant();
  });

  await loadAndRestore();

  // Si no había datos previos, inicializar
  if (!state.participants.length && !state.closed) {
    updateRival();
    updatePrize();
    renderTable();
  }
});
