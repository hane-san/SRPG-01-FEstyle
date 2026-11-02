// Issue #104: two original world themes for the trial styles, appended as No.43–46.
// Existing No.01–42 keep their numbers and notes. Melodies are scale degrees, two bars
// per eight-note phrase, exactly like music-extra.js; no samples or borrowed motifs.
const naturalMinor=[0,2,3,5,7,8,10],dorian=[0,2,3,5,7,9,10],harmonicMinor=[0,2,3,5,7,8,11],phrygian=[0,1,3,5,7,8,10];
// Machine-like: even ticks that stop on a long held note, like a press releasing.
const piston=[.5,.5,.5,.5,1,1,1,3],ratchet=[.5,.5,.5,.5,.5,.5,2,3];
// Song-like: a dotted lift and a long breath, for horns and voices across open land.
const hymn=[1.5,.5,1,1,.5,.5,1,2],resolve=[1,.5,.5,1,1,.5,.5,3];
export const THEME_SCORES=[
 {
  name:'煤と歯車の都',mood:'工業幻想｜煤けた街の哀愁と、それでも鳴りやまない行進',
  root:50,meter:4,lead:'strings',arp:'gear',
  ally:{title:'煤けた歯車の行進',bpm:112,scale:dorian,rhythm:piston,
   chords:[0,0,3,4,5,3,4,0],
   melody:[[0,0,2,0,3,2,1,0],[4,4,5,4,3,2,3,1],[5,5,7,5,6,4,5,2],[3,3,2,1,2,0,-1,0]],
   arpPattern:[0,4,0,7,0,4,0,5],arpVel:.07,leadVel:.3,padVel:.08,bassVel:.3,offbeatBassVel:.18,drumEvery:1,drumVel:.12},
  hostile:{title:'蒸気圧の限界',bpm:128,scale:phrygian,rhythm:ratchet,
   chords:[0,1,0,4,0,1,5,4],
   melody:[[0,1,0,1,3,1,0,-1],[0,1,3,4,3,1,0,1],[4,5,4,3,5,4,1,0],[3,1,0,-1,0,1,-2,0]],
   arpPattern:[0,0,4,0,1,0,4,7],arpVel:.08,padVel:.06,bassVel:.32,offbeatBassVel:.2,drumEvery:1,drumVel:.16}
 },
 {
  name:'角笛の古王国',mood:'写実寄り幻想｜物悲しくも勇ましい、広い野の進軍と決意',
  root:55,meter:4,lead:'horn',arp:'harp',
  ally:{title:'角笛の丘を越えて',bpm:96,scale:naturalMinor,rhythm:hymn,
   chords:[0,5,3,4,0,3,6,4],
   melody:[[4,2,3,4,7,6,4,2],[5,4,2,3,4,2,1,0],[4,7,9,8,7,6,7,4],[5,4,3,2,1,2,-1,0]],
   arpPattern:[0,2,4,7,9,7,4,2],arpVel:.08,leadArticulation:.96,leadVel:.33,padVel:.12,bassVel:.22,drumEvery:4,drumVel:.06},
  hostile:{title:'旗なき野の決意',bpm:116,scale:harmonicMinor,rhythm:resolve,
   chords:[0,4,5,4,0,3,1,4],
   melody:[[0,2,4,6,4,3,2,0],[1,2,3,4,6,4,2,1],[4,6,7,6,4,3,2,4],[3,2,1,0,1,-1,-2,0]],
   arpPattern:[0,4,2,4,5,4,2,1],arpVel:.07,padVel:.1,bassVel:.27,offbeatBassVel:.15,drumEvery:2,drumVel:.12}
 }
];
// Trial styles pick their own world theme (Issue #104); the campaign never does.
export const STYLE_THEME=Object.freeze({industrial:0,fantasy:1});
