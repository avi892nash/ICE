"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SCENARIOS,
  type NatKind,
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
      <ScenarioPickerHeader />
      <ScenarioPicker
        scenarios={SCENARIOS}
        current={scenarioId}
        onPick={resetAndPickScenario}
      />

      <ScenarioSummary scenario={scenario} />

      <EntityLegend />

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

      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2">
          <NetworkDiagram
            scenario={scenario}
            state={state}
            event={currentEvent}
          />
        </div>
        <PacketInspector event={currentEvent} />
      </div>

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

function ScenarioPickerHeader() {
  return (
    <div className="text-xs text-slate-500">
      <strong className="text-slate-700">Why four scenarios?</strong> Same ICE
      algorithm, four different network topologies — pick one to watch how the
      same code produces different outcomes (and different failure modes).
    </div>
  );
}

const SCENARIO_TAGLINES: Record<string, string> = {
  lan: "Best case — both peers on the same Wi-Fi. Host pair wins.",
  cone: "Typical internet call — different networks, friendly NATs. Direct P2P.",
  hairpin: "Same router, no hairpin. Direct paths fail; TURN saves it.",
  symmetric: "CGNAT or strict firewall. STUN's address is useless; TURN required.",
};

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
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
            <div className="font-semibold mb-1">{s.name}</div>
            <div
              className={`text-[10px] mb-1.5 leading-snug ${active ? "text-ice-50" : "text-slate-600"}`}
            >
              {SCENARIO_TAGLINES[s.id] ?? ""}
            </div>
            <div
              className={`text-[10px] ${active ? "text-ice-100" : "text-slate-400"}`}
            >
              Result: {outcomeLabel(s.outcome)}
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

// ============================================================================
// Canvas-based network diagram
// ============================================================================

const LOGICAL_W = 800;
const LOGICAL_H = 380;

type Endpoint = "A" | "B" | "stun" | "turn" | "signal";

interface SceneLayout {
  cloud: { x: number; y: number; w: number; h: number };
  servers: Record<"stun" | "turn" | "signal", { x: number; y: number }>;
  peerA: { x: number; y: number; w: number; h: number; cx: number };
  peerB: { x: number; y: number; w: number; h: number; cx: number };
  natA: { x: number; y: number; w: number; h: number; cx: number } | null;
  natB: { x: number; y: number; w: number; h: number; cx: number } | null;
  natShared: { x: number; y: number; w: number; h: number; cx: number } | null;
  endpoint: (k: Endpoint) => { x: number; y: number };
}

function computeLayout(scenario: Scenario): SceneLayout {
  const topo = scenario.topology;
  const shared = !!topo.natShared && !!topo.a.behind && !!topo.b.behind;

  const cloud = { x: 130, y: 70, w: 540, h: 100 };
  const peerW = 130;
  const peerH = 80;
  const peerY = 290;
  const peerA = { x: 20, y: peerY, w: peerW, h: peerH, cx: 20 + peerW / 2 };
  const peerB = { x: 650, y: peerY, w: peerW, h: peerH, cx: 650 + peerW / 2 };

  const natW = 100;
  const natH = 50;
  const natY = 215;

  const natA =
    topo.a.behind && !shared
      ? { x: 160, y: natY, w: natW, h: natH, cx: 160 + natW / 2 }
      : null;
  const natB =
    topo.b.behind && !shared
      ? { x: 540, y: natY, w: natW, h: natH, cx: 540 + natW / 2 }
      : null;
  const natShared = shared
    ? { x: 350, y: natY, w: natW, h: natH, cx: 400 }
    : null;

  const servers = {
    stun: { x: 320, y: 110 },
    turn: { x: 400, y: 110 },
    signal: { x: 480, y: 110 },
  };

  const endpoint = (k: Endpoint) => {
    if (k === "A") return { x: peerA.cx, y: peerY };
    if (k === "B") return { x: peerB.cx, y: peerY };
    return servers[k];
  };

  return { cloud, servers, peerA, peerB, natA, natB, natShared, endpoint };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function dashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1.5,
  dash: [number, number] = [3, 3],
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, layout: SceneLayout) {
  const { cloud } = layout;
  ctx.save();
  ctx.fillStyle = "#f1f5f9";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  roundRect(ctx, cloud.x, cloud.y, cloud.w, cloud.h, 50);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("INTERNET", cloud.x + cloud.w / 2, cloud.y + cloud.h - 8);
}

function drawServer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string,
  highlighted: boolean,
  pulse: number,
) {
  const w = 56;
  const h = 30;
  const left = x - w / 2;
  const top = y - h / 2;

  if (highlighted) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 + pulse * 6;
  }
  ctx.fillStyle = "white";
  ctx.strokeStyle = highlighted ? color : "#cbd5e1";
  ctx.lineWidth = highlighted ? 2 : 1;
  roundRect(ctx, left, top, w, h, 4);
  ctx.fill();
  ctx.stroke();
  if (highlighted) ctx.restore();

  ctx.fillStyle = highlighted ? color : "#475569";
  ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
}

