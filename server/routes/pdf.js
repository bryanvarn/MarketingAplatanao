const express = require('express');
const notion = require('../lib/notionClient');
const { fromNotionPage, toNotionProperties, atLeastState } = require('../lib/mapping');
const { renderPdf } = require('../lib/pdf');
const { buildPdfHtml } = require('../lib/pdfTemplate');
const { requireAdmin } = require('../lib/authMiddleware');

const router = express.Router();

function slug(s) {
  return String(s || 'estrategia')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'estrategia';
}

// Admin: genera el PDF Y marca el registro como "PDF generado" en Notion.
router.post('/:id', requireAdmin, async (req, res) => {
  try {
    const page = await notion.getPage(req.params.id);
    const assistant = fromNotionPage(page);
    const html = buildPdfHtml(assistant);
    const buffer = await renderPdf(html);

    const merged = {
      ...assistant,
      pdf: { status: 'generado', generatedAt: new Date().toISOString() },
      estado: atLeastState(assistant.estado, 'pdf'),
    };
    await notion.updatePage(req.params.id, toNotionProperties(merged));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="estrategia-' + slug(assistant.negocio && assistant.negocio.nombre) + '.pdf"');
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message || 'Error generando el PDF.' });
  }
});

// Público: permite que el propio asistente descargue su PDF ya generado
// desde su link único, sin iniciar sesión. Solo re-renderiza — no cambia
// el estado del registro (eso ya ocurrió cuando el admin lo generó).
router.get('/:id', async (req, res) => {
  try {
    const page = await notion.getPage(req.params.id);
    const assistant = fromNotionPage(page);
    if (!assistant.pdf || assistant.pdf.status !== 'generado') {
      return res.status(404).json({ error: 'Este asistente todavía no tiene un PDF generado.' });
    }
    const html = buildPdfHtml(assistant);
    const buffer = await renderPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="estrategia-' + slug(assistant.negocio && assistant.negocio.nombre) + '.pdf"');
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message || 'Error obteniendo el PDF.' });
  }
});

module.exports = router;
