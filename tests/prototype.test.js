import test from 'node:test';import assert from 'node:assert/strict';import {plans} from './prototype-plans.js';import {DeathMaterials} from '../src/simulation.js';import {ROOM_BY_ID} from '../src/rooms.js';import {appendInput,inputBits,verifyReplay} from '../src/replays.js';
plans[2].splice(plans[2].length-1,0,[{r:1},'pl.x>13.8',2],[{r:1,j:1},'WON',4,1]);plans[2].pop();
plans[5].splice(7,1,[{r:1},'pl.x>12.8',2],[{},'pl.dead>0',5]);
const refs=['room.1.01','room.2.02','room.2.04','room.3.01','room.4.01','room.3.06'];
import {runPlan} from './plan-runner.js';
for(let i=0;i<refs.length;i++)test('prototype movement and par: '+refs[i],()=>{const{world,runs,log}=runPlan(refs[i],plans[i]);assert.equal(world.won,true,JSON.stringify(log));assert.equal(world.deaths,world.room.par,JSON.stringify(log));verifyReplay({version:'0.1.0',roomId:refs[i],deaths:world.deaths,ticks:world.tick,inputs:runs});});
