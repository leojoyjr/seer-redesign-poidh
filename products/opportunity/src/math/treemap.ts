export interface Weighted {id:string; weight:number}
export interface Rect {id:string;x:number;y:number;width:number;height:number}
/** Squarify sorted positive weights. Each area = weight / sum * width * height.
 * Greedily extend a strip only while its worst aspect ratio improves. O(n²)
 * in the bounded label set (<=16); never creates DOM for the 235 raw rows. */
export function squarify(items:readonly Weighted[],width:number,height:number):Rect[]{
 if(width<=0||height<=0||!items.length)return [];
 const total=items.reduce((s,d)=>s+Math.max(d.weight,.0001),0);
 const pending=items.map(d=>({...d,area:Math.max(d.weight,.0001)/total*width*height}));
 const result:Rect[]=[];let x=0,y=0,w=width,h=height;
 const worst=(row:typeof pending,side:number)=>{const sum=row.reduce((s,d)=>s+d.area,0),areas=row.map(d=>d.area);return Math.max(side*side*Math.max(...areas)/(sum*sum),sum*sum/(side*side*Math.min(...areas)));};
 while(pending.length){const row=[pending.shift()!],side=Math.min(w,h);while(pending.length&&worst([...row,pending[0]],side)<=worst(row,side))row.push(pending.shift()!);
 const sum=row.reduce((s,d)=>s+d.area,0),vertical=w>=h,thickness=sum/(vertical?h:w);let offset=0;
 for(const d of row){const length=d.area/thickness;result.push({id:d.id,x:x+(vertical?0:offset),y:y+(vertical?offset:0),width:vertical?thickness:length,height:vertical?length:thickness});offset+=length;}
 if(vertical){x+=thickness;w=Math.max(0,w-thickness);}else{y+=thickness;h=Math.max(0,h-thickness);}
 }return result;
}
/** Split the ranked prefix separately from the remainder, preserving odds area.
 * Recursive proportional cuts search both orientations; minimum-size pruning
 * prevents tiny end slivers without changing any outcome's relative area. */
export function labeledLayout(items:readonly Weighted[],width:number,height:number){
 const total=items.reduce((s,d)=>s+d.weight,0);
 if(width<=0||height<=0||!total)return {count:0,rects:[] as Rect[]};
 const partition=(group:readonly Weighted[],x:number,y:number,w:number,h:number):Rect[]|null=>{
  if(w<116-1e-6||h<68-1e-6||Math.floor((w+1e-6)/116)*Math.floor((h+1e-6)/68)<group.length)return null;
  if(group.length===1)return [{id:group[0].id,x,y,width:w,height:h}];
  const mass=group.reduce((s,d)=>s+d.weight,0);
  const splits=Array.from({length:group.length-1},(_,i)=>i+1).sort((a,b)=>Math.abs(a-group.length/2)-Math.abs(b-group.length/2));
  for(const vertical of [w/116>=h/68,w/116<h/68])for(const at of splits){
   const a=group.slice(0,at),b=group.slice(at),f=a.reduce((s,d)=>s+d.weight,0)/mass;
   const first=partition(a,x,y,vertical?w*f:w,vertical?h:h*f);if(!first)continue;
   const second=partition(b,vertical?x+w*f:x,vertical?y:y+h*f,vertical?w*(1-f):w,vertical?h:h*(1-f));
   if(second)return [...first,...second];
  }return null;
 };
 for(let n=Math.min(16,items.length);n>=1;n--){
  const prefix=items.slice(0,n),rest=items.slice(n).reduce((s,d)=>s+d.weight,0),topHeight=(total-rest)/total*height;
  for(const vertical of [true,false]){
   const topWidth=(total-rest)/total*width;
   const rects=partition(prefix,0,0,vertical?topWidth:width,vertical?height:topHeight);
   if(rects)return {count:n,rects:[...rects,...(rest?[vertical?{id:'more',x:topWidth,y:0,width:width-topWidth,height}:{id:'more',x:0,y:topHeight,width,height:height-topHeight}]:[])]};
  }
 }
 return {count:0,rects:[{id:'more',x:0,y:0,width,height}]};
}
/** Bounded strip treemap: reserve 76×52 per name, then distribute remaining
 * width and height by odds^0.7. The minimum-area floor compresses the tail.
 * At narrow widths only the inner plane grows; no submission is discarded. */
export function namedLayout(items:readonly Weighted[],width:number,height:number):{height:number;rects:Rect[]}{
 const w=Math.max(160,width),columns=Math.max(1,Math.floor(w/76));
 const leaderSlots=columns>1&&items.length>1?1:0;
 const count=Math.ceil((items.length+leaderSlots)/columns);
 if(!count)return {height,rects:[]};
 const h=Math.max(height,count*52),groups:Weighted[][]=[];
 let offset=0;
 for(let i=0;i<count;i++){
  const slots=items.length-offset+(i===0?leaderSlots:0);
  const n=Math.ceil(slots/(count-i))-(i===0?leaderSlots:0);
  groups.push(items.slice(offset,offset+n));offset+=n;
 }
 const weight=(o:Weighted)=>Math.pow(Math.max(.0001,o.weight),.7);
 const masses=groups.map(g=>g.reduce((s,o)=>s+weight(o),0)),total=masses.reduce((s,n)=>s+n,0);
 const rects:Rect[]=[];let y=0;
 groups.forEach((group,i)=>{const rh=52+(h-count*52)*masses[i]/total;let x=0;
  group.forEach((o,j)=>{const minimum=76*(i===0&&j===0?1+leaderSlots:1);
   const rw=minimum+(w-(group.length+(i===0?leaderSlots:0))*76)*weight(o)/masses[i];
   rects.push({id:o.id,x,y,width:rw,height:rh});x+=rw;
  });y+=rh;
 });
 return {height:h,rects};
}
