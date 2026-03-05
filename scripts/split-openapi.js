const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function safeFileName(name) {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '') || '_';
}

function groupPathsByFirstSegment(pathsObj) {
  const groups = new Map();
  for (const [route, def] of Object.entries(pathsObj || {})) {
    const first = route.split('/').filter(Boolean)[0] || '_root';
    if (!groups.has(first)) groups.set(first, {});
    groups.get(first)[route] = def;
  }
  return groups;
}

function groupSchemasByPrefix(schemasObj) {
  const groups = new Map();
  for (const [name, schema] of Object.entries(schemasObj || {})) {
    const match = name.match(/^[A-Z][a-z0-9]+/);
    const prefix = (match ? match[0] : '_').toLowerCase();
    if (!groups.has(prefix)) groups.set(prefix, {});
    groups.get(prefix)[name] = schema;
  }
  return groups;
}

function main() {
  const inputFile = process.argv[2] || 'enpoints.json';
  const outDir = process.argv[3] || 'openapi-fragments';

  const inputAbs = path.resolve(process.cwd(), inputFile);
  const outAbs = path.resolve(process.cwd(), outDir);

  const spec = JSON.parse(fs.readFileSync(inputAbs, 'utf8'));

  ensureDir(outAbs);

  const manifest = {
    source: inputFile,
    generatedAt: new Date().toISOString(),
    openapi: spec.openapi,
    info: spec.info,
    tags: spec.tags,
    fragments: {
      paths: {},
      components: {}
    }
  };

  const pathsGroups = groupPathsByFirstSegment(spec.paths);
  const pathsDir = path.join(outAbs, 'paths');
  ensureDir(pathsDir);

  for (const [group, pathsObj] of [...pathsGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const fileName = `${safeFileName(group)}.json`;
    const relPath = path.posix.join('paths', fileName);
    writeJson(path.join(pathsDir, fileName), {
      paths: pathsObj
    });
    manifest.fragments.paths[group] = {
      file: relPath,
      count: Object.keys(pathsObj).length
    };
  }

  const componentsDir = path.join(outAbs, 'components');
  ensureDir(componentsDir);

  const schemas = spec.components && spec.components.schemas ? spec.components.schemas : {};
  const schemaGroups = groupSchemasByPrefix(schemas);
  const schemasDir = path.join(componentsDir, 'schemas');
  ensureDir(schemasDir);

  for (const [group, schemasObj] of [...schemaGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const fileName = `${safeFileName(group)}.json`;
    const relPath = path.posix.join('components', 'schemas', fileName);
    writeJson(path.join(schemasDir, fileName), {
      schemas: schemasObj
    });
    manifest.fragments.components.schemas = manifest.fragments.components.schemas || {};
    manifest.fragments.components.schemas[group] = {
      file: relPath,
      count: Object.keys(schemasObj).length
    };
  }

  const otherComponents = { ...(spec.components || {}) };
  delete otherComponents.schemas;
  if (Object.keys(otherComponents).length > 0) {
    const fileName = 'other-components.json';
    const relPath = path.posix.join('components', fileName);
    writeJson(path.join(componentsDir, fileName), otherComponents);
    manifest.fragments.components.other = {
      file: relPath,
      keys: Object.keys(otherComponents)
    };
  }

  writeJson(path.join(outAbs, 'manifest.json'), manifest);

  console.log(`Generated fragments in: ${outDir}`);
  console.log(`- Paths groups: ${pathsGroups.size}`);
  console.log(`- Schema groups: ${schemaGroups.size}`);
}

main();
