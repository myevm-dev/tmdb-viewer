import { existsSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Serves the Vercel Functions in /api during `npm run dev`, so the indexer
 * works locally (e.g. DATABASE_URL=pglite:./.data) without the Vercel CLI.
 */
function vercelApiDev(): Plugin {
  return {
    name: 'fancast-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const match = /^\/api\/([a-z-]+)(?:\?|$)/.exec(req.url ?? '');
        if (!match) return next();
        if (!existsSync(`${server.config.root}/api/${match[1]}.ts`)) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'not_found' }));
        }
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`);
          const handler = mod[req.method ?? 'GET'] ?? mod.default?.fetch;
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const url = `http://${req.headers.host}${req.url}`;
          const response: Response = await handler(
            new Request(url, {
              method: req.method,
              headers: req.headers as HeadersInit,
            }),
          );
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.config.logger.error(String((e as Error)?.stack ?? e));
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose server-only variables (DATABASE_URL, RPC_URL, …) to the dev API.
  Object.assign(process.env, {
    ...loadEnv(mode, process.cwd(), ''),
    ...process.env,
  });

  return {
    plugins: [react(), vercelApiDev()],
    build: {
      outDir: 'build',
      chunkSizeWarningLimit: 1500,
    },
    server: {
      port: 3000,
      proxy: {
        // Clanker's public API doesn't send CORS headers, so we proxy it in dev
        // (and via vercel.json rewrites in production).
        // Deezer's catalog API has no CORS either.
        '/deezer-api': {
          target: 'https://api.deezer.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/deezer-api/, ''),
        },
        '/clanker-api': {
          target: 'https://www.clanker.world',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/clanker-api/, '/api'),
        },
      },
    },
  };
});
