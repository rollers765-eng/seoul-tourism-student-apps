function materialUnitKey(row){return JSON.stringify([row.chapter||'단원',row.unit]);}
function sortMaterials(items){return [...items].sort((a,b)=>(a.chapterOrder??999)-(b.chapterOrder??999)||(a.unitOrder??999)-(b.unitOrder??999)||(a.accountOrder??999)-(b.accountOrder??999)||Number(a.lesson)-Number(b.lesson));}
