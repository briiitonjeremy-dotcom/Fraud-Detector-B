import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://ml-file-for-url.onrender.com";

// Headers that must be stripped from the forwarded request so Node's fetch
// can negotiate its own encoding with the backend.
const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "accept-encoding", // let Node handle decompression transparently
  "connection",
  "keep-alive",
  "te",
  "trailer",
  "upgrade",
]);

// Headers that must be stripped from the backend response before sending to
// the browser. Node's fetch already decompressed the body, so forwarding
// content-encoding would cause the browser to try to decompress again
// (ERR_CONTENT_DECODING_FAILED). content-length is also wrong after
// decompression.
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "te",
  "trailer",
  "upgrade",
]);

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join("/");
  const search = req.nextUrl.search || "";
  const targetUrl = `${BACKEND_URL}/${pathStr}${search}`;

  // Build forwarded request headers — drop hop-by-hop and encoding headers
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
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
      // @ts-ignore — required for streaming POST bodies in Node 18
      duplex: "half",
    });
  } catch (err) {
    console.error(`[Proxy] Failed to reach backend at ${targetUrl}:`, err);
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(err) },
      { status: 502 }
    );
  }

  // Build response headers — strip encoding/length headers so the browser
  // does not attempt to re-decompress the already-decompressed body.
  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  // Read the (already-decompressed) body as raw bytes
  let responseBody: ArrayBuffer;
  try {
    responseBody = await response.arrayBuffer();
  } catch (err) {
    console.error(`[Proxy] Failed to read backend response body:`, err);
    return NextResponse.json(
      { error: "Failed to read backend response", detail: String(err) },
      { status: 502 }
    );
  }

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
