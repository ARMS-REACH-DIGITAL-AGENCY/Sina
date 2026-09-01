const REPO_OWNER = 'ARMS-REACH-DIGITAL-AGENCY';
const REPO_NAME = 'Sina';
const BRANCH = 'main';

function githubHeaders() {
  const token = process.env.GITHUB_CONTENTS_TOKEN;
  if (!token) throw new Error('GITHUB_CONTENTS_TOKEN is not configured.');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${path}`, {
    ...options,
    headers: { ...githubHeaders(), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GitHub ${options.method || 'GET'} ${path} failed (${response.status}): ${JSON.stringify(data)}`);
  return data;
}

async function readFile(path) {
  const data = await github(`/contents/${path}?ref=${encodeURIComponent(BRANCH)}`);
  return { sha: data.sha, content: Buffer.from(String(data.content || '').replace(/\s/g, ''), 'base64').toString('utf8') };
}

async function writeFile(path, content, message, sha = null) {
  const body = { message, branch: BRANCH, content: Buffer.from(content, 'utf8').toString('base64') };
  if (sha) body.sha = sha;
  return github(`/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
}

async function deleteFile(path, sha, message) {
  return github(`/contents/${path}`, { method: 'DELETE', body: JSON.stringify({ message, branch: BRANCH, sha }) });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const oldConfig = await readFile('lib/sina-config.mjs');
    const configJs = oldConfig.content
      .replace("import { createHash, timingSafeEqual } from 'node:crypto';", "const { createHash, timingSafeEqual } = require('node:crypto');")
      .replace(/export const SHEET_CSV_URL = /, 'const SHEET_CSV_URL = ')
      .replace(/export function isAdminKeyValid\(value\)/, 'function isAdminKeyValid(value)')
      + '\n\nmodule.exports = { SHEET_CSV_URL, isAdminKeyValid };\n';

    let existingJs = null;
    try { existingJs = await readFile('lib/sina-config.js'); } catch (error) { if (!String(error.message).includes('(404)')) throw error; }
    await writeFile('lib/sina-config.js', configJs, 'Use CommonJS-compatible Sina shared config', existingJs?.sha || null);

    const apiFiles = ['api/shopify-sync.js','api/shopify-growth-sync.js','api/debug-sheet.js','api/photoroom-edit.js','api/catalog.js'];
    const updates = [];
    for (const path of apiFiles) {
      const file = await readFile(path);
      let next = file.content
        .replace("import { SHEET_CSV_URL, isAdminKeyValid as validateAdminKey } from '../lib/sina-config.mjs';", "const { SHEET_CSV_URL, isAdminKeyValid: validateAdminKey } = require('../lib/sina-config.js');")
        .replace("import { isAdminKeyValid as validateAdminKey } from '../lib/sina-config.mjs';", "const { isAdminKeyValid: validateAdminKey } = require('../lib/sina-config.js');")
        .replace("import { SHEET_CSV_URL } from '../lib/sina-config.mjs';", "const { SHEET_CSV_URL } = require('../lib/sina-config.js');");
      if (next !== file.content) {
        await writeFile(path, next, `Use CommonJS shared config in ${path}`, file.sha);
        updates.push(path);
      }
    }

    const script = await readFile('scripts/sync-shopify.mjs');
    const nextScript = script.content.replace(
      "import { SHEET_CSV_URL } from '../lib/sina-config.mjs';",
      "import sinaConfig from '../lib/sina-config.js';\nconst { SHEET_CSV_URL } = sinaConfig;"
    );
    if (nextScript !== script.content) {
      await writeFile('scripts/sync-shopify.mjs', nextScript, 'Use CommonJS shared config in Shopify script', script.sha);
      updates.push('scripts/sync-shopify.mjs');
    }

    await deleteFile('lib/sina-config.mjs', oldConfig.sha, 'Remove incompatible ESM shared config');
    const self = await readFile('api/fix-config-module.js');
    await deleteFile('api/fix-config-module.js', self.sha, 'Remove completed CommonJS compatibility fix');

    res.statusCode = 200;
    res.end(JSON.stringify({ updated: updates, fixed: true }, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }, null, 2));
  }
}
