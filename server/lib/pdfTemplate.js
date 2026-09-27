function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function val(x, fallback) {
  const s = (x == null ? '' : String(x)).trim();
  return s || fallback || 'Pendiente — completar en el editor de estrategia.';
}
function formatDate(iso) {
  try {
    return new Date(iso || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) {
    return '';
  }
}

function buildChapters(a) {
  const d = a.diagnostico || {};
  const es = (a.estrategia && a.estrategia.sections) || {};
  return [
    {
      kicker: 'Capítulo 1', title: 'Diagnóstico',
      sections: [
        ['Situación actual', d.situacionActual],
        ['Principal oportunidad', d.oportunidad],
        ['Principal problema', d.problema],
        ['Cliente objetivo', d.clienteObjetivo],
      ],
    },
    {
      kicker: 'Capítulo 2', title: 'Estrategia y posicionamiento',
      sections: [
        ['01 — Diagnóstico (ChatGPT)', es.diagnostico],
        ['02 — Posicionamiento', es.posicionamiento],
        ['03 — Cliente ideal', es.clienteIdeal],
        ['04 — Pilares de contenido', es.pilares],
      ],
    },
    {
      kicker: 'Capítulo 3', title: 'Plan de contenido',
      sections: [
        ['05 — Ideas de contenido', es.ideas],
        ['06 — Hooks', es.hooks],
        ['07 — Reels', es.reels],
        ['08 — Stories', es.stories],
        ['09 — Carruseles', es.carruseles],
        ['11 — CTAs', es.ctas],
      ],
    },
    { kicker: 'Capítulo 4', title: 'Calendario', sections: [['10 — Calendario de 30 días', es.calendario]] },
    {
      kicker: 'Capítulo 5', title: 'Publicidad, IA y plan de 90 días',
      sections: [
        ['12 — Publicidad', es.publicidad],
        ['13 — Uso de IA', es.ia],
        ['14 — Plan de 90 días', es.plan90],
      ],
    },
  ];
}

function buildPdfHtml(a) {
  const chapters = buildChapters(a);
  const nombre = (a.personal && a.personal.nombre) || 'Asistente';
  const negocio = (a.negocio && a.negocio.nombre) || 'Negocio';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap">' +
    '<style>' +
    '*{box-sizing:border-box;} body{margin:0;font-family:Manrope,Arial,sans-serif;color:#17140f;background:#fbf8f3;}' +
    'h1,h2,h3{font-family:Fraunces,Georgia,serif;font-weight:600;margin:0;}' +
    '.cover{background:#17140f;color:#fbf8f3;text-align:center;padding:100px 56px;height:100vh;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;}' +
    '.cover .mark{width:56px;height:56px;border-radius:16px;background:linear-gradient(155deg,#f2661a,#c94e10);margin:0 auto 28px;display:flex;align-items:center;justify-content:center;font-size:28px;}' +
    '.cover .kicker{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#f2661a;font-weight:700;}' +
    '.cover h1{font-size:46px;margin-top:16px;}' +
    '.cover .for{margin-top:48px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#cabfae;}' +
    '.cover .name{font-family:Fraunces,serif;font-size:26px;margin-top:8px;}' +
    '.cover .biz{font-size:16px;margin-top:4px;color:#d8cfc0;}' +
    '.cover .date{margin-top:40px;font-size:12px;color:#9c9280;}' +
    '.chapter{page-break-before:always;padding:44mm 20mm 20mm;}' +
    '.chapter .kicker{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#c94e10;}' +
    '.chapter h2{font-size:26px;margin-top:8px;margin-bottom:24px;}' +
    '.section{margin-bottom:24px;}' +
    '.section h3{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#4a4335;margin-bottom:6px;}' +
    '.section p{font-size:13.5px;line-height:1.7;white-space:pre-wrap;margin:0;}' +
    '.footer{position:fixed;bottom:10mm;left:20mm;right:20mm;display:flex;justify-content:space-between;font-size:9.5px;color:#8a806e;}' +
    '</style></head><body>' +
    '<div class="cover"><div class="mark">🍌</div><div class="kicker">Marketing Aplatanao</div><h1>Estrategia de<br>Contenido</h1>' +
    '<div class="for">Preparada para</div><div class="name">' + esc(nombre) + '</div><div class="biz">' + esc(negocio) + '</div>' +
    '<div class="date">' + esc(formatDate(new Date().toISOString())) + '</div></div>' +
    chapters.map((ch) =>
      '<div class="chapter"><div class="kicker">' + esc(ch.kicker) + '</div><h2>' + esc(ch.title) + '</h2>' +
      ch.sections.map(([h, t]) => '<div class="section"><h3>' + esc(h) + '</h3><p>' + esc(val(t)) + '</p></div>').join('') +
      '<div class="footer"><span>Marketing Aplatanao — Content Strategy Hub</span><span>' + esc(nombre) + ' · ' + esc(negocio) + '</span></div>' +
      '</div>'
    ).join('') +
    '</body></html>';
}

module.exports = { buildPdfHtml };
