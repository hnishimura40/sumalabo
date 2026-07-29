#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..","..");
const DEFAULT_ROOT="D:\\downloads\\sumalabo-codex\\attended-reviews";
const COUNT=9, SECONDS=30;
const hash=(v)=>createHash("sha256").update(v).digest("hex");
const valid=(s)=>typeof s==="string"&&/^[a-z0-9][a-z0-9-]*$/i.test(s);
export const reviewRoot=(v)=>v||process.env.SUMALABO_ATTENDED_REVIEW_ROOT||DEFAULT_ROOT;
export const reviewPath=(slug,v)=>path.join(reviewRoot(v),slug+".json");
export function collectArticleImages(slug,repoRoot=ROOT){
  if(!valid(slug))throw new Error("invalid_slug");
  const thumb=path.join(repoRoot,"public","images","thumbnails",slug+".webp");
  const dir=path.join(repoRoot,"public","images","articles",slug);
  const slides=existsSync(dir)?readdirSync(dir,{withFileTypes:true}).filter((e)=>e.isFile()&&e.name.toLowerCase().endsWith(".webp")).map((e)=>path.join(dir,e.name)).sort():[];
  const files=[thumb,...slides],missing=files.filter((f)=>!existsSync(f));
  if(missing.length)throw new Error("image_missing:"+missing.join(","));
  if(files.length!==COUNT)throw new Error("attended_review_requires_9_images:actual="+files.length);
  return files;
}
export function snapshotImages(slug,o={}){
  const repoRoot=o.repoRoot||ROOT;
  const images=collectArticleImages(slug,repoRoot).map((file)=>{const b=readFileSync(file);return{path:path.relative(repoRoot,file).replace(/\\/g,"/"),sha256:hash(b),bytes:statSync(file).size};});
  return{images,imageSetSha256:hash(JSON.stringify(images.map((i)=>({path:i.path,sha256:i.sha256}))))};
}
export function prepareAttendedReview(slug,o={}){
  const root=reviewRoot(o.reviewRoot),snap=snapshotImages(slug,o);
  const record={schemaVersion:1,slug,mode:"attended",status:"pending",requiredSeconds:SECONDS,preparedAt:(o.now||new Date()).toISOString(),approvedAt:null,reviewer:null,imageSetSha256:snap.imageSetSha256,images:snap.images};
  mkdirSync(root,{recursive:true});writeFileSync(reviewPath(slug,root),JSON.stringify(record,null,2)+"\n","utf8");return record;
}
export function approveAttendedReview(slug,o={}){
  const file=reviewPath(slug,o.reviewRoot);if(!existsSync(file))return{ok:false,reason:"review_not_prepared"};
  const record=JSON.parse(readFileSync(file,"utf8")),now=o.now||new Date(),elapsed=Math.floor((now.getTime()-Date.parse(record.preparedAt))/1000);
  if(elapsed<SECONDS)return{ok:false,reason:"review_30_seconds_not_elapsed",waitSeconds:SECONDS-Math.max(0,elapsed)};
  if(o.reviewer!=="Hiro"||o.confirmViewedAll!==COUNT)return{ok:false,reason:"explicit_hiro_confirmation_required"};
  const current=snapshotImages(slug,o);if(current.imageSetSha256!==record.imageSetSha256)return{ok:false,reason:"images_changed_after_prepare"};
  const approved={...record,status:"approved",approvedAt:now.toISOString(),reviewer:"Hiro",confirmedImageCount:COUNT};
  writeFileSync(file,JSON.stringify(approved,null,2)+"\n","utf8");return{ok:true,record:approved};
}
export function verifyAttendedReview(slug,o={}){
  const file=reviewPath(slug,o.reviewRoot);if(!existsSync(file))return{ok:false,reason:"attended_image_review_missing",path:file};
  let record;try{record=JSON.parse(readFileSync(file,"utf8"));}catch{return{ok:false,reason:"attended_image_review_invalid",path:file};}
  if(record.status!=="approved"||record.reviewer!=="Hiro"||record.confirmedImageCount!==COUNT)return{ok:false,reason:"attended_image_review_not_approved",path:file};
  let current;try{current=snapshotImages(slug,o);}catch(e){return{ok:false,reason:e.message||String(e),path:file};}
  if(current.imageSetSha256!==record.imageSetSha256)return{ok:false,reason:"attended_images_changed_after_approval",path:file};
  return{ok:true,path:file,approvedAt:record.approvedAt,reviewer:record.reviewer,imageCount:record.images.length,imageSetSha256:record.imageSetSha256};
}
function argsOf(argv){const o={slug:null,action:"status",reviewer:null,confirmViewedAll:null};for(const a of argv){if(a==="--prepare")o.action="prepare";else if(a==="--approve")o.action="approve";else if(a==="--status")o.action="status";else if(a.startsWith("--slug="))o.slug=a.slice(7);else if(a.startsWith("--reviewer="))o.reviewer=a.slice(11);else if(a.startsWith("--confirm-viewed-all="))o.confirmViewedAll=Number(a.slice(21));}return o;}
async function main(){
  const a=argsOf(process.argv.slice(2));if(!valid(a.slug)){console.error("usage: --slug=<slug> --prepare | --approve --reviewer=Hiro --confirm-viewed-all=9 | --status");process.exitCode=2;return;}
  if(a.action==="prepare"){const r=prepareAttendedReview(a.slug);console.log(JSON.stringify({ok:true,status:r.status,requiredSeconds:r.requiredSeconds,imageCount:r.images.length,reviewPath:reviewPath(a.slug),images:r.images.map((i)=>i.path),next:"9枚を30秒確認後、Hiroの明示承認を受けて --approve を実行"},null,2));return;}
  if(a.action==="approve"){const r=approveAttendedReview(a.slug,{reviewer:a.reviewer,confirmViewedAll:a.confirmViewedAll});console.log(JSON.stringify(r,null,2));process.exitCode=r.ok?0:1;return;}
  const r=verifyAttendedReview(a.slug);console.log(JSON.stringify(r,null,2));process.exitCode=r.ok?0:1;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href;
if(direct)main().catch((e)=>{console.error(e&&e.stack?e.stack:e);process.exitCode=1;});