import copy from 'rollup-plugin-copy';

import oscdRollupConfig from '@omicronenergy/oscd-tooling/configs/rollup.config.js';

// Extends the shared bundle config: the plugin entry point and the demo, plus
// the landing page which redirects to the bundled demo.
const [pluginBundle, demoBundle] = oscdRollupConfig;

export default [
  {
    ...pluginBundle,
    plugins: [
      ...pluginBundle.plugins,
      // GitHub Pages serves dist/ as the site root and needs index.html there.
      copy({
        targets: [
          { src: 'demo/index.deploy.html', dest: 'dist', rename: 'index.html' },
        ],
      }),
    ],
  },
  demoBundle,
];
