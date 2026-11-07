import {makeCarmelaWall} from './carmela-scene.js?v=carmela2';
import * as T from './vendor/three/build/three.module.js';
export class StoryMaterials{
  constructor(stage){this.ready=this.load(stage).catch(error=>console.warn('Reading-room materials could not load',error));}
  async load(stage){
    const loader=new T.TextureLoader(),base='assets/room-reference/';
    for(const key of ['round','pill','corner'])document.documentElement.style.setProperty('--story-'+key,`url("${base}ui-${key}.png")`);
    document.documentElement.style.setProperty('--story-paper',`url("${base}textures-paper.jpg")`);
    const keys={wood:'wood.jpg',wall:'walls-default.jpg',wallNormal:'walls-default-normal.jpg',ottoWall:'walls-otto-shy-moon.jpg',ottoWallNormal:'walls-otto-shy-moon-normal.jpg',paper:'paper.jpg',paperNormal:'paper-normal.jpg',cloth:'cloth-neutral.jpg',edges:'page-edges.jpg'};
    const maps=Object.fromEntries(await Promise.all(Object.entries(keys).map(async([key,name])=>{const map=await loader.loadAsync(base+'textures-'+name);map.userData.shared=true;map.colorSpace=key.endsWith('Normal')?T.NoColorSpace:T.SRGBColorSpace;map.anisotropy=Math.min(8,stage.renderer.capabilities.getMaxAnisotropy());return[key,map];})));
    const storyWalls=await Promise.all(['nia-runaway-kite','fin-glowing-sea'].map(async id=>{
      const ext=id==='nia-runaway-kite'?'webp':'jpg';
      const pair=await Promise.all(['','-normal'].map(async suffix=>{
        const map=await loader.loadAsync(`assets/shelf-reference/textures-walls-${id}${suffix}.${ext}`);
        map.userData.shared=true;map.colorSpace=suffix?T.NoColorSpace:T.SRGBColorSpace;
        map.wrapS=map.wrapT=T.MirroredRepeatWrapping;map.repeat.set(7,2.6);
        map.anisotropy=Math.min(8,stage.renderer.capabilities.getMaxAnisotropy());return map;
      }));return [id,pair];
    }));
    maps.wallThemes={default:[maps.wall,maps.wallNormal],'demo-otto':[maps.ottoWall,maps.ottoWallNormal],...Object.fromEntries(storyWalls)};
    // Local stories share the wallpaper of their explicitly matching story theme.
    maps.wallThemes['demo-carmela']=[makeCarmelaWall(),maps.wallNormal];
    maps.wallThemes['demo-moon']=maps.wallThemes['demo-otto'];
    maps.wallThemes['demo-kite']=maps.wallThemes['nia-runaway-kite'];
    maps.wallThemes['demo-ocean']=maps.wallThemes['fin-glowing-sea'];
    for(const key of ['wall','wallNormal','ottoWall','ottoWallNormal']){maps[key].wrapS=maps[key].wrapT=T.MirroredRepeatWrapping;maps[key].repeat.set(7,2.6);}
    maps.wood.wrapS=maps.wood.wrapT=T.MirroredRepeatWrapping;maps.wood.repeat.set(4,3);
    maps.paperNormal.wrapS=maps.paperNormal.wrapT=T.RepeatWrapping;maps.paperNormal.repeat.set(2,2);
    stage.room.setMaterials(maps);stage.room.setTheme(stage.view==='reader'&&stage.coverBook?.theme==='otto');stage.physical.setMaterials(maps);stage.canvas.dataset.materials='reference-pbr';stage.render();
  }
}
