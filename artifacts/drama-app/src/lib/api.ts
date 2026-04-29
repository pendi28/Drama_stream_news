const BASE = (() => {
  const b = import.meta.env.BASE_URL || "/";
  return b.endsWith("/") ? b.slice(0, -1) : b;
})();

export const API_BASE = `${BASE}/api`;

export type DramaItem = {
  id: string;
  dramaId?: string;
  title: string;
  description?: string;
  synopsis?: string;
  cover?: string;
  posterImg?: string;
  episodes?: number;
  totalEpisodes?: number;
  isCompleted?: string;
  defaultLanguage?: string;
  categoryNames?: string[];
  publishedAt?: string;
  viewCount?: number;
  likeCount?: number;
  favoriteCount?: number;
};

export type DramaListResponse = {
  code: number;
  hasMore?: boolean;
  items: DramaItem[];
};

export type EpisodeMeta = {
  episodeNumber: number;
  number: number;
  title?: string;
  locked?: boolean;
  videoUrl?: string;
  qualityList?: { label: string; url: string; isDefault?: boolean }[];
  subtitles?: { lang: string; url: string }[];
};

export type DramaDetail = {
  id: string;
  dramaId?: string;
  title: string;
  description?: string;
  cover?: string;
  defaultLanguage?: string;
  episodes: EpisodeMeta[];
};

export type DetailResponse = {
  code: number;
  data: DramaDetail;
};

export type EpisodeResponse = {
  code: number;
  msg?: string;
  episodeNumber: number;
  number: number;
  locked?: boolean;
  videoUrl: string;
  qualityList?: { label: string; url: string; isDefault?: boolean }[];
  subtitles?: { lang: string; url: string }[];
};

export type Source = { id: string; name: string };

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await r.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON from ${url} (${r.status})`);
  }
  if (!r.ok) {
    const msg = body?.error || body?.msg || `Request failed (${r.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export async function getSources(): Promise<Source[]> {
  const r = await fetchJson<{ sources: Source[] }>(`${API_BASE}/sources`);
  return r.sources;
}

export async function getList(
  source: string,
  path: "trending" | "foryou" | "hotrank" | "recommended" | "homepage" | "latest" | "hot" | "new",
  params?: Record<string, string | number>,
): Promise<DramaListResponse> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  }
  return fetchJson<DramaListResponse>(
    `${API_BASE}/v1/${source}/${path}${qs.toString() ? `?${qs}` : ""}`,
  );
}

export async function searchDramas(
  source: string,
  query: string,
): Promise<DramaListResponse> {
  return fetchJson<DramaListResponse>(
    `${API_BASE}/v1/${source}/search?query=${encodeURIComponent(query)}`,
  );
}

export async function getDetail(
  source: string,
  id: string,
): Promise<DetailResponse> {
  return fetchJson<DetailResponse>(
    `${API_BASE}/v1/${source}/detail?id=${encodeURIComponent(id)}`,
  );
}

export async function getEpisode(
  source: string,
  id: string,
  ep: number,
): Promise<EpisodeResponse> {
  return fetchJson<EpisodeResponse>(
    `${API_BASE}/v1/${source}/episode?id=${encodeURIComponent(id)}&ep=${ep}`,
  );
}

export function poster(item: DramaItem): string {
  return (
    item.cover ||
    item.posterImg ||
    "https://placehold.co/600x900/0a0a0a/666?text=No+Image"
  );
}

export function proxify(url: string | undefined | null): string {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}/v1/proxy?url=${encodeURIComponent(url)}`;
}
