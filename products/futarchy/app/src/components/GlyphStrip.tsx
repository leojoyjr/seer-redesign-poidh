import { Tooltip } from './Tooltip';
import {
  IconFork,
  IconGapBracket,
  IconVerdictNeedle,
} from './icons';

const steps = [
  {
    label: 'PASS / FAIL',
    kind: 'pass',
    explanation:
      'PASS forecasts the token price if the proposal passes. FAIL forecasts it if the proposal fails.',
  },
  {
    label: 'GAP',
    kind: 'gap',
    explanation:
      'GAP is the percentage difference between the PASS and FAIL forecasts.',
  },
  {
    label: 'Verdict',
    kind: 'verdict',
    explanation:
      'Above +1% is Include, below -1% is Exclude, and the range between is Neutral.',
  },
] as const;

export function GlyphStrip() {
  return (
    <div className="f6-key glyph-strip" aria-label="How it resolves">
      <span className="f6-key__lead">How to read:</span>

      {steps.map(step => (
        <Tooltip key={step.label} text={step.explanation}>
          <div
            className={`f6-key__item f6-key__item--${step.kind}`}
            tabIndex={0}
          >
            <span className="f6-key__icon" aria-hidden="true">
              {step.kind === 'pass' && <IconFork />}
              {step.kind === 'gap' && <IconGapBracket />}
              {step.kind === 'verdict' && (
                <IconVerdictNeedle />
              )}
            </span>
            <span>{step.label}</span>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
