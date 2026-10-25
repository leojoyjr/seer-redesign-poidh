import {assets,pct} from '../math/model';
import {useRisk} from '../store';
import {useEased} from '../anim';
import {Roll} from './Roll';
import {Icon} from './icons';
export function Headline(){
 const s=useRisk(),t=s.horizon/100,value=s.aggregate**t,market=s.market**t;
 const ring=useEased(value,420,0);
 // Additive hazards sum to -log(survival); their normalized shares identify contributors.
 const hazards=assets.map(a=>({a,v:-Math.log1p(-Math.min(1-1e-12,s.estimates[a.id]??a.m))})).sort((a,b)=>b.v-a.v);
 const total=hazards.reduce((sum,a)=>sum+a.v,0),top=hazards.slice(0,5);
 return <article className="headline-card rv-card"><h2>Headline</h2><div className="headline-signal"><svg viewBox="0 0 100 100" aria-label={`Survival ${pct(value)}`} role="img"><circle cx="50" cy="50" r="43" className="ring-track"/><circle cx="50" cy="50" r="43" className="ring-value" pathLength="1" strokeDasharray={`${ring} 1`} transform="rotate(-90 50 50)"/></svg><div className="headline-caption">Chance that no listed asset defaults</div></div><div className="headline-number" data-testid="headline-ann"><Roll value={value}/></div><span className="headline-period">{s.horizon===100?'(Ann.)':s.horizon===25?'(Quart.)':`(${(s.horizon*.12).toFixed(0)} mo)`}</span><div className="headline-quarter"><span data-testid="headline-quart"><Roll value={s.aggregate**.25}/></span> (Quart.)</div>{s.edited.length>0&&<div className="headline-delta"><Icon name="diamond" size={12}/>Your estimate · {value>=market?'+':'−'}{(Math.abs(value-market)*100).toFixed(2)} pp</div>}<div className="hazard-heading">Hazard share</div><div className="hazard-bar" aria-label="Hazard share by asset">{hazards.map(({a,v},i)=><span key={a.id} style={{width:`${total?v/total*100:0}%`,opacity:i<5?1-i*.14:.2}} title={`${a.ticker} ${pct(total?v/total:0)}`}/>)}</div><div className="hazard-labels">{top.map(({a,v},i)=><div key={a.id}><span><i style={{opacity:1-i*.14}}/>{a.ticker}</span><span>{pct(total?v/total:0,1)}</span></div>)}</div></article>;
}
