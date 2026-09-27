/*
 * Traduce entre el objeto "assistant" que usa el frontend (idéntico al que
 * ya diseñamos para el Artifact) y las páginas de la base de datos de Notion.
 *
 * Fuente de verdad en Notion: la propiedad "Datos Completos (JSON)" guarda
 * el objeto assistant completo (repartido en varios bloques de rich_text
 * porque Notion limita cada bloque a 2000 caracteres). Todas las demás
 * propiedades (Nombre, Estado, Plataforma Principal, etc.) son un espejo
 * de solo-lectura pensado para poder filtrar/ver los asistentes desde la
 * propia interfaz de Notion — el backend nunca las usa para reconstruir
 * el objeto, siempre lee del JSON.
 */

const STATE_ORDER = ['nuevo', 'diagnostico', 'listo', 'estrategia', 'pdf', 'entregado'];
const STATE_LABELS = {
  nuevo: 'Nuevo',
  diagnostico: 'Diagnóstico completado',
  listo: 'Listo para estrategia',
  estrategia: 'Estrategia generada',
  pdf: 'PDF generado',
  entregado: 'Entregado',
};
const LABEL_TO_STATE = Object.fromEntries(Object.entries(STATE_LABELS).map(([k, v]) => [v, k]));

function atLeastState(current, target) {
  return STATE_ORDER.indexOf(target) > STATE_ORDER.indexOf(current || 'nuevo') ? target : current;
}

