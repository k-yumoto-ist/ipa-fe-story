/* Static content integrity checks. Run: node tools/verify.cjs */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const win={};
vm.runInNewContext(fs.readFileSync('stories.js','utf8'),{window:win});
const chapters=win.FE_STORIES;
assert.ok(Array.isArray(chapters)&&chapters.length===12,'12 chapter slots are required');
const published=chapters.filter(c=>!c.coming);
assert.ok(published.length>=6,'At least six chapters must be readable');
const ids=new Set();
let count=0;
for(const chapter of published){
 assert.ok(chapter.story.length>=14,chapter.id+': a full reading scene is needed');
 assert.ok(chapter.terms.length>=8,chapter.id+': not enough terms');
 const story=chapter.story.join('\n');
 for(const term of chapter.terms){
  assert.ok(!ids.has(term.id),'Duplicate term id: '+term.id);
  ids.add(term.id);
  assert.ok(story.includes('【'+term.id+'】'),chapter.id+': missing term marker '+term.id);
  assert.ok(term.term&&term.meaning&&term.hook,'Missing learning metadata: '+term.id);
  count++;
 }
 const used=[...story.matchAll(/【([a-z0-9-]+)】/g)].map(x=>x[1]);
 for(const id of used)assert.ok(chapter.terms.some(t=>t.id===id),chapter.id+': unknown term marker '+id);
}
assert.equal(count,69,'Expected 69 glossary terms');
const html=fs.readFileSync('index.html','utf8');
for(const asset of ['styles.css','stories.js','app.js','favicon.svg','manifest.webmanifest']){
 assert.ok(html.includes('./'+asset),'HTML missing linked asset '+asset);
 assert.ok(fs.existsSync(asset),'Missing '+asset);
}
JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
console.log('Content integrity verified:',published.length,'readable stories,',count,'unique terms, 12 chapter entries.');
