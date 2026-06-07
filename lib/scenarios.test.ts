import { describe, it, expect } from "vitest";
import { SCENARIOS, type Scenario } from "./scenarios";

const OUTCOMES = new Set<Scenario["outcome"]>([
  "direct-host",
  "direct-srflx",
  "relay",
  "failed",
]);

// Type preference ranking from RFC 8445 §5.1.2.1 (higher = preferred). Used to
// assert the precomputed `priority` values in the scenario data stay ordered.
const TYPE_RANK: Record<string, number> = {
  host: 126,
  prflx: 110,
  srflx: 100,
  relay: 0,
};

describe("SCENARIOS", () => {
  it("ships a non-empty list with unique ids", () => {
    expect(SCENARIOS.length).toBeGreaterThan(0);
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SCENARIOS)("$id: declares a known outcome", (scenario) => {
    expect(OUTCOMES.has(scenario.outcome)).toBe(true);
  });

  it.each(SCENARIOS)(
    "$id: starts with a 'start' event and ends with 'done'",
    (scenario) => {
      expect(scenario.events.length).toBeGreaterThan(1);
      expect(scenario.events[0].kind).toBe("start");
      expect(scenario.events[scenario.events.length - 1].kind).toBe("done");
    },
  );

  it.each(SCENARIOS)(
    "$id: every pair references candidates that were added",
    (scenario) => {
      const candidateIds = new Set<string>();
      const pairIds = new Set<string>();

      for (const event of scenario.events) {
        for (const c of event.add ?? []) {
          expect(candidateIds.has(c.id)).toBe(false); // no duplicate ids
          candidateIds.add(c.id);
        }
        for (const p of event.pair ?? []) {
          pairIds.add(p.id);
          expect(candidateIds.has(p.localId)).toBe(true);
          expect(candidateIds.has(p.remoteId)).toBe(true);
        }
      }

      // Every pairUpdate must target a pair that was actually declared.
      for (const event of scenario.events) {
        for (const u of event.pairUpdate ?? []) {
          expect(pairIds.has(u.id)).toBe(true);
        }
      }

      // The selected pair (when set) must be a real, declared pair.
      for (const event of scenario.events) {
        if (event.selectedPairId != null) {
          expect(pairIds.has(event.selectedPairId)).toBe(true);
        }
      }
    },
  );

  it.each(SCENARIOS)(
    "$id: candidate priorities respect ICE type preference",
    (scenario) => {
      const byType = new Map<string, number>();
      for (const event of scenario.events) {
        for (const c of event.add ?? []) {
          byType.set(c.type, c.priority);
        }
      }
      // For every ordered pair of types present, the higher-ranked type must
      // carry the higher precomputed priority.
      const types = [...byType.keys()];
      for (const a of types) {
        for (const b of types) {
          if (TYPE_RANK[a] > TYPE_RANK[b]) {
            expect(byType.get(a)!).toBeGreaterThan(byType.get(b)!);
          }
        }
      }
    },
  );

  it.each(SCENARIOS)(
    "$id: a 'relay' outcome actually nominates a relay-backed pair",
    (scenario) => {
      if (scenario.outcome !== "relay") return;
      const relayCandidateIds = new Set<string>();
      const pairsById = new Map<string, { localId: string; remoteId: string }>();
      for (const event of scenario.events) {
        for (const c of event.add ?? []) {
          if (c.type === "relay") relayCandidateIds.add(c.id);
        }
        for (const p of event.pair ?? []) {
          pairsById.set(p.id, { localId: p.localId, remoteId: p.remoteId });
        }
      }
      const selectedId = scenario.events
        .map((e) => e.selectedPairId)
        .find((id) => id != null);
      expect(selectedId).toBeTruthy();
      const selected = pairsById.get(selectedId!);
      expect(selected).toBeDefined();
      expect(
        relayCandidateIds.has(selected!.localId) ||
          relayCandidateIds.has(selected!.remoteId),
      ).toBe(true);
    },
  );
});
