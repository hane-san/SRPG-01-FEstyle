// Issues #92-#94: comparison profiles for the standalone trial screen (?sample=).
// Pure data and timing only. The main campaign never sets s.trial, so its enemy
// decisions, playback timing and saves stay exactly as before.
export const AI_PROFILES=Object.freeze({
 current:{label:'現行',note:'いつもの敵の動き'},
 line:{label:'戦線維持',note:'前衛は持ち場から2マス、弓は3マスまで。同じ味方へ集中しすぎない'},
 lure:{label:'釣り出し',note:'点線の範囲へ味方が入るまで動かない。追っても持ち場から6マスまで'}
});
export const HIT_PROFILES=Object.freeze({
 current:{label:'現行'},
 weighty:{label:'重め（B）'}
});
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
