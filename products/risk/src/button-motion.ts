/** One delegated listener serves React controls, dialogs, and the shared shell. */
export function installButtonSheen(){
 document.addEventListener('pointermove',event=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const button=(event.target as Element).closest<HTMLElement>('.rv-btn--primary');
  if(!button)return;
  const rect=button.getBoundingClientRect();
  button.style.setProperty('--mx',`${event.clientX-rect.left}px`);
  button.style.setProperty('--my',`${event.clientY-rect.top}px`);
 },{passive:true});
}
