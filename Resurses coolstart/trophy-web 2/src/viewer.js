import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTrophy, createStateMaterials } from './model.js';
import { createCelebration } from './celebration.js';

export function mountTrophy(host,options={}) {
  const canvas=document.createElement('canvas');
  Object.assign(canvas.style,{width:'100%',height:'100%',display:'block',touchAction:'none'});
  canvas.setAttribute('aria-label','Золотой кубок с клевером. Перетащите для вращения; используйте кнопки ракурсов и масштаба.');
  canvas.setAttribute('role','img');host.append(canvas);
  let renderer;
  try {renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});}
  catch(e){canvas.remove();const error=document.createElement('p');error.setAttribute('role','alert');error.textContent='Для просмотра нужен браузер с WebGL. Откройте файл в Safari, Chrome или Firefox.';host.append(error);throw e;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(33,1,.1,60);
  const target=new THREE.Vector3(0,1.5,0);
  camera.position.set(2.4,4.0,7.65);
  const controls=new OrbitControls(camera,canvas);controls.target.copy(target);
  controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;
  controls.minDistance=4.1;controls.maxDistance=12;controls.minPolarAngle=.04;controls.maxPolarAngle=Math.PI*.92;
  controls.rotateSpeed=.7;controls.zoomSpeed=.7;

  const studio=new THREE.Scene();studio.background=new THREE.Color(.18,.19,.21);
  const envObjects=[];
  function softbox(x,y,z,w,h,brightness) {
    const g=new THREE.PlaneGeometry(w,h),m=new THREE.MeshBasicMaterial({color:new THREE.Color(brightness,brightness,brightness),side:THREE.DoubleSide});
    const p=new THREE.Mesh(g,m);p.position.set(x,y,z);p.lookAt(0,1,0);studio.add(p);envObjects.push(p);
  }
  softbox(-3.7,3.3,3.6,2.9,6,5.4);softbox(3.5,2.2,2.0,1.7,4.8,3.4);
  softbox(.1,5.5,-.1,4,3,5.8);softbox(-.8,1.8,-4,2.2,4,3.2);softbox(.6,-2,3,3.5,1.4,.8);
  const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(studio,.08,.1,30);
  scene.environment=env.texture;envObjects.forEach(o=>{o.geometry.dispose();o.material.dispose();});pmrem.dispose();
  const trophy=createTrophy();scene.add(trophy);
  let unlocked=options.unlocked===true,stateAmount=unlocked?1:0;
  const applyState=createStateMaterials(trophy);applyState(stateAmount);
  function setUnlocked(value){unlocked=Boolean(value);if(!unlocked)celebration.reset();host.dispatchEvent(new CustomEvent('trophystate',{detail:unlocked}));}
  let celebratedCount=0;const onCharge=e=>{if(e.detail.count>celebratedCount){celebratedCount=e.detail.count;setUnlocked(true);}};host.addEventListener('trophycharge',onCharge);
  const fill=new THREE.HemisphereLight(0xeaf1ff,0x735526,.65);scene.add(fill);
  const key=new THREE.DirectionalLight(0xfff3d7,2.4);key.position.set(-3.5,6,4);key.castShadow=false;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=4;key.shadow.camera.bottom=-3;key.shadow.normalBias=.025;key.shadow.bias=-.00015;key.shadow.radius=4;scene.add(key);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.11}));floor.rotation.x=-Math.PI/2;floor.position.y=.025;floor.receiveShadow=true;floor.visible=false;scene.add(floor);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,4,64,64,64);grad.addColorStop(0,'rgba(59,34,0,.24)');grad.addColorStop(.38,'rgba(59,34,0,.11)');grad.addColorStop(1,'rgba(59,34,0,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  const sm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.0),sm);shadow.rotation.x=-Math.PI/2;shadow.position.y=.028;scene.add(shadow);
  if(options.shadow===false){floor.visible=false;shadow.visible=false;}
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const celebration=createCelebration({host,canvas,camera,scene,trophy,reducedMotion});
  let running=options.autoplay!==false&&!reducedMotion.matches,visible=true,disposed=false,raf=0,time=0,last=0,amplitude=0,lastInput=-100,interacting=false;
  let viewTarget=null,viewState='perspective';
  const motionListener=()=>{if(reducedMotion.matches)setAnimation(false);};reducedMotion.addEventListener('change',motionListener);
  controls.addEventListener('start',()=>{interacting=true;lastInput=performance.now();viewTarget=null;viewState='custom';host.dispatchEvent(new CustomEvent('trophyview',{detail:'custom'}));});
  controls.addEventListener('end',()=>{interacting=false;lastInput=performance.now();});
  function resize(){const {width,height}=host.getBoundingClientRect();if(width<1||height<1)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  function animate(now){
    if(disposed)return;raf=requestAnimationFrame(animate);
    const dt=Math.min((now-(last||now))/1000,.05);last=now;
    if(!visible||document.hidden)return;
    time+=dt;
    const goal=running&&!interacting&&!celebration.active&&now-lastInput>2000?1:0;
    amplitude=THREE.MathUtils.damp(amplitude,goal,3,dt);
    trophy.rotation.set(.012*Math.sin(time*.6)*amplitude,.13*Math.sin(time*.52)*amplitude,.006*Math.sin(time*.6)*amplitude);
    trophy.position.set(0,.018*(1-Math.cos(time*.9))*amplitude,0);
    stateAmount=reducedMotion.matches?(unlocked?1:0):THREE.MathUtils.damp(stateAmount,unlocked?1:0,5,dt);applyState(stateAmount);
    celebration.update(dt,now);
    if(viewTarget){camera.position.lerp(viewTarget,1-Math.exp(-7*dt));if(camera.position.distanceTo(viewTarget)<.001){camera.position.copy(viewTarget);viewTarget=null;}}
    controls.update();renderer.render(scene,camera);
  }
  const observer=new IntersectionObserver(e=>{visible=e[0].isIntersecting;if(!visible)celebration.cancel();});observer.observe(host);raf=requestAnimationFrame(animate);
  function setAnimation(value){running=Boolean(value);host.dispatchEvent(new CustomEvent('trophymotion',{detail:running}));return running;}
  function setView(view){
    const d=8.05;
    const views={front:[0,3.55,d],back:[0,3.55,-d],side:[d,3.35,0],top:[0,9.6,.001],perspective:[2.4,4,7.65]};
    if(!views[view])return;viewTarget=new THREE.Vector3(...views[view]);if(reducedMotion.matches){camera.position.copy(viewTarget);viewTarget=null;}
    viewState=view;lastInput=performance.now();host.dispatchEvent(new CustomEvent('trophyview',{detail:view}));
  }
  function zoom(factor){const p=camera.position.clone().sub(target);p.setLength(THREE.MathUtils.clamp(p.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(target).add(p);viewTarget=null;lastInput=performance.now();}
  function dispose(){disposed=true;host.removeEventListener('trophycharge',onCharge);celebration.dispose();cancelAnimationFrame(raf);observer.disconnect();resizeObserver.disconnect();reducedMotion.removeEventListener('change',motionListener);controls.dispose();const materials=new Set();scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();materials.add(o.material);}});materials.forEach(m=>{m.map?.dispose();m.dispose();});env.dispose();renderer.dispose();canvas.remove();}
  return {setView,setAnimation,setUnlocked,zoom,dispose,get unlocked(){return unlocked;},get animation(){return running;},get view(){return viewState;},get diagnostics(){return {unlocked,stateAmount,celebration:celebration.state,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,webgl:renderer.capabilities.isWebGL2,camera:camera.position.toArray(),rotation:trophy.rotation.toArray(),size:renderer.getSize(new THREE.Vector2()).toArray()};}};
}

