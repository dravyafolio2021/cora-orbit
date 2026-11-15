import { defineConfig } from 'vite';
import { rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The development clip in /public/dev is only for local work. Once a Mux
// playback ID is set in src/config.js, it is left out of the production build.
const hasMux = /MUX_PLAYBACK_ID\s*=\s*'[^']+'/.test(readFileSync('src/config.js', 'utf8'));

export default defineConfig({
  build: { target: 'es2022', sourcemap: false },
  plugins: [
    {
      name: 'orbit-strip-dev-media',
      apply: 'build',
      closeBundle() {
        if (hasMux) rmSync(resolve('dist/dev'), { recursive: true, force: true });
      },
    },
  ],
});
