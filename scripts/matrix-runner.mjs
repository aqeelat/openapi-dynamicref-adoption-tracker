#!/usr/bin/env node

import { exec, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, basename, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const CONCURRENCY = parseInt(process.env.MATRIX_CONCURRENCY || '8', 10);
const TIMEOUT_MS = 120_000;

const SCENARIOS = [
  'baseline-duplicated-pagination',
  'generic-schema-binding',
  'paginated-response',
  'recursive-category-tree',
  'nested-workspace-resources',
];

const VERSIONS = ['3.1.0', '3.1.1', '3.1.2', '3.2.0'];

const CONCRETE_TYPES = [
  'User', 'Group', 'LocalizedCategory', 'BaseCategory',
  'BaseFolder', 'WorkspaceFolder', 'Document', 'WorkspaceResource',
  'BaseResource', 'PaginatedTemplate',
];

const QUALITY_SIGNALS = {
  'baseline-duplicated-pagination': { keyProps: ['items'], expectedTypes: ['User', 'Group'] },
  'generic-schema-binding': { keyProps: ['items'], expectedTypes: ['User', 'Group'] },
  'paginated-response': { keyProps: ['items'], expectedTypes: ['User', 'Group'] },
  'recursive-category-tree': { keyProps: ['children'], expectedTypes: ['LocalizedCategory', 'BaseCategory'] },
  'nested-workspace-resources': { keyProps: ['children', 'shortcuts'], expectedTypes: ['WorkspaceFolder', 'Document', 'WorkspaceResource'] },
};

const TOOLS = [
  {
    id: 'orval',
    label: 'Orval',
    type: 'npx',
    generate: ({ spec, outputDir, scenario, version }) => {
      const project = `${scenario.replace(/-/g, '_')}_${version.replace(/\./g, '_')}`;
      return `npx --yes orval --config "${REPO_ROOT}/orval.config.ts" --project ${project}`;
    },
    outputDir: (base, scenario, version) => `${base}/orval/${scenario}/${version}`,
  },
  {
    id: 'openapi-generator',
    label: 'OpenAPI Generator',
    type: 'npx',
    npxPackage: '@openapitools/openapi-generator-cli',
    generate: ({ spec, outputDir }) =>
      `npx --yes @openapitools/openapi-generator-cli generate -i "${spec}" -g typescript-fetch -o "${outputDir}"`,
    outputDir: (base, scenario, version) => `${base}/openapi-generator/${scenario}/${version}`,
  },
  {
    id: 'swagger-codegen',
    label: 'Swagger Codegen v3',
    type: 'docker',
    dockerImage: 'swaggerapi/swagger-codegen-cli-v3',
    generate: ({ spec, outputDir }) =>
      `docker run --rm -v "${spec}":/spec.json -v "${outputDir}":/out swaggerapi/swagger-codegen-cli-v3 generate -i /spec.json -l typescript-fetch -o /out`,
    outputDir: (base, scenario, version) => `${base}/swagger-codegen/${scenario}/${version}`,
  },
  {
    id: 'openapi-typescript',
    label: 'openapi-typescript',
    type: 'npx',
    generate: ({ spec, outputDir }) =>
      `npx --yes openapi-typescript "${spec}" -o "${outputDir}/types.d.ts"`,
    outputDir: (base, scenario, version) => `${base}/openapi-typescript/${scenario}/${version}`,
    declOnly: true,
  },
  {
    id: 'hey-api',
    label: '@hey-api/openapi-ts',
    type: 'npx',
    npxPackage: '@hey-api/openapi-ts',
    generate: ({ spec, outputDir }) =>
      `npx --yes @hey-api/openapi-ts -i "${spec}" -o "${outputDir}" -c @hey-api/client-fetch`,
    outputDir: (base, scenario, version) => `${base}/hey-api/${scenario}/${version}`,
  },
  {
    id: 'openapi-typescript-codegen',
    label: 'openapi-typescript-codegen',
    type: 'npx',
    npxPackage: 'openapi-typescript-codegen',
    generate: ({ spec, outputDir }) =>
      `npx --yes openapi-typescript-codegen -i "${spec}" -o "${outputDir}"`,
    outputDir: (base, scenario, version) => `${base}/openapi-typescript-codegen/${scenario}/${version}`,
  },
  {
    id: 'oazapfts',
    label: 'oazapfts',
    type: 'npx',
    generate: ({ spec, outputDir }) =>
      `npx --yes oazapfts "${spec}" "${outputDir}/api.ts"`,
    outputDir: (base, scenario, version) => `${base}/oazapfts/${scenario}/${version}`,
  },
  {
    id: 'kiota',
    label: 'Kiota (Microsoft)',
    type: 'binary',
    binaryName: 'kiota',
    generate: ({ spec, outputDir }) =>
      `kiota generate -d "${spec}" -l typescript -o "${outputDir}" --clean-output --namespace-name test`,
    outputDir: (base, scenario, version) => `${base}/kiota/${scenario}/${version}`,
    installHint: 'Install: curl -L https://aka.ms/kiota/install | bash  OR  dotnet tool install -g Microsoft.OpenApi.Kiota',
  },
  {
    id: 'nswag',
    label: 'NSwag',
    type: 'binary',
    binaryName: 'nswag',
    generate: ({ spec, outputDir }) =>
      `nswag swagger2tsclient /input:"${spec}" /output:"${outputDir}/client.ts" /Template:Fetch /GenerateClientClasses:true`,
    outputDir: (base, scenario, version) => `${base}/nswag/${scenario}/${version}`,
    installHint: 'Install: dotnet tool install -g NSwag.GlobalTool',
  },
];

function parseArgs(argv) {
  const args = { tools: null, scenarios: null, versions: null, concurrency: null, skipTypecheck: false, skipAnalysis: false, skipGenerate: false, dryRun: false };
  const positional = [];

  for (const arg of argv.slice(2)) {
    if (arg === '--no-typecheck') args.skipTypecheck = true;
    else if (arg === '--no-analysis') args.skipAnalysis = true;
    else if (arg === '--no-generate') args.skipGenerate = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--tools=')) args.tools = arg.split('=')[1].split(',');
    else if (arg.startsWith('--scenarios=')) args.scenarios = arg.split('=')[1].split(',');
    else if (arg.startsWith('--versions=')) args.versions = arg.split('=')[1].split(',');
    else if (arg.startsWith('--concurrency=')) args.concurrency = parseInt(arg.split('=')[1], 10);
    else positional.push(arg);
  }

  return args;
}

function findTsFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];

  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts')) results.push(full);
    }
  }

  walk(dir);
  return results;
}

