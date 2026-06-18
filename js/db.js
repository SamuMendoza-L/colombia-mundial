/* ============================================================
   db.js  —  Capa de base de datos con Supabase
   Todas las funciones devuelven { data, error }
   ============================================================ */

let supabaseClient = null;

function initSupabase() {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('✅ Supabase conectado');
  } catch (e) {
    console.warn('⚠️ Supabase no disponible, modo local activado:', e.message);
  }
}

// ── Verificar si Supabase está listo ─────────────────────────
function dbReady() {
  return supabaseClient !== null
    && SUPABASE_URL !== 'https://TUPROYECTO.supabase.co';
}

// ── Guardar estado completo del partido ───────────────────────
async function dbSaveMatch(matchData) {
  if (!dbReady()) return localSave('pulla_match', matchData);
  const { data, error } = await supabaseClient
    .from('matches')
    .upsert({ id: matchData.matchId, ...matchData }, { onConflict: 'id' });
  if (error) { console.error('dbSaveMatch:', error); localSave('pulla_match', matchData); }
  return { data, error };
}

// ── Cargar estado del partido ─────────────────────────────────
async function dbLoadMatch(matchId) {
  if (!dbReady()) return { data: localLoad('pulla_match'), error: null };
  const { data, error } = await supabaseClient
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();
  if (error) { console.error('dbLoadMatch:', error); return { data: localLoad('pulla_match'), error }; }
  return { data, error };
}

// ── Fallback localStorage ─────────────────────────────────────
function localSave(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
  return { data: val, error: null };
}
function localLoad(key) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch(e) { return null; }
}
