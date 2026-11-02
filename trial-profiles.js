// Issues #92-#94: comparison profiles for the standalone trial screen (?sample=).
// Pure data and timing only. The main campaign never sets s.trial, so its enemy
// decisions, playback timing and saves stay exactly as before.
export const AI_PROFILES=Object.freeze({
 current:{label:'現行',note:'いつもの敵の動き'},
 line:{label:'戦線維持',note:'前衛は持ち場から2マス、弓は3マスまで。同じ味方へ集中しすぎない'},
 lure:{label:'釣り出し',note:'点線の範囲へ味方が入るまで動かない。追っても持ち場から6マスまで'}
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
