import fs from 'node:fs';
import path from 'node:path';
const ROOT=new URL('../../',import.meta.url);
export function renewalApproval(kind,root=ROOT){
  if(kind.startsWith('comparison:')){
    const policy=JSON.parse(fs.readFileSync(new URL('data/automation/sumalabo-editorial-identity.json',root),'utf8'));
    return policy.renewal?.firstPublicationApprovals?.[kind.slice(11)];
  }
  const file=new URL('data/automation/ai-article-template-v2.json',root);
  return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).firstPublicationApproval:null;
}
export function assertRenewalRelease(text,lookup=renewalApproval){
  for(const match of String(text).matchAll(/data-renewal-kind=["']([^"']+)["']/g)){
    const approval=lookup(match[1]);
    if(!approval||approval.approvedBy!=='Hiro'||!Number.isFinite(Date.parse(approval.approvedAt))||approval.version!=='2026-11-04')throw Error('first_publication_requires_hiro_approval:'+match[1]);
  }
}
export function assertRenewalDist(directory,lookup=renewalApproval){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())assertRenewalDist(file,lookup);
    else if(entry.name.endsWith('.html'))assertRenewalRelease(fs.readFileSync(file,'utf8'),lookup);
  }
}
