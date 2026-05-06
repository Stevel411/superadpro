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
            if (id.includes('tone')) return 'vendor-tone';
            if (id.includes('plotly')) return 'vendor-plotly';
            if (id.includes('mathjs')) return 'vendor-mathjs';
            if (id.includes('papaparse') || id.includes('xlsx') || id.includes('mammoth')) return 'vendor-data';
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap';
            if (id.includes('lodash')) return 'vendor-lodash';
            if (id.includes('framer-motion')) return 'vendor-framer';
            // Match ONLY the standalone qrcode package (used by LinkTools,
            // QRCodeGenerator, QRCodeGen). Avoid matching Reown/WalletConnect
            // qrcode helpers (e.g. @walletconnect/qrcode-modal) — those need
            // to land in vendor-walletconnect alongside the rest of Reown
            // or we get a circular dependency that throws "Cannot access
            // 'ft' before initialization" at runtime. Bug history: 6 May 2026.
            if (id.includes('node_modules/qrcode/')) return 'vendor-qrcode';
            // WalletConnect / Reown / wagmi / viem stack — only loaded
            // on checkout pages via lazy import. Keeping it in its own
            // chunk means the rest of the app doesn't pay the ~260KB
            // gzipped cost on every visit.
            //
            // Includes transitive crypto deps shared with Reown:
            //   @noble/* and @scure/* (curves + hashing)
            //   abitype, isows, ox (viem internals)
            //   valtio, zustand (state management used by AppKit/wagmi)
            //   events (node polyfill)
            if (id.includes('@reown') || id.includes('wagmi') ||
                id.includes('viem') || id.includes('@tanstack/react-query') ||
                id.includes('@walletconnect') || id.includes('@coinbase/wallet-sdk') ||
                id.includes('@base-org') || id.includes('@noble') ||
                id.includes('@scure') || id.includes('abitype') ||
                id.includes('isows') || id.includes('/ox/') ||
                id.includes('valtio') || id.includes('zustand') ||
                id.includes('node_modules/events/')) return 'vendor-walletconnect';
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
