import "dotenv/config";
import express from "express";
import path from "path";
import { Server } from "socket.io";
import { createServer as createHttpServer } from "http";
import apiRoutes from "./server/routes/index.ts";
import { errorMiddleware } from "./server/middleware/error.middleware.ts";
import prisma from "./server/config/db.ts";

export { prisma };

console.log("Initializing POS server with Node.js TS stripping support...");

export async function createServer() {
  const app = express();
  const PORT = 3000;

  console.log(`Setting up server in ${process.env.NODE_ENV || 'development'} mode`);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Modular API Routes
  app.use("/api", apiRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), mode: process.env.NODE_ENV });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Loading Vite Dev Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      res.sendFile(indexPath);
    });
  }

  // Global Error Handler
  app.use(errorMiddleware);

  return app;
}

if (process.env.NODE_ENV !== "test") {
  createServer()
    .then((app) => {
      const PORT = process.env.PORT ? parseInt(process.env.PORT) : (process.env.NODE_ENV === "production" ? 3002 : 3003);
      const httpServer = createHttpServer(app);
      const io = new Server(httpServer, {
        cors: { origin: "*" },
      });

      app.set("io", io);

      io.on("connection", (socket) => {
        socket.on("join-cart", (sessionId) => {
          socket.join(`cart-${sessionId}`);
        });
      });

      httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
        
        // Inisialisasi Penjadwal Hybrid Optimasi Persediaan secara dinamis
        import("./server/services/SchedulerService")
          .then(({ SchedulerService }) => {
            SchedulerService.initScheduler();
          })
          .catch((err) => {
            console.error("[Scheduler] Gagal memulai SchedulerService:", err);
          });
      });
    })
    .catch((err) => {
      console.error("CRITICAL: Failed to start server:", err);
      process.exit(1);
    });
}
