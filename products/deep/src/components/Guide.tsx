import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { markets } from '../data/markets';

const steps = [['Connect Wallet','Connect your preferred crypto wallet on Optimism.'],['Create Trade Wallet','The trade wallet executes trades without repeated wallet approvals.'],['Get sUSDS','Convert USDC or USDS to sUSDS through Deposit sUSDS.'],['Deposit to Trade Wallet','Enter an amount and deposit sUSDS into the trade wallet.'],['Upload CSV Predictions','Upload a .csv file, then click Load Predictions.'],['Execute Strategy','Enter a starting sUSDS amount, then click Start Trading.']];
const glossary = [['UP','Original work in an originality pair.'],['DOWN','Dependencies in an originality pair.'],['Σ','The sum of the two current market prices.'],['Unpriced','The residual below 1: 1 − UP − DOWN.'],['Over 1','The amount by which UP + DOWN exceeds 1.'],['Difference','Your predicted price minus the current market price.'],['Trade wallet','Executes trades automatically; risk is limited to deposited funds.'],['sUSDS','Savings USDS, a yield-bearing token used on Optimism.'],['Complete sets','The L2 strategy example redeems complete sets internally.'],['Score','Not supplied by the leaderboard API.']];

function FlowDiagram() {
  return <svg className="guide-flow" viewBox="0 0 760 150" role="img" aria-label="Question flows to prediction, trade wallet, and settlement">
    <path className="flow-line" d="M92 75H668"/>
    {[['Ask',92],['Predict',284],['Trade wallet',476],['Settle',668]].map(([label,x], index) => <g key={String(label)} transform={`translate(${x} 75)`}><circle r="28"/><path d={index === 0 ? 'M-9 0h18M0-9v18' : index === 1 ? 'M-10 7l7-8 7 5 9-12' : index === 2 ? 'M-12-8h24v16h-24zM-5 8v7M5 8v7' : 'M-11 0l7 7 15-16'}/><text y="53" textAnchor="middle">{label}</text></g>)}
  </svg>;
}

export function Guide({ close, action }:{ close:()=>void; action:(step:number)=>void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState('Start here');
  useEffect(() => { const previous = document.activeElement as HTMLElement; ref.current?.showModal(); return () => previous?.focus(); }, []);
  const tabs = ['Start here','Read the market','Trade','Glossary'];
  return <dialog ref={ref} className="guide-drawer" aria-labelledby="guide-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header><div><h2 id="guide-title">Guide to the signal</h2><p>Ask, price, act, settle.</p></div><button aria-label="Close guide" onClick={close}><Icon name="close"/></button></header>
    <div className="guide-tabs" role="tablist" aria-label="Guide sections" onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const index = (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; setTab(tabs[index]); event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[index]?.focus(); } }}>{tabs.map(value => <button role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{value}</button>)}</div>
    <div className="guide-content" role="tabpanel">
      {tab !== 'Glossary' && <FlowDiagram/>}
      {tab === 'Trade' && <p className="guide-note">This build simulates funding and execution locally. Demo signing can be rejected and is never presented as a live transaction.</p>}
      {tab === 'Start here' ? <ol className="guide-stepper">{steps.map(([title,copy], index) => <li key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{copy}</p><button onClick={() => action(index)}>Do it now →</button></div></li>)}</ol> : tab === 'Read the market' ? <><h3>UP / DOWN pair</h3><p>UP measures original work; DOWN measures dependencies. Prices can sum above or below 1.</p>{markets.slice(0,3).map(market => <div className="guide-mini" key={market.id}><span>{market.name}</span><div className="bar" aria-label={`UP ${market.up.toFixed(4)}, DOWN ${market.down.toFixed(4)}, residual ${market.residual.toFixed(4)}`}><i className="up" style={{ width:`${market.up * 100}%` }}/><i className="down" style={{ width:`${market.down * 100}%` }}/><i className={market.residual < 0 ? 'over hatch' : 'gap hatch'} style={{ left:`${Math.min(market.up, 1 - market.down) * 100}%`, width:`${Math.abs(market.residual) * 100}%` }}/></div><small>UP {market.up.toFixed(4)} · DOWN {market.down.toFixed(4)} · Σ {market.sum.toFixed(4)}</small></div>)}<h3>Unpriced gap</h3><p>1 − UP − DOWN. A negative residual means the pair is over 1.</p><h3>Difference</h3><p>Predicted − market. Predictions remain unknown until you upload them.</p><h3>Split, chart and swarm</h3><p>Split bars compare current pairs. The field chart shows recorded price history. Swarm compares repositories on one exact price axis.</p></> : tab === 'Trade' ? <><h3>Upload and review</h3><p>Upload your CSV, click Load Predictions, and review market prices, predictions, balances and differences.</p><button onClick={() => action(4)}>Upload predictions →</button><h3>Start Trading</h3><p>Enter a starting sUSDS amount, then execute the automated strategy. Tokens remain in the trade wallet.</p><button onClick={() => action(5)}>Open Desk →</button><h3>Rebalancing</h3><p>Upload a new CSV and leave the sUSDS input empty to rebalance existing balances.</p><h3>Sell All to sUSDS</h3><p>Attempts multiple sell transactions. Liquidity may prevent full conversion; gas costs may be high.</p><button onClick={() => action(3)}>Open Funds →</button></> : <dl className="guide-glossary">{glossary.map(([term,copy]) => <div key={term}><dt>{term}</dt><dd>{copy}</dd></div>)}</dl>}
    </div>
    <footer><a href="https://deep-pm.gitbook.io/seer-docs" target="_blank" rel="noopener noreferrer">Open full documentation ↗</a></footer>
  </dialog>;
}
