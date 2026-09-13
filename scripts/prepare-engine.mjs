import {readFileSync,writeFileSync,mkdirSync,cpSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const lock=JSON.parse(readFileSync(resolve(root,'upstream.lock.json'),'utf8'));
for(const [path,digest] of Object.entries(lock.files)) {
  if(sha(readFileSync(resolve(root,path)))!==digest)throw new Error('Upstream changed: '+path);
}
const base=resolve(root,'vendor/stick-steel'),dest=resolve(root,'.engine/stick-steel');
mkdirSync(dest,{recursive:true});cpSync(base+'/lib',dest+'/lib',{recursive:true});
for(const name of ['external-control','combat-craft','combat-body']) {
  const patch=JSON.parse(readFileSync(resolve(root,'patches/'+name+'.json'),'utf8'));
  let text=readFileSync(resolve(dest,patch.source),'utf8');
  if(sha(text)!==patch.source_sha256)throw new Error('Unexpected engine source for '+name);
  for(const c of patch.changes){if(text.split(c.before).length!==2)throw new Error('Patch must match exactly once: '+name);text=text.replace(c.before,c.after);}
  writeFileSync(resolve(dest,patch.source),text);
}
cpSync(resolve(root,'src/arena/choreography.ts'),resolve(dest,'lib/duel/choreography.ts'));
const hash=createHash('sha256');
function add(path){const abs=resolve(root,path);for(const e of readdirSync(abs,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path+'/'+e.name;if(e.isDirectory()){if(e.name!=='generated')add(p);}else if(e.name.endsWith('.ts')||e.name.endsWith('.json')){hash.update(p+'\0');hash.update(readFileSync(resolve(root,p)));}}}
for(const path of ['src/arena','src/engine','patches'])add(path);
for(const path of ['upstream.lock.json','package-lock.json','scripts/prepare-engine.mjs']){hash.update(path+'\0');hash.update(readFileSync(resolve(root,path)));}
const identity=hash.digest('hex');mkdirSync(resolve(root,'src/generated'),{recursive:true});
writeFileSync(resolve(root,'src/generated/build.ts'),`export const ENGINE_HASH = ${JSON.stringify(identity)};\nexport const UPSTREAM_COMMIT = ${JSON.stringify(lock.commit)};\n`);
console.log('Verified pinned engine; candidate identity '+identity.slice(0,16));
