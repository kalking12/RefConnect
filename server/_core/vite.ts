import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { pathToFileURL } from "url";

export async function setupVite(app: Express, server: Server) {
  // Vite and its plugins are development tools. Loading them only here keeps
  // the production server independent of devDependencies.
  const viteConfigUrl = pathToFileURL(path.resolve(import.meta.dirname, "../..", "vite.config.ts"));
  const [{ createServer: createViteServer }, { default: viteConfig }] = await Promise.all([
    import("vite"),
    import(viteConfigUrl.href) as Promise<{ default: typeof import("../../vite.config").default }>,
  ]);
  const serverOptions = {
    ...viteConfig.server,
    middlewareMode: true,
    hmr: { server },
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      const relativePath = path.relative(distPath, filePath).split(path.sep).join("/");
      if (relativePath === "index.html") {
        // HTML must discover the current hashed script and stylesheet after a deploy.
        res.setHeader("Cache-Control", "no-cache");
      } else if (relativePath.startsWith("assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (relativePath.startsWith("images/")) {
        // This path is auth-gated by index.ts and can contain private site images.
        res.setHeader("Cache-Control", "private, no-store");
      } else {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  }));

  // Missing files and API endpoints must not be mistaken for a valid SPA page.
  app.use((req, res, next) => {
    if (/^\/(?:api|assets|brand|images|preview)(?:\/|$)/.test(req.path)) {
      res.status(404).end();
      return;
    }
    next();
  });

  // Browser routes can be loaded directly or refreshed.
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
