import dns from "node:dns/promises";
import net from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { buildFallbackMealImageUrl } from "@/lib/meal-image-url";

const FETCH_TIMEOUT_MS = 7000;
const MAX_REDIRECTS = 3;
function withTimeout(signal: AbortSignal, timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  signal.addEventListener("abort", () => {
    clearTimeout(timeout);
    controller.abort();
  });

  return controller.signal;
}

function getAllowedHosts(): string[] {
  const raw = process.env.IMAGE_PROXY_ALLOWED_HOSTS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedHost(hostname: string, allowedHosts: string[]): boolean {
  if (allowedHosts.length === 0) {
    return true;
  }
  const host = hostname.toLowerCase();
  return allowedHosts.some((pattern) => {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1); // ".example.com"
      return host.endsWith(suffix);
    }
    return host === pattern;
  });
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((part) => Number(part));
  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
}

function isPrivateIPv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  const inRange = (start: string, end: string) => value >= ipv4ToInt(start) && value <= ipv4ToInt(end);

  return (
    inRange("0.0.0.0", "0.255.255.255") ||
    inRange("10.0.0.0", "10.255.255.255") ||
    inRange("100.64.0.0", "100.127.255.255") ||
    inRange("127.0.0.0", "127.255.255.255") ||
    inRange("169.254.0.0", "169.254.255.255") ||
    inRange("172.16.0.0", "172.31.255.255") ||
    inRange("192.0.0.0", "192.0.0.255") ||
    inRange("192.0.2.0", "192.0.2.255") ||
    inRange("192.168.0.0", "192.168.255.255") ||
    inRange("198.18.0.0", "198.19.255.255") ||
    inRange("198.51.100.0", "198.51.100.255") ||
    inRange("203.0.113.0", "203.0.113.255") ||
    inRange("224.0.0.0", "255.255.255.255")
  );
}

function isPrivateIPv6(ip: string): boolean {
  const value = ip.toLowerCase();
  return (
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  );
}

async function resolvesToPublicAddress(hostname: string): Promise<boolean> {
  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4) {
    return !isPrivateIPv4(hostname);
  }
  if (ipVersion === 6) {
    return !isPrivateIPv6(hostname);
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (records.length === 0) {
      return false;
    }

    for (const record of records) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        return false;
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

async function isSafeImageUrl(url: URL, allowedHosts: string[]): Promise<boolean> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return false;
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    return false;
  }

  if (!isAllowedHost(url.hostname, allowedHosts)) {
    return false;
  }

  return resolvesToPublicAddress(url.hostname);
}

async function fetchImageWithValidatedRedirects(url: URL, requestSignal: AbortSignal, allowedHosts: string[]) {
  let current = new URL(url.toString());

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    if (!(await isSafeImageUrl(current, allowedHosts))) {
      return null;
    }

    const response = await fetch(current.toString(), {
      redirect: "manual",
      signal: withTimeout(requestSignal, FETCH_TIMEOUT_MS),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; FoodishImageProxy/1.0)",
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return null;
      }
      current = new URL(location, current);
      continue;
    }

    return response;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");
  const meal = request.nextUrl.searchParams.get("meal") || "Meal";
  const fallback = buildFallbackMealImageUrl(meal);

  if (!src) {
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  try {
    const allowedHosts = getAllowedHosts();
    const response = await fetchImageWithValidatedRedirects(parsed, request.signal, allowedHosts);
    if (!response) {
      return NextResponse.redirect(new URL(fallback, request.url));
    }

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.redirect(new URL(fallback, request.url));
    }

    const body = await response.arrayBuffer();

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.redirect(new URL(fallback, request.url));
  }
}
