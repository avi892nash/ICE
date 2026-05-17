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
  const topo = scenario.topology;
  const shared = !!topo.natShared && !!topo.a.behind && !!topo.b.behind;

  // --- Layout coordinates (viewBox 800 × 380) ---
  // Top band: servers (y=30)
  // Middle band: internet cloud (y=70–170)
  // Lower-middle band: NAT layer (y=215–265)
  // Bottom band: peers (y=290–370)

  const serverY = 30;
  const stunX = 320;
  const turnX = 400;
  const signalX = 480;

  const cloud = { x: 130, y: 70, w: 540, h: 100 };

  const peerWidth = 130;
  const peerHeight = 80;
  const peerY = 290;
  const peerA = { x: 20, cx: 20 + peerWidth / 2, top: peerY };
  const peerB = { x: 650, cx: 650 + peerWidth / 2, top: peerY };

  // NAT positions
  const natWidth = 100;
  const natHeight = 50;
  const natY = 215;
  // Separate NATs sit between peer and cloud horizontally
  const natA = topo.a.behind && !shared ? { x: 160, cx: 160 + natWidth / 2 } : null;
  const natB = topo.b.behind && !shared ? { x: 540, cx: 540 + natWidth / 2 } : null;
  // Shared NAT sits centered between the two peers
  const natShared = shared ? { x: 350, cx: 400 } : null;

  // Helper: endpoint coords for packet animation
  const endpointXY = (key: "A" | "B" | "stun" | "turn" | "signal") => {
    if (key === "A") return { x: peerA.cx, y: peerY };
    if (key === "B") return { x: peerB.cx, y: peerY };
    if (key === "stun") return { x: stunX, y: serverY };
    if (key === "turn") return { x: turnX, y: serverY };
    return { x: signalX, y: serverY };
  };
  const from = packet ? endpointXY(packet.from) : null;
  const to = packet ? endpointXY(packet.to) : null;

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4 overflow-x-auto">
      <svg
        viewBox="0 0 800 380"
        className="w-full max-w-3xl mx-auto"
        style={{ minWidth: 640 }}
      >
        {/* Internet cloud background */}
        <rect
          x={cloud.x}
          y={cloud.y}
          width={cloud.w}
          height={cloud.h}
          rx={50}
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeDasharray="4 4"
        />
        <text
          x={cloud.x + cloud.w / 2}
          y={cloud.y + cloud.h - 8}
          textAnchor="middle"
          style={{ fontSize: 9, fontWeight: 600 }}
          fill="#94a3b8"
        >
          INTERNET
        </text>

        {/* Servers inside the cloud */}
        <ServerIcon
          x={stunX}
          y={serverY + 80}
          label="STUN"
          color="#3b82f6"
          highlighted={packet?.from === "stun" || packet?.to === "stun"}
        />
        <ServerIcon
          x={turnX}
          y={serverY + 80}
          label="TURN"
          color="#f59e0b"
          highlighted={packet?.from === "turn" || packet?.to === "turn"}
        />
        <ServerIcon
          x={signalX}
          y={serverY + 80}
          label="Signal"
          color="#94a3b8"
          highlighted={packet?.from === "signal" || packet?.to === "signal"}
        />

        {/* Connection lines */}
        {shared ? (
          <>
            {/* Cloud → shared NAT */}
            <line
              x1={400}
              y1={cloud.y + cloud.h}
              x2={400}
              y2={natY}
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            {/* Shared NAT → Peer A (diagonal) */}
            <line
              x1={natShared!.cx - 30}
              y1={natY + natHeight}
              x2={peerA.cx}
              y2={peerY}
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            {/* Shared NAT → Peer B (diagonal) */}
            <line
              x1={natShared!.cx + 30}
              y1={natY + natHeight}
              x2={peerB.cx}
              y2={peerY}
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          </>
        ) : (
          <>
            {/* Side A line */}
            {natA ? (
              <>
                <line
                  x1={natA.cx}
                  y1={cloud.y + cloud.h}
                  x2={natA.cx}
                  y2={natY}
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <line
                  x1={natA.cx}
                  y1={natY + natHeight}
                  x2={peerA.cx}
                  y2={peerY}
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              </>
            ) : (
              <line
                x1={peerA.cx}
                y1={peerY}
                x2={peerA.cx}
                y2={cloud.y + cloud.h}
                stroke="#cbd5e1"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}

            {/* Side B line */}
            {natB ? (
              <>
                <line
                  x1={natB.cx}
                  y1={cloud.y + cloud.h}
                  x2={natB.cx}
                  y2={natY}
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <line
                  x1={natB.cx}
                  y1={natY + natHeight}
                  x2={peerB.cx}
                  y2={peerY}
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              </>
            ) : (
              <line
                x1={peerB.cx}
                y1={peerY}
                x2={peerB.cx}
                y2={cloud.y + cloud.h}
                stroke="#cbd5e1"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}
          </>
        )}

        {/* NAT boxes */}
        {natA && (
          <NatBox
            x={natA.x}
            y={natY}
            width={natWidth}
            height={natHeight}
            label={topo.a.behind!}
            ip={topo.publicA ?? ""}
          />
        )}
        {natB && (
          <NatBox
            x={natB.x}
            y={natY}
            width={natWidth}
            height={natHeight}
            label={topo.b.behind!}
            ip={topo.publicB ?? ""}
          />
        )}
        {natShared && (
          <NatBox
            x={natShared.x}
            y={natY}
            width={natWidth}
            height={natHeight}
            label={topo.a.behind!}
            ip={topo.publicA ?? ""}
            sharedLabel
          />
        )}

        {/* Peers */}
        <PeerBox
          x={peerA.x}
          y={peerY}
          width={peerWidth}
          height={peerHeight}
          label="Alice"
          ip={topo.a.ip}
          candidateCount={state.candidates.filter((c) => c.side === "A").length}
          glow={packet?.from === "A" || packet?.to === "A"}
        />
        <PeerBox
          x={peerB.x}
          y={peerY}
          width={peerWidth}
          height={peerHeight}
          label="Bob"
          ip={topo.b.ip}
          candidateCount={state.candidates.filter((c) => c.side === "B").length}
          glow={packet?.from === "B" || packet?.to === "B"}
        />

        {/* Animated packet */}
        {packet && from && to && (
          <PacketAnimation
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
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
  width = 80,
  height = 50,
  label,
  ip,
  sharedLabel,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  ip: string;
  sharedLabel?: boolean;
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
        width={width}
        height={height}
        rx={4}
        fill="#fff7ed"
        stroke="#fdba74"
      />
      <text
        x={x + width / 2}
        y={y + 17}
        textAnchor="middle"
        style={{ fontSize: 10, fontWeight: 600 }}
        fill="#9a3412"
      >
        {sharedLabel ? "Shared router" : labelText}
      </text>
      <text
        x={x + width / 2}
        y={y + 32}
        textAnchor="middle"
        style={{ fontSize: 9 }}
        fill="#9a3412"
        fontFamily="monospace"
      >
        {ip}
      </text>
      {sharedLabel && (
        <text
          x={x + width / 2}
          y={y + 45}
          textAnchor="middle"
          style={{ fontSize: 8 }}
          fill="#9a3412"
        >
          {labelText}
        </text>
      )}
    </g>
  );
}

function PeerBox({
  x,
  y,
  width = 120,
  height = 70,
  label,
  ip,
  candidateCount,
  glow,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
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
        width={width}
        height={height}
        rx={6}
        fill="white"
        stroke={glow ? "#0284c7" : "#cbd5e1"}
        strokeWidth={glow ? 2 : 1}
      />
      <text
        x={x + width / 2}
        y={y + 22}
        textAnchor="middle"
        style={{ fontSize: 13, fontWeight: 700 }}
        fill="#0f172a"
      >
        {label}
      </text>
      <text
        x={x + width / 2}
        y={y + 42}
        textAnchor="middle"
        style={{ fontSize: 10 }}
        fill="#64748b"
        fontFamily="monospace"
      >
        {ip}
      </text>
      <text
        x={x + width / 2}
        y={y + 62}
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
