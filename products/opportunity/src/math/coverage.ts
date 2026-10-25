// C(k) is the sum of the k highest odds, in percentage points; null contributes no mass.
export function coverage(k: number, outcomes: readonly {odds: number | null}[]) { return [...outcomes].sort((a,b) => (b.odds ?? -1)-(a.odds ?? -1)).slice(0,k).reduce((sum,o) => sum + (o.odds ?? 0),0); }
// S(k) = 1 - k/N: fraction of all submissions outside the review set.
export function saved(k: number, N: number) { return N ? 1-k/N : 0; }

// Samples use the smallest shortlist covering 70%; never include every priced row.
export function reviewCut(m:{sample:boolean;rows:readonly {odds:number|null}[]}) {
 const rows=[...m.rows].filter(o=>o.odds!==null).sort((a,b)=>(b.odds??0)-(a.odds??0));
 if(!m.sample)return Math.min(27,rows.length);
 const cap=Math.max(1,rows.filter(o=>(o.odds??0)>.4).length-1);
 let k=1;while(k<cap&&coverage(k,rows)<70&&coverage(k+1,rows)<=85)k++;
 return k;
}
