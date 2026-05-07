/**
 * vite-plugin-bird-manifest.js
 *
 * Scans <publicDir>/ for subdirectories that contain a GLB file and writes
 * /public/object-manifest.json so the client can load all birds without hard-coding.
 *
 * A "bird folder" is any direct subdirectory of publicDir that contains at
 * least one *.glb file (searched one level deep: the folder itself or a
 * single `source/` sub-folder).
 *
 * Each entry in the manifest:
 *   { folder, glb, name, credit }
 *   - folder : URL path, e.g. "/phoenix-bird"
 *   - glb    : URL path to the GLB, e.g. "/phoenix-bird/source/phoenix_bird.glb"
 *   - name   : human-readable name derived from the folder name
 *   - credit : text content of credit.md if present, else ""
 */

import fs from 'fs';
import path from 'path';

/** Turn a folder name like "phoenix-bird3" → "Phoenix Bird 3" */
function toDisplayName(folderName) {
  return folderName
    .replace(/([-_\d])/g, (match) => {
      if (/\d/.test(match)) return ' ' + match;
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Find the first .glb inside `dir` or its `source/` sub-folder. Returns null if not found. */
function findGlb(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // direct GLB in folder root
  const direct = entries.find(
    (e) => e.isFile() && e.name.toLowerCase().endsWith('.glb')
  );
  if (direct) return direct.name;

  // GLB inside source/ sub-folder
  const sourceDir = path.join(dir, 'source');
  if (fs.existsSync(sourceDir)) {
    const sourceEntries = fs.readdirSync(sourceDir, { withFileTypes: true });
    const inSource = sourceEntries.find(
      (e) => e.isFile() && e.name.toLowerCase().endsWith('.glb')
    );
    if (inSource) return `source/${inSource.name}`;
  }

  return null;
}

/** Read credit.md and extract a single-line credit string. */
function readCredit(dir) {
  const candidates = ['credit.md', 'Credit.md', 'CREDIT.md', 'credits.md'];
  for (const c of candidates) {
    const p = path.join(dir, c);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8').trim().split('\n')[0].trim();
    }
  }
  return '';
}

function buildManifest(publicDir) {
  if (!fs.existsSync(publicDir)) return [];

  const entries = fs.readdirSync(publicDir, { withFileTypes: true });
  const birds = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(publicDir, entry.name);
    const glbRelative = findGlb(dir);
    if (!glbRelative) continue;

    birds.push({
      folder: `/${entry.name}`,
      glb: `/${entry.name}/${glbRelative}`,
      name: toDisplayName(entry.name),
      credit: readCredit(dir),
    });
  }

  // Sort alphabetically so order is stable
  birds.sort((a, b) => a.folder.localeCompare(b.folder));
  return birds;
}

export default function birdManifestPlugin() {
  let publicDir;
  let outPath;

  function write(dir) {
    const birds = buildManifest(dir);
    fs.writeFileSync(outPath, JSON.stringify(birds, null, 2), 'utf-8');
    console.log(`[bird-manifest] wrote ${birds.length} bird(s) → object-manifest.json`);
  }

  return {
    name: 'bird-manifest',

    configResolved(config) {
      publicDir = config.publicDir;             // e.g. /…/moremoreblossom/public
      outPath   = path.join(publicDir, 'object-manifest.json');
    },

    buildStart() {
      write(publicDir);
    },

    // In dev mode Vite doesn't call buildStart in the same way; use this hook:
    configureServer(server) {
      write(publicDir);

      // Re-generate when a folder is added/removed inside public/
      server.watcher.on('addDir', (p) => {
        if (path.dirname(p) === publicDir) write(publicDir);
      });
      server.watcher.on('unlinkDir', (p) => {
        if (path.dirname(p) === publicDir) write(publicDir);
      });
      server.watcher.on('add', (p) => {
        if (p.toLowerCase().endsWith('.glb')) write(publicDir);
      });
    },
  };
}
