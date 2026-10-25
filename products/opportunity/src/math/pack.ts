export interface PackedCircle {id:string;x:number;y:number;diameter:number}
/** Radius ∝ sqrt(odds), so area ∝ odds. Deterministic candidates keep label hit boxes disjoint, including hover expansion. */
export function pack(items:{id:string;weight:number}[],width:number){
 const circles:PackedCircle[]=[],max=Math.max(...items.map(o=>o.weight),.01),w=Math.max(56,width);
 for(const item of items){
  const diameter=Math.min(w,Math.max(56,112*Math.sqrt(item.weight/max))),r=diameter/2;
  // Keep the full rectangular touch boxes disjoint, including clipped edge bubbles.
  const previous=circles.at(-1),right=previous?previous.x+previous.diameter/2+8:0;
  const sameShelf=previous&&right+diameter<=w;
  const p=sameShelf?{x:right+r,y:previous.y-previous.diameter/2+r}:{x:r,y:Math.max(0,...circles.map(c=>c.y+c.diameter/2))+r+8};
  circles.push({id:item.id,...p,diameter});
 }
 return {circles,height:Math.max(0,...circles.map(c=>c.y+c.diameter/2+4))};
}
/** Log intensity interpolates the approved low/mid/leader ramp continuously. */
export function intensity(value:number,min:number,max:number){const floor=Math.max(.001,min);return max<=floor?1:Math.max(0,Math.min(1,Math.log(Math.max(value,floor)/floor)/Math.log(max/floor)));}
