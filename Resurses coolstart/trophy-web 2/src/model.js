import * as THREE from 'three';
import logoRings from './logo-rings.json' with { type: 'json' };

// Proportions reconstructed from the front, side and top reference views.
// Y up, front +Z. Height is approximately 3 scene units; real dimensions unknown.
export function createTrophy() {
  const root = new THREE.Group();
  root.name = 'Clover_Trophy';
  const gold = new THREE.MeshStandardMaterial({name:'Satin gold', color:0xe9b74b, metalness:1, roughness:0.285});
  const engraving = new THREE.MeshStandardMaterial({name:'Recess shadow gold', color:0x7b481b, metalness:1, roughness:0.39});
  const relief = new THREE.MeshStandardMaterial({name:'Stamped clover gold', color:0xdba73e, metalness:1, roughness:0.34});
  const points = [
    [0,.035],[.70,.035],[.752,.039],[.777,.06],[.78,.09],[.78,.175],[.765,.202],[.735,.216],
    [.595,.22],[.568,.24],[.567,.292],[.55,.322],[.51,.338],[.428,.35],
    [.326,.404],[.246,.468],[.199,.565],[.174,.685],[.178,.795],[.213,.89],
    [.289,.962],[.392,1.027],[.52,1.124],[.647,1.26],[.752,1.423],[.855,1.647],
    [.94,1.965],[.989,2.316],[1.004,2.638],[1.005,2.914],[1.001,2.962],
    [.987,2.985],[.958,2.991],[.935,2.978],[.928,2.95],[.926,2.68],
    [.913,2.35],[.86,2.02],[.777,1.72],[.66,1.49],[.517,1.33],[.364,1.235],
    [.24,1.207],[.12,1.206],[0,1.206]
  ];
  const profile = new THREE.CatmullRomCurve3(points.map(([r,y])=>new THREE.Vector3(r,y,0)),false,'centripetal');
  const samples=profile.getPoints(210);
  const lathe = new THREE.LatheGeometry(samples.map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),128);
  const peak=samples.reduce((a,p,i)=>p.y>samples[a].y?i:a,0);
  const vertexColors=[];
  for(let i=0;i<=128;i++)for(let j=0;j<samples.length;j++){
    const depth=j>peak?THREE.MathUtils.smoothstep(2.99-samples[j].y,0,1.5):0;
    vertexColors.push(1-depth*.26,1-depth*.39,1-depth*.48);
  }
  lathe.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
  const bodyGold=gold.clone();bodyGold.name='Satin gold with inner bowl shading';bodyGold.vertexColors=true;
  const body = new THREE.Mesh(lathe,bodyGold); body.name='Hollow_cup_stem_and_stepped_base'; root.add(body);

  for (const sign of [-1,1]) {
    const path = new THREE.CatmullRomCurve3([
      [.959,2.644],[1.24,2.65],[1.438,2.592],[1.505,2.397],
      [1.493,2.165],[1.412,1.932],[1.245,1.702],[1.017,1.531],[.717,1.421]
    ].map(([x,y])=>new THREE.Vector3(x*sign,y,0)),false,'centripetal');
    const geo = new THREE.TubeGeometry(path,84,.081,12,false);
    // Slightly flattened cast handles, as seen in the side views.
    geo.scale(1,1,.77);
    const mesh=new THREE.Mesh(geo,gold); mesh.name=sign===-1?'Left_handle':'Right_handle'; root.add(mesh);
  }

  const brandShapes=logoRings.map(polygon=>{
    const shape=new THREE.Shape(polygon[0].map(([x,y])=>new THREE.Vector2(x,y)));
    shape.holes=polygon.slice(1).map(ring=>new THREE.Path(ring.map(([x,y])=>new THREE.Vector2(x,y))));
    return shape;
  });
  const circle=new THREE.Shape();circle.absarc(0,0,.5,0,Math.PI*2,false);
  const medallion=new THREE.MeshStandardMaterial({name:'Brand circle gold',color:0xb98832,metalness:1,roughness:.4});
  const brandGold=new THREE.MeshStandardMaterial({name:'Original brand clover gold',color:0xf4ce76,metalness:1,roughness:.3});
  const outer=samples.slice(0,peak+1).filter(p=>p.y>.75).map(p=>[p.x,p.y]);
  function radiusAt(y) {
    for(let i=0;i<outer.length-1;i++)if(y>=outer[i][1]&&y<=outer[i+1][1]){
      const a=outer[i],b=outer[i+1],t=(y-a[1])/(b[1]-a[1]); return a[0]+(b[0]-a[0])*t;
    }
    return .95;
  }
  // Tessellate flat faces before wrapping around the curved cup.
  function subdivide(geometry,passes=3) {
    let g=geometry.index?geometry.toNonIndexed():geometry;
    for(let pass=0;pass<passes;pass++){
      const p=g.attributes.position.array, out=[];
      for(let i=0;i<p.length;i+=9){
        const a=Array.from(p.slice(i,i+3)),b=Array.from(p.slice(i+3,i+6)),c=Array.from(p.slice(i+6,i+9));
        const ab=a.map((v,j)=>(v+b[j])/2),bc=b.map((v,j)=>(v+c[j])/2),ca=c.map((v,j)=>(v+a[j])/2);
        out.push(...a,...ab,...ca,...ab,...b,...bc,...ca,...bc,...c,...ab,...bc,...ca);
      }
      g.dispose(); g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));
    }
    return g;
  }
  for(const sign of [1,-1]){
    for(const [shapes,z,material,name] of [[circle,.012,medallion,'brand_circle'],[brandShapes,.021,brandGold,'original_brand_clover']]){
      const g=subdivide(new THREE.ShapeGeometry(shapes,64),shapes===circle?2:1);
      const p=g.attributes.position;
      for(let i=0;i<p.count;i++){
        const x=p.getX(i)*1.06,y=p.getY(i)*1.06+2.05,r=radiusAt(y),angle=x/r;
        p.setXYZ(i,sign*(r+z)*Math.sin(angle),y,sign*(r+z)*Math.cos(angle));
      }
      g.computeVertexNormals();const normals=g.attributes.normal;
      for(let i=0;i<p.count;i++){
        const y=p.getY(i),r=radiusAt(y),slope=(radiusAt(y+.009)-radiusAt(y-.009))/.018;
        const n=new THREE.Vector3(p.getX(i)/(r+z),-slope,p.getZ(i)/(r+z)).normalize();normals.setXYZ(i,n.x,n.y,n.z);
      }
      const mesh=new THREE.Mesh(g,material);mesh.name=(sign>0?'Front_':'Back_')+name;root.add(mesh);
    }
  }
  for(const [shape,material,y,name] of [[circle,medallion,1.216,'Inner_brand_circle'],[brandShapes,brandGold,1.219,'Inner_original_clover']]){
    const inset=new THREE.Mesh(new THREE.ShapeGeometry(shape,48),material);inset.rotation.x=-Math.PI/2;inset.scale.setScalar(.35);inset.position.set(0,y,0);inset.name=name;root.add(inset);
  }
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  root.userData={reference:'IMG_7953.jpeg',note:'Reconstructed proportions; no physical dimensions supplied.',units:'arbitrary',front:'+Z',logo:'Original supplied SVG, circle-clipped geometry'};
  return root;
}

