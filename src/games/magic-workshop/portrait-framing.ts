import type { ArtKey } from './art';
/** Face centers and circular viewing diameter measured on the 768 px display masters. */
const faces:Partial<Record<ArtKey,readonly[number,number,number]>>={
  guide:[380,238,240],guideHappy:[380,238,240],
  rabbit:[393,320,210],rabbitHappy:[391,322,210],
  deer:[375,269,210],deerHappy:[372,264,220],
  owl:[410,270,280],owlHappy:[409,266,295],
  fox:[421,270,260],foxHappy:[418,263,275],
  bear:[411,272,270],bearHappy:[411,267,280],
};
export function portraitFrame(key:ArtKey){
  const [x,y,diameter]=faces[key]??[384,384,400];
  return {x:x/768,y:y/768,diameter:diameter/768};
}
