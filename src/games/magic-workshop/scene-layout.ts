/** Expand the logical scene to the viewport instead of centering a fixed letterboxed board. */
export function workshopLayout(viewWidth: number, viewHeight: number) {
  const portrait=viewWidth/viewHeight<1.1;
  const scale=Math.min(viewWidth/(portrait?600:1200),viewHeight/(portrait?1000:800));
  const width=viewWidth/scale,height=viewHeight/scale,edge=portrait?24:36;
  const tableY=height*.555;
  const guestScale=portrait?.55:1;
  const miloX=portrait?edge+150:edge+285;
  const guestHalf=212*guestScale; // All authored frames retain at least 48 px padding in a 512 px cell.
  const laneLeft=miloX+(portrait?78:116);
  return {
    portrait,scale,width,height,edge,tableY,
    order:{x:portrait?width-edge-109:edge+109,y:portrait?244:210,width:218},
    milo:{x:miloX,y:tableY+(portrait?68:94),width:portrait?116:160,height:portrait?170:250},
    dialogue:{x:miloX+88,y:tableY-(portrait?162:231),width:portrait?240:280,fontSize:portrait?20:23},
    guest:{scale:guestScale,half:guestHalf,seatX:Math.max(width/2,laneLeft+guestHalf+(portrait?36:16)),entryX:width-edge-guestHalf,laneLeft,y:tableY+(portrait?68:107)},
    station:{left:edge+(portrait?108:156),right:width-edge-(portrait?70:125),y:height*(portrait?.68:.765),springHeight:portrait?170:230,springWidth:portrait?212:310,recyclerWidth:portrait?185:270},
    bottles:{y:height*(portrait?.76:.735),span:portrait?width-230:Math.min(1000,width*.48)},
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
