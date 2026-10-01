export interface LiquidPoint { x: number; y: number }
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

/** Inner glass contour measured against bottle-empty-v1, excluding the brass rim. */
export function bottleInterior(w:number,h:number):LiquidPoint[] {
  // The glass narrows inside the brass lip. Keep the fill away from its outer neck edge.
  const right:LiquidPoint[]=[{x:.18*w,y:-.913*h},{x:.19*w,y:-.895*h},{x:.19*w,y:-.817*h}];
  const curve=(x0:number,y0:number,x1:number,y1:number,x2:number,y2:number,x3:number,y3:number)=>{
    for(let i=1;i<=12;i++){const t=i/12,s=1-t;right.push({x:(s*s*s*x0+3*s*s*t*x1+3*s*t*t*x2+t*t*t*x3)*w,y:(s*s*s*y0+3*s*s*t*y1+3*s*t*t*y2+t*t*t*y3)*h});}
  };
  curve(.19,-.817,.19,-.762,.435,-.774,.442,-.681);
  right.push({x:.442*w,y:-.177*h});
  curve(.442,-.177,.442,-.092,.40,-.067,0,-.067);
  return [...right,...right.slice(0,-1).reverse().map(p=>({x:-p.x,y:p.y}))];
}
export function polygonArea(points:LiquidPoint[]) {
  return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0)/2);
}
/** Clip against gravity in bottle-local coordinates, including during a rotated pour. */
function below(points:LiquidPoint[],level:number,angle:number) {
  const height=(p:LiquidPoint)=>p.x*Math.sin(angle)+p.y*Math.cos(angle);
  const out:LiquidPoint[]=[];
  points.forEach((a,i)=>{const b=points[(i+1)%points.length],da=height(a)-level,db=height(b)-level;
    if(da>=0)out.push(a);
    if((da>=0)!==(db>=0)){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  });return out;
}
export function liquidGeometry(w:number,h:number,fraction:number,angle=0) {
  const outline=bottleInterior(w,h),f=clamp(fraction);
  const heights=outline.map(p=>p.x*Math.sin(angle)+p.y*Math.cos(angle));
  let low=Math.min(...heights),high=Math.max(...heights);
  const area=polygonArea(outline),target=area*f;
  for(let i=0;i<24;i++){const mid=(low+high)/2;if(polygonArea(below(outline,mid,angle))>target)low=mid;else high=mid;}
  const level=(low+high)/2,points=f?below(outline,level,angle):[];
  const ends=points.filter(p=>Math.abs(p.x*Math.sin(angle)+p.y*Math.cos(angle)-level)<.01);
  ends.sort((a,b)=>(a.x-b.x)*Math.cos(angle)-(a.y-b.y)*Math.sin(angle));
  return {points,level,surface:ends.length>=2?[ends[0],ends[ends.length-1]]:null};
}

export const POUR_DURATION=1550;
/** A nearly empty bottle tips farther so liquid actually reaches the lower lip. */
export const bottlePourAngle=(fraction:number)=>1.5+(1-clamp(fraction))*.9;
export function pourTiming(t:number) {
  const smooth=(v:number)=>{const n=clamp(v);return n*n*(3-2*n);};
  return {pose:t<.27?smooth(t/.27):1-smooth((t-.79)/.21),flow:smooth((t-.28)/.47),wet:t>=.28&&t<.79};
}
