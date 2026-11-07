import * as T from './vendor/three/build/three.module.js';

// Preserve the painted UV atlas and add surface response rather than painting extra lights on it.
export function makeOttoMaterial(source,renderer){
  const m=new T.MeshPhysicalMaterial();T.MeshStandardMaterial.prototype.copy.call(m,source);
  m.defines={STANDARD:'',PHYSICAL:''};m.metalness=0;m.roughness=.86;
  m.sheen=.36;m.sheenRoughness=.78;m.sheenColor.set('#e6bb87');
  m.clearcoat=.65;m.clearcoatRoughness=.13;m.userData.shared=true;
  if(m.map){m.map.anisotropy=renderer.capabilities.getMaxAnisotropy();m.map.userData.shared=true;}
  m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vOttoBind;').replace('#include <begin_vertex>','#include <begin_vertex>\nvOttoBind=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vOttoBind;
      float ottoHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float ottoNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(ottoHash(i),ottoHash(i+vec3(1,0,0)),f.x),mix(ottoHash(i+vec3(0,1,0)),ottoHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(ottoHash(i+vec3(0,0,1)),ottoHash(i+vec3(1,0,1)),f.x),mix(ottoHash(i+vec3(0,1,1)),ottoHash(i+vec3(1)),f.x),f.y),f.z);}
    `).replace('#include <color_fragment>',`#include <color_fragment>
      float ottoFur=smoothstep(0.025,0.13,diffuseColor.r-diffuseColor.b)*(1.0-smoothstep(0.21,0.40,diffuseColor.r-diffuseColor.g));
      float ottoScarf=smoothstep(0.23,0.42,diffuseColor.r-diffuseColor.g)*(1.0-smoothstep(0.37,0.44,vOttoBind.y));
      float ottoHead=smoothstep(0.39,0.44,vOttoBind.y)*smoothstep(0.075,0.125,vOttoBind.z);
      float ottoGloss=ottoHead*(1.0-smoothstep(0.025,0.09,dot(diffuseColor.rgb,vec3(0.3333))));
      float ottoGrain=ottoNoise(vOttoBind*1500.0);
      float ottoWeave=sin(vOttoBind.x*1900.0+sin(vOttoBind.y*48.0)*1.4)*sin(vOttoBind.y*1700.0);
      float ottoDetail=1.0-smoothstep(0.8,2.6,length(fwidth(vOttoBind*1500.0)));
      diffuseColor.rgb*=1.0+((ottoGrain-0.5)*0.055*ottoFur+ottoWeave*0.025*ottoScarf)*ottoDetail;
    `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(roughnessFactor,0.16,ottoGloss);
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 ottoDx=dFdx(vViewPosition),ottoDy=dFdy(vViewPosition);
      normal=normalize(normal-(normalize(ottoDx)*dFdx(ottoGrain)+normalize(ottoDy)*dFdy(ottoGrain))*0.065*ottoFur*ottoDetail);
    `).replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
      material.clearcoat*=ottoGloss;
    `);
  };
  m.customProgramCacheKey=()=> 'otto-plush-eyes-v1';return m;
}
