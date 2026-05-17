"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SCENARIOS,
  type Scenario,
  type SimCandidate,
  type SimEvent,
  type SimPair,
  type Side,
} from "@/lib/scenarios";
import { CandidateBadge } from "./CandidateBadge";

interface SimState {
  candidates: SimCandidate[];
  pairs: SimPair[];
  selectedPairId: string | null;
}

const EMPTY_STATE: SimState = {
  candidates: [],
  pairs: [],
  selectedPairId: null,
};

const STEP_DURATIONS = { slow: 3000, normal: 1500, fast: 700 } as const;
type Speed = keyof typeof STEP_DURATIONS;

function applyEvent(state: SimState, e: SimEvent): SimState {
  let next: SimState = { ...state };
  if (e.add) next.candidates = [...next.candidates, ...e.add];
  if (e.pair) next.pairs = [...next.pairs, ...e.pair];
  if (e.pairUpdate) {
    const updates = new Map(e.pairUpdate.map((u) => [u.id, u]));
    next.pairs = next.pairs.map((p) => {
      const u = updates.get(p.id);
      if (!u) return p;
      return {
        ...p,
        state: u.state,
        nominated: u.nominated ?? p.nominated,
      };
    });
  }
  if (e.selectedPairId !== undefined) {
    next.selectedPairId = e.selectedPairId;
  }
  return next;
}

function computeStateAt(scenario: Scenario, index: number): SimState {
  let state = EMPTY_STATE;
  for (let i = 0; i <= index && i < scenario.events.length; i++) {
    state = applyEvent(state, scenario.events[i]);
  }
  return state;
}

export function IceSimulator() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId],
  );

  const state = useMemo(
    () => computeStateAt(scenario, stepIndex),
    [scenario, stepIndex],
  );
  const currentEvent = scenario.events[stepIndex];
  const atEnd = stepIndex >= scenario.events.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const t = setTimeout(
      () => setStepIndex((i) => Math.min(i + 1, scenario.events.length - 1)),
      STEP_DURATIONS[speed],
    );
    return () => clearTimeout(t);
  }, [playing, stepIndex, speed, atEnd, scenario.events.length]);

  function resetAndPickScenario(id: string) {
    setScenarioId(id);
    setStepIndex(0);
    setPlaying(false);
  }

  return (
    <div className="space-y-5">
      <ScenarioPicker
        scenarios={SCENARIOS}
        current={scenarioId}
        onPick={resetAndPickScenario}
      />

      <ScenarioSummary scenario={scenario} />

      <Controls
        playing={playing}
        setPlaying={setPlaying}
        stepIndex={stepIndex}
        setStepIndex={setStepIndex}
        total={scenario.events.length}
        speed={speed}
        setSpeed={setSpeed}
        atEnd={atEnd}
        onReset={() => {
          setStepIndex(0);
          setPlaying(false);
        }}
      />

      <NetworkDiagram
        scenario={scenario}
        state={state}
        event={currentEvent}
      />

      <CurrentStepCard
        event={currentEvent}
        index={stepIndex}
        total={scenario.events.length}
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <CandidatesPanel state={state} />
        <PairsPanel state={state} />
      </div>
    </div>
  );
}

