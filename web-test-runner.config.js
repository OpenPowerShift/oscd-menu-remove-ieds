/* eslint-disable no-undef */
import os from 'os';
import path from 'path';

import { playwrightLauncher } from '@web/test-runner-playwright';
import { visualRegressionPlugin } from '@web/test-runner-visual-regression/plugin';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import base from '@omicronenergy/oscd-tooling/configs/web-test-runner.config.js';
import { visualRunnerHtml } from './test/support/visual-runner-html.js';

// A small tolerance absorbs sub-pixel text antialiasing and Material state
// layer differences between runs. A real layout change is much larger.
const visualThresholdPercentage = 0.5;

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

function getImageDiff({ baselineImage, image, options }) {
  let error = '';
  let basePng = PNG.sync.read(baselineImage);
  let png = PNG.sync.read(image);
  let { width, height } = png;

  if (basePng.width !== png.width || basePng.height !== png.height) {
    error =
      `Screenshot is not the same width and height as the baseline. ` +
      `Baseline: { width: ${basePng.width}, height: ${basePng.height} }` +
      `Screenshot: { width: ${png.width}, height: ${png.height} }`;
    width = Math.max(basePng.width, png.width);
    height = Math.max(basePng.height, png.height);
    let oldPng = basePng;
    basePng = new PNG({ width, height });
    oldPng.data.copy(basePng.data, 0, 0, oldPng.data.length);
    oldPng = png;
    png = new PNG({ width, height });
    oldPng.data.copy(png.data, 0, 0, oldPng.data.length);
  }

  const diff = new PNG({ width, height });
  const numDiffPixels = pixelmatch(
    basePng.data,
    png.data,
    diff.data,
    width,
    height,
    options,
  );
  const diffPercentage = (numDiffPixels / (width * height)) * 100;

  return {
    error,
    diffImage: PNG.sync.write(diff),
    diffPercentage,
  };
}

const visualRegression = visualRegressionPlugin({
  update: process.argv.includes('--update-visual-baseline'),
  baseDir: 'test/screenshots',
  diffOptions: { includeAA: true },
  getImageDiff: options => {
    const result = getImageDiff(options);
    if (result.diffPercentage < visualThresholdPercentage) {
      result.diffPercentage = 0;
    }
    return result;
  },
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
