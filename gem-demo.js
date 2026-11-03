import {hpHalves} from './hp-jewels.js?v=half113';
import {createPlayback} from './playback.js?v=half113';

const scenarios=[
 {label:'1ダメージ',start:6,amount:1},
 {label:'2ダメージ',start:6,amount:2},
 {label:'3ダメージ',start:6,amount:3},
 {label:'4ダメージ・強打',start:6,amount:4},
 {label:'5ダメージ・強打',start:6,amount:5},
 {label:'奇数HP：5→3',start:5,amount:2},
 {label:'重装：攻撃3→被害2',start:6,amount:2,armoured:true},
 {label:'敵を撃破（HP2）',start:2,amount:3},
 {label:'味方が戦死（HP2）',start:2,amount:3,ally:true},
 {label:'2ジュエル回復',start:2,amount:2,heal:true}
];
// Audition uses the SAME playback as combat, with isolated presentation fixtures.
// No commands, game save, roster or progression are read or changed here.
export function openGemDemo({modal,sound,button}){
 modal('<h2>💎 HPジュエル破砕・試聴</h2><p class="hint">宝石1個でHP2、半分でHP1。命中で減る分が薄色になり、半分ずつ砕けます。撃破は最後にためて破裂します。</p><div id="gemDemoBoard" class="gem-demo-board"><div id="gemDemoStatus" role="status" aria-live="polite">HP 6 / 6</div><div id="gemDemoPips" class="gem-demo-pips" role="img" aria-label="残りHP6"></div><div id="gemDemoMessage">比べたい演出を選んでください</div></div><div id="gemDemoControls" class="gem-demo-controls"></div><p class="hint">実戦と同じ時計・音・破砕順で試聴します。2ダメージは半分を2回。重装は防いだ分まで割れません。SE OFFなら無音です。</p>');
 const container=document.getElementById('gemDemoBoard'),status=document.getElementById('gemDemoStatus'),pips=document.getElementById('gemDemoPips'),message=document.getElementById('gemDemoMessage'),controls=document.getElementById('gemDemoControls');
 const dialog=container.closest('dialog');let busy=false;
 const active=()=>container.isConnected&&dialog.open;
 // Keep each half element alive while its CSS fracture/reform animation runs.
 const elements=Array.from({length:3},()=>{
  const gem=document.createElement('span');gem.className='gem-demo-jewel';gem.setAttribute('aria-hidden','true');
  const pair=[document.createElement('span'),document.createElement('span')];gem.append(...pair);pips.append(gem);return pair;
 }).flat();
 const setHP=(hp,{pendingEnd=hp,index=-1,heal=false,ally=false}={})=>{
  const halves=hpHalves(hp,pendingEnd);
  for(const half of halves){
   const span=elements[half.index],classes=`gem-demo-half ${half.side} ${half.filled?'intact':'gone'}${half.pending?' pending':''}${half.index===index?(heal?' reforming':' breaking'):''}${ally?' ally':''}`;
   if(span.className!==classes)span.className=classes;
  }
  container.dataset.hp=String(hp);status.textContent='HP '+hp+' / 6';pips.setAttribute('aria-label','残りHP'+hp+'、宝石3個・半分でHP1');
 };
 setHP(6);
 async function run(spec){
  if(busy||!active())return;busy=true;
  for(const b of controls.children)b.disabled=true;
  const target={id:'demo-target',name:spec.ally?'味方':'標的',label:'軽装兵',type:'sword',team:spec.ally||spec.heal?'ally':'enemy',x:0,y:0,hp:spec.start,alive:true,def:spec.armoured?1:0};
  const actor={id:'demo-actor',name:'攻撃役',label:'軽装兵',type:spec.heal?'mage':'sword',team:'ally',x:0,y:1,hp:6,alive:true};
  let shown={units:[actor,target],phase:1};const view={};
  const end=spec.heal?Math.min(6,spec.start+spec.amount):Math.max(0,spec.start-spec.amount);
  const result={...shown,units:[actor,{...target,hp:end,alive:end>0}]};
  const pb=createPlayback({hitProfile:()=>'halves',getState:()=>shown,setState:s=>{shown=s;},view,
   isFast:()=>!active(),isReduced:()=>matchMedia('(prefers-reduced-motion: reduce)').matches,
   sound:{play:(...args)=>{if(active())sound.play(...args);}},
   draw:()=>{
    if(!active())return;const frame=view.jewel,hp=frame?.hp??shown.units[1].hp;
    setHP(hp,{...frame,ally:!!spec.ally});const stage=view.animation?.stage||'done';container.dataset.stage=stage;
    message.textContent=stage==='damage'?'命中！ 薄色の分が砕けます':stage==='defeat-hold'?'HP0 · ひびに光が集まる…':stage==='collapse'?'破裂！':stage==='shatter'?`パリン！ ${view.animation.index} / ${spec.start-end}`:stage==='reform'?'半分ずつ再生':stage==='done'?(spec.heal?'回復完了':end===0?'HP0 · '+(spec.ally?'味方離脱':'敵撃破'):`HP ${end} / 6`):'構え → 打撃';
   }
  });
  try{
   setHP(spec.start);sound.unlock();
   await pb.play([{state:result,event:{kind:spec.heal?'heal':'hit',actor:actor.id,target:target.id,amount:spec.amount}}]);
  }catch{if(active())message.textContent='再生を終了しました。もう一度選べます。';}
  finally{pb.clear();busy=false;if(active())for(const b of controls.children)b.disabled=false;}
 }
 for(const spec of scenarios)controls.append(button(spec.label,()=>run(spec),'subtle'));
}
