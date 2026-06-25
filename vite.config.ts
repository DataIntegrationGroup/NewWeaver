import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        // GeoServer WFS — same-origin proxy (mirrored by nginx in prod) because
        // the upstream sends no CORS headers. /geoserver/wfs?… forwards as-is.
        "/geoserver": {
          target: "https://geoserver.newmexicowaterdata.org",
          changeOrigin: true,
        },
        "/ingest/static": {
          target: "https://us-assets.i.posthog.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/ingest/, ""),
        },
        "/ingest/array": {
          target: "https://us-assets.i.posthog.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/ingest/, ""),
        },
        "/ingest": {
          target: env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/ingest/, ""),
        },
      },
    },
  }
})
