export function Segments<T extends string|number>({values,value,change,label,format}:{values:readonly T[];value:T;change:(v:T)=>void;label:string;format?:(v:T)=>string}) {
  return <div className="segments segmented" role="group" aria-label={label}>{values.map(v=><button key={v} aria-pressed={v===value} aria-current={v===value?'true':undefined} onClick={()=>change(v)}>{format?format(v):v}</button>)}</div>;
}