function chunkedRichText(str) {
  const s = String(str == null ? '' : str);
  const chunks = [];
  for (let i = 0; i < s.length; i += 1900) chunks.push(s.slice(i, i + 1900));
  if (chunks.length === 0) chunks.push('');
  return { rich_text: chunks.slice(0, 100).map((c) => ({ type: 'text', text: { content: c } })) };
}
function readRichText(prop) {
  if (!prop || !prop.rich_text) return '';
  return prop.rich_text.map((b) => (b.plain_text != null ? b.plain_text : (b.text && b.text.content) || '')).join('');
}
function rt(text) {
  const s = String(text == null ? '' : text).slice(0, 1900);
  return { rich_text: s ? [{ type: 'text', text: { content: s } }] : [] };
}
function title(text) {
  const s = String(text == null ? '' : text).slice(0, 1900) || 'Sin nombre';
  return { title: [{ type: 'text', text: { content: s } }] };
}
function sel(name) {
  return name ? { select: { name: String(name) } } : { select: null };
}
function multiSel(arr) {
  return { multi_select: (arr || []).filter(Boolean).map((v) => ({ name: String(v) })) };
}
function num(value) {
  if (value == null || value === '') return { number: null };
  const n = Number(String(value).replace(/[^\d.-]/g, ''));
  return { number: Number.isFinite(n) ? n : null };
}
function chk(b) {
  return { checkbox: !!b };
}
function dateProp(iso) {
  if (!iso) return { date: null };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: null };
  return { date: { start: d.toISOString() } };
}
function looksLikeUrl(v) {
  return typeof v === 'string' && /^https?:\/\//i.test(v.trim());
}
function handleUrl(handle, base) {
  if (!handle) return { url: null };
  const h = String(handle).trim();
  if (!h) return { url: null };
  if (looksLikeUrl(h)) return { url: h };
  return { url: base + h.replace(/^@/, '') };
}
function websiteUrl(v) {
  if (!v) return { url: null };
  const s = String(v).trim();
  if (!s) return { url: null };
  return { url: looksLikeUrl(s) ? s : 'https://' + s.replace(/^\/*/, '') };
}
function facebookUrl(v) {
  if (!v) return { url: null };
  return looksLikeUrl(v) ? { url: String(v).trim() } : { url: null };
}

function diagnosisSummary(diag) {
  if (!diag) return '';
  return [
    '1. Situación actual: ' + (diag.situacionActual || ''),
    '2. Principal oportunidad: ' + (diag.oportunidad || ''),
    '3. Principal problema: ' + (diag.problema || ''),
    '4. Cliente objetivo: ' + (diag.clienteObjetivo || ''),
    '5. Posicionamiento recomendado: ' + (diag.posicionamiento || ''),
    '6. Pilares de contenido: ' + (diag.pilares || []).join(' | '),
    '7. Tipo de contenido recomendado: ' + (diag.tipoContenido || ''),
    '8. Oportunidades de crecimiento: ' + (diag.oportunidadesCrecimiento || ''),
    '9. Prioridades: ' + (diag.prioridades90 || ''),
  ].join('\n\n');
}

const STRATEGY_SECTION_ORDER = [
  ['diagnostico', '01 Diagnóstico'], ['posicionamiento', '02 Posicionamiento'], ['clienteIdeal', '03 Cliente ideal'],
  ['pilares', '04 Pilares'], ['ideas', '05 Ideas'], ['hooks', '06 Hooks'], ['reels', '07 Reels'],
  ['stories', '08 Stories'], ['carruseles', '09 Carruseles'], ['calendario', '10 Calendario'],
  ['ctas', '11 CTAs'], ['publicidad', '12 Publicidad'], ['ia', '13 IA'], ['plan90', '14 Plan de 90 días'],
];
function strategySummary(estrategia) {
  const s = (estrategia && estrategia.sections) || {};
  return STRATEGY_SECTION_ORDER.filter(([k]) => s[k] && String(s[k]).trim())
    .map(([k, label]) => label + ': ' + s[k])
    .join('\n\n');
}

/** assistant (frontend shape) -> Notion page properties */
function toNotionProperties(a) {
  const p = a.personal || {};
  const neg = a.negocio || {};
  const pres = a.presencia || {};
  const pub = a.publico || {};
  const ren = a.rendimiento || {};
  const voz = a.voz || {};
  const cap = a.capacidad || {};
  const obj = a.objetivo || {};

  const properties = {
    'Datos Completos (JSON)': chunkedRichText(JSON.stringify(a)),
  };

  // Best-effort human-readable mirror. Wrapped so a single odd value never
  // blocks the write — the JSON blob above is always the source of truth.
  try {
    Object.assign(properties, {
      Nombre: title(p.nombre),
      Email: { email: p.email ? String(p.email).trim() : null },
      WhatsApp: { phone_number: p.whatsapp ? String(p.whatsapp).trim() : null },
      Ciudad: rt(p.ciudad),
      Instagram: handleUrl(p.instagram, 'https://instagram.com/'),
      TikTok: handleUrl(p.tiktok, 'https://www.tiktok.com/@'),
      Facebook: facebookUrl(p.facebook),
      Website: websiteUrl(p.website),
      Negocio: rt(neg.nombre),
      'Qué Vende': rt(neg.queVendes),
      'Producto Estrella': rt(neg.productoEstrella),
      'Cliente Ideal': rt(neg.clienteIdeal),
      'Objeción Principal': sel(neg.objecionPrincipal),
      'Plataforma Principal': sel(pres.plataformaPrincipal),
      Seguidores: num(pres.seguidoresActuales),
      'Alcance 30 Días': num(pres.alcanceConocido === 'Conozco el dato de los últimos 30 días' ? pres.alcance30dias : null),
      'Género Audiencia': sel(pub.generoAudiencia),
      'Rangos de Edad': multiSel(pub.rangosEdad),
      'Público es el Deseado': sel(pub.publicoActualEsDeseado),
      'Reels +10K': chk(ren.reelsSuperan10k === 'Sí'),
      'Forma de Hablar': multiSel(voz.formaHablar),
      'Días Disponibles': sel(cap.diasPorSemana),
      'Objetivo Temporada': sel(obj.objetivoPrincipal),
      'Temporadas de Interés': multiSel(obj.temporadaInteres),
      Fecha: dateProp(a.fechaRegistro),
      Estado: sel(STATE_LABELS[a.estado] || STATE_LABELS.nuevo),
      Diagnóstico: rt(diagnosisSummary(a.diagnostico)),
      Estrategia: rt(strategySummary(a.estrategia)),
      Entregado: chk(!!a.entregado),
    });
  } catch (e) {
    console.warn('No se pudo construir el espejo legible de propiedades de Notion (se guarda igual el JSON completo):', e.message);
  }

  return properties;
}

/** Notion page -> assistant (frontend shape) */
function fromNotionPage(page) {
  const jsonProp = page.properties && page.properties['Datos Completos (JSON)'];
  const raw = readRichText(jsonProp);
  let assistant;
  try {
    assistant = raw ? JSON.parse(raw) : null;
  } catch (e) {
    assistant = null;
  }
  if (!assistant) {
    // Fallback defensivo si el JSON no se pudo leer: reconstruye lo mínimo desde las propiedades visibles.
    const props = page.properties || {};
    assistant = {
      personal: { nombre: (props.Nombre && props.Nombre.title || []).map((t) => t.plain_text).join('') || 'Sin nombre' },
      negocio: {}, presencia: {}, publico: {}, rendimiento: {}, voz: {}, capacidad: {}, objetivo: {}, oro: {},
      estrategia: { sections: {} }, pdf: { status: 'no_generado' }, estado: 'nuevo', entregado: false,
    };
  }
  assistant.id = page.id;
  return assistant;
}

module.exports = {
  STATE_ORDER, STATE_LABELS, LABEL_TO_STATE, atLeastState,
  toNotionProperties, fromNotionPage, diagnosisSummary, strategySummary,
};
