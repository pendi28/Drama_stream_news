import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { searchDramas } from "@/lib/api";
import { DramaGrid } from "@/components/drama-card";
import { SourcePicker, useSelectedSource } from "@/components/source-picker";
import { ErrorMessage, GridSkeleton, EmptyState } from "@/components/loaders";

export default function Search() {
  const [source, setSource, sources] = useSelectedSource();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const q = useQuery({
    enabled: query.length > 0,
    queryKey: ["search", source, query],
    queryFn: () => searchDramas(source, query),
    staleTime: 60_000,
  });

  const items = q.data?.items ?? [];

  return (
    <div className="space-y-5">
      <SourcePicker value={source} onChange={setSource} sources={sources} />

      <div className="relative">
        <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search dramas, titles, keywords..."
          className="w-full h-11 pl-9 pr-4 rounded-full bg-card border border-card-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {!query ? (
        <EmptyState message="Type to search across the selected source." />
      ) : q.isLoading ? (
        <GridSkeleton />
      ) : q.isError ? (
        <ErrorMessage message={(q.error as Error)?.message || "Search failed"} />
      ) : items.length === 0 ? (
        <EmptyState message={`No results for "${query}".`} />
      ) : (
        <DramaGrid source={source} items={items} />
      )}
    </div>
  );
}
