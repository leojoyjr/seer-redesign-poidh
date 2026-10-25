import {money,type Market} from '../data/markets';
export function MarketLabels({market:m,metrics=true}:{market:Market;metrics?:boolean}){
 if(!metrics)return <div className="market-tags"><span className="status label-chip">{m.status}</span></div>;
 return <div className="market-stat-bar">{[['Volume',`${money(m.volume)} sDAI`],['Liquidity',`${money(m.liquidity)} sDAI`],['Outcomes',String(m.outcomes)],['Decision',m.decision],['Data',m.sample?'Sample':'Live data']].map(([caption,value])=><span className="stat-column" key={caption}><small>{caption}</small><b title={value}>{value}</b></span>)}</div>;
}
