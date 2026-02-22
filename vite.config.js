/** @type {import('vite').UserConfig} */
export default {
  root: 'app',
  esbuild: {
    jsx: 'transform', // Classic React.createElement — avoids react/jsx-runtime import
  },
  plugins: [
    {
      name: 'cdn-imports',
      enforce: 'pre',
      resolveId(source) {
        const cdnMap = {
          'react': 'https://esm.sh/react@18.2.0',
          'react-dom/client': 'https://esm.sh/react-dom@18.2.0/client',
          'lucide-react': 'https://esm.sh/lucide-react@0.344.0',
        };
        if (cdnMap[source]) {
          return { id: cdnMap[source], external: true };
        }
        return null;
      },
    },
  ],
  optimizeDeps: {
    exclude: ['react', 'react-dom/client', 'lucide-react'],
  },
};
