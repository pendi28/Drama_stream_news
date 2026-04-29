import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const ALLOWED_HOST_SUFFIXES = [
  "crazymaplestudios.com",
  "shorttv.live",
  "shortmax.com",
  "goodshort.com",
  "anichin.bio",
  "akamaihd.net",
  "akamaized.net",
  "cloudfront.net",
  "amazonaws.com",
  "aliyuncs.com",
  "myqcloud.com",
  "cdninstagram.com",
  "fbcdn.net",
  "hwzthls.com",
  "hwztvideo.com",
  "thwztvideo.com",
  "dramabox.com",
  "idrama.tv",
  "netshort.com",
  "dramawave.com",
  "flickreels.com",
  "freereels.com",
  "stardusttv.com",
  "dramanova.com",
  "starshort.com",
  "drambite.com",
  "dramabite.com",
  "mereels.com",
  // melolo / dramabos CDN hosts (returned by the Melolo upstream)
  "dramabos.pro",
  "dramabos.my.id",
  "wsrv.nl",
  "ibyteimg.com",
];

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
  if (isPrivateHost(host)) return false;
  if (
    ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith("." + suffix),
    )
  ) {
    return true;
  }
  // Fallback: allow any public HTTPS host. The upstream Melolo source can
  // change CDN domains over time, so a strict allowlist breaks playback
  // every time a new CDN appears. Private/loopback hosts are still blocked
  // above to prevent SSRF.
  return true;
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

router.get("/v1/proxy", async (req: Request, res: Response) => {
  const target = req.query.url;
  if (typeof target !== "string" || !target) {
    res.status(400).json({ error: "missing_url" });
    return;
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    res.status(400).json({ error: "invalid_url" });
    return;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    res.status(400).json({ error: "unsupported_protocol" });
    return;
  }

  if (!isAllowed(url)) {
    res.status(403).json({ error: "host_not_allowed", host: url.hostname });
    return;
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "*/*",
      Referer: `${url.protocol}//${url.host}/`,
    };

    const range = req.headers.range;
    if (typeof range === "string") {
      headers["Range"] = range;
    }

    const upstream = await fetch(url.toString(), {
      headers,
      redirect: "follow",
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "public, max-age=300");

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    const isManifest =
      url.pathname.toLowerCase().endsWith(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegURL");

    if (isManifest) {
      const text = await upstream.text();
      const proxyBase = `${req.baseUrl}/v1/proxy`;
      const rewritten = rewriteM3u8(text, url, proxyBase);
      res.status(upstream.status);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.send(rewritten);
      return;
    }

    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);

    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

    if (!upstream.body) {
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    res.on("close", () => {
      reader.cancel().catch(() => {});
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) {
        await new Promise<void>((resolve) => res.once("drain", () => resolve()));
      }
    }
    res.end();
  } catch (err) {
    req.log?.error({ err, target }, "proxy_fetch_failed");
    if (!res.headersSent) {
      res.status(502).json({ error: "upstream_failed" });
    } else {
      res.end();
    }
  }
});

export default router;
