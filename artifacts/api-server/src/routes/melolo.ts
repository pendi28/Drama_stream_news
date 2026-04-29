import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const MELOLO_BASE =
  process.env["MELOLO_BASE_URL"] || "https://melolo.dramabos.my.id";
const TOKEN =
  process.env["MELOLO_TOKEN"] || "997A7B39CE649A072EA8B2E85FD9A800";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (compatible; DramaStream/1.0; +https://drama-streamshotmax.vercel.app)",
  Accept: "application/json",
};

interface MeloloItem {
  id?: string;
  name?: string;
  title?: string;
  cover?: string;
  intro?: string;
  episodes?: number;
}

interface MeloloVideo {
  episode?: number;
  vid?: string;
  duration?: number;
}

async function meloloFetch<T = unknown>(path: string): Promise<T> {
  if (!TOKEN) throw new Error("MELOLO_TOKEN belum di-set");
  const sep = path.includes("?") ? "&" : "?";
  const url = `${MELOLO_BASE}${path}${sep}code=${encodeURIComponent(TOKEN)}`;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`melolo_${r.status}_${body.slice(0, 120)}`);
  }
  return (await r.json()) as T;
}

function mapItem(it: MeloloItem) {
  const id = String(it.id ?? "");
  const title = it.title ?? it.name ?? "(tanpa judul)";
  const cover = it.cover ?? "";
  const description = it.intro ?? "";
  const ep = Number.isFinite(it.episodes) ? Number(it.episodes) : 0;
  return {
    id,
    dramaId: id,
    title,
    cover,
    posterImg: cover,
    description,
    synopsis: description,
    episodes: ep,
    totalEpisodes: ep,
    categoryNames: [] as string[],
    viewCount: 0,
  };
}

function handleError(req: Request, res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  req.log?.error({ err: message }, "melolo_request_failed");
  res.status(502).json({ error: "upstream_error", message });
}

const ALLOWED_LISTS = new Set([
  "trending",
  "foryou",
  "homepage",
  "home",
  "hot",
  "new",
  "recommended",
  "latest",
  "hotrank",
]);

router.get("/v1/melolo/search", async (req: Request, res: Response) => {
  const q = (req.query["query"] || req.query["q"] || req.query["keyword"]) as string;
  if (!q) {
    res.status(400).json({ error: "missing_query" });
    return;
  }
  try {
    const page = (req.query["page"] as string) || "1";
    const data = await meloloFetch<{ data?: MeloloItem[] }>(
      `/api/search?keyword=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}`,
    );
    const items = (data?.data ?? []).map(mapItem);
    res
      .status(200)
      .set("Cache-Control", "public, max-age=60")
      .json({ code: 0, hasMore: items.length > 0, items });
  } catch (err) {
    handleError(req, res, err);
  }
});

router.get("/v1/melolo/detail", async (req: Request, res: Response) => {
  const id = (req.query["id"] as string) || "";
  if (!id) {
    res.status(400).json({ error: "missing_id" });
    return;
  }
  try {
    const data = await meloloFetch<MeloloItem & { videos?: MeloloVideo[] }>(
      `/api/detail/${encodeURIComponent(id)}`,
    );
    const videos = Array.isArray(data?.videos) ? data.videos : [];
    const episodes = videos.map((v) => {
      const num = Number(v?.episode ?? 0) || 0;
      return {
        episodeNumber: num,
        number: num,
        title: `Episode ${num}`,
        locked: false,
      };
    });
    res
      .status(200)
      .set("Cache-Control", "public, max-age=300")
      .json({
        code: 0,
        data: {
          id: String(data?.id ?? id),
          dramaId: String(data?.id ?? id),
          title: data?.title ?? data?.name ?? "",
          description: data?.intro ?? "",
          cover: data?.cover ?? "",
          posterImg: data?.cover ?? "",
          defaultLanguage: "in",
          episodes,
          totalEpisodes: episodes.length,
        },
      });
  } catch (err) {
    handleError(req, res, err);
  }
});

router.get("/v1/melolo/episode", async (req: Request, res: Response) => {
  const id = (req.query["id"] as string) || "";
  const epRaw = (req.query["ep"] as string) || "1";
  const ep = Number.parseInt(epRaw, 10);
  if (!id || !Number.isFinite(ep) || ep < 1) {
    res.status(400).json({ error: "missing_or_bad_params" });
    return;
  }
  try {
    const data = await meloloFetch<{
      videoUrl?: string;
      qualityList?: { label?: string; url?: string }[];
      locked?: boolean;
    }>(`/api/video?id=${encodeURIComponent(id)}&ep=${ep}`);
    const videoUrl = data?.videoUrl ?? "";
    const qualityList = Array.isArray(data?.qualityList)
      ? data.qualityList
          .filter((q) => q && typeof q.url === "string" && q.url)
          .map((q, i) => ({
            label: q.label ?? `Q${i + 1}`,
            url: q.url as string,
            isDefault: i === 0,
          }))
      : [];
    if (!videoUrl && qualityList.length === 0) {
      res.status(404).json({
        code: -1,
        msg: "locked_or_not_found",
        episodeNumber: ep,
        locked: !!data?.locked,
      });
      return;
    }
    res.status(200).set("Cache-Control", "public, max-age=120").json({
      code: 0,
      episodeNumber: ep,
      videoUrl: videoUrl || qualityList[0]?.url || "",
      qualityList:
        qualityList.length > 0
          ? qualityList
          : [{ label: "720p", url: videoUrl, isDefault: true }],
      subtitles: [],
    });
  } catch (err) {
    handleError(req, res, err);
  }
});

router.get("/v1/melolo/:list", async (req: Request, res: Response) => {
  const list = req.params["list"] || "";
  if (!ALLOWED_LISTS.has(list)) {
    res.status(404).json({ error: "unknown_list", list });
    return;
  }
  try {
    const page = (req.query["page"] as string) || "1";
    const data = await meloloFetch<{ data?: MeloloItem[] }>(
      `/api/home?page=${encodeURIComponent(page)}`,
    );
    const items = (data?.data ?? []).map(mapItem);
    res
      .status(200)
      .set("Cache-Control", "public, max-age=180")
      .json({ code: 0, hasMore: items.length > 0, items });
  } catch (err) {
    handleError(req, res, err);
  }
});

export default router;
