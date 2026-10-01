/** Back edge of the tabletop, measured on workbench-twilight-v1 (1536 × 1024). */
const counterEdge = [[0,590],[80,577],[220,574],[420,574],[640,573],[900,574],[1150,572],[1330,573],[1450,582],[1536,600]] as const;
export type CounterEdge = readonly (readonly [number, number])[];

export function counterY(edge: CounterEdge, x: number) {
  const i=Math.max(1,edge.findIndex(([px])=>px>=x));
  const [left,top]=edge[i-1], [right,bottom]=edge[i];
  return top+(bottom-top)*(x-left)/(right-left);
}

/** Upper half of the painting, bounded by the actual counter and each actor's lane. */
export function counterMask(edge: CounterEdge, left: number, right: number) {
  const points=edge.filter(([x])=>x>left&&x<right);
  return [left,0,right,0,right,counterY(edge,right),...points.reverse().flat(),left,counterY(edge,left)];
}

/** Expand the logical scene to the viewport instead of centering a fixed letterboxed board. */
export function workshopLayout(viewWidth: number, viewHeight: number) {
  const portrait=viewWidth/viewHeight<1.1;
  const scale=Math.min(viewWidth/(portrait?600:1200),viewHeight/(portrait?1000:800));
  const width=viewWidth/scale,height=viewHeight/scale,edge=portrait?24:36;
  const backgroundScale=Math.max(width/1536,height/1024);
  const background={x:(width-1536*backgroundScale)/2,y:(height-1024*backgroundScale)/2,width:1536*backgroundScale,height:1024*backgroundScale};
  const tableEdge=counterEdge.map(([x,y])=>[background.x+x*backgroundScale,background.y+y*backgroundScale] as const);
  const tableY=counterY(tableEdge,width/2);
  const guestScale=portrait?.55:1;
  const miloX=portrait?edge+150:edge+285;
  const guestHalf=212*guestScale; // All authored frames retain at least 48 px padding in a 512 px cell.
  const laneLeft=miloX+(portrait?78:116);
  // Keep the tallest bottle and both station hit areas in separate rows, even on short phones.
  const bottleY=portrait?Math.max(height*.76,tableY+95+24+170):height*.735;
  return {
    portrait,scale,width,height,edge,tableY,tableEdge,background,
    order:{x:portrait?width-edge-109:edge+109,y:portrait?244:210,width:218},
    milo:{x:miloX,y:counterY(tableEdge,miloX)+(portrait?68:94),width:portrait?116:160,height:portrait?170:250},
    dialogue:{x:miloX+88,y:tableY-(portrait?162:231),width:portrait?240:280,fontSize:portrait?20:23},
    guest:{scale:guestScale,half:guestHalf,seatX:Math.max(width/2,laneLeft+guestHalf+(portrait?36:16)),entryX:width-edge-guestHalf,laneLeft,y:tableY+(portrait?68:107)},
    station:{left:edge+(portrait?108:156),right:width-edge-(portrait?70:125),y:portrait?bottleY-170-24:height*.765,springHeight:portrait?170:230,springWidth:portrait?212:310,recyclerWidth:portrait?185:270},
    bottles:{y:bottleY,span:portrait?width-230:Math.min(1000,width*.48)},
    footer:{y:height-(portrait?90:55),homeX:width-edge-95,homeY:height-(portrait?35:55)},
    home:{x:portrait?width/2:width*.35,y:height*(portrait?.623:.65),miloX:portrait?width-edge-122:width*.78},
    ending:{x:portrait?width/2-40:width*.35,y:height*(portrait?.477:.58)},
  };
}

/** Capacity controls the physical vessel size; current amount controls only the liquid. */
export function bottleDimensions(capacity: number, portrait: boolean) {
  const size=capacity<=4?'small':capacity<=8?'medium':'large';
  const factor=size==='small'?.72:size==='medium'?.86:1;
  return {size,w:(portrait?96:130)*factor,h:(portrait?170:206)*factor};
}
