// @ts-nocheck
export const config = {
  runtime: "edge",
};

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);

function isPrivateHost(host: string): boolean {
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (host.startsWith("169.254.")) return true;
  return false;
}

function isAllowed(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  // Block private / loopback hosts to prevent SSRF.
  // Allow any public host — the upstream Melolo source can return videos
  // from many CDN domains (e.g. cdn.dramabos.pro) and a strict allowlist
  // causes "Failed to load video" whenever a new CDN appears.
  return !isPrivateHost(host);
}

function rewriteM3u8(body: string, baseUrl: URL, proxyBase: string): string {
  const lines = body.split(/\r?\n/);
  return lines
    .map((line) => {
      if (!line || line.startsWith("#")) {
        const keyMatch = line.match(/URI="([^"]+)"/);
        if (keyMatch) {
          const resolved = new URL(keyMatch[1], baseUrl).toString();
          const proxied = `${proxyBase}?url=${encodeURIComponent(resolved)}`;
          return line.replace(keyMatch[1], proxied);
        }
        return line;
      }
      try {
        const resolved = new URL(line, baseUrl).toString();
        return `${proxyBase}?url=${encodeURIComponent(resolved)}`;
      } catch {
        return line;
      }
    })
    .join("\n");
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges",
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const reqUrl = new URL(req.url);
  const target = reqUrl.searchParams.get("url");
  if (!target) {
    return Response.json(
      { error: "missing_url" },
      { status: 400, headers: corsHeaders() },
    );
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return Response.json(
      { error: "invalid_url" },
      { status: 400, headers: corsHeaders() },
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return Response.json(
      { error: "unsupported_protocol" },
      { status: 400, headers: corsHeaders() },
    );
  }

  if (!isAllowed(url)) {
    return Response.json(
      { error: "host_not_allowed", host: url.hostname },
      { status: 403, headers: corsHeaders() },
    );
  }

  const upstreamHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    Accept: "*/*",
    Referer: `${url.protocol}//${url.host}/`,
  };

  const range = req.headers.get("range");
  if (range) upstreamHeaders["Range"] = range;

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      headers: upstreamHeaders,
      redirect: "follow",
    });
  } catch (err) {
    return Response.json(
      { error: "upstream_failed", detail: String(err) },
      { status: 502, headers: corsHeaders() },
    );
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";

  const isManifest =
    url.pathname.toLowerCase().endsWith(".m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("x-mpegURL");

  if (isManifest) {
    const text = await upstream.text();
    const proxyBase = `${reqUrl.origin}/api/v1/proxy`;
    const rewritten = rewriteM3u8(text, url, proxyBase);
    return new Response(rewritten, {
      status: upstream.status,
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  // Pipe binary body langsung ke client (true streaming)
  const passHeaders: Record<string, string> = {
    ...corsHeaders(),
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=300",
  };

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) passHeaders["Content-Length"] = contentLength;

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) passHeaders["Content-Range"] = contentRange;

  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) passHeaders["Accept-Ranges"] = acceptRanges;

  return new Response(upstream.body, {
    status: upstream.status,
    headers: passHeaders,
  });
}