function readFileContent(files) {
  return files.map(f => ({ path: f, content: readFileSync(f, 'utf8') }));
}

function analyzeQuality(outputDir, scenario) {
  const tsFiles = findTsFiles(outputDir);
  if (tsFiles.length === 0) return { fidelity: 'empty', tsFileCount: 0, unknownCount: 0, anyCount: 0, concreteTypes: [] };

  const allContent = tsFiles.map(f => readFileSync(f, 'utf8')).join('\n');
  const lines = allContent.split('\n');
  const signals = QUALITY_SIGNALS[scenario];

  const keyPropUnknowns = signals
    ? signals.keyProps.reduce((count, prop) => {
        const re = new RegExp(`\\b${prop}\\s*[:?]\\s*.*\\bunknown\\b`);
        return count + lines.filter(l => re.test(l)).length;
      }, 0)
    : 0;
  const keyPropAnys = signals
    ? signals.keyProps.reduce((count, prop) => {
        const re = new RegExp(`\\b${prop}\\s*[:?]\\s*.*\\bany\\b`);
        return count + lines.filter(l => re.test(l)).length;
      }, 0)
    : 0;
  const keyPropConcrete = signals
    ? signals.expectedTypes.filter(t =>
        signals.keyProps.some(prop => {
          const re = new RegExp(`\\b${prop}\\s*[:?]\\s*.*\\b${t}\\b`);
          return lines.some(l => re.test(l));
        })
      )
    : [];
  const concrete = CONCRETE_TYPES.filter(t => allContent.includes(t));
  const expectedPresent = signals ? signals.expectedTypes.filter(t => concrete.includes(t)) : [];

  let fidelity;
  if (expectedPresent.length > 0 && keyPropUnknowns === 0 && keyPropAnys === 0 && keyPropConcrete.length > 0) {
    fidelity = 'preserved';
  } else if (keyPropConcrete.length > 0 && (keyPropUnknowns > 0 || keyPropAnys > 0)) {
    fidelity = 'partial';
  } else if (keyPropUnknowns > 0) {
    fidelity = 'degraded';
  } else if (keyPropAnys > 0) {
    fidelity = 'lost';
  } else if (keyPropConcrete.length > 0) {
    fidelity = 'preserved';
  } else {
    fidelity = 'empty';
  }

  return {
    fidelity,
    tsFileCount: tsFiles.length,
    unknownCount: keyPropUnknowns,
    anyCount: keyPropAnys,
    concreteTypes: concrete,
  };
}

