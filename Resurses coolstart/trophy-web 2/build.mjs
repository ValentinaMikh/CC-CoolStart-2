import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createTrophy, createIdleClip, createStateMaterials } from './src/model.js';
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(x=>{this.result='data:'+blob.type+';base64,'+Buffer.from(x).toString('base64');this.onloadend?.();});}
};
const root=fileURLToPath(new URL('.',import.meta.url));process.chdir(root);
const result=await build({absWorkingDir:root,entryPoints:['src/viewer.js'],bundle:true,minify:true,format:'iife',globalName:'Trophy3D',target:'es2020',write:false});
const script=result.outputFiles[0].text;
fs.writeFileSync('trophy-viewer.js',script);
fs.writeFileSync('trophy.html',fs.readFileSync('src/shell.html','utf8').replace('__BUNDLE__',()=>script.replaceAll('</script','<\\/script')));
const glb=await new GLTFExporter().parseAsync(createTrophy(),{binary:true,animations:[createIdleClip()]});
fs.writeFileSync('trophy.glb',Buffer.from(glb));
console.log('Built trophy.html, trophy-viewer.js, trophy.glb');

const locked=createTrophy();createStateMaterials(locked)(0);fs.writeFileSync('trophy-locked.glb',Buffer.from(await new GLTFExporter().parseAsync(locked,{binary:true})));
