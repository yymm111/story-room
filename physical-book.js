import * as T from './vendor/three/build/three.module.js';

const W=7.8,H=10.14,B=.234,BLOCK=.624,SPINE=B+BLOCK,JOINT=.234;
const clamp=T.MathUtils.clamp;

function boardGeometry(){
  const w=W+.38,h=H+.38,r=.10,s=new T.Shape();
  s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const g=new T.ExtrudeGeometry(s,{depth:B,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:2,steps:1,curveSegments:6});g.rotateX(-Math.PI/2);return g;
}
function edges(){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#e3d5b7';x.fillRect(0,0,512,128);for(let y=0;y<128;y+=3){x.fillStyle=y%2?'#f8ecd1':'#cdbd9e';x.globalAlpha=.25;x.fillRect(0,y,512,.6);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.userData.shared=true;return t;}

// Two boards, one page block, and the pages already turned onto the sloping front board.
export class PhysicalBook {
  constructor(stage){
    this.stage=stage;this.group=stage.book;this.index=this.rightIndex=0;this.total=13;this.open=1;
    const mesh=(geo,mat,parent,pos)=>{const m=new T.Mesh(geo,mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
    this.cloth=new T.MeshStandardMaterial({color:'#315969',roughness:.87});this.cloth.userData.shared=true;
    this.edge=new T.MeshStandardMaterial({color:'#eee0c4',map:edges(),roughness:1});this.edge.userData.shared=true;
    this.paper=new T.MeshStandardMaterial({color:'#fffae9',map:stage.textures.paper,roughness:.96,side:T.DoubleSide});this.paper.userData.shared=true;
    this.inside=new T.MeshStandardMaterial({color:'#ffffff',map:stage.textures.lining,roughness:1,side:T.DoubleSide});this.inside.userData.shared=true;
    this.coverCanvas=document.createElement('canvas');this.coverCanvas.width=900;this.coverCanvas.height=1240;this.coverMap=new T.CanvasTexture(this.coverCanvas);this.coverMap.colorSpace=T.SRGBColorSpace;this.coverMap.userData.shared=true;
    const art=new T.MeshBasicMaterial({map:this.coverMap,side:T.DoubleSide,toneMapped:false});art.userData.shared=true;
    mesh(boardGeometry(),this.cloth,this.group,[W/2,0,0]);
    mesh(new T.BoxGeometry(.11,SPINE,H+.38),this.cloth,this.group,[-.15,SPINE/2,0]);
    this.frontPivot=new T.Group();this.frontPivot.position.set(-.15,SPINE,0);this.group.add(this.frontPivot);
    mesh(boardGeometry(),this.cloth,this.frontPivot,[JOINT+(W+.38)/2,0,0]);
    mesh(new T.BoxGeometry(JOINT,.06,H+.38),this.cloth,this.frontPivot,[JOINT/2,.03,0]);
    this.frontArt=mesh(new T.PlaneGeometry(W+.31,H+.31).rotateX(-Math.PI/2),art,this.frontPivot,[JOINT+(W+.38)/2,B+.022,0]);
    mesh(new T.PlaneGeometry(W+.31,H+.31).rotateX(Math.PI/2),this.inside,this.frontPivot,[JOINT+(W+.38)/2,-.022,0]);
    this.rightBlock=mesh(new T.BoxGeometry(W,1,H),this.edge,this.group,[W/2,0,0]);
    this.rightSheet=mesh(new T.PlaneGeometry(W,H).rotateX(-Math.PI/2),this.paper,this.group,[W/2,0,0]);
    this.leftStack=mesh(new T.BoxGeometry(.01,.01,.01),this.edge,this.group,[0,0,0]);
    this.leftSheet=mesh(new T.PlaneGeometry(.01,.01),this.paper.clone(),this.group,[0,0,0]);this.leftSheet.material.userData.shared=true;this.leftSheet.castShadow=false;
    this.pageMark=new T.Mesh(new T.PlaneGeometry(1,.42).rotateX(-Math.PI/2),new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false}));this.group.add(this.pageMark);
    const ribbon=mesh(new T.BoxGeometry(.23,.025,1.25),new T.MeshStandardMaterial({color:'#b58b5d',roughness:1}),this.group,[.19,.075,H/2+.5]);ribbon.rotation.y=-.08;
    this.slope=Math.asin((SPINE-B)/(W+.38+JOINT));this.layout();
  }
  get topY(){return B+BLOCK*(1-this.rightIndex/this.total);}
  setPage(index,total){const count=Math.max(2,total),i=clamp(index,0,count-1);if(this.total===count&&this.index===i&&this.rightIndex===i)return;this.total=count;this.index=this.rightIndex=i;this.layout();}
  prepareTurn(index,total){this.total=Math.max(2,total);this.rightIndex=clamp(index,0,this.total-1);this.layout();}
  setOpen(open){this.open=clamp(open,0,1);this.frontPivot.rotation.z=(Math.PI+this.slope)*this.open;this.layout(false);}
  profile(index=this.index,topIndex=index){
    const thickness=BLOCK*index/this.total,top=B+BLOCK*(1-topIndex/this.total),startY=top+.012,shoulderY=Math.max(SPINE+.015,startY+thickness*.35),points=[];
    const shoulder=.14+thickness*.9;
    for(let i=0;i<=12;i++){const t=i/12;points.push(new T.Vector2(-.025-shoulder*(1-Math.cos(t*Math.PI/2)),startY+(shoulderY-startY)*Math.sin(t*Math.PI/2)));}
    for(let i=1;i<=52;i++){const t=i/52,x=-.025-shoulder-(W-.10-shoulder)*t;const coverY=SPINE+Math.sin(this.slope)*x;const y=coverY+thickness+.018+(shoulderY-(SPINE-Math.sin(this.slope)*(.025+shoulder)+thickness+.018))*Math.pow(1-t,5);points.push(new T.Vector2(x,y));}
    return points;
  }
  landing(u,index){this.cache||(this.cache=new Map());const key=this.total+':'+index;let data=this.cache.get(key);if(!data){const p=this.profile(index),lengths=[0];for(let i=1;i<p.length;i++)lengths[i]=lengths[i-1]+p[i].distanceTo(p[i-1]);data={p,lengths};this.cache.set(key,data);}const {p,lengths}=data;const d=clamp(u,0,1)*lengths.at(-1);let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;return p[i-1].clone().lerp(p[i],(d-lengths[i-1])/Math.max(.001,lengths[i]-lengths[i-1]));}
  layout(rebuild=true){
    const openAmount=T.MathUtils.smoothstep(this.open,.72,1),rightH=BLOCK*(1-this.rightIndex/this.total*openAmount);
    this.rightBlock.scale.y=Math.max(.015,rightH);this.rightBlock.position.y=B+rightH/2;this.rightSheet.position.y=B+rightH+.004;
    this.leftStack.visible=this.leftSheet.visible=this.index>0&&this.open>.995;
    if(rebuild&&this.index>0){
      const top=this.profile(this.index,this.rightIndex);this.leftProfile=top;const bottom=top.map(p=>new T.Vector2(p.x,Math.min(p.y-.015,SPINE+Math.sin(this.slope)*p.x)));const shape=new T.Shape();shape.moveTo(top[0].x,top[0].y);for(const p of top.slice(1))shape.lineTo(p.x,p.y);for(const p of bottom.reverse())shape.lineTo(p.x,p.y);shape.closePath();
      this.leftStack.geometry.dispose();this.leftStack.geometry=new T.ExtrudeGeometry(shape,{depth:H,bevelEnabled:false,steps:1});this.leftStack.position.z=-H/2;
      const verts=[],uv=[],indices=[];for(let i=0;i<top.length;i++){const p=top[i];verts.push(p.x,p.y+.004,-H/2,p.x,p.y+.004,H/2);uv.push(1-i/(top.length-1),1,1-i/(top.length-1),0);if(i<top.length-1){const a=i*2;indices.push(a,a+1,a+2,a+2,a+1,a+3);}}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();this.leftSheet.geometry.dispose();this.leftSheet.geometry=geo;
    }
    this.pageMark.visible=this.open>.99;this.pageMark.position.set(W-.8,B+rightH+.012,H/2-.42);
    if(rebuild){const c=document.createElement('canvas');c.width=256;c.height=96;const x=c.getContext('2d');x.fillStyle='#c09a55';x.font='bold 42px Georgia';x.textAlign='right';x.fillText('✦ '+(this.rightIndex*2+2),235,65);this.pageMark.material.map?.dispose();this.pageMark.material.map=new T.CanvasTexture(c);this.pageMark.material.needsUpdate=true;}
  }
  surfaceY(x){
    if(x>=0&&x<=W)return this.rightSheet.position.y;
    const p=this.leftProfile;if(!this.leftSheet.visible||!p||x>p[0].x||x<p[p.length-1].x)return null;
    let lo=0,hi=p.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(p[mid].x>x)lo=mid;else hi=mid;}
    const f=(x-p[hi].x)/(p[lo].x-p[hi].x);return T.MathUtils.lerp(p[hi].y,p[lo].y,f)+.004;
  }
  setMaterials(maps){for(const m of [this.paper,this.leftSheet.material]){m.map=maps.paper;m.normalMap=maps.paperNormal;m.normalScale=new T.Vector2(.13,.13);m.needsUpdate=true;}if(maps.cloth){this.cloth.map=maps.cloth;this.cloth.needsUpdate=true;}if(maps.edges){this.edge.map=maps.edges;this.edge.needsUpdate=true;}}
}
