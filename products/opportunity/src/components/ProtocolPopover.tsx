import {useState} from 'react';
import {Icon} from './Controls';
import {Dialog} from './Dialogs';
const roadmap=[['TODAY','Seer One operates it'],['NEXT','Anyone launches'],['ANY DECISION','One shared layer']];
export function ProtocolPopover({iconOnly=false}:{iconOnly?:boolean}){
 const [open,setOpen]=useState(false);
 return <><button className={iconOnly?'nav-icon':undefined} aria-label="The protocol" aria-expanded={open} aria-haspopup="dialog" onClick={()=>{window.dispatchEvent(new CustomEvent('opportunity:menu-open'));setOpen(true);}}>{iconOnly?<Icon name="protocol"/>:'The protocol'}</button>{open&&<Dialog className="protocol-modal" title="The protocol" close={()=>setOpen(false)}><div className="roadmap">{roadmap.map(([label,body])=><p key={label}><b>{label}</b><span>{body}</span></p>)}</div></Dialog>}</>;
}
