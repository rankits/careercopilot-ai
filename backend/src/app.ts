import express from "express";
import swaggerUi from "swagger-ui-express";
import preMiddlewares from "./preMiddlewares.js";
import apiV1Routes from "./routes.js";
import { errorHandler } from "./shared/middlewares/errorHandler.js";
import { responseInterceptor } from "./shared/interceptors/response.interceptor.js";
import { endpointNotFound } from "./shared/middlewares/endpointNotFound.js";
import { globalRateLimiter } from "./shared/middlewares/rateLimiter.js";
import securityMiddlewares from "./securityMiddlewares.js";
import { prisma } from "./shared/config/db.conf.js";
import { cacheService } from "./infrastructure/cache/index.js";
import { env } from "./shared/config/env.conf.js";
import { swaggerSpec } from "./shared/config/swagger.conf.js";

const app = express();

// Required for req.ip / the rate limiter to see the real client IP when
// running behind a reverse proxy or load balancer (Docker/K8s/nginx).
app.set("trust proxy", 1);
app.disable("x-powered-by");

/**
 * Combined liveness/readiness probe: verifies Postgres and the caching
 * layer are actually reachable, not just that the HTTP server is up.
 * Suitable for both a Docker HEALTHCHECK and a Kubernetes readinessProbe.
 */
app.get("/health", async (_req, res) => {
  const [database, cache] = await Promise.allSettled([prisma.$queryRaw`SELECT 1`, cacheService.ping()]);

  const checks = {
    database: database.status === "fulfilled" ? "ok" : "down",
    cache: cache.status === "fulfilled" && cache.value ? "ok" : "down",
  } as const;

  const healthy = Object.values(checks).every((status) => status === "ok");

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Security Middlewares
app.use(securityMiddlewares);

// Pre-Route Middleware
app.use(preMiddlewares);

app.use(responseInterceptor);

app.use(globalRateLimiter);

if (env.ENABLE_SWAGGER) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Routes
app.use("/api/v1", apiV1Routes);

// Post-Route Middleware
app.use(errorHandler);

// Default deny for unknown API routes
app.use(endpointNotFound);

export default app;
