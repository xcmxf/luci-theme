/**
 * Copyright (C) 2025 eamonxg
 * Licensed under the Apache License, Version 2.0.
 */

import tailwindcss from "@tailwindcss/vite";
import { copyFile, mkdir, readdir, readFile, writeFile } from "fs/promises";
import { dirname, join, relative, resolve } from "path";
import { minify as terserMinify } from "terser";
import { defineConfig, loadEnv, Plugin, ResolvedConfig } from "vite";

const CURRENT_DIR = process.cwd();
const PROJECT_ROOT = resolve(CURRENT_DIR, "..");
const BUILD_OUTPUT = resolve(PROJECT_ROOT, "htdocs/luci-static");

async function scanFiles(
  dir: string,
  extensions: string[] = [],
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await scanFiles(fullPath, extensions)));
    } else if (
      entry.isFile() &&
      (!extensions.length || extensions.some((ext) => fullPath.endsWith(ext)))
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function createLuciJsCompressPlugin(): Plugin {
  let outDir: string;
  let jsFiles: string[] = [];

  return {
    name: "luci-js-compress",
    apply: "build",

    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
    },

    async buildStart() {
      const srcDir = resolve(CURRENT_DIR, "src/resource");
      jsFiles = (await scanFiles(srcDir, [".js"])).filter(
        (filePath) => dirname(filePath) === srcDir,
      );
    },

    async generateBundle() {
      for (const filePath of jsFiles) {
        const sourceCode = await readFile(filePath, "utf-8");
        const compressed = await terserMinify(sourceCode, {
          parse: { bare_returns: true },
          compress: false,
          mangle: false,
          format: { comments: false, beautify: false },
        });

        if (typeof compressed.code !== "string") {
          throw new Error(`JS compress produced no output: ${filePath}`);
        }

        const relativePath = relative(
          resolve(CURRENT_DIR, "src/resource"),
          filePath,
        ).replace(/\\/g, "/");
        const outputPath = join(outDir, "resources", relativePath);

        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, compressed.code, "utf-8");
      }
    },
  };
}

function createPublicAssetCopyPlugin(): Plugin {
  let outDir: string;

  return {
    name: "copy-md3e-public-assets",
    apply: "build",

    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
    },

    async closeBundle() {
      const publicDir = resolve(CURRENT_DIR, "public", "md3e");
      const files = await scanFiles(publicDir);

      for (const filePath of files) {
        const relativePath = relative(publicDir, filePath);
        const outputPath = join(outDir, "md3e", relativePath);
        await mkdir(dirname(outputPath), { recursive: true });
        await copyFile(filePath, outputPath);
      }
    },
  };
}

interface RouteConfig {
  routes: Record<string, string>;
  shouldRewrite: boolean;
  hmrMessage: string;
}

interface ResourceConfig {
  css: RouteConfig;
  js: RouteConfig;
}

