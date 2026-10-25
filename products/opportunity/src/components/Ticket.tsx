import {Tooltip} from './Tooltip';
import {useEffect,useId,useRef,useState} from 'react';
import {useMarkets,ranked,updateMarkets,type Market} from '../data/markets';
import {isWinner} from './Field';
import {HoverMenu} from './HoverMenu';
export function Ticket({wallet,initialMode='Buy',market,selected,onSelect}:{wallet:()=>void;initialMode?:string;market?:Market;selected?:string;onSelect?:(id:string)=>void}){
 const s=useMarkets(),m=market??s.markets.find(m=>m.id===s.selectedId)!,o=m.rows.find(o=>o.id===(selected??s.submissionId))??m.rows[0];
 const [mode,setMode]=useState(initialMode),[amount,setAmount]=useState(20),[message,setMessage]=useState(''),id=useId(),ref=useRef<HTMLElement>(null);
 const final=m.status==='Finalized',winner=isWinner(m,o),price=(o.odds??0)/100,position=s.positions[o.id]??0;
 useEffect(()=>setMessage(''),[o.id,mode]);
 useEffect(()=>{const open=(e:Event)=>{setMode((e as CustomEvent<string>).detail);requestAnimationFrame(()=>ref.current?.querySelector('input')?.focus());};window.addEventListener('opp:trade',open);return()=>window.removeEventListener('opp:trade',open);},[]);
 const invalid=m.liquidity===0?'No pool':final?(!winner||position<=0?'No redeemable winner shares':''):!price?'No pool':amount<=0?'Enter an amount':mode==='Buy'&&amount>s.balance?'Insufficient balance':mode==='Sell'&&amount>position?'Insufficient position':'';
 const trade=()=>{
  if(!s.connected){wallet();return;}if(invalid){setMessage(invalid);return;}
  const shares=final?position:mode==='Buy'?amount/price:-amount;
  updateMarkets({balance:s.balance+(final?position:mode==='Buy'?-amount:amount*price),positions:{...s.positions,[o.id]:final?0:position+shares}});
  setMessage(final?'Redeem':`${mode} · ${Math.abs(shares).toFixed(2)} shares`);
 };
 return <section className="ticket" data-testid="trade-ticket" ref={ref} aria-label="Ticket"><div className="ticket-top"><div className="seg" aria-label="Buy or Sell">{['Buy','Sell'].map(v=><button key={v} aria-pressed={mode===v} className={mode===v?'active':''} onClick={()=>setMode(v)}>{v}</button>)}</div><HoverMenu label={o.name} options={ranked(m).map(row=>({value:row.id,label:row.name}))} selected={[o.id]} onChange={v=>onSelect?onSelect(v[0]):updateMarkets({submissionId:v[0]})}/></div>
 <div className="amount-row"><label htmlFor={id}>{final?'Payout':'Amount'}<small><Tooltip text={mode==='Sell'?'Shares pay 1 sDAI each if selected by the sponsor.':'sDAI is the savings token used to quote and settle trades.'}>{!final&&mode==='Sell'?'Shares':'sDAI'}</Tooltip></small></label><input id={id} aria-label="Trade amount" type="number" min="0" step="any" value={final?position:amount} readOnly={final} onChange={e=>{setAmount(Math.max(0,Number(e.target.value)));setMessage('');}}/>{[1,5,10,100].map(n=><button key={n} aria-disabled={final} title={final?'Finalized':`+${n}`} onClick={()=>{if(!final)setAmount(a=>a+n);}}>+{n}</button>)}</div>
 <div className="ticket-summary"><Tooltip text="Shares pay 1 sDAI each if selected; other shares pay zero.">Receive {final?position.toFixed(2):price?(mode==='Buy'?amount/price:amount*price).toFixed(2):'-'} {final||mode==='Sell'?'sDAI':'shares'}</Tooltip><Tooltip text="Average price in sDAI.">Avg {price.toFixed(4)}</Tooltip><Tooltip text="Maximum price movement.">Slippage 0.5%</Tooltip></div>
 <button className="primary btn-bubbles" aria-disabled={s.connected&&!!invalid} title={s.connected?invalid:undefined} onClick={trade}>{!s.connected?'Connect wallet':invalid|| (final?'Redeem':mode)}</button><div className="position" aria-live="polite">{message||<><Tooltip text="Position is the number of shares held in this submission.">Position {s.connected?position.toFixed(2):'-'} shares</Tooltip> · Balance {s.connected?`${s.balance.toFixed(2)} sDAI`:'-'}</>}</div></section>;
}
