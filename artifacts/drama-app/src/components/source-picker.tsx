import { useEffect, useState } from "react";
import { getSources, type Source } from "@/lib/api";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "drama-stream:source";
const DEFAULT_SOURCE = "melolo";

export function useSelectedSource(): [string, (s: string) => void, Source[]] {
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_SOURCE;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_SOURCE;
  });

  useEffect(() => {
    let cancelled = false;
    getSources()
      .then((list) => {
        if (cancelled) return;
        setSources(list);
        if (list.length === 0) return;
        const ids = new Set(list.map((s) => s.id));
        if (!ids.has(selected)) {
          const next = ids.has(DEFAULT_SOURCE) ? DEFAULT_SOURCE : list[0]!.id;
          setSelected(next);
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const update = (s: string) => {
    setSelected(s);
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {}
  };

  return [selected, update, sources];
}

export function SourcePicker({
  value,
  onChange,
  sources,
}: {
  value: string;
  onChange: (s: string) => void;
  sources: Source[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
      {sources.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            value === s.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover-elevate",
          )}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}
