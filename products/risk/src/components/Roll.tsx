import {pct} from '../math/model';
import {useEased} from '../anim';
// Number that rolls to its new value: displayed = eased(value); the final frame equals the exact value.
export function Roll({value,ms=260}:{value:number;ms?:number}){return <>{pct(useEased(value,ms))}</>}
