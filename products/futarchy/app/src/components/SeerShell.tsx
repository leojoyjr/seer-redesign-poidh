import './seer-shell.css';
const products = ['Explorer', 'Deep', 'Futarchy', 'Opportunity', 'Risk'];
export function SeerFooter() { return <footer className="seer-footer"><span>Seer. Information Finance.</span><nav aria-label="Seer products">{products.map((name,i)=><span key={name}><a href={`/${name.toLowerCase()}/`}>{name}</a>{i<products.length-1?', ':''}</span>)}</nav></footer>; }
