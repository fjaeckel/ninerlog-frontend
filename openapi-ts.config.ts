// @ts-check
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../ninerlog-project/api-spec/openapi.yaml',
  output: './src/api',
  client: 'axios',
  plugins: [
    '@hey-api/types',
    '@hey-api/client-axios',
    {
      name: '@hey-api/schemas',
      type: 'json',
    },
  ],
});
