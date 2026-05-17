"use client";

import { parseCandidate, type ParsedCandidate } from "@/lib/webrtc";
import { CandidateBadge } from "./CandidateBadge";

export function CandidateList({ candidates }: { candidates: string[] }) {
  if (candidates.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic py-3 text-center border border-dashed border-slate-300 rounded-md">
        No candidates yet
      </div>
    );
  }

  const parsed: ParsedCandidate[] = candidates.map(parseCandidate);

  return (
    <div className="space-y-1.5">
      {parsed.map((c, i) => (
        <div
          key={i}
          className="flex items-center gap-2 text-xs font-mono bg-white border border-slate-200 rounded px-2 py-1.5"
        >
          <CandidateBadge type={c.type} />
          <span className="text-slate-700">{c.address}</span>
          <span className="text-slate-400">:{c.port}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 uppercase text-[10px]">
            {c.protocol}
          </span>
          <span className="ml-auto text-slate-400 text-[10px]">
            prio {c.priority}
          </span>
        </div>
      ))}
    </div>
  );
}
