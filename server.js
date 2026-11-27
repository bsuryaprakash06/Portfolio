import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import healthHandler from "./api/health.js";
import profileHandler from "./api/profile.js";
import contactHandler from "./api/contact.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 4173;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const API_ROUTES = {
  "/api/health": healthHandler,
  "/api/profile": profileHandler,
  "/api/contact": contactHandler,
};

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || "/").split("?")[0];

  const apiHandler = API_ROUTES[urlPath];
  if (apiHandler) {
    try {
      await apiHandler(req, res);
    } catch (err) {
      console.error("[local-server api error]", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "Internal server error" }));
      }
    }
    return;
  }

  const relPath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(__dirname, relPath);

  if (
    !filePath.startsWith(__dirname) ||
    relPath.startsWith("api/") ||
    relPath.startsWith("lib/") ||
    relPath === "server.js"
  ) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`SureYeah.cv local server running at http://127.0.0.1:${port}`);
});
