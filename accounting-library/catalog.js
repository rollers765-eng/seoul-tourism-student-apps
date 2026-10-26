function matchesMaterial(row, filters) {
  const haystack = [row.title,row.unit,row.account,row.lesson+'차시',row.description,row.pages,...(row.tags||[])].join(' ').normalize('NFKC').toLowerCase();
  const words=(filters.q||'').normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  return words.every(word=>haystack.includes(word)) && ['unit','account','lesson'].every(key=>!filters[key]||String(row[key])===String(filters[key]));
}
