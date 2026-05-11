import Ajv2020 from 'ajv/dist/2020.js';
import '@hyperjump/json-schema/draft-2020-12';
import { addSchema as addHyperjumpSchema, validate as validateHyperjumpSchema } from '@hyperjump/json-schema';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const repoRoot = path.resolve(import.meta.dirname, '..');

function loadFixture(fileName) {
  const filePath = path.join(repoRoot, 'fixtures', fileName);
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function rewriteOpenApiRefs(value, documentId) {
  if (Array.isArray(value)) {
    return value.map((child) => rewriteOpenApiRefs(child, documentId));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const rewritten = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && typeof child === 'string' && child.startsWith('#/components/schemas/')) {
      rewritten[key] = `${documentId}${child.replace('#/components/schemas/', '#/$defs/')}`;
      continue;
    }

    rewritten[key] = rewriteOpenApiRefs(child, documentId);
  }

  return rewritten;
}

function compileSchema(fixtureName, schemaName) {
  const fixture = loadFixture(fixtureName);
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
  const documentId = `https://example.com/${fixtureName}`;
  const schemaDocument = {
    $id: documentId,
    $defs: rewriteOpenApiRefs(fixture.components.schemas, documentId),
  };

  ajv.addSchema(schemaDocument);
  return ajv.compile({ $ref: `${schemaDocument.$id}#/$defs/${schemaName}` });
}

const hyperjumpFixtures = new Set();

async function validateWithHyperjump(fixtureName, schemaName, data) {
  const fixture = loadFixture(fixtureName);
  const documentId = `https://example.com/hyperjump/${fixtureName}`;

  if (!hyperjumpFixtures.has(fixtureName)) {
    await addHyperjumpSchema({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: documentId,
      $defs: rewriteOpenApiRefs(fixture.components.schemas, documentId),
    });
    hyperjumpFixtures.add(fixtureName);
  }

  const output = await validateHyperjumpSchema(`${documentId}#/$defs/${schemaName}`, data, 'BASIC');
  return output.valid;
}

const cases = [
  {
    name: 'baseline duplicated pagination: valid user page',
    fixture: 'baseline-duplicated-pagination.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', email: 'user@example.com' }], total: 1, page: 1, pageSize: 10 },
    expected: true,
  },
  {
    name: 'baseline duplicated pagination: invalid user item',
    fixture: 'baseline-duplicated-pagination.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', name: 'Not a user' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
  {
    name: 'recursive category tree: valid localized category',
    fixture: 'recursive-category-tree.yaml',
    schema: 'LocalizedCategory',
    data: { id: 'root', displayName: 'Root', locale: 'en-US', children: [{ id: 'child', displayName: 'Child', locale: 'en-US', children: [] }] },
    expected: true,
  },
  {
    name: 'recursive category tree: invalid child missing localized fields',
    fixture: 'recursive-category-tree.yaml',
    schema: 'LocalizedCategory',
    data: { id: 'root', displayName: 'Root', locale: 'en-US', children: [{ id: 'child', children: [] }] },
    expected: false,
  },
  {
    name: 'nested workspace resources: valid workspace',
    fixture: 'nested-workspace-resources.yaml',
    schema: 'WorkspaceResponse',
    data: {
      root: {
        kind: 'folder',
        id: 'root',
        name: 'Root',
        permissions: ['read', 'write'],
        children: [
          { kind: 'document', id: 'd1', title: 'Document One' },
          { kind: 'folder', id: 'child', name: 'Child', permissions: ['read'], children: [], shortcuts: [] },
        ],
        shortcuts: [{ kind: 'folder', id: 'shortcut', name: 'Shortcut', permissions: ['read'], children: [], shortcuts: [] }],
      },
      related: [{ kind: 'folder', id: 'rel', name: 'Related', permissions: ['read'], children: [], shortcuts: [] }],
    },
    expected: true,
  },
  {
    name: 'nested workspace resources: invalid folder missing permissions',
    fixture: 'nested-workspace-resources.yaml',
    schema: 'WorkspaceResponse',
    data: {
      root: {
        kind: 'folder',
        id: 'root',
        name: 'Root',
        permissions: ['read'],
        children: [{ kind: 'folder', id: 'child', name: 'Child', children: [], shortcuts: [] }],
        shortcuts: [],
      },
      related: [],
    },
    expected: false,
  },
  {
    name: 'paginated generic: valid group page (AJV currently fails this pattern)',
    fixture: 'paginated-generic.yaml',
    schema: 'PaginatedGroupResponse',
    data: { items: [{ id: 'g1', name: 'Admins' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
    knownGap: true,
  },
  {
    name: 'paginated generic: invalid group item',
    fixture: 'paginated-generic.yaml',
    schema: 'PaginatedGroupResponse',
    data: { items: [{ id: 'g1' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
  {
    name: 'paginated generic: valid user page (AJV currently fails this pattern)',
    fixture: 'paginated-generic.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', email: 'user@example.com' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
    knownGap: true,
  },
  {
    name: 'paginated generic: invalid user item',
    fixture: 'paginated-generic.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', name: 'Not a user' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
];

const hyperjumpCases = [
  {
    name: 'hyperjump paginated generic: valid group page',
    fixture: 'paginated-generic.yaml',
    schema: 'PaginatedGroupResponse',
    data: { items: [{ id: 'g1', name: 'Admins' }], total: 1, page: 1, pageSize: 10 },
    expected: true,
  },
  {
    name: 'hyperjump paginated generic: invalid group item',
    fixture: 'paginated-generic.yaml',
    schema: 'PaginatedGroupResponse',
    data: { items: [{ id: 'g1' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
  {
    name: 'hyperjump paginated generic: valid user page',
    fixture: 'paginated-generic.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', email: 'user@example.com' }], total: 1, page: 1, pageSize: 10 },
    expected: true,
  },
  {
    name: 'hyperjump paginated generic: invalid user item',
    fixture: 'paginated-generic.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', name: 'Not a user' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
];

let failed = false;

console.log('=== AJV 2020 ===');
for (const testCase of cases) {
  const validate = compileSchema(testCase.fixture, testCase.schema);
  const actual = validate(testCase.data);
  const pass = actual === testCase.expected;

  const label = pass && testCase.knownGap ? 'KNOWN-GAP' : pass ? 'PASS' : 'FAIL';
  console.log(`${label} ${testCase.name}`);
  console.log(`  expected=${testCase.expected} actual=${actual}`);

  if (!pass) {
    failed = true;
    console.log(`  errors=${JSON.stringify(validate.errors, null, 2)}`);
  }
}

console.log('\n=== Hyperjump 2020-12 ===');
for (const testCase of hyperjumpCases) {
  const actual = await validateWithHyperjump(testCase.fixture, testCase.schema, testCase.data);
  const pass = actual === testCase.expected;

  console.log(`${pass ? 'PASS' : 'FAIL'} ${testCase.name}`);
  console.log(`  expected=${testCase.expected} actual=${actual}`);

  if (!pass) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
