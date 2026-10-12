import type { App, Graphic, Label, Node, Texture } from '../magic-workshop/scene-types';
import type { SceneControl, SceneHooks, Viewport } from './scene';
import { animationFrameAt, animationFrames, type BattleArt, type BattlePixi, type Sheet } from './battle-art';
import { attackPresentation, createBattleEffects } from './battle-effects';
import { BATTLE_RULES, createBattle, STAGES } from './battle-model';
import { createQuestionDeck } from './question-deck';
import type { GeometryDiagramData } from './geometry-questions';

interface HitNode extends Node {eventMode:string;cursor:string;interactiveChildren:boolean;hitArea:{contains(x:number,y:number):boolean};on(event:string,callback:()=>void):void}
export function createBattleView(P:BattlePixi,app:App,art:BattleArt,grade:string,unit:string,stage:number,hooks:SceneHooks,onExit:()=>void) {
  const model=createBattle(createQuestionDeck(grade,unit,Date.now()>>>0),stage), state=model.state;
  const root=app.stage.addChild(new P.Container());
  const bg=root.addChild(new P.Sprite(art.values['battle-court-v1.webp'] as Texture)); bg.anchor.set(.5);
  const shade=root.addChild(new P.Graphics());
  const world=root.addChild(new P.Container()), fx=root.addChild(new P.Container()), ui=root.addChild(new P.Container());
  const actor=(who:'liwei'|'heen')=>{
    const idle=animationFrames(art.values[`${who}-idle.json`] as Sheet);
    // Hold the authored strike/impact pose through the travel and contact beat.
    const attack=animationFrames(art.values[`${who}-attack.json`] as Sheet).map(frame=>({...frame,time:frame.time*1.6}));
    const hurt=animationFrames(art.values[`${who}-hurt.json`] as Sheet);
    const sprite=world.addChild(new P.AnimatedSprite({textures:idle,autoUpdate:false,loop:true}));
    sprite.anchor.set(.5,224/256);sprite.play();return {sprite,idle,attack,hurt,mode:'idle' as 'idle'|'attack'|'hurt'};
  };
  const hero=actor('liwei'), king=actor('heen'), placeholder=world.addChild(new P.Graphics());
  const effects=createBattleEffects(P,fx,art);
  let viewport:Viewport={width:1280,height:720,scale:1,x:0,y:0}, disposed=false,reduced=false,focused:string|null=null,signature='';
  let charge:Graphic,hp:Label,enemyHp:Label,countdown:Label,fullscreen=false;
  const controls=new Map<string,{control:SceneControl;ring:Graphic}>();
  const draw=()=>{if(!disposed)app.render();};
  function text(value:string,x:number,y:number,size:number,width?:number):Label {
    const label=ui.addChild(new P.Text({text:value,style:{fontFamily:['Math Cover UI','Microsoft JhengHei','sans-serif'],fontSize:size,fontWeight:'600',fill:0xffecd1,
      align:'center',lineHeight:size*1.35,stroke:{color:0x101a2b,width:3},...(width?{wordWrap:true,wordWrapWidth:width,breakWords:true}:{})}}));
    label.anchor.set(.5);label.position.set(x,y);return label;
  }
  function button(id:string,label:string,x:number,y:number,w:number,h:number,disabled=false) {
    h=Math.max(h,44/viewport.scale);
    const node=ui.addChild(new P.Container()) as HitNode;node.position.set(x,y);
    node.addChild(new P.Graphics()).rect(-w/2,-h/2,w,h).fill(disabled?0x20253b:0x293b50).stroke({color:0xd4b476,width:2});
    const t=text(label,x,y,viewport.height>viewport.width?29:25,w-22);
    if(disabled){node.alpha=.45;t.alpha=.6;}
    const ring=node.addChild(new P.Graphics()).rect(-w/2-5,-h/2-5,w+10,h+10).stroke({color:0xfff2ad,width:3});ring.visible=id===focused;
    node.eventMode=disabled?'none':'static';node.cursor=disabled?'default':'pointer';node.interactiveChildren=false;
    node.hitArea={contains:(px,py)=>Math.abs(px)<=w/2&&Math.abs(py)<=h/2};node.on('pointertap',()=>activate(id));
    controls.set(id,{control:{id,label,disabled},ring});
  }
  function diagram(data:GeometryDiagramData,x:number,y:number) {
    const p=viewport.height>viewport.width,compact=!p&&viewport.scale<.75;
    const g=ui.addChild(new P.Graphics()),size=p?140:compact?(data.type==='sector'?40:35):52;
    if(data.type==='sector') {
      let start=-Math.PI/2;
      data.angles.forEach((angle,i)=>{
        const points=[x,y];for(let a=0;a<=angle;a+=Math.max(1,angle/30)){const r=start+a*Math.PI/180;points.push(x+Math.cos(r)*size,y+Math.sin(r)*size);}
        const end=start+angle*Math.PI/180;points.push(x+Math.cos(end)*size,y+Math.sin(end)*size);
        g.poly(points).fill(i===data.angles.length-1?0x648eb2:0x243a50).stroke({color:0xd8b672,width:2});
        const mid=start+angle*Math.PI/360;text(data.labels[i],x+Math.cos(mid)*size*.65,y+Math.sin(mid)*size*.65,viewport.height>viewport.width?24:18);start=end;
      });
    } else {
      const quad=data.type==='quadrilateral'||data.type==='parallelogram';
      const points=data.type==='parallelogram'?[-size,-size*.65,size*.65,-size*.65,size,size*.65,-size*.65,size*.65]:quad?[-size,-size*.55,size*.65,-size*.8,size,size*.65,-size*.65,size*.65]:[-size,size*.6,size,size*.6,0,-size*.75];
      g.poly(points.map((v,i)=>v+(i%2?y:x))).stroke({color:0xe2c796,width:3});
      data.labels.forEach((label,i)=>{
        const px=points[i*2],py=points[i*2+1];
        text(label,x+(data.type==='straight'&&i===2?size*.85:px*.73),y+(data.type==='straight'&&i===2?-size*.82:py*.65),p?24:18);
      });
      if(data.type==='straight')g.moveTo(x,y-size*.75).lineTo(x+size*.18,y-size*.993).stroke({color:0xe2c796,width:3});
      if(data.type==='split')g.moveTo(x,y-size*.75).lineTo(x,y+size*.6).stroke({color:0xe2c796,width:2});
    }
  }
  function idle(actor:typeof hero,force=false) {
    if(actor.mode==='idle'&&!force)return;
    actor.mode='idle';actor.sprite.onComplete=null;actor.sprite.textures=actor.idle;actor.sprite.loop=true;
    reduced?actor.sprite.gotoAndStop(0):actor.sprite.gotoAndPlay(0);
  }
  function pose(actor:typeof hero,clip:'attack'|'hurt',elapsed:number) {
    const frames=actor[clip],frame=reduced?Math.min(clip==='attack'?3:1,frames.length-1):animationFrameAt(frames,elapsed);
    if(frame===null){idle(actor);return;}
    if(actor.mode!==clip){actor.mode=clip;actor.sprite.textures=frames;actor.sprite.loop=false;}
    actor.sprite.gotoAndStop(frame);
  }
  function presentAttack() {
    if(state.phase!=='resolving'){effects.clear();idle(hero);idle(king);return;}
    const correct=state.event==='correct';
    const source={x:correct?hero.sprite.x+105:king.sprite.x-100,y:hero.sprite.y-(correct?160:225)};
    const target={x:correct?king.sprite.x-25:hero.sprite.x+25,y:hero.sprite.y-140};
    const sample=attackPresentation(state.event,state.elapsed,reduced);
    pose(correct?hero:king,'attack',state.elapsed);
    pose(correct?king:hero,'hurt',sample.impactElapsed);
    effects.render(state.event,state.elapsed,source,target,reduced);
  }
  function paint() {
    if(disposed)return;
    const {width:W,height:H}=viewport,p=H>W,compact=!p&&viewport.scale<.75,ground=p?535:437;
    ui.removeChildren().forEach(n=>n.destroy({children:true}));controls.clear();
    root.scale.set(viewport.scale);root.position.set(viewport.x,viewport.y);
    const stageH=p?880:720;bg.scale.set(Math.max(W/bg.texture.width,stageH/bg.texture.height));bg.position.set(W/2,stageH/2);
    shade.clear().rect(0,0,W,H).fill({color:0x0e1730,alpha:.18});
    hero.sprite.position.set(p?188:340,ground);king.sprite.position.set(p?535:940,ground);
    hero.sprite.scale.set(2);king.sprite.scale.set(2);king.sprite.visible=state.stage===4;placeholder.visible=state.stage!==4;
    placeholder.clear();placeholder.position.set(p?535:940,ground);
    if(state.stage!==4){const colors=[0x70988e,0x8ba7c2,0x7776b7,0x656385];placeholder.poly([-64,0,-78,-82,-46,-135,30,-147,77,-91,61,0]).fill(colors[state.stage]).stroke({color:0x182a3e,width:5});
      placeholder.rect(-34,-82,14,16).rect(20,-82,14,16).fill(0xffdfad);}
    text(STAGES[state.stage].name,W/2,p?49:31,p?32:25);
    text(unit,W/2,p?89:63,p?25:20,p?660:690);
    hp=text('',p?139:187,p?145:54,p?25:24);enemyHp=text('',p?559:1085,p?145:54,p?25:24);
    const barW=p?500:320;charge=ui.addChild(new P.Graphics());charge.position.set(W/2-barW/2,p?190:106);
    countdown=text('',W/2,p?231:148,p?26:24);
    ui.addChild(new P.Graphics()).rect(p?22:36,p?600:459,p?W-44:W-72,p?650:245).fill({color:0x111d31,alpha:.94}).stroke({color:0x918878,width:2});
    if(state.paused) {
      text('戰鬥已暫停',W/2,p?765:522,p?46:35);
      text('計時與動作都已停下',W/2,p?830:565,p?29:24);
      button('resume','繼續戰鬥',p?270:W/2-100,p?976:637,p?370:430,p?100:62);
      button('fullscreen',fullscreen?'退出全螢幕':'全螢幕',p?570:W/2+260,p?976:637,p?200:230,p?100:62);
    } else if(state.phase==='ready') {
      text(state.stage===4?'面對赫恩・奪輝王':'準備出戰',W/2,p?711:503,p?43:34);
      text('在蓄力滿前解題，答對出劍\n答錯受擊；錯題可看完解說再繼續',W/2,p?822:571,p?29:25,p?630:1100);
      button('fight','開始戰鬥',W/2,p?1050:653,p?460:400,p?100:62);
    } else if(state.phase==='cleared'||state.phase==='defeated') {
      text(state.phase==='defeated'?'稍作休息，再試一次':state.stage===4?'魔王關完成！':'本關完成！',W/2,p?753:521,p?42:34);
      text(state.phase==='defeated'?'可以保留本單元，重新挑戰這一關。':'這次的解題支持了黎薇的行動。',W/2,p?838:579,p?27:23,p?630:1120);
      if(state.phase==='cleared'&&state.stage<4)button('next-stage','前往下一關',W/2,p?1010:651,p?460:410,p?94:60);
      else button('retry','再戰本關',W/2,p?1010:651,p?460:410,p?94:60);
    } else if(state.phase==='review') {
      text(state.explanation,W/2,p?790:535,p?29:26,p?630:1120);
      button('continue','看懂了，繼續',W/2,p?1090:653,p?470:460,p?98:62);
    } else {
      const has=!!state.question.diagram;
      text(state.question.q,p?W/2:has?484:W/2,p?690:compact?489:510,p?30:26,p?630:has?830:1160);
      if(has)diagram(state.question.diagram!,p?W/2:1081,p?887:compact?(state.question.diagram!.type==='sector'?490:503):527);
      const start=p?(has?1080:925):compact?576:614;
      state.question.a.forEach((answer,i)=>button(`answer:${state.turn}:${i}`,`${i+1}. ${answer}`,W/2+(i%2-.5)*(p?338:570),start+Math.floor(i/2)*(p?110:compact?86:63),p?312:540,p?94:compact?82:54,state.phase!=='playing'));
      if(state.phase==='resolving')text(state.event==='correct'?'答對，出劍！':'受到攻擊',W/2,p?576:414,p?29:24);
    }
    button('back','離開',p?82:61,p?49:compact?46:26,p?120:92,p?58:40);
    if(state.phase==='playing'||state.phase==='resolving')button('pause','暫停',p?638:1216,p?49:compact?46:26,p?120:92,p?58:40);
    hooks.controls?.([...controls.values()].map(({control})=>control));
    hooks.announce?.(state.paused?'戰鬥已暫停。':`${STAGES[state.stage].name}。${state.phase==='playing'?`${state.question.q} 黎薇生命 ${state.heroHp}，敵人生命 ${state.enemyHp}。`:
      state.phase==='review'?state.explanation:state.phase==='cleared'?'本關完成。':state.phase==='defeated'?'本關失敗，可以重試。':state.phase==='ready'?'答對出劍、答錯受擊、敵人蓄力滿時受到攻擊。':state.explanation}`);
    signature=`${state.phase}:${state.turn}:${state.paused}:${state.stage}`; updateHud();presentAttack();draw();
  }
  function updateHud() {
    hp.text=`黎薇  ${state.heroHp}/${BATTLE_RULES.heroHp}`;enemyHp.text=`${state.stage===4?'赫恩':'敵人'}  ${state.enemyHp}/${STAGES[state.stage].hp}`;
    const w=viewport.height>viewport.width?500:320;
    charge.clear().rect(0,0,w,14).fill(0x172137).rect(0,0,w*state.charge,14).fill(state.charge>.75?0xe59b68:0x9b85c5);
    countdown.text=`敵人蓄力  ${Math.ceil((1-state.charge)*STAGES[state.stage].chargeMs/1000)} 秒`;
  }
  function activate(id:string) {
    if(disposed||!controls.has(id)||controls.get(id)!.control.disabled)return;
    if(id==='back'){onExit();return;}
    if(id==='fullscreen'){hooks.requestFullscreen?.();return;}
    if(id==='fight')model.start();else if(id==='pause')model.pause(true);else if(id==='resume')model.pause(false);
    else if(id==='continue')model.continue();else if(id==='retry'){model.retry();idle(hero);idle(king);}
    else if(id==='next-stage'){model.nextStage();idle(hero);idle(king);}
    else if(id.startsWith('answer:')){const [,turn,index]=id.split(':');model.answer(Number(turn),Number(index));}
    paint();
  }
  return { activate,
    resize(next:Viewport){viewport=next;paint();},
    focus(id:string|null){focused=id;controls.forEach((item,key)=>item.ring.visible=key===id);draw();},
    setFullscreen(value:boolean){fullscreen=value;paint();},
    setReduced(value:boolean){reduced=value;idle(hero,true);idle(king,true);presentAttack();draw();},
    hide(){if(state.phase==='playing'||state.phase==='resolving'){model.pause(true);paint();}},
    update(ms:number){
      if(disposed||state.paused)return;
      model.tick(ms);
      if(!reduced){const ticker={deltaMS:ms,deltaTime:ms*.06};[hero.sprite,king.sprite].forEach(sprite=>{if(sprite.playing)sprite.update(ticker);});}
      presentAttack();
      if(signature!==`${state.phase}:${state.turn}:${state.paused}:${state.stage}`){if(state.phase!=='resolving'){idle(hero);idle(king);}paint();}else updateHud();
    },
    destroy(){if(disposed)return;disposed=true;effects.clear();[hero.sprite,king.sprite].forEach(s=>{s.onComplete=null;s.stop();});root.destroy({children:true});art.destroy();},
  };
}
export type BattleView=ReturnType<typeof createBattleView>;
