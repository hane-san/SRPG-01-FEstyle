import * as E from './engine.js?v=0.8.0-issue17-p3-26-sortie29-map38-m02-war43-m02gate57-m04bridge58-m03guard59-m06phase63-m04cross66-m05rain61-garrison23-classes68-balance72';
import {unit} from './data.js?v=0.8.0-issue17-p3-26-sortie29-map38-m02-war43-m02gate57-m04bridge58-m03guard59-m06phase63-m04cross66-m05rain61-garrison23-classes68-balance72';
import {render} from './render.js?v=trial90-lab';
import {createPlayback} from './playback.js?v=0.8.0-issue17-sortie29-gems28-flick35-fx39-weapon48';

export const LAB_CASES=Object.freeze([
 {id:'normal',label:'軽装の一撃',note:'攻撃2と、射程内の生存者の反撃。'},
 {id:'armour',label:'重装が受ける',note:'同じ攻撃2を軽減1で受け、割れるHPは1個。'},
 {id:'overkill',label:'残HP1を撃破',note:'攻撃2でも、割れる結晶は残りの1個だけ。'},
 {id:'support',label:'静止してP3砲撃',note:'静止待機→P3。距離3の砲撃は1ダメージ、弾薬1消費。'},
 {id:'heal',label:'静止してP3治療',note:'隣接した味方1隊をHP3→5へ。弾薬1消費。'},
 {id:'moved',label:'移動してP3なし',note:'同じ砲兵でも、動いて待機したターンは支援も弾薬消費もなし。'}
]);
export function createLabScenario(kind){
 if(!LAB_CASES.some(c=>c.id===kind))throw Error('Unknown lab scenario');
 const state=E.createGame();
 state.map={...state.map,w:8,h:7,tiles:Array.from({length:7},()=>Array(8).fill('.')),goal:{x:7,y:0},camp:null,base:null,south:null,cannon:null,spawns:[]};
 const support=kind==='support'||kind==='moved',heal=kind==='heal';
 const actor=unit({id:'lab-a',name:support?'砲兵':heal?'魔術師':'軽装兵',type:support?'shooter':heal?'mage':'sword',x:3,y:4},'ally');
 const target=unit({id:'lab-b',name:heal?'負傷した味方':'標的',type:kind==='armour'?'shield':'sword',x:3,y:support?1:3,ai:'hold'},heal?'ally':'enemy');
 if(kind==='overkill')target.hp=1;
 if(heal)target.hp=3;
 state.units=[actor,target];
 const initial=structuredClone(state),frames=[];
 const record=(s,_u,event)=>{if(event&&event.kind!=='settled')frames.push({state:structuredClone(s),event});};
 const result=support||heal?E.act(state,actor.id,kind==='moved'?{x:4,y:4}:actor,'wait',null,record):E.act(state,actor.id,actor,'attack',target.id,record);
 if(!result.ok)throw Error(result.error);
 if(support||heal)E.supportPhase(state,record);
 return {initial,frames,resolved:state};
}

export function openTacticalLab({modal,button,sound,isFast,isReduced,theme=null}){
 modal('<h2>戦術実験室</h2><p>同じHP6で、攻撃・軽減・静止支援を見比べます。下の場面を選ぶと実戦と同じ処理と演出で再生します。</p><canvas id="tacticalLabCanvas" aria-label="独立した戦術比較盤面"></canvas><p id="tacticalLabStatus" role="status" aria-live="polite">場面を選んでください</p><div id="tacticalLabControls" class="trial-grid"></div><p class="hint">戦場へ戻ると元の戦闘を続けられます。本編の部隊・ターン・セーブには影響しません。</p>');
 const canvas=document.getElementById('tacticalLabCanvas'),status=document.getElementById('tacticalLabStatus'),controls=document.getElementById('tacticalLabControls');
 const dialog=canvas.closest('dialog');let busy=false,generation=0;
 let current=createLabScenario('normal').initial;
 const view={tile:32,sampleTheme:theme};
 const visible=()=>canvas.isConnected&&dialog.open;
 const draw=()=>{if(visible())render(canvas,current,view);};
 // Leaving the modal invalidates this replay's sound and callbacks immediately.
 dialog.addEventListener('close',()=>{generation++;},{once:true});
 draw();
 async function run(spec){
  if(busy||!visible())return;busy=true;const token=++generation;
  const {initial,frames,resolved}=createLabScenario(spec.id);current=initial;
  for(const b of controls.children)b.disabled=true;
  status.textContent=spec.note;draw();
  const active=()=>token===generation&&visible();
  const player=createPlayback({getState:()=>current,setState:state=>{current=state;},view,draw,
   sound:{play:(...args)=>{if(active())sound.play(...args);}},isFast:()=>!active()||isFast(),isReduced,
   onCombat:(_before,after,event,stage)=>{if(active()&&stage==='impact')status.textContent=spec.note+' '+after.units.map(u=>`${u.name} HP${u.hp}/6`).join(' ／ ');}
  });
  try{await player.play(frames);current=resolved;draw();
   if(active())status.textContent=spec.note+' '+resolved.units.map(u=>`${u.name} HP${u.hp}/6${u.maxCharges?`・弾薬${u.charges}`:''}`).join(' ／ ');
  }catch{if(active())status.textContent='演出を再生できませんでした。もう一度場面を選んでください。';}
  finally{player.clear();busy=false;if(active())for(const b of controls.children)b.disabled=false;}
 }
 for(const spec of LAB_CASES){const b=button(spec.label,()=>run(spec),'subtle');b.dataset.labCase=spec.id;controls.append(b);}
}
