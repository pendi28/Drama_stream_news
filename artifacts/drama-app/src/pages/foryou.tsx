import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { getList } from "@/lib/api";
import { DramaGrid } from "@/components/drama-card";
import { SourcePicker, useSelectedSource } from "@/components/source-picker";
import { ErrorMessage, GridSkeleton, EmptyState } from "@/components/loaders";

export default function ForYou() {
  const [source, setSource, sources] = useSelectedSource();
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["foryou", source, page],
    queryFn: () => getList(source, "foryou", { page }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const items = q.data?.items ?? [];

  return (
    <div className="space-y-5">
      <SourcePicker value={source} onChange={(s) => { setSource(s); setPage(1); }} sources={sources} />
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">For You</h2>
      </div>

      {q.isLoading ? (
        <GridSkeleton />
      ) : q.isError ? (
        <ErrorMessage message={(q.error as Error)?.message || "Failed to load"} />
      ) : items.length === 0 ? (
        <EmptyState message="No recommendations." />
      ) : (
        <>
          <DramaGrid source={source} items={items} />
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || q.isFetching}
              className="px-4 py-2 rounded-lg bg-card border border-card-border text-sm flex items-center gap-1 disabled:opacity-40 hover-elevate"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-sm text-muted-foreground tabular-nums">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!q.data?.hasMore || q.isFetching}
              className="px-4 py-2 rounded-lg bg-card border border-card-border text-sm flex items-center gap-1 disabled:opacity-40 hover-elevate"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
