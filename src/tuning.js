export const TUNE = Object.freeze({ step:1/240, size:.76, halfSize:.5, run:6.5, halfRun:6, acceleration:70, friction:60, air:45, gravity:38, terminal:20, jump:13, halfJump:13*Math.sqrt(.75), jumpCut:.5, coyote:.09, buffer:.12, respawn:.55, fall:7, pad:21, frost:.45, iceMelt:1.5, short:1 });
export const VERSION='0.1.0';
export function golfName(deaths,par){if(deaths===0&&par>0)return 'Ace';const d=deaths-par;return d<=-3?'Albatross':d===-2?'Eagle':d===-1?'Birdie':d===0?'Par':d===1?'Bogey':d===2?'Double bogey':`+${d}`;}
