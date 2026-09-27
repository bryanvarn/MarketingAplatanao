/*
 * Cliente delgado del API REST de Notion. Usa el token de una integración
 * interna de Notion (NOTION_API_KEY) — nunca el de esta sesión de Claude.
 * Requiere que esa integración tenga acceso concedido a la base de datos
 * (compartida desde Notion: "..." -> Add connections).
 */
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

class NotionNotConfiguredError extends Error {
  constructor() {
    super('NOTION_API_KEY no está configurada en el servidor.');
    this.code = 'NOTION_NOT_CONFIGURED';
    this.status = 503;
  }
}

function headers() {
  if (!process.env.NOTION_API_KEY) throw new NotionNotConfiguredError();
  return {
    Authorization: 'Bearer ' + process.env.NOTION_API_KEY,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function notionFetch(path, opts = {}) {
  const res = await fetch(NOTION_API + path, { ...opts, headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data && data.message) || 'Error de Notion API (' + res.status + ')');
    err.status = res.status;
    err.notion = data;
    throw err;
  }
  return data;
}

async function queryDatabase(databaseId, body = {}) {
  let results = [];
  let cursor;
  do {
    const data = await notionFetch('/databases/' + databaseId + '/query', {
      method: 'POST',
      body: JSON.stringify({ ...body, start_cursor: cursor }),
    });
    results = results.concat(data.results || []);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

function createPage(databaseId, properties) {
  return notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  });
}

function updatePage(pageId, properties) {
  return notionFetch('/pages/' + pageId, { method: 'PATCH', body: JSON.stringify({ properties }) });
}

function getPage(pageId) {
  return notionFetch('/pages/' + pageId, { method: 'GET' });
}

module.exports = { queryDatabase, createPage, updatePage, getPage, NotionNotConfiguredError };