function createLocalServePlugin(): Plugin {
  const resourceConfig: ResourceConfig = {
    css: {
      routes: {
        "/luci-static/md3e/main.css": "/src/media/main.css",
      },
      shouldRewrite: true,
      hmrMessage: "CSS file changed",
    },
    js: {
      routes: {
        "/luci-static/resources/menu-md3e-v2.js":
          "src/resource/menu-md3e-v2.js",
      },
      shouldRewrite: false,
      hmrMessage: "JS file changed",
    },
  };

  const buildHmrMap = (routes: Record<string, string>, isVitePath: boolean) => {
    const map: Record<string, string> = {};
    Object.entries(routes).forEach(([publicPath, sourcePath]) => {
      const filePath = isVitePath
        ? resolve(CURRENT_DIR, sourcePath.replace(/^\//, ""))
        : resolve(CURRENT_DIR, sourcePath);
      map[filePath.replace(/\\/g, "/")] = publicPath;
    });
    return map;
  };

  const cssHmrMap = buildHmrMap(resourceConfig.css.routes, true);
  const jsHmrMap = buildHmrMap(resourceConfig.js.routes, false);

  return {
    name: "local-serve-plugin",
    apply: "serve",
    enforce: "pre",

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();

        const [pathname, search] = req.url.split("?");

        // Serve static assets (fonts, images) from public directory
        if (pathname.startsWith("/luci-static/md3e/")) {
          const subPath = pathname.replace("/luci-static/md3e/", "");
          const ext = subPath.split(".").pop()?.toLowerCase() || "";
          const mimeTypes: Record<string, string> = {
            otf: "font/otf",
            woff2: "font/woff2",
            woff: "font/woff",
            ttf: "font/ttf",
            svg: "image/svg+xml",
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            webp: "image/webp",
            ico: "image/x-icon",
            gif: "image/gif",
          };

          if (mimeTypes[ext]) {
            try {
              const filePath = resolve(CURRENT_DIR, "public/md3e", subPath);
              const data = await readFile(filePath);
              res.setHeader("Content-Type", mimeTypes[ext]);
              res.setHeader("Cache-Control", "no-store");
              res.statusCode = 200;
              res.end(data);
              return;
            } catch {
              // Fall through to proxy
            }
          }
        }

        const cssTarget = resourceConfig.css.routes[pathname];
        if (cssTarget) {
          req.url = cssTarget + (search ? `?${search}` : "");
          return next();
        }

        const jsPath = resourceConfig.js.routes[pathname];
        if (jsPath) {
          try {
            const file = resolve(CURRENT_DIR, jsPath);
            const code = await readFile(file, "utf-8");
            res.setHeader("Content-Type", "text/javascript");
            res.setHeader("Cache-Control", "no-store");
            res.statusCode = 200;
            res.end(code);
            return;
          } catch (err) {
            console.error(`[JS Error] Failed to read ${jsPath}:`, err);
          }
        }

        next();
      });
    },

    handleHotUpdate({ file, server }) {
      const normalizedFile = file.replace(/\\/g, "/");

      const resources = [
        { map: cssHmrMap, config: resourceConfig.css },
        { map: jsHmrMap, config: resourceConfig.js },
      ];

      for (const { map, config } of resources) {
        const publicPath = map[normalizedFile];
        if (publicPath) {
          console.log(
            `[HMR] ${config.hmrMessage}: ${publicPath} (tracked: ${normalizedFile})`,
          );
          server.ws.send({ type: "full-reload", path: "*" });
          return [];
        }
      }
    },
  };
}

function createRedirectPlugin(previewEntry = "/cgi-bin/luci"): Plugin {
  return {
    name: "redirect-plugin",
    apply: "serve",

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/" || req.url === "/index.html") {
          res.writeHead(302, { Location: previewEntry });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, CURRENT_DIR, "");
  const OPENWRT_HOST = env.VITE_OPENWRT_HOST || "http://192.168.1.1:80";
  const DEV_HOST = env.VITE_DEV_HOST || "127.0.0.1";
  const DEV_PORT = Number(env.VITE_DEV_PORT) || 5173;
  const IS_LOCAL_PREVIEW = mode === "local-preview";

  const proxyConfig = {
    "/luci-static": {
      target: OPENWRT_HOST,
      changeOrigin: true,
      secure: false,
    },
    "/cgi-bin": {
      target: OPENWRT_HOST,
      changeOrigin: true,
      secure: false,
    },
  } as const;

  const aliasConfig = {
    "@": resolve(CURRENT_DIR, "src"),
    "@assets": resolve(CURRENT_DIR, "src/assets"),
  } as const;

  return {
    plugins: [
      tailwindcss(),
      createRedirectPlugin(
        IS_LOCAL_PREVIEW ? "/preview.html" : "/cgi-bin/luci",
      ),
      createLocalServePlugin(),
      createPublicAssetCopyPlugin(),
      createLuciJsCompressPlugin(),
    ],

    css: {
      postcss: {
        plugins: [
          {
            postcssPlugin: "remove-layers",
            Once(root) {
              function removeLayers(node: any) {
                node.walkAtRules("layer", (rule: any) => {
                  removeLayers(rule);
                  rule.replaceWith(rule.nodes);
                });
              }
              removeLayers(root);
            },
          },
        ],
      },
    },

    build: {
      outDir: BUILD_OUTPUT,
      emptyOutDir: false,
      cssMinify: "lightningcss",
      rollupOptions: {
        input: {
          main: resolve(CURRENT_DIR, "src/media/main.css"),
        },
        output: {
          assetFileNames: "md3e/[name].[ext]",
        },
      },
    },

    server: {
      host: DEV_HOST,
      port: DEV_PORT,
      proxy: proxyConfig,
      headers: {
        "Cache-Control": "no-store",
      },
    },

    resolve: {
      alias: aliasConfig,
    },
  };
});
