import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/static/app/',
  build: {
    outDir: '../static/app',
    emptyOutDir: true,
    sourcemap: false,
    // Bundle splitting strategy:
    //
    // Goal: shrink the main bundle so first-page-load is fast. Without this,
    // every visitor downloads ~1.9 MB gzipped before the app renders.
    //
    // Strategy:
    //   - Heavy charting/3D libs go into their own chunks. Loaded only when
    //     a page that uses them is visited. Cached separately so users don't
    //     re-download them on every app update.
    //   - React and react-router stay together (always needed, small enough).
    //   - Lucide icons are sprinkled across many pages — keeping in main is
    //     fine since they're small per-icon.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // node_modules — split heavy libs into named chunks
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('chart.js')) return 'vendor-chartjs';
            // 'tone' chunk rule REMOVED 6 May 2026: the tone package isn't
            // actually installed, but the loose `id.includes('tone')` was
            // matching viem/chains/definitions/redstone.ts → pulling viem
            // chain code into vendor-tone → circular dep with
            // vendor-walletconnect → "Cannot access 'a' before
            // initialization" → blank page. Same root cause as the
            // qrcode bug fixed in bbed263c.
            if (id.includes('plotly')) return 'vendor-plotly';
            if (id.includes('mathjs')) return 'vendor-mathjs';
            if (id.includes('papaparse') || id.includes('xlsx') || id.includes('mammoth')) return 'vendor-data';
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap';
            if (id.includes('lodash')) return 'vendor-lodash';
            if (id.includes('framer-motion')) return 'vendor-framer';
            // qrcode chunk REMOVED 6 May 2026: even when scoped to
            // node_modules/qrcode/ only, it still ended up in a
            // circular dep with the main vendor chunk because both
            // Reown's wallet pairing modal and the LinkTools/QRGen
            // pages reference the same internal qrcode helpers.
            // Letting Vite bundle qrcode into the appropriate chunk
            // naturally avoids the TDZ trap. Cost: ~30KB extra in
            // vendor for non-qrcode users. Acceptable.
            // NO manualChunks rule for WalletConnect / Reown / wagmi / viem.
            // Tried this 6 May 2026 — every variant produced circular
            // dependency errors with vendor and other chunks ("Cannot
            // access 'X' before initialization" → blank page). The deps
            // are so cross-tangled that any forced split creates a TDZ
            // hazard at module init.
            //
            // Solution: trust Vite's natural code-splitting via React.lazy.
            // WalletConnectButton is lazy-imported in 3 pages; Vite/Rollup
            // creates a chunk for it that pulls in only the wagmi/Reown/
            // viem code those pages need. Non-checkout pages don't load
            // any of it. Bundle is bigger than ideal but it's CORRECT.
            // React + react-dom + react-router stay in default vendor chunk
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 800, // raise from default 500kB now that we're splitting
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/linkhub': 'http://localhost:8080',
      '/l': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    }
  }
})