function ScenarioPicker({
  scenarios,
  current,
  onPick,
}: {
  scenarios: Scenario[];
  current: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {scenarios.map((s) => {
        const active = s.id === current;
        return (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className={`text-left text-xs border rounded-md p-3 transition ${
              active
                ? "bg-ice-600 text-white border-ice-600"
                : "bg-white border-slate-200 hover:border-ice-400 text-slate-700"
            }`}
          >
            <div className="font-semibold mb-0.5">{s.name}</div>
            <div
              className={`text-[10px] ${active ? "text-ice-100" : "text-slate-500"}`}
            >
              Outcome: {outcomeLabel(s.outcome)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function outcomeLabel(o: Scenario["outcome"]) {
  return o === "direct-host"
    ? "direct via host"
    : o === "direct-srflx"
      ? "direct via srflx"
      : o === "relay"
        ? "relayed via TURN"
        : "failed";
}

function ScenarioSummary({ scenario }: { scenario: Scenario }) {
  return (
    <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 text-sm text-slate-700">
      {scenario.summary}
    </div>
  );
}

function Controls({
  playing,
  setPlaying,
  stepIndex,
  setStepIndex,
  total,
  speed,
  setSpeed,
  atEnd,
  onReset,
}: {
  playing: boolean;
  setPlaying: (v: boolean) => void;
  stepIndex: number;
  setStepIndex: (n: number) => void;
  total: number;
  speed: Speed;
  setSpeed: (s: Speed) => void;
  atEnd: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border border-slate-200 rounded-lg p-3 bg-white">
      <button
        onClick={() => {
          if (atEnd) {
            onReset();
            setPlaying(true);
          } else {
            setPlaying(!playing);
          }
        }}
        className="px-3 py-1.5 text-sm rounded-md bg-ice-600 text-white hover:bg-ice-700"
      >
        {atEnd ? "↻ Replay" : playing ? "❚❚ Pause" : "▶ Play"}
      </button>
      <button
        onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
        disabled={stepIndex === 0}
        className="px-2 py-1.5 text-sm rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
      >
        ◀ Prev
      </button>
      <button
        onClick={() => setStepIndex(Math.min(total - 1, stepIndex + 1))}
        disabled={atEnd}
        className="px-2 py-1.5 text-sm rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
      >
        Next ▶
      </button>
      <button
        onClick={onReset}
        className="px-2 py-1.5 text-sm rounded-md border border-slate-200 hover:bg-slate-50"
      >
        ↺ Reset
      </button>

      <div className="flex items-center gap-1 ml-2 text-xs">
        <span className="text-slate-500">Speed</span>
        {(["slow", "normal", "fast"] as Speed[]).map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-0.5 rounded ${
              speed === s
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="ml-auto text-xs text-slate-500 font-mono">
        Step {stepIndex + 1} / {total}
      </div>

      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-ice-500 transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function NetworkDiagram({
  scenario,
  state,
  event,
}: {
  scenario: Scenario;
  state: SimState;
  event: SimEvent | undefined;
}) {
  const packet = event?.packet;

  // Map endpoints to x-coordinates for the packet path
  const x = {
    A: 80,
    B: 720,
    stun: 400,
    turn: 400,
    signal: 400,
  };
  const y = {
    A: 180,
    B: 180,
    stun: 60,
    turn: 60,
    signal: 60,
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4 overflow-x-auto">
      <svg
        viewBox="0 0 800 280"
        className="w-full max-w-3xl mx-auto"
        style={{ minWidth: 600 }}
      >
        {/* Internet cloud background */}
        <rect
          x="160"
          y="90"
          width="480"
          height="120"
          rx="60"
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeDasharray="4 4"
        />
        <text
          x="400"
          y="105"
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: 9 }}
        >
          INTERNET
        </text>

        {/* STUN server */}
        <ServerIcon
          x={330}
          y={40}
          label="STUN"
          color="#3b82f6"
          highlighted={packet?.from === "stun" || packet?.to === "stun"}
        />
        {/* TURN server */}
        <ServerIcon
          x={400}
          y={40}
          label="TURN"
          color="#f59e0b"
          highlighted={packet?.from === "turn" || packet?.to === "turn"}
        />
        {/* Signaling server */}
        <ServerIcon
          x={470}
          y={40}
          label="Signal"
          color="#94a3b8"
          highlighted={packet?.from === "signal" || packet?.to === "signal"}
        />

        {/* NAT boxes (if applicable) */}
        {scenario.topology.a.behind && (
          <NatBox
            x={160}
            y={150}
            label={scenario.topology.a.behind}
            ip={scenario.topology.publicA ?? ""}
          />
        )}
        {scenario.topology.b.behind && (
          <NatBox
            x={560}
            y={150}
            label={scenario.topology.b.behind}
            ip={scenario.topology.publicB ?? ""}
          />
        )}

        {/* Peer A */}
        <PeerBox
          x={20}
          y={140}
          label="Alice"
          ip={scenario.topology.a.ip}
          candidateCount={state.candidates.filter((c) => c.side === "A").length}
          glow={packet?.from === "A" || packet?.to === "A"}
        />
        {/* Peer B */}
        <PeerBox
          x={660}
          y={140}
          label="Bob"
          ip={scenario.topology.b.ip}
          candidateCount={state.candidates.filter((c) => c.side === "B").length}
          glow={packet?.from === "B" || packet?.to === "B"}
        />

        {/* Animated packet */}
        {packet && (
          <PacketAnimation
            x1={x[packet.from]}
            y1={y[packet.from]}
            x2={x[packet.to]}
            y2={y[packet.to]}
            label={packet.label}
          />
        )}
      </svg>
    </div>
  );
}

function ServerIcon({
  x,
  y,
  label,
  color,
  highlighted,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  highlighted: boolean;
}) {
  return (
    <g>
      <rect
        x={x - 24}
        y={y - 14}
        width={48}
        height={28}
        rx={4}
        fill="white"
        stroke={highlighted ? color : "#cbd5e1"}
        strokeWidth={highlighted ? 2 : 1}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        style={{ fontSize: 10, fontWeight: 600 }}
        fill={highlighted ? color : "#475569"}
      >
        {label}
      </text>
    </g>
  );
}

function NatBox({
  x,
  y,
  label,
  ip,
}: {
  x: number;
  y: number;
  label: string;
  ip: string;
}) {
  const labelText =
    label === "cone"
      ? "NAT (cone)"
      : label === "symmetric"
        ? "NAT (symmetric)"
        : "NAT (no hairpin)";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={80}
        height={50}
        rx={4}
        fill="#fff7ed"
        stroke="#fdba74"
      />
      <text
        x={x + 40}
        y={y + 18}
        textAnchor="middle"
        style={{ fontSize: 9, fontWeight: 600 }}
        fill="#9a3412"
      >
        {labelText}
      </text>
      <text
        x={x + 40}
        y={y + 36}
        textAnchor="middle"
        style={{ fontSize: 9 }}
        fill="#9a3412"
        fontFamily="monospace"
      >
        {ip}
      </text>
    </g>
  );
}

function PeerBox({
  x,
  y,
  label,
  ip,
  candidateCount,
  glow,
}: {
  x: number;
  y: number;
  label: string;
  ip: string;
  candidateCount: number;
  glow: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={120}
        height={70}
        rx={6}
        fill="white"
        stroke={glow ? "#0284c7" : "#cbd5e1"}
        strokeWidth={glow ? 2 : 1}
      />
      <text
        x={x + 60}
        y={y + 20}
        textAnchor="middle"
        style={{ fontSize: 12, fontWeight: 700 }}
        fill="#0f172a"
      >
        {label}
      </text>
      <text
        x={x + 60}
        y={y + 38}
        textAnchor="middle"
        style={{ fontSize: 10 }}
        fill="#64748b"
        fontFamily="monospace"
      >
        {ip}
      </text>
      <text
        x={x + 60}
        y={y + 56}
        textAnchor="middle"
        style={{ fontSize: 9 }}
        fill="#0284c7"
      >
        {candidateCount} candidate{candidateCount === 1 ? "" : "s"}
      </text>
    </g>
  );
}

function PacketAnimation({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#0284c7"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.4}
      />
      <circle r={4} fill="#0284c7">
        <animateMotion
          dur="1.4s"
          repeatCount="indefinite"
          path={`M ${x1} ${y1} L ${x2} ${y2}`}
        />
      </circle>
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2 - 6}
        textAnchor="middle"
        style={{ fontSize: 9, fontWeight: 600 }}
        fill="#0369a1"
      >
        {label}
      </text>
    </g>
  );
}

function CurrentStepCard({
  event,
  index,
  total,
}: {
  event: SimEvent | undefined;
  index: number;
  total: number;
}) {
  if (!event) return null;
  return (
    <div className="border-l-4 border-ice-500 bg-ice-50/60 rounded-r-md p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wide font-bold text-ice-700">
          {event.kind}
        </span>
        <span className="text-[10px] text-slate-500">
          Step {index + 1} of {total}
        </span>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        {event.title}
      </h3>
      {event.body && (
        <p className="text-sm text-slate-700 leading-relaxed">{event.body}</p>
      )}
    </div>
  );
}

function CandidatesPanel({ state }: { state: SimState }) {
  const byside = (side: Side) =>
    state.candidates.filter((c) => c.side === side);
  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Gathered candidates
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <PeerCandidates label="Alice" cs={byside("A")} />
        <PeerCandidates label="Bob" cs={byside("B")} />
      </div>
    </div>
  );
}

function PeerCandidates({
  label,
  cs,
}: {
  label: string;
  cs: SimCandidate[];
}) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      {cs.length === 0 ? (
        <div className="text-[10px] text-slate-400 italic">none yet</div>
      ) : (
        <ul className="space-y-1">
          {cs.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-1.5 text-[11px] font-mono"
            >
              <CandidateBadge type={c.type} />
              <span className="text-slate-700">{c.address}</span>
              <span className="text-slate-400">:{c.port}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PairsPanel({ state }: { state: SimState }) {
  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Candidate pairs
      </h3>
      {state.pairs.length === 0 ? (
        <div className="text-[11px] text-slate-400 italic">
          Pairs are formed after signaling.
        </div>
      ) : (
        <table className="w-full text-[11px]">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left font-medium pb-1">Pair</th>
              <th className="text-left font-medium pb-1">Priority</th>
              <th className="text-left font-medium pb-1">State</th>
              <th className="text-left font-medium pb-1">Nominated</th>
            </tr>
          </thead>
          <tbody>
            {[...state.pairs]
              .sort((a, b) => b.priority - a.priority)
              .map((p) => {
                const local = state.candidates.find((c) => c.id === p.localId);
                const remote = state.candidates.find(
                  (c) => c.id === p.remoteId,
                );
                const isSelected = state.selectedPairId === p.id;
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-slate-100 ${
                      isSelected ? "bg-emerald-50" : ""
                    }`}
                  >
                    <td className="py-1 pr-2 font-mono whitespace-nowrap">
                      {local?.type ?? "?"} ↔ {remote?.type ?? "?"}
                    </td>
                    <td className="py-1 pr-2 font-mono text-slate-500">
                      {p.priority}
                    </td>
                    <td className="py-1 pr-2">
                      <PairStateBadge state={p.state} />
                    </td>
                    <td className="py-1 pr-2">
                      {p.nominated ? (
                        <span className="text-emerald-700 font-semibold">
                          ✓
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PairStateBadge({ state }: { state: SimPair["state"] }) {
  const map: Record<SimPair["state"], string> = {
    frozen: "bg-slate-100 text-slate-700 border-slate-200",
    waiting: "bg-blue-100 text-blue-700 border-blue-200",
    "in-progress": "bg-amber-100 text-amber-800 border-amber-200",
    succeeded: "bg-emerald-100 text-emerald-800 border-emerald-200",
    failed: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] border font-medium ${map[state]}`}
    >
      {state}
    </span>
  );
}
