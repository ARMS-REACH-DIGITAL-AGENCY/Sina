// One-off admin endpoint: runs a single product photo through Photoroom's
// AI editing API (background removal + clean dark background + square
// crop) and commits the result straight back into this repo via GitHub's
// Contents API. Everything happens server-to-server -- the image bytes
// never have to round-trip through the calling agent's own context, which
// is the only way this is practical across hundreds of photos.
// Gated by a bearer key baked in at deploy time; remove this file once the
// batch run is done.

const ADMIN_KEY = 'ce4dbfc3c446ba331b5dda0b4cea3bd7726a7f59c7c8a8e0';
const REPO_OWNER = 'ARMS-REACH-DIGITAL-AGENCY';
const REPO_NAME = 'Sina';
const IMAGE_BASE_URL = 'https://sinasglass.com/images/products';
const OUTPUT_PATH_PREFIX = 'public/images/products';
const DEFAULT_OUTPUT_SIZE = '1200x1200';
const DEFAULT_BG_PROMPT =
  'a minimalist studio background with a subtle, smooth gradient of cool grey and muted teal. The surface is a clean, matte plaster with a slight texture that catches soft studio lighting, creating gentle highlights and shadows. The angle remains a direct front view, placing the product centrally, with a shallow depth of field blurring the gradient slightly to keep the focus sharply on the product. The overall mood is modern, clean, and elegant, allowing the intricate patterns of the glass to be the sole visual interest against a sophisticated, unobtrusive backdrop.';
const STUDIO_MODEL_VERSION = 'background-studio-beta-2025-03-17';

const EXTENSION_CANDIDATES = ['JPG', 'jpg', 'jpeg', 'JPEG', 'png', 'PNG'];

// The live catalog's stated filename extension doesn't always match what's
// actually on disk (the frontend itself falls through several candidate
// extensions for the same reason -- camera exports, case differences, etc).
// Mirror that same resilience here instead of trusting the catalog blindly.
async function resolveRealFilename(statedFilename) {
  const dot = statedFilename.lastIndexOf('.');
  const base = dot === -1 ? statedFilename : statedFilename.slice(0, dot);
  const statedExt = dot === -1 ? '' : statedFilename.slice(dot + 1);

  const candidates = [statedExt, ...EXTENSION_CANDIDATES].filter(Boolean);
  const tried = new Set();

  for (const ext of candidates) {
    if (tried.has(ext.toLowerCase())) continue;
    tried.add(ext.toLowerCase());
    const candidateName = `${base}.${ext}`;
    const response = await fetch(`${IMAGE_BASE_URL}/${encodeURIComponent(candidateName)}`, { method: 'HEAD' });
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.startsWith('image/')) {
      return candidateName;
    }
  }
  throw new Error(`No real image file found on disk for ${statedFilename} (tried ${candidates.join(', ')})`);
}

async function editWithPhotoroom(filename, { bgPrompt, outputSize, padding }) {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) throw new Error('PHOTOROOM_API_KEY is not configured.');

  const imageUrl = `${IMAGE_BASE_URL}/${encodeURIComponent(filename)}`;
  const params = new URLSearchParams({
    imageUrl,
    removeBackground: 'true',
    'background.prompt': bgPrompt || DEFAULT_BG_PROMPT,
    outputSize: outputSize || DEFAULT_OUTPUT_SIZE,
    padding: padding || '0.12',
    'export.format': 'jpeg',
    'shadow.mode': 'ai.soft',
  });

  const response = await fetch(`https://image-api.photoroom.com/v2/edit?${params.toString()}`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'pr-ai-background-model-version': STUDIO_MODEL_VERSION,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Photoroom API failed (${response.status}): ${text}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_CONTENTS_TOKEN;
  if (!token) throw new Error('GITHUB_CONTENTS_TOKEN is not configured.');

  const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function getExistingSha(outputPath) {
  const { ok, data } = await githubRequest(`contents/${outputPath}?ref=main`);
  if (!ok) return null;
  return data.sha || null;
}

async function commitToGithub(outputPath, buffer) {
  const sha = await getExistingSha(outputPath);
  const body = {
    message: `Photoroom edit: ${outputPath}`,
    content: buffer.toString('base64'),
    branch: 'main',
  };
  if (sha) body.sha = sha;

  const { ok, status, data } = await githubRequest(`contents/${outputPath}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  if (!ok) {
    throw new Error(`GitHub commit failed (${status}): ${JSON.stringify(data)}`);
  }
  return data.commit?.sha || null;
}

async function processOne(statedFilename) {
  const realFilename = await resolveRealFilename(statedFilename);
  const buffer = await editWithPhotoroom(realFilename, {});
  const outputPath = `${OUTPUT_PATH_PREFIX}/${realFilename}`;
  const commitSha = await commitToGithub(outputPath, buffer);
  return { filename: realFilename, outputPath, commitSha, bytes: buffer.length };
}

async function fetchLiveFilenames() {
  const response = await fetch('https://sinasglass.com/api/catalog');
  if (!response.ok) throw new Error(`catalog fetch failed (${response.status})`);
  const data = await response.json();
  const filenames = new Set();
  for (const product of data.products || []) {
    const img = product.image || '';
    if (img.startsWith('/images/products/')) {
      filenames.add(img.split('/').pop());
    }
  }
  return Array.from(filenames).sort();
}

export default async function handler(req, res) {
  const suppliedKey = req.headers['x-admin-key'] || req.query.key;
  if (suppliedKey !== ADMIN_KEY) {
    res.statusCode = 401;
    res.end('Unauthorized.');
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  if (req.query.mode === 'batch') {
    const offset = Number.parseInt(req.query.offset, 10) || 0;
    const limit = Number.parseInt(req.query.limit, 10) || 8;
    const skip = new Set(
      (typeof req.query.skip === 'string' ? req.query.skip.split(',') : []).map((s) => s.trim()).filter(Boolean)
    );

    try {
      const allFilenames = await fetchLiveFilenames();
      const eligible = allFilenames.filter((f) => !skip.has(f));
      const batch = eligible.slice(offset, offset + limit);

      const results = [];
      for (const filename of batch) {
        try {
          results.push({ ...(await processOne(filename)), status: 'done' });
        } catch (error) {
          results.push({ filename, status: 'error', error: error.message });
        }
      }

      const nextOffset = offset + limit;
      res.statusCode = 200;
      res.end(
        JSON.stringify(
          {
            totalEligible: eligible.length,
            batchStart: offset,
            batchSize: batch.length,
            results,
            done: nextOffset >= eligible.length,
            nextOffset: nextOffset < eligible.length ? nextOffset : null,
          },
          null,
          2
        )
      );
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  const filename = typeof req.query.filename === 'string' ? req.query.filename.trim() : '';
  if (!filename) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing filename query param.' }));
    return;
  }

  try {
    const result = await processOne(filename);
    res.statusCode = 200;
    res.end(JSON.stringify({ ...result, status: 'done' }, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ filename, error: error.message }));
  }
}
