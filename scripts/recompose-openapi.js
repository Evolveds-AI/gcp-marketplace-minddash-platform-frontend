const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function deepSort(value) {
  if (Array.isArray(value)) {
    return value.map(deepSort);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = deepSort(value[k]);
    }
    return out;
  }
  return value;
}

function deepEqual(a, b) {
  const sa = JSON.stringify(deepSort(a));
  const sb = JSON.stringify(deepSort(b));
  return sa === sb;
}

function main() {
  const inputFile = process.argv[2] || path.join('openapi-fragments', 'manifest.json');
  const originalFile = process.argv[3] || 'enpoints.json';
  const outputFile = process.argv[4] || path.join('openapi-fragments', 'openapi.full.generated.json');

  const manifestAbs = path.resolve(process.cwd(), inputFile);
  const manifestDir = path.dirname(manifestAbs);

  const manifest = readJson(manifestAbs);

  const spec = {
    openapi: manifest.openapi,
    info: manifest.info,
    paths: {},
    components: {
      schemas: {}
    },
    tags: manifest.tags
  };

  const pathsFragments = manifest.fragments && manifest.fragments.paths ? manifest.fragments.paths : {};
  for (const [, meta] of Object.entries(pathsFragments)) {
    const fragAbs = path.resolve(manifestDir, meta.file);
    const frag = readJson(fragAbs);
    if (frag && frag.paths) {
      Object.assign(spec.paths, frag.paths);
    }
  }

  const schemasFragments = manifest.fragments && manifest.fragments.components && manifest.fragments.components.schemas
    ? manifest.fragments.components.schemas
    : {};
  for (const [, meta] of Object.entries(schemasFragments)) {
    const fragAbs = path.resolve(manifestDir, meta.file);
    const frag = readJson(fragAbs);
    if (frag && frag.schemas) {
      Object.assign(spec.components.schemas, frag.schemas);
    }
  }

  const outAbs = path.resolve(process.cwd(), outputFile);
  writeJson(outAbs, spec);

  const originalAbs = path.resolve(process.cwd(), originalFile);
  const original = readJson(originalAbs);

  const ok = deepEqual(original, spec);
  if (!ok) {
    console.error('Recomposition mismatch: generated spec differs from original.');
    process.exitCode = 2;
    return;
  }

  console.log(`Generated: ${outputFile}`);
  console.log('Validation: OK (matches original enpoints.json after deep key sort)');
}

main();
