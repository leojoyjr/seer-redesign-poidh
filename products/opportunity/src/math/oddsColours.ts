export type RGB=readonly number[];
// WCAG relative luminance linearizes sRGB before applying channel weights.
export const luminance=(rgb:RGB)=>rgb.reduce((sum,value,index)=>sum+(value/255<=.04045?value/255/12.92:((value/255+.055)/1.055)**2.4)*[.2126,.7152,.0722][index],0);
export const contrast=(a:RGB,b:RGB)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
export const mix=(a:RGB,b:RGB,t:number)=>a.map((value,index)=>value*(1-t)+b[index]*t);
export function oddsColour(ramp:RGB[],dark:RGB,light:RGB,shade:number){
 const value=Math.max(0,Math.min(1,shade))*(ramp.length-1),step=Math.min(ramp.length-2,Math.floor(value));
 let background=mix(ramp[step],ramp[step+1],value-step);
 const foreground=contrast(dark,background)>=contrast(light,background)?dark:light;
 // The small middle-luminance gap between EF ink and white needs a gentle tint.
 const endpoint=foreground===dark?light:dark;
 for(let n=0;n<20&&contrast(foreground,background)<4.6;n++)background=mix(background,endpoint,.02);
 return {background:background.map(Math.round),foreground};
}
