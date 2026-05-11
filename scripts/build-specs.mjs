import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const repoRoot = path.resolve(import.meta.dirname, '..');
const fixturesDir = path.join(repoRoot, 'fixtures');
const specsDir = path.join(repoRoot, 'specs');
const versions = ['3.1.0', '3.1.1', '3.1.2', '3.2.0'];

function fixtureName(fileName) {
  return fileName.replace(/\.ya?ml$/, '');
}

fs.rmSync(specsDir, { recursive: true, force: true });
fs.mkdirSync(specsDir, { recursive: true });

const fixtures = fs
  .readdirSync(fixturesDir)
  .filter((fileName) => fileName.endsWith('.yaml') || fileName.endsWith('.yml'))
  .sort();

for (const fileName of fixtures) {
  const sourcePath = path.join(fixturesDir, fileName);
  const scenario = fixtureName(fileName);
  const fixture = yaml.load(fs.readFileSync(sourcePath, 'utf8'));
  const scenarioDir = path.join(specsDir, scenario);

  fs.mkdirSync(scenarioDir, { recursive: true });

  for (const version of versions) {
    const spec = { ...fixture, openapi: version };
    const outputPath = path.join(scenarioDir, `oas-${version}.json`);
    fs.writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`);
  }
}

console.log(`Generated ${fixtures.length * versions.length} specs in ${path.relative(repoRoot, specsDir)}/`);
