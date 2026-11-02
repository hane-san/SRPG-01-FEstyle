// Reproducible, adaptive test policies, not fixed-command replays or optimal play.
import {play} from './simulate.mjs';
import {MIXED_ROLES} from '../trial-profiles.js';
for(const map of [0,3])for(const ai of ['current','mixed'])for(const policy of ['advance','cautious','fast','west','central',...(map===3?['east']:[])]){
 const {result:r}=play(map,policy,{},35,[],null,ai);
 const roles={};for(const role of Object.values(MIXED_ROLES[map]))roles[role.kind]=(roles[role.kind]||0)+1;
 console.log(JSON.stringify({map:map+1,ai,profileVersion:1,policy,roles:ai==='mixed'?roles:null,
  status:r.status,turn:r.turn,commands:r.commands,firstCombatTurn:r.firstCombatTurn,
  noCombatTurns:r.tactical.noCombatTurns,allyDeaths:r.tactical.allyDeaths.length,p3:r.tactical.p3Effects,
  firstTurnEnemyAttacks:r.tactical.firstTurnEnemyAttacks}));
}
