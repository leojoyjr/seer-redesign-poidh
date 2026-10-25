import type { ActiveMilestone } from '../data/milestones';

interface SparkPoint {
  x: number;
  y: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function stepPath(points: SparkPoint[]) {
  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M${point.x},${point.y.toFixed(2)}`;
    }

    return `${path}H${point.x}V${point.y.toFixed(2)}`;
  }, '');
}

function ribbonPath(pass: SparkPoint[], fail: SparkPoint[]) {
  const finalIndex = pass.length - 1;
  let path = stepPath(pass);

  path += `L${fail[finalIndex].x},${fail[finalIndex].y.toFixed(2)}`;

  for (let index = finalIndex - 1; index >= 0; index -= 1) {
    path += `V${fail[index].y.toFixed(2)}H${fail[index].x}`;
  }

  return `${path}Z`;
}

export function MiniSpark({ market }: { market: ActiveMilestone }) {
  const pass: SparkPoint[] = [];
  const fail: SparkPoint[] = [];
  const divergence = clamp(market.impact * 1200, -40, 40);
  const pointCount = 17;
  const startX = 16;
  const endX = 296;
  const step = (endX - startX) / (pointCount - 1);

  for (let index = 0; index < pointCount; index += 1) {
    const x = startX + index * step;
    const progress = Math.max(0, (index - 4) / (pointCount - 5));
    const wave =
      Math.sin(index * 1.7 + market.seed) * 8
      + Math.sin(index * 0.63 + market.seed * 0.5) * 4;
    const shared = 144 - wave;
    const separation = divergence * progress;

    pass.push({
      x,
      y: clamp(shared - separation / 2, 40, 232),
    });

    fail.push({
      x,
      y: clamp(shared + separation / 2, 40, 232),
    });
  }

  const lastPass = pass[pass.length - 1];
  const lastFail = fail[fail.length - 1];
  const leadingSide = market.impact >= 0 ? 'pass' : 'fail';

  return (
    <svg
      className="ln-mini-spark"
      viewBox="0 0 384 288"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className="ln-mini-spark__grid">
        {[48, 96, 144, 192, 240].map(y => (
          <line key={`horizontal-${y}`} x1="16" y1={y} x2="368" y2={y} />
        ))}
        {[16, 72, 128, 184, 240, 296].map(x => (
          <line key={`vertical-${x}`} x1={x} y1="24" x2={x} y2="248" />
        ))}
      </g>

      <g className="ln-mini-spark__gap">
        <path
          className={`ln-mini-spark__gap--${leadingSide}`}
          d={ribbonPath(pass, fail)}
        />
      </g>

      <g className="ln-mini-spark__series">
        <path
          className="ln-mini-spark__pass"
          d={stepPath(pass)}
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="ln-mini-spark__fail"
          d={stepPath(fail)}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      </g>

      <circle
        className="ln-mini-spark__point-pass ln-mini-spark__latest"
        cx={lastPass.x}
        cy={lastPass.y}
        r="4"
      />
      <circle
        className="ln-mini-spark__point-fail"
        cx={lastFail.x}
        cy={lastFail.y}
        r="4"
      />
    </svg>
  );
}