const host=document.querySelector('[data-trophy-viewer]');
if(host){
  const api=mountTrophy(host);window.trophyViewer=api;
  document.querySelectorAll('[data-unlocked]').forEach(b=>b.addEventListener('click',()=>api.setUnlocked(b.dataset.unlocked==='true')));
  const syncState=()=>document.querySelectorAll('[data-unlocked]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.unlocked==='true')===api.unlocked)));
  host.addEventListener('trophystate',syncState);syncState();
  const motion=document.querySelector('[data-motion]');
  function motionLabel(){if(motion){motion.setAttribute('aria-pressed',String(api.animation));motion.textContent=api.animation?'Ⅱ Пауза':'▷ Плавное движение';}}
  motion?.addEventListener('click',()=>{api.setAnimation(!api.animation);motionLabel();});host.addEventListener('trophymotion',motionLabel);motionLabel();
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>api.setView(b.dataset.view)));
  host.addEventListener('trophyview',e=>document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===e.detail))));
  document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>api.zoom(Number(b.dataset.zoom))));
  document.querySelector('[data-theme]')?.addEventListener('click',e=>{const dark=document.documentElement.classList.toggle('dark');e.currentTarget.setAttribute('aria-pressed',String(dark));e.currentTarget.textContent=dark?'Светлый фон':'Тёмный фон';});
  document.querySelector('[data-loading]')?.remove();
}
