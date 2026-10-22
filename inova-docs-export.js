// Exporta a árvore revisada, sem executar HTML nem buscar URLs do documento.
function runs(node,style={}){
  if(node.nodeType===3)return [{text:node.textContent,...style}];
  if(node.nodeName==='BR')return [{text:'\n',...style}];
  const next={...style,bold:style.bold||['B','STRONG','TH'].includes(node.nodeName),italic:style.italic||['I','EM'].includes(node.nodeName),underline:style.underline||node.nodeName==='U'};
  return [...node.childNodes].flatMap(n=>runs(n,next));
}
export function exportBlocks(html){
  const source=new DOMParser().parseFromString(html,'text/html');const blocks=[];
  const visit=node=>{
    if(node.nodeType===3){if(node.textContent.trim())blocks.push({runs:runs(node),size:11});return;}
    if(node.nodeName==='TABLE'){blocks.push({table:[...node.rows].map(row=>[...row.cells].map(cell=>({runs:runs(cell),header:cell.nodeName==='TH'})))});return;}
    if(['UL','OL'].includes(node.nodeName)){[...node.children].forEach((li,i)=>blocks.push({runs:[{text:node.nodeName==='OL'?`${i+1}. `:'• '},...runs(li)],size:11,align:node.style.textAlign}));return;}
    if(node.children?.length&&[...node.children].some(c=>['P','DIV','H1','H2','H3','TABLE','UL','OL'].includes(c.nodeName))){[...node.childNodes].forEach(visit);return;}
    blocks.push({runs:runs(node,{bold:/^H[1-3]$/.test(node.nodeName)}),size:node.nodeName==='H1'?19:node.nodeName==='H2'?16:node.nodeName==='H3'?13:11,align:node.style?.textAlign||'left'});
  };[...source.body.childNodes].forEach(visit);return blocks;
}
export async function makeDocx(html,settings){
  const D=window.docx;if(!D)throw Error('Gerador DOCX indisponível. Atualize a página.');
  const convertRuns=rr=>rr.flatMap(r=>r.text.split('\n').map((part,i)=>new D.TextRun({text:part,break:i?1:undefined,bold:r.bold,italics:r.italic,underline:r.underline?{}:undefined})));
  const paragraph=(b)=>new D.Paragraph({children:convertRuns(b.runs),alignment:({center:D.AlignmentType.CENTER,right:D.AlignmentType.RIGHT,justify:D.AlignmentType.JUSTIFIED})[b.align]||D.AlignmentType.LEFT,spacing:{after:150},...(b.size>11?{heading:b.size>=19?D.HeadingLevel.HEADING_1:b.size>=16?D.HeadingLevel.HEADING_2:D.HeadingLevel.HEADING_3}:{})});
  const children=exportBlocks(html).map(b=>b.table?new D.Table({width:{size:100,type:D.WidthType.PERCENTAGE},rows:b.table.map(row=>new D.TableRow({children:row.map(cell=>new D.TableCell({children:[paragraph({runs:cell.runs})],shading:cell.header?{fill:'E9EFF7'}:undefined}))}))}):paragraph(b));
  const headerChildren=[new D.Paragraph({children:[new D.TextRun({text:settings.name||'',bold:true,size:17})]})];
  if(settings.logo){const b=Uint8Array.from(atob(settings.logo.split(',')[1]),x=>x.charCodeAt(0));headerChildren.unshift(new D.Paragraph({children:[new D.ImageRun({data:b,type:settings.logo.startsWith('data:image/png')?'png':'jpg',transformation:{width:90,height:50}})]}));}
  const doc=new D.Document({styles:{default:{document:{run:{font:'Arial',size:22}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1200,bottom:1100,left:1100,right:1100}}},headers:{default:new D.Header({children:headerChildren})},footers:{default:new D.Footer({children:[new D.Paragraph({children:[new D.TextRun({text:settings.footer||'',size:16}),new D.TextRun({text:' · Página ',size:16}),new D.TextRun({children:[D.PageNumber.CURRENT],size:16})]})]})},children}]});return D.Packer.toBlob(doc);
}
export async function makePdf(html,settings){
  if(!window.PDFLib)throw Error('Gerador PDF indisponível. Atualize a página.');
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib,pdf=await PDFDocument.create();
  const fonts={normal:await pdf.embedFont(StandardFonts.Helvetica),bold:await pdf.embedFont(StandardFonts.HelveticaBold),italic:await pdf.embedFont(StandardFonts.HelveticaOblique),bolditalic:await pdf.embedFont(StandardFonts.HelveticaBoldOblique)};
  const font=r=>fonts[r.bold&&r.italic?'bolditalic':r.bold?'bold':r.italic?'italic':'normal'];
  const clean=s=>String(s).replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u00a0/g,' ');
  let page,y,pageNo=0,logo=null;
  if(settings.logo){const b=Uint8Array.from(atob(settings.logo.split(',')[1]),x=>x.charCodeAt(0));logo=settings.logo.startsWith('data:image/png')?await pdf.embedPng(b):await pdf.embedJpg(b);}
  const draw=(text,x,at,size,f)=>{try{page.drawText(clean(text),{x,y:at,size,font:f,color:rgb(.10,.16,.23)});}catch{throw Error('O PDF contém um caractere não suportado pela fonte. Substitua símbolos especiais ou baixe o DOCX.');}};
  const newPage=()=>{page=pdf.addPage([595.28,841.89]);pageNo++;y=762;draw((settings.name||'').slice(0,95),48,805,8,fonts.bold);draw((settings.footer||'').slice(0,95),48,30,8,fonts.normal);draw(String(pageNo),537,30,8,fonts.normal);page.drawLine({start:{x:48,y:790},end:{x:547,y:790},color:rgb(.8,.84,.9),thickness:.5});if(logo){const scale=Math.min(65/logo.width,30/logo.height);page.drawImage(logo,{x:480,y:750,width:logo.width*scale,height:logo.height*scale});y=730;}};
  const linesFor=(rr,width,size)=>{
    const lines=[[]];let currentWidth=0;
    for(const r of rr){for(const token of clean(r.text).split(/(\n|\s+)/).filter(Boolean)){
      if(token==='\n'){lines.push([]);currentWidth=0;continue;}
      const f=font(r);let w;try{w=f.widthOfTextAtSize(token,size);}catch{throw Error('Há um símbolo não suportado no PDF. Baixe DOCX ou substitua o símbolo.');}
      if(currentWidth+w>width&&lines.at(-1).length){lines.push([]);currentWidth=0;}
      if(w>width){for(const char of token){const cw=f.widthOfTextAtSize(char,size);if(currentWidth+cw>width){lines.push([]);currentWidth=0;}lines.at(-1).push({...r,text:char,w:cw});currentWidth+=cw;}}else{if(!currentWidth&&!token.trim())continue;lines.at(-1).push({...r,text:token,w});currentWidth+=w;}
    }}return lines;
  };
  const renderLine=(line,x,at,size,align='left',width=499)=>{const w=line.reduce((sum,r)=>sum+r.w,0);let cursor=x+(align==='center'?(width-w)/2:align==='right'?width-w:0);for(const r of line){draw(r.text,cursor,at,size,font(r));if(r.underline)page.drawLine({start:{x:cursor,y:at-1.5},end:{x:cursor+r.w,y:at-1.5},thickness:.5});cursor+=r.w;}};
  newPage();
  for(const b of exportBlocks(html)){
    if(!b.table){const size=b.size||11;for(const line of linesFor(b.runs,499,size)){if(y<66)newPage();renderLine(line,48,y,size,b.align);y-=size*1.45;}y-=9;continue;}
    const cols=Math.max(...b.table.map(row=>row.length)),colWidth=499/cols;
    for(const row of b.table){const cellLines=row.map(cell=>linesFor(cell.runs,colWidth-14,9));const lineCount=Math.max(...cellLines.map(ll=>ll.length));let offset=0;
      while(offset<lineCount){if(y<100)newPage();const capacity=Math.max(1,Math.floor((y-65-16)/13));const count=Math.min(lineCount-offset,capacity),height=count*13+14;
        row.forEach((cell,i)=>{page.drawRectangle({x:48+i*colWidth,y:y-height,width:colWidth,height,borderWidth:.5,borderColor:rgb(.65,.7,.77),color:cell.header?rgb(.91,.94,.97):rgb(1,1,1)});cellLines[i].slice(offset,offset+count).forEach((line,j)=>renderLine(line,55+i*colWidth,y-15-j*13,9,'left',colWidth-14));});y-=height;offset+=count;if(offset<lineCount)newPage();
      }
    }y-=12;
  }
  return new Blob([await pdf.save()],{type:'application/pdf'});
}
