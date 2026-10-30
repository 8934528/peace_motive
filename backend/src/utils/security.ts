import type { NextFunction, Request, Response } from "express";
import { ERROR_MESSAGES, GameError } from "./errors";



const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;"
};


export function sanitizeString(value: unknown, maxLength = 100): string {
  if (typeof value !== "string") {
    return "";
  }
  
  const clean = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  
  const escaped = clean.replace(/[&<>"'/]/g, (char) => HTML_ENTITY_MAP[char] ?? char);
  return escaped.slice(0, maxLength);
}






export function sanitizeUsername(value: unknown): string {
  if (typeof value !== "string") {
    throw new GameError(ERROR_MESSAGES.INVALID_NAME, 400, "INVALID_NAME");
  }
  const clean = value
    .replace(/[<>'"`/\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length < 2 || clean.length > 20) {
    throw new GameError(ERROR_MESSAGES.INVALID_NAME, 400, "INVALID_NAME");
  }
  return clean;
}

export function sanitizeGameName(value: unknown, fallback = "Motive Match"): string {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  const clean = value
    .replace(/[<>'"`/\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.slice(0, 40) || fallback;
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id: unknown): boolean {
  return typeof id === "string" && UUID_V4_REGEX.test(id.trim());
}

const GAME_CODE_REGEX = /^[A-Z0-9]{6}$/i;

export function isValidGameCode(code: unknown): boolean {
  return typeof code === "string" && GAME_CODE_REGEX.test(code.trim());
}


export function isValidSessionToken(token: unknown): boolean {
  return typeof token === "string" && /^[a-zA-Z0-9_-]{16,128}$/.test(token.trim());
}



export const FORBIDDEN_CLIENT_KEYS = [
  "status",
  "currentPhase",
  "currentRound",
  "isRunoff",
  "runoffCandidates",
  "winnerTeam",
  "winnerReason",
  "phaseStartedAt",
  "phaseEndsAt",
  "seatNumber",
  "isAlive",
  "role",
  "roleId"
] as const;

export function stripAuthoritativeKeys<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const safe: Record<string, unknown> = { ...obj };
  for (const key of FORBIDDEN_CLIENT_KEYS) {
    delete safe[key];
  }
  return safe as Partial<T>;
}



export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // prevent sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // prevent clickjacking 
  res.setHeader("X-Frame-Options", "DENY");
  // xss filter
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // csp
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:;"
  );
  next();
}




interface RateBucket {
  count: number;
  resetAt: number;
}

class MemoryRateLimiter {
  private buckets = new Map<string, RateBucket>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // prevent memory leaks
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.buckets.entries()) {
        if (bucket.resetAt <= now) {
          this.buckets.delete(key);
        }
      }
    }, 60_000);
    cleanupInterval.unref?.();
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (bucket.count >= this.maxRequests) {
      return false;
    }

    bucket.count += 1;
    return true;
  }
}


const generalApiLimiter = new MemoryRateLimiter(150, 60_000);


const gameActionLimiter = new MemoryRateLimiter(30, 60_000);


const socketEventLimiter = new MemoryRateLimiter(40, 5_000);

export function apiRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientKey = req.ip || req.socket.remoteAddress || "unknown-client";

  if (!generalApiLimiter.isAllowed(clientKey)) {
    res.status(429).json({
      ok: false,
      message: "Too many requests. Please slow down."
    });
    return;
  }

  



  if (req.method === "POST" && (req.path === "/" || req.path.endsWith("/join"))) {
    if (!gameActionLimiter.isAllowed(clientKey)) {
      res.status(429).json({
        ok: false,
        message: "Too many game join or create requests. Please wait a moment."
      });
      return;
    }
  }

  next();
}


export function checkSocketRateLimit(socketId: string): boolean {
  return socketEventLimiter.isAllowed(socketId);
}

