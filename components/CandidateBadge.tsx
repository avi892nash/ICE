"use client";

import { CANDIDATE_TYPE_INFO, type CandidateType } from "@/lib/webrtc";

export function CandidateBadge({ type }: { type: CandidateType }) {
  const info = CANDIDATE_TYPE_INFO[type] ?? CANDIDATE_TYPE_INFO.unknown;
  return (
    <span className={`candidate-badge border ${info.color}`}>
      {type}
    </span>
  );
}
