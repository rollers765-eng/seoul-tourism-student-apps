'use strict';
const form=document.getElementById('filters');
const cards=document.getElementById('cards');
const count=document.getElementById('count');
let materials=[];
function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function addLink(container,path,label,download,primary){
  if(!path)return;
  // Only repository-local HTML/PDF documents can be opened from catalog data.
  if(!/^materials\/[a-zA-Z0-9_./-]+\.(html|pdf)$/.test(path)||path.split('/').includes('..'))return;
  const a=element('a',label,primary?'primary':'');a.href=path;
  if(download)a.download='';else{a.target='_blank';a.rel='noopener';a.setAttribute('aria-label',label+' (새 창)');}
  container.append(a);
}
function render(){
  const filters=Object.fromEntries(['q','unit','account','lesson'].map(key=>[key,document.getElementById(key).value]));
  const rows=materials.filter(row=>matchesMaterial(row,filters));
  cards.replaceChildren();count.textContent=rows.length+'개 수업 · 전체 '+materials.length+'개';document.getElementById('empty').hidden=rows.length!==0;
  for(const row of rows){
    const article=element('article',undefined,'material');const icon=element('div',undefined,'lesson-icon');icon.setAttribute('aria-hidden','true');icon.append(element('span',String(row.lesson).padStart(2,'0')),element('small','LESSON'));
    const body=element('div');body.append(element('p',row.unit+' / '+row.account+' · '+row.lesson+'차시','meta'),element('h3',row.title),element('p',row.description,'description'));
    const tags=element('div',undefined,'tags');for(const tag of [...(row.tags||[]),'교과서 '+row.pages+'쪽'])tags.append(element('span',tag,'tag'));body.append(tags);
    const links=element('div',undefined,'actions');addLink(links,row.slides,'슬라이드 열기 ↗',false,true);addLink(links,row.worksheetHtml,'활동지 HTML 열기 ↗');addLink(links,row.worksheetHtml,'HTML 다운로드',true);addLink(links,row.worksheetPdf,'활동지 PDF 열기 ↗');addLink(links,row.worksheetPdf,'PDF 다운로드',true);body.append(links);article.append(icon,body);cards.append(article);
  }
}
function reset(){form.reset();render();document.getElementById('q').focus();}
form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',render);form.addEventListener('change',render);form.addEventListener('reset',()=>setTimeout(render,0));document.getElementById('clear-empty').addEventListener('click',reset);
fetch('materials.json').then(r=>{if(!r.ok)throw Error('목록 요청 실패');return r.json();}).then(data=>{
  if(!Array.isArray(data))throw Error('목록 형식 오류');materials=data.sort((a,b)=>a.unit.localeCompare(b.unit,'ko')||a.account.localeCompare(b.account,'ko')||a.lesson-b.lesson);
  for(const key of ['unit','account','lesson']){const values=[...new Set(materials.map(row=>row[key]))].sort((a,b)=>key==='lesson'?a-b:String(a).localeCompare(String(b),'ko'));for(const value of values){const option=element('option',value+(key==='lesson'?'차시':''));option.value=value;document.getElementById(key).append(option);}}
  render();
}).catch(()=>{count.textContent='자료 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';const link=element('a','단기매매증권 1차시 자료 바로 열기');link.href='materials/trading-securities-01/worksheet.html';cards.append(link);});
