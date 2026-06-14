import { motion } from "motion/react";

export function QuantumHero({
  eyebrow,
  headline,
  description,
}: {
  eyebrow: string;
  headline: string;
  description: string;
}) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-border bg-[#FAFAFB] p-8 lg:p-12">
      <QuantumBackdrop />

      <div className="relative z-10 max-w-md">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          {eyebrow}
        </div>
        <h2 className="mt-6 text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[2.5rem]">
          {headline}
        </h2>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="relative z-10 mt-10 flex flex-1 items-start justify-center">
        <ChipBlueprint />
        <FloatingCard className="absolute left-0 top-2" delay={0.1}>
          <div className="flex items-center gap-2 text-[0.6875rem] font-mono uppercase tracking-wider text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" /> prompt
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground">Design a 128-qubit processor</p>
        </FloatingCard>
        <FloatingCard className="absolute right-0 top-12" delay={0.25}>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent-soft)]">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3"
                fill="none"
                stroke="#6D5AF0"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-sm font-medium text-foreground">Architecture Generated</span>
          </div>
        </FloatingCard>
        <FloatingCard className="absolute -bottom-2 right-6" delay={0.4}>
          <div className="text-[0.6875rem] font-mono uppercase tracking-wider text-muted-foreground">
            Fidelity Score
          </div>
          <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
            99.8<span className="text-sm text-muted-foreground">%</span>
          </p>
        </FloatingCard>
      </div>
    </div>
  );
}

function QuantumBackdrop() {
  // deterministic particle positions (avoid SSR/CSR mismatch)
  const particles = Array.from({ length: 26 }, (_, i) => {
    const x = (i * 53) % 100;
    const y = (i * 79) % 100;
    const size = 1.2 + ((i * 13) % 22) / 10;
    const delay = (i % 9) * 0.35;
    const duration = 6 + ((i * 7) % 9);
    const drift = ((i * 17) % 30) - 15;
    return { x, y, size, delay, duration, drift, i };
  });

  const orbits = [
    { cx: 30, cy: 35, r: 90, dur: 28, dir: 1 },
    { cx: 70, cy: 60, r: 140, dur: 42, dir: -1 },
    { cx: 50, cy: 50, r: 200, dur: 60, dir: 1 },
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* subtle gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, rgba(109,90,240,0.16), transparent 55%), radial-gradient(100% 80% at 0% 100%, rgba(139,122,247,0.12), transparent 55%), linear-gradient(180deg, #FFFFFF 0%, #F7F6FB 100%)",
        }}
      />

      {/* grid */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.45]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="qgrid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path
              d="M36 0H0V36"
              fill="none"
              stroke="#0A0A0A"
              strokeOpacity="0.08"
              strokeWidth="0.5"
            />
          </pattern>
          <radialGradient id="qmask" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#000" stopOpacity="1" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <mask id="qgridMask">
            <rect width="100%" height="100%" fill="url(#qmask)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#qgrid)" mask="url(#qgridMask)" />
      </svg>

      {/* slow drifting orbital rings */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
      >
        {orbits.map((o, idx) => (
          <motion.g
            key={idx}
            style={{ transformOrigin: `${o.cx}% ${o.cy}%` }}
            animate={{ rotate: o.dir * 360 }}
            transition={{ duration: o.dur, repeat: Infinity, ease: "linear" }}
          >
            <ellipse
              cx={`${o.cx}%`}
              cy={`${o.cy}%`}
              rx={o.r}
              ry={o.r * 0.55}
              fill="none"
              stroke="#6D5AF0"
              strokeOpacity={0.18}
              strokeWidth="0.6"
              strokeDasharray="2 6"
            />
            <circle cx={`${o.cx}%`} cy={`${o.cy - (o.r * 0.55) / 4}%`} r="2.4" fill="#6D5AF0" />
          </motion.g>
        ))}
      </svg>

      {/* floating quantum particles */}
      {particles.map((p) => (
        <motion.span
          key={p.i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.i % 5 === 0 ? "#6D5AF0" : p.i % 3 === 0 ? "#8B7AF7" : "#0A0A0A",
            opacity: p.i % 5 === 0 ? 0.9 : 0.35,
            boxShadow: p.i % 5 === 0 ? "0 0 12px rgba(109,90,240,0.6)" : undefined,
          }}
          animate={{
            y: [0, p.drift, 0],
            opacity: [0.2, p.i % 5 === 0 ? 0.95 : 0.55, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* glowing pulse blobs */}
      <motion.div
        className="absolute -top-20 right-[-10%] h-72 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(109,90,240,0.35), transparent)" }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 -left-10 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(139,122,247,0.28), transparent)" }}
        animate={{ opacity: [0.4, 0.75, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* entanglement beams */}
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <motion.line
          x1="10"
          y1="20"
          x2="90"
          y2="80"
          stroke="url(#beam1)"
          strokeWidth="0.2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 0.7, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.line
          x1="90"
          y1="15"
          x2="15"
          y2="85"
          stroke="url(#beam2)"
          strokeWidth="0.2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 0.6, 0] }}
          transition={{ duration: 6, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="beam1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6D5AF0" stopOpacity="0" />
            <stop offset="50%" stopColor="#6D5AF0" stopOpacity="1" />
            <stop offset="100%" stopColor="#6D5AF0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B7AF7" stopOpacity="0" />
            <stop offset="50%" stopColor="#8B7AF7" stopOpacity="1" />
            <stop offset="100%" stopColor="#8B7AF7" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function FloatingCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={`pointer-events-none rounded-xl border border-border bg-card/90 px-3.5 py-2.5 backdrop-blur ${className ?? ""}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </motion.div>
  );
}

function ChipBlueprint() {
  const cells = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => ({ r, c })),
  ).flat();

  return (
    <svg
      viewBox="0 0 320 240"
      className="relative h-[260px] w-full max-w-[420px]"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="40"
        y="30"
        width="240"
        height="180"
        rx="18"
        fill="white"
        stroke="#0A0A0A"
        strokeOpacity="0.5"
      />
      <rect x="60" y="50" width="200" height="140" rx="10" fill="#FAFAFA" stroke="#E5E7EB" />
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={i}>
          <rect x={64 + i * 24} y="22" width="10" height="10" rx="2" fill="#E5E7EB" />
          <rect x={64 + i * 24} y="208" width="10" height="10" rx="2" fill="#E5E7EB" />
        </g>
      ))}
      <motion.path
        d="M70 70 H130 V120 H190 V90 H250"
        stroke="#0A0A0A"
        strokeOpacity="0.7"
        strokeWidth="1.2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
      <motion.path
        d="M70 170 H110 V140 H170 V170 H250"
        stroke="#0A0A0A"
        strokeOpacity="0.4"
        strokeWidth="1"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, delay: 0.3, ease: "easeInOut" }}
      />
      {cells.map(({ r, c }, i) => {
        const cx = 80 + c * 32;
        const cy = 70 + r * 20;
        return (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={2.4}
            fill={i % 7 === 0 ? "#6D5AF0" : i % 5 === 0 ? "#8B7AF7" : "#0A0A0A"}
            fillOpacity={i % 7 === 0 || i % 5 === 0 ? 1 : 0.35}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: (i % 8) * 0.18,
              ease: "easeInOut",
            }}
          />
        );
      })}
      <rect x="142" y="108" width="36" height="24" rx="4" fill="white" stroke="#0A0A0A" />
      <text
        x="160"
        y="123"
        textAnchor="middle"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
        fill="#0A0A0A"
      >
        QPU
      </text>
    </svg>
  );
}
