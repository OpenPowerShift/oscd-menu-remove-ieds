import base from '@omicronenergy/oscd-tooling/configs/web-test-runner.config.js';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  ...base,
  browsers: ['chromium', 'firefox', 'webkit'].map(product =>
    playwrightLauncher({ product }),
  ),
};
