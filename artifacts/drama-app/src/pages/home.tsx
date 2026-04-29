import { useQuery } from "@tanstack/react-query";
import { Flame, TrendingUp } from "lucide-react";
import { getList, type DramaItem } from "@/lib/api";
import { DramaGrid } from "@/components/drama-card";
import { SourcePicker, useSelectedSource } from "@/components/source-picker";
import { ErrorMessage, GridSkeleton, EmptyState } from "@/components/loaders";
import { Link } from "wouter";
import { poster } from "@/lib/api";

export default function Home() {
  const [source, setSource, sources] = useSelectedSource();

  const trending = useQuery({
    queryKey: ["trending", source],
    queryFn: () => getList(source, "trending"),
    staleTime: 60_000,
  });

  const items = trending.data?.items ?? [];
  const hero = items[0];
  const rest = items.slice(1);

  return (
    <div className="space-y-6">
      <SourcePicker value={source} onChange={setSource} sources={sources} />

      {trending.isLoading ? (
        <>
          <div className="aspect-[16/9] sm:aspect-[21/9] rounded-2xl bg-card animate-pulse" />
          <GridSkeleton />
        </>
      ) : trending.isError ? (
        <ErrorMessage message={(trending.error as Error)?.message || "Failed to load"} />
      ) : items.length === 0 ? (
        <EmptyState message="No trending dramas right now." />
      ) : (
        <>
          {hero && <Hero source={source} item={hero} />}
          <SectionHeader icon={<Flame className="w-5 h-5 text-primary" />} title="Trending Now" />
          <DramaGrid source={source} items={rest} />
        </>
      )}
    </div>
  );
}

function Hero({ source, item }: { source: string; item: DramaItem }) {
  return (
    <Link
      href={`/drama/${source}/${encodeURIComponent(item.id)}`}
      className="block relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-card-border bg-card hover-elevate"
    >
      <img
        src={poster(item)}
        alt={item.title}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
      <div className="relative h-full flex items-end gap-4 p-4 sm:p-6">
        <img
          src={poster(item)}
          alt=""
          referrerPolicy="no-referrer"
          className="hidden sm:block h-[80%] aspect-[2/3] rounded-xl object-cover shadow-xl border border-white/10"
        />
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[11px] font-bold mb-2 uppercase tracking-wider">
            <TrendingUp className="w-3 h-3" /> #1 Trending
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white text-glow line-clamp-2">
            {item.title}
          </h1>
          {(item.synopsis || item.description) && (
            <p className="hidden sm:block text-sm text-white/80 mt-2 line-clamp-2">
              {item.synopsis || item.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      {icon}
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}