function natLabelFor(kind: NatKind) {
  return kind === "cone"
    ? "NAT (cone)"
    : kind === "symmetric"
      ? "NAT (symmetric)"
      : "NAT (no hairpin)";
}

function drawNAT(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  kind: NatKind,
  ip: string,
  shared: boolean,
) {
  ctx.fillStyle = "#fff7ed";
  ctx.strokeStyle = "#fdba74";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  roundRect(ctx, box.x, box.y, box.w, box.h, 4);
  ctx.fill();
  ctx.stroke();

  const cx = box.x + box.w / 2;
  ctx.fillStyle = "#9a3412";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(shared ? "Shared router" : natLabelFor(kind), cx, box.y + 14);

  ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(ip, cx, box.y + 29);

  if (shared) {
    ctx.font = "9px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(natLabelFor(kind), cx, box.y + 42);
  }
}

function drawPeer(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  label: string,
  ip: string,
  candidateCount: number,
  glow: boolean,
  pulse: number,
) {
  if (glow) {
    ctx.save();
    ctx.shadowColor = "#0284c7";
    ctx.shadowBlur = 14 + pulse * 8;
  }
  ctx.fillStyle = "white";
  ctx.strokeStyle = glow ? "#0284c7" : "#cbd5e1";
  ctx.lineWidth = glow ? 2 : 1;
  ctx.setLineDash([]);
  roundRect(ctx, box.x, box.y, box.w, box.h, 6);
  ctx.fill();
  ctx.stroke();
  if (glow) ctx.restore();

  const cx = box.x + box.w / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 14px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(label, cx, box.y + 18);

  ctx.fillStyle = "#64748b";
  ctx.font = "11px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(ip, cx, box.y + 38);

  ctx.fillStyle = "#0284c7";
  ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(
    `${candidateCount} candidate${candidateCount === 1 ? "" : "s"}`,
    cx,
    box.y + 58,
  );
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
) {
  const cloudBottom = layout.cloud.y + layout.cloud.h;

  if (layout.natShared) {
    const ns = layout.natShared;
    dashedLine(ctx, 400, cloudBottom, 400, ns.y, "#cbd5e1");
    dashedLine(
      ctx,
      ns.cx - 30,
      ns.y + ns.h,
      layout.peerA.cx,
      layout.peerA.y,
      "#cbd5e1",
    );
    dashedLine(
      ctx,
      ns.cx + 30,
      ns.y + ns.h,
      layout.peerB.cx,
      layout.peerB.y,
      "#cbd5e1",
    );
  } else {
    // Side A
    if (layout.natA) {
      dashedLine(ctx, layout.natA.cx, cloudBottom, layout.natA.cx, layout.natA.y, "#cbd5e1");
      dashedLine(
        ctx,
        layout.natA.cx,
        layout.natA.y + layout.natA.h,
        layout.peerA.cx,
        layout.peerA.y,
        "#cbd5e1",
      );
    } else {
      dashedLine(
        ctx,
        layout.peerA.cx,
        cloudBottom,
        layout.peerA.cx,
        layout.peerA.y,
        "#cbd5e1",
      );
    }
    // Side B
    if (layout.natB) {
      dashedLine(ctx, layout.natB.cx, cloudBottom, layout.natB.cx, layout.natB.y, "#cbd5e1");
      dashedLine(
        ctx,
        layout.natB.cx,
        layout.natB.y + layout.natB.h,
        layout.peerB.cx,
        layout.peerB.y,
        "#cbd5e1",
      );
    } else {
      dashedLine(
        ctx,
        layout.peerB.cx,
        cloudBottom,
        layout.peerB.cx,
        layout.peerB.y,
        "#cbd5e1",
      );
    }
  }
}

