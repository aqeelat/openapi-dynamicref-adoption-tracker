const scenarios = [
  'baseline-duplicated-pagination',
  'generic-schema-binding',
  'paginated-response',
  'recursive-category-tree',
  'nested-workspace-resources',
];

const versions = ['3.1.0', '3.1.1', '3.1.2', '3.2.0'];

export default Object.fromEntries(
  scenarios.flatMap((scenario) =>
    versions.map((version) => [
      `${scenario.replaceAll('-', '_')}_${version.replaceAll('.', '_')}`,
      {
        input: `./specs/${scenario}/oas-${version}.json`,
        output: {
          mode: 'single',
          target: `./generated/orval/${scenario}/${version}/sample.ts`,
          client: 'fetch',
          schemas: `./generated/orval/${scenario}/${version}/model`,
        },
      },
    ]),
  ),
);
