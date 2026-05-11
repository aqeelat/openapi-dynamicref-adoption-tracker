export default {
  oas310: {
    input: './specs/sample-schema-oas-3.1.0.yaml',
    output: {
      mode: 'single',
      target: './generated/orval/3.1.0/sample.ts',
      client: 'fetch',
      schemas: './generated/orval/3.1.0/model'
    }
  },
  oas311: {
    input: './specs/sample-schema-oas-3.1.1.yaml',
    output: {
      mode: 'single',
      target: './generated/orval/3.1.1/sample.ts',
      client: 'fetch',
      schemas: './generated/orval/3.1.1/model'
    }
  },
  oas312: {
    input: './specs/sample-schema-oas-3.1.2.yaml',
    output: {
      mode: 'single',
      target: './generated/orval/3.1.2/sample.ts',
      client: 'fetch',
      schemas: './generated/orval/3.1.2/model'
    }
  },
  oas320: {
    input: './specs/sample-schema-oas-3.2.0.yaml',
    output: {
      mode: 'single',
      target: './generated/orval/3.2.0/sample.ts',
      client: 'fetch',
      schemas: './generated/orval/3.2.0/model'
    }
  }
};
