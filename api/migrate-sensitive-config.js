import { createHash, timingSafeEqual } from 'node:crypto';

const REPO_OWNER = 'ARMS-REACH-DIGITAL-AGENCY';
const REPO_NAME = 'Sina';
const BRANCH = 'main';
const ADMIN_KEY_SHA256 = 'b93eb019b153a69c5d975796995c2745f969cb2c0fa8a3f955ccdf3c72b42a8e';
const MIGRATION_PATH = 'api/migrate-sensitive-config.js';

function validateAdminKey(value) {
  if (!value) return false;
  const actual = createHash('sha256').update(String(value)).digest();
  const expected = Buffer.from(ADMIN_KEY_SHA256, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

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
  return {
    sha: data.sha,
    content: Buffer.from(String(data.content || '').replace(/\s/g, ''), 'base64').toString('utf8'),
  };
}

async function writeFile(path, content, message, sha = null) {
  const body = {
    message,
    branch: BRANCH,
    content: Buffer.from(content, 'utf8').toString('base64'),
  };
  if (sha) body.sha = sha;
  return github(`/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
}

async function deleteFile(path, sha, message) {
  return github(`/contents/${path}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, branch: BRANCH, sha }),
  });
}

function removeConst(content, name) {
  return content.replace(new RegExp(`^const ${name} = ['\"][^'\"]+['\"];\\s*`, 'm'), '');
}

function prependImport(content, names, path) {
  const line = `import { ${names.join(', ')} } from '${path}';`;
  if (content.includes(line)) return content;
  return `${line}\n${content}`;
}

function transform(path, original) {
  let content = original;

  if (path === 'api/shopify-sync.js' || path === 'api/shopify-growth-sync.js') {
    content = removeConst(content, 'ADMIN_KEY');
    content = removeConst(content, 'SHEET_CSV_URL');
    content = prependImport(content, ['SHEET_CSV_URL', 'isAdminKeyValid as validateAdminKey'], '../lib/sina-config.mjs');
    content = content.replace(
      'const isAdminKeyValid = suppliedKey === ADMIN_KEY;',
      'const isAdminKeyValid = validateAdminKey(suppliedKey);'
    );
  } else if (path === 'api/debug-sheet.js') {
    content = removeConst(content, 'ADMIN_KEY');
    content = removeConst(content, 'SHEET_CSV_URL');
    content = prependImport(content, ['SHEET_CSV_URL', 'isAdminKeyValid as validateAdminKey'], '../lib/sina-config.mjs');
    content = content.replace(
      'if (suppliedKey !== ADMIN_KEY) {',
      'if (!validateAdminKey(suppliedKey)) {'
    );
  } else if (path === 'api/photoroom-edit.js') {
    content = removeConst(content, 'ADMIN_KEY');
    content = prependImport(content, ['isAdminKeyValid as validateAdminKey'], '../lib/sina-config.mjs');
    content = content.replace(
      'if (suppliedKey !== ADMIN_KEY) {',
      'if (!validateAdminKey(suppliedKey)) {'
    );
  } else if (path === 'api/catalog.js') {
    content = removeConst(content, 'SHEET_CSV_URL');
    content = prependImport(content, ['SHEET_CSV_URL'], '../lib/sina-config.mjs');
  } else if (path === 'scripts/sync-shopify.mjs') {
    content = removeConst(content, 'SHEET_CSV_URL');
    content = prependImport(content, ['SHEET_CSV_URL'], '../lib/sina-config.mjs');
  }

  return content;
}

function configSource(sheetUrl) {
  return `import { createHash, timingSafeEqual } from 'node:crypto';\n\nexport const SHEET_CSV_URL = ${JSON.stringify(sheetUrl)};\nconst ADMIN_KEY_SHA256 = '${ADMIN_KEY_SHA256}';\n\nexport function isAdminKeyValid(value) {\n  if (!value) return false;\n  const actual = createHash('sha256').update(String(value)).digest();\n  const expected = Buffer.from(ADMIN_KEY_SHA256, 'hex');\n  return actual.length === expected.length && timingSafeEqual(actual, expected);\n}\n`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const suppliedKey = req.headers['x-admin-key'] || req.query.key;
  if (!validateAdminKey(suppliedKey)) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Unauthorized.' }));
    return;
  }

  const mode = req.query.mode === 'apply' ? 'apply' : 'preview';
  const targets = [
    'api/shopify-sync.js',
    'api/shopify-growth-sync.js',
    'api/debug-sheet.js',
    'api/photoroom-edit.js',
    'api/catalog.js',
    'scripts/sync-shopify.mjs',
  ];

  try {
    const files = {};
    for (const path of targets) files[path] = await readFile(path);

    const sheetMatch = files['api/catalog.js'].content.match(/^const SHEET_CSV_URL = ['\"]([^'\"]+)['\"];$/m);
    if (!sheetMatch) throw new Error('Could not locate SHEET_CSV_URL in api/catalog.js.');
    const sheetUrl = sheetMatch[1];

    const transformed = targets.map((path) => ({
      path,
      changed: transform(path, files[path].content) !== files[path].content,
      stillContainsPlainAdminKey: /const ADMIN_KEY = ['\"][^'\"]+['\"];/.test(transform(path, files[path].content)),
      stillContainsSheetConst: /const SHEET_CSV_URL = ['\"][^'\"]+['\"];/.test(transform(path, files[path].content)),
    }));

    if (mode === 'preview') {
      res.statusCode = 200;
      res.end(JSON.stringify({ mode, transformed }, null, 2));
      return;
    }

    let configExisting = null;
    try {
      configExisting = await readFile('lib/sina-config.mjs');
    } catch (error) {
      if (!String(error.message).includes('(404)')) throw error;
    }

    await writeFile(
      'lib/sina-config.mjs',
      configSource(sheetUrl),
      'Centralize Sina sheet config and hashed admin authentication',
      configExisting?.sha || null
    );

    const updates = [];
    for (const path of targets) {
      const next = transform(path, files[path].content);
      if (next === files[path].content) {
        updates.push({ path, status: 'unchanged' });
        continue;
      }
      await writeFile(path, next, `Use centralized Sina config in ${path}`, files[path].sha);
      updates.push({ path, status: 'updated' });
    }

    const migrationFile = await readFile(MIGRATION_PATH);
    await deleteFile(MIGRATION_PATH, migrationFile.sha, 'Remove completed sensitive config migration');

    res.statusCode = 200;
    res.end(JSON.stringify({ mode, updates, migrationRemoved: true }, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }, null, 2));
  }
}