async function checkAvailability(tools) {
  const results = new Map();

  async function check(tool) {
    try {
      if (tool.type === 'npx') return true;
      if (tool.type === 'docker') {
        await execAsync(`docker image inspect ${tool.dockerImage}`, { timeout: 10_000 });
        return true;
      }
      if (tool.type === 'binary') {
        await execAsync(`which ${tool.binaryName} 2>/dev/null || command -v ${tool.binaryName}`, { timeout: 5_000 });
        return true;
      }
    } catch {
      if (tool.type === 'docker') {
        try {
          console.log(`  Pulling ${tool.dockerImage}...`);
          await execAsync(`docker pull ${tool.dockerImage}`, { timeout: 120_000 });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
    return false;
  }

  const checks = await Promise.all(tools.map(async tool => ({ tool, available: await check(tool) })));
  for (const { tool, available } of checks) results.set(tool.id, available);

  return results;
}

async function runParallel(tasks, concurrency, onProgress) {
  const results = new Array(tasks.length);
  let nextIndex = 0;
  let completed = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    async () => {
      while (nextIndex < tasks.length) {
        const i = nextIndex++;
        try {
          results[i] = await tasks[i]();
        } catch (err) {
          results[i] = { error: err.message, status: 'error' };
        }
        completed++;
        if (onProgress) onProgress(completed, tasks.length, i, results[i]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function generateOne(tool, scenario, version) {
  const specDir = `${REPO_ROOT}/specs/${scenario}`;
  const spec = `${specDir}/oas-${version}.json`;
  const outputBase = `${REPO_ROOT}/generated`;
  const outputDir = tool.outputDir(outputBase, scenario, version);
  const logDir = `${REPO_ROOT}/logs`;
  const logFile = `${logDir}/${tool.id}-${scenario}-${version}.log`;

  if (!existsSync(spec)) return { status: 'skip', reason: 'spec not found' };

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });

  const cmd = tool.generate({ spec, outputDir, scenario, version, repoRoot: REPO_ROOT });
  const start = Date.now();

  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    writeFileSync(logFile, `COMMAND: ${cmd}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
    return { status: 'ok', duration: parseFloat(duration), logFile };
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    const logContent = `COMMAND: ${cmd}\n\nEXIT CODE: ${err.code}\n\nSTDOUT:\n${err.stdout || ''}\n\nSTDERR:\n${err.stderr || ''}\n\nERROR:\n${err.message}`;
    writeFileSync(logFile, logContent);
    return { status: 'fail', duration: parseFloat(duration), logFile, error: err.stderr || err.message };
  }
}

async function typecheckOne(tool, scenario, version) {
  const outputBase = `${REPO_ROOT}/generated`;
  const outputDir = tool.outputDir(outputBase, scenario, version);
  const logDir = `${REPO_ROOT}/logs`;
  const logFile = `${logDir}/typecheck-${tool.id}-${scenario}-${version}.log`;

  if (!existsSync(outputDir)) return { status: 'skip' };

  const tsFiles = findTsFiles(outputDir).filter(f => !f.endsWith('.spec.ts') && !f.endsWith('.test.ts'));
  if (tsFiles.length === 0) return { status: 'skip', reason: 'no .ts files' };

  if (tool.declOnly) {
    const hasValidDecls = tsFiles.some(f => {
      const content = readFileSync(f, 'utf8');
      return content.includes('export ') || content.includes('declare ');
    });
    return hasValidDecls ? { status: 'pass' } : { status: 'fail', reason: 'no valid declarations' };
  }

  const fileList = tsFiles.map(f => `"${f}"`).join(' ');
  const cmd = `npx tsc --noEmit --strict --esModuleInterop --moduleResolution node --target ES2020 --module commonjs --skipLibCheck ${fileList}`;

  try {
    await execAsync(cmd, { timeout: 60_000, maxBuffer: 5 * 1024 * 1024 });
    return { status: 'pass' };
  } catch (err) {
    writeFileSync(logFile, `COMMAND: ${cmd}\n\nSTDERR:\n${err.stderr || ''}\n\nSTDOUT:\n${err.stdout || ''}`);
    return { status: 'fail', logFile, error: err.stderr || err.message };
  }
}

function formatCell(status) {
  switch (status) {
    case 'ok': return '  OK  ';
    case 'pass': return ' PASS ';
    case 'fail': return ' FAIL ';
    case 'skip': return ' SKIP ';
    case 'error': return ' ERR  ';
    default: return '  ??  ';
  }
}

function fidelityLabel(fidelity) {
  switch (fidelity) {
    case 'preserved': return 'PRESERVED';
    case 'partial': return 'PARTIAL  ';
    case 'degraded': return 'DEGRADED ';
    case 'lost': return 'LOST     ';
    case 'empty': return 'EMPTY    ';
    default: return '???      ';
  }
}

function printTable(title, headers, rows) {
  const colWidths = headers.map((h, i) => {
    const maxDataWidth = rows.reduce((max, row) => Math.max(max, String(row[i]).length), 0);
    return Math.max(h.length, maxDataWidth);
  });

  const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const headerLine = '|' + headers.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join('|') + '|';

  console.log(`\n=== ${title} ===\n`);
  console.log(separator);
  console.log(headerLine);
  console.log(separator);
  for (const row of rows) {
    console.log('|' + row.map((cell, i) => ` ${String(cell).padEnd(colWidths[i])} `).join('|') + '|');
  }
  console.log(separator);
}

async function main() {
  const args = parseArgs(process.argv);

  const concurrency = args.concurrency || CONCURRENCY;
  const tools = TOOLS.filter(t => !args.tools || args.tools.includes(t.id));
  const scenarios = SCENARIOS.filter(s => !args.scenarios || args.scenarios.includes(s));
  const versions = VERSIONS.filter(v => !args.versions || args.versions.includes(v));

  const totalJobs = tools.length * scenarios.length * versions.length;
  const line2 = `Tools: ${tools.length}  Scenarios: ${scenarios.length}  Versions: ${versions.length}  Jobs: ${totalJobs}  Workers: ${concurrency}`;
  const width = Math.max(65, line2.length + 4);
  const title = 'OpenAPI DynamicRef SDK Generator Matrix Runner';
  const padLeft = Math.floor((width - 2 - title.length) / 2);

  console.log('╔' + '═'.repeat(width - 2) + '╗');
  console.log('║' + ' '.repeat(padLeft) + title + ' '.repeat(width - 2 - padLeft - title.length) + '║');
  console.log('╠' + '═'.repeat(width - 2) + '╣');
  console.log('║ ' + line2 + ' '.repeat(width - 3 - line2.length) + '║');
  console.log('╚' + '═'.repeat(width - 2) + '╝');

  console.log('\nChecking tool availability...');
  const availability = await checkAvailability(tools);
  for (const tool of tools) {
    const avail = availability.get(tool.id);
    const mark = avail ? '✓' : '✗';
    const hint = (!avail && tool.installHint) ? ` (${tool.installHint})` : '';
    console.log(`  ${mark} ${tool.label.padEnd(30)} [${tool.type}]${hint}`);
  }

  const activeTools = tools.filter(t => availability.get(t.id));
  const skippedTools = tools.filter(t => !availability.get(t.id));
  if (skippedTools.length > 0) {
    console.log(`\n  Skipping ${skippedTools.length} unavailable tools: ${skippedTools.map(t => t.label).join(', ')}`);
  }

  const npmTools = activeTools.filter(t => t.type === 'npx');
  if (npmTools.length > 0) {
    console.log('\nSeeding npx cache (avoids parallel install races)...');
    const packages = [...new Set(npmTools.map(t => t.npxPackage || t.id))];
    for (const pkg of packages) {
      process.stdout.write(`  ${pkg}...`);
      try {
        const cmd = pkg === 'orval'
          ? `npx --yes ${pkg} --version`
          : pkg === '@openapitools/openapi-generator-cli'
            ? `npx --yes ${pkg} version`
            : `npx --yes ${pkg} --help`;
        execSync(cmd, { timeout: 120_000, stdio: 'pipe' });
        console.log(' OK');
      } catch (e) {
        if (e.status !== 1) {
          console.log(' FAILED');
        } else {
          console.log(' OK (exited 1, cache seeded)');
        }
      }
    }
  }

  const jobs = [];
  for (const tool of activeTools) {
    for (const scenario of scenarios) {
      for (const version of versions) {
        jobs.push({ tool, scenario, version });
      }
    }
  }

  if (jobs.length === 0) {
    console.log('\nNo jobs to run. Check tool availability.');
    process.exit(1);
  }

  if (args.dryRun) {
    console.log(`\nDry run: ${jobs.length} jobs would execute:`);
    for (const job of jobs) {
      console.log(`  ${job.tool.label} / ${job.scenario} / ${job.version}`);
    }
    return;
  }

  console.log(`\nRunning ${jobs.length} generation jobs...`);
  const genResults = new Array(jobs.length);

  if (args.skipGenerate) {
    console.log('  Skipping generation (--no-generate), analyzing existing output...');
    for (let i = 0; i < jobs.length; i++) {
      const outputDir = jobs[i].tool.outputDir(`${REPO_ROOT}/generated`, jobs[i].scenario, jobs[i].version);
      const tsFiles = findTsFiles(outputDir);
      genResults[i] = {
        toolId: jobs[i].tool.id,
        scenario: jobs[i].scenario,
        version: jobs[i].version,
        status: tsFiles.length > 0 ? 'ok' : 'skip',
        duration: 0,
        quality: null,
        typecheck: null,
      };
    }
  } else {
    const genTasks = jobs.map((job, i) => async () => {
      const result = await generateOne(job.tool, job.scenario, job.version);
      genResults[i] = { ...result, toolId: job.tool.id, scenario: job.scenario, version: job.version };
      return genResults[i];
    });

    let genCompleted = 0;
    await runParallel(genTasks, concurrency, (completed, total) => {
      genCompleted = completed;
      const pct = Math.floor((completed / total) * 100);
      const bar = '█'.repeat(Math.floor(pct / 2.5)) + '░'.repeat(40 - Math.floor(pct / 2.5));
      process.stdout.write(`\r  [${bar}] ${completed}/${total} (${pct}%)`);
    });
    console.log('');
  }

  let genOk = 0, genFail = 0, genSkip = 0;
  for (const r of genResults) {
    if (!r) continue;
    if (r.status === 'ok') genOk++;
    else if (r.status === 'fail') genFail++;
    else if (r.status === 'skip') genSkip++;
  }
  console.log(`  Generated: ${genOk} OK, ${genFail} FAIL, ${genSkip} SKIP`);

  if (!args.skipTypecheck) {
    console.log('\nRunning typecheck...');
    const tcTasks = jobs.map((job, i) => async () => {
      if (!genResults[i] || genResults[i].status !== 'ok') return null;
      const result = await typecheckOne(job.tool, job.scenario, job.version);
      return result;
    });

    const tcResults = await runParallel(tcTasks, concurrency);

    for (let i = 0; i < jobs.length; i++) {
      if (genResults[i]) genResults[i].typecheck = tcResults[i];
    }
  }

  if (!args.skipAnalysis) {
    console.log('Analyzing type quality...');
    for (let i = 0; i < jobs.length; i++) {
      if (!genResults[i] || genResults[i].status !== 'ok') {
        if (genResults[i]) genResults[i].quality = { fidelity: 'fail', tsFileCount: 0, unknownCount: 0, anyCount: 0, concreteTypes: [] };
        continue;
      }
      const outputDir = jobs[i].tool.outputDir(`${REPO_ROOT}/generated`, jobs[i].scenario, jobs[i].version);
      genResults[i].quality = analyzeQuality(outputDir, jobs[i].scenario);
    }
  }

  console.log('\n');

  const genHeaders = ['Tool', 'Scenario', ...versions.map(v => `OAS ${v}`)];
  const genRows = [];

  for (const tool of activeTools) {
    for (const scenario of scenarios) {
      const row = [tool.label, scenario.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())];
      for (const version of versions) {
        const match = genResults.find(r => r && r.toolId === tool.id && r.scenario === scenario && r.version === version);
        row.push(match ? formatCell(match.status) : ' SKIP ');
      }
      genRows.push(row);
    }
  }
  printTable('Generation Results', genHeaders, genRows);

  if (!args.skipTypecheck) {
    const tcHeaders = ['Tool', 'Scenario', ...versions.map(v => `OAS ${v}`)];
    const tcRows = [];
    for (const tool of activeTools) {
      for (const scenario of scenarios) {
        const row = [tool.label, scenario.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())];
        for (const version of versions) {
          const match = genResults.find(r => r && r.toolId === tool.id && r.scenario === scenario && r.version === version);
          if (match && match.typecheck) {
            row.push(formatCell(match.typecheck.status));
          } else {
            row.push(' N/A  ');
          }
        }
        tcRows.push(row);
      }
    }
    printTable('Typecheck Results', tcHeaders, tcRows);
  }

  if (!args.skipAnalysis) {
    const qHeaders = ['Tool', 'Scenario', 'Version', 'Fidelity', 'Files', 'unknown', 'any', 'Concrete Types'];
    const qRows = [];
    for (const tool of activeTools) {
      for (const scenario of scenarios) {
        for (const version of versions) {
          const match = genResults.find(r => r && r.toolId === tool.id && r.scenario === scenario && r.version === version);
          if (match && match.quality) {
            const q = match.quality;
            qRows.push([
              tool.label,
              scenario.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              version,
              fidelityLabel(q.fidelity),
              String(q.tsFileCount),
              String(q.unknownCount),
              String(q.anyCount),
              q.concreteTypes.length > 0 ? q.concreteTypes.join(', ') : '(none)',
            ]);
          }
        }
      }
    }
    printTable('Type Quality (DynamicRef Fidelity)', qHeaders, qRows);
  }

  const summaryFile = `${REPO_ROOT}/logs/matrix-results.json`;
  const summary = {
    timestamp: new Date().toISOString(),
    tools: activeTools.map(t => t.id),
    skippedTools: skippedTools.map(t => ({ id: t.id, label: t.label, installHint: t.installHint })),
    scenarios,
    versions,
    results: genResults.filter(Boolean).map(r => ({
      tool: r.toolId,
      scenario: r.scenario,
      version: r.version,
      generate: r.status,
      generateDuration: r.duration,
      typecheck: r.typecheck?.status || null,
      quality: r.quality || null,
    })),
  };

  mkdirSync(dirname(summaryFile), { recursive: true });
  writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\nResults written to ${relative(REPO_ROOT, summaryFile)}`);

  if (skippedTools.length > 0) {
    console.log('\nSkipped tools (install to include in future runs):');
    for (const t of skippedTools) {
      console.log(`  ${t.label}: ${t.installHint || 'not available'}`);
    }
  }

  const hasFailures = genResults.some(r => r && r.status === 'fail');
  if (hasFailures) {
    console.log('\nFailed generations (check logs/ for details):');
    for (const r of genResults.filter(r => r && r.status === 'fail')) {
      console.log(`  ${r.toolId}/${r.scenario}/${r.version}: ${r.error?.split('\n')[0]?.substring(0, 120)}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
