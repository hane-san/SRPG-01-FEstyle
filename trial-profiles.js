// Issues #92-#94: comparison profiles for the standalone trial screen (?sample=).
// Pure data and timing only. The main campaign never sets s.trial, so its enemy
// decisions, playback timing and saves stay exactly as before.
export const AI_PROFILES=Object.freeze({
 current:{label:'現行',note:'いつもの敵の動き'},
 line:{label:'戦線維持',note:'前衛は持ち場から2マス、弓は3マスまで。同じ味方へ集中しすぎない'},
 lure:{label:'釣り出し',note:'点線の範囲へ味方が入るまで動かない。追っても持ち場から6マスまで'},
 mixed:{label:'混成（進軍・迎撃・守備）',note:'敵IDごとに役割を固定。進軍役は接近、迎撃役は感知して追跡、守備役は持ち場を維持。役割一覧で条件を確認できます'}
});
export const HIT_PROFILES=Object.freeze({
 crystal:{label:'連鎖破砕（標準）'},
 current:{label:'以前'},
 weighty:{label:'重め（B）'}
});
// Issue #101: the campaign and the trial screen both start on the crystal sequence.
export const DEFAULT_HIT='crystal';
// Lure trial: an enemy wakes when an ally comes this close to its post.
export const LURE_WAKE=4,LURE_LEASH=6,LINE_REACH=2,LINE_REACH_RANGED=3,LINE_FOCUS_PENALTY=8;
export const aiProfile=s=>Object.hasOwn(AI_PROFILES,s?.trial?.ai)?s.trial.ai:'current';

// Issue #107 / #93: assignments are keyed by map and stable enemy ID, never by
// class or array order. Only the standalone mixed trial reads this table.
const advance=Object.freeze({kind:'advance',label:'進軍'});
const territory=Object.freeze({kind:'territory',label:'縄張り迎撃'});
const guard=radius=>Object.freeze({kind:'guard',label:'局所守備',radius});
export const MIXED_ROLES=Object.freeze({
 0:Object.freeze({e1:advance,e2:guard(2),e3:guard(1),e4:advance,e5:territory,boss:guard(0)}),
 3:Object.freeze({
  'extra-3-0-0':guard(1),'extra-3-0-1':territory,'extra-3-0-2':advance,
  'extra-3-1-0':guard(1),'extra-3-1-1':territory,'extra-3-1-2':guard(2),'extra-3-1-3':territory,
  'extra-3-2-0':advance,'extra-3-2-1':territory,'extra-3-2-2':guard(2),'extra-3-2-3':guard(1),boss:guard(0)
 })
});
export function mixedRole(s,e){
 if(s?.trial?.ai!=='mixed'||e?.team!=='enemy'||!Object.hasOwn(MIXED_ROLES,s.map.id))return null;
 const roles=MIXED_ROLES[s.map.id];return Object.hasOwn(roles,e.id)?roles[e.id]:null;
}
export function roleNote(role){
 if(!role)return '現行の行動を維持（側面迂回は後続試作）';
 if(role.kind==='advance')return '盤上の味方へ接近。予備は追わない';
 if(role.kind==='guard')return `持ち場から${role.radius}マス以内で迎撃。敵がいなければ持ち場へ戻る`;
 return `持ち場から${LURE_WAKE}マスで感知、${LURE_LEASH}マスまで追跡。味方が追跡域＋射程から離れると帰還`;
}

// Hit-feel B: an ordinary (non-heavy) hit holds a moment and lingers a little longer.
// Fast and Reduced Motion are untouched; heavy hits already carry their own hit-stop.
export const WEIGHTY_HOLD_MS=28,WEIGHTY_LINGER_MS=22;
export function weightySchedule(plan,schedule,{fast=false,reduced=false,heal=false}={}){
 if(fast||reduced||heal||plan.heavy||!plan.count)return schedule;
 return {...schedule,hitStopMs:Math.max(schedule.hitStopMs,WEIGHTY_HOLD_MS),finishMs:schedule.finishMs+WEIGHTY_LINGER_MS};
}

// Issue #101: "slash → number → enlarged gems break one by one". The number holds
// alone first, then each lost gem breaks on a readable beat; more damage means
// denser breaks, never an ever-longer wait. Fast and Reduced Motion keep their timing.
export const CRYSTAL_NUMBER_MS=150,CRYSTAL_FINISH_MS=80,CRYSTAL_IMPACT_MS=24;
export const crystalInterval=count=>count<=2?130:count===3?105:count===4?85:70;
export function crystalSchedule(plan,schedule,{fast=false,reduced=false,heal=false}={}){
 if(fast||reduced||heal||!plan.count)return {...schedule,crystal:false};
 return {...schedule,crystal:true,hitStopMs:plan.heavy?schedule.hitStopMs:Math.max(schedule.hitStopMs,CRYSTAL_IMPACT_MS),
  firstDelayMs:CRYSTAL_NUMBER_MS,intervalMs:crystalInterval(plan.count),finishMs:CRYSTAL_FINISH_MS};
}
// Issue #101-B: after an enemy-phase hit, a short beat to read who lost what.
// It replaces nothing in the crystal sequence and is zero in Fast and Reduced Motion.
export const ENEMY_BEAT_MS=170;
export const enemyBeat=({fast=false,reduced=false,enemyPhase=false})=>enemyPhase&&!fast&&!reduced?ENEMY_BEAT_MS:0;
// Issue #101-C: an HP1 gem breathes slowly (1.5s period); Reduced Motion gets a static ring.
export const LOW_HP_PERIOD_MS=1500;
export const lowHpPulse=(time,reduced=false)=>reduced?{static:true,amount:0}:{static:false,amount:.5-.5*Math.cos(time/LOW_HP_PERIOD_MS*Math.PI*2)};
