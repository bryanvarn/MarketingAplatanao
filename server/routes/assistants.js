const express = require('express');
const notion = require('../lib/notionClient');
const { toNotionProperties, fromNotionPage, atLeastState } = require('../lib/mapping');
const { requireAdmin } = require('../lib/authMiddleware');

const router = express.Router();

function dbId() {
  const id = process.env.NOTION_DATABASE_ID;
  if (!id) {
    const err = new Error('NOTION_DATABASE_ID no está configurada en el servidor.');
    err.status = 503;
    throw err;
  }
  return id;
}

function handleError(res, e) {
  console.error(e);
  res.status(e.status || 500).json({ error: e.message || 'Error interno del servidor.' });
}

function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch;
  if (patch && typeof patch === 'object') {
    const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
    for (const k of Object.keys(patch)) out[k] = deepMerge(base ? base[k] : undefined, patch[k]);
    return out;
  }
  return patch === undefined ? base : patch;
}

// Público: el formulario del asistente crea su propio registro, sin login.
router.post('/', async (req, res) => {
  try {
    const assistant = req.body;
    if (!assistant || !assistant.personal || !String(assistant.personal.nombre || '').trim()) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (nombre).' });
    }
    const page = await notion.createPage(dbId(), toNotionProperties(assistant));
    res.status(201).json({ ...assistant, id: page.id });
  } catch (e) {
    handleError(res, e);
  }
});

// Admin: lista completa para el dashboard.
router.get('/', requireAdmin, async (req, res) => {
  try {
    const pages = await notion.queryDatabase(dbId(), {});
    const assistants = pages.map(fromNotionPage).sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
    res.json(assistants);
  } catch (e) {
    handleError(res, e);
  }
});

// Público: necesario para que el asistente vea su propia estrategia sin iniciar sesión.
// El ID (page id de Notion) actúa como token de acceso a ese único registro.
router.get('/:id', async (req, res) => {
  try {
    const page = await notion.getPage(req.params.id);
    res.json(fromNotionPage(page));
  } catch (e) {
    handleError(res, e);
  }
});

// Admin: actualizar cualquier parte del registro (estado, estrategia, pdf, entregado...).
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const currentPage = await notion.getPage(req.params.id);
    const current = fromNotionPage(currentPage);
    let merged = deepMerge(current, req.body || {});
    if (req.body && req.body.__atLeastState) {
      merged.estado = atLeastState(current.estado, req.body.__atLeastState);
    }
    await notion.updatePage(req.params.id, toNotionProperties(merged));
    res.json(merged);
  } catch (e) {
    handleError(res, e);
  }
});

module.exports = router;
