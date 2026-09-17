import * as THREE from 'three';

export function createCelebration({host,canvas,camera,scene,trophy,reducedMotion}) {
  const previousPosition=host.style.position;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  const button=document.createElement('button');button.type='button';
  button.textContent='Удерживайте кубок 2 секунды';
  button.setAttribute('aria-label','Удерживайте кубок, эту кнопку или клавишу пробела 2 секунды, чтобы запустить конфетти');
  Object.assign(button.style,{position:'absolute',bottom:'12px',left:'50%',transform:'translateX(-50%)',maxWidth:'95%',whiteSpace:'nowrap',minHeight:'44px',padding:'11px 19px',border:'1px solid rgba(177,137,47,.45)',borderRadius:'28px',background:'rgba(248,240,214,.92)',color:'#59401a',font:'500 12px Arial,sans-serif',cursor:'pointer',touchAction:'none',userSelect:'none',overflow:'hidden',zIndex:'3'});
  host.append(button);
  const status=document.createElement('span');status.setAttribute('aria-live','polite');Object.assign(status.style,{position:'absolute',width:'1px',height:'1px',overflow:'hidden',clipPath:'inset(50%)'});host.append(status);
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
  let holding=null,charge=0,chargeVisual=0,burst=-1,tap=0,count=0,lastHaptic=0;
  const particleCount=150, dummy=new THREE.Object3D(),particles=[];
  const confetti=new THREE.InstancedMesh(new THREE.PlaneGeometry(.052,.095),new THREE.MeshStandardMaterial({metalness:.6,roughness:.32,side:THREE.DoubleSide,transparent:true}),particleCount);
  confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);confetti.frustumCulled=false;confetti.visible=false;scene.add(confetti);
  const palette=[0xffd66b,0xeab540,0xfff1b8,0xc88b28,0xf2e8d3,0x739f82];
  for(let i=0;i<particleCount;i++)confetti.setColorAt(i,new THREE.Color(palette[i%palette.length]));
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const context=glowCanvas.getContext('2d'),gradient=context.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,209,81,.85)');gradient.addColorStop(.4,'rgba(255,185,40,.36)');gradient.addColorStop(1,'rgba(255,159,0,0)');context.fillStyle=gradient;context.fillRect(0,0,128,128);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,opacity:0}));glow.scale.set(5,5,1);glow.renderOrder=2;scene.add(glow);
  const materials=new Set();trophy.traverse(o=>{if(o.isMesh)materials.add(o.material);});
  const originals=[...materials].map(m=>({m,color:m.emissive.clone(),intensity:m.emissiveIntensity}));
  function vibrate(pattern){if(!reducedMotion.matches&&typeof navigator.vibrate==='function'){try{navigator.vibrate(pattern);}catch{}}}
  function emit(){host.dispatchEvent(new CustomEvent('trophycharge',{detail:{progress:charge,celebrating:burst>=0,count}}));}
  function resetLabel(){button.textContent='Удерживайте кубок 2 секунды';button.style.background='rgba(248,240,214,.92)';}
  function cancel(){holding=null;charge=0;emit();if(burst<0)resetLabel();}
  function start(id,x,y){if(burst>=0)return;holding={id,x,y,start:performance.now()};charge=0;tap=.18;status.textContent='Зарядка';vibrate(12);emit();}
  function launch(){
    if(burst>=0)return;burst=0;count++;holding=null;charge=0;confetti.visible=!reducedMotion.matches;particles.length=0;
    for(let i=0;i<particleCount;i++){
      const angle=Math.random()*Math.PI*2,speed=1.1+Math.random()*2.4;
      particles.push({x:Math.cos(angle)*.48,y:2.8+Math.random()*.1,z:Math.sin(angle)*.48,vx:Math.cos(angle)*speed,vy:2.2+Math.random()*3.4,vz:Math.sin(angle)*speed,spin:Math.random()*8-4,phase:Math.random()*6.28,size:.65+Math.random()*.9});
    }
    vibrate([25,35,55]);button.textContent='Ваш момент славы ✦';button.style.background='rgba(255,220,126,.96)';status.textContent='Конфетти!';emit();
  }
  function onDown(e){
    if(e.button!==0)return;if(!e.isPrimary){cancel();return;}
    if(e.currentTarget===canvas){const rect=canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);if(!ray.intersectObject(trophy,true).length)return;}
    start(e.pointerId,e.clientX,e.clientY);
  }
  function onMove(e){if(holding&&e.pointerId===holding.id&&Math.hypot(e.clientX-holding.x,e.clientY-holding.y)>9)cancel();}
  function onUp(e){if(!holding||e.pointerId!==holding.id)return;if(performance.now()-holding.start>=2000)launch();else{tap=.28;cancel();}}
  function keyDown(e){if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();start('keyboard',0,0);}}
  function keyUp(e){if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(holding?.id==='keyboard'){if(performance.now()-holding.start>=2000)launch();else{tap=.28;cancel();}}}}
  const hide=()=>{if(document.hidden)cancel();};const preventMenu=e=>e.preventDefault();
  for(const target of [canvas,button]){target.addEventListener('pointerdown',onDown);target.addEventListener('contextmenu',preventMenu);}
  window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',hide);
  button.addEventListener('keydown',keyDown);button.addEventListener('keyup',keyUp);button.addEventListener('blur',cancel);
  function update(dt,now){
    if(holding){charge=Math.min(1,(now-holding.start)/2000);button.textContent=`Удерживайте… ${Math.ceil((1-charge)*20)/10} с`;button.style.background=`linear-gradient(90deg,rgba(242,191,65,.97) ${charge*100}%,rgba(248,240,214,.92) ${charge*100}%)`;if(now-lastHaptic>230){vibrate(8+Math.round(charge*18));lastHaptic=now;}emit();if(charge>=1)launch();}
    chargeVisual=THREE.MathUtils.damp(chargeVisual,charge,9,dt);tap=Math.max(0,tap-dt);
    const amount=reducedMotion.matches?0:chargeVisual*.023+(tap>0?Math.sin(tap/.28*Math.PI)*.009:0);
    trophy.rotation.z+=Math.sin(now*.071)*amount;trophy.rotation.x+=Math.sin(now*.061)*amount*.6;trophy.position.x+=Math.sin(now*.09)*amount*.45;
    let power=chargeVisual*.12;
    if(burst>=0){
      burst+=dt;
      const spin=Math.min(1,burst/1.3),ease=spin<.5?16*spin**5:1-(-2*spin+2)**5/2;
      if(!reducedMotion.matches){trophy.rotation.y+=Math.PI*2*ease;trophy.position.y+=Math.sin(Math.PI*spin)*.24;trophy.rotation.z+=Math.sin(spin*Math.PI*2)*.045;}
      power+=Math.sin(Math.PI*Math.min(1,burst/1.8))*.7;
      confetti.material.opacity=Math.max(0,Math.min(1,(3.2-burst)/.85));
      if(confetti.visible){for(let i=0;i<particleCount;i++){const p=particles[i],t=burst;dummy.position.set(p.x+p.vx*t*.75+Math.sin(t*4+p.phase)*.10,p.y+p.vy*t-2.7*t*t,p.z+p.vz*t*.75);dummy.rotation.set(p.phase+t*p.spin,t*p.spin*.65,t*p.spin*.42);dummy.scale.setScalar(p.size);dummy.updateMatrix();confetti.setMatrixAt(i,dummy.matrix);}confetti.instanceMatrix.needsUpdate=true;}
      if(burst>3.2){burst=-1;confetti.visible=false;resetLabel();emit();}
    }
    glow.position.copy(new THREE.Vector3(0,1.9,0));glow.material.opacity=power;
    for(const {m,color,intensity} of originals){m.emissive.copy(color).lerp(new THREE.Color(0xd39122),Math.min(1,power));m.emissiveIntensity=intensity+power*.5;}
  }
  function dispose(){cancel();for(const target of [canvas,button]){target.removeEventListener('pointerdown',onDown);target.removeEventListener('contextmenu',preventMenu);}window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',hide);button.remove();status.remove();host.style.position=previousPosition;scene.remove(confetti,glow);confetti.geometry.dispose();confetti.material.dispose();glow.material.map.dispose();glow.material.dispose();for(const {m,color,intensity} of originals){m.emissive.copy(color);m.emissiveIntensity=intensity;}}
  return {update,cancel,reset(){cancel();burst=-1;confetti.visible=false;tap=0;chargeVisual=0;resetLabel();},dispose,get active(){return holding!==null||burst>=0;},get state(){return {holding:!!holding,charge,burst,count,confetti:confetti.visible};}};
}
