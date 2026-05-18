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

function compileInlineResponseSchema(fixtureName, operationPath, responseCode) {
  const fixture = loadFixture(fixtureName);
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
  const documentId = `https://example.com/${fixtureName}`;
  const schemaDocument = {
    $id: documentId,
    $defs: rewriteOpenApiRefs(fixture.components.schemas, documentId),
  };

  ajv.addSchema(schemaDocument);

  const responseSchema = fixture.paths[operationPath].get.responses[responseCode].content['application/json'].schema;
  const rewrittenResponse = rewriteOpenApiRefs(responseSchema, documentId);

  return ajv.compile({
    $id: `${documentId}/paths/${operationPath}/${responseCode}`,
    ...rewrittenResponse,
  });
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

async function validateInlineWithHyperjump(fixtureName, operationPath, responseCode, data) {
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

  const responseSchema = fixture.paths[operationPath].get.responses[responseCode].content['application/json'].schema;
  const rewrittenResponse = rewriteOpenApiRefs(responseSchema, documentId);

  const inlineSchemaId = `${documentId}/inline/${operationPath}/${responseCode}`;
  await addHyperjumpSchema({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: inlineSchemaId,
    ...rewrittenResponse,
  });

  const output = await validateHyperjumpSchema(inlineSchemaId, data, 'BASIC');
  return output.valid;
}

let externalDynamicRefLoaded = false;

async function validateExternalDynamicRefWithHyperjump(data) {
  const fixtureName = 'spec-semantics/external-dynamic-ref.yaml';
  const fixture = loadFixture(fixtureName);
  const sourceDocumentId = 'https://example.com/hyperjump/spec-semantics/external-dynamic-ref.yaml';
  const targetDocumentId = 'https://example.com/hyperjump/spec-semantics/external-dynamic-target.json';

  if (!externalDynamicRefLoaded) {
    await addHyperjumpSchema(JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'fixtures/spec-semantics/external-dynamic-target.json'), 'utf8'),
    ));
    await addHyperjumpSchema({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: sourceDocumentId,
      $defs: rewriteOpenApiRefs(fixture.components.schemas, sourceDocumentId),
    });
    externalDynamicRefLoaded = true;
  }

  const output = await validateHyperjumpSchema(`${sourceDocumentId}#/$defs/ExternalDynamicContainer`, data, 'BASIC');
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
    name: 'non-identifier schema key: valid localized category',
    fixture: 'non-identifier-schema-key.yaml',
    schema: 'localized-category',
    data: { id: 'root', displayName: 'Root', locale: 'en-US', children: [{ id: 'child', displayName: 'Child', locale: 'en-US', children: [] }] },
    expected: true,
  },
  {
    name: 'non-identifier schema key: invalid child missing localized fields',
    fixture: 'non-identifier-schema-key.yaml',
    schema: 'localized-category',
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
    name: 'nested workspace resources: invalid folder missing permissions (AJV resolves $dynamicRef to not: {} fallback, accepts invalid data)',
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
    knownGap: true,
  },
  {
    name: 'paginated generic: valid group page (AJV currently fails this pattern)',
    fixture: 'generic-schema-binding.yaml',
    schema: 'PaginatedGroupResponse',
    data: { items: [{ id: 'g1', name: 'Admins' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
    knownGap: true,
  },
  {
    name: 'generic schema binding: invalid group item',
    fixture: 'generic-schema-binding.yaml',
    schema: 'PaginatedGroupResponse',
    data: { items: [{ id: 'g1' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
  {
    name: 'generic schema binding: valid user page (AJV currently fails this pattern)',
    fixture: 'generic-schema-binding.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', email: 'user@example.com' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
    knownGap: true,
  },
  {
    name: 'generic schema binding: invalid user item',
    fixture: 'generic-schema-binding.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', name: 'Not a user' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
  {
    name: 'core semantics: same-resource dynamicRef behaves like ref',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'SameResourceDynamicRef',
    data: ['alpha', 'beta'],
    expected: false,
    knownGap: true,
  },
  {
    name: 'core semantics: same-resource dynamicRef rejects wrong item type',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'SameResourceDynamicRef',
    data: ['alpha', 42],
    expected: false,
  },
  {
    name: 'core semantics: dynamicRef to plain anchor behaves like ref',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'DynamicRefToPlainAnchor',
    data: ['alpha', 'beta'],
    expected: false,
    knownGap: true,
  },
  {
    name: 'core semantics: ref to dynamicAnchor behaves like ref',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'RefToDynamicAnchor',
    data: ['alpha', 'beta'],
    expected: true,
  },
  {
    name: 'core semantics: non-matching dynamicAnchor falls back to plain anchor',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'NonMatchingDynamicAnchor',
    data: [1, 2],
    expected: false,
    knownGap: true,
  },
  {
    name: 'core semantics: non-matching dynamicAnchor rejects fallback type mismatch',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'NonMatchingDynamicAnchor',
    data: ['alpha'],
    expected: false,
  },
  {
    name: 'core semantics: non-fragment URI dynamicRef validates target anchor',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'NonFragmentRoot',
    data: { foo: 'pass', bar: { baz: { foo: 'pass' } } },
    expected: false,
    knownGap: true,
  },
  {
    name: 'core semantics: non-fragment URI dynamicRef rejects target mismatch',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'NonFragmentRoot',
    data: { foo: 'pass', bar: { baz: { foo: 'fail' } } },
    expected: false,
    knownGap: true,
  },
  {
    name: 'core semantics: multi-parameter generic valid dictionary (AJV currently fails this pattern)',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'StringUserDictionary',
    data: { entries: [{ key: 'owner', value: { id: 'u1', email: 'user@example.com' } }] },
    expected: false,
    knownGap: true,
  },
  {
    name: 'core semantics: multi-parameter generic invalid dictionary item',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'StringUserDictionary',
    data: { entries: [{ key: 'owner', value: { id: 'u1', name: 'Not a user' } }] },
    expected: false,
  },
];

const inlineCases = [
  {
    name: 'paginated response: valid user page (AJV currently fails this pattern)',
    fixture: 'paginated-response.yaml',
    operationPath: '/users',
    responseCode: '200',
    data: { items: [{ id: 'u1', email: 'user@example.com' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
    knownGap: true,
  },
  {
    name: 'paginated response: invalid user item',
    fixture: 'paginated-response.yaml',
    operationPath: '/users',
    responseCode: '200',
    data: { items: [{ id: 'u1', name: 'Not a user' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
  {
    name: 'paginated response: valid group page (AJV currently fails this pattern)',
    fixture: 'paginated-response.yaml',
    operationPath: '/groups',
    responseCode: '200',
    data: { items: [{ id: 'g1', name: 'Admins' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
    knownGap: true,
  },
  {
    name: 'paginated response: invalid group item',
    fixture: 'paginated-response.yaml',
    operationPath: '/groups',
    responseCode: '200',
    data: { items: [{ id: 'g1' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
  {
    name: 'api envelope: valid single user response (AJV currently fails this pattern)',
    fixture: 'api-envelope.yaml',
    operationPath: '/users/{userId}',
    responseCode: '200',
    data: { data: { id: 'u1', email: 'user@example.com' }, requestId: '550e8400-e29b-41d4-a716-446655440000' },
    expected: false,
    knownGap: true,
  },
  {
    name: 'api envelope: invalid user in envelope',
    fixture: 'api-envelope.yaml',
    operationPath: '/users/{userId}',
    responseCode: '200',
    data: { data: { id: 'u1', name: 'Not a user' }, requestId: '550e8400-e29b-41d4-a716-446655440000' },
    expected: false,
  },
  {
    name: 'api envelope: valid paginated user list response (AJV currently fails this pattern)',
    fixture: 'api-envelope.yaml',
    operationPath: '/users',
    responseCode: '200',
    data: { data: { items: [{ id: 'u1', email: 'user@example.com' }], total: 1, page: 1, pageSize: 20 }, requestId: '550e8400-e29b-41d4-a716-446655440000' },
    expected: false,
    knownGap: true,
  },
  {
    name: 'api envelope: invalid user in paginated envelope',
    fixture: 'api-envelope.yaml',
    operationPath: '/users',
    responseCode: '200',
    data: { data: { items: [{ id: 'u1', name: 'Not a user' }], total: 1, page: 1, pageSize: 20 }, requestId: '550e8400-e29b-41d4-a716-446655440000' },
    expected: false,
  },
];

const hyperjumpCases = [
  {
    name: 'hyperjump non-identifier schema key: valid localized category',
    fixture: 'non-identifier-schema-key.yaml',
    schema: 'localized-category',
    data: { id: 'root', displayName: 'Root', locale: 'en-US', children: [{ id: 'child', displayName: 'Child', locale: 'en-US', children: [] }] },
    expected: true,
  },
  {
    name: 'hyperjump non-identifier schema key: invalid child missing localized fields',
    fixture: 'non-identifier-schema-key.yaml',
    schema: 'localized-category',
    data: { id: 'root', displayName: 'Root', locale: 'en-US', children: [{ id: 'child', children: [] }] },
    expected: false,
  },
  {
    name: 'hyperjump generic schema binding: valid group page',
    fixture: 'generic-schema-binding.yaml',
    schema: 'PaginatedGroupResponse',
    data: { items: [{ id: 'g1', name: 'Admins' }], total: 1, page: 1, pageSize: 10 },
    expected: true,
  },
  {
    name: 'hyperjump generic schema binding: invalid group item',
    fixture: 'generic-schema-binding.yaml',
    schema: 'PaginatedGroupResponse',
    data: { items: [{ id: 'g1' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
  {
    name: 'hyperjump generic schema binding: valid user page',
    fixture: 'generic-schema-binding.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', email: 'user@example.com' }], total: 1, page: 1, pageSize: 10 },
    expected: true,
  },
  {
    name: 'hyperjump generic schema binding: invalid user item',
    fixture: 'generic-schema-binding.yaml',
    schema: 'PaginatedUserResponse',
    data: { items: [{ id: 'u1', name: 'Not a user' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
];

const hyperjumpInlineCases = [
  {
    name: 'hyperjump paginated response: valid user page',
    fixture: 'paginated-response.yaml',
    operationPath: '/users',
    responseCode: '200',
    data: { items: [{ id: 'u1', email: 'user@example.com' }], total: 1, page: 1, pageSize: 10 },
    expected: true,
  },
  {
    name: 'hyperjump paginated response: invalid user item',
    fixture: 'paginated-response.yaml',
    operationPath: '/users',
    responseCode: '200',
    data: { items: [{ id: 'u1', name: 'Not a user' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
  {
    name: 'hyperjump paginated response: valid group page',
    fixture: 'paginated-response.yaml',
    operationPath: '/groups',
    responseCode: '200',
    data: { items: [{ id: 'g1', name: 'Admins' }], total: 1, page: 1, pageSize: 10 },
    expected: true,
  },
  {
    name: 'hyperjump paginated response: invalid group item',
    fixture: 'paginated-response.yaml',
    operationPath: '/groups',
    responseCode: '200',
    data: { items: [{ id: 'g1' }], total: 1, page: 1, pageSize: 10 },
    expected: false,
  },
];

const hyperjumpSemanticsCases = [
  {
    name: 'hyperjump core semantics: same-resource dynamicRef behaves like ref',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'SameResourceDynamicRef',
    data: ['alpha', 'beta'],
    expected: true,
  },
  {
    name: 'hyperjump core semantics: same-resource dynamicRef rejects wrong item type',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'SameResourceDynamicRef',
    data: ['alpha', 42],
    expected: false,
  },
  {
    name: 'hyperjump core semantics: dynamicRef to plain anchor behaves like ref',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'DynamicRefToPlainAnchor',
    data: ['alpha', 'beta'],
    expected: true,
  },
  {
    name: 'hyperjump core semantics: ref to dynamicAnchor behaves like ref',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'RefToDynamicAnchor',
    data: ['alpha', 'beta'],
    expected: true,
  },
  {
    name: 'hyperjump core semantics: non-matching dynamicAnchor falls back to plain anchor',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'NonMatchingDynamicAnchor',
    data: [1, 2],
    expected: true,
  },
  {
    name: 'hyperjump core semantics: non-fragment URI dynamicRef validates target anchor',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'NonFragmentRoot',
    data: { foo: 'pass', bar: { baz: { foo: 'pass' } } },
    expected: true,
  },
  {
    name: 'hyperjump core semantics: non-fragment URI dynamicRef rejects target mismatch',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'NonFragmentRoot',
    data: { foo: 'pass', bar: { baz: { foo: 'fail' } } },
    expected: false,
  },
  {
    name: 'hyperjump core semantics: multi-parameter generic valid dictionary',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'StringUserDictionary',
    data: { entries: [{ key: 'owner', value: { id: 'u1', email: 'user@example.com' } }] },
    expected: true,
  },
  {
    name: 'hyperjump core semantics: multi-parameter generic invalid dictionary item',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'StringUserDictionary',
    data: { entries: [{ key: 'owner', value: { id: 'u1', name: 'Not a user' } }] },
    expected: false,
  },
  {
    name: 'hyperjump core semantics: allOf order defs first',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'OrderDefsFirst',
    data: ['alpha', 'beta'],
    expected: true,
  },
  {
    name: 'hyperjump core semantics: allOf order ref first',
    fixture: 'spec-semantics/dynamicref-core-semantics.yaml',
    schema: 'OrderRefFirst',
    data: ['alpha', 'beta'],
    expected: true,
  },
];

const hyperjumpExternalCases = [
  {
    name: 'hyperjump external dynamicRef: valid external node',
    data: { item: { kind: 'external', value: 'ok' } },
    expected: true,
  },
  {
    name: 'hyperjump external dynamicRef: invalid external node',
    data: { item: { kind: 'external' } },
    expected: false,
  },
];

let failed = false;

console.log('=== AJV 2020 ===');
for (const testCase of cases) {
  let validate;
  let actual;
  let pass = false;

  try {
    validate = compileSchema(testCase.fixture, testCase.schema);
    actual = validate(testCase.data);
    pass = actual === testCase.expected;
  } catch (error) {
    if (testCase.knownGap) {
      console.log(`KNOWN-GAP ${testCase.name}`);
      console.log(`  expected=${testCase.expected} actual=error`);
      console.log(`  error=${error.message}`);
      continue;
    }

    failed = true;
    console.log(`FAIL ${testCase.name}`);
    console.log(`  error=${error.message}`);
    continue;
  }

  const label = pass && testCase.knownGap ? 'FIXED' : !pass && testCase.knownGap ? 'KNOWN-GAP' : pass ? 'PASS' : 'FAIL';
  console.log(`${label} ${testCase.name}`);
  console.log(`  expected=${testCase.expected} actual=${actual}`);

  if (!pass && !testCase.knownGap) {
    failed = true;
    console.log(`  errors=${JSON.stringify(validate?.errors, null, 2)}`);
  }
}

for (const testCase of inlineCases) {
  const validate = compileInlineResponseSchema(testCase.fixture, testCase.operationPath, testCase.responseCode);
  const actual = validate(testCase.data);
  const pass = actual === testCase.expected;

  const label = pass && testCase.knownGap ? 'FIXED' : !pass && testCase.knownGap ? 'KNOWN-GAP' : pass ? 'PASS' : 'FAIL';
  console.log(`${label} ${testCase.name}`);
  console.log(`  expected=${testCase.expected} actual=${actual}`);

  if (!pass && !testCase.knownGap) {
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

for (const testCase of hyperjumpInlineCases) {
  const actual = await validateInlineWithHyperjump(testCase.fixture, testCase.operationPath, testCase.responseCode, testCase.data);
  const pass = actual === testCase.expected;

  console.log(`${pass ? 'PASS' : 'FAIL'} ${testCase.name}`);
  console.log(`  expected=${testCase.expected} actual=${actual}`);

  if (!pass) {
    failed = true;
  }
}

for (const testCase of hyperjumpSemanticsCases) {
  const actual = await validateWithHyperjump(testCase.fixture, testCase.schema, testCase.data);
  const pass = actual === testCase.expected;

  console.log(`${pass ? 'PASS' : 'FAIL'} ${testCase.name}`);
  console.log(`  expected=${testCase.expected} actual=${actual}`);

  if (!pass) {
    failed = true;
  }
}

for (const testCase of hyperjumpExternalCases) {
  const actual = await validateExternalDynamicRefWithHyperjump(testCase.data);
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
