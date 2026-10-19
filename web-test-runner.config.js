/* eslint-disable no-undef */
import os from 'os';
import { playwrightLauncher } from '@web/test-runner-playwright';

import base from '@omicronenergy/oscd-tooling/configs/web-test-runner.config.js';

const groupIndex = process.argv.indexOf('--group');
const isVisualRun =
  process.argv.includes('--update-visual-baseline') ||
  (groupIndex !== -1 && process.argv[groupIndex + 1] === 'visual');

export default {
  ...base,
  browsers: ['chromium', 'firefox', 'webkit'].map(product =>
    playwrightLauncher({ product }),
  ),
  coverageConfig: {
    ...base.coverageConfig,
    include: ['dist/**/*.js'],
    exclude: [
      ...base.coverageConfig.exclude,
      '**/*.spec.js',
      '**/*.test.js',
      '**/testing/**',
    ],
    threshold: isVisualRun
      ? undefined
      : { statements: 95, branches: 90, functions: 95, lines: 95 },
  },
  // Test files run in parallel pages. The shared config runs them one at a time.
  concurrency: Math.min(6, Math.max(1, os.cpus().length - 1)),
  testFramework: { config: { timeout: 10000 } },
  testsFinishTimeout: 30 * 60 * 1000,
  groups: base.groups.map(group =>
    process.env.SPEC ? { ...group, files: process.env.SPEC } : group,
  ),
};
