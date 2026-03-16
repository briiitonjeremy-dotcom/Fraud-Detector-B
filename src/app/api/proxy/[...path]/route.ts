import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://ml-file-for-url.onrender.com";

// All HTTP methods are forwarded to the Flask backend.
// This proxy runs server-side on Vercel, so there is no browser CORS issue —
// the browser only ever talks to fraud-detector-b.vercel.app.

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join("/");
  const search = req.nextUrl.search || "";
  const targetUrl = `${BACKEND_URL}/${pathStr}${search}`;

  // Forward all headers except host (which must reflect the target)
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      forwardHeaders.set(key, value);
    }
  });

  // Read body for non-GET/HEAD requests
  let body: BodyInit | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength > 0) {
      body = bytes;
    }
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      // @ts-ignore — Node fetch needs this to stream large bodies
      duplex: "half",
    });
  } catch (err) {
    console.error(`[Proxy] Failed to reach backend at ${targetUrl}:`, err);
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(err) },
      { status: 502 }
    );
  }

  // Forward the response back — copy status, headers, body
  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    // Strip headers that Next.js manages itself
    if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const responseBody = await response.arrayBuffer();
  return new NextResponse(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
