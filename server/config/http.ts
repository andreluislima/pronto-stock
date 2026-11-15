import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { CorsOptions } from "cors";

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
};

export function validateHttpConfig() {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL obrigatória.");
  if (!process.env.API_ACCESS_KEY || process.env.API_ACCESS_KEY.length < 32)
    throw new Error("API_ACCESS_KEY deve ter pelo menos 32 caracteres.");
  if (!process.env.ALLOWED_ORIGINS)
    throw new Error("ALLOWED_ORIGINS obrigatória.");
}

export function requireAccessKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const expected = process.env.API_ACCESS_KEY;
  if (!expected && process.env.NODE_ENV !== "production") return next();
  if (!expected) {
    res.status(503).json({ error: "Acesso não configurado." });
    return;
  }
  const authorization = req.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!supplied || !timingSafeEqual(digest(supplied), digest(expected))) {
    res.status(401).json({ error: "Informe uma chave de acesso válida." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
}
