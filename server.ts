import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

export const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Pasted chat text only now, so a small limit is plenty.
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Any unmatched /api/* request must fail as JSON, never fall through to the
// SPA's HTML catch-all.
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: "요청하신 API 엔드포인트를 찾을 수 없습니다." });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in development mode.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static distribution files in production mode.");
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    const message =
      err.type === "entity.too.large"
        ? "입력한 텍스트가 너무 깁니다. 조금 줄여서 다시 시도해 주세요."
        : err.message || "서버 오류가 발생했습니다.";
    res.status(status).json({ success: false, error: message });
  });

  if (process.env.VERCEL === "1") return;

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[사람談] Server running on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL === "1") {
  console.log("[사람談] Express app exported for Vercel Functions.");
} else {
  startServer();
}

export default app;
