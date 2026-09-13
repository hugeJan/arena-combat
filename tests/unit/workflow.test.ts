import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'../..');
function cli(...args:string[]){const r=spawnSync(process.execPath,['--import','tsx','src/cli.ts',...args],{cwd:root,encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);return JSON.parse(r.stdout.trim());}
test('new session, validation, immutable capture, and tamper rejection',()=>{
 const tmp=mkdtempSync(join(tmpdir(),'arena-session-')),dir=join(tmp,'fighter');let frozen:string|null=null;
 try{cli('init',dir,'--name','测试斗士');const original=cli('validate',join(dir,'design.json'));assert.equal(original.valid,true);
 const result=cli('freeze',dir);frozen=result.submission;assert.ok(result.designElapsedMs>=0);assert.equal(cli('validate',join(frozen!,'design.json')).valid,true);
 const d=JSON.parse(readFileSync(join(dir,'design.json'),'utf8'));d.name='modified';writeFileSync(join(dir,'design.json'),JSON.stringify(d));
 assert.equal(cli('validate',join(frozen!,'design.json')).name,'测试斗士');assert.throws(()=>cli('validate',join(dir,'design.json')),/mismatch/);
 writeFileSync(join(frozen!,'design.json'),JSON.stringify(d));assert.throws(()=>cli('validate',join(frozen!,'design.json')),/mismatch/);
 }finally{rmSync(tmp,{recursive:true,force:true});if(frozen)rmSync(frozen,{recursive:true,force:true});}
});
