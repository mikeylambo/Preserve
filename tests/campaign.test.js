import test from 'node:test';import assert from 'node:assert/strict';import {GUIDES} from '../src/guides.js';import {MAIN_ROOMS,ROOM_BY_ID} from '../src/rooms.js';import {verifyReplay} from '../src/replays.js';
for(const r of MAIN_ROOMS.slice(0,16))test('starting campaign clear at par or intended birdie: '+r.id,()=>{assert.ok(GUIDES[r.id]);const v=verifyReplay(GUIDES[r.id]);assert.ok(v.deaths<=r.par);if(!r.birdie)assert.equal(v.deaths,r.par);});
test('all shipped guide ghosts reproduce valid clears',()=>{for(const tape of Object.values(GUIDES))verifyReplay(tape);});
