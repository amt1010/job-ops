import { Search, Sparkles, FileDown } from "lucide-react";
import { cn } from "@/lib/cn";

const STEPS = [
  { n: 1, label: "Scan jobs", icon: Search },
  { n: 2, label: "Evaluate & match", icon: Sparkles },
  { n: 3, label: "Generate CV", icon: FileDown },
] as const;

// Presentational only: shows the scan → evaluate → CV pipeline so the three
// destinations read as one flow. `active` highlights the current step.
export function PipelineSteps({ active }: { active: 1 | 2 | 3 }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const on = s.n <= active;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
                on ? "border-brand/30 bg-brand-soft text-brand" : "border-border text-faint",
              )}
            >
              <Icon className="size-3.5" /> {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-faint">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
