const { isAdminKeyValid: validateAdminKey } = require('../lib/sina-config.js');
// One-off admin endpoint: runs a single product photo through Photoroom's
// AI editing API (background removal + clean dark background + square
// crop) and commits the result straight back into this repo via GitHub's
// Contents API. Everything happens server-to-server -- the image bytes
// never have to round-trip through the calling agent's own context, which
// is the only way this is practical across hundreds of photos.
// Gated by a bearer key baked in at deploy time; remove this file once the
// batch run is done.

const REPO_OWNER = 'ARMS-REACH-DIGITAL-AGENCY';
const REPO_NAME = 'Sina';
const IMAGE_BASE_URL = 'https://www.sinascreations.com/images/products';
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

  const candidates = [...new Set([statedExt, ...EXTENSION_CANDIDATES].filter(Boolean))];

  for (const ext of candidates) {
    const candidateName = `${base}.${ext}`;
    // HEAD requests don't reliably get correct content-type from Vercel's
    // static file serving -- use a ranged GET instead.
    const response = await fetch(`${IMAGE_BASE_URL}/${encodeURIComponent(candidateName)}`, {
      headers: { Range: 'bytes=0-0' },
    });
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.startsWith('image/')) {
      return candidateName;
    }
  }
  throw new Error(`No real image file found on disk for ${statedFilename} (tried ${candidates.join(', ')})`);
}

async function editWithPhotoroom(filename, { bgPrompt, backgroundImageUrl, outputSize, padding, sourceUrl, expand, cutout }) {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) throw new Error('PHOTOROOM_API_KEY is not configured.');

  const imageUrl = sourceUrl || `${IMAGE_BASE_URL}/${encodeURIComponent(filename)}`;

  // Transparent cutout only -- no background compositing at all. Used when
  // background.imageUrl (Photoroom's own static-background compositing)
  // turned out to be plan-gated; we composite onto our own background
  // ourselves instead of relying on Photoroom for that step.
  if (cutout) {
    const params = new URLSearchParams({
      imageUrl,
      removeBackground: 'true',
      'background.color': 'transparent',
      outputSize: outputSize || DEFAULT_OUTPUT_SIZE,
      padding: padding || '0.12',
      'export.format': 'png',
    });
    const response = await fetch(`https://image-api.photoroom.com/v2/edit?${params.toString()}`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Photoroom API failed (${response.status}): ${text}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  // background.imageUrl (static background compositing) is documented for
  // the POST/multipart endpoint, not GET query strings -- GET rejected it
  // and silently fell back to a transparent background, which then
  // conflicted with jpeg export. Everything else still goes through GET.
  if (backgroundImageUrl) {
    const form = new FormData();
    form.append('imageUrl', imageUrl);
    form.append('removeBackground', 'true');
    form.append('background.imageUrl', backgroundImageUrl);
    form.append('outputSize', outputSize || DEFAULT_OUTPUT_SIZE);
    form.append('padding', padding || '0.12');
    form.append('export.format', 'jpeg');
    form.append('shadow.mode', 'ai.soft');

    const response = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'pr-ai-background-model-version': STUDIO_MODEL_VERSION },
      body: form,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Photoroom API failed (${response.status}): ${text}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const params = expand
    ? new URLSearchParams({
        imageUrl,
        removeBackground: 'false',
        'expand.mode': 'ai.auto',
        referenceBox: 'originalImage',
        outputSize: outputSize || DEFAULT_OUTPUT_SIZE,
        'export.format': 'jpeg',
      })
    : new URLSearchParams({
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
  const response = await fetch('https://www.sinascreations.com/api/catalog');
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
  if (!validateAdminKey(suppliedKey)) {
    res.statusCode = 401;
    res.end('Unauthorized.');
    return;
  }

  if (req.query.mode === 'account') {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = process.env.PHOTOROOM_API_KEY;
    const candidates = [
      'https://api.photoroom.com/v1/account',
      'https://api.photoroom.com/account',
      'https://image-api.photoroom.com/v1/account',
      'https://image-api.photoroom.com/account',
      'https://api.photoroom.com/v1/credits',
    ];
    const results = {};
    for (const url of candidates) {
      try {
        const r = await fetch(url, { headers: { 'x-api-key': apiKey } });
        results[url] = { status: r.status, body: await r.text() };
      } catch (error) {
        results[url] = { error: error.message };
      }
    }
    res.statusCode = 200;
    res.end(JSON.stringify(results, null, 2));
    return;
  }

  if (req.query.mode === 'preview') {
    const filename = typeof req.query.filename === 'string' ? req.query.filename.trim() : '';
    const bgPrompt = typeof req.query.bgPrompt === 'string' && req.query.bgPrompt.trim() ? req.query.bgPrompt : undefined;
    const padding = typeof req.query.padding === 'string' && req.query.padding.trim() ? req.query.padding : undefined;
    const sourceUrl = typeof req.query.sourceUrl === 'string' && req.query.sourceUrl.trim() ? req.query.sourceUrl.trim() : undefined;
    const backgroundImageUrl = typeof req.query.backgroundImageUrl === 'string' && req.query.backgroundImageUrl.trim() ? req.query.backgroundImageUrl.trim() : undefined;
    const expand = req.query.expand === 'true';
    const cutout = req.query.cutout === 'true';
    if (!filename) {
      res.statusCode = 400;
      res.end('Missing filename query param.');
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    try {
      // sourceUrl bypasses the repo entirely (e.g. testing directly against
      // a Shopify-hosted image), so there's no repo file to resolve.
      const realFilename = sourceUrl ? filename : await resolveRealFilename(filename);
      const buffer = await editWithPhotoroom(realFilename, { bgPrompt, backgroundImageUrl, padding, sourceUrl, expand, cutout });
      // Commit to a throwaway _preview path rather than streaming bytes back
      // -- this endpoint is only reachable through a tool that mangles raw
      // binary responses, but a git pull + local file read is lossless.
      const outputPath = `${OUTPUT_PATH_PREFIX}/_preview_${cutout ? `${realFilename}.cutout.png` : realFilename}`;
      const commitSha = await commitToGithub(outputPath, buffer);
      res.statusCode = 200;
      res.end(JSON.stringify({ filename: realFilename, outputPath, commitSha, bytes: buffer.length }));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
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
