import { NextRequest } from "next/server";

function hash(input: string): number {
  let value = 0;
  for (let i = 0; i < input.length; i++) {
    value = (value << 5) - value + input.charCodeAt(i);
    value |= 0;
  }
  return Math.abs(value);
}

export async function GET(request: NextRequest) {
  const meal = request.nextUrl.searchParams.get("meal") || "Home cooked meal";
  const style = request.nextUrl.searchParams.get("style") || "warm-home-cooked-top-down";
  const seed = hash(`${meal}-${style}`);
  const hue = seed % 360;
  const hue2 = (hue + 34) % 360;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 58%, 64%)"/>
      <stop offset="100%" stop-color="hsl(${hue2}, 54%, 38%)"/>
    </linearGradient>
    <radialGradient id="plate" cx="50%" cy="45%" r="40%">
      <stop offset="0%" stop-color="#fff9ef"/>
      <stop offset="100%" stop-color="#f1dec5"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="900" fill="url(#bg)"/>
  <circle cx="600" cy="460" r="290" fill="url(#plate)" opacity="0.96"/>
  <circle cx="600" cy="460" r="220" fill="rgba(255,255,255,0.42)"/>

  <g fill="#ffffff" opacity="0.22">
    <circle cx="515" cy="410" r="38"/>
    <circle cx="680" cy="520" r="55"/>
    <circle cx="600" cy="475" r="95"/>
    <circle cx="550" cy="540" r="42"/>
  </g>

  <rect x="60" y="690" width="1080" height="140" rx="24" fill="rgba(0,0,0,0.28)"/>
  <text x="600" y="755" text-anchor="middle" fill="#fff8ee" font-size="52" font-family="'DM Sans', sans-serif" font-weight="700">
    ${meal.replace(/[<>&]/g, "")}
  </text>
  <text x="600" y="800" text-anchor="middle" fill="#ffe3c7" font-size="24" font-family="'DM Sans', sans-serif">
    Warm, home-cooked, top-down photography (mock)
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
