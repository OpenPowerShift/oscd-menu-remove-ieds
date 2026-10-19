/* eslint-disable no-undef */
import os from 'os';
import path from 'path';

import { playwrightLauncher } from '@web/test-runner-playwright';
import { visualRegressionPlugin } from '@web/test-runner-visual-regression/plugin';

import base from '@omicronenergy/oscd-tooling/configs/web-test-runner.config.js';
import { visualRunnerHtml } from './test/support/visual-runner-html.js';

const groupIndex = process.argv.indexOf('--group');
const isVisualRun =
  process.argv.includes('--update-visual-baseline') ||
  (groupIndex !== -1 && process.argv[groupIndex + 1] === 'visual');

// Chromium flags which reduce differences in text rendering.
const visualBrowsers = [
  playwrightLauncher({
    product: 'chromium',
    launchOptions: {
      args: [
        '--font-render-hinting=none',
        '--disable-skia-runtime-opts',
        '--disable-font-subpixel-positioning',
        '--disable-lcd-text',
        '--disable-gpu',
      ],
    },
  }),
];

const visualRegression = visualRegressionPlugin({
  update: process.argv.includes('--update-visual-baseline'),
  baseDir: 'test/screenshots',
  diffOptions: { includeAA: true },
  getBaselineName: ({ browser, name }) =>
    path.join('baseline', `${name}-${browser}`),
  getDiffName: ({ browser, name }) =>
    path.join('failed', `${name}-${browser}-diff`),
  getFailedName: ({ browser, name }) =>
    path.join('failed', `${name}-${browser}`),
});

export default {
  ...base,
  // CI installs Chromium only. Use BROWSERS=chromium,firefox,webkit locally
  // to check all three engines.
  browsers: (process.env.BROWSERS ?? 'chromium')
    .split(',')
    .map(product => playwrightLauncher({ product })),
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
  plugins: [
    ...base.plugins.filter(plugin => plugin.name !== 'visual-regression'),
    visualRegression,
  ],
  // Test files run in parallel pages. The shared config runs them one at a time.
  concurrency: Math.min(6, Math.max(1, os.cpus().length - 1)),
  testFramework: { config: { timeout: 10000 } },
  testsFinishTimeout: 30 * 60 * 1000,
  groups: base.groups.map(group => {
    const configured =
      group.name === 'visual'
        ? {
            ...group,
            browsers: visualBrowsers,
            testRunnerHtml: visualRunnerHtml,
          }
        : group;
    return process.env.SPEC
      ? { ...configured, files: process.env.SPEC }
      : configured;
  }),
};
