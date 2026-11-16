import 'dotenv/config';
import { defineConfig } from 'vitest/config';

// E2E-тести працюють з окремою базою cinema_test того ж сервера MongoDB,
// щоб не чіпати дані розробки. Після тестів база видаляється
const uri = new URL(process.env.MONGODB_URI ?? '');
uri.pathname = `/${process.env.TEST_MONGODB_DB ?? 'cinema_test'}`;
process.env.MONGODB_URI = uri.toString();
process.env.NODE_ENV = 'test';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
});