export function createIdleClip() {
  const times=[], rotations=[], heights=[];
  for(let i=0;i<=120;i++){
    const t=i/120*8, phase=i/120*Math.PI*2;
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.015*Math.sin(phase),.13*Math.sin(phase),.009*Math.sin(phase)));
    times.push(t);rotations.push(q.x,q.y,q.z,q.w);heights.push(0,.016*(1-Math.cos(phase)),0);
  }
  return new THREE.AnimationClip('Gentle idle · 8 seconds',8,[new THREE.QuaternionKeyframeTrack('.quaternion',times,rotations),new THREE.VectorKeyframeTrack('.position',times,heights)]);
}

export function createStateMaterials(root) {
  const unique=new Set();root.traverse(o=>{if(o.isMesh)unique.add(o.material);});
  const entries=[...unique].map(m=>({m,color:m.color.clone(),roughness:m.roughness,env:m.envMapIntensity,locked:new THREE.Color(m.name.includes('clover')?0x3a301f:m.name.includes('circle')?0x30281b:0x332b1e)}));
  return function apply(unlockedAmount){
    for(const e of entries){e.m.color.copy(e.locked).lerp(e.color,unlockedAmount);e.m.roughness=THREE.MathUtils.lerp(.86,e.roughness,unlockedAmount);e.m.envMapIntensity=THREE.MathUtils.lerp(.16,e.env,unlockedAmount);}
  };
}
