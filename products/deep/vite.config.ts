import { defineConfig, type PreviewServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
// Preserve the shared shell's /deep/ entry when this app is previewed alone.
function attachDeepAlias(server: PreviewServer | ViteDevServer) {
  server.middlewares.use((req, res, next) => {
    const url = req.url || "/";
    if (url === "/deep" || url.startsWith("/deep?")) {
      res.statusCode = 302;
      res.setHeader("Location", "/deep/" + url.slice(5));
      res.end();
      return;
    }
    if (url.startsWith("/deep/")) req.url = url.slice(5);
    next();
  });
}
export default defineConfig({ base: "./", plugins: [react(), {
  name: "deep-local-preview-entry",
  configureServer: attachDeepAlias,
  configurePreviewServer: attachDeepAlias,
}] });
