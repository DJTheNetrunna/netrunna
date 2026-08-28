(function(global){
  const CATEGORY="awesome-piracy";

  function slugify(value){
    return String(value||"")
      .toLowerCase()
      .replace(/&/g," and ")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"")
      .slice(0,72)||"resource";
  }

  function hashString(value){
    let h=5381;
    const s=String(value||"");
    for(let i=0;i<s.length;i++)h=((h<<5)+h)^s.charCodeAt(i);
    return (h>>>0).toString(36).slice(0,7);
  }

  function cleanText(value){
    return String(value||"")
      .replace(/:star2:/g,"")
      .replace(/`([^`]+)`/g,"$1")
      .replace(/\*\*([^*]+)\*\*/g,"$1")
      .replace(/\*([^*]+)\*/g,"$1")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g,"$1")
      .replace(/\s+/g," ")
      .trim();
  }

  function normalizeUrl(input){
    try{
      const u=new URL(input);
      if(!/^https?:$/.test(u.protocol))return null;
      u.hash="";
      u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
      if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,"");
      return u.href;
    }catch{return null}
  }

  function extractMarkdownLinks(line){
    const links=[];
    for(let i=0;i<line.length;i++){
      if(line[i]!=="["||line[i-1]==="!")continue;
      const closeLabel=line.indexOf("]",i+1);
      if(closeLabel<0||line[closeLabel+1]!=="(")continue;
      let depth=1,j=closeLabel+2;
      for(;j<line.length;j++){
        if(line[j]==="(")depth++;
        else if(line[j]===")"){
          depth--;
          if(depth===0)break;
        }
      }
      if(depth!==0)continue;
      const title=cleanText(line.slice(i+1,closeLabel));
      const url=line.slice(closeLabel+2,j).trim();
      if(/^https?:\/\//i.test(url))links.push({title,url,start:i,end:j+1,kind:"markdown"});
      i=j;
    }
    return links;
  }

  function extractBareLinks(line,markdownLinks){
    const chars=[...line];
    for(const link of markdownLinks){for(let i=link.start;i<link.end;i++)chars[i]=" ";}
    const masked=chars.join("");
    const links=[];
    const re=/https?:\/\/[^\s<>"']+/gi;
    let match;
    while((match=re.exec(masked))){
      let url=match[0].replace(/[\],.;:!?]+$/g,"");
      while(url.endsWith(")")&&((url.match(/\(/g)||[]).length<(url.match(/\)/g)||[]).length))url=url.slice(0,-1);
      if(normalizeUrl(url))links.push({title:"",url,start:match.index,end:match.index+match[0].length,kind:"bare"});
    }
    return links;
  }

  function parseAwesomePiracy(markdown){
    const rows=[];
    const usedSlugs=new Set();
    let section="Awesome Piracy";
    let subsection="";
    const lines=String(markdown||"").split(/\r?\n/);

    for(const rawLine of lines){
      const line=rawLine.trimEnd();
      const h2=line.match(/^##\s+(.+)$/);
      if(h2){section=cleanText(h2[1]);subsection="";continue}
      const h3=line.match(/^###\s+(.+)$/);
      if(h3){subsection=cleanText(h3[1]);continue}
      if(section==="Contents")continue;
      if(!/^\s*[-*]\s+/.test(line))continue;

      const markdownLinks=extractMarkdownLinks(line);
      const links=[...markdownLinks,...extractBareLinks(line,markdownLinks)];
      if(!links.length)continue;
      const starred=line.includes(":star2:");
      const context=[section,subsection].filter(Boolean).join(" / ");

      for(let index=0;index<links.length;index++){
        const link=links[index];
        const normalized=normalizeUrl(link.url);
        if(!normalized)continue;
        let hostname="resource";
        try{hostname=new URL(normalized).hostname.replace(/^www\./,"")}catch{}
        const title=cleanText(link.title)||hostname;
        const rest=link.kind==="markdown"?cleanText(line.slice(link.end)):"";
        const description=rest||`Resource listed in the archived Awesome Piracy collection under ${context||"the main index"}.`;
        const baseSlug=`ap-${slugify(title)}`;
        let slug=baseSlug;
        if(usedSlugs.has(slug))slug=`${baseSlug}-${hashString(normalized)}`;
        usedSlugs.add(slug);
        const tags=["awesome-piracy",slugify(section),subsection?slugify(subsection):""].filter(Boolean);

        rows.push({
          title,
          slug,
          description,
          category:CATEGORY,
          tags:[...new Set(tags)],
          url:link.url,
          affiliate_url:"",
          use_affiliate:false,
          rating:starred?4.8:4.0,
          views:"ARCHIVE",
          status:"UNVERIFIED",
          note:`Awesome Piracy // ${context||"archive"}`,
          dateAdded:"2026-08-27",
          source:"awesome-piracy",
          source_section:section,
          source_subsection:subsection,
          source_starred:starred
        });
      }
    }
    return rows;
  }

  function mergeResources(base,imported){
    const result=[...(Array.isArray(base)?base:[])];
    const seenUrls=new Set(result.map(item=>normalizeUrl(item.url)).filter(Boolean));
    const seenSlugs=new Set(result.map(item=>item.slug).filter(Boolean));
    for(const item of imported||[]){
      const key=normalizeUrl(item.url);
      if(key&&seenUrls.has(key))continue;
      let slug=item.slug;
      if(seenSlugs.has(slug))slug=`${slug}-${hashString(item.url)}`;
      const next={...item,slug};
      result.push(next);
      if(key)seenUrls.add(key);
      seenSlugs.add(slug);
    }
    return result;
  }

  async function fetchText(path){
    const response=await fetch(path);
    if(!response.ok)throw new Error(`HTTP ${response.status}: ${path}`);
    return response.text();
  }

  async function fetchJson(path){
    const response=await fetch(path);
    if(!response.ok)throw new Error(`HTTP ${response.status}: ${path}`);
    return response.json();
  }

  async function loadAll(basePath=""){
    const [base,markdown]=await Promise.all([
      fetchJson(`${basePath}data/resources.json`),
      fetchText(`${basePath}awsomepiracy/readme.md`)
    ]);
    const imported=parseAwesomePiracy(markdown);
    const resources=mergeResources(base,imported);
    return {resources,baseCount:Array.isArray(base)?base.length:0,importedCount:resources.length-(Array.isArray(base)?base.length:0),sourceCount:imported.length};
  }

  global.NetrunnaCatalog={CATEGORY,slugify,normalizeUrl,parseAwesomePiracy,mergeResources,loadAll};
})(window);
