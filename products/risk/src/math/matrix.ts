import type {Asset} from './model';
export const tiers=['A+','A','A-','B+','B','B-','C+','C','C-','D','No rating'];
export const grade=(a:Asset)=>a.grade||'No rating';
// PD domain is 0.01%–100%; clamp zero to the left boundary.
export const logPD=(p:number)=>Math.max(0,Math.min(1,(Math.log10(Math.max(.0001,p))+4)/4));
export const horizonPD=(p:number,h:number)=>1-(1-p)**(h/100);
// Greedy vertical packing: candidates are tangent to already placed 12px dots.
export function swarm(list:Asset[],h:number,width:number){
 const placed:{a:Asset;x:number;y:number}[]=[];
 for(const a of [...list].sort((a,b)=>a.m-b.m||a.id.localeCompare(b.id))){
  const x=logPD(horizonPD(a.m,h))*width;
  const near=placed.filter(p=>Math.abs(p.x-x)<16);
  const candidates=[0,...near.flatMap(p=>{const dy=Math.sqrt(256-(p.x-x)**2);return [p.y+dy,p.y-dy]})].sort((a,b)=>Math.abs(a)-Math.abs(b));
  const y=candidates.find(y=>near.every(p=>(p.x-x)**2+(p.y-y)**2>=255.99))??0;
  placed.push({a,x,y});
 }
 return placed;
}
