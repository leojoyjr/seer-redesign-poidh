import {useRisk} from '../store';
import {Icon} from './icons';
import {Picker} from './Picker';
import {RatingMatrix} from './RatingMatrix';
import {OverTime} from './OverTime';
import {Headline} from './Headline';
export function Hero(){const s=useRisk();return <section id="overview" data-align data-testid="section-overview" className="hero rating-hero" aria-label="Market Estimate Risk"><Picker/><div className="hero-row"><Headline/><article className="matrix-card rv-card" data-testid="hero-visual"><header><h2>{s.view==='bars'?'Rating matrix':'Over time'}</h2><div className="matrix-key"><span><Icon name="circle" size={12}/>Market Estimate</span>{s.edited.length>0&&<span className="estimate-label"><Icon name="diamond" size={12}/>Your estimate</span>}</div></header>{s.selected.length?s.view==='bars'?<RatingMatrix/>:<OverTime/>:<div className="matrix-empty" data-testid="empty-state">No assets selected - pick a category or asset above to plot it.</div>}</article></div></section>}
