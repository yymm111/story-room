import * as T from './vendor/three/build/three.module.js';

// Loop refinement shares positions across UV seams, while retaining per-face UVs.
// Joint weights are blended with the same stencil as each refined position.
export function refineSkinnedSurface(source,levels=2){
  const a=source.attributes,points=[],lookup=new Map(),cornerIds=[];
  const count=source.index?.count||a.position.count;
  const weightAt=i=>{const m=new Map();for(let k=0;k<4;k++){const w=a.skinWeight.array[i*4+k];if(w)m.set(a.skinIndex.array[i*4+k],w);}return m;};
  for(let n=0;n<count;n++){
    const i=source.index?source.index.getX(n):n,p=new T.Vector3().fromBufferAttribute(a.position,i),key=p.toArray().map(v=>Math.round(v*1e4)).join(':');
    if(!lookup.has(key)){lookup.set(key,points.length);points.push({p,w:weightAt(i)});}cornerIds.push(lookup.get(key));
  }
  let vertices=points,faces=[];
  for(let n=0;n<count;n+=3){const uv=[];for(let j=0;j<3;j++){const i=source.index?source.index.getX(n+j):n+j;uv.push(new T.Vector2().fromBufferAttribute(a.uv,i));}faces.push({v:cornerIds.slice(n,n+3),uv});}
  const blend=terms=>{const p=new T.Vector3(),w=new Map();for(const [v,c]of terms){p.addScaledVector(v.p,c);for(const [j,s]of v.w)w.set(j,(w.get(j)||0)+s*c);}return {p,w};};
  for(let level=0;level<levels;level++){
    const edges=new Map(),neighbors=vertices.map(()=>new Set()),edgeKey=(i,j)=>i<j?i+':'+j:j+':'+i;
    for(const f of faces)for(let k=0;k<3;k++){const i=f.v[k],j=f.v[(k+1)%3],o=f.v[(k+2)%3],key=edgeKey(i,j);neighbors[i].add(j);neighbors[j].add(i);if(!edges.has(key))edges.set(key,{i,j,op:[]});edges.get(key).op.push(o);}
    const boundaries=vertices.map(()=>[]);for(const e of edges.values())if(e.op.length!==2){boundaries[e.i].push(e.j);boundaries[e.j].push(e.i);}
    const refined=vertices.map((v,i)=>{const border=boundaries[i],adj=[...neighbors[i]],n=adj.length;if(border.length===2)return blend([[v,.75],[vertices[border[0]],.125],[vertices[border[1]],.125]]);if(!n)return v;const beta=n===3?3/16:3/(8*n);return blend([[v,1-n*beta],...adj.map(j=>[vertices[j],beta])]);});
    for(const e of edges.values()){e.id=refined.length;refined.push(e.op.length===2?blend([[vertices[e.i],.375],[vertices[e.j],.375],[vertices[e.op[0]],.125],[vertices[e.op[1]],.125]]):blend([[vertices[e.i],.5],[vertices[e.j],.5]]));}
    const next=[];for(const f of faces){const [a,b,c]=f.v,[u,v,w]=f.uv,ab=edges.get(edgeKey(a,b)).id,bc=edges.get(edgeKey(b,c)).id,ca=edges.get(edgeKey(c,a)).id,uv=u.clone().lerp(v,.5),vw=v.clone().lerp(w,.5),wu=w.clone().lerp(u,.5);next.push({v:[a,ab,ca],uv:[u,uv,wu]},{v:[ab,b,bc],uv:[uv,v,vw]},{v:[ca,bc,c],uv:[wu,vw,w]},{v:[ab,bc,ca],uv:[uv,vw,wu]});}vertices=refined;faces=next;
  }
  const normals=vertices.map(()=>new T.Vector3());for(const f of faces){const [a,b,c]=f.v.map(i=>vertices[i].p),n=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a));for(const i of f.v)normals[i].add(n);}normals.forEach(n=>n.normalize());
  const position=[],normal=[],uv=[],joints=[],weights=[];
  for(const f of faces)for(let k=0;k<3;k++){const i=f.v[k],v=vertices[i],w=[...v.w].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=w.reduce((n,x)=>n+x[1],0)||1;position.push(...v.p);normal.push(...normals[i]);uv.push(...f.uv[k]);for(let j=0;j<4;j++){joints.push(w[j]?.[0]||0);weights.push((w[j]?.[1]||0)/sum);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.computeBoundingSphere();g.userData.shared=true;return g;
}

export function softFoxMaterial(source){
  const m=new T.MeshPhysicalMaterial({map:source.map,color:'#ffffff',roughness:.90,sheen:.38,sheenColor:'#bc7038',sheenRoughness:.8});
  m.userData.shared=true;
  m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFurPosition;\nvarying float vTailTip;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFurPosition = position;\nvTailTip = dot(skinWeight, vec4(1.0) - step(vec4(0.5), abs(skinIndex - vec4(15.0))));');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFurPosition;\nvarying float vTailTip;').replace('#include <color_fragment>',`#include <color_fragment>
      float warmFur = smoothstep(0.04, 0.19, diffuseColor.r - diffuseColor.b);
      diffuseColor.g *= mix(1.0, 0.62, warmFur);
      float fibers = sin(vFurPosition.x * 13.0 + sin(vFurPosition.y * 4.2) * 2.0 + vFurPosition.z * 7.0);
      diffuseColor.rgb *= 0.975 + 0.025 * fibers;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.82, 0.70), smoothstep(0.54, 0.94, vTailTip));
    `);
  };m.customProgramCacheKey=()=> 'storybook-soft-fur-v5';return m;
}
