import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";

/**
 * Antimetal-style 3D node network — hero centerpiece.
 *
 * Inspired by the reference: black dots of varied sizes on a light canvas,
 * connected by thin gray lines that constantly re-form as nodes drift in
 * 3D space. One accent ring marks the "active" node.
 */

type Node = {
  id: number;
  // base position in normalized [-1, 1] space (we'll project to 2D w/ depth)
  bx: number;
  by: number;
  bz: number;
  // drift frequencies/phases per axis
  fx: number;
  fy: number;
  fz: number;
  px: number;
  py: number;
  pz: number;
  size: number; // base px
  label: string;
};

const LABELS = [
  "TRANSMON · Q-07 · 99.92% FIDELITY",
  "READOUT RESONATOR · 7.1 GHz",
  "COUPLER · Q-12 ↔ Q-19",
  "ERROR-CORRECTION · SURFACE-17",
  "CRYO-AMP · 15 mK · STABLE",
  "FLUX BIAS · Q-23 · -0.42 Φ₀",
  "MICROWAVE PULSE · 24 ns",
  "QUANTUM BUS · 4-WAY · LOCKED",
];

function makeNodes(count: number): Node[] {
  const rng = mulberry32(7);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    bx: (rng() * 2 - 1) * 0.9,
    by: (rng() * 2 - 1) * 0.9,
    bz: rng() * 2 - 1,
    fx: 0.18 + rng() * 0.35,
    fy: 0.18 + rng() * 0.35,
    fz: 0.15 + rng() * 0.3,
    px: rng() * Math.PI * 2,
    py: rng() * Math.PI * 2,
    pz: rng() * Math.PI * 2,
    size: 2.5 + Math.pow(rng(), 2.2) * 14,
    label: LABELS[i % LABELS.length],
  }));
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function QuantumBurst() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [t, setT] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const nodes = useMemo(() => makeNodes(64), []);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: px, y: py });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const W = 600;
  const H = 600;
  const cx = W / 2;
  const cy = H / 2;
  const R = 260; // projection radius

  // Compute live projected positions
  const projected = nodes.map((n) => {
    const x3 = n.bx + Math.sin(t * n.fx + n.px) * 0.35;
    const y3 = n.by + Math.cos(t * n.fy + n.py) * 0.35;
    const z3 = n.bz + Math.sin(t * n.fz + n.pz) * 0.5;
    // perspective: closer (z high) = larger
    const depth = (z3 + 2) / 4; // 0..1
    const scale = 0.55 + depth * 0.9;
    return {
      n,
      x: cx + x3 * R * (0.85 + depth * 0.3),
      y: cy + y3 * R * (0.85 + depth * 0.3),
      z: z3,
      depth,
      r: n.size * scale,
    };
  });

  // proximity edges (recomputed each frame -> "rearranging" feel)
  const edges: Array<{ a: number; b: number; o: number }> = [];
  const MAX_DIST = 110;
  for (let i = 0; i < projected.length; i++) {
    for (let j = i + 1; j < projected.length; j++) {
      const dx = projected[i].x - projected[j].x;
      const dy = projected[i].y - projected[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < MAX_DIST) {
        edges.push({ a: i, b: j, o: 1 - d / MAX_DIST });
      }
    }
  }

  const hovered = hover !== null ? nodes[hover] : null;
  // pick an "active" node that slowly cycles for the orange ring marker
  const accentIdx = Math.floor(t * 0.4) % nodes.length;

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto w-full max-w-[640px]"
      style={{ aspectRatio: "1 / 1", perspective: "1200px" }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ rotateX: tilt.y * -12, rotateY: tilt.x * 18 }}
        transition={{ type: "spring", stiffness: 60, damping: 18 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-full w-full"
          role="img"
          aria-label="3D quantum chip qubit network — continuously rearranging"
        >
          {/* edges */}
          <g>
            {edges.map((e, i) => {
              const a = projected[e.a];
              const b = projected[e.b];
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#0A0A0A"
                  strokeOpacity={0.18 * e.o}
                  strokeWidth={0.6}
                />
              );
            })}
          </g>

          {/* nodes — black dots, larger when closer (higher z) */}
          {projected.map((p, i) => {
            const active = hover === i;
            return (
              <g
                key={`n-${p.n.id}`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r * (active ? 1.2 : 1)}
                  fill="#0A0A0A"
                  opacity={0.5 + p.depth * 0.5}
                />
                {/* hit target */}
                <circle cx={p.x} cy={p.y} r={Math.max(p.r + 6, 12)} fill="transparent" />
              </g>
            );
          })}

          {/* accent ring marker on cycling node */}
          {projected[accentIdx] && (
            <circle
              cx={projected[accentIdx].x}
              cy={projected[accentIdx].y}
              r={projected[accentIdx].r + 8}
              fill="none"
              stroke="#F26B3A"
              strokeOpacity="0.55"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </motion.div>

      {/* hover label pill */}
      {hovered && (
        <div
          className="pointer-events-none absolute left-1/2 bottom-6 -translate-x-1/2 rounded-full border border-black/15 bg-black/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}
        >
          <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle bg-[#F26B3A]" />
          {hovered.label}
        </div>
      )}
    </div>
  );
}
