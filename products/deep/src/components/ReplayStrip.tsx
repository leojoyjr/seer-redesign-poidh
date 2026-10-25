import { Icon } from './Icon';
import { envelope } from '../data/envelope';
import { START, END } from '../data/series';

export type ReplayControls = {
  t: number;
  playing: boolean;
  togglePlay: () => void;
  scrub: (t: number) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  loop: boolean;
  setLoop: (loop: boolean) => void;
};

export function ReplayStrip({ t, playing, togglePlay, scrub, speed, setSpeed, loop, setLoop }: ReplayControls) {
  const x = (value: number) => (value - START) / (END - START) * 1000;
  const y = (value: number) => 64 - (value - .5) / .45 * 60;
  const band = `M${envelope.map(point => `${x(point.t)},${y(point.p90)}`).join(' L')} L${[...envelope].reverse().map(point => `${x(point.t)},${y(point.p10)}`).join(' L')} Z`;
  return <div className="replay-strip">
    <button className="replay-play primary" onClick={togglePlay} aria-label={playing ? 'Pause replay' : 'Play replay'}><Icon name={playing ? 'pause' : 'play'}/></button>
    <div className="replay-track">
      <svg viewBox="0 0 1000 72" preserveAspectRatio="none" aria-hidden="true"><rect className="replay-trail" x="0" y="0" width={x(t)} height="72"/><path className="envelope-band" d={band}/><path className="envelope-median" d={`M${envelope.map(point => `${x(point.t)},${y(point.p50)}`).join(' L')}`}/><path className="replay-now" d={`M${x(t)},0 V72`}/></svg>
      <input type="range" min={START} max={END} step={1800} value={t} aria-label="Replay date" aria-valuetext={new Date(t * 1000).toUTCString()} onChange={event => scrub(Number(event.target.value))}/>
      <div className="replay-dates">{[2,4,6,8,10,12,14,16,18].map(day => <span key={day}>Oct {day}</span>)}</div>
    </div>
    <div className="replay-options">
      <div className="segments" aria-label="Replay speed">{[.5,1,2].map(value => <button key={value} aria-pressed={speed === value} onClick={() => setSpeed(value)}>{value}×</button>)}</div>
      <button className="loop-button" aria-pressed={loop} onClick={() => setLoop(!loop)}>Loop</button>
    </div>
  </div>;
}
