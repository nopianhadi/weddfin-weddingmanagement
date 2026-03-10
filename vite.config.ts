import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom',
        include: ['**/*.{test,spec}.{ts,tsx}'],
        exclude: ['node_modules', 'dist'],
      },
      // Enable compression
      server: {
        hmr: {
          overlay: false // Disable error overlay for better performance
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1200,
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log in production
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug']
          }
        },
        rollupOptions: {
          output: {
            manualChunks(id) {
              // Vendor core - split by package for better caching
              if (id.includes('node_modules')) {
                if (id.includes('@supabase')) return 'vendor-supabase';
                if (id.includes('react-dom')) return 'vendor-react-dom';
                if (id.includes('react')) return 'vendor-react';
                return 'vendor';
              }
              // Don't split types.ts or constants.tsx - keep them in main bundle to avoid circular deps
              if (id.includes('/types.ts') || id.includes('/constants.tsx')) {
                return undefined; // Keep in main bundle
              }
              // Large feature chunks by directory keywords
              if (id.includes('/components/')) {
                if (id.includes('Finance')) return 'feature-finance';
                if (id.includes('Projects')) return 'feature-projects';
                if (id.includes('Clients')) return 'feature-clients';
                if (id.includes('Freelancers') || id.includes('Team')) return 'feature-team';
                if (id.includes('Marketing') || id.includes('SocialPlanner')) return 'feature-marketing';
                if (id.includes('Public')) return 'feature-public';
                if (id.includes('CalendarView')) return 'feature-calendar';
                if (id.includes('Booking') || id.includes('Leads')) return 'feature-leads';
                if (id.includes('Gallery')) return 'feature-gallery';
              }
              // Don't split services to avoid circular dependency with feature chunks
              // if (id.includes('/services/')) {
              //   return 'services';
              // }
            }
          }
        }
      }
    };
});
