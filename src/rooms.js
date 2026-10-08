export const ACTS=[{name:'Intake',color:0x71828b},{name:'Impact',color:0xd8382e},{name:'Thermal',color:0xd8382e},{name:'Compression',color:0xf0a64a},{name:'Cryogenic',color:0xf0a64a},{name:'Separation',color:0xdfe9f2},{name:'Power',color:0xdfe9f2},{name:'The Surface',color:0xb5c7db},{name:'Home',color:0xffd58a}];
const out=[];
class Grid{constructor(w=32,h=18){this.w=w;this.h=h;this.a=Array.from({length:h},()=>Array(w).fill('.'));this.rect(0,h-2,w,2,'#');this.rect(0,0,1,h,'#');this.rect(w-1,0,1,h,'#');}put(x,y,c){if(x>=0&&x<this.w&&y>=0&&y<this.h)this.a[y][x]=c;return this;}rect(x,y,w,h,c='#'){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)this.put(i,j,c);return this;}line(x,y,w,c){return this.rect(x,y,w,1,c);}rows(){return this.a.map(r=>r.join(''));}}
function room(act,n,name,par,build,extras={}){const g=new Grid(extras.width??32,extras.height??18);g.put(2,g.h-3,'S').put(g.w-3,g.h-3,'E');build(g);const id=`room.${act}.${n==='A'?'A':String(n).padStart(2,'0')}`;out.push({id,act,n,name,par,rows:g.rows(),...extras});}
const flat=(g,patches,ceiling=false)=>{for(const[x,w,c]of patches)g.line(x,g.h-2,w,c);if(ceiling)g.rect(1,g.h-4,g.w-2,1);};
const press=(g,x=13,floor=16,top=7,w=2)=>g.line(x,top,w,'K');
const wall=(g,x,y)=>{g.rect(x,y,g.w-1-x,g.h-2-y);g.put(g.w-3,g.h-3,'.').put(g.w-3,y-1,'E');};
const frost=(g,x=16,height=3)=>g.rect(x,16-height,3,height,'*');
const seed=(g,x,y)=>g.put(x,y,'o');
const shaft=(g,steps=1)=>{g.put(2,15,'.').put(11,3,'S');g.line(2,4,11,'#');g.line(2,6,3,'#').line(4,8,3,'#').line(2,10,3,'#').line(4,12,3,'#').line(2,14,3,'#');g.rect(12,5,1,10);g.rect(14,0,1,10);wall(g,14,16-(steps+2));};
room(0,1,'Intake',0,g=>{g.rect(10,15,3,1).rect(19,14,3,2);});
room(0,2,'The Drop',1,g=>shaft(g,1));
room(0,3,'Choose the Fall',1,g=>{shaft(g,1);g.line(7,10,3,'#');});
room(0,4,'Stack',2,g=>shaft(g,2),{birdie:true});
room(1,1,'First Coat',1,g=>flat(g,[[9,7,'^']]));
room(1,2,'Low Ceiling',2,g=>flat(g,[[9,6,'^']],true));
room(1,3,'Wall Coat',1,g=>{g.rect(14,13,1,3,'^');wall(g,15,13);});
room(1,4,'Into the Teeth',1,g=>{g.put(2,15,'.').put(11,3,'S');g.line(2,4,11,'#');g.line(2,6,3,'#').line(4,8,3,'#').line(2,10,3,'#').line(4,12,3,'#').line(2,14,3,'#');flat(g,[[13,7,'^']]);});
room(1,5,'Seed: Side Pocket',1,g=>{flat(g,[[9,7,'^']]);g.line(22,16,3,'^');seed(g,23,14);});
room(1,6,'Two Crossings',2,g=>{flat(g,[[7,7,'^'],[20,7,'^']]);g.line(16,12,2,'#');});
room(1,7,'Ceiling Coat',1,g=>{flat(g,[[9,3,'v']]);g.line(9,13,3,'^');});
room(1,8,'Shared Ground',3,g=>{flat(g,[[7,7,'^'],[20,7,'^']]);g.rect(15,15,3,1);},{birdie:true});
room(1,9,'Spike Stairs',3,g=>{g.line(7,16,7,'^');g.rect(14,14,5,2).line(14,14,5,'^');g.rect(19,12,11,4).line(19,12,7,'^');g.put(29,15,'.').put(29,11,'E');});
room(1,10,'Seed: Shaft',2,g=>{shaft(g,1);g.line(10,16,4,'^');seed(g,12,15);});
room(1,11,'Exact Spots',3,g=>flat(g,[[7,3,'^'],[15,3,'^'],[23,3,'^']],true));
room(1,12,'Impact Hall',5,g=>{flat(g,[[13,7,'^'],[29,7,'^'],[45,7,'^'],[61,7,'^'],[77,7,'^']]);g.line(4,5,7,'#');},{width:96,machine:'impact'});
room(1,'A','Anomaly: Blind Leap',4,g=>flat(g,[[7,18,'^']]),{anomaly:true,ace:true});
room(2,1,'Hot Strip',1,g=>flat(g,[[10,4,'f']],true));
room(2,2,'Sump Tunnel',2,g=>flat(g,[[9,3,'v'],[20,3,'v']],true));
room(2,3,'Deep Vat',2,g=>{flat(g,[[12,4,'v']],true);g.line(12,17,4,'v');});
room(2,4,'Long Burn',3,g=>flat(g,[[8,14,'f']]));
room(2,5,'Seed: Vat Pocket',1,g=>{flat(g,[[9,4,'f'],[22,4,'v']]);seed(g,23,14);});
room(2,6,'Grate Stairs',3,g=>{g.line(7,16,4,'f');g.rect(12,14,7,2).line(12,14,4,'f');g.rect(20,12,10,4);g.put(29,15,'.').put(28,11,'E');});
room(2,7,'Bonded Bridge',2,g=>flat(g,[[9,3,'^'],[12,4,'f']],true));
room(2,8,'Ember Gap',3,g=>flat(g,[[7,4,'f'],[14,3,'v'],[20,4,'f']]),{birdie:true});
room(2,9,'Furnace Ducts',3,g=>flat(g,[[7,2,'f'],[14,3,'v'],[23,2,'f']],true));
room(2,10,'Seed: Double Sump',1,g=>{flat(g,[[10,4,'v'],[23,3,'v']]);g.line(23,17,3,'v');seed(g,24,14);});
room(2,11,'Order of Burning',4,g=>flat(g,[[5,8,'f'],[15,3,'v'],[20,8,'f']]));
room(2,12,'The Furnace',5,g=>flat(g,[[10,8,'f'],[26,8,'f'],[42,8,'f'],[58,8,'f'],[74,8,'f']]),{width:96,machine:'furnace'});
room(2,'A','Anomaly: Ember Run',4,g=>{flat(g,[[7,18,'f']]);g.line(8,13,4,'#').line(19,13,4,'#');},{anomaly:true});
room(3,1,'First Press',1,g=>{press(g,14,16,7);wall(g,20,11);});
room(3,2,'Belt Feed',1,g=>{g.line(5,16,10,'>');press(g,14,16,6);wall(g,20,11);});
room(3,3,'Which Press',1,g=>{press(g,9,16,14);press(g,17,16,5);wall(g,22,11);});
room(3,4,'Pad Chain',2,g=>{press(g,9,16,5);g.rect(15,12,15,4);press(g,18,12,3);g.rect(24,8,6,4);g.put(29,15,'.').put(28,7,'E');});
room(3,5,'Seed: Housing',1,g=>{press(g,13,16,5);wall(g,19,11);seed(g,14,10);});
room(3,6,'Spike Press',2,g=>{flat(g,[[6,7,'^']]);press(g,17,16,5);wall(g,22,11);});
room(3,7,'Belt to Spikes',2,g=>{g.line(2,16,5,'>');flat(g,[[7,7,'^']]);press(g,17,16,5);wall(g,22,11);});
room(3,8,'Overleap',3,g=>{press(g,7,16,4);flat(g,[[11,7,'^']]);press(g,20,16,5);wall(g,25,11);},{birdie:true});
room(3,9,'Splat or Pad',1,g=>{shaft(g,1);press(g,12,16,5);});
room(3,10,'Seed: Stacked',2,g=>{press(g,13,16,4);wall(g,18,11);g.line(12,9,2,'#');seed(g,12,8);});
room(3,11,'Hot Belt',2,g=>{flat(g,[[7,6,'f']]);g.line(14,16,7,'>');press(g,19,16,5);wall(g,24,11);});
room(3,12,'The Great Press',5,g=>{for(let k=0;k<5;k++){press(g,14+k*16,16,3,2);g.rect(18+k*16,11,k===4?13:8,5);}g.put(93,15,'.').put(93,10,'E');},{width:96,machine:'press'});
room(3,'A','Anomaly: Piston Organ',1,g=>{g.line(2,16,18,'>');for(const x of [5,9,13,17,21,25])press(g,x,16,3,1);wall(g,27,11);},{anomaly:true});
room(4,1,'First Frost',2,g=>{frost(g,15,4);wall(g,18,12);});
room(4,2,'Slide and Stop',1,g=>{g.line(3,16,13,'s');frost(g,16,3);wall(g,19,13);});
room(4,3,'Ice Stairs',3,g=>{frost(g,15,5);wall(g,18,11);});
room(4,4,'Thaw',1,g=>{flat(g,[[12,4,'v']]);frost(g,12,2);g.put(16,15,'f');});
room(4,5,'Launch',2,g=>{press(g,13,16,4);frost(g,13,6);wall(g,18,11);g.line(12,7,4,'#');});
room(4,6,'Seed: Keep Moving',0,g=>{frost(g,13,3);seed(g,14,15);});
room(4,7,'Frozen Sump',2,g=>{flat(g,[[10,4,'v'],[20,4,'v']],true);g.line(10,15,14,'*');});
room(4,8,'Splat on Ice',3,g=>{shaft(g,2);frost(g,11,5);},{birdie:true});
room(4,9,'Hard Coat',2,g=>flat(g,[[9,3,'^'],[12,4,'f'],[23,3,'^']]));
room(4,10,'Seed: Overhang',2,g=>{press(g,14,16,3);frost(g,14,5);wall(g,20,11);seed(g,15,9);});
room(4,11,'Cold Chain',3,g=>{frost(g,8,3);g.rect(11,13,7,3);g.line(11,13,6,'f');g.rect(18,11,12,5);g.put(29,15,'.').put(28,10,'E');});
room(4,12,'The Cryo Hall',6,g=>{for(let x=12;x<84;x+=14){frost(g,x,4);g.rect(x+3,13,6,3);}wall(g,88,12);},{width:96,machine:'cryo'});
room(4,'A','Anomaly: Absolute Zero',4,g=>{g.rect(2,10,26,6,'*');g.put(2,15,'S').put(5,15,'f');wall(g,26,10);},{anomaly:true});
room(5,1,'First Split',0,g=>{g.put(7,15,'|');g.rect(15,14,1,2,'h');});
room(5,2,'Leave a Piece',1,g=>{g.put(7,15,'|');flat(g,[[14,5,'^']]);});
room(5,3,'Half Gaps',1,g=>{g.put(7,15,'|');g.rect(12,14,1,2,'h');flat(g,[[18,2,'v']],true);});
room(5,4,'Die Here, Go There',1,g=>{g.put(6,15,'|');press(g,14,16,4);wall(g,20,11);});
room(5,5,'Seed: Small Door',0,g=>{g.put(6,15,'|');g.rect(15,14,1,2,'h');seed(g,20,15);});
room(5,6,'Resplit',1,g=>{g.put(6,15,'|');g.rect(21,14,1,2,'|');g.rect(25,14,1,2,'h');});
room(5,7,'Small Fill',2,g=>{g.put(6,15,'|');g.rect(10,14,1,2,'h');flat(g,[[17,4,'v']],true);});
room(5,8,'Whole Again',3,g=>{g.put(6,15,'|');flat(g,[[12,5,'^'],[22,3,'v']]);},{birdie:true});
room(5,9,'Half Steps',2,g=>{shaft(g,1);g.rect(11,5,1,7,'|');});
room(5,10,'Seed: Spike Pocket',1,g=>{g.put(7,15,'|');flat(g,[[15,1,'^']]);seed(g,15,15);});
room(5,11,'Two Places at Once',2,g=>{g.put(6,15,'|');g.rect(10,14,1,2,'h');flat(g,[[15,2,'v'],[23,2,'v']],true);});
room(5,12,'The Separator',6,g=>{for(const x of [8,22,36,50,64,78]){g.rect(x,13,1,3,'|');g.rect(x+7,14,1,2,'h');}},{width:96,machine:'separator'});
room(5,'A','Anomaly: Halves Apart',3,g=>{g.put(7,15,'|');flat(g,[[13,4,'^'],[22,4,'v']],true);},{anomaly:true});
room(6,1,'First Strand',1,g=>{g.put(10,15,'w');g.rect(20,1,1,15,'D');});
room(6,2,'Lift',1,g=>{g.put(10,15,'w');g.put(15,15,'L');wall(g,20,9);},{liftTop:9});
room(6,3,'Tightrope',1,g=>{g.put(6,15,'|');flat(g,[[13,4,'v']]);g.line(13,15,4,'w');});
room(6,4,'Water Short',1,g=>{g.put(2,15,'.').put(14,15,'S').put(12,15,'w').put(12,14,'~');g.rect(16,1,1,15,'D');});
room(6,5,'Seed: Updraft',1,g=>{g.put(10,15,'w');seed(g,17,8);g.line(20,10,6,'#');},{fan:{x:16}});
room(6,6,'Two Circuits',2,g=>{g.put(9,15,'w');g.rect(13,1,1,15,'D');g.put(20,15,'w');g.rect(24,1,1,15,'D');},{circuitDoors:Object.fromEntries(Array.from({length:15},(_,i)=>[`24,${i+1}`,2]))});
room(6,7,'Powered Press',2,g=>{g.put(9,15,'w');press(g,16,16,4);wall(g,22,11);},{poweredPress:true});
room(6,8,'Short Gap',3,g=>{g.put(7,15,'w').put(15,15,'w').put(23,15,'w');g.rect(27,1,1,15,'D');},{birdie:true,circuitDoors:Object.fromEntries(Array.from({length:15},(_,i)=>[`27,${i+1}`,3]))});
room(6,9,'Flooded Deck',2,g=>{g.line(9,15,4,'~');g.rect(14,13,3,3,'*');g.put(17,15,'w');g.rect(23,1,1,15,'D');});
room(6,10,'Seed: Lift and Crust',2,g=>{g.put(9,15,'w').put(15,15,'L');g.rect(19,10,11,6);g.line(19,10,4,'f');g.put(29,15,'.').put(28,9,'E');seed(g,24,9);},{liftTop:10});
room(6,11,'Everything',4,g=>{flat(g,[[5,5,'^'],[12,4,'f']]);press(g,18,16,4);frost(g,21,4);g.put(26,15,'w');g.rect(28,1,1,15,'D');});
room(6,12,'The Main Breaker',7,g=>{g.put(7,51,'w').put(19,35,'w').put(7,19,'w');g.put(12,51,'L').put(23,35,'L').put(12,19,'L');g.line(17,36,12,'#').line(3,20,14,'#').line(17,4,12,'#');g.put(29,51,'.').put(25,3,'E');},{height:54,machine:'breaker',liftTop:4});
room(6,'A','Anomaly: Short Circuit',4,g=>{g.put(9,15,'w').put(9,14,'~');g.rect(12,13,3,3,'*');g.put(20,15,'w').put(20,14,'~');g.rect(24,1,1,15,'D');},{anomaly:true});
room(7,1,'The Hatch',1,g=>flat(g,[[10,7,'^']]),{wind:true});
room(7,2,'Fence Line',1,g=>{flat(g,[[8,7,'v']]);g.line(11,15,1,'#');g.rect(19,14,2,2).rect(25,13,2,3);},{wind:true});
room(7,3,'Bonfire',2,g=>flat(g,[[8,10,'f']]),{wind:true});
room(7,4,'Old Well',2,g=>{flat(g,[[12,4,'v']],true);g.line(12,17,4,'v');});
room(7,5,'Seed: Hollow Tree',1,g=>{flat(g,[[9,7,'^']]);seed(g,14,14);});
room(7,6,'Orchard',3,g=>{flat(g,[[6,7,'^'],[20,7,'^']]);g.line(15,10,3,'#');},{wind:true});
room(7,7,'Fallen Line',2,g=>{g.rect(8,13,3,3,'*');g.put(12,15,'w').put(12,14,'~');g.rect(20,1,1,15,'D');});
room(7,8,'Carried',3,g=>{g.put(6,15,'|');flat(g,[[12,8,'v']]);},{wind:true,birdie:true});
room(7,9,'Frost Meadow',3,g=>{frost(g,14,5);wall(g,17,11);},{sun:true});
room(7,10,'Seed: Creek',2,g=>{flat(g,[[8,4,'v'],[17,4,'v']]);g.line(8,15,13,'*');seed(g,18,14);});
room(7,11,'Last Hill',4,g=>{flat(g,[[5,6,'^'],[13,5,'f']]);press(g,20,16,4);wall(g,25,11);},{wind:true});
room(7,12,'The Mill',7,g=>{flat(g,[[10,7,'^'],[26,8,'f'],[42,4,'v']]);g.put(54,15,'w').put(54,14,'~');press(g,68,16,4);press(g,83,16,3);wall(g,88,11);},{width:96,machine:'mill',wind:true});
room(7,'A','Anomaly: Long Way Round',5,g=>{flat(g,[[7,7,'^'],[23,8,'f'],[39,4,'v']]);press(g,52,16,4);wall(g,59,11);},{width:64,anomaly:true,wind:true});
room(8,1,'Porch',0,g=>{g.rect(8,15,5,1).rect(16,14,5,2).rect(24,13,6,3);g.put(29,15,'.').put(28,12,'E');});
room(8,2,'Kitchen Floor',0,g=>{g.rect(14,15,2,1);});
room(8,3,'Chair',0,g=>{for(let i=0;i<5;i++)g.rect(6+i*4,15-i,4,i+1);g.put(29,15,'.').put(27,10,'E');});
room(8,4,'Tablecloth',0,g=>{for(let i=0;i<6;i++)g.rect(5+i*4,15-i,4,i+1);g.put(29,15,'.').put(28,9,'E');});
room(8,5,'Table',0,g=>{g.rect(10,15,2,1).rect(18,14,2,2);});
room(8,6,'The Jar',0,g=>{g.rect(20,15,4,1).rect(24,14,6,2);g.put(29,15,'.').put(27,13,'E');});
// Keep the six proven prototype grids and their exact movement-space geometry.
const O='#..................#';const reference=[
['room.1.01',1,['####################',O,O,O,O,O,O,O,O,'#.S..............E.#','######^^^^^^^#######','####################']],
['room.2.02',2,['####################',O,O,O,O,O,O,O,'#...############...#','#S................E#','######vvv###vvv#####','####################']],
['room.2.04',3,['####################',O,O,O,O,O,O,O,O,'#.S..............E.#','###ffffffffffffff###','####################']],
['room.3.01',1,['####################','#..........KK......#',O,O,'#................E.#','#.............######','#.............######','#.............######','#.............######','#.S...........######','####################','####################']],
['room.4.01',2,['####################',O,O,O,O,'#..............E...#','#..........#########','#..........#########','#.......***#########','#.S.....***#########','####################','####################']],
['room.3.06',2,['####################','#...........KK.....#',O,O,'#................E.#','#..............#####','#..............#####','#..............#####','#..............#####','#S.............#####','####^^^^^^^#########','####################']]
];
for(const[id,par,rows]of reference){const r=out.find(r=>r.id===id);r.rows=rows;r.par=par;r.reference=true;}
// Third seed rooms retain all three sublevel pips, without changing the main route.
for(let act=1;act<=7;act++){const r=out.find(r=>r.act===act&&r.n===8);const a=r.rows.map(r=>[...r]);let x=3,y=a.length-3;if(a[y][x]==='.')a[y][x]='o';r.rows=a.map(r=>r.join(''));}
export const ROOMS=Object.freeze(out);
export const MAIN_ROOMS=ROOMS.filter(r=>!r.anomaly);
export const ROOM_BY_ID=Object.fromEntries(ROOMS.map(r=>[r.id,r]));
