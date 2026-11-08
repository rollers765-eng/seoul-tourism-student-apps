const assert=require('node:assert/strict');
class V {constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj {constructor(...a){this.position=new V();this.scale=new V();this.rotation=new V();this.children=[];this.userData={};this.material=a[1]||{};}add(x){this.children.push(x)}remove(x){this.children=this.children.filter(c=>c!==x)}lookAt(){}}
class Material {constructor(props={}){Object.assign(this,props)}dispose(){}}
class Texture {constructor(){}dispose(){}}
class Geometry {dispose(){}}
const T={Scene:Obj,Group:Obj,Mesh:Obj,Sprite:Obj,PerspectiveCamera:Obj,HemisphereLight:Obj,DirectionalLight:Obj,Color:class{},MeshStandardMaterial:Material,MeshBasicMaterial:Material,SpriteMaterial:Material,BoxGeometry:Geometry,SphereGeometry:Geometry,CylinderGeometry:Geometry,PlaneGeometry:Geometry,CanvasTexture:Texture,DoubleSide:2};
global.innerWidth=1200;global.innerHeight=800;global.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
const world=require('../interview-metaverse/world.js');const {createWorld}=require('../interview-metaverse/scene.js');const w=createWorld(T,{},world);assert(w.scene&&w.player&&w.camera);assert.equal(w.player.userData.parts.legs.length,2);w.setPose(w.player,true);assert.equal(w.player.userData.sitting,true);w.setPose(w.player,false);assert.equal(w.player.userData.sitting,false);w.animate(w.player,1000,true,false,null);assert.notEqual(w.player.userData.parts.legs[0].rotation.x,0);
// The back of an interview chair is south of its seat, so it faces the teachers to the north.
assert(w.scene.children.some(o=>o.position.x===world.centers.cafe&&o.position.y===.78&&Math.abs(o.position.z-(-1.8+.38))<1e-9));
w.animate(w.player,1000,false,false,'pray');assert(w.player.userData.parts.arms[0].rotation.z>0);assert(w.player.userData.parts.arms[1].rotation.z<0);
console.log('scene construction, seat direction and avatar motion pass (mock renderer)');
