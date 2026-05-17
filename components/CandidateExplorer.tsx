"use client";

import { useState } from "react";
import {
  CANDIDATE_TYPE_INFO,
  createPeerConnection,
  parseCandidate,
  PUBLIC_STUN_SERVERS,
  type ParsedCandidate,
} from "@/lib/webrtc";
import { CandidateBadge } from "./CandidateBadge";

export function CandidateExplorer() {
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  async function gather() {
    setBusy(true);
    setError(null);
    setCandidates([]);
    setElapsedMs(null);
    const start = performance.now();

    const pc = createPeerConnection(PUBLIC_STUN_SERVERS);
    const found: ParsedCandidate[] = [];

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const parsed = parseCandidate(e.candidate.candidate);
        found.push(parsed);
        setCandidates([...found]);
      }
    };

    try {
      // A data channel is needed to trigger ICE gathering with a real m-section.
      pc.createDataChannel("probe");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>((resolve) => {
        const onChange = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", onChange);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", onChange);
        setTimeout(() => {
          pc.removeEventListener("icegatheringstatechange", onChange);
          resolve();
        }, 6000);
      });

      setElapsedMs(Math.round(performance.now() - start));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      pc.close();
      setBusy(false);
    }
  }

  const byType = candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={gather}
          disabled={busy}
          className="px-4 py-2 bg-ice-600 text-white text-sm rounded-md hover:bg-ice-700 disabled:opacity-50"
        >
          {busy ? "Gathering..." : "Gather candidates"}
        </button>
        {elapsedMs !== null && (
          <span className="text-xs text-slate-500">
            Completed in {elapsedMs} ms
          </span>
        )}
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>

      {candidates.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byType).map(([type, n]) => (
              <div
                key={type}
                className="text-xs px-2 py-1 rounded-md border border-slate-200 bg-white"
              >
                <CandidateBadge type={type as any} /> ×{n}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {candidates.map((c, i) => (
              <CandidateCard key={i} c={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CandidateCard({ c }: { c: ParsedCandidate }) {
  const info = CANDIDATE_TYPE_INFO[c.type] ?? CANDIDATE_TYPE_INFO.unknown;

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CandidateBadge type={c.type} />
            <span className="font-mono text-sm text-slate-800">
              {c.address}:{c.port}
            </span>
            <span className="text-[10px] uppercase text-slate-500 font-mono">
              {c.protocol}
            </span>
          </div>
          <p className="text-xs text-slate-600">{info.description}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-3">
        <Field label="Foundation" value={c.foundation} />
        <Field label="Component" value={c.component} />
        <Field label="Priority" value={c.priority} />
        {c.relatedAddress && (
          <Field
            label="Related (raddr:rport)"
            value={`${c.relatedAddress}:${c.relatedPort}`}
          />
        )}
      </dl>

      <details className="mt-3">
        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-900">
          Raw SDP
        </summary>
        <pre className="mt-2 code-block">{c.raw}</pre>
      </details>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="font-mono text-slate-800">{value}</dd>
    </div>
  );
}
