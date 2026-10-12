import { expect, test } from 'vitest';
import { actorMesh, deformActor, smoothPointer } from './cover-motion';

test('持續動畫與指標視差不移動靴子，角色變形保持小幅度',()=>{
  const mesh=actorMesh(1024,1536);
  for(let t=0;t<20;t+=.1){
    deformActor(mesh.vertices,mesh.rest,1024,1536,t,1.7,1,-1);
    for(let i=0;i<mesh.vertices.length;i+=2){
      if(mesh.rest[i+1]>=1536*.76){expect(mesh.vertices[i]).toBe(mesh.rest[i]);expect(mesh.vertices[i+1]).toBe(mesh.rest[i+1]);}
      expect(Math.abs(mesh.vertices[i]-mesh.rest[i])).toBeLessThan(10);
      expect(Math.abs(mesh.vertices[i+1]-mesh.rest[i+1])).toBeLessThan(6);
    }
  }
});
test('降低動態精確回復原始頂點，並保留完整 UV 範圍',()=>{
  const m=actorMesh(1024,1536);deformActor(m.vertices,m.rest,1024,1536,12,0,1,1,true);
  expect(m.vertices).toEqual(m.rest);expect(Math.min(...m.uvs)).toBe(0);expect(Math.max(...m.uvs)).toBe(1);
});
test('指標平滑在不同幀率有相同結果',()=>{
  const run=(frames:number)=>{let x=0;for(let i=0;i<frames;i++)x=smoothPointer(x,1,1000/frames);return x;};
  expect(run(40)).toBeCloseTo(run(60),10);
});
