import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ChevronLeft, Lock, Play, Calendar, Globe } from "lucide-react";
import { getDetail, type EpisodeMeta } from "@/lib/api";
import { ErrorMessage, FullPageLoader } from "@/components/loaders";
import { cn } from "@/lib/utils";

export default function Detail() {
  const { source, id } = useParams<{ source: string; id: string }>();
  const q = useQuery({
    enabled: !!source && !!id,
    queryKey: ["detail", source, id],
    queryFn: () => getDetail(source!, id!),
    staleTime: 5 * 60_000,
  });

  if (q.isLoading) return <FullPageLoader />;
  if (q.isError)
    return <ErrorMessage message={(q.error as Error)?.message || "Failed to load"} />;
  if (!q.data?.data) return <ErrorMessage message="Drama not found" />;

  const drama = q.data.data;
  const cover = drama.cover || "https://placehold.co/600x900/0a0a0a/666?text=No+Image";
  const firstUnlocked = drama.episodes.find((e) => !e.locked) ?? drama.episodes[0];

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>

      <div className="relative -mx-4 sm:-mx-6">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={cover}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover blur-2xl scale-110 opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />
        </div>
        <div className="relative px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-5">
          <img
            src={cover}
            alt={drama.title}
            referrerPolicy="no-referrer"
            className="w-32 sm:w-48 aspect-[2/3] rounded-xl object-cover shadow-2xl border border-white/10 self-start"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/600x900/0a0a0a/666?text=No+Image";
            }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-glow leading-tight">
              {drama.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Play className="w-3 h-3" /> {drama.episodes.length} episodes
              </span>
              {drama.defaultLanguage && (
                <span className="inline-flex items-center gap-1 uppercase">
                  <Globe className="w-3 h-3" /> {drama.defaultLanguage}
                </span>
              )}
            </div>
            {drama.description && (
              <p className="text-sm text-foreground/80 mt-3 line-clamp-5">
                {drama.description}
              </p>
            )}
            {firstUnlocked && (
              <Link
                href={`/watch/${source}/${encodeURIComponent(drama.id)}/${firstUnlocked.episodeNumber}`}
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/30 hover-elevate"
              >
                <Play className="w-4 h-4 fill-current" />
                Play Episode {firstUnlocked.episodeNumber}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Episodes</h2>
          <span className="text-xs text-muted-foreground ml-1">
            ({drama.episodes.length})
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {drama.episodes.map((ep) => (
            <EpisodeTile
              key={ep.episodeNumber}
              source={source!}
              dramaId={drama.id}
              ep={ep}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EpisodeTile({
  source,
  dramaId,
  ep,
}: {
  source: string;
  dramaId: string;
  ep: EpisodeMeta;
}) {
  const isLocked = !!ep.locked;
  const inner = (
    <div
      className={cn(
        "aspect-video rounded-lg flex items-center justify-center text-sm font-bold border transition-colors",
        isLocked
          ? "bg-card/60 border-card-border text-muted-foreground"
          : "bg-card border-card-border text-foreground hover-elevate hover:border-primary/60",
      )}
    >
      <span className="flex items-center gap-1">
        {isLocked && <Lock className="w-3.5 h-3.5" />}
        EP {ep.episodeNumber}
      </span>
    </div>
  );
  if (isLocked) return inner;
  return (
    <Link
      href={`/watch/${source}/${encodeURIComponent(dramaId)}/${ep.episodeNumber}`}
    >
      {inner}
    </Link>
  );
}
