/* ==========================================================
   PULLA COLOMBIA - MUNDIAL 2026
   app.js — Toda la lógica de la aplicación
   ========================================================== */

// ── Estado global ────────────────────────────────────────────
const state = {
  rival: 'Rival',
  rivalFlag: '🏳️',
  cuota: 50000,
  participants: [],
  closed: false,
  editingId: null,
};

// ── Utilidades ────────────────────────────────────────────────
function formatCOP(n) {
  if (!n && n !== 0) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

function getResult(col, rival) {
  col = parseInt(col); rival = parseInt(rival);
  if (col > rival)  return { label: 'Victoria 🇨🇴', cls: 'result-win',  exportCls: 'export-win' };
  if (col === rival) return { label: 'Empate',       cls: 'result-draw', exportCls: 'export-draw' };
  return { label: 'Derrota',          cls: 'result-lose', exportCls: 'export-lose' };
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
  const key = name.trim().toLowerCase();
  return FLAGS[key] || '🏳️';
}

// ── Actualizar UI rival ───────────────────────────────────────
function updateRival() {
  const val = document.getElementById('rival').value.trim();
  state.rival = val || 'Rival';
  state.rivalFlag = getFlag(state.rival);

  document.getElementById('rivalFlag').textContent = state.rivalFlag;
  document.getElementById('rivalNameDisplay').textContent = state.rival;
  document.getElementById('rivalHead').textContent = state.rival;
  document.getElementById('rivalScoreLabel').textContent = state.rival;

  const th = document.querySelector('.th-score');
  if (th) th.innerHTML = `Marcador 🇨🇴 vs <span id="rivalHead">${state.rival}</span>`;
}

// ── Actualizar cuota y pozo ───────────────────────────────────
function updatePrize() {
  const raw = parseFloat(document.getElementById('cuota').value) || 0;
  state.cuota = raw;
  const total = raw * state.participants.length;
  document.getElementById('prizeAmount').textContent = formatCOP(total);
  document.getElementById('prizeSub').textContent =
    `${state.participants.length} participante${state.participants.length !== 1 ? 's' : ''} × ${formatCOP(raw)}`;
}

// ── Agregar participante ──────────────────────────────────────
function addParticipant() {
  if (state.closed) { showToast('⛔ Las inscripciones están cerradas'); return; }

  const nameEl  = document.getElementById('participantName');
  const scoreColEl  = document.getElementById('scoreCol');
  const scoreRivEl  = document.getElementById('scoreRival');

  const name = nameEl.value.trim();
  const col  = parseInt(scoreColEl.value) || 0;
  const riv  = parseInt(scoreRivEl.value) || 0;

  if (!name) { showToast('⚠️ Ingresa el nombre del participante'); nameEl.focus(); return; }

  if (state.editingId) {
    // Editar existente
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
}

// ── Editar participante ───────────────────────────────────────
function editParticipant(id) {
  if (state.closed) return;
  const p = state.participants.find(p => p.id === id);
  if (!p) return;

  state.editingId = id;
  document.getElementById('participantName').value = p.name;
  document.getElementById('scoreCol').value  = p.col;
  document.getElementById('scoreRival').value = p.rival;
  document.getElementById('addBtn').textContent = '✏️ Guardar cambio';
  document.getElementById('addHint').textContent = `Editando a: ${p.name}`;
  document.getElementById('participantName').focus();
  document.getElementById('addSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Eliminar participante ─────────────────────────────────────
function deleteParticipant(id) {
  if (state.closed) return;
  const p = state.participants.find(p => p.id === id);
  if (!p) return;
  state.participants = state.participants.filter(p => p.id !== id);
  if (state.editingId === id) {
    state.editingId = null;
    document.getElementById('addBtn').textContent = '＋ Inscribir';
    document.getElementById('participantName').value = '';
    document.getElementById('scoreCol').value = 0;
    document.getElementById('scoreRival').value = 0;
  }
  renderTable();
  updatePrize();
  showToast(`🗑️ ${p.name} eliminado`);
}

// ── Renderizar tabla ──────────────────────────────────────────
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
    const actionsHtml = state.closed
      ? '<span style="color:rgba(255,255,255,0.2);font-size:12px;">—</span>'
      : `<div class="action-cell">
           <button class="btn btn-edit" onclick="editParticipant('${p.id}')">✏️ Editar</button>
           <button class="btn btn-delete" onclick="deleteParticipant('${p.id}')">🗑️</button>
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

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Cerrar inscripciones ──────────────────────────────────────
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

  // Deshabilitar campos de entrada
  ['rival', 'cuota', 'participantName', 'scoreCol', 'scoreRival'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });
  document.getElementById('addBtn').disabled = true;
  document.getElementById('closeRegBtn').disabled = true;
  document.getElementById('closeRegBtn').style.opacity = '0.4';
  document.getElementById('closeRegBtn').style.cursor = 'not-allowed';

  // Status badge
  const badge = document.getElementById('statusBadge');
  badge.classList.remove('open');
  badge.classList.add('closed');
  badge.innerHTML = '<span class="status-dot"></span><span class="status-text">Inscripciones cerradas 🔒</span>';

  renderTable();
  showToast('🔒 Inscripciones cerradas. ¡Ya no se puede modificar!');
}

// ── Exportar imagen ───────────────────────────────────────────
async function exportImage() {
  if (state.participants.length === 0) {
    showToast('⚠️ No hay participantes para exportar');
    return;
  }

  // Preparar preview oculto
  const matchLabel = `Colombia ${state.participants[0] ? '' : ''}vs ${state.rival}`;
  document.getElementById('exportMatchLabel').textContent = `🇨🇴 Colombia vs ${state.rivalFlag} ${state.rival}`;
  document.getElementById('exportPrize').textContent = formatCOP(state.cuota * state.participants.length);

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
            <span>${p.rival}</span>
          </span>
        </td>
        <td><span class="export-tag ${res.exportCls}">${res.label}</span></td>
      </tr>`;
  }).join('');

  const preview = document.getElementById('exportPreview');
  preview.style.display = 'block';

  try {
    // Cargar html2canvas dinámicamente
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

    // Descargar
    const link = document.createElement('a');
    link.download = `pulla-colombia-vs-${state.rival.toLowerCase().replace(/\s+/g,'-')}.png`;
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

// ── Event listeners ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Rival input
  document.getElementById('rival').addEventListener('input', updateRival);
  document.getElementById('rival').addEventListener('change', updateRival);

  // Cuota input
  document.getElementById('cuota').addEventListener('input', updatePrize);

  // Enter en nombre para inscribir
  document.getElementById('participantName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addParticipant();
  });

  // Inicializar
  updateRival();
  updatePrize();
  renderTable();
});
