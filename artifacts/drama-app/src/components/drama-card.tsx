import { Link } from "wouter";
import { Play, Eye } from "lucide-react";
import { type DramaItem, poster } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export function DramaCard({
  source,
  item,
}: {
  source: string;
  item: DramaItem;
}) {
  return (
    <Link
      href={`/drama/${source}/${encodeURIComponent(item.id)}`}
      className="group block hover-elevate"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card border border-card-border shadow-md">
        <img
          src={poster(item)}
          alt={item.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/600x900/0a0a0a/666?text=No+Image";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-0.5 text-[11px] text-white flex items-center gap-1">
          <Play className="w-3 h-3 fill-current" />
          {item.totalEpisodes ?? item.episodes ?? "?"} ep
        </div>
        {item.viewCount && item.viewCount > 0 ? (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-0.5 text-[11px] text-white flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatNumber(item.viewCount)}
          </div>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
            {item.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

export function DramaGrid({
  source,
  items,
}: {
  source: string;
  items: DramaItem[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {items.map((it, i) => (
        <DramaCard key={`${it.id}-${i}`} source={source} item={it} />
      ))}
    </div>
  );
}
