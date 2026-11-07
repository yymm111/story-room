let worker,serial=0;
const jobs=new Map();
export function prepareAsset(type,data){
  if(!globalThis.Worker||!globalThis.OffscreenCanvas)return Promise.reject(new Error('Background preparation unavailable'));
  if(!worker){worker=new Worker(new URL('./asset-worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const job=jobs.get(data.id);if(!job)return;jobs.delete(data.id);data.error?job.reject(new Error(data.error)):job.resolve(data.result);};worker.onerror=()=>{for(const job of jobs.values())job.reject(new Error('Background preparation failed'));jobs.clear();worker.terminate();worker=null;};}
  return new Promise((resolve,reject)=>{const id=++serial;jobs.set(id,{resolve,reject});worker.postMessage({id,type,data});});
}
