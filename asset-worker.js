self.onmessage=async({data:{id,type,data}})=>{
  try{
    let result,transfer=[];
    if(type==='fox'){
      const [T,{refineSkinnedSurface}]=await Promise.all([import('./vendor/three/build/three.module.js'),import('./skinned-surface.js')]);
      const geometry=new T.BufferGeometry();for(const [name,a]of Object.entries(data)){geometry.setAttribute(name,new T.BufferAttribute(a.array,a.itemSize));}
      const refined=refineSkinnedSurface(geometry,2);result={};for(const [name,a]of Object.entries(refined.attributes)){result[name]={array:a.array,itemSize:a.itemSize};transfer.push(a.array.buffer);}
    }else if(type==='image'){
      const response=await fetch(data.url);if(!response.ok)throw new Error('Image unavailable');const image=await createImageBitmap(await response.blob(),{imageOrientation:data.flipY?'flipY':'none'});result={image};transfer=[image];
    }else if(type==='environment'){
      const response=await fetch(data.url);if(!response.ok)throw new Error('Environment unavailable');const buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();result={buffer};transfer=[buffer];
    }else{
      const blob=await fetch(data.url).then(r=>{if(!r.ok)throw new Error('Asset unavailable');return r.blob();}),image=await createImageBitmap(blob),canvas=new OffscreenCanvas(image.width,image.height),c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const pixels=c.getImageData(0,0,image.width,image.height).data;
      if(type==='paper'){
        const {cols,rows,items,opaque}=data,regions=[];
        items.forEach((name,i)=>{if(!name)return;const cw=image.width/cols,ch=image.height/rows,x0=Math.round(i%cols*cw),y0=Math.round(Math.floor(i/cols)*ch);let left=x0+cw,right=x0,top=y0+ch,bottom=y0;
          if(opaque){left=x0+2;right=x0+cw-3;top=y0+2;bottom=y0+ch-3;}else for(let y=y0+2;y<y0+ch-2;y++)for(let x=x0+2;x<x0+cw-2;x++)if(pixels[(y*image.width+x)*4+3]>130){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
          let fl=right,fr=left;if(!opaque)for(let y=Math.max(top,bottom-Math.round((bottom-top)*.09));y<=bottom;y++)for(let x=left;x<=right;x++)if(pixels[(y*image.width+x)*4+3]>180){fl=Math.min(fl,x);fr=Math.max(fr,x);}
          regions.push({name,left,right,top,bottom,anchor:fl<=fr?(fl+fr)/2:(left+right)/2});
        });const textureImage=await createImageBitmap(image,{imageOrientation:'flipY'});result={regions,pixels,width:image.width,height:image.height,image,textureImage};transfer=[pixels.buffer,image,textureImage];
      }else if(type==='materials'){
        const cw=image.width/3,ch=image.height/2;const crop=async(i,alpha=false)=>{const x0=i%3*cw,y0=Math.floor(i/3)*ch;let l=2,t=2,r=cw-3,b=ch-3;if(alpha){l=cw;t=ch;r=b=0;for(let y=3;y<ch-3;y++)for(let x=3;x<cw-3;x++)if(pixels[((y0+y)*image.width+x0+x)*4+3]>150){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}const out=new OffscreenCanvas(r-l+1,b-t+1);out.getContext('2d').drawImage(image,x0+l,y0+t,out.width,out.height,0,0,out.width,out.height);return out.convertToBlob({type:'image/png'});};
        const blobs=await Promise.all([crop(0,true),crop(1,true),crop(2,true),crop(4),crop(5)]);result={blobs};
      }else throw new Error('Unknown preparation task');if(type!=='paper')image.close();
    }
    self.postMessage({id,result},transfer);
  }catch(error){self.postMessage({id,error:error.message});}
};