function drawPacket(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  label: string,
  t: number,
) {
  // Faded route line
  ctx.save();
  ctx.strokeStyle = "#0284c7";
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();

  // Multiple particles moving along the path
  const period = 1.6; // seconds
  const particleCount = 3;
  for (let i = 0; i < particleCount; i++) {
    const offset = i / particleCount;
    const phase = ((t / period + offset) % 1);
    const px = from.x + (to.x - from.x) * phase;
    const py = from.y + (to.y - from.y) * phase;
    // Fade in/out at endpoints
    const alpha = Math.sin(phase * Math.PI);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "#0284c7";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Label at midpoint with a small background pill for readability
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - 10;
  ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
  const metrics = ctx.measureText(label);
  const padX = 6;
  const padY = 3;
  const tw = metrics.width + padX * 2;
  const th = 14 + padY * 2;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeStyle = "rgba(2, 132, 199, 0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  roundRect(ctx, mx - tw / 2, my - th / 2, tw, th, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0369a1";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, mx, my);
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  scenario: Scenario,
  state: SimState,
  event: SimEvent | undefined,
  t: number,
) {
  const layout = computeLayout(scenario);
  const packet = event?.packet;
  const pulse = (Math.sin(t * 3) + 1) / 2; // 0..1

  // Layers, bottom to top
  drawCloud(ctx, layout);
  drawServer(
    ctx,
    layout.servers.stun.x,
    layout.servers.stun.y,
    "STUN",
    "#3b82f6",
    packet?.from === "stun" || packet?.to === "stun",
    pulse,
  );
  drawServer(
    ctx,
    layout.servers.turn.x,
    layout.servers.turn.y,
    "TURN",
    "#f59e0b",
    packet?.from === "turn" || packet?.to === "turn",
    pulse,
  );
  drawServer(
    ctx,
    layout.servers.signal.x,
    layout.servers.signal.y,
    "Signal",
    "#94a3b8",
    packet?.from === "signal" || packet?.to === "signal",
    pulse,
  );

  drawConnections(ctx, layout);

  const topo = scenario.topology;
  if (layout.natA) drawNAT(ctx, layout.natA, topo.a.behind!, topo.publicA ?? "", false);
  if (layout.natB) drawNAT(ctx, layout.natB, topo.b.behind!, topo.publicB ?? "", false);
  if (layout.natShared)
    drawNAT(ctx, layout.natShared, topo.a.behind!, topo.publicA ?? "", true);

  drawPeer(
    ctx,
    layout.peerA,
    "Alice",
    topo.a.ip,
    state.candidates.filter((c) => c.side === "A").length,
    packet?.from === "A" || packet?.to === "A",
    pulse,
  );
  drawPeer(
    ctx,
    layout.peerB,
    "Bob",
    topo.b.ip,
    state.candidates.filter((c) => c.side === "B").length,
    packet?.from === "B" || packet?.to === "B",
    pulse,
  );

  if (packet) {
    const from = layout.endpoint(packet.from);
    const to = layout.endpoint(packet.to);
    drawPacket(ctx, from, to, packet.label, t);
  }
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef({ scenario, state, event });
  sceneRef.current = { scenario, state, event };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let mounted = true;

    const resizeAndScale = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(1, Math.round(rect.width * dpr));
      const targetH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      const scaleX = (rect.width / LOGICAL_W) * dpr;
      const scaleY = (rect.height / LOGICAL_H) * dpr;
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    };

    const startTs = performance.now();
    const draw = (now: number) => {
      if (!mounted) return;
      resizeAndScale();
      ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
      const t = (now - startTs) / 1000;
      drawScene(
        ctx,
        sceneRef.current.scenario,
        sceneRef.current.state,
        sceneRef.current.event,
        t,
      );
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    const onResize = () => resizeAndScale();
    window.addEventListener("resize", onResize);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4 overflow-x-auto">
      <canvas
        ref={canvasRef}
        className="w-full max-w-3xl mx-auto block"
        style={{ aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}`, minWidth: 640 }}
      />
    </div>
  );
}

function EntityLegend() {
  return (
    <details className="border border-slate-200 rounded-lg bg-white p-3 text-sm">
      <summary className="cursor-pointer font-semibold text-slate-800 hover:text-ice-700">
        What do the boxes mean? (click to expand)
      </summary>
      <div className="grid sm:grid-cols-2 gap-3 mt-3 text-xs text-slate-700">
        <LegendItem
          color="bg-blue-500"
          name="STUN server"
          body="A simple echo service. You send a packet, it tells you what public IP and port it saw — that becomes your srflx candidate. No state, no auth in the basic case. Run by Google, Cloudflare, etc."
        />
        <LegendItem
          color="bg-amber-500"
          name="TURN server"
          body="A relay. When peers can't connect directly, both peers send packets to TURN and it forwards them. Requires auth, costs bandwidth, but works through anything."
        />
        <LegendItem
          color="bg-slate-500"
          name="Signaling server"
          body="App-controlled, NOT part of ICE. Carries the SDP (with candidate lists) between peers — usually a WebSocket. You build this; ICE doesn't define it."
        />
        <LegendItem
          color="bg-orange-300"
          name="NAT (cone)"
          body="Friendly NAT. Once you send out to anyone, anyone can send back to that same mapping. Standard for home routers when working well."
        />
        <LegendItem
          color="bg-orange-300"
          name="NAT (symmetric)"
          body="Strict NAT. Picks a different public port for every destination. STUN's reported address is useless to peers because they'd reach the NAT from a different destination address. TURN required."
        />
        <LegendItem
          color="bg-orange-300"
          name="NAT (no hairpin)"
          body="A NAT that won't bounce a packet sent from inside to its own public IP back into the LAN. Two devices behind the same router can't reach each other via srflx; needs TURN."
        />
        <LegendItem
          color="bg-ice-500"
          name="Peer (Alice / Bob)"
          body="The two browser instances running RTCPeerConnection. Each runs the ICE algorithm independently and arrives at the same selected pair."
        />
      </div>
    </details>
  );
}

function LegendItem({
  color,
  name,
  body,
}: {
  color: string;
  name: string;
  body: string;
}) {
  return (
    <div className="flex gap-2 items-start">
      <div
        className={`w-3 h-3 rounded ${color} mt-0.5 flex-shrink-0`}
        aria-hidden
      />
      <div>
        <div className="font-semibold text-slate-900 text-xs">{name}</div>
        <p className="text-[11px] text-slate-600 leading-snug">{body}</p>
      </div>
    </div>
  );
}

function PacketInspector({ event }: { event: SimEvent | undefined }) {
  const packet = event?.packet;

  if (!packet) {
    return (
      <div className="border border-slate-200 rounded-lg bg-slate-50 p-4 text-xs text-slate-500 lg:sticky lg:top-4 h-fit">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          Packet inspector
        </h3>
        <p>
          No packet is in flight this step. When something animates on the
          canvas, the protocol, addresses, and key fields will show up here.
        </p>
      </div>
    );
  }

  const protocolColor: Record<string, string> = {
    STUN: "bg-blue-100 text-blue-800 border-blue-200",
    TURN: "bg-amber-100 text-amber-800 border-amber-200",
    SDP: "bg-slate-100 text-slate-800 border-slate-200",
    ICE: "bg-purple-100 text-purple-800 border-purple-200",
    DTLS: "bg-emerald-100 text-emerald-800 border-emerald-200",
    SCTP: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  const proto = packet.protocol ?? "ICE";
  const protoClass =
    protocolColor[proto] ?? "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <div className="border border-ice-200 rounded-lg bg-white p-4 lg:sticky lg:top-4 h-fit shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${protoClass}`}
        >
          {proto}
        </span>
        <h3 className="text-sm font-semibold text-slate-900">
          Packet in flight
        </h3>
      </div>

      {packet.protocolDetail && (
        <div className="text-xs font-medium text-slate-800 mb-2">
          {packet.protocolDetail}
        </div>
      )}

      {(packet.fromAddr || packet.toAddr) && (
        <div className="text-[11px] font-mono space-y-0.5 mb-3 bg-slate-50 border border-slate-200 rounded p-2">
          {packet.fromAddr && (
            <div>
              <span className="text-slate-500">from </span>
              <span className="text-slate-800">{packet.fromAddr}</span>
            </div>
          )}
          {packet.toAddr && (
            <div>
              <span className="text-slate-500">to&nbsp;&nbsp; </span>
              <span className="text-slate-800">{packet.toAddr}</span>
            </div>
          )}
        </div>
      )}

      {packet.fields && packet.fields.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
            Key fields
          </div>
          <dl className="space-y-1.5">
            {packet.fields.map((f, i) => (
              <div key={i} className="text-[11px]">
                <dt className="font-mono text-slate-600">{f.name}</dt>
                <dd className="font-mono text-slate-900 ml-3 break-all">
                  {f.value}
                </dd>
                {f.hint && (
                  <dd className="ml-3 text-[10px] text-slate-500 italic">
                    {f.hint}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </div>
      )}

      {packet.purpose && (
        <div className="border-t border-slate-100 pt-2">
          <div className="text-[10px] uppercase tracking-wide text-ice-700 font-semibold mb-1">
            What this does
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            {packet.purpose}
          </p>
        </div>
      )}
    </div>
  );
}

function PairStateLegend() {
  const states: { state: SimPair["state"]; desc: string }[] = [
    {
      state: "frozen",
      desc: "Waiting for a higher-priority pair on the same network interface to finish first.",
    },
    {
      state: "waiting",
      desc: "Queued. Will be checked on the next pacing tick (Ta, ~50ms).",
    },
    {
      state: "in-progress",
      desc: "STUN binding request sent, waiting for response.",
    },
    {
      state: "succeeded",
      desc: "Response received. Pair is usable; eligible for nomination.",
    },
    {
      state: "failed",
      desc: "No response after retries, or the pair was pruned (e.g. unroutable).",
    },
  ];
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer text-slate-500 hover:text-slate-900">
        What do the pair states mean?
      </summary>
      <ul className="mt-2 space-y-1.5">
        {states.map((s) => (
          <li key={s.state} className="flex items-start gap-2">
            <PairStateBadge state={s.state} />
            <span className="text-slate-600">{s.desc}</span>
          </li>
        ))}
      </ul>
    </details>
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
      <PairStateLegend />
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
