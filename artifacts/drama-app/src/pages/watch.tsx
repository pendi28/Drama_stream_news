import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import Hls from "hls.js";
import {
  ChevronLeft,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  AlertTriangle,
} from "lucide-react";
import { getEpisode, getDetail, proxify } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Watch() {
  const { source, id, ep } = useParams<{
    source: string;
    id: string;
    ep: string;
  }>();
  const [, setLocation] = useLocation();
  const epNum = Math.max(1, Number(ep) || 1);

  const detail = useQuery({
    enabled: !!source && !!id,
    queryKey: ["detail", source, id],
    queryFn: () => getDetail(source!, id!),
    staleTime: 5 * 60_000,
  });

  const episode = useQuery({
    enabled: !!source && !!id && !!epNum,
    queryKey: ["episode", source, id, epNum],
    queryFn: () => getEpisode(source!, id!, epNum),
    staleTime: 60_000,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const rawUrl = episode.data?.videoUrl || "";
  const videoUrl = rawUrl ? proxify(rawUrl) : "";

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    setPlayerError(null);
    setLoading(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isM3u8 = /\.m3u8(\?|$)/i.test(rawUrl);

    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(v);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setPlayerError(`Player error: ${data.type}`);
          setLoading(false);
        }
      });
    } else {
      v.src = videoUrl;
    }

    const onLoaded = () => {
      setDuration(v.duration || 0);
      setLoading(false);
    };
    const onTime = () => setProgress(v.currentTime || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onError = () => {
      setPlayerError("Failed to load video");
      setLoading(false);
    };

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("error", onError);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("error", onError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl, rawUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0), v.currentTime + delta));
  };

  const seekTo = (pct: number) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = (pct / 100) * v.duration;
  };

  const episodes = detail.data?.data?.episodes ?? [];
  const totalEps = episodes.length;
  const goEp = (n: number) => {
    if (n < 1 || (totalEps && n > totalEps)) return;
    setLocation(`/watch/${source}/${encodeURIComponent(id!)}/${n}`);
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const drama = detail.data?.data;
  const isLockedEp = !!episode.data?.locked;

  return (
    <div className="space-y-4">
      <Link
        href={`/detail/${source}/${encodeURIComponent(id!)}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" /> Back to detail
      </Link>

      <div className="relative w-full bg-black rounded-xl overflow-hidden aspect-video">
        {episode.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {episode.isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <p className="text-sm">
              {(episode.error as Error)?.message || "Failed to load episode"}
            </p>
          </div>
        )}

        {isLockedEp && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white p-6 text-center bg-black/80">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <p className="text-sm">This episode is locked.</p>
          </div>
        )}

        {!episode.isLoading && !episode.isError && !isLockedEp && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full"
              playsInline
              autoPlay
              controls={false}
              onClick={togglePlay}
            >
              {(episode.data?.subtitles ?? []).map((s, i) => (
                <track
                  key={`${s.lang}-${i}`}
                  src={proxify(s.url)}
                  srcLang={s.lang}
                  label={s.lang.toUpperCase()}
                  kind="subtitles"
                  default={i === 0}
                />
              ))}
            </video>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Loader2 className="w-10 h-10 animate-spin text-white/80" />
              </div>
            )}

            {playerError && (
              <div className="absolute inset-x-0 top-2 mx-auto w-fit px-3 py-1 rounded bg-red-500/80 text-white text-xs">
                {playerError}
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center gap-3 text-white text-xs">
                <span className="tabular-nums">{fmt(progress)}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={duration ? (progress / duration) * 100 : 0}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="flex-1 accent-primary"
                  aria-label="Seek"
                />
                <span className="tabular-nums">{fmt(duration)}</span>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-white">
                <button
                  type="button"
                  onClick={() => goEp(epNum - 1)}
                  disabled={epNum <= 1}
                  className="p-2 rounded-full hover-elevate disabled:opacity-40"
                  aria-label="Previous episode"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => skip(-10)}
                  className="p-2 rounded-full hover-elevate"
                  aria-label="Back 10s"
                >
                  <span className="text-xs font-bold">-10</span>
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-3 rounded-full bg-white/15 hover-elevate"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => skip(10)}
                  className="p-2 rounded-full hover-elevate"
                  aria-label="Forward 10s"
                >
                  <span className="text-xs font-bold">+10</span>
                </button>
                <button
                  type="button"
                  onClick={() => goEp(epNum + 1)}
                  disabled={!!totalEps && epNum >= totalEps}
                  className="p-2 rounded-full hover-elevate disabled:opacity-40"
                  aria-label="Next episode"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 rounded-full hover-elevate ml-2"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div>
        <h1 className="text-lg font-bold leading-tight">
          {drama?.title || "Loading..."}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Episode {epNum}
          {totalEps ? ` of ${totalEps}` : ""}
        </p>
      </div>

      {totalEps > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Episodes</h2>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {episodes.map((e) => {
              const active = e.episodeNumber === epNum;
              const locked = !!e.locked;
              if (locked) {
                return (
                  <div
                    key={e.episodeNumber}
                    className="aspect-video rounded-md flex items-center justify-center text-xs font-bold bg-card/60 border border-card-border text-muted-foreground"
                  >
                    EP {e.episodeNumber}
                  </div>
                );
              }
              return (
                <Link
                  key={e.episodeNumber}
                  href={`/watch/${source}/${encodeURIComponent(id!)}/${e.episodeNumber}`}
                  className={cn(
                    "aspect-video rounded-md flex items-center justify-center text-xs font-bold border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-card-border hover-elevate hover:border-primary/60",
                  )}
                >
                  EP {e.episodeNumber}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
