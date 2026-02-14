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
  const style = request.nextUrl.searchParams.get("style") || "vertical-food-photography-dark-moody-lighting";
  const seed = hash(`${meal}-${style}`);
  const hue = seed % 360;
  const hue2 = (hue + 34) % 360;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 34%, 24%)"/>
      <stop offset="100%" stop-color="hsl(${hue2}, 40%, 10%)"/>
    </linearGradient>
    <radialGradient id="plate" cx="50%" cy="45%" r="40%">
      <stop offset="0%" stop-color="#fff9ef"/>
      <stop offset="100%" stop-color="#f1dec5"/>
    </radialGradient>
  </defs>

  <rect width="900" height="1200" fill="url(#bg)"/>
  <circle cx="450" cy="550" r="260" fill="url(#plate)" opacity="0.95"/>
  <circle cx="450" cy="550" r="195" fill="rgba(255,255,255,0.35)"/>

  <g fill="#ffffff" opacity="0.22">
    <circle cx="390" cy="500" r="34"/>
    <circle cx="555" cy="620" r="50"/>
    <circle cx="450" cy="580" r="86"/>
    <circle cx="405" cy="650" r="38"/>
  </g>

  <rect x="40" y="930" width="820" height="180" rx="24" fill="rgba(0,0,0,0.45)"/>
  <text x="450" y="1000" text-anchor="middle" fill="#fff8ee" font-size="44" font-family="'DM Sans', sans-serif" font-weight="700">
    ${meal.replace(/[<>&]/g, "")}
  </text>
  <text x="450" y="1050" text-anchor="middle" fill="#ffe3c7" font-size="20" font-family="'DM Sans', sans-serif">
    Vertical food photography, dark moody lighting (mock)
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
