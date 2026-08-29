import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm';

const $ = (s) => document.querySelector(s);
const money = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg = window.INOVA_CONFIG || {};
const configured = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY && createClient);
const supabase = configured ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;


const APPEARANCE_STORAGE_KEY = 'inovaAppearanceV1';

const appearanceDefaults = {
  headerSize: 76,
  authSize: 190,
  footerSize: 64,
  posX: 50,
  posY: 50,
  fit: 'contain',
  showSubtitle: true
};

function getAppearanceSettings(){
  try{
    return {
      ...appearanceDefaults,
      ...(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) || '{}'))
    };
  }catch{
    return {...appearanceDefaults};
  }
}

function applyAppearance(settings=getAppearanceSettings()){
  const root=document.documentElement;
  root.style.setProperty('--logo-header-size', `${Number(settings.headerSize)}px`);
  root.style.setProperty('--logo-auth-size', `${Number(settings.authSize)}px`);
  root.style.setProperty('--logo-footer-size', `${Number(settings.footerSize)}px`);
  root.style.setProperty('--logo-pos-x', `${Number(settings.posX)}%`);
  root.style.setProperty('--logo-pos-y', `${Number(settings.posY)}%`);
  root.style.setProperty('--logo-fit', settings.fit === 'cover' ? 'cover' : 'contain');

  document.querySelectorAll('.brand-copy p').forEach(el=>{
    el.style.display=settings.showSubtitle ? '' : 'none';
  });

  const preview=$('#appearancePreviewLogo');
  if(preview){
    preview.style.width=`${Number(settings.headerSize)}px`;
    preview.style.height=`${Number(settings.headerSize)}px`;
    preview.style.objectFit=settings.fit === 'cover' ? 'cover' : 'contain';
    preview.style.objectPosition=`${Number(settings.posX)}% ${Number(settings.posY)}%`;
  }

  const previewText=$('#appearancePreviewText');
  if(previewText){
    const small=previewText.querySelector('small');
    if(small)small.style.display=settings.showSubtitle ? '' : 'none';
  }
}

function syncAppearanceControls(settings=getAppearanceSettings()){
  const map={
    logoHeaderSize:['headerSize','px'],
    logoAuthSize:['authSize','px'],
    logoFooterSize:['footerSize','px'],
    logoPosX:['posX','%'],
    logoPosY:['posY','%']
  };

  for(const [id,[key,suffix]] of Object.entries(map)){
    const input=$('#'+id);
    const output=$('#'+id+'Value');
    if(input)input.value=settings[key];
    if(output)output.textContent=`${settings[key]} ${suffix}`.replace(' %','%');
  }

  const fit=$('#logoFit');
  if(fit)fit.value=settings.fit;

  const subtitle=$('#showCompanySubtitle');
  if(subtitle)subtitle.checked=Boolean(settings.showSubtitle);

  applyAppearance(settings);
}

function readAppearanceControls(){
  return {
    headerSize:Number($('#logoHeaderSize')?.value || appearanceDefaults.headerSize),
    authSize:Number($('#logoAuthSize')?.value || appearanceDefaults.authSize),
    footerSize:Number($('#logoFooterSize')?.value || appearanceDefaults.footerSize),
    posX:Number($('#logoPosX')?.value || appearanceDefaults.posX),
    posY:Number($('#logoPosY')?.value || appearanceDefaults.posY),
    fit:$('#logoFit')?.value === 'cover' ? 'cover' : 'contain',
    showSubtitle:Boolean($('#showCompanySubtitle')?.checked)
  };
}

function previewAppearanceFromControls(){
  const settings=readAppearanceControls();

  const outputs=[
    ['logoHeaderSizeValue',settings.headerSize,'px'],
    ['logoAuthSizeValue',settings.authSize,'px'],
    ['logoFooterSizeValue',settings.footerSize,'px'],
    ['logoPosXValue',settings.posX,'%'],
    ['logoPosYValue',settings.posY,'%']
  ];

  outputs.forEach(([id,value,suffix])=>{
    const el=$('#'+id);
    if(el)el.textContent=`${value}${suffix==='%'?'%':' px'}`;
  });

  applyAppearance(settings);
}

function initAppearanceControls(){
  applyAppearance();

  const ids=['logoHeaderSize','logoAuthSize','logoFooterSize','logoPosX','logoPosY','logoFit','showCompanySubtitle'];
  ids.forEach(id=>{
    const el=$('#'+id);
    if(!el)return;
    el.addEventListener(el.type==='checkbox' || el.tagName==='SELECT' ? 'change' : 'input',previewAppearanceFromControls);
  });

  $('#saveAppearanceBtn')?.addEventListener('click',()=>{
    const settings=readAppearanceControls();
    localStorage.setItem(APPEARANCE_STORAGE_KEY,JSON.stringify(settings));
    applyAppearance(settings);
    const saved=$('#appearanceSaved');
    if(saved){
      saved.hidden=false;
      setTimeout(()=>saved.hidden=true,2200);
    }
    toast('Aparência salva.');
  });

  $('#resetAppearanceBtn')?.addEventListener('click',()=>{
    localStorage.removeItem(APPEARANCE_STORAGE_KEY);
    syncAppearanceControls({...appearanceDefaults});
    toast('Aparência restaurada.');
  });

  syncAppearanceControls();
}


let state = {
  user:null, profile:null, membership:null, company:null, config:null,
  licitacoes:[], itens:[], fornecedores:[], quotes:[], cotacoes:[], pricingMap:[], pricingItemResults:{}, pricingItemResultsLoadedFor:'', pricingItemResultsTableAvailable:null, documentos:[], tenderDocuments:[], tenderDocumentsError:'', documentTab:'editais', qualificationDocuments:[], qualificationError:'', qualificationFilter:'all', qualificationRenewSeriesId:'', equipe:[], pncpPreview:null, quoteImportRows:[], quoteImportContext:null, quoteImportRunToken:'', quoteImportBusy:false, quoteImportLastError:false, quoteViewTenderId:'', quoteWorkspaceMode:'import', quoteWorkspaceSection:'import', quoteWorkspaceSearch:'', quoteWorkspaceFilter:'all', quoteImportFilter:'', quoteOnlyUnrelated:false, quoteSupplierSearches:{}, quoteExcludedItems:{}, quoteUndoStack:[], quoteRedoStack:[], pricingViewTenderId:'', pricingOnlyMissing:false, dashboardCalendarDate:null, pricingTargets:{}, pricingTargetsLoadedFor:'', pricingSimulations:{}, pricingSimulationItemId:'', financePeriod:'all', financeTenderId:'', financeEditalId:'', costConfig:{frete_fixo:0, gasolina:0, outros_impostos:0}, demo:false
};

const TENDER_SITUATIONS=[
  {value:'aguardando_disputa',label:'Aguardando disputa',className:'awaiting'},
  {value:'aguardando_habilitacao',label:'Aguardando Habilitação',className:'qualification'},
  {value:'em_disputa',label:'Em disputa',className:'dispute'},
  {value:'vencida',label:'Vencida',className:'won'},
  {value:'perdida',label:'Perdida',className:'lost'},
  {value:'em_entrega',label:'Em entrega',className:'delivery'},
  {value:'finalizada',label:'Finalizada',className:'finished'}
];
const tenderSituationInfo=value=>TENDER_SITUATIONS.find(item=>item.value===value)||TENDER_SITUATIONS[0];

const MAX_QUOTE_FILE_SIZE=25*1024*1024;
const QUOTE_PARSER_VERSION='36.11.2';
const QUOTE_FILE_EXTENSIONS=new Set(['pdf','xlsx','xls','csv']);
const QUOTE_FILE_MIME_TYPES=new Set([
  'application/pdf','text/csv','application/csv','application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/octet-stream',''
]);
const TENDER_DOCUMENT_EXTENSIONS=new Set(['pdf','doc','docx']);
const TENDER_DOCUMENT_MIME_TYPES={
  pdf:'application/pdf',
  doc:'application/msword',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
const QUALIFICATION_FILE_SIZE_LIMIT=25*1024*1024;
const QUALIFICATION_PDF_MIME_TYPES=new Set(['application/pdf','application/octet-stream','']);

function toast(msg,type='success'){
  const el=$('#toast'); el.textContent=msg; el.className=`toast ${type}`; el.hidden=false;
  clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.hidden=true,4000);
}

function tenderDocumentExtension(document){
  const extension=String(document?.file_name||'').toLowerCase().split('.').pop()||'';
  if(TENDER_DOCUMENT_EXTENSIONS.has(extension))return extension;
  return Object.entries(TENDER_DOCUMENT_MIME_TYPES).find(([,mime])=>mime===document?.mime_type)?.[0]||'';
}

function tenderDocumentDownloadLabel(document){
  const extension=tenderDocumentExtension(document);
  return extension?`Baixar ${extension.toUpperCase()}`:'Baixar arquivo';
}

function tenderDocumentIsPdf(document){
  return tenderDocumentExtension(document)==='pdf';
}
function showOnly(id){ ['setupScreen','authScreen','companyScreen','appShell'].forEach(x=>$('#'+x).hidden=x!==id); }
function table(headers,rows){
  if(!rows.length) return '<p class="hint">Nenhum registro ainda.</p>';
  return `<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function supplierPhone(supplier){ return String(supplier?.telefone||supplier?.raw?.phone||'').trim(); }
function supplierPhoneLabel(value){
  const digits=String(value||'').replace(/\D/g,'');
  if(digits.length===13 && digits.startsWith('55')) return `+55 (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`;
  if(digits.length===12 && digits.startsWith('55')) return `+55 (${digits.slice(2,4)}) ${digits.slice(4,8)}-${digits.slice(8)}`;
  if(digits.length===11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if(digits.length===10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return value||'-';
}
function supplierContactInput(value){
  const digits=String(value||'').replace(/\D/g,'');
  if(digits.length===11)return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if(digits.length===10)return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return value||'';
}
const supplierDddUf={11:'SP',12:'SP',13:'SP',14:'SP',15:'SP',16:'SP',17:'SP',18:'SP',19:'SP',21:'RJ',22:'RJ',24:'RJ',27:'ES',28:'ES',31:'MG',32:'MG',33:'MG',34:'MG',35:'MG',37:'MG',38:'MG',41:'PR',42:'PR',43:'PR',44:'PR',45:'PR',46:'PR',47:'SC',48:'SC',49:'SC',51:'RS',53:'RS',54:'RS',55:'RS',61:'DF',62:'GO',63:'TO',64:'GO',65:'MT',66:'MT',67:'MS',68:'AC',69:'RO',71:'BA',73:'BA',74:'BA',75:'BA',77:'BA',79:'SE',81:'PE',82:'AL',83:'PB',84:'RN',85:'CE',86:'PI',87:'PE',88:'CE',89:'PI',91:'PA',92:'AM',93:'PA',94:'PA',95:'RR',96:'AP',97:'AM',98:'MA',99:'MA'};
function supplierUfFromPhone(value){const digits=String(value||'').replace(/\D/g,'').replace(/^55/,'');return supplierDddUf[digits.slice(0,2)]||'';}
function supplierWhatsappUrl(value){
  const digits=String(value||'').replace(/\D/g,'');
  if(!digits)return '';
  const phone=digits.startsWith('55')?digits:`55${digits}`;
  return `https://wa.me/${phone}`;
}
function currentCompanyId(){ return state.company?.id || null; }
function profileName(){ return state.profile?.name || state.user?.user_metadata?.nome || state.user?.email || 'Usuário'; }
function itemName(item){ const l=state.licitacoes.find(x=>x.id===item.licitacao_id); return `${l?.numero||'?'} • Item ${item.numero} • ${item.descricao}`; }
function toLocalDateTime(v){ if(!v)return {data:'',horario:''}; const d=new Date(v); if(Number.isNaN(d.getTime()))return {data:'',horario:''}; const pad=n=>String(n).padStart(2,'0'); return {data:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,horario:`${pad(d.getHours())}:${pad(d.getMinutes())}`}; }
function combineDateTime(data,horario){ if(!data)return null; return new Date(`${data}T${horario||'09:00'}:00`).toISOString(); }

function dateBR(v,withTime=false){
  if(!v)return '-';
  const d=new Date(v);
  if(Number.isNaN(d.getTime())){
    // Também aceita YYYY-MM-DD sem sofrer inversão de mês/dia.
    const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if(!m)return String(v);
    return `${m[3]}/${m[2]}/${m[1]}${withTime&&m[4]?` ${m[4]}:${m[5]||'00'}`:''}`;
  }
  return new Intl.DateTimeFormat('pt-BR',{
    timeZone:'America/Fortaleza',
    day:'2-digit',
    month:'2-digit',
    year:'numeric',
    ...(withTime?{hour:'2-digit',minute:'2-digit',hour12:false}:{})
  }).format(d).replace(',','');
}

function weekdayBR(v){
  if(!v)return '';
  const d=new Date(v);
  if(Number.isNaN(d.getTime()))return '';
  return new Intl.DateTimeFormat('pt-BR',{
    timeZone:'America/Fortaleza',
    weekday:'long'
  }).format(d);
}

function proposalDeadlineText(l){
  if(!l?.proposalEndAt)return 'Prazo não sincronizado';
  return dateBR(l.proposalEndAt,true);
}

function tenderStatusInfo(l){
  const end=l?.proposalEndAt ? new Date(l.proposalEndAt) : null;
  if(!end || Number.isNaN(end.getTime())){
    return {label:'Atualizar PNCP',cls:'neutral',detail:'Prazo de propostas não sincronizado'};
  }

  const ms=end.getTime()-Date.now();
  if(ms<0){
    return {label:'Encerrado',cls:'neutral',detail:'Prazo de propostas encerrado'};
  }

  const hours=Math.ceil(ms/3600000);
  const days=Math.ceil(ms/86400000);
  if(hours<=24)return {label:'Fecha hoje',cls:'bad',detail:`Faltam aproximadamente ${hours}h`};
  if(days<=5)return {label:'Prazo próximo',cls:'warn',detail:`Fecha em ${days} dias`};
  return {label:'Ativo',cls:'good',detail:`Fecha em ${days} dias`};
}



function quotesForItem(itemId){
  return state.cotacoes.filter(
    q=>String(q.item_id)===String(itemId)
  );
}

function itemHasQuote(itemId){
  return quotesForItem(itemId).some(
    q=>Number(q.preco||0)>0
  );
}

function bestQuote(itemId){
  const item=state.itens.find(
    i=>String(i.id)===String(itemId)
  );

  // Usa o motor do banco somente quando existe fornecedor e custo real válido.
  // Isso evita uma linha antiga da pricing_map com "sem cotação" esconder
  // uma cotação que já foi cadastrada em quote_items.
  const server=state.pricingMap.find(
    p=>
      String(p.item_id)===String(itemId) &&
      p.supplier_id &&
      Number(p.real_unit_cost||0)>0
  );

  if(server){
    return {
      fornecedor_id:server.supplier_id,
      custoEq:Number(server.real_unit_cost||0),
      custoProduto:Number(server.product_unit_cost||0),
      freteUnit:Number(server.freight_unit||0),
      freteTotal:Number(server.freight_total||0),
      apresentacao:server.package_description||'',
      marca:'',
      origem:'motor'
    };
  }

  const qty=Math.max(Number(item?.quantidade||0),0.0001);

  const qs=quotesForItem(itemId)
    .filter(q=>Number(q.preco||0)>0)
    .map(q=>{
      const fator=Math.max(Number(q.fator_equivalencia||1),0.0001);
      const fornecedor=state.fornecedores.find(
        f=>String(f.id)===String(q.fornecedor_id)
      );

      const freteApresentacao=Number(q.frete_rateado||0);
      const pacotes=Math.ceil(qty/fator);

      const freteTotal=
        freteApresentacao>0
          ? pacotes*freteApresentacao
          : Number(fornecedor?.frete_padrao||0);

      const custoProduto=Number(q.preco||0)/fator;
      const freteUnit=freteTotal/qty;

      return {
        ...q,
        custoProduto,
        freteTotal,
        freteUnit,
        custoEq:custoProduto+freteUnit,
        origem:'cotacao'
      };
    });

  return qs.sort((a,b)=>a.custoEq-b.custoEq)[0]||null;
}

function pricing(item){
  const q=bestQuote(item.id);

  // Se existe cotação salva, ela tem prioridade sobre uma pricing_map
  // desatualizada. O motor só é usado quando também possui cotação válida.
  const server=state.pricingMap.find(
    p=>
      String(p.item_id)===String(item.id) &&
      p.supplier_id &&
      Number(p.real_unit_cost||0)>0
  );

  if(server && q && String(server.supplier_id)===String(q.fornecedor_id)){
    return {
      q:{
        fornecedor_id:server.supplier_id,
        apresentacao:server.package_description||'',
        custoEq:Number(server.real_unit_cost||0)
      },
      supplierName:server.supplier_name||
        state.fornecedores.find(f=>String(f.id)===String(server.supplier_id))?.nome||
        '',
      productCostUnit:Number(server.product_unit_cost||0),
      freightUnit:Number(server.freight_unit||0),
      freightTotal:Number(server.freight_total||0),
      costUnit:Number(server.real_unit_cost||0),
      totalCost:Number(server.real_unit_cost||0)*Number(server.quantity||item.quantidade||0),
      targetUnit:server.target_bid==null?null:Number(server.target_bid),
      limitUnit:server.minimum_bid==null?null:Number(server.minimum_bid),
      breakEvenUnit:server.break_even_bid==null?null:Number(server.break_even_bid),
      sellUnit:server.estimated_unit_price==null?null:Number(server.estimated_unit_price),
      profit:server.profit_at_estimated==null?null:Number(server.profit_at_estimated),
      margin:server.margin_at_estimated_percent==null?null:Number(server.margin_at_estimated_percent),
      differenceTarget:server.difference_to_target==null?null:Number(server.difference_to_target),
      differenceMinimum:server.difference_to_minimum==null?null:Number(server.difference_to_minimum),
      status:server.status||'Sem estimado',
      recommendation:server.recommendation||''
    };
  }

  if(!q)return null;

  // Cálculo local imediato. Assim a cotação já aparece na precificação
  // mesmo antes de qualquer view/motor do Supabase ser atualizado.
  const c=state.config||{
    imposto:6,
    margem_alvo:25,
    lucro_minimo:500,
    margem_minima:10,
    reserva_operacional:0
  };

  const qty=Math.max(Number(item.quantidade||0),0.0001);
  const costUnit=Number(q.custoEq||0);
  const totalCost=costUnit*qty;

  const overhead=
    (Number(c.imposto||0)+Number(c.reserva_operacional||0))/100;

  const targetMargin=Number(c.margem_alvo||0)/100;
  const minMargin=Number(c.margem_minima||0)/100;
  const est=Number(item.valor_estimado||0);

  const targetUnit=
    costUnit/Math.max(1-overhead-targetMargin,0.01);

  const minByMargin=
    costUnit/Math.max(1-overhead-minMargin,0.01);

  const minByProfit=
    (costUnit+(Number(c.lucro_minimo||0)/qty))/
    Math.max(1-overhead,0.01);

  const limitUnit=Math.max(minByMargin,minByProfit);
  const breakEvenUnit=costUnit/Math.max(1-overhead,0.01);

  const revenue=est*qty;
  const profit=est
    ? revenue*(1-overhead)-totalCost
    : null;

  const margin=est
    ? profit/revenue*100
    : null;

  let status='Sem estimado';
  let recommendation='Informe o valor estimado do edital';

  if(est){
    if(est<breakEvenUnit){
      status='Ruim';
      recommendation='Não participar — estimado abaixo do ponto de equilíbrio';
    }else if(est<limitUnit){
      status='Ruim';
      recommendation='Não participar — estimado abaixo do lance mínimo';
    }else if(est<targetUnit){
      status='Oportunidade';
      recommendation='Participar com cautela — margem abaixo da desejada';
    }else if(profit<Number(c.lucro_minimo||0)){
      status='Oportunidade';
      recommendation='Participar com cautela — lucro total abaixo do mínimo';
    }else{
      status='Excelente';
      recommendation='Boa oportunidade — estimado atende a margem desejada';
    }
  }

  return {
    q,
    supplierName:
      state.fornecedores.find(
        f=>String(f.id)===String(q.fornecedor_id)
      )?.nome||'',
    productCostUnit:q.custoProduto,
    freightUnit:q.freteUnit,
    freightTotal:q.freteTotal,
    costUnit,
    totalCost,
    targetUnit,
    limitUnit,
    breakEvenUnit,
    sellUnit:est||null,
    profit,
    margin,
    differenceTarget:est?est-targetUnit:null,
    differenceMinimum:est?est-limitUnit:null,
    status,
    recommendation
  };
}

function signedMoney(v){
  if(v==null || Number.isNaN(Number(v)))return '-';
  const n=Number(v); return `${n>=0?'+':'-'}${money(Math.abs(n))}`;
}
function marginText(v){
  if(v==null || Number.isNaN(Number(v)))return '-';
  const n=Number(v); return n<0 ? `${n.toFixed(1)}% (prejuízo)` : `${n.toFixed(1)}%`;
}
function statusBadge(status){
  const map={Excelente:'good',Oportunidade:'warn',Ruim:'bad','Sem cotação':'neutral','Sem estimado':'neutral'};
  return `<span class="badge ${map[status]||'neutral'}">${esc(status||'-')}</span>`;
}

function precoLucroMinimo(item, p){
  if(!p || !p.costUnit) return null;

  const c = state.config || {};
  const qty = Math.max(Number(item.quantidade || 0), 0.0001);
  const imposto = Number(c.imposto || 0) / 100;
  const reserva = Number(c.reserva_operacional || 0) / 100;
  const overhead = imposto + reserva;
  const lucroMinimo = Number(c.lucro_minimo || 0);
  const divisor = 1 - overhead;

  if(divisor <= 0) return null;

  return (
    Number(p.costUnit || 0) +
    (lucroMinimo / qty)
  ) / divisor;
}

function precoParada(item, p){
  if(!p) return null;

  const lucroMin = precoLucroMinimo(item, p);
  const margemMin = Number(p.limitUnit || 0);

  return Math.max(
    Number(lucroMin || 0),
    margemMin
  );
}


function ensurePricingModernStyles(){
  if(document.getElementById('pricingModernStyles'))return;

  const style=document.createElement('style');
  style.id='pricingModernStyles';
  style.textContent=`
    #precificacao{
      --pv-bg:#06131b;
      --pv-panel:#0a1922;
      --pv-panel2:#0d1d27;
      --pv-line:#243a47;
      --pv-text:#edf3f6;
      --pv-muted:#8fa0aa;
      --pv-yellow:#f2b52a;
      --pv-green:#35d379;
      --pv-blue:#55a8ff;
      --pv-red:#ff625d;
    }

    #precificacao .panel{
      border-color:var(--pv-line);
      background:var(--pv-panel);
      border-radius:12px;
    }

    #precificacao #pricingTenderViewer{
      padding:16px 18px;
      margin-bottom:12px!important;
      border:1px solid var(--pv-line);
      border-radius:11px;
      background:linear-gradient(145deg,#0b1b25,#091720);
    }

    #precificacao #pricingSummary{
      display:grid;
      grid-template-columns:repeat(5,minmax(150px,1fr));
      gap:10px;
      margin:12px 0 16px;
    }

    #precificacao #pricingSummary .mini-stat{
      min-height:82px;
      padding:14px 15px;
      border:1px solid var(--pv-line);
      border-radius:10px;
      background:#0a1922;
    }

    #precificacao #pricingSummary .mini-stat span{
      display:block;color:var(--pv-muted);font-size:.72rem
    }

    #precificacao #pricingSummary .mini-stat strong{
      display:block;margin-top:5px;color:var(--pv-text);font-size:1.28rem
    }

    #precificacao .pricing-workspace{
      display:grid;
      grid-template-columns:minmax(0,1fr) 330px;
      gap:14px;
      align-items:start;
    }

    #precificacao .pricing-main-card,
    #precificacao .pricing-sim-card{
      border:1px solid var(--pv-line);
      border-radius:12px;
      background:#081720;
      overflow:hidden;
    }

    #precificacao .pricing-main-head{
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:14px 16px;
      border-bottom:1px solid var(--pv-line);
    }

    #precificacao .pricing-main-head strong{
      color:var(--pv-yellow);
    }

    #precificacao .pricing-table{
      max-height:660px;
      overflow:auto;
    }

    #precificacao #precificacaoLista table{
      min-width:1350px;
      border-collapse:separate;
      border-spacing:0;
    }

    #precificacao #precificacaoLista th{
      position:sticky;top:0;z-index:3;
      background:#07151d;
      color:var(--pv-yellow);
      font-size:.73rem;
      padding:12px 11px;
      border-bottom:1px solid var(--pv-line);
    }

    #precificacao #precificacaoLista td{
      padding:13px 11px;
      background:#091820;
      border-bottom:1px solid #1e333e;
      font-size:.78rem;
      vertical-align:middle;
    }

    #precificacao #precificacaoLista tbody tr:hover td{
      background:#0c202a;
    }

    #precificacao .simulator-panel{
      position:sticky;
      top:88px;
      margin:0;
      border:1px solid var(--pv-line);
      border-radius:12px;
      background:linear-gradient(145deg,#0b1b25,#081720);
    }

    #precificacao .simulator-panel .panel-title{
      padding-bottom:10px;
      border-bottom:1px solid var(--pv-line);
    }

    #precificacao .simulator-panel h2{
      color:var(--pv-yellow);
      font-size:1.02rem;
    }

    #precificacao .bid-simulator{
      display:grid!important;
      grid-template-columns:1fr!important;
      gap:11px!important;
    }

    #precificacao #simItem,
    #precificacao #simBid{
      width:100%;
      min-height:42px;
      border:1px solid #34505e;
      border-radius:8px;
      background:#06141c;
      color:var(--pv-text);
      padding:0 11px;
    }

    #precificacao #simResult{
      margin-top:12px;
    }

    #precificacao .bid-decision{
      display:grid;
      grid-template-columns:1fr;
      gap:7px;
      min-height:74px;
      padding:14px;
      border-radius:9px;
      border:1px solid var(--pv-line);
      background:#091821;
    }

    #precificacao .bid-decision.good{
      border-color:#226743;background:#09241b
    }
    #precificacao .bid-decision.warn{
      border-color:#705819;background:#251e0c
    }
    #precificacao .bid-decision.bad{
      border-color:#6f302e;background:#211213
    }

    #precificacao .bid-decision strong{
      font-size:.78rem;letter-spacing:.03em;color:var(--pv-yellow)
    }
    #precificacao .bid-decision.good strong{color:var(--pv-green)}
    #precificacao .bid-decision.bad strong{color:var(--pv-red)}
    #precificacao .bid-decision span{font-size:.78rem;color:#c6d0d6}

    @media(max-width:1200px){
      #precificacao .pricing-workspace{grid-template-columns:1fr}
      #precificacao .simulator-panel{position:static}
      #precificacao #pricingSummary{grid-template-columns:repeat(2,1fr)}
    }
  `;
  document.head.appendChild(style);
}

function renderBidSimulator(){
  const select = $('#simItem');
  const input = $('#simBid');
  const result = $('#simResult');

  if(!select || !input || !result) return;

  const item = state.itens.find(i => i.id === select.value);

  if(!item){
    result.innerHTML = `
      <div class="sim-empty">
        Selecione um item para iniciar a simulação.
      </div>
    `;
    return;
  }

  const p = pricing(item);

  if(!p || !p.costUnit){
    const savedCount=quotesForItem(item.id).length;
    result.innerHTML = `
      <div class="bid-decision bad">
        <strong>${savedCount?'COTAÇÃO SEM CUSTO VÁLIDO':'SEM COTAÇÃO'}</strong>
        <span>
          ${
            savedCount
              ? `Existe ${savedCount} cotação salva, mas o preço/equivalência precisa ser revisado.`
              : 'Este item ainda não possui cotação salva. Abra Cotações, escolha o edital e adicione o preço manualmente ou importe um arquivo.'
          }
        </span>
      </div>
    `;
    return;
  }

  const quoteCount=quotesForItem(item.id).length;
  const lance = Number(input.value || 0);
  const lucroMinimoUnit = precoLucroMinimo(item, p);
  const parada = precoParada(item, p);

  if(!lance){
    result.innerHTML = `
      <div class="sim-grid sim-grid-4">
        <div class="sim-card">
          <span>Preço-alvo</span>
          <strong>${money(p.targetUnit)}</strong>
        </div>
        <div class="sim-card">
          <span>Preço p/ lucro mínimo</span>
          <strong>${money(lucroMinimoUnit)}</strong>
        </div>
        <div class="sim-card">
          <span>Preço de parada</span>
          <strong>${money(parada)}</strong>
        </div>
        <div class="sim-card">
          <span>Ponto de equilíbrio</span>
          <strong>${money(p.breakEvenUnit)}</strong>
        </div>
      </div>
    `;
    return;
  }

  const c = state.config || {};
  const qty = Number(item.quantidade || 0);
  const imposto = Number(c.imposto || 0) / 100;
  const reserva = Number(c.reserva_operacional || 0) / 100;
  const overhead = imposto + reserva;

  const receita = lance * qty;
  const custoTotal = Number(p.costUnit || 0) * qty;
  const lucro = ((lance * (1 - overhead)) - Number(p.costUnit || 0)) * qty;
  const margem = lance > 0
    ? ((((lance * (1 - overhead)) - Number(p.costUnit || 0)) / lance) * 100)
    : 0;

  const target = Number(p.targetUnit || 0);
  const breakEven = Number(p.breakEvenUnit || 0);
  const stop = Number(parada || 0);
  const folgaAteParada = lance - stop;
  const reducaoPercent = lance > 0 ? (folgaAteParada / lance) * 100 : 0;

  let status = '';
  let classe = '';
  let mensagem = '';

  if(lance < breakEven){
    status = 'PREJUÍZO';
    classe = 'bad';
    mensagem = 'Não dê este lance. O valor está abaixo do ponto de equilíbrio.';
  } else if(lance < stop){
    status = 'ABAIXO DO PREÇO DE PARADA';
    classe = 'bad';
    mensagem = 'Há lucro, mas o lance viola sua margem mínima ou o lucro mínimo configurado.';
  } else if(lance < target){
    status = 'PARTICIPAR COM CAUTELA';
    classe = 'warn';
    mensagem = 'O lance ainda é aceitável, mas ficará abaixo da margem desejada.';
  } else {
    status = 'PODE DAR O LANCE';
    classe = 'good';
    mensagem = 'O lance atende às regras configuradas para este item.';
  }

  result.innerHTML = `
    <div class="bid-decision ${classe}">
      <div>
        <strong>${status}</strong>
        <span>${mensagem}</span>
      </div>
      <div class="decision-value">
        ${money(lance)}
      </div>
    </div>

    <div class="sim-grid">
      <div class="sim-card highlight">
        <span>Lucro total</span>
        <strong class="${lucro < 0 ? 'negative' : 'positive'}">${money(lucro)}</strong>
      </div>

      <div class="sim-card">
        <span>Margem líquida</span>
        <strong class="${margem < 0 ? 'negative' : 'positive'}">${margem.toFixed(2)}%</strong>
      </div>

      <div class="sim-card">
        <span>Preço de parada</span>
        <strong>${money(stop)}</strong>
      </div>

      <div class="sim-card">
        <span>Ponto de equilíbrio</span>
        <strong>${money(breakEven)}</strong>
      </div>

      <div class="sim-card">
        <span>Quanto ainda pode baixar</span>
        <strong class="${folgaAteParada < 0 ? 'negative' : 'positive'}">
          ${folgaAteParada >= 0 ? money(folgaAteParada) : money(0)}
        </strong>
        <small>${folgaAteParada >= 0 ? reducaoPercent.toFixed(2) + '%' : 'Já passou do limite'}</small>
      </div>

      <div class="sim-card">
        <span>Receita total</span>
        <strong>${money(receita)}</strong>
      </div>

      <div class="sim-card">
        <span>Custo total</span>
        <strong>${money(custoTotal)}</strong>
      </div>

      <div class="sim-card">
        <span>Preço-alvo</span>
        <strong>${money(target)}</strong>
      </div>
    </div>
  `;
}



function pncpDate(v){
  if(!v) return '-';
  const d=new Date(v);
  return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleString('pt-BR');
}

function pncpMoney(v){
  if(v==null || v==='') return '-';
  return money(Number(v));
}

function pncpControlParts(control){
  const m=String(control||'').match(/(\d{14})-\d-0*(\d+)\/(\d{4})/);
  if(!m)return null;
  return {cnpj:m[1],sequencial:Number(m[2]),ano:Number(m[3])};
}

function pncpLinkParts(value){
  try{
    const url=new URL(String(value||'').trim());
    if(url.protocol!=='https:' || !/(^|\.)pncp\.gov\.br$/i.test(url.hostname))return null;
    const match=url.pathname.match(/^\/app\/editais\/(\d{14})\/(20\d{2})\/(\d{1,10})(?:\/|$)/i);
    return match?{cnpj:match[1],ano:Number(match[2]),sequencial:Number(match[3])}:null;
  }catch{
    return null;
  }
}

function officialPncpTenderUrl(tender){
  const controlParts=pncpControlParts(tender?.pncp_control);
  if(controlParts){
    return `https://pncp.gov.br/app/editais/${controlParts.cnpj}/${controlParts.ano}/${controlParts.sequencial}`;
  }

  const sourceParts=pncpLinkParts(tender?.source_url);
  if(!sourceParts)return '';
  return `https://pncp.gov.br/app/editais/${sourceParts.cnpj}/${sourceParts.ano}/${sourceParts.sequencial}`;
}

function setPncpStatus(message,type='loading'){
  const el=$('#pncpSearchStatus');
  if(!el)return;
  el.hidden=!message;
  el.className=`pncp-status ${type}`;
  el.textContent=message||'';
}

async function invokePncpWithRetry(body,onAttempt,maxAttempts=3,delayMs=700){
  let lastResponse={data:null,error:null};
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    onAttempt?.(attempt,maxAttempts);
    try{
      lastResponse=await supabase.functions.invoke('pncp-import',{body});
    }catch(error){
      lastResponse={data:null,error};
    }

    if(!lastResponse?.error&&!lastResponse?.data?.error)return lastResponse;
    if(attempt<maxAttempts){
      await new Promise(resolve=>setTimeout(resolve,delayMs));
    }
  }
  return lastResponse;
}

function clearPncpPreview(){
  state.pncpPreview=null;
  const el=$('#pncpPreview');
  if(el){el.hidden=true;el.innerHTML='';}
}

function renderPncpSearchResults(results=[]){
  const el=$('#pncpSearchResults');
  if(!el)return;

  if(!results.length){
    el.innerHTML='<div class="pncp-empty">Nenhum edital correspondente foi encontrado. Tente informar o ano correto, o processo ou o número de controle PNCP.</div>';
    return;
  }

  el.innerHTML=`
    <div class="pncp-result-head">
      <strong>${results.length} resultado${results.length===1?'':'s'} encontrado${results.length===1?'':'s'}</strong>
      <span>Confira o órgão antes de abrir.</span>
    </div>
    <div class="pncp-result-list">
      ${results.map(r=>`
        <article class="pncp-result-card">
          <div class="pncp-result-main">
            <strong>${esc(r.numeroCompra||r.processo||r.numeroControlePNCP||'Contratação')}</strong>
            <span>${esc(r.orgao||'-')}</span>
            <small>${esc([r.municipio,r.uf].filter(Boolean).join('/')||'-')} • ${esc(r.modalidadeNome||'-')}</small>
          </div>
          <div class="pncp-result-meta">
            <span>Processo: <b>${esc(r.processo||'-')}</b></span>
            <span>Abre propostas: <b>${pncpDate(r.dataAberturaProposta)}</b></span><span>Fecha propostas: <b>${pncpDate(r.dataEncerramentoProposta)}</b></span>
            <span>Estimado: <b>${pncpMoney(r.valorTotalEstimado)}</b></span>
          </div>
          <button type="button" class="pncp-open-btn" data-pncp-control="${esc(r.numeroControlePNCP||'')}" data-pncp-cnpj="${esc(r.cnpj||'')}" data-pncp-year="${esc(r.anoCompra||'')}" data-pncp-seq="${esc(r.sequencialCompra||'')}">Abrir edital</button>
        </article>
      `).join('')}
    </div>`;
}

function renderPncpPreview(data){
  const el=$('#pncpPreview');
  if(!el)return;

  const t=data?.tender;
  if(!t){
    el.hidden=true;
    return;
  }

  state.pncpPreview=data;
  const items=Array.isArray(data.items)?data.items:[];
  const orgao=t.orgaoEntidade?.razaoSocial || '-';
  const cidade=[t.unidadeOrgao?.municipioNome,t.unidadeOrgao?.ufSigla].filter(Boolean).join('/') || '-';
  const control=t.numeroControlePNCP||'';
  const parts=pncpControlParts(control);
  const portalLink=parts ? `https://pncp.gov.br/app/editais/${parts.cnpj}/${parts.ano}/${parts.sequencial}` : '';

  el.hidden=false;
  el.innerHTML=`
    <div class="pncp-preview-title">
      <div>
        <span class="badge good">Encontrado no PNCP</span>
        <h3>${esc(t.numeroCompra||control||'Licitação')}</h3>
        <p>${esc(orgao)} • ${esc(cidade)}</p>
      </div>
      <div class="pncp-preview-actions">
        ${portalLink?`<a href="${portalLink}" target="_blank" rel="noopener">Abrir no PNCP</a>`:''}
        <button type="button" id="pncpImportBtn">Importar licitação + ${items.length} item${items.length===1?'':'s'}</button>
      </div>
    </div>

    <div class="pncp-detail-grid">
      <div><span>Processo</span><strong>${esc(t.processo||'-')}</strong></div>
      <div><span>Modalidade</span><strong>${esc(t.modalidadeNome||'-')}</strong></div>
      <div><span>Publicação no PNCP</span><strong>${pncpDate(t.dataPublicacaoPncp)}</strong></div>
      <div><span>Abertura para propostas</span><strong>${pncpDate(t.dataAberturaProposta)}</strong></div>
      <div><span>Data limite para propostas</span><strong>${pncpDate(t.dataEncerramentoProposta)}</strong></div>
      <div><span>Valor estimado</span><strong>${pncpMoney(t.valorTotalEstimado)}</strong></div>
      <div><span>Controle PNCP</span><strong class="pncp-control-text">${esc(control||'-')}</strong></div>
    </div>

    <div class="pncp-object">
      <span>Objeto</span>
      <p>${esc(t.objetoCompra||'-')}</p>
    </div>

    <div class="pncp-items-header">
      <strong>Itens do edital</strong>
      <span>${items.length} item${items.length===1?'':'s'} recuperado${items.length===1?'':'s'} do PNCP</span>
    </div>

    <div class="table-wrap pncp-items-table">
      ${items.length ? table(
        ['Item','Descrição','Quantidade','Unidade','Estimado un.','Total'],
        items.map(i=>[
          esc(i.numeroItem),
          esc(i.descricao||'-'),
          esc(i.quantidade??'-'),
          esc(i.unidadeMedida||'-'),
          i.valorUnitarioEstimado==null?'-':money(i.valorUnitarioEstimado),
          i.valorTotal==null?'-':money(i.valorTotal)
        ])
      ) : '<div class="pncp-empty">O PNCP não retornou itens para esta contratação.</div>'}
    </div>
  `;

  $('#pncpImportBtn')?.addEventListener('click',importPncpPreview);
}

async function searchPncp(query){
  clearPncpPreview();
  const results=$('#pncpSearchResults');
  if(results)results.innerHTML='';

  if(!pncpLinkParts(query)){
    setPncpStatus('Cole o link completo do edital no PNCP. Exemplo: https://pncp.gov.br/app/editais/CNPJ/ANO/NÚMERO','warn');
    return;
  }

  if(state.demo || !configured || !supabase || !state.user){
    setPncpStatus('A consulta ao PNCP exige uma sessão online. No modo demonstração, use os editais fictícios já carregados.','warn');
    return;
  }

  const {data,error}=await invokePncpWithRetry(
    {query},
    ()=>setPncpStatus('Consultando o PNCP…','loading')
  );

  if(error){
    setPncpStatus(`Não foi possível consultar o PNCP: ${error.message}`,'error');
    return;
  }
  if(data?.error){
    setPncpStatus(data.error,'error');
    return;
  }

  if(data?.mode==='detail'){
    setPncpStatus(`Edital encontrado. Confira os dados antes de importar.${data?.message?' '+data.message:''}`,data?.has_more?'warn':'success');
    renderPncpPreview(data);
    return;
  }

  setPncpStatus('O PNCP não retornou os dados desse link. Confira se o endereço foi copiado por completo.','error');
}

async function openPncpResult(btn){
  const control=btn.dataset.pncpControl;
  clearPncpPreview();
  if(state.demo || !configured || !supabase || !state.user){
    setPncpStatus('A abertura de editais do PNCP está disponível somente com sessão online.','warn');
    return;
  }

  const payload=control
    ? {query:control}
    : {query:'detalhe',cnpj:btn.dataset.pncpCnpj,ano:Number(btn.dataset.pncpYear),sequencial:Number(btn.dataset.pncpSeq)};

  const {data,error}=await invokePncpWithRetry(
    payload,
    ()=>setPncpStatus('Carregando dados e itens do edital…','loading')
  );
  if(error){
    setPncpStatus(`Erro ao abrir edital: ${error.message}`,'error');
    return;
  }
  if(data?.error){
    setPncpStatus(data.error,'error');
    return;
  }
  if(data?.mode!=='detail'){
    setPncpStatus('O PNCP não retornou os detalhes desse edital. Tente novamente em instantes.','error');
    return;
  }
  setPncpStatus(`Dados carregados. Revise e importe quando estiver pronto.${data?.message?' '+data.message:''}`,data?.has_more?'warn':'success');
  renderPncpPreview(data);
}

async function importPncpPreview(){
  const data=state.pncpPreview;
  const t=data?.tender;
  if(!t || state.demo)return toast('Entre no modo online para importar.','error');

  const duplicate=state.licitacoes.find(l=>
    String(l.numero||'').trim().toUpperCase()===String(t.numeroCompra||'').trim().toUpperCase() ||
    (t.processo && String(l.processo||'').trim().toUpperCase()===String(t.processo).trim().toUpperCase())
  );

  if(duplicate && !confirm(`Já existe uma licitação parecida (${duplicate.numero}). Deseja importar mesmo assim?`))return;

  if(!confirm(`Importar ${t.numeroCompra||'esta licitação'} e ${data.items?.length||0} itens para a INOVA?`))return;

  const btn=$('#pncpImportBtn');
  if(btn){btn.disabled=true;btn.textContent='Importando…';}
  setPncpStatus('Salvando licitação no sistema…','loading');

  try{
    const row={
      company_id:currentCompanyId(),
      number:t.numeroCompra || t.numeroControlePNCP || 'PNCP',
      process_number:t.processo || t.numeroControlePNCP || null,
      agency:t.orgaoEntidade?.razaoSocial || null,
      city:t.unidadeOrgao?.municipioNome || null,
      state:t.unidadeOrgao?.ufSigla || null,
      platform:t.linkSistemaOrigem ? `PNCP • ${t.modalidadeNome||''}` : 'PNCP',
      object:t.objetoCompra || null,
      // dispute_at passa a representar o próximo prazo realmente importante para participação.
      dispute_at:t.dataEncerramentoProposta || t.dataAberturaProposta || null,
      publication_at:t.dataPublicacaoPncp || null,
      proposal_open_at:t.dataAberturaProposta || null,
      proposal_end_at:t.dataEncerramentoProposta || null,
      pncp_control:t.numeroControlePNCP || null,
      source_url:(()=>{const p=pncpControlParts(t.numeroControlePNCP||'');return p?`https://pncp.gov.br/app/editais/${p.cnpj}/${p.ano}/${p.sequencial}`:(t.linkSistemaOrigem||null)})(),
      created_by:state.user.id
    };

    const {data:tender,error:tenderError}=await supabase.from('tenders').insert(row).select().single();
    if(tenderError)throw tenderError;

    const items=(data.items||[]).map(i=>({
      tender_id:tender.id,
      item_number:Number(i.numeroItem||1),
      description:String(i.descricao||'Item PNCP'),
      quantity:Number(i.quantidade||1),
      unit:String(i.unidadeMedida||'UN'),
      estimated_unit_price:i.valorUnitarioEstimado==null?null:Number(i.valorUnitarioEstimado)
    }));

    for(let start=0;start<items.length;start+=400){
      const chunk=items.slice(start,start+400);
      const {error}=await supabase.from('tender_items').insert(chunk);
      if(error)throw error;
      setPncpStatus(`Importando itens… ${Math.min(start+chunk.length,items.length)}/${items.length}`,'loading');
    }

    toast(`Licitação importada com sucesso: ${items.length} itens cadastrados.`);

    // Limpa completamente a área de busca do PNCP após a importação.
    state.pncpPreview=null;

    const searchForm=$('#pncpSearchForm');
    if(searchForm){
      searchForm.reset();
      const year=$('#pncpYear');
      if(year)year.value=new Date().getFullYear();
      const uf=$('#pncpUf');
      if(uf)uf.value='PB';
    }

    const results=$('#pncpSearchResults');
    if(results)results.innerHTML='';

    const preview=$('#pncpPreview');
    if(preview){
      preview.innerHTML='';
      preview.hidden=true;
    }

    const status=$('#pncpSearchStatus');
    if(status){
      status.textContent='';
      status.hidden=true;
      status.className='pncp-status';
    }

    await refreshAll();

    // Mantém a aba de Licitações aberta e pronta para uma nova importação.
    $('#pncpQuery')?.focus();
  }catch(e){
    setPncpStatus(`Erro ao importar: ${e?.message||e}`,'error');
    toast(e?.message||'Erro ao importar PNCP','error');
  }finally{
    if(btn){btn.disabled=false;btn.textContent=`Importar licitação + ${data.items?.length||0} itens`;}
  }
}


function setPncpSyncStatus(message,type='loading'){
  const el=$('#pncpSyncStatus');
  if(!el)return;
  el.hidden=!message;
  el.className=`pncp-sync-status ${type}`;
  el.textContent=message||'';
}

async function syncPncpItems(){
  const tenderId=$('#pncpSyncTender')?.value;
  const l=state.licitacoes.find(x=>x.id===tenderId);
  if(!l)return toast('Selecione uma licitação.','error');
  if(state.demo || !configured || !supabase || !state.user){
    setPncpSyncStatus('A sincronização do PNCP exige uma sessão online. Os dados da demonstração não são alterados.','warn');
    return;
  }

  const query=l.source_url || l.pncp_control;
  if(!query){
    setPncpSyncStatus('Esta licitação não possui vínculo PNCP salvo. Importe novamente pelo link do PNCP para habilitar a atualização automática.','warn');
    return;
  }

  const btn=$('#pncpSyncBtn');
  if(btn){btn.disabled=true;btn.textContent='Atualizando…';}
  try{
    const {data,error}=await invokePncpWithRetry(
      {query},
      ()=>setPncpSyncStatus('Consultando itens no PNCP…','loading')
    );
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    const rows=Array.isArray(data?.items)?data.items:[];
    const tenderData=data?.tender||null;

    if(tenderData){
      const tenderPayload={
        dispute_at:tenderData.dataEncerramentoProposta || tenderData.dataAberturaProposta || l.raw?.dispute_at || null,
        publication_at:tenderData.dataPublicacaoPncp || null,
        proposal_open_at:tenderData.dataAberturaProposta || null,
        proposal_end_at:tenderData.dataEncerramentoProposta || null,
        updated_at:new Date().toISOString()
      };

      const {error:tenderUpdateError}=await supabase
        .from('tenders')
        .update(tenderPayload)
        .eq('id',tenderId);

      if(tenderUpdateError)throw tenderUpdateError;
    }

    if(!rows.length){
      setPncpSyncStatus('Datas do edital atualizadas, mas o PNCP não retornou itens para esta contratação.','warn');
      await refreshAll();
      return;
    }

    const existing=state.itens.filter(i=>i.licitacao_id===tenderId);
    const existingByNumber=new Map(existing.map(i=>[Number(i.numero),i]));

    let inserted=0,updated=0;
    for(const item of rows){
      const num=Number(item.numeroItem||1);
      const payload={
        description:String(item.descricao||'Item PNCP'),
        quantity:Number(item.quantidade||1),
        unit:String(item.unidadeMedida||'UN'),
        estimated_unit_price:item.valorUnitarioEstimado==null?null:Number(item.valorUnitarioEstimado)
      };
      const old=existingByNumber.get(num);
      if(old){
        const {error:uErr}=await supabase.from('tender_items').update(payload).eq('id',old.id);
        if(uErr)throw uErr;
        updated++;
      }else{
        const {error:iErr}=await supabase.from('tender_items').insert({tender_id:tenderId,item_number:num,...payload});
        if(iErr)throw iErr;
        inserted++;
      }
    }

    setPncpSyncStatus(`PNCP atualizado: datas sincronizadas, ${updated} itens revisados e ${inserted} novos cadastrados.`,'success');
    toast('Edital, prazos e itens do PNCP atualizados.');
    await refreshAll();
  }catch(e){
    setPncpSyncStatus(`Erro ao atualizar itens: ${e?.message||e}`,'error');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Atualizar PNCP';}
  }
}

function quoteNormalize(v){
  return String(v??'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/Ø/g,' ')
    .replace(/[×X]/g,' X ')
    .replace(/[^A-Z0-9.,/'" -]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}


function quoteTokenSet(v){
  return new Set(
    quoteNormalize(v)
      .split(' ')
      .filter(t=>t.length>=2 && !['DE','DA','DO','DAS','DOS','PARA','COM','SEM','POR','EM','E'].includes(t))
  );
}

function quoteSafeMatchScore(supplierDescription,itemDescription){
  const a=quoteNormalize(supplierDescription);
  const b=quoteNormalize(itemDescription);
  if(!a || !b)return 0;

  // Correspondência textual direta: ex. "ARCO DE SERRA" x "ARCO DE SERRA C/LAMINA".
  if(a===b)return 1;
  if(a.includes(b) || b.includes(a)){
    const shorter=Math.min(a.length,b.length);
    const longer=Math.max(a.length,b.length);
    if(shorter>=7)return Math.max(.92, shorter/longer);
  }

  const sa=quoteTokenSet(a);
  const sb=quoteTokenSet(b);
  if(!sa.size || !sb.size)return 0;

  let inter=0;
  for(const t of sb)if(sa.has(t))inter++;

  const coverageOfficial=inter/sb.size;
  const jaccard=inter/new Set([...sa,...sb]).size;

  // Números/medidas divergentes reduzem bastante a confiança.
  const numsA=(a.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>x.replace(',','.'));
  const numsB=(b.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>x.replace(',','.'));
  if(numsB.length && numsA.length){
    const common=numsB.filter(n=>numsA.includes(n)).length;
    if(common===0 && coverageOfficial<1)return Math.min(.55,coverageOfficial*.6);
  }

  return coverageOfficial*.78 + jaccard*.22;
}

function autoRelateSafeQuoteRows(tenderId,rows){
  const items=state.itens
    .filter(i=>String(i.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero));

  const usedItems=new Set(
    rows.filter(r=>r.itemId).map(r=>String(r.itemId))
  );

  let matched=0;

  for(const row of rows){
    if(row.itemId)continue;

    const ranked=items
      .filter(i=>!usedItems.has(String(i.id)))
      .map(i=>({item:i,score:quoteSafeMatchScore(row.description,i.descricao)}))
      .sort((a,b)=>b.score-a.score);

    const best=ranked[0];
    const second=ranked[1];

    // Só associa automaticamente quando a correspondência é muito forte
    // e claramente melhor que a segunda opção. Não usa IA.
    if(
      best &&
      best.score>=.91 &&
      (!second || best.score-second.score>=.10)
    ){
      row.itemId=best.item.id;
      row.editalItemNumber=Number(best.item.numero);
      row.manualMatched=false;
      row.autoTextMatched=true;
      row.matchScore=best.score;
      usedItems.add(String(best.item.id));
      matched++;
    }
  }

  return matched;
}


const QUOTE_STOPWORDS=new Set([
  'DE','DA','DO','DAS','DOS','COM','PARA','EM','E','A','O','AS','OS',
  'UN','UND','UNIDADE','PC','PCA','PÇ','PCT','CX','CT','RL','SC','KG','MT',
  'MARCA','MODELO','REF','C','SEM','S'
]);

const QUOTE_GENERIC=new Set([
  'MATERIAL','PRODUTO','DIVERSOS','GERAL','TIPO','TAMANHO','COR','UND',
  'KIT','JOGO'
]);

function quoteTokens(v){
  return quoteNormalize(v)
    .split(/[\s,;:()]+/)
    .map(x=>x.trim())
    .filter(x=>x.length>1 && !QUOTE_STOPWORDS.has(x) && !QUOTE_GENERIC.has(x));
}

function quoteWordTokens(v){
  return quoteTokens(v).filter(x=>/[A-Z]/.test(x) && !/^\d/.test(x));
}

function quoteSpecTokens(v){
  const s=quoteNormalize(v);
  const specs=new Set();

  // Medidas e números relevantes: 20, 25MM, 3/4, 1/2, 15L, 4X2,50MM etc.
  for(const m of s.matchAll(/\b\d+(?:[.,]\d+)?(?:MM|CM|M|KG|G|ML|L|LT|W|V)?\b/g)){
    let x=m[0].replace(',','.');
    if(!['1','2','3','4','5','6','7','8','9','10','20','25','30','40','50','60','75','80','90','100','150','200','500','1000'].includes(x) || /[A-Z]/.test(x)){
      specs.add(x);
    } else {
      // ainda preserva números dimensionais comuns, pois são decisivos em hidráulica/ferragens
      specs.add(x);
    }
  }
  for(const m of s.matchAll(/\b\d+\s*\/\s*\d+\b/g)) specs.add(m[0].replace(/\s/g,''));
  for(const m of s.matchAll(/\b\d+(?:[.,]\d+)?\s*X\s*\d+(?:[.,]\d+)?(?:\s*X\s*\d+(?:[.,]\d+)?)?/g)){
    specs.add(m[0].replace(/\s/g,'').replace(/,/g,'.'));
  }
  return [...specs];
}

function quoteLeadingCategory(v){
  const words=quoteWordTokens(v);
  if(!words.length)return '';
  // primeiros termos carregam a família do produto: CADEADO, TINTA, TE, LUVA, JOELHO...
  return words.slice(0,2).join(' ');
}

function setOverlap(a,b){
  const A=new Set(a),B=new Set(b);
  let common=0;
  for(const x of A)if(B.has(x))common++;
  return {common,union:new Set([...A,...B]).size};
}

function quoteMatchScore(a,b){
  const aw=quoteWordTokens(a), bw=quoteWordTokens(b);
  const as=quoteSpecTokens(a), bs=quoteSpecTokens(b);
  if(!aw.length || !bw.length)return {score:0,reason:'sem palavras suficientes'};

  const wo=setOverlap(aw,bw);
  const wordJ=wo.common/Math.max(wo.union,1);

  const aLead=aw[0]||'', bLead=bw[0]||'';
  const leadExact=aLead===bLead;
  const leadRelated=leadExact || (aLead.length>=4 && bLead.length>=4 && (aLead.includes(bLead)||bLead.includes(aLead)));

  const so=setOverlap(as,bs);
  const specJ=(as.length&&bs.length)?so.common/Math.max(new Set([...as,...bs]).size,1):0;

  // Regras de rejeição forte: evita "CADEADO 20" -> "ADAPTADORES ..."
  if(!leadRelated && wo.common===0){
    return {score:0,reason:'família do produto diferente'};
  }

  // Se só compartilha uma palavra muito genérica (ex.: TINTA) e existem especificações,
  // exige ao menos alguma especificação em comum.
  const onlyOneWord=wo.common===1;
  if(onlyOneWord && (as.length||bs.length) && so.common===0 && wordJ<0.35){
    return {score:Math.min(wordJ,0.18),reason:'descrição genérica sem medida compatível'};
  }

  // Se ambos possuem números/medidas e nenhum coincide, aplica penalidade forte.
  let specPenalty=0;
  if(as.length && bs.length && so.common===0) specPenalty=0.28;

  // Recompensa família do produto + termos em comum + medidas compatíveis.
  let score=
    (wordJ*0.52) +
    (leadExact?0.22:(leadRelated?0.12:0)) +
    (specJ*0.22) -
    specPenalty;

  // descrição contida integralmente ajuda, mas pouco
  const an=quoteNormalize(a), bn=quoteNormalize(b);
  if(an.length>8 && bn.length>8 && (an.includes(bn)||bn.includes(an)))score+=0.08;

  score=Math.max(0,Math.min(1,score));
  return {score,reason:''};
}

function rankedTenderMatches(description,tenderId){
  const candidates=state.itens.filter(i=>i.licitacao_id===tenderId);
  return candidates
    .map(item=>({item,...quoteMatchScore(description,item.descricao)}))
    .sort((a,b)=>b.score-a.score);
}

function bestTenderItemMatch(description,tenderId){
  const ranked=rankedTenderMatches(description,tenderId);
  const best=ranked[0]||{item:null,score:0,reason:'sem candidatos'};
  const second=ranked[1]||{score:0};

  // Associação automática somente com confiança alta e distância segura do segundo colocado.
  const auto=best.score>=0.58 && (best.score-second.score)>=0.10;

  // Uma faixa intermediária vira apenas sugestão visual, sem selecionar automaticamente.
  const suggest=!auto && best.score>=0.38;

  return {
    item:auto?best.item:null,
    suggestedItem:suggest?best.item:null,
    score:best.score,
    secondScore:second.score,
    auto,
    suggest,
    reason:best.reason
  };
}

function parseBrazilianNumber(value){
  if(typeof value==='number'&&Number.isFinite(value))return value;
  let s=String(value??'').trim().replace(/\s/g,'').replace(/R\$/gi,'');
  if(!s)return null;
  if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');
  else if(s.includes(','))s=s.replace(',','.');
  s=s.replace(/[^\d.-]/g,'');
  const n=Number(s);
  return Number.isFinite(n)?n:null;
}

function pickHeaderIndex(headers,patterns){
  const H=headers.map(h=>quoteNormalize(h));
  return H.findIndex(h=>patterns.some(p=>h.includes(p)));
}

function rowsFromSheetData(data){
  if(!Array.isArray(data)||!data.length)return [];
  let headerIndex=0;
  for(let r=0;r<Math.min(data.length,15);r++){
    const cells=(data[r]||[]).map(x=>quoteNormalize(x));
    const hasDesc=cells.some(x=>/DESCR|PRODUTO|ITEM|MATERIAL/.test(x));
    const hasPrice=cells.some(x=>/PRECO|VALOR|UNITARIO|UNIT/.test(x));
    if(hasDesc&&hasPrice){headerIndex=r;break;}
  }
  const headers=(data[headerIndex]||[]).map(x=>String(x??''));
  const descI=pickHeaderIndex(headers,['DESCR','PRODUTO','MATERIAL','ESPECIF']);
  const priceI=pickHeaderIndex(headers,['PRECO UNIT','VALOR UNIT','UNITARIO','PRECO','VALOR']);
  const qtyI=pickHeaderIndex(headers,['QTD','QUANT','QTDE']);
  const unitI=pickHeaderIndex(headers,['UNIDADE','UNID',' UND','UN']);
  const brandI=pickHeaderIndex(headers,['MARCA','MODELO']);
  const codeI=pickHeaderIndex(headers,['CODIGO','COD','REF']);
  const packI=pickHeaderIndex(headers,['APRESENT','EMBAL','PACOTE']);

  const out=[];
  for(let r=headerIndex+1;r<data.length;r++){
    const row=data[r]||[];
    let description=descI>=0?String(row[descI]??'').trim():'';
    let price=priceI>=0?parseBrazilianNumber(row[priceI]):null;

    if(!description||price==null){
      const strings=row.map(x=>String(x??'').trim()).filter(Boolean);
      if(!description)description=strings.filter(x=>/[A-Za-zÀ-ÿ]{3}/.test(x)).sort((a,b)=>b.length-a.length)[0]||'';
      if(price==null){
        const nums=row.map(parseBrazilianNumber).filter(x=>x!=null&&x>0);
        if(nums.length)price=nums[nums.length-1];
      }
    }

    if(!description||price==null||price<=0)continue;
    out.push({
      code:codeI>=0?String(row[codeI]??''):'',
      description,
      quantity:qtyI>=0?parseBrazilianNumber(row[qtyI]):null,
      unit:unitI>=0?String(row[unitI]??''):'',
      price,
      brand:brandI>=0?String(row[brandI]??''):'',
      presentation:packI>=0?String(row[packI]??''):'',
      factor:1,
      selected:true
    });
  }
  return out.slice(0,1000);
}

async function parseSpreadsheetFile(file){
  if(!window.XLSX)throw new Error('Biblioteca de Excel não carregou. Atualize a página e tente novamente.');
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:'array',cellDates:false});
  const all=[];
  for(const name of wb.SheetNames){
    const sheet=wb.Sheets[name];
    const data=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''});
    const rows=rowsFromSheetData(data);
    if(rows.length)all.push(...rows);
  }
  return all;
}


function groupPdfTextItems(items){
  // Agrupamento mais preciso por coordenada Y.
  // O agrupamento antigo arredondava de 3 em 3 pontos e podia juntar
  // linhas diferentes do PDF, fazendo produtos desaparecerem.
  const rows=[];

  for(const it of items){
    const text=String(it.str||'').trim();
    if(!text)continue;

    const y=Number(it.transform?.[5]||0);
    const x=Number(it.transform?.[4]||0);

    let row=rows.find(r=>Math.abs(r.y-y)<=1.25);

    if(!row){
      row={y,items:[]};
      rows.push(row);
    }

    row.items.push({x,text});
  }

  return rows
    .sort((a,b)=>b.y-a.y)
    .map(row=>
      row.items
        .sort((a,b)=>a.x-b.x)
        .map(v=>v.text)
        .join(' ')
        .replace(/\s+/g,' ')
        .trim()
    )
    .filter(Boolean);
}

function pdfLinesByEol(items){
  const lines=[];
  let current=[];

  for(const it of items){
    const text=String(it.str||'').trim();

    if(text)current.push(text);

    if(it.hasEOL){
      const line=current.join(' ').replace(/\s+/g,' ').trim();
      if(line)lines.push(line);
      current=[];
    }
  }

  const last=current.join(' ').replace(/\s+/g,' ').trim();
  if(last)lines.push(last);

  return lines;
}

function quotePdfUnitRegex(){
  return '(?:UN|UND|UNID|PC|PÇ|PCA|RL|ROLO|SC|SACO|CT|KG|G|MT|M|M2|M3|BD|BALDE|GL|GALAO|GALÃO|PA|PAR|PT|PCT|CX|CAIXA|FD|FARDO|LT|L|ML|JG|JOGO|KIT|DZ)';
}

function quotePdfMoneyRegex(){
  return '(?:\\d{1,3}(?:\\.\\d{3})*|\\d+),\\d{2,4}';
}

function parseQuotePdfProduct(raw){
  const line=String(raw||'')
    .replace(/\u00a0/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  if(!line)return null;

  if(
    /^(CODIGO|CÓDIGO|DESCRIÇÃO|DESCRICAO|VENDEDOR|CLIENTE|CONDICOES|CONDIÇÕES|VALIDADE|PRAZO|GARANTIA|OBSERVAÇÕES|OBSERVACOES|CNPJ|CPF|RUA|TELEFONE|E-MAIL|EMAIL)/i.test(line)
  )return null;

  if(/\bSUB-?TOTAL\b|\bTOTAL\s*:/i.test(line))return null;

  const unitRx=quotePdfUnitRegex();
  const moneyRx=quotePdfMoneyRegex();

  // Formato da COMFIL e da maioria das cotações:
  // código | descrição | unidade | quantidade | preço unitário | subtotal
  const rx=new RegExp(
    '^\\s*([A-Z0-9._/-]{4,20})\\s+(.+?)\\s+('+unitRx+')\\s+(\\d+(?:[.,]\\d+)?)\\s+(?:R\\$\\s*)?('+moneyRx+')\\s+(?:R\\$\\s*)?('+moneyRx+')\\s*$',
    'i'
  );

  const m=line.match(rx);
  if(!m)return null;

  const code=String(m[1]||'').trim();

  // Evita transformar outros números do cabeçalho em código de produto.
  if(!/\d/.test(code))return null;

  let description=String(m[2]||'')
    .replace(/\s+/g,' ')
    .trim();

  const unit=String(m[3]||'').trim().toUpperCase();
  const quantity=parseBrazilianNumber(m[4]);
  const unitPrice=parseBrazilianNumber(m[5]);
  const subtotal=parseBrazilianNumber(m[6]);

  if(!description || unitPrice==null || unitPrice<=0)return null;

  let brand='';

  // Na cotação da COMFIL a marca geralmente vem após " - ".
  const brandMatch=description.match(
    /\s+-\s+([A-Z0-9][A-Z0-9 .&/'()_-]{1,60})$/i
  );

  if(brandMatch){
    brand=brandMatch[1].trim();
    description=description.slice(0,brandMatch.index).trim();
  }

  return {
    code,
    description,
    quantity,
    unit,
    price:unitPrice,
    subtotal,
    brand,
    presentation:'',
    factor:1,
    selected:true
  };
}

function rowsFromPdfLines(lines){
  const out=[];

  for(let i=0;i<lines.length;i++){
    const current=String(lines[i]||'')
      .replace(/\u00a0/g,' ')
      .replace(/\s+/g,' ')
      .trim();

    if(!current)continue;

    let row=parseQuotePdfProduct(current);

    if(row){
      out.push(row);
      continue;
    }

    // PDFs podem quebrar uma linha de produto em 2 ou 3 linhas.
    if(i+1<lines.length){
      const joined2=`${current} ${String(lines[i+1]||'').trim()}`;
      row=parseQuotePdfProduct(joined2);

      if(row){
        out.push(row);
        continue;
      }
    }

    if(i+2<lines.length){
      const joined3=[
        current,
        String(lines[i+1]||'').trim(),
        String(lines[i+2]||'').trim()
      ].join(' ');

      row=parseQuotePdfProduct(joined3);

      if(row)out.push(row);
    }
  }

  return dedupeQuotePdfRows(out);
}

function rowsFromPdfFlatText(text){
  const cleaned=String(text||'')
    .replace(/\u00a0/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  if(!cleaned)return [];

  const unitRx=quotePdfUnitRegex();
  const moneyRx=quotePdfMoneyRegex();

  /*
    Estratégia de segurança:
    procura cada produto pelo início do código e termina exatamente
    depois do subtotal. Isso funciona mesmo quando o PDF.js não
    preserva corretamente as quebras de linha.
  */
  const rx=new RegExp(
    '(?:^|\\s)(\\d{4,8})\\s+(.+?)\\s+('+unitRx+')\\s+(\\d+(?:[.,]\\d+)?)\\s+(?:R\\$\\s*)?('+moneyRx+')\\s+(?:R\\$\\s*)?('+moneyRx+')(?=\\s+(?:\\d{4,8}\\s+|Vendedor\\s*:|Sub-?Total\\s*:|Total\\s*:|$))',
    'gi'
  );

  const rows=[];
  let m;

  while((m=rx.exec(cleaned))!==null){
    const line=[
      m[1],
      m[2],
      m[3],
      m[4],
      m[5],
      m[6]
    ].join(' ');

    const row=parseQuotePdfProduct(line);
    if(row)rows.push(row);
  }

  return dedupeQuotePdfRows(rows);
}

function dedupeQuotePdfRows(rows){
  const seen=new Set();

  return rows.filter(r=>{
    const key=[
      quoteNormalize(r.code),
      quoteNormalize(r.description),
      quoteNormalize(r.brand),
      Number(r.quantity||0),
      Number(r.price||0).toFixed(4),
      Number(r.subtotal||0).toFixed(2)
    ].join('|');

    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,5000);
}

async function parsePdfFile(file){
  const pdfjs=await import(
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs'
  );

  pdfjs.GlobalWorkerOptions.workerSrc=
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

  const buf=await file.arrayBuffer();
  const pdf=await pdfjs.getDocument({data:buf}).promise;

  const candidates=[];

  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);

    const content=await page.getTextContent({
      normalizeWhitespace:true,
      disableCombineTextItems:false
    });

    const preciseLines=groupPdfTextItems(content.items);
    const eolLines=pdfLinesByEol(content.items);

    // 1) tenta pelas linhas reconstruídas por coordenada
    candidates.push(...rowsFromPdfLines(preciseLines));

    // 2) tenta pelas quebras EOL nativas do PDF.js
    candidates.push(...rowsFromPdfLines(eolLines));

    // 3) tenta pelo texto inteiro da página; recupera produtos que
    // ficaram partidos ou agrupados incorretamente.
    const flatText=content.items
      .map(it=>String(it.str||'').trim())
      .filter(Boolean)
      .join(' ');

    candidates.push(...rowsFromPdfFlatText(flatText));
  }

  return dedupeQuotePdfRows(candidates);
}

function compactExtractedQuoteRows(rows){
  const compact=[];
  for(const source of Array.isArray(rows)?rows:[]){
    if(compact.length>=500)break;
    const description=String(source?.description||'').trim().slice(0,1800);
    const unitPrice=Number(source?.unit_price??source?.price);
    if(!description||!Number.isFinite(unitPrice)||unitPrice<=0)continue;
    const quantity=Number(source?.quantity);
    const subtotal=Number(source?.subtotal);
    compact.push({
      row_index:compact.length,
      code:String(source?.code||'').trim().slice(0,120),
      description,
      quantity:Number.isFinite(quantity)&&quantity>0?quantity:null,
      unit:String(source?.unit||'').trim().slice(0,40),
      unit_price:unitPrice,
      subtotal:Number.isFinite(subtotal)&&subtotal>0?subtotal:null,
      brand:String(source?.brand||'').trim().slice(0,160),
      presentation:String(source?.presentation||'').trim().slice(0,300)
    });
  }
  return compact;
}

async function downloadStoredQuoteFile(context){
  const {data,error}=await supabase.storage.from('quote-files').download(context.storagePath);
  if(error||!data)throw new Error('Não foi possível baixar o PDF armazenado para reprocessamento.');
  return new File([data],context.sourceFilename||'cotacao-armazenada.pdf',{type:'application/pdf',lastModified:Date.now()});
}


function setupManualQuoteMode(){
  const help=$('.quote-import-help span');
  if(help){
    help.innerHTML=state.demo
      ?'A demonstração faz uma simulação textual local. A leitura multimodal por IA, o arquivamento privado e o salvamento online exigem login.'
      :'Envie um <b>PDF de até 25 MB</b>. A IA salva automaticamente somente relações de alta confiança; as demais ficam separadas para revisão.';
  }
}

function setQuoteImportStatus(message,type='loading'){
  const el=$('#quoteImportStatus');
  if(!el)return;
  el.hidden=!message;
  el.className=`quote-import-status ${type}`;
  el.textContent=message||'';
}

const QUOTE_IMPORT_STEPS=['upload','reading','matching','saving'];
function setQuoteImportProgress(step=''){
  const el=$('#quoteImportProgress');
  if(!el)return;
  el.hidden=!step;
  const activeIndex=step==='done'?QUOTE_IMPORT_STEPS.length:QUOTE_IMPORT_STEPS.indexOf(step);
  el.querySelectorAll('[data-quote-step]').forEach((node,index)=>{
    node.classList.toggle('done',activeIndex===QUOTE_IMPORT_STEPS.length||index<activeIndex);
    node.classList.toggle('active',index===activeIndex);
  });
}

function setQuoteRetryVisible(visible,label='Tentar novamente'){
  const btn=$('#quoteRetryBtn');
  if(btn){btn.hidden=!visible;btn.textContent=label;}
}

const QUOTE_AI_ERROR_MESSAGES={
  AI_INVALID_REQUEST:'A IA recusou o formato da solicitação. Atualize a página e tente novamente.',
  AI_UNAUTHORIZED:'A integração com a IA não está autenticada. A configuração do serviço precisa ser revisada.',
  AI_FORBIDDEN:'A integração não tem permissão para usar o modelo de IA configurado.',
  AI_MODEL_NOT_FOUND:'O modelo de IA configurado não está disponível. Tente novamente para usar o modelo alternativo.',
  AI_RATE_LIMIT:'A IA atingiu o limite de uso. Aguarde um pouco e tente novamente.',
  AI_UNAVAILABLE:'O serviço de IA está temporariamente indisponível. Tente novamente em instantes.',
  AI_TIMEOUT:'A leitura do PDF demorou além do limite. Tente novamente.',
  AI_INVALID_RESPONSE:'A resposta da IA não pôde ser validada. Tente novamente.'
};

async function quoteAiInvokeFailure(error,data){
  let payload=data&&typeof data==='object'?data:null;
  const context=error?.context;
  if(context&&typeof context.json==='function'){
    try{payload=await context.json();}catch{/* Resposta sem JSON: usa mensagem segura local. */}
  }
  const proposed=String(payload?.code||'');
  const code=Object.hasOwn(QUOTE_AI_ERROR_MESSAGES,proposed)?proposed:'AI_UNAVAILABLE';
  const message=QUOTE_AI_ERROR_MESSAGES[code];
  const failure=new Error(message);
  failure.code=code;
  return failure;
}

function mapAiQuoteLines(data,tenderId){
  const allowed=new Set(state.itens.filter(i=>String(i.licitacao_id)===String(tenderId)).map(i=>String(i.id)));
  return (Array.isArray(data?.lines)?data.lines:[]).slice(0,1000).map((line,index)=>{
    const match=line?.match||{};
    const itemId=allowed.has(String(match.tender_item_id||''))?String(match.tender_item_id):'';
    const confidence=Math.max(0,Math.min(1,Number(match.confidence)||0));
    const factorConfidence=Math.max(0,Math.min(1,Number(match.factor_confidence)||0));
    const incompatibilities=Array.isArray(match.incompatibilities)?match.incompatibilities.map(String).slice(0,12):[];
    const factor=Number(line.package_base_quantity||1);
    const price=Number(line.unit_price||line.price||0);
    const safeToSave=Boolean(
      line.safe_to_save===true&&itemId&&price>0&&factor>0&&confidence>=.90&&factorConfidence>=.85&&!incompatibilities.length
    );
    return {
      originalOrder:index,code:String(line.code||''),description:String(line.description||'Item não identificado'),
      quantity:Number(line.quantity)||null,unit:String(line.unit||''),price,subtotal:Number.isFinite(Number(line.subtotal))?Number(line.subtotal):null,
      brand:String(line.brand||''),presentation:String(line.presentation||''),factor,page:Number(line.page)||null,
      itemId,editalItemNumber:itemId?Number(state.itens.find(i=>String(i.id)===itemId)?.numero||0):null,
      aiMatched:Boolean(itemId),aiMatchConfidence:confidence,factorConfidence,aiReason:String(match.reason||''),
      incompatibilities,safeToSave,needsReview:!safeToSave,selected:false,savedAutomatically:false
    };
  });
}

function quoteImportSummaryText(tenderId){
  const rows=state.quoteImportRows||[];
  const automatic=rows.filter(r=>r.savedAutomatically).length;
  const approved=rows.filter(r=>r.savedAfterReview).length;
  const review=rows.filter(r=>!r.savedAutomatically&&!r.savedAfterReview&&r.itemId&&r.needsReview).length;
  const unidentified=rows.filter(r=>!r.itemId).length;
  const tenderItems=state.itens.filter(i=>String(i.licitacao_id)===String(tenderId));
  const missing=tenderItems.filter(i=>!quotesForItem(i.id).length).length;
  return `${automatic} salvos automaticamente, ${approved} correções aprovadas, ${review} para revisão, ${unidentified} não identificados e ${missing} itens do edital sem cotação.`;
}

async function persistAutomaticQuoteRows(quoteId,tenderId,supplierId,runToken){
  const rows=state.quoteImportRows||[];
  const counts=new Map();
  rows.forEach(r=>{if(r.itemId)counts.set(String(r.itemId),(counts.get(String(r.itemId))||0)+1);});
  const safeRows=rows.filter(r=>
    r.safeToSave===true&&!r.needsReview&&r.itemId&&counts.get(String(r.itemId))===1&&Number(r.price)>0&&Number(r.factor)>0
  );
  if(runToken!==state.quoteImportRunToken)return 0;

  if(state.demo){
    for(const r of safeRows){
      const existing=state.cotacoes.find(x=>String(x.item_id)===String(r.itemId)&&String(x.fornecedor_id)===String(supplierId));
      const local={id:existing?.id||crypto.randomUUID(),item_id:r.itemId,fornecedor_id:supplierId,preco:Number(r.price),fator_equivalencia:Number(r.factor),frete_rateado:0,apresentacao:r.presentation||'',marca:r.brand||'',ai_match_confidence:r.aiMatchConfidence,needs_review:false};
      if(existing)Object.assign(existing,local);else state.cotacoes.push(local);
      r.savedAutomatically=true;r.selected=false;
    }
    renderAll();
    return safeRows.length;
  }

  if(!safeRows.length)return 0;
  const itemIds=safeRows.map(r=>String(r.itemId));
  const {data:oldRows,error:oldError}=await supabase.from('quote_items').select('id,tender_item_id').eq('quote_id',quoteId).in('tender_item_id',itemIds);
  if(oldError)throw oldError;
  if(runToken!==state.quoteImportRunToken)return 0;

  const payload=safeRows.map(r=>({
    quote_id:quoteId,tender_item_id:r.itemId,supplier_description:r.description,
    brand:r.brand||null,package_description:r.presentation||null,package_base_quantity:Number(r.factor),
    unit_price:Number(r.price),freight_per_package:0,ai_match_confidence:Number(r.aiMatchConfidence),needs_review:false
  }));
  const insertedIds=[];
  try{
    for(let start=0;start<payload.length;start+=300){
      const {data:inserted,error}=await supabase.from('quote_items').insert(payload.slice(start,start+300)).select('id');
      if(error)throw error;
      insertedIds.push(...(inserted||[]).map(x=>x.id));
    }
    const obsoleteIds=(oldRows||[]).map(x=>x.id);
    if(obsoleteIds.length){
      const {error:deleteError}=await supabase.from('quote_items').delete().in('id',obsoleteIds);
      if(deleteError)throw deleteError;
    }
  }catch(error){
    if(insertedIds.length)await supabase.from('quote_items').delete().in('id',insertedIds);
    throw error;
  }
  safeRows.forEach(r=>{r.savedAutomatically=true;r.selected=false;});
  return safeRows.length;
}

async function findOrCreateAiQuote(tenderId,supplierId,file){
  const existing=state.quotes
    .filter(q=>String(q.tender_id)===String(tenderId)&&String(q.supplier_id)===String(supplierId)&&q.source_type==='pdf-ai')
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
  const base={source_filename:file.name,source_type:'pdf-ai',status:'uploading',ai_error:null};
  if(existing){
    const previousStoragePath=existing.storage_path||'';
    const {data,error}=await supabase.from('quotes').update(base).eq('id',existing.id).select().single();
    if(error)throw error;
    Object.assign(existing,data);
    return {quote:existing,created:false,previousStoragePath};
  }
  const {data,error}=await supabase.from('quotes').insert({
    company_id:currentCompanyId(),tender_id:tenderId,supplier_id:supplierId,created_by:state.user.id,...base
  }).select().single();
  if(error)throw error;
  state.quotes.unshift(data);
  return {quote:data,created:true,previousStoragePath:''};
}

function offerStoredAiQuoteRetry(tenderId,supplierId){
  if(state.demo||!tenderId||!supplierId)return false;
  const quote=state.quotes
    .filter(q=>String(q.tender_id)===String(tenderId)&&String(q.supplier_id)===String(supplierId)&&q.source_type==='pdf-ai'&&q.status==='error'&&q.storage_path)
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
  if(!quote)return false;
  state.quoteImportContext={tenderId:String(tenderId),supplierId:String(supplierId),fileKey:'',quoteId:quote.id,storagePath:quote.storage_path,sourceFilename:quote.source_filename||'PDF armazenado',mode:'ai'};
  state.quoteImportLastError=true;
  setQuoteRetryVisible(true,'Reprocessar PDF armazenado');
  setQuoteImportStatus(`O PDF “${quote.source_filename||'armazenado'}” já foi enviado. Você pode reprocessá-lo sem fazer outro upload.`,'warn');
  return true;
}

async function startAutomaticQuoteImport(force=false){
  const tenderId=$('#quoteImportTender')?.value||'';
  const supplierId=$('#quoteImportSupplier')?.value||'';
  const file=$('#quoteImportFile')?.files?.[0];
  if(!tenderId||!supplierId)return;
  if(state.quoteImportBusy)return;
  const context=state.quoteImportContext;
  const retryContext=force&&!state.demo&&context?.quoteId&&context?.storagePath&&
    String(context.tenderId)===String(tenderId)&&String(context.supplierId)===String(supplierId)?context:null;
  if(!file&&!retryContext){
    if(context&&(String(context.tenderId)!==String(tenderId)||String(context.supplierId)!==String(supplierId)))clearQuoteImportPreview();
    offerStoredAiQuoteRetry(tenderId,supplierId);
    return;
  }

  const ext=file?.name.toLowerCase().split('.').pop()||'';
  if(file&&file.size>MAX_QUOTE_FILE_SIZE)return toast('O arquivo excede o limite de 25 MB.','error');
  if(!retryContext&&state.demo){
    if(!['pdf','csv'].includes(ext))return toast('Na demonstração, use PDF textual ou CSV.','error');
  }else if(!retryContext&&(ext!=='pdf'||(file.type&&!['application/pdf','application/octet-stream'].includes(String(file.type).toLowerCase())))){
    return toast('No modo online, selecione um arquivo PDF válido.','error');
  }

  const runToken=crypto.randomUUID();
  state.quoteImportRunToken=runToken;
  state.quoteImportBusy=true;
  state.quoteImportLastError=false;
  state.quoteImportRows=[];
  if(!retryContext)state.quoteImportContext=null;
  setQuoteRetryVisible(false);
  renderQuoteImportPreview();
  const supplierInput=$('#quoteImportSupplier');
  const fileInput=$('#quoteImportFile');
  if(supplierInput)supplierInput.disabled=true;
  if(fileInput)fileInput.disabled=true;

  let quoteId=retryContext?.quoteId||'';
  try{
    if(state.demo){
      setQuoteImportProgress('upload');
      setQuoteImportStatus('Lendo o arquivo na demonstração…','loading');
      let rows=ext==='csv'?await parseSpreadsheetFile(file):await parsePdfFile(file);
      if(runToken!==state.quoteImportRunToken)return;
      if(!rows.length)throw new Error('Nenhuma linha com produto e preço foi encontrada');
      rows.forEach((r,index)=>{r.originalOrder=index;r.itemId='';r.selected=false;});
      autoRelateSafeQuoteRows(tenderId,rows);
      rows.forEach(r=>{
        r.aiMatchConfidence=Number(r.matchScore||0);
        r.factorConfidence=r.autoTextMatched ? .90 : 0;
        r.safeToSave=Boolean(r.itemId&&r.autoTextMatched&&r.aiMatchConfidence>=.90&&Number(r.price)>0&&Number(r.factor||1)>0);
        r.needsReview=!r.safeToSave;r.factor=Number(r.factor||1);r.savedAutomatically=false;
      });
      state.quoteImportRows=rows;
      state.quoteImportContext={tenderId:String(tenderId),supplierId:String(supplierId),fileKey:quoteImportFileKey(file),mode:'demo'};
      setQuoteImportProgress('matching');
      renderQuoteImportPreview();
      setQuoteImportProgress('saving');
      await persistAutomaticQuoteRows('',tenderId,supplierId,runToken);
    }else{
      if(retryContext){
        setQuoteImportProgress('reading');
        setQuoteImportStatus('Baixando o PDF armazenado para identificar os itens…','loading');
      }else{
        setQuoteImportProgress('upload');
        setQuoteImportStatus('Enviando o PDF para o arquivo privado…','loading');
        const signature=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
        if(signature!=='%PDF-')throw new Error('O arquivo selecionado não possui uma assinatura PDF válida.');
        const createdResult=await findOrCreateAiQuote(tenderId,supplierId,file);
        const quote=createdResult.quote;
        quoteId=quote.id;
        if(runToken!==state.quoteImportRunToken)return;
        const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        const path=`${currentCompanyId()}/${quote.id}/${Date.now()}-${safeName}`;
        const {error:uploadError}=await supabase.storage.from('quote-files').upload(path,file,{upsert:false,contentType:'application/pdf'});
        if(uploadError){
          if(createdResult.created)await supabase.from('quotes').delete().eq('id',quote.id);
          throw new Error('Não foi possível enviar o PDF ao arquivo privado. Tente novamente.');
        }
        if(runToken!==state.quoteImportRunToken){
          await supabase.storage.from('quote-files').remove([path]);
          if(createdResult.created)await supabase.from('quotes').delete().eq('id',quote.id);
          return;
        }
        const {error:updateError}=await supabase.from('quotes').update({storage_path:path,status:'processing',source_filename:file.name,source_type:'pdf-ai',ai_error:null}).eq('id',quote.id);
        if(updateError){
          await supabase.storage.from('quote-files').remove([path]);
          if(createdResult.created)await supabase.from('quotes').delete().eq('id',quote.id);
          throw new Error('O PDF foi enviado, mas não pôde ser vinculado à cotação. Tente novamente.');
        }
        state.quoteImportContext={tenderId:String(tenderId),supplierId:String(supplierId),fileKey:quoteImportFileKey(file),quoteId:quote.id,storagePath:path,sourceFilename:file.name,mode:'ai'};
        if(createdResult.previousStoragePath&&createdResult.previousStoragePath!==path){
          const {error:oldFileError}=await supabase.storage.from('quote-files').remove([createdResult.previousStoragePath]);
          if(oldFileError)console.warn('Não foi possível remover o PDF anterior já substituído.');
        }
      }
      if(runToken!==state.quoteImportRunToken)return;

      setQuoteImportProgress('reading');
      if(!retryContext)setQuoteImportStatus('PDF enviado. Identificando os itens do documento…','loading');
      const parserFile=retryContext?await downloadStoredQuoteFile(retryContext):file;
      if(runToken!==state.quoteImportRunToken)return;
      let extractedRows=[];
      try{
        extractedRows=compactExtractedQuoteRows(await parsePdfFile(parserFile));
      }catch(parserError){
        console.warn('Extração textual local indisponível; usando leitura multimodal da IA.');
      }
      if(runToken!==state.quoteImportRunToken)return;
      if(state.quoteImportContext)state.quoteImportContext.extractedRows=extractedRows;
      // O parser local serve apenas para diagnóstico. A IA sempre recebe o PDF
      // original completo: uma extração textual parcial nunca mais substitui o
      // documento e, portanto, não pode fazer produtos desaparecerem.
      const invokeBody={quote_id:quoteId,parser_version:QUOTE_PARSER_VERSION};
      setQuoteImportProgress('reading');
      setQuoteImportStatus(
        extractedRows.length
          ?`${extractedRows.length} linhas preliminares encontradas. A IA está conferindo o PDF completo…`
          :'A IA está lendo o PDF completo, inclusive páginas sem texto selecionável…',
        'loading'
      );
      const {data,error}=await supabase.functions.invoke('ai-match-quote',{body:invokeBody});
      if(runToken!==state.quoteImportRunToken)return;
      if(error||data?.error)throw await quoteAiInvokeFailure(error,data);
      setQuoteImportProgress('matching');
      setQuoteImportStatus('Relacionamento concluído. Validando os itens identificados…','loading');
      state.quoteImportRows=mapAiQuoteLines(data,tenderId);
      renderQuoteImportPreview();
      setQuoteImportProgress('saving');
      setQuoteImportStatus('Salvando somente as correspondências seguras…','loading');
      await persistAutomaticQuoteRows(quoteId,tenderId,supplierId,runToken);
      if(runToken!==state.quoteImportRunToken)return;
      const hasReview=state.quoteImportRows.some(r=>!r.savedAutomatically&&r.needsReview);
      await supabase.from('quotes').update({status:hasReview?'needs_review':'completed',ai_error:null}).eq('id',quoteId);
      await refreshAll();
    }

    if(runToken!==state.quoteImportRunToken)return;
    setQuoteImportProgress('done');
    const summary=quoteImportSummaryText(tenderId);
    setQuoteImportStatus(summary,'success');
    renderQuoteImportPreview();
    const pendingReview=state.quoteImportRows.filter(r=>!r.savedAutomatically&&!r.savedAfterReview&&r.needsReview&&!r.ignored).length;
    setQuoteWorkspaceSection(pendingReview?'review':'quoted',false);
    toast('A leitura automática da cotação foi concluída.');
  }catch(error){
    if(runToken!==state.quoteImportRunToken)return;
    console.warn('Importação automática de cotação:',error?.code||'IMPORT_ERROR');
    state.quoteImportLastError=true;
    setQuoteImportProgress(state.quoteImportContext?.storagePath?'reading':'');
    setQuoteRetryVisible(true,state.quoteImportContext?.storagePath?'Reprocessar PDF armazenado':'Tentar novamente');
    setQuoteImportStatus(error?.message||'Não foi possível concluir a leitura automática. Tente novamente.','error');
    if(!state.demo&&quoteId&&supabase&&error?.code)await supabase.from('quotes').update({status:'error',ai_error:error.code}).eq('id',quoteId);
  }finally{
    if(runToken===state.quoteImportRunToken){
      state.quoteImportBusy=false;
      if(supplierInput)supplierInput.disabled=false;
      if(fileInput)fileInput.disabled=false;
    }
  }
}

function quoteImportFileKey(file){
  if(!file)return '';
  return `${file.name}:${file.size}:${file.lastModified||0}`;
}

function clearQuoteImportPreview(message=''){
  const hadPreview=Boolean(state.quoteImportRows.length||state.quoteImportContext);
  state.quoteImportRunToken=crypto.randomUUID();
  state.quoteImportBusy=false;
  state.quoteImportLastError=false;
  state.quoteImportRows=[];
  state.quoteImportContext=null;
  state.quoteImportFilter='';
  state.quoteOnlyUnrelated=false;
  state.quoteSupplierSearches={};
  setQuoteRetryVisible(false);
  renderQuoteImportPreview();
  if(message&&hadPreview)setQuoteImportStatus(message,'warn');
  else if(!hadPreview)setQuoteImportStatus('','loading');
}

function quoteItemOptions(tenderId,selectedId='',searchTerm=''){
  const term=quoteNormalize(searchTerm);
  const items=state.itens
    .filter(i=>i.licitacao_id===tenderId)
    .sort((a,b)=>Number(a.numero)-Number(b.numero))
    .filter(i=>{
      if(!term)return true;
      const hay=quoteNormalize(`ITEM ${i.numero} ${i.descricao||''} ${i.unidade||''}`);
      return hay.includes(term);
    });

  const selectedItem=state.itens.find(i=>String(i.id)===String(selectedId));

  let html=`<option value="">Não relacionado</option>`;

  // Se o usuário filtrou a lista, preserva o item já selecionado mesmo que ele não bata com a nova busca.
  if(selectedItem && !items.some(i=>String(i.id)===String(selectedId))){
    html+=`<option value="${selectedItem.id}" selected>Item ${esc(selectedItem.numero)} • ${esc(selectedItem.descricao)}</option>`;
  }

  html+=items.map(i=>`<option value="${i.id}" ${String(i.id)===String(selectedId)?'selected':''}>Item ${esc(i.numero)} • ${esc(i.descricao)}</option>`).join('');
  return html;
}


function prepareQuoteRowsByTenderOrder(tenderId){
  const rows=state.quoteImportRows||[];

  rows.forEach((r,index)=>{
    r.originalOrder ??= index;

    // V12: não força associação local; a IA ou o usuário decide.
    const item=state.itens.find(i=>i.id===r.itemId);
    r.editalItemNumber=item ? Number(item.numero) : null;
  });

  // Ordem oficial do edital:
  // 1) itens relacionados, pelo número do item do edital
  // 2) itens não relacionados, no final, mantendo a ordem original do PDF
  rows.sort((a,b)=>{
    const aMatched=Number.isFinite(a.editalItemNumber);
    const bMatched=Number.isFinite(b.editalItemNumber);

    if(aMatched && bMatched){
      if(a.editalItemNumber!==b.editalItemNumber){
        return a.editalItemNumber-b.editalItemNumber;
      }
      return (a.originalOrder||0)-(b.originalOrder||0);
    }

    if(aMatched) return -1;
    if(bMatched) return 1;

    return (a.originalOrder||0)-(b.originalOrder||0);
  });

  return rows;
}



function ensureQuoteWorkspaceStyles(){
  if(document.getElementById('quoteWorkspaceStyles'))return;
  const style=document.createElement('style');
  style.id='quoteWorkspaceStyles';
  style.textContent=`
    #cotacoes{--qw-line:#273d48;--qw-card:#091a23;--qw-muted:#9aabb5;--qw-text:#f2f6f8;--qw-accent:#f4b72b;max-width:100%;overflow-x:clip}
    #cotacoes .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
    #cotacoes .quote-workspace-header{display:flex;justify-content:space-between;align-items:end;gap:24px;margin:0 0 14px;padding:20px;border:1px solid var(--qw-line);border-radius:14px;background:linear-gradient(135deg,#0b1c26,#081720)}
    #cotacoes .quote-workspace-header h1{margin:0;color:var(--qw-text);font-size:1.55rem}
    #cotacoes .quote-workspace-header p{margin:6px 0 0;color:var(--qw-muted)}
    #cotacoes .quote-tender-field{display:grid;gap:7px;min-width:min(390px,44vw);color:#c9d4da;font-size:.78rem;font-weight:800}
    #cotacoes .quote-tender-field select{width:100%;min-height:44px}
    #cotacoes .quote-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}
    #cotacoes .quote-summary-card{padding:14px 16px;border:1px solid var(--qw-line);border-radius:11px;background:var(--qw-card)}
    #cotacoes .quote-summary-card span{display:block;color:var(--qw-muted);font-size:.72rem}
    #cotacoes .quote-summary-card strong{display:block;margin-top:4px;color:var(--qw-text);font-size:1.25rem}
    #cotacoes .quote-summary-card.is-good strong{color:#45dd88}
    #cotacoes .quote-summary-card.is-warn strong{color:#ffd05a}
    #cotacoes .quote-primary-actions{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px}
    #cotacoes .quote-primary-actions button{min-height:42px}
    #cotacoes .quote-primary-actions button.active{outline:2px solid rgba(244,183,43,.4);outline-offset:2px}
    #cotacoes .quote-editor-panel{margin-bottom:14px}
    #cotacoes .quote-manual-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    #cotacoes .quote-manual-form>label,#cotacoes .quote-advanced-fields label{display:grid;gap:6px;color:#c7d2d8;font-size:.78rem;font-weight:750}
    #cotacoes .quote-manual-form input,#cotacoes .quote-manual-form select{width:100%;min-width:0}
    #cotacoes .quote-unit-preview{grid-column:1/-1;padding:14px 16px;border:1px solid #315266;border-radius:10px;background:#071720;color:#c8d5dc;line-height:1.5}
    #cotacoes .quote-unit-preview strong{color:#54dc91;font-size:1.12rem}
    #cotacoes .quote-unit-preview.is-ready{border-color:#237046;background:#09251c}
    #cotacoes .quote-advanced-fields{grid-column:1/-1;border:1px solid var(--qw-line);border-radius:10px;background:#081821}
    #cotacoes .quote-advanced-fields summary{padding:12px 14px;cursor:pointer;color:#d6e0e5;font-weight:800}
    #cotacoes .quote-advanced-fields>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:0 14px 14px}
    #cotacoes .quote-advanced-fields small{color:var(--qw-muted);font-weight:500;line-height:1.35}
    #cotacoes .quote-submit-btn{grid-column:1/-1;justify-self:start;min-width:180px}
    #cotacoes .quote-import-tender-label{margin:-2px 0 12px;padding:10px 12px;border-left:3px solid var(--qw-accent);background:#111c1f;color:#d9e2e7;font-size:.8rem}
    #cotacoes .quote-list-heading{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:14px}
    #cotacoes .quote-list-heading h2{margin-bottom:4px}
    #cotacoes .quote-list-tools{display:flex;align-items:center;justify-content:flex-end;gap:9px;flex-wrap:wrap}
    #cotacoes #quoteWorkspaceSearch{width:min(330px,100%);min-height:40px}
    #cotacoes .quote-filter-buttons{display:flex;gap:6px;flex-wrap:wrap}
    #cotacoes .quote-filter-buttons .active{border-color:#8b6815;color:#ffd35d;background:#201b0d}
    #cotacoes .quote-comparison-scroll{max-width:100%;overflow:auto;border:1px solid var(--qw-line);border-radius:10px}
    #cotacoes .quote-direct-table{width:100%;min-width:850px;border-collapse:collapse}
    #cotacoes .quote-direct-table th{background:#07151d;color:#f7c74f;font-size:.72rem;text-align:left;white-space:nowrap}
    #cotacoes .quote-direct-table td{background:#091a23;vertical-align:middle}
    #cotacoes .quote-direct-table th,#cotacoes .quote-direct-table td{padding:12px;border-bottom:1px solid #203640}
    #cotacoes .quote-direct-table tr:last-child td{border-bottom:0}
    #cotacoes .quote-item-cell{min-width:260px}
    #cotacoes .quote-item-cell strong{display:block;color:#edf3f6}
    #cotacoes .quote-item-cell span{display:block;margin-top:3px;color:var(--qw-muted);font-size:.72rem;line-height:1.35}
    #cotacoes .quote-table-actions{display:flex;gap:6px;flex-wrap:wrap;min-width:150px}
    #cotacoes .quote-table-actions button{white-space:nowrap}
    #cotacoes .quote-empty-list{padding:28px 18px;text-align:center;color:var(--qw-muted)}
    #cotacoes .quote-sheet-controls{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;color:var(--qw-muted);font-size:.76rem}
    #cotacoes .quote-export-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
    #cotacoes .quote-sheet-actions{display:flex;gap:6px;align-items:center}
    #cotacoes .quote-sheet-actions button{min-width:36px;padding-inline:10px}
    #cotacoes .quote-sheet-scroll{overflow:auto;border:1px solid var(--qw-line);border-radius:10px}
    #cotacoes .quote-sheet-table{width:100%;min-width:680px;border-collapse:collapse;table-layout:fixed}
    #cotacoes .quote-sheet-table th{background:#07151d;color:#f7c74f;font-size:.72rem;text-align:left;font-weight:800}
    #cotacoes .quote-sheet-table td{background:#091a23;color:var(--qw-text);vertical-align:top}
    #cotacoes .quote-sheet-table th,#cotacoes .quote-sheet-table td{padding:11px 12px;border-bottom:1px solid #203640}
    #cotacoes .quote-sheet-table tr:last-child td{border-bottom:0}
    #cotacoes .quote-sheet-table th:first-child,#cotacoes .quote-sheet-table td:first-child{width:70%}
    #cotacoes .quote-sheet-table th:nth-child(2),#cotacoes .quote-sheet-table td:nth-child(2){width:15%}
    #cotacoes .quote-sheet-table th:nth-child(3),#cotacoes .quote-sheet-table td:nth-child(3){width:15%}
    #cotacoes .quote-sheet-item{display:flex;align-items:flex-start;gap:8px;line-height:1.4}
    #cotacoes .quote-sheet-item span{overflow-wrap:anywhere}
    #cotacoes .quote-sheet-remove{flex:0 0 auto;width:24px;height:24px;padding:0;border:1px solid #6f302d;border-radius:5px;background:#211315;color:#ff766e;font-weight:900;line-height:1;cursor:pointer}
    #cotacoes .quote-sheet-remove:hover{background:#351719}
    #cotacoes :is(button,input,select,summary):focus-visible{outline:3px solid #68afff!important;outline-offset:2px!important}
    #cotacoes .quote-import-warning{margin:0 18px 12px;padding:10px 12px;border:1px solid #805d18;border-radius:8px;background:#251e0c;color:#ffda70;font-size:.76rem}
    #cotacoes .quote-origin-line{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:7px}
    #cotacoes .quote-origin-line .badge{font-size:.62rem}
    #cotacoes .quote-import-progress{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0;padding:0;list-style:none;counter-reset:quote-step}
    #cotacoes .quote-import-progress li{position:relative;padding:12px 10px 12px 34px;border:1px solid var(--qw-line);border-radius:9px;background:#081821;color:var(--qw-muted);font-size:.72rem;font-weight:750}
    #cotacoes .quote-import-progress li:before{counter-increment:quote-step;content:counter(quote-step);position:absolute;left:10px;top:10px;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#203540;color:#c9d5db;font-size:.64rem}
    #cotacoes .quote-import-progress li.active{border-color:#b58518;background:#241d0a;color:#ffe08a}
    #cotacoes .quote-import-progress li.active:before{background:var(--qw-accent);color:#151000}
    #cotacoes .quote-import-progress li.done{border-color:#237046;background:#09251c;color:#78e8a7}
    #cotacoes .quote-import-progress li.done:before{content:'✓';background:#31b76b;color:#05130b}
    #cotacoes #quoteRetryBtn{margin:0 0 12px}
    @media(max-width:760px){
      #cotacoes .quote-workspace-header{align-items:stretch;flex-direction:column;padding:16px}
      #cotacoes .quote-tender-field{min-width:0;width:100%}
      #cotacoes .quote-summary{grid-template-columns:1fr}
      #cotacoes .quote-manual-form{grid-template-columns:1fr}
      #cotacoes .quote-manual-form>*{grid-column:1!important}
      #cotacoes .quote-advanced-fields>div{grid-template-columns:1fr}
      #cotacoes .quote-submit-btn{width:100%;justify-self:stretch}
      #cotacoes .quote-list-heading{align-items:stretch;flex-direction:column}
      #cotacoes .quote-list-tools{align-items:stretch;justify-content:flex-start;flex-direction:column}
      #cotacoes #quoteWorkspaceSearch{width:100%}
      #cotacoes .quote-filter-buttons{display:grid;grid-template-columns:repeat(3,1fr)}
      #cotacoes .quote-filter-buttons button{padding-inline:7px;font-size:.7rem}
      #cotacoes .quote-comparison-scroll{overflow:visible;border:0}
      #cotacoes .quote-direct-table{display:block;min-width:0}
      #cotacoes .quote-direct-table thead{display:none}
      #cotacoes .quote-direct-table tbody{display:grid;gap:10px}
      #cotacoes .quote-direct-table tr{display:grid;border:1px solid var(--qw-line);border-radius:10px;overflow:hidden}
      #cotacoes .quote-direct-table td{display:grid;grid-template-columns:105px minmax(0,1fr);gap:8px;padding:9px 11px;border-bottom:1px solid #203640;min-width:0;overflow-wrap:anywhere}
      #cotacoes .quote-direct-table td:before{content:attr(data-label);color:#8fa2ad;font-size:.65rem;font-weight:850;text-transform:uppercase}
      #cotacoes .quote-direct-table .quote-item-cell{display:block;min-width:0;padding:13px}
      #cotacoes .quote-direct-table .quote-item-cell:before{display:none}
      #cotacoes .quote-table-actions{min-width:0}
      #cotacoes .quote-table-actions button{flex:1}
    }
    @media(max-width:420px){
      #cotacoes .quote-primary-actions{display:grid;grid-template-columns:1fr}
      #cotacoes .quote-primary-actions button{width:100%}
      #cotacoes .quote-filter-buttons{grid-template-columns:1fr}
      #cotacoes .quote-direct-table td{grid-template-columns:88px minmax(0,1fr)}
      #cotacoes .quote-import-progress{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);
}

function ensureQuoteModernStyles(){
  if(document.getElementById('quoteModernStyles'))return;

  const style=document.createElement('style');
  style.id='quoteModernStyles';
  style.textContent=`
    #cotacoes{
      --q-bg:#07131b;
      --q-panel:#0a1821;
      --q-panel2:#0c1c26;
      --q-line:#213743;
      --q-line2:#2c4654;
      --q-text:#eef4f7;
      --q-muted:#91a2ad;
      --q-yellow:#f4b72b;
      --q-green:#31d477;
      --q-blue:#55a7ff;
      --q-red:#ff5e58;
    }

    #cotacoes .card{
      border-color:var(--q-line);
      background:var(--q-panel);
      border-radius:12px;
      box-shadow:none;
    }

    #cotacoes .quote-preview-head{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:18px;
      padding:16px 18px 10px;
      margin:14px 0 0;
      border:0;
      background:transparent;
    }

    #cotacoes .quote-preview-head strong{
      display:block;
      color:var(--q-text);
      font-size:1rem;
      margin-bottom:4px;
    }

    #cotacoes .quote-preview-head span{
      color:var(--q-muted);
      font-size:.76rem;
    }

    #cotacoes #quoteSaveImportedBtn{
      border:1px solid #197947;
      border-radius:8px;
      padding:10px 15px;
      background:#126c40;
      color:#eafff2;
      font-weight:800;
      cursor:pointer;
      white-space:nowrap;
    }

    .qv-stats{
      display:grid;
      grid-template-columns:1.05fr repeat(3,1fr);
      gap:10px;
      padding:8px 18px 15px;
      margin:0;
      border-bottom:1px solid var(--q-line);
    }

    .qv-stat{
      position:relative;
      overflow:hidden;
      min-height:86px;
      border:1px solid var(--q-line);
      border-radius:8px;
      background:linear-gradient(145deg,#0b1b25,#0a1821);
      padding:13px 14px;
    }

    .qv-stat:before{display:none}

    .qv-stat span{
      display:block;
      color:#a9b5bc;
      font-size:.72rem;
    }

    .qv-stat strong{
      display:block;
      margin-top:4px;
      font-size:1.45rem;
      line-height:1.1;
      color:#f4f8fa;
    }

    .qv-stat:nth-child(1) strong{color:#f5f7f8}
    .qv-stat:nth-child(3) strong{color:var(--q-green)}
    .qv-stat:nth-child(4) strong{color:#b28cff}

    .qv-progress{
      margin:10px 0 0;
      height:5px;
      border-radius:999px;
      background:#172c37;
      overflow:hidden;
    }

    .qv-progress > span{
      height:100%;
      display:block;
      background:var(--q-green);
      border-radius:inherit;
    }

    .qv-info{
      margin:12px 18px;
      padding:9px 12px;
      border:1px solid #185b3b;
      border-radius:8px;
      background:#09251c;
      color:#6ae59a;
      font-size:.73rem;
    }

    .qv-toolbar{
      display:grid;
      grid-template-columns:minmax(360px,1fr) auto auto;
      gap:9px;
      align-items:center;
      padding:0 18px 12px;
      margin:0;
    }

    .qv-toolbar input{
      height:40px;
      border:1px solid var(--q-line2);
      border-radius:7px;
      background:#07151d;
      color:var(--q-text);
      padding:0 13px;
      outline:none;
    }

    .qv-toolbar input:focus{
      border-color:#50809a;
      box-shadow:0 0 0 2px rgba(85,167,255,.08);
    }

    .qv-toolbar .action-btn{
      height:40px;
      border-radius:7px;
      background:#0a1922;
      border-color:var(--q-line2);
      color:#dce5ea;
    }

    .qv-toolbar .action-btn.active{
      border-color:#8b6815;
      color:#ffd35d;
      background:#201b0d;
    }

    .qv-list-head{
      display:none;
    }

    .qv-list{
      display:grid;
      gap:0;
      margin:0 18px;
      border:1px solid var(--q-line);
      border-radius:9px;
      overflow:hidden;
    }

    .qv-row{
      display:grid;
      grid-template-columns:minmax(390px,.92fr) minmax(620px,1.55fr);
      gap:0;
      border:0;
      border-bottom:1px solid var(--q-line);
      border-radius:0;
      background:#091821;
      overflow:hidden;
      transition:background .15s ease;
    }

    .qv-row:last-child{border-bottom:0}
    .qv-row:hover{background:#0b1c26}
    .qv-row.is-linked{border-color:var(--q-line)}

    .qv-edital{
      position:relative;
      display:grid;
      grid-template-columns:82px 1fr;
      gap:17px;
      align-items:stretch;
      padding:0;
      border-right:1px solid var(--q-line);
      background:#0a1922;
    }

    .qv-edital:before{
      content:'';
      position:absolute;
      left:0;
      top:8px;
      bottom:8px;
      width:3px;
      background:var(--q-yellow);
      border-radius:0 3px 3px 0;
    }

    .qv-row.is-linked .qv-edital:before{
      background:var(--q-blue);
    }

    .qv-number{
      width:auto;
      height:auto;
      min-height:142px;
      display:grid;
      place-items:center;
      border:0;
      border-right:1px solid #1d313c;
      border-radius:0;
      color:#dfe7eb;
      background:#0d202b;
      font-weight:900;
      font-size:2rem;
    }

    .qv-edital > div:last-child{
      padding:19px 14px 17px 0;
    }

    .qv-edital-title{
      color:#f5f7f8;
      font-weight:850;
      font-size:.94rem;
      line-height:1.32;
      margin-bottom:10px;
    }

    .qv-edital-title:before{
      content:'ITEM DO EDITAL';
      display:block;
      color:var(--q-yellow);
      font-size:.64rem;
      letter-spacing:.04em;
      margin-bottom:7px;
      font-weight:850;
    }

    .qv-row.is-linked .qv-edital-title:before{
      color:var(--q-blue);
    }

    .qv-edital-meta{
      display:flex;
      gap:12px;
      flex-wrap:wrap;
      color:#a3b0b8;
      font-size:.7rem;
    }

    .qv-meta-chip{
      display:inline-flex;
      padding:0;
      border:0;
      border-radius:0;
      background:transparent;
    }

    .qv-supplier{
      position:relative;
      padding:18px 155px 16px 18px;
      min-width:0;
      min-height:142px;
    }

    .qv-search-line{
      display:grid;
      grid-template-columns:minmax(190px,.65fr) minmax(250px,1fr);
      gap:9px;
      align-items:center;
      margin-bottom:10px;
    }

    .qv-search-line:before{
      content:'PRODUTO ENCONTRADO NO ARQUIVO';
      grid-column:1/-1;
      color:var(--q-green);
      font-size:.64rem;
      letter-spacing:.035em;
      font-weight:850;
      margin-bottom:-2px;
    }

    .qv-row:not(.is-linked) .qv-search-line:before{
      color:var(--q-yellow);
    }

    .qv-search-line input,
    .qv-search-line select,
    .qv-fields input{
      width:100%;
      border:1px solid var(--q-line2);
      border-radius:7px;
      background:#07151d;
      color:#eef3f6;
      min-height:37px;
      padding:7px 10px;
      outline:none;
    }

    .qv-search-line input:focus,
    .qv-search-line select:focus,
    .qv-fields input:focus{
      border-color:#4d819c;
      box-shadow:0 0 0 2px rgba(85,167,255,.08);
    }

    .qv-status{
      position:absolute;
      top:18px;
      right:18px;
      width:115px;
      display:flex;
      justify-content:flex-end;
    }

    .qv-status .badge{
      border-radius:999px;
      padding:7px 12px;
      font-weight:850;
      font-size:.68rem;
      text-transform:uppercase;
    }

    .qv-product{
      display:block;
      padding:0;
      border:0;
      border-radius:0;
      background:transparent;
      margin:2px 0 10px;
    }

    .qv-product .badge{display:none}

    .qv-product-name{
      color:#f1f5f7;
      font-weight:800;
      font-size:.79rem;
      line-height:1.3;
    }

    .qv-product-meta{
      color:#8fa0aa;
      font-size:.67rem;
      margin-top:4px;
    }

    .qv-fields{
      display:grid;
      grid-template-columns:125px 1fr 105px 1fr auto;
      gap:8px;
      align-items:end;
    }

    .qv-field label{
      display:block;
      color:#899aa5;
      font-size:.62rem;
      margin-bottom:4px;
      font-weight:700;
    }

    .qv-field:first-child input{
      color:var(--q-green);
      font-weight:850;
    }

    .qv-remove{
      height:37px;
      border:1px solid #78302e;
      border-radius:7px;
      background:#151113;
      color:#ff6861;
      padding:0 10px;
      font-size:.68rem;
      font-weight:800;
      cursor:pointer;
    }

    .qv-empty{
      padding:12px 0 4px;
      border:0;
      border-radius:0;
      color:#8f9da6;
      background:transparent;
      text-align:left;
      font-size:.72rem;
    }

    .qv-unused{
      margin:12px 18px 18px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      padding:11px 13px;
      border:1px solid var(--q-line);
      border-radius:8px;
      background:#091821;
    }

    .qv-unused strong{
      display:block;
      color:#e8edf1;
      font-size:.76rem;
      margin-bottom:3px;
    }

    .qv-unused span{
      color:#94a2ac;
      font-size:.69rem;
    }

    @media(max-width:1350px){
      .qv-row{grid-template-columns:minmax(350px,.9fr) minmax(540px,1.35fr)}
      .qv-supplier{padding-right:135px}
      .qv-fields{grid-template-columns:110px 1fr 95px 1fr}
      .qv-remove{grid-column:1/-1;width:max-content}
    }

    @media(max-width:1100px){
      .qv-stats{grid-template-columns:repeat(2,1fr)}
      .qv-row{grid-template-columns:1fr}
      .qv-edital{border-right:0;border-bottom:1px solid var(--q-line)}
      .qv-supplier{padding-right:145px}
    }

    @media(max-width:760px){
      .qv-stats{grid-template-columns:1fr 1fr;padding-left:12px;padding-right:12px}
      .qv-toolbar{grid-template-columns:1fr;padding-left:12px;padding-right:12px}
      .qv-list{margin-left:12px;margin-right:12px}
      .qv-unused{margin-left:12px;margin-right:12px}
      .qv-edital{grid-template-columns:64px 1fr}
      .qv-number{font-size:1.45rem;min-height:125px}
      .qv-supplier{padding:14px}
      .qv-status{position:static;width:auto;justify-content:flex-start;margin-bottom:8px}
      .qv-search-line{grid-template-columns:1fr}
      .qv-fields{grid-template-columns:1fr 1fr}
      #cotacoes .quote-preview-head{align-items:flex-start;flex-direction:column}
      #cotacoes #quoteSaveImportedBtn{width:100%}
    }
  `;
  document.head.appendChild(style);
}

function quotePendingReviewRows(){
  return (state.quoteImportRows||[])
    .map((row,index)=>({row,index}))
    .filter(({row})=>!row.savedAutomatically&&!row.savedAfterReview&&row.needsReview&&!row.ignored);
}

function quoteReviewDraftKey(tenderId){
  if(state.demo)return 'inova:quote-review:demo:current';
  const owner=state.user?.id||'anonymous';
  return `inova:quote-review:${owner}:${currentCompanyId()||'local'}:${tenderId||'none'}`;
}

function persistQuoteReviewDraft(){
  const tenderId=state.quoteImportContext?.tenderId||state.quoteViewTenderId||'';
  if(!tenderId||!(state.quoteImportRows||[]).length)return;
  try{
    if(!quotePendingReviewRows().length){
      localStorage.removeItem(quoteReviewDraftKey(tenderId));
      return;
    }
    localStorage.setItem(quoteReviewDraftKey(tenderId),JSON.stringify({
      rows:state.quoteImportRows,
      context:state.quoteImportContext,
      savedAt:Date.now()
    }));
  }catch(error){console.warn('Não foi possível guardar temporariamente a revisão.');}
}

function restoreQuoteReviewDraft(tenderId){
  if(!tenderId||(state.quoteImportRows||[]).length)return;
  try{
    const draft=JSON.parse(localStorage.getItem(quoteReviewDraftKey(tenderId))||'null');
    if(!draft||!Array.isArray(draft.rows)||(!state.demo&&String(draft.context?.tenderId)!==String(tenderId)))return;
    state.quoteImportRows=draft.rows;
    state.quoteImportContext=draft.context;
    if(state.demo&&state.quoteImportContext)state.quoteImportContext.tenderId=String(tenderId);
  }catch(error){console.warn('A revisão temporária anterior não pôde ser restaurada.');}
}

function quoteReviewReason(row){
  const reasons=[...(row.incompatibilities||[])];
  if(!row.itemId)reasons.push('item do edital não confirmado');
  if(!(Number(row.price)>0))reasons.push('preço não confirmado');
  if(!(Number(row.factor)>0))reasons.push('embalagem não confirmada');
  if(!reasons.length&&row.aiReason)reasons.push(row.aiReason);
  return [...new Set(reasons)].join(' • ')||'confira a correspondência antes de salvar';
}

function renderQuoteImportReviewCompact(){
  const el=$('#quoteImportPreview');
  if(!el)return;
  const tenderId=$('#quoteImportTender')?.value||state.quoteViewTenderId||'';
  const items=state.itens
    .filter(item=>String(item.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero));
  const pending=quotePendingReviewRows();
  persistQuoteReviewDraft();
  const count=$('#quoteReviewCount');
  if(count)count.textContent=String(pending.length);
  if(!pending.length){
    el.innerHTML='<div class="quote-review-empty"><strong>Nenhuma dúvida pendente.</strong><br>Os itens seguros já estão em “Itens cotados”.</div>';
    return;
  }
  el.innerHTML=`<div class="quote-review-list">${pending.map(({row,index})=>`
    <article class="quote-review-row" data-quote-row="${index}">
      <div class="quote-review-product">
        <strong>${esc(row.description||'Produto sem descrição')}</strong>
        <span>${row.code?`Cód. ${esc(row.code)} • `:''}${row.unit?esc(row.unit):'unidade não identificada'}${row.page?` • pág. ${esc(row.page)}`:''}</span>
        <div class="quote-review-reason">${esc(quoteReviewReason(row))}</div>
      </div>
      <label>Item correto do edital
        <select data-q-field="itemId">
          <option value="">Selecione o item…</option>
          ${items.map(item=>`<option value="${esc(item.id)}" ${String(row.itemId)===String(item.id)?'selected':''}>Item ${esc(item.numero)} — ${esc(item.descricao)}</option>`).join('')}
        </select>
      </label>
      <label>Preço
        <input data-q-field="price" type="number" min="0.0001" step="0.0001" value="${Number(row.price||0)}">
      </label>
      <label>Fator
        <input data-q-field="factor" type="number" min="0.0001" step="0.001" value="${Number(row.factor||1)}">
      </label>
      <div class="quote-review-actions">
        <button type="button" class="action-btn" data-ignore-quote-row="${index}">Ignorar</button>
        <button type="button" data-confirm-quote-row="${index}" ${row.itemId&&Number(row.price)>0&&Number(row.factor)>0?'':'disabled'}>Confirmar</button>
      </div>
    </article>`).join('')}</div>`;

  el.querySelectorAll('[data-q-field]').forEach(field=>field.addEventListener('change',()=>{
    syncQuoteRowsFromDom();
    const box=field.closest('[data-quote-row]');
    const row=state.quoteImportRows[Number(box?.dataset.quoteRow)];
    if(row&&field.dataset.qField==='itemId'){
      row.manualMatched=Boolean(row.itemId);
      row.aiMatched=false;
      row.safeToSave=false;
      row.selected=Boolean(row.itemId&&Number(row.price)>0&&Number(row.factor)>0);
    }
    renderQuoteImportPreview();
  }));
  el.querySelectorAll('[data-ignore-quote-row]').forEach(button=>button.addEventListener('click',()=>{
    const row=state.quoteImportRows[Number(button.dataset.ignoreQuoteRow)];
    if(!row)return;
    row.ignored=true;row.needsReview=false;row.selected=false;
    persistQuoteReviewDraft();
    renderQuoteImportPreview();
    renderQuotesWorkspace();
    toast('Linha ignorada. Ela não entrou na precificação.');
  }));
  el.querySelectorAll('[data-confirm-quote-row]').forEach(button=>button.addEventListener('click',async()=>{
    syncQuoteRowsFromDom();
    const row=state.quoteImportRows[Number(button.dataset.confirmQuoteRow)];
    if(!row?.itemId||!(Number(row.price)>0)||!(Number(row.factor)>0))return toast('Selecione o item e confirme preço e fator.','error');
    (state.quoteImportRows||[]).forEach(candidate=>{candidate.selected=false;});
    row.selected=true;
    await saveImportedQuotes();
  }));
}

function renderQuoteImportPreview(){
  return renderQuoteImportReviewCompact();
  /* Interface detalhada anterior mantida abaixo apenas como compatibilidade temporária. */
  const el=$('#quoteImportPreview');
  if(!el)return;

  ensureQuoteModernStyles();
  ensureQuoteWorkspaceStyles();

  const tenderId=$('#quoteImportTender')?.value||'';
  const supplierRows=prepareQuoteRowsByTenderOrder(tenderId);

  if(!supplierRows.length){
    el.innerHTML='';
    return;
  }

  const tenderItems=state.itens
    .filter(i=>String(i.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero));

  const assignedByItem=new Map();
  const assignedGroups=new Map();
  supplierRows.forEach(r=>{
    if(!r.itemId)return;
    const key=String(r.itemId);
    if(!assignedGroups.has(key))assignedGroups.set(key,[]);
    assignedGroups.get(key).push(r);
    if(!assignedByItem.has(key))assignedByItem.set(key,r);
  });
  const duplicateGroups=[...assignedGroups.entries()].filter(([,rows])=>rows.length>1);
  const duplicateItemIds=new Set(duplicateGroups.map(([itemId])=>itemId));
  const validSaveRows=supplierRows.filter(r=>r.selected===true&&!r.savedAutomatically&&!r.savedAfterReview&&r.itemId&&Number(r.price)>0&&Number(r.factor||0)>0);
  const reviewCount=supplierRows.filter(r=>!r.savedAutomatically&&!r.savedAfterReview&&r.itemId&&r.needsReview).length;

  const relatedTender=tenderItems.filter(i=>assignedByItem.has(String(i.id))).length;
  const missingTender=Math.max(0,tenderItems.length-relatedTender);
  const progress=tenderItems.length?Math.round((relatedTender/tenderItems.length)*100):0;
  const unusedCount=supplierRows.filter(r=>!r.itemId).length;

  const globalTerm=quoteNormalize(state.quoteImportFilter||'');
  const visibleItems=tenderItems.filter(item=>{
    const assigned=assignedByItem.get(String(item.id));

    if(state.quoteOnlyUnrelated && assigned)return false;
    if(!globalTerm)return true;

    const hay=quoteNormalize([
      `ITEM ${item.numero}`,
      item.descricao,
      item.unidade,
      assigned?.description,
      assigned?.code,
      assigned?.brand
    ].filter(Boolean).join(' '));

    return hay.includes(globalTerm);
  });

  function supplierOptions(item,assignedRow,search=''){
    const term=quoteNormalize(search);
    const assignedIndex=assignedRow?supplierRows.indexOf(assignedRow):-1;

    let options=supplierRows
      .map((r,index)=>({
        r,
        index,
        hay:quoteNormalize(`${r.description||''} ${r.code||''} ${r.brand||''}`)
      }))
      .filter(x=>x.r===assignedRow||(!x.r.savedAutomatically&&!x.r.savedAfterReview))
      .filter(x=>!term||x.hay.includes(term));

    if(assignedRow&&!options.some(x=>x.index===assignedIndex)){
      options.unshift({r:assignedRow,index:assignedIndex,hay:''});
    }

    return `
      <option value="">Selecione um produto...</option>
      ${options.map(x=>{
        const usedItem=x.r.itemId
          ?state.itens.find(i=>String(i.id)===String(x.r.itemId))
          :null;

        const usedLabel=usedItem&&String(usedItem.id)!==String(item.id)
          ?` • usado no Item ${usedItem.numero}`
          :'';

        return `
          <option
            value="${x.index}"
            ${x.index===assignedIndex?'selected':''}
          >
            ${esc(x.r.description||'Produto')}
            ${x.r.price?' • '+money(x.r.price):''}
            ${x.r.brand?' • '+esc(x.r.brand):''}
            ${esc(usedLabel)}
          </option>
        `;
      }).join('')}
    `;
  }

  el.innerHTML=`
    <div class="quote-preview-head">
      <div>
        <strong>Revisar sugestões da IA</strong>
        <span>Os itens seguros já foram salvos. Aprove explicitamente somente as correções que você conferir.</span>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        ${validSaveRows.length?`<button type="button" id="quoteSaveImportedBtn" ${duplicateGroups.length?'disabled':''}>Salvar ${validSaveRows.length} correç${validSaveRows.length===1?'ão aprovada':'ões aprovadas'}</button>`:''}
      </div>
    </div>

    ${duplicateGroups.length?`
      <div class="quote-import-warning" role="alert">
        <strong>Resolva ${duplicateGroups.length} vínculo${duplicateGroups.length===1?'':'s'} duplicado${duplicateGroups.length===1?'':'s'} antes de salvar.</strong>
        ${duplicateGroups.map(([itemId])=>{const item=state.itens.find(i=>String(i.id)===itemId);return `Item ${esc(item?.numero||'?')}`;}).join(' • ')}
      </div>
    `:''}
    ${reviewCount?`<div class="quote-import-warning"><strong>${reviewCount} sugest${reviewCount===1?'ão precisa':'ões precisam'} de revisão.</strong> Corrija o vínculo ou os valores e marque “Aprovar correção” antes de salvar.</div>`:''}

    <div class="qv-stats">
      <div class="qv-stat">
        <span>Progresso do edital</span>
        <strong>${progress}%</strong>
        <div class="qv-progress"><span style="width:${progress}%"></span></div>
      </div>

      <div class="qv-stat">
        <span>Itens do edital</span>
        <strong>${tenderItems.length}</strong>
      </div>

      <div class="qv-stat">
        <span>Itens vinculados nesta importação</span>
        <strong>${relatedTender}</strong>
      </div>

      <div class="qv-stat">
        <span>Produtos encontrados no arquivo</span>
        <strong>${supplierRows.length}</strong>
      </div>
    </div>

    <div class="qv-info">
      <span>✓</span>
      <span>
        A precificação considera apenas os itens salvos automaticamente ou as correções aprovadas por você.
        Sugestões incertas nunca entram silenciosamente nos cálculos.
      </span>
    </div>

    <div class="qv-toolbar">
      <input
        id="quoteGlobalSearch"
        type="search"
        value="${esc(state.quoteImportFilter||'')}"
        placeholder="Buscar item do edital por número ou descrição..."
        autocomplete="off"
      >

      <button
        type="button"
        id="quoteOnlyUnrelatedBtn"
        class="action-btn ${state.quoteOnlyUnrelated?'active':''}"
      >
        ${state.quoteOnlyUnrelated?'✓ Somente pendentes':'Somente pendentes'}
      </button>

      <button type="button" id="quoteClearFiltersBtn" class="action-btn">
        Limpar busca
      </button>
    </div>

    <div class="hint" style="margin:0 0 10px">
      ${visibleItems.length} de ${tenderItems.length} itens exibidos • ordem oficial do edital
    </div>

    <div class="qv-list-head">
      <div>ITEM OFICIAL DO EDITAL</div>
      <div>PRODUTO ENCONTRADO NO ARQUIVO</div>
    </div>

    <div class="qv-list">
      ${visibleItems.map(item=>{
        const assigned=assignedByItem.get(String(item.id));
        const rowIndex=assigned?supplierRows.indexOf(assigned):-1;
        const searchValue=state.quoteSupplierSearches?.[item.id]||'';
        const saved=Boolean(assigned?.savedAutomatically||assigned?.savedAfterReview);

        return `
          <div
            class="qv-row ${assigned?'is-linked':''}"
            ${assigned?`data-quote-row="${rowIndex}"`:''}
          >
            <div class="qv-edital">
              <div class="qv-number">${esc(item.numero)}</div>

              <div>
                <div class="qv-edital-title">
                  ${esc(item.descricao)}
                </div>

                <div class="qv-edital-meta">
                  ${
                    item.quantidade
                      ?`<span class="qv-meta-chip">Qtd. ${esc(item.quantidade)} ${esc(item.unidade||'')}</span>`
                      :''
                  }

                  ${
                    item.valor_estimado
                      ?`<span class="qv-meta-chip">Estimado ${money(item.valor_estimado)}</span>`
                      :''
                  }

                  <span class="qv-meta-chip">
                    Item ${esc(item.numero)}
                  </span>
                </div>
              </div>
            </div>

            <div class="qv-supplier">
              <div class="qv-search-line">
                <input
                  type="search"
                  data-supplier-search="${esc(item.id)}"
                  value="${esc(searchValue)}"
                  placeholder="Pesquisar produto no arquivo..."
                  autocomplete="off"
                  ${saved?'disabled':''}
                >

                <select data-supplier-select="${esc(item.id)}" ${saved?'disabled':''}>
                  ${supplierOptions(item,assigned,searchValue)}
                </select>

                <div class="qv-status">
                  ${
                    assigned
                      ?duplicateItemIds.has(String(item.id))
                        ?'<span class="badge bad">Duplicado</span>'
                        :assigned.savedAutomatically
                          ?'<span class="badge good">Salvo automaticamente</span>'
                          :assigned.savedAfterReview
                            ?'<span class="badge good">Correção salva</span>'
                            :assigned.needsReview
                          ?'<span class="badge warn">Revisão necessária</span>'
                          :'<span class="badge good">Vinculado — pronto para salvar</span>'
                      :'<span class="badge neutral">Ainda não vinculado</span>'
                  }
                </div>
              </div>

              ${
                assigned
                  ?`
                    <div class="qv-product">
                      <div>
                        <div class="qv-product-name">
                          ${esc(assigned.description)}
                        </div>

                        <div class="qv-product-meta">
                          ${assigned.code?`Cód. ${esc(assigned.code)} • `:''}
                          ${assigned.quantity?`${esc(assigned.quantity)} ${esc(assigned.unit||'')}`:''}
                          ${assigned.subtotal!=null?` • Subtotal ${money(assigned.subtotal)}`:''}
                        </div>
                        <div class="quote-origin-line">
                          <span class="badge neutral">Origem: ${assigned.aiMatched?'IA':assigned.autoTextMatched?'Correspondência textual':'Vínculo manual'}</span>
                          ${assigned.aiMatched&&Number.isFinite(Number(assigned.aiMatchConfidence))?`<span class="badge ${Number(assigned.aiMatchConfidence)>=.85?'good':'warn'}">Confiança ${Math.round(Number(assigned.aiMatchConfidence)*100)}%</span>`:''}
                          ${assigned.aiMatched&&Number.isFinite(Number(assigned.factorConfidence))?`<span class="badge ${Number(assigned.factorConfidence)>=.85?'good':'warn'}">Fator ${Math.round(Number(assigned.factorConfidence)*100)}%</span>`:''}
                          ${assigned.needsReview?'<span class="badge warn">Revisão necessária</span>':''}
                          ${assigned.incompatibilities?.length?`<span class="badge bad">${esc(assigned.incompatibilities.join(' • '))}</span>`:''}
                        </div>
                      </div>

                      <span class="badge good">
                        Produto encontrado no arquivo
                      </span>
                    </div>

                    <div class="qv-fields">
                      ${!assigned.savedAutomatically&&!assigned.savedAfterReview?`<label class="qv-field" style="align-content:center">
                        <span>Aprovação obrigatória</span>
                        <span style="display:flex;align-items:center;gap:8px"><input data-q-field="selected" type="checkbox" ${assigned.selected===true?'checked':''}> Aprovar correção</span>
                      </label>`:''}
                      <div class="qv-field">
                        <label>Preço</label>
                        <input
                          data-q-field="price"
                          type="number"
                          step="0.0001"
                          min="0"
                          value="${Number(assigned.price||0)}"
                          ${saved?'disabled':''}
                        >
                      </div>

                      <div class="qv-field">
                        <label>Apresentação</label>
                        <input
                          data-q-field="presentation"
                          value="${esc(assigned.presentation||'')}"
                          placeholder="Ex.: caixa c/ 50"
                          ${saved?'disabled':''}
                        >
                      </div>

                      <div class="qv-field">
                        <label>Equivale a</label>
                        <input
                          data-q-field="factor"
                          type="number"
                          min="0.0001"
                          step="0.001"
                          value="${Number(assigned.factor||1)}"
                          ${saved?'disabled':''}
                        >
                      </div>

                      <div class="qv-field">
                        <label>Marca</label>
                        <input
                          data-q-field="brand"
                          value="${esc(assigned.brand||'')}"
                          ${saved?'disabled':''}
                        >
                      </div>

                      ${saved?'':`<button
                          type="button"
                          class="qv-remove"
                          data-clear-fixed-relation="${esc(item.id)}"
                        >
                          Desvincular
                        </button>`}
                    </div>
                  `
                  :`
                    <div class="qv-empty">
                      Pesquise acima e selecione o produto correspondente encontrado no arquivo.
                    </div>
                  `
              }
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="qv-unused">
      <div>
        <strong>Produtos do arquivo ainda não utilizados</strong>
        <span>
          Produtos que foram lidos do arquivo, mas ainda não foram vinculados a nenhum item do edital.
        </span>
      </div>

      <span class="badge ${unusedCount?'warn':'good'}">
        ${unusedCount} restante${unusedCount===1?'':'s'}
      </span>
    </div>
  `;

  $('#quoteSaveImportedBtn')?.addEventListener('click',saveImportedQuotes);

  $('#quoteGlobalSearch')?.addEventListener('input',e=>{
    syncQuoteRowsFromDom();
    state.quoteImportFilter=e.target.value||'';
    renderQuoteImportPreview();

    const input=$('#quoteGlobalSearch');
    if(input){
      input.focus();
      input.setSelectionRange(input.value.length,input.value.length);
    }
  });

  $('#quoteOnlyUnrelatedBtn')?.addEventListener('click',()=>{
    syncQuoteRowsFromDom();
    state.quoteOnlyUnrelated=!state.quoteOnlyUnrelated;
    renderQuoteImportPreview();
  });

  $('#quoteClearFiltersBtn')?.addEventListener('click',()=>{
    syncQuoteRowsFromDom();
    state.quoteImportFilter='';
    state.quoteOnlyUnrelated=false;
    state.quoteSupplierSearches={};
    renderQuoteImportPreview();
  });

  document.querySelectorAll('[data-supplier-search]').forEach(input=>{
    input.addEventListener('input',()=>{
      const itemId=input.dataset.supplierSearch;

      state.quoteSupplierSearches ||= {};
      state.quoteSupplierSearches[itemId]=input.value||'';

      const item=state.itens.find(
        i=>String(i.id)===String(itemId)
      );

      const assigned=supplierRows.find(
        r=>String(r.itemId)===String(itemId)
      );

      const select=document.querySelector(
        `[data-supplier-select="${itemId}"]`
      );

      if(!item||!select)return;

      select.innerHTML=supplierOptions(
        item,
        assigned,
        input.value
      );
    });
  });

  document.querySelectorAll('[data-supplier-select]').forEach(select=>{
    select.addEventListener('change',()=>{
      syncQuoteRowsFromDom();

      const itemId=select.dataset.supplierSelect;

      const item=state.itens.find(
        i=>String(i.id)===String(itemId)
      );

      if(!item)return;

      const current=supplierRows.find(
        r=>String(r.itemId)===String(itemId)
      );

      if(select.value===''){
        if(current){
          current.itemId='';
          current.editalItemNumber=null;
          current.manualMatched=false;
        }

        renderQuoteImportPreview();
        return;
      }

      const selectedIndex=Number(select.value);
      const selectedRow=supplierRows[selectedIndex];

      if(!selectedRow)return;

      if(
        selectedRow.itemId &&
        String(selectedRow.itemId)!==String(itemId)
      ){
        const oldItem=state.itens.find(
          i=>String(i.id)===String(selectedRow.itemId)
        );

        const move=confirm(
          `O produto "${selectedRow.description}" já está relacionado ao Item ${oldItem?.numero||'?'}.`+
          `\n\nDeseja mover este produto para o Item ${item.numero}?`
        );

        if(!move){
          renderQuoteImportPreview();
          return;
        }
      }

      if(current&&current!==selectedRow){
        current.itemId='';
        current.editalItemNumber=null;
        current.manualMatched=false;
      }

      selectedRow.itemId=item.id;
      selectedRow.editalItemNumber=Number(item.numero);
      selectedRow.manualMatched=true;
      selectedRow.aiMatched=false;
      selectedRow.aiMatchConfidence=1;
      selectedRow.factorConfidence=1;
      selectedRow.safeToSave=false;
      selectedRow.needsReview=true;
      selectedRow.selected=true;

      state.quoteSupplierSearches ||= {};
      state.quoteSupplierSearches[item.id]='';

      renderQuoteImportPreview();
      toast(`Produto relacionado ao Item ${item.numero}.`);
    });
  });

  document.querySelectorAll('[data-clear-fixed-relation]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      syncQuoteRowsFromDom();

      const itemId=btn.dataset.clearFixedRelation;

      const row=supplierRows.find(
        r=>String(r.itemId)===String(itemId)
      );

      if(!row)return;

      row.itemId='';
      row.editalItemNumber=null;
      row.manualMatched=false;
      row.aiMatched=false;
      row.aiMatchConfidence=null;
      row.needsReview=true;

      renderQuoteImportPreview();
      toast('Produto retirado deste item do edital.');
    });
  });
}

function syncQuoteRowsFromDom(){
  document.querySelectorAll('[data-quote-row]').forEach(tr=>{
    const i=Number(tr.dataset.quoteRow);
    const row=state.quoteImportRows[i]; if(!row)return;
    tr.querySelectorAll('[data-q-field]').forEach(el=>{
      const key=el.dataset.qField;
      if(key==='selected')row[key]=el.checked;
      else if(key==='price'||key==='factor')row[key]=Number(el.value||0);
      else row[key]=el.value;
    });
  });
}

async function readQuoteImportFile(){
  const tenderId=$('#quoteImportTender')?.value;
  const supplierId=$('#quoteImportSupplier')?.value;
  const file=$('#quoteImportFile')?.files?.[0];
  if(!tenderId)return toast('Selecione a licitação.','error');
  if(!supplierId)return toast('Selecione o fornecedor.','error');
  if(!file)return toast('Selecione o arquivo da cotação.','error');
  const inputExt=file.name.toLowerCase().split('.').pop()||'';
  if(!QUOTE_FILE_EXTENSIONS.has(inputExt))return toast('Formato não suportado. Use PDF, Excel ou CSV.','error');
  if(file.size>MAX_QUOTE_FILE_SIZE)return toast('O arquivo excede o limite de 25 MB.','error');
  if(file.type && !QUOTE_FILE_MIME_TYPES.has(String(file.type).toLowerCase()))return toast('O tipo do arquivo não corresponde a PDF, Excel ou CSV.','error');

  const btn=$('#quoteReadBtn');
  if(btn){btn.disabled=true;btn.textContent='Lendo…';}
  setQuoteImportStatus('Lendo o arquivo e identificando produtos…','loading');
  state.quoteImportRows=[];
  state.quoteImportContext=null;
  renderQuoteImportPreview();

  try{
    const ext=inputExt;
    let rows=[];
    if(['xlsx','xls','csv'].includes(ext))rows=await parseSpreadsheetFile(file);
    else if(ext==='pdf')rows=await parsePdfFile(file);
    else throw new Error('Formato não suportado. Use Excel, CSV ou PDF.');

    if(!rows.length){
      setQuoteImportStatus('Não consegui identificar linhas com produto e preço. Se for PDF, confirme se o texto pode ser selecionado.','warn');
      return;
    }

    // Validação extra: evita confundir subtotal com preço unitário.
    rows=rows.filter(r=>{
      if(!r.quantity || r.subtotal==null)return true;
      const expected=Number(r.price||0)*Number(r.quantity||0);
      const tolerance=Math.max(0.05,Math.abs(Number(r.subtotal))*0.02);
      return Math.abs(expected-Number(r.subtotal))<=tolerance;
    });

    if(!rows.length){
      setQuoteImportStatus('As linhas foram encontradas, mas os valores não passaram na validação de preço unitário x subtotal.','warn');
      return;
    }

    // Associação 100% manual: o sistema lê os produtos e você pesquisa o item do edital.
    rows.forEach((r,index)=>{
      r.originalOrder=index;
      r.itemId='';
      r.itemSearch='';
      r.manualMatched=false;
    });
    state.quoteImportRows=rows;
    state.quoteImportContext={
      tenderId:String(tenderId),
      supplierId:String(supplierId),
      fileKey:quoteImportFileKey(file)
    };
    state.quoteImportFilter='';
    state.quoteOnlyUnrelated=false;
    state.quoteSupplierSearches={};

    const safeMatched=autoRelateSafeQuoteRows(tenderId,state.quoteImportRows);

    setQuoteImportStatus(
      `${rows.length} produtos identificados no arquivo. `+
      `${safeMatched} correspondência${safeMatched===1?'':'s'} textual${safeMatched===1?'':'is'} segura${safeMatched===1?'':'s'} pré-relacionada${safeMatched===1?'':'s'}. `+
      `Revise os vínculos antes de salvar.`,
      'success'
    );
    renderQuoteImportPreview();
  }catch(e){
    setQuoteImportStatus(`Erro ao ler cotação: ${e?.message||e}`,'error');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Ler arquivo e revisar';}
  }
}

async function matchImportedQuotesWithAi(){
  // Compatibilidade interna: neutraliza o contrato antigo e reutiliza apenas quote_id.
  return startAutomaticQuoteImport(true);
  /* istanbul ignore next -- código legado inalcançável mantido temporariamente */
  syncQuoteRowsFromDom();
  const tenderId=$('#quoteImportTender')?.value;
  const rows=state.quoteImportRows||[];
  if(state.demo || !configured || !supabase || !state.user){
    return toast('No modo demonstração, o relacionamento textual local já foi aplicado.','error');
  }
  if(!tenderId || !rows.length)return toast('Leia uma cotação antes de usar a associação inteligente.','error');

  const tenderItems=state.itens.filter(i=>String(i.licitacao_id)===String(tenderId));
  if(!tenderItems.length)return toast('A licitação selecionada não possui itens.','error');
  const btn=$('#quoteAiMatchBtn');
  if(btn){btn.disabled=true;btn.textContent='Associando…';}
  setQuoteImportStatus('Comparando os produtos com os itens oficiais do edital…','loading');

  try{
    const {data,error}=await supabase.functions.invoke('ai-match-quote',{
      body:{
        tender_id:tenderId,
        tender_items:tenderItems.map(i=>({id:i.id,item_number:i.numero,description:i.descricao,quantity:i.quantidade,unit:i.unidade})),
        quote_items:rows.map((r,rowIndex)=>({
          row_index:rowIndex,code:r.code||'',description:r.description||'',quantity:r.quantity||null,
          unit:r.unit||'',price:Number(r.price||0),brand:r.brand||'',presentation:r.presentation||''
        }))
      }
    });
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    const allowed=new Set(tenderItems.map(i=>String(i.id)));
    let associated=0;
    for(const match of (data?.matches||[])){
      const row=rows[Number(match.row_index)];
      if(!row)continue;
      const confidence=Math.max(0,Math.min(1,Number(match.confidence||0)));
      row.aiMatchConfidence=confidence;
      row.aiReason=String(match.reason||'');
      row.needsReview=confidence<0.85 || !match.match;
      if(match.match && confidence>=0.5 && allowed.has(String(match.tender_item_id))){
        row.itemId=String(match.tender_item_id);
        row.editalItemNumber=Number(match.item_number||tenderItems.find(i=>String(i.id)===String(match.tender_item_id))?.numero||0);
        row.manualMatched=false;
        row.aiMatched=true;
        associated++;
      }
    }
    setQuoteImportStatus(`${associated} produto${associated===1?'':'s'} associado${associated===1?'':'s'} pela IA. Revise especialmente as correspondências abaixo de 85% antes de salvar.`,'success');
    renderQuoteImportPreview();
  }catch(err){
    setQuoteImportStatus(`A IA não respondeu; o relacionamento textual local foi preservado. ${err?.message||err}`,'warn');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Associar com IA';}
  }
}


async function saveImportedQuotes(){
  syncQuoteRowsFromDom();
  const tenderId=$('#quoteImportTender')?.value;
  const supplierId=$('#quoteImportSupplier')?.value;
  const file=$('#quoteImportFile')?.files?.[0];
  const context=state.quoteImportContext;
  if(
    !context ||
    String(context.tenderId)!==String(tenderId||'') ||
    String(context.supplierId)!==String(supplierId||'') ||
    (!state.demo&&!context.storagePath&&context.fileKey!==quoteImportFileKey(file))
  ){
    clearQuoteImportPreview('O edital, fornecedor ou arquivo mudou. Leia o arquivo novamente antes de salvar.');
    return toast('Leia o arquivo novamente para atualizar a revisão.','error');
  }
  const rows=(state.quoteImportRows||[])
    .filter(r=>r.selected===true&&!r.savedAutomatically&&!r.savedAfterReview&&r.itemId&&Number(r.price)>0&&Number(r.factor||0)>0)
    .sort((a,b)=>{
      const ai=state.itens.find(i=>i.id===a.itemId);
      const bi=state.itens.find(i=>i.id===b.itemId);
      return Number(ai?.numero||999999)-Number(bi?.numero||999999);
    });

  if(!rows.length)return toast('Nenhuma linha válida selecionada. Relacione pelo menos um produto a um item do edital.','error');

  const duplicates=new Map();
  rows.forEach(r=>{
    const key=String(r.itemId);
    if(!duplicates.has(key))duplicates.set(key,[]);
    duplicates.get(key).push(r);
  });

  const duplicateGroups=[...duplicates.entries()].filter(([,group])=>group.length>1);

  if(duplicateGroups.length){
    const details=duplicateGroups
      .slice(0,8)
      .map(([itemId,group])=>{
        const item=state.itens.find(i=>String(i.id)===String(itemId));
        return `Item ${item?.numero||'?'}: ${group.map(x=>x.description).join(' / ')}`;
      })
      .join('\n');

    const more=duplicateGroups.length>8
      ? `\n... e mais ${duplicateGroups.length-8} duplicidade(s).`
      : '';

    setQuoteImportStatus(`Resolva os vínculos duplicados antes de salvar.\n${details}${more}`,'error');
    renderQuoteImportPreview();
    return toast('Há itens vinculados a mais de um produto. Desvincule as duplicidades.','error');
  }

  if(!confirm(`Salvar ${rows.length} correç${rows.length===1?'ão':'ões'} que você aprovou? Os itens correspondentes serão atualizados nesta cotação.`))return;

  const btn=$('#quoteSaveImportedBtn');
  if(btn){btn.disabled=true;btn.textContent='Salvando…';}
  setQuoteImportStatus('Salvando cotações…','loading');
  const insertedIds=[];
  let persistenceComplete=false;

  try{
    if(state.demo){
      for(const r of rows){
        const existing=state.cotacoes.find(x=>String(x.item_id)===String(r.itemId)&&String(x.fornecedor_id)===String(supplierId));
        const local={id:existing?.id||crypto.randomUUID(),item_id:r.itemId,fornecedor_id:supplierId,preco:Number(r.price),fator_equivalencia:Number(r.factor||1),frete_rateado:0,apresentacao:r.presentation||'',marca:r.brand||'',ai_match_confidence:r.aiMatchConfidence??(r.manualMatched?1:null),needs_review:false};
        if(existing)Object.assign(existing,local);else state.cotacoes.push(local);
        r.savedAfterReview=true;r.needsReview=false;r.selected=false;
      }
      renderAll();
      persistQuoteReviewDraft();
      setQuoteImportStatus(quoteImportSummaryText(tenderId),'success');
      return;
    }

    const q=context.quoteId?{id:context.quoteId}:await findOrCreateQuote(tenderId,supplierId);
    if(!q)throw new Error('Não foi possível criar a cotação.');

    const selectedItemIds=[...new Set(rows.map(r=>String(r.itemId)))];
    const {data:oldRows,error:oldError}=await supabase.from('quote_items').select('id,tender_item_id').eq('quote_id',q.id).in('tender_item_id',selectedItemIds);
    if(oldError)throw oldError;

    const payload=rows.map(r=>({
      quote_id:q.id,
      tender_item_id:r.itemId,
      supplier_description:r.description,
      brand:r.brand||null,
      package_description:r.presentation||null,
      package_base_quantity:Number(r.factor||1),
      unit_price:Number(r.price),
      freight_per_package:0,
      ai_match_confidence:r.aiMatchConfidence??(r.manualMatched?1:null),
      needs_review:false
    }));

    for(let start=0;start<payload.length;start+=300){
      const chunk=payload.slice(start,start+300);
      const {data:inserted,error}=await supabase.from('quote_items').insert(chunk).select('id');
      if(error)throw error;
      insertedIds.push(...(inserted||[]).map(x=>x.id));
    }

    const obsoleteIds=(oldRows||[]).map(x=>x.id).filter(id=>!insertedIds.includes(id));
    if(obsoleteIds.length){
      const {error:deleteError}=await supabase.from('quote_items').delete().in('id',obsoleteIds);
      if(deleteError)throw new Error(`Os novos itens foram salvos, mas a versão anterior não pôde ser removida: ${deleteError.message}`);
    }
    persistenceComplete=true;

    rows.forEach(r=>{r.savedAfterReview=true;r.needsReview=false;r.selected=false;});
    persistQuoteReviewDraft();
    const hasReview=state.quoteImportRows.some(r=>!r.savedAutomatically&&!r.savedAfterReview&&r.needsReview);
    if(context.quoteId)await supabase.from('quotes').update({status:hasReview?'needs_review':'completed',ai_error:null}).eq('id',context.quoteId);
    await refreshAll();
    setQuoteImportStatus(quoteImportSummaryText(tenderId),'success');
    renderQuoteImportPreview();
    toast('Correções aprovadas salvas.');
  }catch(e){
    let recovery='';
    if(!state.demo&&!persistenceComplete&&insertedIds.length&&supabase){
      const {error:cleanupError}=await supabase.from('quote_items').delete().in('id',insertedIds);
      recovery=cleanupError
        ?' A limpeza automática também falhou; revise esta cotação antes de tentar novamente.'
        :' Nenhum item parcial foi mantido.';
    }
    setQuoteImportStatus(`Erro ao salvar: ${e?.message||e}.${recovery}`,'error');
  }finally{
    if(btn){
      const count=(state.quoteImportRows||[]).filter(r=>r.selected===true&&!r.savedAutomatically&&!r.savedAfterReview&&r.itemId&&Number(r.price)>0&&Number(r.factor||0)>0).length;
      btn.disabled=!count;
      btn.textContent=`Salvar ${count} cotaç${count===1?'ão':'ões'}`;
    }
  }
}

async function ensureProfile(){
  if(!state.user || state.demo)return;
  const name=state.user.user_metadata?.nome || state.user.email?.split('@')[0] || 'Usuário';
  const {error}=await supabase.from('profiles').upsert({id:state.user.id,name,email:state.user.email,updated_at:new Date().toISOString()},{onConflict:'id'});
  if(error) console.warn('Perfil:',error.message);
  const {data}=await supabase.from('profiles').select('*').eq('id',state.user.id).maybeSingle();
  state.profile=data || {id:state.user.id,name,email:state.user.email};
}

async function boot(){
  if(!configured){ showOnly('setupScreen'); return; }
  const {data:{session},error}=await supabase.auth.getSession();
  if(error) console.warn(error.message);
  if(!session){ showOnly('authScreen'); return; }
  state.user=session.user; await ensureProfile(); await loadMembershipAndData();
}
async function loadMembershipAndData(){
  const {data:membership,error}=await supabase.from('company_members').select('company_id,user_id,role,created_at').eq('user_id',state.user.id).maybeSingle();
  if(error)return toast(error.message,'error');
  state.membership=membership;
  if(!membership){ showOnly('companyScreen'); return; }
  const {data:company,error:companyError}=await supabase.from('companies').select('*').eq('id',membership.company_id).single();
  if(companyError)return toast(companyError.message,'error');
  state.company=company; await refreshAll(); showOnly('appShell');
  // Depois do carregamento inicial, atualiza todos os editais vinculados ao
  // PNCP para completar itens que tenham sido importados de forma parcial.
  autoSyncPncpTenders().catch(error=>console.warn('Sincronização inicial PNCP:',error));
}

async function fetchAllSupabaseRows(table,filterColumn,ids,orderColumns=[]){
  if(!ids.length)return {data:[],error:null};
  const pageSize=1000;const rows=[];
  for(let page=0;page<100;page++){
    const from=page*pageSize;let query=supabase.from(table).select('*').in(filterColumn,ids);
    for(const column of orderColumns)query=query.order(column,{ascending:true});
    const {data,error}=await query.range(from,from+pageSize-1);
    if(error)return {data:[],error};
    rows.push(...(data||[]));
    if((data||[]).length<pageSize)break;
  }
  return {data:rows,error:null};
}

async function refreshAll(){
  if(state.demo){ renderAll(); return; }
  const cid=currentCompanyId(); if(!cid)return;
  const [settings,tenders,suppliers,quotes,members]=await Promise.all([
    supabase.from('pricing_settings').select('*').eq('company_id',cid).maybeSingle(),
    supabase.from('tenders').select('*').eq('company_id',cid).order('dispute_at',{ascending:true,nullsFirst:false}),
    supabase.from('suppliers').select('*').eq('company_id',cid).order('name'),
    supabase.from('quotes').select('*').eq('company_id',cid).order('created_at',{ascending:false}),
    supabase.from('company_members').select('*').eq('company_id',cid).order('created_at')
  ]);
  const err=[settings,tenders,suppliers,quotes,members].find(x=>x.error)?.error; if(err)return toast(err.message,'error');
  state.config={
    imposto:Number(settings.data?.tax_percent??6),margem_alvo:Number(settings.data?.target_margin_percent??25),
    lucro_minimo:Number(settings.data?.minimum_profit_amount??500),margem_minima:Number(settings.data?.minimum_margin_percent??10),
    reserva_operacional:Number(settings.data?.operational_reserve_percent??0)
  };
  state.licitacoes=(tenders.data||[]).map(t=>{
    const primary=t.proposal_end_at||t.dispute_at;
    const dt=toLocalDateTime(primary);
    return {
      id:t.id,
      numero:t.number,
      processo:t.process_number,
      orgao:t.agency||'',
      cidade:[t.city,t.state].filter(Boolean).join('/'),
      data:dt.data,
      horario:dt.horario,
      plataforma:t.platform||'',
      objeto:t.object||'',
      pncp_control:t.pncp_control||'',
      source_url:t.source_url||'',
      publicationAt:t.publication_at||null,
      createdAt:t.created_at||null,
      proposalOpenAt:t.proposal_open_at||null,
      proposalEndAt:t.proposal_end_at||null,
      is_quoted:Boolean(t.is_quoted),
      situation:t.tender_situation||(t.is_quoted?'finalizada':'aguardando_disputa'),
      raw:t
    };
  });
  state.fornecedores=(suppliers.data||[]).map(f=>({id:f.id,nome:f.name,nome_fantasia:f.trade_name||'',uf:supplierUfFromPhone(f.phone||'')||((f.state_uf||'').length===2?f.state_uf:''),cnpj:f.cnpj,vendedor:f.contact_name||'',telefone:f.phone||'',email:f.email||'',frete_padrao:Number(f.default_freight_amount||0),pedido_minimo:Number(f.minimum_order||0),prazo_dias:f.delivery_days,raw:f}));
  if(!state.demo){const needsUf=(suppliers.data||[]).filter(f=>supplierUfFromPhone(f.phone||'')&&supplierUfFromPhone(f.phone||'')!==f.state_uf);if(needsUf.length)Promise.all(needsUf.map(f=>supabase.from('suppliers').update({state_uf:supplierUfFromPhone(f.phone)}).eq('id',f.id))).catch(()=>{});}
  state.quotes=quotes.data||[];
  const tenderDocumentsResp=await supabase.from('tender_documents').select('*').eq('company_id',cid).order('updated_at',{ascending:false});
  if(tenderDocumentsResp.error){
    state.tenderDocuments=[];
    state.tenderDocumentsError='A área de editais ainda não está disponível. Aplique a migration local de documentos antes de usar este recurso.';
    console.warn('Documentos de editais:',tenderDocumentsResp.error.message);
  }else{
    state.tenderDocuments=tenderDocumentsResp.data||[];
    state.tenderDocumentsError='';
  }
  const qualificationDocumentsResp=await supabase.from('qualification_documents').select('*').eq('company_id',cid).order('created_at',{ascending:false});
  if(qualificationDocumentsResp.error){
    state.qualificationDocuments=[];
    state.qualificationError='Configuração pendente. Aplique a migration local de habilitação fiscal para liberar a biblioteca.';
    console.warn('Habilitação fiscal:',qualificationDocumentsResp.error.message);
  }else{
    state.qualificationDocuments=qualificationDocumentsResp.data||[];
    state.qualificationError='';
  }
  const tenderIds=state.licitacoes.map(x=>x.id), quoteIds=state.quotes.map(x=>x.id);
  const itemResp=await fetchAllSupabaseRows('tender_items','tender_id',tenderIds,['item_number','id']);
  const qiResp=await fetchAllSupabaseRows('quote_items','quote_id',quoteIds,['created_at','id']);
  if(itemResp.error)return toast(itemResp.error.message,'error'); if(qiResp.error)return toast(qiResp.error.message,'error');
  state.itens=(itemResp.data||[]).map(i=>({id:i.id,licitacao_id:i.tender_id,numero:i.item_number,descricao:i.description,quantidade:Number(i.quantity),unidade:i.unit||'',valor_estimado:Number(i.estimated_unit_price||0),raw:i}));
  await loadPricingItemResults(state.itens.map(item=>item.id));
  state.cotacoes=(qiResp.data||[]).map(qi=>{const q=state.quotes.find(x=>x.id===qi.quote_id);return {id:qi.id,quote_id:qi.quote_id,item_id:qi.tender_item_id,fornecedor_id:q?.supplier_id,preco:Number(qi.unit_price),fator_equivalencia:Number(qi.package_base_quantity||1),frete_rateado:Number(qi.freight_per_package||0),apresentacao:qi.package_description||'',marca:[qi.brand,qi.model].filter(Boolean).join(' '),raw:qi};});
  const pricingResp=await supabase.rpc('get_pricing_map');
  if(pricingResp.error){ console.warn('Precificação:',pricingResp.error.message); state.pricingMap=[]; }
  else state.pricingMap=pricingResp.data||[];
  state.documentos=state.quotes.filter(q=>q.source_filename).map(q=>({id:q.id,nome_arquivo:q.source_filename,tipo:'cotacao',licitacao_id:q.tender_id,fornecedor_id:q.supplier_id,status:q.status||'enviado',created_at:q.created_at,storage_path:q.storage_path,ai_error:q.ai_error}));
  const memberRows=members.data||[], userIds=memberRows.map(m=>m.user_id);
  const profiles=userIds.length?await supabase.from('profiles').select('id,name,email,created_at').in('id',userIds):{data:[],error:null};
  state.equipe=memberRows.map(m=>{const p=(profiles.data||[]).find(x=>x.id===m.user_id);return {id:m.user_id,nome:p?.name||p?.email||`Usuário ${m.user_id.slice(0,6)}`,papel:m.role,created_at:m.created_at};});
  renderAll();
}


function quoteTenderOptions(selectedId=''){
  const available=state.licitacoes.filter(l=>!l.is_quoted);
  return (available.length?'':'<option value="">Nenhum edital disponível</option>')+available.map(l=>
    `<option value="${l.id}" ${String(l.id)===String(selectedId)?'selected':''}>${esc(l.numero)} • ${esc(l.orgao)}</option>`
  ).join('');
}

function renderQuoteUnitPreview(){
  const preview=$('#quoteUnitPreview');
  if(!preview)return;
  const item=state.itens.find(i=>String(i.id)===String($('#cotacaoItem')?.value||''));
  const supplier=state.fornecedores.find(f=>String(f.id)===String($('#cotacaoFornecedor')?.value||''));
  const price=Number($('#cotacaoPreco')?.value||0);
  const factor=Number($('#cotacaoFator')?.value||0);
  const freightPerPackage=Number($('#cotacaoFrete')?.value||0);

  preview.classList.remove('is-ready');
  if(!item||!supplier||price<=0||factor<=0||freightPerPackage<0){
    preview.textContent='Preencha o item, o fornecedor, o preço e uma quantidade por embalagem maior que zero.';
    return;
  }

  const itemQuantity=Math.max(1,Number(item.quantidade||1));
  const productUnit=price/factor;
  const packages=Math.ceil(itemQuantity/factor);
  const totalFreight=freightPerPackage>0
    ?packages*freightPerPackage
    :Math.max(0,Number(supplier.frete_padrao||0));
  const freightUnit=totalFreight/itemQuantity;
  const realUnit=productUnit+freightUnit;
  const freightSource=freightPerPackage>0
    ?`${packages} embalagem${packages===1?'':'s'} × ${money(freightPerPackage)}`
    :Number(supplier.frete_padrao||0)>0
      ?`frete padrão de ${money(supplier.frete_padrao)}`
      :'sem frete';

  preview.classList.add('is-ready');
  preview.innerHTML=`<strong>${money(realUnit)} por ${esc(item.unidade||'unidade')}</strong><br>${money(price)} ÷ ${factor} + ${freightSource} (${money(freightUnit)} por unidade).`;
}

function setQuoteWorkspaceSection(section='import',focus=true){
  const allowed=new Set(['import','review','quoted']);
  state.quoteWorkspaceSection=allowed.has(section)?section:'import';
  const panels={import:$('#quoteImportPanel'),review:$('#quoteReviewPanel'),quoted:$('#quoteQuotedPanel')};
  Object.entries(panels).forEach(([key,panel])=>{if(panel)panel.hidden=key!==state.quoteWorkspaceSection;});
  document.querySelectorAll('[data-quote-section]').forEach(button=>{
    const active=button.dataset.quoteSection===state.quoteWorkspaceSection;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  if(focus){
    const target=state.quoteWorkspaceSection==='import'?$('#quoteImportSupplier'):state.quoteWorkspaceSection==='review'?$('#quoteReviewPanel h2'):$('#quoteWorkspaceSearch');
    target?.focus?.();
  }
}

function setQuoteWorkspaceMode(mode='list',focus=true){
  setQuoteWorkspaceSection(mode==='list'?'quoted':'import',focus);
}

function renderQuoteTenderComparison(){
  const list=$('#comparativoLista');
  if(!list)return;
  const tenderId=state.quoteViewTenderId||'';
  const allItems=state.itens
    .filter(i=>String(i.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero));
  const term=quoteNormalize(state.quoteWorkspaceSearch||'');
  const filter=state.quoteWorkspaceFilter||'all';
  const items=allItems.filter(item=>{
    const has=Boolean(bestQuote(item.id));
    if(filter==='quoted'&&!has)return false;
    if(filter==='missing'&&has)return false;
    return !term||quoteNormalize(`ITEM ${item.numero} ${item.descricao} ${item.unidade||''}`).includes(term);
  });

  const count=$('#quoteListCount');
  if(count)count.textContent=tenderId?`${items.length} de ${allItems.length} itens exibidos`:'Selecione um edital para começar.';
  document.querySelectorAll('[data-quote-filter]').forEach(btn=>{
    const active=btn.dataset.quoteFilter===filter;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
  });

  if(!tenderId){
    list.innerHTML='<div class="quote-empty-list">Cadastre ou selecione um edital para ver as cotações.</div>';
    return;
  }
  if(!items.length){
    list.innerHTML='<div class="quote-empty-list">Nenhum item corresponde à busca ou ao filtro selecionado.</div>';
    return;
  }

  list.innerHTML=`
    <table class="quote-direct-table">
      <thead><tr><th>Item</th><th>Melhor custo</th><th>Fornecedor</th><th>Estimado</th><th>Situação</th><th>Ações</th></tr></thead>
      <tbody>
        ${items.map(item=>{
          const best=bestQuote(item.id);
          const saved=quotesForItem(item.id);
          const supplier=best?state.fornecedores.find(f=>String(f.id)===String(best.fornecedor_id)):null;
          const status=best
            ?'<span class="badge good">Cotado</span>'
            :saved.length
              ?'<span class="badge warn">Revisar valores</span>'
              :'<span class="badge neutral">Sem cotação</span>';
          return `
            <tr>
              <td class="quote-item-cell" data-label="Item"><strong>Item ${esc(item.numero)} · ${esc(item.descricao)}</strong><span>${esc(item.quantidade||0)} ${esc(item.unidade||'')} • ${saved.length} cotaç${saved.length===1?'ão':'ões'} salva${saved.length===1?'':'s'}</span></td>
              <td data-label="Melhor custo"><strong>${best?money(best.custoEq):'-'}</strong>${best?.apresentacao?`<div class="hint">${esc(best.apresentacao)}</div>`:''}</td>
              <td data-label="Fornecedor">${best?esc(supplier?.nome||'-'):'-'}</td>
              <td data-label="Estimado">${Number(item.valor_estimado||0)>0?money(item.valor_estimado):'-'}</td>
              <td data-label="Situação">${status}</td>
              <td data-label="Ações"><div class="quote-table-actions">${saved.length?`<button type="button" class="action-btn danger-btn" data-remove-item-quotes="${esc(item.id)}">Remover</button>`:'-'}</div></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderQuoteSheet(){
  const panel=$('#quoteSheetPanel');if(!panel)return;const tender=state.licitacoes.find(l=>String(l.id)===String(state.quoteViewTenderId));
  if(!tender){panel.innerHTML='<p class="hint">Selecione um edital para criar uma nova cotação.</p>';return;}
  const allItems=state.itens.filter(i=>String(i.licitacao_id)===String(tender.id)).sort((a,b)=>Number(a.numero)-Number(b.numero));
  const excluded=new Set((state.quoteExcludedItems?.[String(tender.id)]||[]).map(String));
  const items=allItems.filter(i=>!excluded.has(String(i.id)));
  const canUndo=state.quoteUndoStack?.some(action=>String(action.tenderId)===String(tender.id));
  const canRedo=state.quoteRedoStack?.some(action=>String(action.tenderId)===String(tender.id));
  const rowMarkup=items.map(i=>`<tr><td><div class="quote-sheet-item"><button type="button" class="quote-sheet-remove" data-quote-delete-item="${esc(i.id)}" title="Excluir item da cotação" aria-label="Excluir item ${esc(i.numero)}">×</button><span>${esc(i.descricao||'-')}</span></div></td><td>${esc(i.unidade||'-')}</td><td>${esc(i.quantidade??'-')}</td></tr>`).join('');
  panel.innerHTML=`<div class="panel-title"><div><h2>Tabela da cotação</h2><p class="hint">${esc(tender.orgao||'Órgão comprador')} • ${esc(tender.cidade||'')} ${tender.proposalEndAt?'• Proposta até '+dateBR(tender.proposalEndAt,false):''}</p></div><div class="quote-export-actions"><button type="button" class="action-btn quote-export-btn" id="quoteExportPdf" ${items.length?'':'disabled'}>⇩ PDF</button><button type="button" class="action-btn quote-export-btn" id="quoteExportWord" ${items.length?'':'disabled'}>⇩ Word</button></div></div><div class="quote-sheet-controls"><span>${items.length} de ${allItems.length} itens disponíveis</span><div class="quote-sheet-actions"><button type="button" class="action-btn" data-refresh-quote-items title="Recarregar itens originais">↻ Atualizar itens</button><button type="button" class="action-btn" data-quote-undo ${canUndo?'':'disabled'} title="Desfazer exclusão">↶</button><button type="button" class="action-btn" data-quote-redo ${canRedo?'':'disabled'} title="Refazer exclusão">↷</button></div></div>${items.length?`<div class="quote-sheet-scroll"><table class="quote-sheet-table"><thead><tr><th>Nome do item</th><th>Unidade</th><th>Quantidade</th></tr></thead><tbody>${rowMarkup}</tbody></table></div>`:'<p class="hint">Este edital não possui itens disponíveis para cotação.</p>'}`;
}

function quoteExportSafePart(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'edital';}

function quoteExportItems(tender){
  const excluded=new Set((state.quoteExcludedItems?.[String(tender.id)]||[]).map(String));
  return state.itens.filter(i=>String(i.licitacao_id)===String(tender.id)&&!excluded.has(String(i.id))).sort((a,b)=>Number(a.numero)-Number(b.numero));
}

async function exportQuoteWord(){
  const tender=state.licitacoes.find(l=>String(l.id)===String(state.quoteViewTenderId));if(!tender)return;
  const items=quoteExportItems(tender);if(!items.length)return toast('Não há itens disponíveis para exportar.','error');
  // O gerador principal usa docx, mas o arquivo também precisa funcionar
  // quando a rede/CDN estiver indisponível (por exemplo, no primeiro acesso).
  // Nesse caso geramos um .doc compatível com Word, sem bloquear o download.
  if(!window.docx){
    try{return await exportQuoteWordFallback(tender,items)}
    catch(error){console.error('Exportação Word (fallback):',error);return toast('Não foi possível gerar o arquivo Word. Tente novamente.','error')}
  }
  try{
    const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,ImageRun,Header,BorderStyle}=window.docx;
    const sourceBlob=await fetch('assets/papel-timbrado.png').then(r=>r.blob());
    const bitmap=await createImageBitmap(sourceBlob);const canvas=document.createElement('canvas');const cropHeight=Math.min(bitmap.height,430);canvas.width=bitmap.width;canvas.height=cropHeight;canvas.getContext('2d').drawImage(bitmap,0,0,bitmap.width,cropHeight,0,0,canvas.width,cropHeight);bitmap.close();
    const imageBytes=new Uint8Array(await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer());
    const borders={top:{style:BorderStyle.SINGLE,size:4,color:'B9B9B9'},bottom:{style:BorderStyle.SINGLE,size:4,color:'B9B9B9'},left:{style:BorderStyle.SINGLE,size:4,color:'B9B9B9'},right:{style:BorderStyle.SINGLE,size:4,color:'B9B9B9'},insideHorizontal:{style:BorderStyle.SINGLE,size:4,color:'D6D6D6'},insideVertical:{style:BorderStyle.SINGLE,size:4,color:'D6D6D6'}};
    const cell=(value,bold=false)=>new TableCell({children:[new Paragraph({children:[new TextRun({text:String(value??'-'),bold,size:18,font:'Arial'})]})]});
    const rows=[new TableRow({children:[cell('NOME DO ITEM',true),cell('UNIDADE',true),cell('QUANTIDADE',true)]}),...items.map(item=>new TableRow({children:[cell(item.descricao||'-'),cell(item.unidade||'-'),cell(item.quantidade??'-')]}))];
    const doc=new Document({sections:[{properties:{page:{margin:{top:720,right:720,bottom:720,left:720}}},headers:{default:new Header({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new ImageRun({data:imageBytes,transformation:{width:550,height:190}})]})]})},children:[new Paragraph({spacing:{before:160,after:60},children:[new TextRun({text:'TABELA DE COTAÇÃO',bold:true,size:30,font:'Arial'})]}),new Paragraph({spacing:{after:40},children:[new TextRun({text:`${tender.cidade||''} • Edital ${tender.numero||'-'}`,bold:true,size:20,font:'Arial'})]}),new Paragraph({spacing:{after:140},children:[new TextRun({text:String(tender.orgao||'Órgão comprador'),size:18,font:'Arial'})]}),new Table({width:{size:100,type:WidthType.PERCENTAGE},borders,rows})]}]});
    const blob=await Packer.toBlob(doc);const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`cotacao-${quoteExportSafePart(tender.cidade)}-edital-${quoteExportSafePart(tender.numero)}.docx`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }catch(error){console.error('Exportação Word:',error);toast('Não foi possível gerar o arquivo Word. Tente novamente.','error');}
}

async function exportQuoteWordFallback(tender,items){
  const image=await fetch('assets/papel-timbrado.png').then(response=>response.ok?response.blob():null).catch(()=>null);
  let imageData='';
  if(image){
    try{
      const bitmap=await createImageBitmap(image);
      const canvas=document.createElement('canvas');
      // O arquivo timbrado é uma página A4; no Word usamos somente o
      // cabeçalho superior, evitando que a imagem ocupe uma página inteira.
      const cropHeight=Math.min(bitmap.height,430);
      canvas.width=bitmap.width;canvas.height=cropHeight;
      canvas.getContext('2d').drawImage(bitmap,0,0,bitmap.width,cropHeight,0,0,canvas.width,cropHeight);
      imageData=canvas.toDataURL('image/png');bitmap.close();
    }catch{
      imageData=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(image)})
    }
  }
  const esc=value=>String(value??'-').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const rows=items.map(item=>`<tr><td>${esc(item.descricao)}</td><td>${esc(item.unidade)}</td><td>${esc(item.quantidade)}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page{margin:1.2cm}body{font-family:Arial,sans-serif;color:#1d2328;margin:0;padding:0}
    .cabecalho{text-align:center;margin:0 0 12px;height:150px;overflow:hidden}.cabecalho img{width:550px;height:185px;max-width:100%;display:block;margin:0 auto;object-fit:contain;object-position:top}
    h1{font-size:20pt;margin:8px 0 4px}.meta{font-size:11pt;margin:2px 0 14px}table{width:100%;border-collapse:collapse;table-layout:fixed}
    th,td{border:1px solid #aaa;padding:6px 7px;vertical-align:top;font-size:10pt;line-height:1.25;word-wrap:break-word}th{font-weight:bold;background:#f1f1f1;text-align:left}
    th:first-child,td:first-child{width:70%}th:nth-child(2),td:nth-child(2){width:16%}th:nth-child(3),td:nth-child(3){width:14%;text-align:center}
  </style></head><body><div class="cabecalho">${imageData?`<img src="${imageData}" alt="Papel timbrado">`:''}</div>
  <h1>TABELA DE COTAÇÃO</h1><div class="meta"><strong>${esc(tender.cidade||'')}</strong> • Edital ${esc(tender.numero||'-')}</div>
  <div class="meta">${esc(tender.orgao||'Órgão comprador')}</div><table><thead><tr><th>NOME DO ITEM</th><th>UNIDADE</th><th>QUANTIDADE</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const blob=new Blob([html],{type:'application/msword;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`cotacao-${quoteExportSafePart(tender.cidade)}-edital-${quoteExportSafePart(tender.numero)}.doc`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}

function exportQuoteExcel(){
  const tender=state.licitacoes.find(l=>String(l.id)===String(state.quoteViewTenderId));if(!tender)return;
  const items=quoteExportItems(tender);if(!items.length)return toast('Não há itens disponíveis para exportar.','error');
  if(!window.XLSX)return toast('O gerador de Excel ainda está carregando. Tente novamente.','error');
  const rows=[['TABELA DE COTAÇÃO'],[`${tender.cidade||''} • Edital ${tender.numero||'-'}`],[String(tender.orgao||'Órgão comprador')],[],['NOME DO ITEM','UNIDADE','QUANTIDADE'],...items.map(item=>[String(item.descricao||'-'),String(item.unidade||'-'),item.quantidade??'-'])];
  const ws=XLSX.utils.aoa_to_sheet(rows);ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:2}},{s:{r:1,c:0},e:{r:1,c:2}},{s:{r:2,c:0},e:{r:2,c:2}}];ws['!cols']=[{wch:70},{wch:18},{wch:16}];
  const style=(r,c,fill,bold)=>{const cellRef=XLSX.utils.encode_cell({r,c});if(!ws[cellRef])return;ws[cellRef].s={font:{name:'Arial',sz:11,bold:!!bold,color:{rgb:'1F1F1F'}},fill:fill?{patternType:'solid',fgColor:{rgb:fill}}:undefined,alignment:{vertical:'center',wrapText:true},border:{top:{style:'thin',color:{rgb:'B9B9B9'}},bottom:{style:'thin',color:{rgb:'B9B9B9'}},left:{style:'thin',color:{rgb:'B9B9B9'}},right:{style:'thin',color:{rgb:'B9B9B9'}}}};};
  style(0,0,'FFFFFF',true);style(1,0,'FFFFFF',true);style(2,0,'FFFFFF',false);for(let c=0;c<3;c++)style(4,c,'E6B94A',true);for(let r=5;r<rows.length;r++)for(let c=0;c<3;c++)style(r,c,'FFFFFF',false);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Cotação');XLSX.writeFile(wb,`cotacao-${quoteExportSafePart(tender.cidade)}-edital-${quoteExportSafePart(tender.numero)}.xlsx`);
}

async function exportQuotePdf(){
  const tender=state.licitacoes.find(l=>String(l.id)===String(state.quoteViewTenderId));if(!tender)return;
  const excluded=new Set((state.quoteExcludedItems?.[String(tender.id)]||[]).map(String));
  const items=state.itens.filter(i=>String(i.licitacao_id)===String(tender.id)&&!excluded.has(String(i.id))).sort((a,b)=>Number(a.numero)-Number(b.numero));if(!items.length)return toast('Não há itens disponíveis para exportar.','error');
  if(!window.PDFLib)return toast('O gerador de PDF ainda está carregando. Tente novamente.','error');
  const {PDFDocument,rgb,StandardFonts}=window.PDFLib;const base=await fetch('assets/papel-timbrado.pdf').then(r=>r.arrayBuffer());const pdf=await PDFDocument.load(base);const templatePdf=await PDFDocument.load(base);let page=pdf.getPages()[0];const font=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);const ink=rgb(.12,.12,.12),line=rgb(.72,.72,.72);const x0=60,x1=90,x2=390,x3=455,x4=535,rowFont=8.5,rowGap=11;
  const wrap=(value,maxWidth)=>{const words=String(value||'-').split(/\s+/);const lines=[];let current='';for(const word of words){const next=current?`${current} ${word}`:word;if(font.widthOfTextAtSize(next,rowFont)<=maxWidth)current=next;else{if(current)lines.push(current);current=word;}}if(current)lines.push(current);return lines.length?lines:['-'];};
  let y=680;page.drawText('TABELA DE COTAÇÃO',{x:x0,y,size:16,font:bold,color:ink});page.drawText(`${tender.orgao||'Órgão comprador'} • Edital ${tender.numero||'-'}`,{x:x0,y:y-24,size:9.5,font:bold,color:ink});page.drawText(`${tender.cidade||''}`,{x:x0,y:y-39,size:9.5,font,color:ink});y-=70;
  const drawHeader=()=>{const top=y;page.drawRectangle({x:x0,y:top-22,width:x4-x0,height:22,borderColor:line,borderWidth:.7,color:rgb(.96,.96,.96)});[['Nº',x0+8],['NOME DO ITEM',x1+8],['UNIDADE',x2+8],['QUANTIDADE',x3+8]].forEach(([text,x])=>page.drawText(text,{x,y:top-15,size:8.5,font:bold,color:ink}));[x1,x2,x3].forEach(x=>page.drawLine({start:{x,y:top-22},end:{x,y:top},thickness:.7,color:line}));y=top-22;};
  drawHeader();for(const [index,item] of items.entries()){const lines=wrap(String(item.descricao||''),x2-x1-16);const height=Math.max(24,lines.length*rowGap+8);if(y-height<100){const [templatePage]=await pdf.copyPages(templatePdf,[0]);page=pdf.addPage(templatePage);y=760;drawHeader();}page.drawRectangle({x:x0,y:y-height,width:x4-x0,height,borderColor:line,borderWidth:.7});[x1,x2,x3].forEach(x=>page.drawLine({start:{x,y:y-height},end:{x,y},thickness:.7,color:line}));page.drawText(String(item.numero??index+1),{x:x0+8,y:y-14,size:rowFont,font,color:ink});lines.forEach((text,lineIndex)=>page.drawText(text,{x:x1+8,y:y-13-lineIndex*rowGap,size:rowFont,font,color:ink}));page.drawText(String(item.unidade||'-'),{x:x2+8,y:y-14,size:rowFont,font,color:ink});page.drawText(String(item.quantidade??'-'),{x:x3+8,y:y-14,size:rowFont,font,color:ink});y-=height;}const bytes=await pdf.save();const blob=new Blob([bytes],{type:'application/pdf'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);const safePart=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'edital';link.download=`cotacao-${safePart(tender.cidade)}-edital-${safePart(tender.numero)}.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}

function renderQuotesWorkspace(){
  ensureQuoteWorkspaceStyles();
  const availableTenders=state.licitacoes.filter(l=>!l.is_quoted);
  const exists=availableTenders.some(l=>String(l.id)===String(state.quoteViewTenderId));
  if(!exists)state.quoteViewTenderId=availableTenders[0]?.id||'';
  const tenderId=state.quoteViewTenderId||'';
  const tender=state.licitacoes.find(l=>String(l.id)===String(tenderId));
  restoreQuoteReviewDraft(tenderId);
  const tenderItems=state.itens.filter(i=>String(i.licitacao_id)===String(tenderId));
  const quoted=tenderItems.filter(i=>Boolean(bestQuote(i.id))).length;

  const globalSelect=$('#quoteWorkspaceTender');
  if(globalSelect){
    globalSelect.innerHTML=quoteTenderOptions(tenderId);
    globalSelect.value=tenderId;
    globalSelect.disabled=!state.licitacoes.length;
  }
  const importTender=$('#quoteImportTender');
  if(importTender){
    importTender.innerHTML=quoteTenderOptions(tenderId);
    importTender.value=tenderId;
  }
  const importLabel=$('#quoteImportTenderLabel');
  if(importLabel)importLabel.innerHTML=tender?`Arquivo para <strong>${esc(tender.numero)} • ${esc(tender.orgao)}</strong>`:'Selecione um edital acima antes de importar.';

  const reviewCount=quotePendingReviewRows().length;
  const summary=$('#quoteWorkspaceSummary');
  if(summary)summary.innerHTML=tender
    ?`<strong>${tenderItems.length} ${tenderItems.length===1?'item':'itens'}</strong>`
    :'Selecione um edital para começar.';
  const reviewBadge=$('#quoteReviewCount');
  if(reviewBadge)reviewBadge.textContent=String(reviewCount);
  const search=$('#quoteWorkspaceSearch');
  if(search&&search.value!==state.quoteWorkspaceSearch)search.value=state.quoteWorkspaceSearch||'';
  setQuoteWorkspaceSection(state.quoteWorkspaceSection||'import',false);
  renderQuoteImportPreview();
  renderQuoteTenderComparison();
  renderQuoteSheet();
}


function ensurePricingTenderViewer(){
  const list=$('#precificacaoLista');
  if(!list)return;

  let box=$('#pricingTenderViewer');
  if(!box){
    box=document.createElement('div');
    box.id='pricingTenderViewer';
    box.style.margin='0 0 18px';
    box.innerHTML=`
      <div style="display:grid;grid-template-columns:minmax(280px,1fr) auto auto;gap:12px;align-items:end">
        <label style="display:grid;gap:6px">
          <span>Precificação de qual edital?</span>
          <select id="pricingTenderViewSelect">
            <option value="">Selecione a licitação</option>
          </select>
        </label>

        <button type="button" id="pricingTenderViewBtn">Abrir precificação</button>

        <button type="button" id="pricingOnlyMissingBtn" class="action-btn">
          Mostrar só sem cotação
        </button>
      </div>

      <div id="pricingTenderViewInfo" class="hint" style="margin-top:8px">
        Selecione um edital e clique em Abrir precificação. Os itens dos outros editais ficarão ocultos.
      </div>
    `;

    list.parentNode?.insertBefore(box,list);

    $('#pricingTenderViewBtn')?.addEventListener('click',()=>{
      const tenderId=$('#pricingTenderViewSelect')?.value||'';
      state.pricingViewTenderId=tenderId;
      state.pricingOnlyMissing=false;
      renderPricingByTender();
    });

    $('#pricingOnlyMissingBtn')?.addEventListener('click',()=>{
      if(!state.pricingViewTenderId){
        toast('Abra primeiro a precificação de um edital.','error');
        return;
      }
      state.pricingOnlyMissing=!state.pricingOnlyMissing;
      renderPricingByTender();
    });
  }

  const select=$('#pricingTenderViewSelect');
  if(select){
    const current=state.pricingViewTenderId||'';
    select.innerHTML=
      '<option value="">Selecione a licitação</option>'+
      state.licitacoes
        .map(l=>`<option value="${l.id}" ${String(l.id)===String(current)?'selected':''}>${esc(l.numero)} • ${esc(l.orgao)}</option>`)
        .join('');
  }

  const missingBtn=$('#pricingOnlyMissingBtn');
  if(missingBtn){
    missingBtn.textContent=state.pricingOnlyMissing
      ? '✓ Somente sem cotação'
      : 'Mostrar só sem cotação';
  }
}

function pricingItemsForSelectedTender(){
  const tenderId=state.pricingViewTenderId||'';
  if(!tenderId)return [];
  return state.itens
    .filter(i=>String(i.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero));
}


function ensurePricingWorkspace(){
  const section=$('#precificacao');
  const list=$('#precificacaoLista');
  const simulator=section?.querySelector('.simulator-panel');
  const mapPanel=list?.closest('.panel');

  if(!section || !list || !simulator || !mapPanel)return;

  let workspace=$('#pricingWorkspace');
  if(!workspace){
    workspace=document.createElement('div');
    workspace.id='pricingWorkspace';
    workspace.className='pricing-workspace';

    const main=document.createElement('div');
    main.className='pricing-main-card';

    const head=document.createElement('div');
    head.className='pricing-main-head';
    head.innerHTML=`
      <strong>Tabela de itens</strong>
      <span class="hint">Cotação → custo → margem → lance</span>
    `;

    main.appendChild(head);
    mapPanel.parentNode.insertBefore(workspace,mapPanel);
    workspace.appendChild(main);
    main.appendChild(mapPanel);
    workspace.appendChild(simulator);
  }
}


function ensurePricingExactModelStyles(){
  if(document.getElementById('pricingExactModelStyles'))return;
  const style=document.createElement('style');
  style.id='pricingExactModelStyles';
  style.textContent=`
    /* A Precificação só pode ocupar a tela quando a aba estiver ativa.
       A regra anterior usava display:grid sempre e anulava o display:none
       padrão das outras abas, por isso ela aparecia embaixo de todas. */
    #precificacao.pricing-exact{
      display:none !important;
    }

    #precificacao.pricing-exact.tab.active{
      display:grid !important;
      grid-template-columns:minmax(0,1fr);
      min-height:calc(100vh - 62px);
      background:#06131b;
    }

    #precificacao.pricing-exact > .panel,
    #precificacao.pricing-exact > #pricingSummary,
    #precificacao.pricing-exact > #pricingWorkspace,
    #precificacao.pricing-exact > #pricingExactShell{
      grid-column:1;
    }

    #precificacao.pricing-exact .pricing-side{
      display:none !important;
      grid-column:1;
      grid-row:1 / span 20;
      position:sticky;
      top:62px;
      height:calc(100vh - 62px);
      border-right:1px solid #1d313c;
      background:#07151d;
      padding:18px 12px;
      z-index:4;
    }

    .pricing-side-title{
      color:#7f909b;
      font-size:.68rem;
      letter-spacing:.08em;
      margin:12px 10px 14px;
      text-transform:uppercase;
    }

    .pricing-side-nav{
      display:grid;
      gap:7px;
    }

    .pricing-side-nav button{
      display:flex;
      align-items:center;
      gap:10px;
      height:42px;
      padding:0 12px;
      border:0;
      border-radius:8px;
      background:transparent;
      color:#aebbc4;
      text-align:left;
      cursor:pointer;
      font-weight:650;
    }

    .pricing-side-nav button.active{
      background:#1b2016;
      color:#f3b72b;
    }

    .pricing-side-nav button:hover{
      background:#0c202a;
    }

    .pricing-exact-shell{
      padding:20px 16px 26px;
    }

    .px-head{
      display:flex;
      justify-content:space-between;
      gap:20px;
      align-items:flex-start;
      margin-bottom:18px;
    }

    .px-title h1{
      margin:0;
      color:#f3f6f8;
      font-size:1.8rem;
      letter-spacing:-.02em;
    }

    .px-title p{
      margin:6px 0 0;
      color:#9aa8b2;
      font-size:.82rem;
    }

    .px-export{
      border:1px solid #2b4653;
      border-radius:8px;
      height:40px;
      padding:0 14px;
      background:#081720;
      color:#e6edf1;
      font-weight:700;
    }

    .px-context{
      display:grid;
      grid-template-columns:1fr 1fr 1.3fr auto;
      align-items:center;
      gap:0;
      padding:16px 18px;
      border:1px solid #213744;
      border-radius:11px;
      background:#091821;
      margin-bottom:15px;
    }

    .px-context-item{
      padding:0 18px;
      border-right:1px solid #20343f;
      min-width:0;
    }

    .px-context-item:first-child{padding-left:0}
    .px-context-item:last-of-type{border-right:0}

    .px-context-item span{
      display:block;
      color:#8f9fa9;
      font-size:.68rem;
      text-transform:uppercase;
      margin-bottom:6px;
    }

    .px-context-item strong{
      display:block;
      color:#f2f5f7;
      font-size:.86rem;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .px-context-action{
      justify-self:end;
      border:1px solid #204a67;
      color:#5eb2ff;
      background:#07151d;
      border-radius:8px;
      height:40px;
      padding:0 14px;
      font-weight:750;
      cursor:pointer;
    }

    .px-kpis{
      display:grid;
      grid-template-columns:repeat(5,minmax(150px,1fr));
      gap:10px;
      margin-bottom:15px;
    }

    .px-kpi{
      min-height:92px;
      border:1px solid #213744;
      border-radius:10px;
      background:#091821;
      padding:15px 16px;
    }

    .px-kpi small{
      display:block;
      color:#8f9fa9;
      font-size:.68rem;
      margin-bottom:4px;
      text-transform:uppercase;
    }

    .px-kpi strong{
      display:block;
      color:#f4f7f9;
      font-size:1.45rem;
      line-height:1.1;
    }

    .px-kpi span{
      display:block;
      color:#9aa8b2;
      font-size:.72rem;
      margin-top:5px;
    }

    .px-main{
      display:grid;
      grid-template-columns:minmax(0,1fr) 320px;
      gap:14px;
      align-items:start;
    }

    .px-table-card,
    .px-sim-card{
      border:1px solid #213744;
      border-radius:11px;
      background:#081720;
      overflow:hidden;
    }

    .px-tabs{
      display:flex;
      gap:24px;
      padding:0 16px;
      border-bottom:1px solid #213744;
    }

    .px-tab{
      height:46px;
      display:flex;
      align-items:center;
      border-bottom:2px solid transparent;
      color:#8f9fa9;
      font-size:.78rem;
    }

    .px-tab.active{
      color:#f1b52a;
      border-bottom-color:#f1b52a;
    }

    .px-filters{
      display:grid;
      grid-template-columns:minmax(260px,1.3fr) 195px 220px auto;
      gap:9px;
      padding:14px 16px;
      border-bottom:1px solid #213744;
    }

    .px-filters input,
    .px-filters select{
      height:40px;
      border:1px solid #2e4856;
      border-radius:7px;
      background:#06141c;
      color:#eaf0f3;
      padding:0 11px;
    }

    .px-clear{
      border:1px solid #2e4856;
      border-radius:7px;
      background:#081720;
      color:#a9b7c0;
      padding:0 13px;
    }

    .px-table-wrap{
      max-height:540px;
      overflow:auto;
    }

    .px-table{
      width:100%;
      min-width:950px;
      border-collapse:separate;
      border-spacing:0;
    }

    .px-table th{
      position:sticky;
      top:0;
      z-index:2;
      background:#081720;
      color:#a8b5bd;
      font-size:.68rem;
      text-align:left;
      padding:12px 10px;
      border-bottom:1px solid #213744;
      font-weight:700;
    }

    .px-table td{
      background:#091821;
      color:#e7edf1;
      font-size:.76rem;
      padding:12px 10px;
      border-bottom:1px solid #1d313c;
      vertical-align:middle;
    }

    .px-table tbody tr:hover td{
      background:#0c2029;
    }

    .px-itemnum{
      display:inline-grid;
      place-items:center;
      width:36px;
      height:36px;
      border:1px solid #253d48;
      border-radius:8px;
      font-weight:850;
      color:#edf3f6;
      background:#0a1b24;
    }

    .px-item-title{
      font-weight:800;
      color:#f4f7f8;
      margin-bottom:4px;
    }

    .px-item-meta{
      color:#8f9fa9;
      font-size:.67rem;
    }

    .px-price{
      color:#e9eef1;
      font-weight:800;
    }

    .px-sale{
      color:#39d47a;
      font-weight:850;
    }

    
    .px-target-box{
      display:grid;
      grid-template-columns:110px minmax(120px,1fr);
      gap:7px;
      align-items:center;
      min-width:245px;
    }

    
    .px-target-box input.is-inactive{
      opacity:.38;
      pointer-events:none;
    }

    .px-target-warning{
      margin-top:4px;
      color:#ffcc55;
      font-size:.61rem;
      line-height:1.3;
    }

.px-target-box select,
    .px-target-box input{
      height:36px;
      border:1px solid #2e4856;
      border-radius:7px;
      background:#06141c;
      color:#eef3f6;
      padding:0 8px;
      font-size:.7rem;
    }

    .px-profit{
      color:#35d379;
      font-weight:850;
      white-space:nowrap;
    }

    .px-margin-current{
      display:flex;
      flex-direction:column;
      gap:3px;
      min-width:82px;
    }

    .px-margin-current strong{
      color:#edf3f6;
      font-size:.75rem;
    }

    .px-margin-current small{
      color:#8fa0aa;
      font-size:.61rem;
    }

    .px-help{
      display:inline-flex;
      align-items:center;
      gap:5px;
      color:#8fa0aa;
      font-size:.62rem;
      white-space:nowrap;
    }

.px-margin-input{
      width:64px;
      height:38px;
      border:1px solid #2e4856;
      border-radius:7px;
      background:#06141c;
      color:#eef3f6;
      text-align:center;
    }

    .px-status{
      display:inline-flex;
      padding:5px 9px;
      border-radius:999px;
      font-size:.65rem;
      font-weight:850;
      white-space:nowrap;
    }

    .px-status.good{background:#0f3925;color:#52df8b}
    .px-status.warn{background:#4f3e0e;color:#ffd059}
    .px-status.bad{background:#4c1c1d;color:#ff7771}
    .px-status.neutral{background:#26343d;color:#b8c2c8}

    .px-action{
      height:34px;
      border:1px solid #2e4856;
      border-radius:7px;
      background:#07151d;
      color:#dde6eb;
      padding:0 10px;
      cursor:pointer;
    }

    .px-footer{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:14px;
      padding:12px 16px;
      border-top:1px solid #213744;
      color:#8f9fa9;
      font-size:.7rem;
    }

    .px-pages{
      display:flex;
      gap:6px;
      align-items:center;
    }

    .px-page{
      width:34px;
      height:34px;
      border:1px solid #2e4856;
      border-radius:7px;
      background:#081720;
      color:#aab8c0;
      display:grid;
      place-items:center;
    }

    .px-page.active{
      background:#f2b52a;
      color:#06131b;
      border-color:#f2b52a;
      font-weight:900;
    }

    .px-sim-card{
      position:sticky;
      top:76px;
      padding:16px;
    }

    .px-sim-title{
      color:#f2b52a;
      font-weight:850;
      margin-bottom:10px;
      font-size:1rem;
    }

    .px-sim-sub{
      color:#98a6af;
      font-size:.76rem;
      line-height:1.45;
      margin-bottom:14px;
    }

    .px-sim-card label{
      display:block;
      color:#a7b4bc;
      font-size:.7rem;
      margin-bottom:10px;
    }

    .px-sim-card select,
    .px-sim-card input{
      width:100%;
      height:40px;
      margin-top:5px;
      border:1px solid #2e4856;
      border-radius:7px;
      background:#06141c;
      color:#edf2f5;
      padding:0 10px;
    }

    .px-suggested{
      display:inline-block;
      margin-top:4px;
      padding:6px 9px;
      border:1px solid #1d5f3b;
      border-radius:7px;
      background:#0a251a;
      color:#4ad982;
      font-weight:850;
    }

    .px-sim-result{
      margin:14px 0;
      border:1px solid #1d5f3b;
      border-radius:9px;
      background:#092019;
      padding:12px;
    }

    .px-sim-result h4{
      margin:0 0 8px;
      color:#4ad982;
      font-size:.73rem;
      text-transform:uppercase;
    }

    .px-sim-row{
      display:flex;
      justify-content:space-between;
      gap:12px;
      color:#b8c5cc;
      font-size:.72rem;
      margin:6px 0;
    }

    .px-sim-row strong{
      color:#eef3f6;
    }

    .px-tip{
      margin:12px 0;
      padding:11px 12px;
      border:1px solid #164d75;
      border-radius:8px;
      background:#0a2030;
      color:#69b7f4;
      font-size:.7rem;
      line-height:1.45;
    }

    .px-sim-button{
      width:100%;
      height:42px;
      border:0;
      border-radius:8px;
      background:#f2b52a;
      color:#06131b;
      font-weight:900;
      cursor:pointer;
    }

    /* Modelo 36.9: a simulação é a decisão principal; a tabela é um resumo. */
    .px-head-actions{
      display:flex;
      gap:9px;
      flex-wrap:wrap;
      justify-content:flex-end;
    }

    .px-title-line{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
    }

    .px-title-line .px-action,
    .px-head-actions button,
    .px-context-action,
    .px-clear{
      min-height:44px;
    }

    .px-main{
      grid-template-columns:minmax(0,1fr);
      gap:15px;
    }

    .px-sim-card{
      position:static;
      padding:20px;
      overflow:visible;
      border-color:#315160;
      background:linear-gradient(145deg,#0a1c26 0%,#081720 58%,#091c18 100%);
    }

    .px-sim-head{
      display:flex;
      justify-content:space-between;
      gap:20px;
      align-items:flex-start;
      margin-bottom:16px;
    }

    .px-sim-title{
      margin:0 0 5px;
      font-size:1.25rem;
    }

    .px-sim-sub{
      max-width:720px;
      margin:0;
      font-size:.8rem;
    }

    .px-session-note{
      max-width:250px;
      color:#9fb0ba;
      font-size:.7rem;
      line-height:1.4;
      text-align:right;
    }

    .px-sim-controls{
      display:grid;
      grid-template-columns:minmax(230px,1.5fr) minmax(160px,.7fr) minmax(180px,.8fr);
      gap:12px;
      align-items:end;
    }

    .px-sim-controls label,
    .px-target-editor label{
      margin:0;
      font-weight:700;
    }

    .px-sim-card select,
    .px-sim-card input[type="number"]{
      min-height:44px;
      height:44px;
      font-size:.86rem;
    }

    .px-target-editor{
      min-width:0;
    }

    .px-target-auto{
      min-height:44px;
      display:flex;
      align-items:center;
      padding:0 11px;
      border:1px solid #2e4856;
      border-radius:7px;
      background:#06141c;
      color:#b9c7cf;
      font-size:.72rem;
      line-height:1.35;
    }

    .px-slider-area{
      margin-top:18px;
      padding:18px;
      border:1px solid #284451;
      border-radius:12px;
      background:#06141c;
    }

    .px-slider-top{
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:flex-end;
      margin-bottom:10px;
    }

    .px-slider-top span{
      color:#9eacb5;
      font-size:.72rem;
    }

    .px-slider-top strong{
      color:#fff;
      font-size:1.45rem;
    }

    .px-range-shell{
      position:relative;
      padding:9px 0 4px;
    }

    .px-price-range{
      appearance:none;
      -webkit-appearance:none;
      width:100%;
      height:48px !important;
      margin:0 !important;
      padding:0 !important;
      border:0 !important;
      background:transparent !important;
      cursor:pointer;
    }

    .px-price-range::-webkit-slider-runnable-track{
      height:12px;
      border-radius:999px;
      background:linear-gradient(90deg,
        #b74845 0 var(--break-pos),
        #d88f2d var(--break-pos) var(--stop-pos),
        #3185bd var(--stop-pos) var(--target-pos),
        #2aa766 var(--target-pos) 100%);
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.15);
    }

    .px-price-range::-moz-range-track{
      height:12px;
      border-radius:999px;
      background:linear-gradient(90deg,
        #b74845 0 var(--break-pos),
        #d88f2d var(--break-pos) var(--stop-pos),
        #3185bd var(--stop-pos) var(--target-pos),
        #2aa766 var(--target-pos) 100%);
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.15);
    }

    .px-price-range::-webkit-slider-thumb{
      -webkit-appearance:none;
      width:30px;
      height:30px;
      margin-top:-9px;
      border:4px solid #f7c34b;
      border-radius:50%;
      background:#fff;
      box-shadow:0 0 0 4px rgba(247,195,75,.18),0 4px 12px rgba(0,0,0,.45);
    }

    .px-price-range::-moz-range-thumb{
      width:24px;
      height:24px;
      border:4px solid #f7c34b;
      border-radius:50%;
      background:#fff;
      box-shadow:0 0 0 4px rgba(247,195,75,.18),0 4px 12px rgba(0,0,0,.45);
    }

    .px-price-range:disabled{
      cursor:not-allowed;
      opacity:.45;
    }

    .px-track-markers{
      position:absolute;
      inset:10px 0 auto;
      height:14px;
      pointer-events:none;
    }

    .px-track-marker{
      position:absolute;
      left:var(--marker-pos);
      top:0;
      width:2px;
      height:14px;
      background:#fff;
      opacity:.78;
      transform:translateX(-1px);
    }

    .px-marker-legend{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:8px;
      margin-top:8px;
    }

    .px-marker-label{
      display:flex;
      gap:7px;
      align-items:flex-start;
      min-width:0;
      padding:8px 9px;
      border:1px solid #263e4b;
      border-radius:8px;
      color:#aebbc3;
      font-size:.67rem;
      line-height:1.3;
    }

    .px-marker-label i{
      flex:0 0 9px;
      width:9px;
      height:9px;
      margin-top:2px;
      border-radius:50%;
      background:var(--marker-color);
    }

    .px-marker-label b,
    .px-marker-label small{
      display:block;
    }

    .px-marker-label b{color:#edf3f6}
    .px-marker-label small{margin-top:2px;color:#91a2ac}

    .px-sim-result{
      margin:16px 0 0;
      padding:16px;
      border-color:#294653;
      background:#081a22;
    }

    .px-sim-result.good{border-color:#1d7045;background:#09231a}
    .px-sim-result.warn{border-color:#806622;background:#29220e}
    .px-sim-result.bad{border-color:#863c39;background:#291313}
    .px-sim-result.neutral{border-color:#394d58;background:#101c22}

    .px-decision{
      display:flex;
      justify-content:space-between;
      gap:14px;
      align-items:flex-start;
      padding-bottom:12px;
      margin-bottom:12px;
      border-bottom:1px solid rgba(255,255,255,.1);
    }

    .px-decision strong{
      display:block;
      color:#f4f7f8;
      font-size:.95rem;
      margin-bottom:4px;
    }

    .px-decision span{
      color:#b6c3ca;
      font-size:.72rem;
      line-height:1.4;
    }

    .px-result-grid{
      display:grid;
      grid-template-columns:repeat(6,minmax(110px,1fr));
      gap:9px;
    }

    .px-result-stat{
      min-width:0;
      padding:10px;
      border:1px solid rgba(255,255,255,.1);
      border-radius:8px;
      background:rgba(4,14,19,.38);
    }

    .px-result-stat span,
    .px-result-stat small{
      display:block;
      color:#99aab4;
      font-size:.65rem;
      line-height:1.3;
    }

    .px-result-stat strong{
      display:block;
      margin:4px 0 2px;
      color:#f2f6f8;
      font-size:.86rem;
      word-break:break-word;
    }

    .px-validation,
    .px-no-quote{
      padding:14px;
      border:1px solid #70423d;
      border-radius:9px;
      background:#231514;
      color:#ffc0bb;
      font-size:.76rem;
      line-height:1.5;
    }

    .px-no-quote .px-action{margin-top:10px}

    .px-table-card{overflow:hidden}
    .px-table-wrap{max-height:620px}
    .px-table{min-width:850px}
    .px-filters{grid-template-columns:minmax(220px,1fr) 190px auto}
    .px-actions{display:flex;gap:6px;flex-wrap:wrap}
    .px-actions .px-action{min-height:40px}
    .px-action.primary{border-color:#9a7420;color:#ffd363;background:#2a210d}
    .px-price-pair{display:grid;gap:5px;min-width:130px}
    .px-price-pair div{display:flex;justify-content:space-between;gap:8px}
    .px-price-pair small{color:#8fa0aa}
    .px-price-pair strong{font-size:.72rem;color:#ecf2f5}

    .pricing-exact-shell :is(button,input,select):focus-visible{
      outline:3px solid #67b7ff;
      outline-offset:2px;
    }

    .px-live-only{
      position:absolute;
      width:1px;
      height:1px;
      padding:0;
      margin:-1px;
      overflow:hidden;
      clip:rect(0,0,0,0);
      white-space:nowrap;
      border:0;
    }

    @media(max-width:1250px){
      #precificacao.pricing-exact.tab.active{grid-template-columns:minmax(0,1fr)}
      #precificacao.pricing-exact .pricing-side{display:none}
      #precificacao.pricing-exact > .panel,
      #precificacao.pricing-exact > #pricingSummary,
      #precificacao.pricing-exact > #pricingWorkspace,
      #precificacao.pricing-exact > #pricingExactShell{
        grid-column:1;
      }
      .px-main{grid-template-columns:1fr}
      .px-sim-card{position:static}
      .px-kpis{grid-template-columns:repeat(2,1fr)}
      .px-result-grid{grid-template-columns:repeat(3,minmax(110px,1fr))}
    }

    @media(max-width:768px){
      .pricing-exact-shell{padding:14px 10px 22px}
      .px-head,.px-sim-head{flex-direction:column;align-items:stretch}
      .px-head-actions{justify-content:stretch}
      .px-head-actions button{flex:1 1 150px}
      .px-context{grid-template-columns:1fr 1fr;gap:12px;padding:14px}
      .px-context-item{padding:0;border:0}
      .px-context-action{grid-column:1/-1;width:100%}
      .px-sim-controls{grid-template-columns:1fr 1fr}
      .px-sim-controls > :first-child{grid-column:1/-1}
      .px-session-note{text-align:left;max-width:none}
      .px-marker-legend{grid-template-columns:1fr 1fr}
      .px-filters{grid-template-columns:1fr 160px auto}
    }

    @media(max-width:620px){
      .px-title h1{font-size:1.5rem}
      .px-kpis{grid-template-columns:1fr 1fr}
      .px-kpi{min-height:82px;padding:12px}
      .px-context{grid-template-columns:1fr}
      .px-context-action{grid-column:auto}
      .px-sim-card{padding:14px}
      .px-sim-controls{grid-template-columns:1fr}
      .px-sim-controls > :first-child{grid-column:auto}
      .px-slider-area{padding:14px 10px}
      .px-slider-top strong{font-size:1.2rem}
      .px-result-grid{grid-template-columns:1fr 1fr}
      .px-filters{grid-template-columns:1fr;padding:12px}
      .px-filters input,.px-filters select,.px-clear{width:100%;min-height:44px}

      .px-table-wrap{max-height:none;overflow:visible;padding:10px}
      .px-table,.px-table tbody,.px-table tr,.px-table td{display:block;width:100%;min-width:0}
      .px-table thead{display:none}
      .px-table tr{
        margin-bottom:10px;
        border:1px solid #29434f;
        border-radius:10px;
        overflow:hidden;
        background:#091821;
      }
      .px-table td{
        display:grid;
        grid-template-columns:minmax(94px,34%) minmax(0,1fr);
        gap:10px;
        align-items:start;
        padding:10px;
      }
      .px-table td::before{
        content:attr(data-label);
        color:#8fa0aa;
        font-size:.65rem;
        font-weight:750;
        text-transform:uppercase;
      }
      .px-table td:first-child{background:#0c2029}
      .px-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}
      .px-actions .px-action{height:44px;white-space:normal}
      .px-footer{align-items:flex-start;flex-direction:column}
    }

    @media(max-width:360px){
      .px-kpis,.px-result-grid,.px-marker-legend{grid-template-columns:1fr}
      .px-actions{grid-template-columns:1fr}
      .px-table td{grid-template-columns:82px minmax(0,1fr)}
    }
  `;
  document.head.appendChild(style);
}

function pricingStatusClass(status){
  if(status==='Excelente')return 'good';
  if(status==='Oportunidade')return 'warn';
  if(status==='Ruim')return 'bad';
  return 'neutral';
}



try{
  const savedCostConfig=JSON.parse(localStorage.getItem('inova_cost_config')||'null');
  if(savedCostConfig) state.costConfig={...(state.costConfig||{}),...savedCostConfig};
}catch(e){}

function getPricingTarget(itemId){
  state.pricingTargets ||= {};
  const key=String(itemId);
  if(!state.pricingTargets[key]){
    state.pricingTargets[key]={
      mode:'auto',
      margin:null,
      profit:null
    };
  }
  return state.pricingTargets[key];
}

function pricingTargetsStorageKey(){
  return `inova_pricing_targets:${currentCompanyId()||'local'}`;
}

function loadPricingTargets(){
  const key=pricingTargetsStorageKey();
  if(state.pricingTargetsLoadedFor===key)return;
  state.pricingTargetsLoadedFor=key;
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'{}');
    state.pricingTargets=saved&&typeof saved==='object'?saved:{};
  }catch{
    state.pricingTargets={};
  }
}

function persistPricingTargets(){
  try{
    localStorage.setItem(pricingTargetsStorageKey(),JSON.stringify(state.pricingTargets||{}));
  }catch{
    toast('Não foi possível salvar as metas neste navegador.','error');
  }
}

function ceilPricingMoney(value,step=0.01){
  const number=Number(value);
  if(!Number.isFinite(number))return null;
  return Number((Math.ceil((number-Number.EPSILON)/step)*step).toFixed(2));
}

function normalizePricingBid(value){
  const number=Number(value);
  if(!Number.isFinite(number))return null;
  return Number((Math.round((number+Number.EPSILON)*100)/100).toFixed(2));
}

function calcPricingByFlexibleTarget(item,p){
  if(!item || !p)return null;

  const errors=[];
  const readNonNegative=(value,label)=>{
    const number=Number(value??0);
    if(!Number.isFinite(number)){
      errors.push(`${label} precisa ser um número válido.`);
      return 0;
    }
    if(number<0){
      errors.push(`${label} não pode ser negativo.`);
      return 0;
    }
    return number;
  };

  const qty=Number(item.quantidade);
  if(!Number.isFinite(qty) || qty<=0)errors.push('A quantidade do item precisa ser maior que zero.');

  const baseCostUnit=readNonNegative(p.costUnit,'Custo unitário');
  const fixedFreight=readNonNegative(state.costConfig?.frete_fixo,'Frete fixo');
  const fuelCost=readNonNegative(state.costConfig?.gasolina,'Custo de combustível');
  const fixedOperationCost=fixedFreight+fuelCost;
  const safeQty=Number.isFinite(qty) && qty>0?qty:1;
  const fixedOperationUnit=fixedOperationCost/safeQty;
  const costUnit=baseCostUnit+fixedOperationUnit;

  const taxPercent=readNonNegative(state.config?.imposto,'Impostos');
  const reservePercent=readNonNegative(state.config?.reserva_operacional,'Reserva operacional');
  const extraTax=readNonNegative(state.costConfig?.outros_impostos,'Outros impostos');
  const overheadPercent=taxPercent+reservePercent+extraTax;
  if(overheadPercent>=100)errors.push('A soma dos impostos e encargos precisa ser menor que 100%.');
  const overhead=overheadPercent/100;

  const target=getPricingTarget(item.id);
  const mode=['auto','margin','profit'].includes(target.mode)?target.mode:'auto';
  const estimated=readNonNegative(item.valor_estimado,'Preço estimado');
  const globalMargin=readNonNegative(state.config?.margem_alvo??25,'Margem desejada');
  const globalProfit=readNonNegative(state.config?.lucro_minimo??500,'Lucro mínimo');
  const globalMinimumMargin=readNonNegative(state.config?.margem_minima??10,'Margem mínima');

  const desiredMargin=target.margin==null || target.margin===''
    ? globalMargin
    : readNonNegative(target.margin,'Meta de margem do item');
  const desiredProfit=target.profit==null || target.profit===''
    ? globalProfit
    : readNonNegative(target.profit,'Meta de lucro do item');

  if(overheadPercent<100 && desiredMargin>=100-overheadPercent){
    errors.push('A margem desejada é incompatível com os encargos configurados.');
  }
  if(overheadPercent<100 && globalMinimumMargin>=100-overheadPercent){
    errors.push('A margem mínima é incompatível com os encargos configurados.');
  }

  const validationErrors=[...new Set(errors)];
  if(validationErrors.length){
    return {
      valid:false,
      validationErrors,
      target,
      mode,
      desiredMargin,
      desiredProfit,
      estimated,
      baseCostUnit,
      fixedOperationCost,
      fixedOperationUnit,
      costUnit,
      overhead
    };
  }

  const revenueEstimated=estimated*qty;
  const totalCost=costUnit*qty;

  // Impostos e reserva incidem sobre a venda; não compõem o custo de compra.
  const taxRate=(taxPercent+extraTax)/100;
  const reserveRate=reservePercent/100;
  const taxUnitEstimated=estimated*taxRate;
  const reserveUnitEstimated=estimated*reserveRate;
  const netRevenueUnitEstimated=estimated*(1-taxRate-reserveRate);

  const profitEstimated=estimated>0
    ? revenueEstimated*(1-overhead)-totalCost
    : null;
  const marginEstimated=estimated>0
    ? (profitEstimated/revenueEstimated)*100
    : null;
  const profitOnCostEstimated=estimated>0 && totalCost>0
    ? (profitEstimated/totalCost)*100
    : null;

  const breakEvenRaw=costUnit/(1-overhead);
  const priceByMarginRaw=costUnit/(1-overhead-(desiredMargin/100));
  const priceByProfitRaw=(costUnit+(desiredProfit/qty))/(1-overhead);
  const priceByMinimumMarginRaw=costUnit/(1-overhead-(globalMinimumMargin/100));
  const priceByMinimumProfitRaw=(costUnit+(globalProfit/qty))/(1-overhead);

  // Limites monetários sobem para o próximo centavo: o valor mostrado sempre
  // é aceito pelo próprio campo e nunca fica abaixo da regra por arredondamento.
  const breakEvenUnit=ceilPricingMoney(breakEvenRaw);
  const priceByMargin=ceilPricingMoney(priceByMarginRaw);
  const priceByProfit=ceilPricingMoney(priceByProfitRaw);
  const priceByMinimumMargin=ceilPricingMoney(priceByMinimumMarginRaw);
  const priceByMinimumProfit=ceilPricingMoney(priceByMinimumProfitRaw);
  const minimumUnit=ceilPricingMoney(Math.max(
    breakEvenRaw,
    priceByMinimumMarginRaw,
    priceByMinimumProfitRaw
  ));
  const priceTargetUnit=ceilPricingMoney(
    mode==='margin'
      ? priceByMarginRaw
      : mode==='profit'
        ? priceByProfitRaw
        : Math.max(priceByMarginRaw,priceByProfitRaw)
  );

  let autoStatus='Sem estimado';
  let autoClass='neutral';
  let autoReason='Informe o valor estimado do edital.';

  if(profitEstimated!=null){
    if(profitEstimated<0){
      autoStatus='Prejuízo';
      autoClass='bad';
      autoReason='O valor estimado está abaixo do custo total do item.';
    }else if(profitEstimated>=globalProfit && marginEstimated>=globalMargin){
      autoStatus='Excelente';
      autoClass='good';
      autoReason='Lucro mínimo e margem desejada foram atingidos.';
    }else if(profitEstimated>=globalProfit || marginEstimated>=globalMargin){
      autoStatus='Bom';
      autoClass='good';
      autoReason='Uma das metas principais foi atingida; confira a outra antes da disputa.';
    }else if(profitEstimated>0 && marginEstimated>=globalMinimumMargin){
      autoStatus='Viável';
      autoClass='warn';
      autoReason='Resultado positivo e acima da margem mínima, mas abaixo das metas desejadas.';
    }else{
      autoStatus='Baixo';
      autoClass='warn';
      autoReason='Há lucro, porém o ganho absoluto e a margem ainda são baixos.';
    }
  }

  let status=autoStatus;
  let statusClass=autoClass;
  let statusReason=autoReason;

  if(mode==='margin' && profitEstimated!=null){
    if(profitEstimated<0){
      status='Prejuízo';
      statusClass='bad';
      statusReason='O valor estimado está abaixo do custo.';
    }else if(marginEstimated>=desiredMargin){
      status='Meta atingida';
      statusClass='good';
      statusReason=`Margem atual de ${marginEstimated.toFixed(2)}% atende à meta de ${desiredMargin.toFixed(2)}%.`;
    }else{
      status='Abaixo da margem';
      statusClass='warn';
      statusReason=`Margem atual de ${marginEstimated.toFixed(2)}% está abaixo da meta de ${desiredMargin.toFixed(2)}%.`;
    }
  }

  if(mode==='profit' && profitEstimated!=null){
    if(profitEstimated<0){
      status='Prejuízo';
      statusClass='bad';
      statusReason='O valor estimado está abaixo do custo.';
    }else if(profitEstimated>=desiredProfit){
      status='Meta atingida';
      statusClass='good';
      statusReason=`Lucro atual atende à meta de ${money(desiredProfit)}.`;
    }else{
      status='Abaixo do lucro';
      statusClass='warn';
      statusReason=`Lucro atual está abaixo da meta de ${money(desiredProfit)}.`;
    }
  }

  return {
    valid:true,
    validationErrors:[],
    target,
    mode,
    desiredMargin,
    desiredProfit,
    estimated,
    baseCostUnit,
    fixedOperationCost,
    fixedOperationUnit,
    costUnit,
    totalCost,
    revenueEstimated,
    overhead,
    overheadPercent,
    taxRate,
    reserveRate,
    taxUnitEstimated,
    reserveUnitEstimated,
    netRevenueUnitEstimated,
    profitEstimated,
    marginEstimated,
    profitOnCostEstimated,
    breakEvenUnit,
    priceByMargin,
    priceByProfit,
    priceByMinimumMargin,
    priceByMinimumProfit,
    minimumUnit,
    priceTargetUnit,
    status,
    statusClass,
    statusReason,
    autoStatus,
    autoClass,
    autoReason
  };
}

function pricingProfitBadge(info){
  if(!info)return '';
  return `<span class="px-status ${info.statusClass||'neutral'}" title="${esc(info.statusReason||'')}">${esc(info.status||'Sem status')}</span>`;
}


function renderCostSettings(){
  state.costConfig ||= {frete_fixo:0,gasolina:0,outros_impostos:0};
  const c=state.costConfig;
  const imposto=Number(state.config?.imposto||0);
  const reserva=Number(state.config?.reserva_operacional||0);
  const margemAlvo=Number(state.config?.margem_alvo||25);
  const margemMinima=Number(state.config?.margem_minima||10);
  const lucroMinimo=Number(state.config?.lucro_minimo||500);

  // NÃO substitui mais #app. A tela abre como overlay e o sistema continua intacto.
  document.querySelector('#costSettingsOverlay')?.remove();

  const overlay=document.createElement('div');
  overlay.id='costSettingsOverlay';
  overlay.style.cssText=`
    position:fixed;inset:0;z-index:99999;
    background:#06131b;overflow:auto;color:#eef3f6;
  `;

  overlay.innerHTML=`
    <div style="max-width:1500px;margin:0 auto;padding:28px 30px">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:22px">
        <div>
          <h1 style="margin:0;font-size:30px">Custos & Impostos</h1>
          <p style="color:#8fa0aa;margin-top:7px">Edite os custos usados na precificação. As alterações ficam disponíveis para os cálculos do sistema.</p>
        </div>
        <button id="backToPricing" type="button"
          style="height:40px;border:1px solid #2a4350;border-radius:8px;background:#071720;color:#e8eef2;padding:0 14px;font-weight:750;cursor:pointer;pointer-events:auto;position:relative;z-index:5">
          ← Voltar para Precificação
        </button>
      </div>

      <section style="border:1px solid #203744;background:#071720;border-radius:14px;padding:22px">
        <h2 style="font-size:17px;color:#f6b91f;margin:0 0 18px">Configuração geral</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
          ${costField('cfg-tax','Imposto sobre venda (%)',imposto,'Ex.: Simples Nacional, 6%')}
          ${costField('cfg-reserve','Reserva operacional (%)',reserva,'Custos extras sobre a venda')}
          ${costField('cfg-target-margin','Margem desejada (%)',margemAlvo,'Meta padrão para o preço sugerido')}
          ${costField('cfg-min-margin','Margem mínima (%)',margemMinima,'Limite mínimo aceitável sobre a venda')}
          ${costField('cfg-min-profit','Lucro mínimo por item (R$)',lucroMinimo,'Lucro total mínimo para toda a quantidade')}
          ${costField('cfg-freight','Frete fixo (R$)',Number(c.frete_fixo||0),'Frete total da operação')}
          ${costField('cfg-gas','Gasolina (R$)',Number(c.gasolina||0),'Combustível da entrega/retirada')}
          ${costField('cfg-other-tax','Outros impostos/taxas (%)',Number(c.outros_impostos||0),'Taxas adicionais, se houver')}
        </div>

        <div style="margin-top:20px;padding:15px;border:1px solid #234250;border-radius:10px;background:#06131b;color:#9fb0ba;font-size:13px;line-height:1.55">
          <b style="color:#eef3f6">Como o sistema deve calcular:</b><br>
          Preço do fornecedor + frete rateado + gasolina rateada = custo de aquisição.<br>
          Imposto e outras taxas percentuais são calculados sobre o preço de venda, não sobre a compra.
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button id="saveCostSettings"
            style="border:0;border-radius:9px;padding:12px 22px;background:#f6b91f;color:#071018;font-weight:850;cursor:pointer">
            Salvar configurações
          </button>
        </div>
      </section>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeAndReturn=()=>{
    overlay.remove();

    // Como o app original nunca foi destruído, basta reabrir/atualizar Precificação.
    const pricingTab=document.querySelector('[data-tab="precificacao"]');
    if(pricingTab){
      pricingTab.click();
      if(typeof renderPricingExactModel==='function')renderPricingExactModel();
    }else{
      document.querySelectorAll('.tab').forEach(el=>el.classList.remove('active'));
      document.querySelector('#precificacao')?.classList.add('active');
      if(typeof renderPricingExactModel==='function'){
        renderPricingExactModel();
      }
    }
    window.scrollTo({top:0,behavior:'auto'});
  };

  overlay.querySelector('#backToPricing')?.addEventListener('click',(ev)=>{
    ev.preventDefault();
    closeAndReturn();
  });

  overlay.querySelector('#saveCostSettings')?.addEventListener('click',async()=>{
    const n=id=>Math.max(0,Number(overlay.querySelector('#'+id)?.value||0));
    const saveBtn=overlay.querySelector('#saveCostSettings');
    if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Salvando…';}

    state.config ||= {};
    state.costConfig ||= {};

    state.config.imposto=n('cfg-tax');
    state.config.reserva_operacional=n('cfg-reserve');
    state.config.margem_alvo=n('cfg-target-margin');
    state.config.margem_minima=n('cfg-min-margin');
    state.config.lucro_minimo=n('cfg-min-profit');
    state.costConfig.frete_fixo=n('cfg-freight');
    state.costConfig.gasolina=n('cfg-gas');
    state.costConfig.outros_impostos=n('cfg-other-tax');

    try{
      localStorage.setItem('inova_cost_config',JSON.stringify(state.costConfig));
      if(state.demo)localStorage.setItem('inova_demo_pricing_config',JSON.stringify(state.config));
    }catch(e){}

    if(!state.demo){
      const row={
        company_id:currentCompanyId(),
        tax_percent:state.config.imposto,
        target_margin_percent:state.config.margem_alvo,
        minimum_profit_amount:state.config.lucro_minimo,
        minimum_margin_percent:state.config.margem_minima,
        operational_reserve_percent:state.config.reserva_operacional,
        updated_at:new Date().toISOString()
      };
      const {error}=await supabase.from('pricing_settings').upsert(row,{onConflict:'company_id'});
      if(error){
        if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Salvar configurações';}
        return toast(`Não foi possível salvar as regras: ${error.message}`,'error');
      }
    }

    closeAndReturn();

    if(typeof toast==='function'){
      toast('Custos e impostos atualizados.','success');
    }else{
      alert('Custos e impostos atualizados.');
    }
  });
}

function costField(id,label,value,help){
  return `<label style="display:block">
    <span style="display:block;font-size:12px;color:#aebbc3;margin-bottom:7px">${label}</span>
    <input id="${id}" type="number" min="0" step="0.01" value="${Number(value||0)}"
      style="width:100%;box-sizing:border-box;height:43px;border:1px solid #2a4350;border-radius:8px;background:#06131b;color:#fff;padding:0 12px;font-size:14px">
    <small style="display:block;color:#718590;margin-top:6px">${help}</small>
  </label>`;
}

function renderPricingExactModelPrevious(){
  const section=$('#precificacao');
  if(!section)return;

  ensurePricingExactModelStyles();
  loadPricingTargets();
  state.pricingSimulations ||= {};
  section.classList.add('pricing-exact');

  let side=section.querySelector('.pricing-side');
  if(!side){
    side=document.createElement('aside');
    side.className='pricing-side';
    side.innerHTML=`
      <div class="pricing-side-title">MÓDULO</div>
      <div class="pricing-side-nav">
        <button data-side-tab="dashboard">⌂ Dashboard</button>
        <button data-side-tab="licitacoes">▣ Licitações</button>
        <button data-side-tab="cotacoes">⇄ Cotações</button>
        <button data-side-tab="precificacao" class="active">◉ Precificação</button>
        <button data-side-tab="fornecedores">♙ Fornecedores</button>
        <button data-side-tab="arquivos">▤ Relatórios</button>
      </div>
    `;
    section.insertBefore(side,section.firstChild);
    side.querySelectorAll('[data-side-tab]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelector(`#mainTabs [data-tab="${btn.dataset.sideTab}"]`)?.click();
      });
    });
  }

  [...section.children].forEach(child=>{
    if(child===side || child.id==='pricingExactShell')return;
    child.style.display='none';
  });

  let shell=$('#pricingExactShell');
  if(!shell){
    shell=document.createElement('div');
    shell.id='pricingExactShell';
    shell.className='pricing-exact-shell';
    section.appendChild(shell);
  }

  const tenderId=state.pricingViewTenderId || state.licitacoes[0]?.id || '';
  if(!state.pricingViewTenderId && tenderId)state.pricingViewTenderId=tenderId;
  const tender=state.licitacoes.find(l=>String(l.id)===String(tenderId));
  const items=state.itens
    .filter(i=>String(i.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero));

  if(!items.some(i=>String(i.id)===String(state.pricingSimulationItemId))){
    state.pricingSimulationItemId=items[0]?.id||'';
  }

  const computed=items.map(item=>{
    const p=pricing(item);
    return {item,p,flex:p?calcPricingByFlexibleTarget(item,p):null};
  });
  const quotedCount=items.filter(i=>itemHasQuote(i.id)).length;
  const validPricing=computed.filter(row=>row.flex?.valid);
  const margins=validPricing
    .map(row=>row.flex.marginEstimated)
    .filter(Number.isFinite);
  const avgMargin=margins.length?margins.reduce((sum,value)=>sum+value,0)/margins.length:0;
  const totalOverhead=Number(state.config?.imposto||0)+Number(state.config?.reserva_operacional||0)+Number(state.costConfig?.outros_impostos||0);

  shell.innerHTML=`
    <div class="px-head">
      <div class="px-title">
        <div class="px-title-line"><h1>Precificação</h1></div>
        <p>Entenda o limite de cada item e teste preços antes de decidir seu lance.</p>
      </div>
      <div class="px-head-actions">
        <button type="button" id="openCostSettings" class="px-action">⚙ Custos e impostos</button>
        <button class="px-export" id="pxExport" type="button">⇩ Exportar CSV</button>
      </div>
    </div>

    <div class="px-context">
      <div class="px-context-item">
        <span>Licitação</span>
        <select id="pxTenderSelect" aria-label="Licitação para precificar" style="width:100%;min-width:0;height:44px;border:1px solid #31434f;border-radius:7px;background:#07141c;color:#fff;padding:0 10px">
          ${state.licitacoes.length?state.licitacoes.map(l=>`<option value="${esc(l.id)}" ${String(l.id)===String(tenderId)?'selected':''}>${esc(l.numero)} • ${esc(l.orgao)}</option>`).join(''):'<option value="">Nenhuma licitação cadastrada</option>'}
        </select>
      </div>
      <div class="px-context-item">
        <span>Cobertura de cotações</span>
        <strong>${quotedCount} de ${items.length} itens</strong>
      </div>
      <div class="px-context-item">
        <span>Encargos configurados</span>
        <strong>${Number.isFinite(totalOverhead)?totalOverhead.toFixed(2).replace('.',','):'—'}% sobre a venda</strong>
      </div>
      <button type="button" class="px-context-action" id="pxGoQuotes">Alterar cotações</button>
    </div>

    <div class="px-kpis">
      <div class="px-kpi"><small>Itens totais</small><strong>${items.length}</strong><span>nesta licitação</span></div>
      <div class="px-kpi"><small>Com cotação</small><strong>${quotedCount}</strong><span>${items.length?((quotedCount/items.length)*100).toFixed(1).replace('.',','):'0,0'}% dos itens</span></div>
      <div class="px-kpi"><small>Sem cotação</small><strong>${items.length-quotedCount}</strong><span>precisam de custo real</span></div>
      <div class="px-kpi"><small>Calculados</small><strong>${validPricing.length}</strong><span>com dados válidos</span></div>
      <div class="px-kpi"><small>Margem média</small><strong>${Number.isFinite(avgMargin)?avgMargin.toFixed(1).replace('.',','):'0,0'}%</strong><span>no estimado do edital</span></div>
    </div>

    <div class="px-main">
      <section class="px-sim-card" aria-labelledby="pxSimTitle">
        <div class="px-sim-head">
          <div>
            <h2 id="pxSimTitle" class="px-sim-title">Simule seu preço</h2>
            <p class="px-sim-sub">Arraste a bolinha ou digite um valor. Lucro, margens e recomendação mudam na mesma hora.</p>
          </div>
          <div id="pxSessionNote" class="px-session-note">É apenas uma simulação. O valor não altera a cotação nem os dados salvos e fica somente nesta sessão.</div>
        </div>

        <div class="px-sim-controls">
          <label>
            Item para simular
            <select id="pxSimItem" aria-label="Item para simular preço">
              ${items.length?items.map(i=>`<option value="${esc(i.id)}" ${String(i.id)===String(state.pricingSimulationItemId)?'selected':''}>Item ${esc(i.numero)} • ${esc(i.descricao)}</option>`).join(''):'<option value="">Nenhum item nesta licitação</option>'}
            </select>
          </label>
          <label>
            Como definir a meta
            <select id="pxSimTargetMode" aria-label="Modo da meta de preço">
              <option value="auto">Automática</option>
              <option value="margin">Por margem</option>
              <option value="profit">Por lucro</option>
            </select>
          </label>
          <div id="pxTargetEditor" class="px-target-editor"></div>
        </div>

        <div id="pxSliderArea" class="px-slider-area">
          <div class="px-slider-top">
            <span>Preço unitário simulado</span>
            <strong id="pxSimPriceDisplay">—</strong>
          </div>
          <label>
            Digite o preço (R$)
            <input id="pxSimBid" type="number" min="0" step="0.01" inputmode="decimal" aria-describedby="pxSessionNote" aria-label="Preço unitário simulado em reais">
          </label>
          <div class="px-range-shell">
            <input id="pxSimRange" class="px-price-range" type="range" min="0" max="100" step="0.01" value="0" aria-label="Arraste para simular o preço do item" aria-valuetext="R$ 0,00">
            <div id="pxTrackMarkers" class="px-track-markers" aria-hidden="true"></div>
          </div>
          <div id="pxMarkerLegend" class="px-marker-legend"></div>
        </div>

        <div id="pxSimResult" class="px-sim-result neutral">
          <div class="px-decision"><div><strong>Selecione um item</strong><span>Os resultados aparecerão aqui.</span></div></div>
        </div>
      </section>

      <section class="px-table-card" aria-labelledby="pxItemsTitle">
        <div class="pricing-main-head" style="padding:16px 16px 0">
          <div><strong id="pxItemsTitle">Resumo dos itens</strong><div class="px-item-meta" style="margin-top:4px">Compare custos, limites e o resultado no valor estimado.</div></div>
        </div>
        <div class="px-filters">
          <input id="pxSearch" type="search" placeholder="Buscar item por número ou descrição..." aria-label="Buscar item">
          <select id="pxStatus" aria-label="Filtrar situação da precificação">
            <option value="all">Todos os itens</option>
            <option value="priced">Calculados</option>
            <option value="unquoted">Sem cotação</option>
          </select>
          <button type="button" class="px-clear" id="pxClear">Limpar filtros</button>
        </div>
        <div class="px-table-wrap">
          <table class="px-table">
            <thead><tr>
              <th>Item e quantidade</th>
              <th>Custo real</th>
              <th>Estimado</th>
              <th>Preço mínimo / meta</th>
              <th>Resultado no estimado</th>
              <th>Status</th>
              <th>Ações</th>
            </tr></thead>
            <tbody id="pxRows"></tbody>
          </table>
        </div>
        <div class="px-footer"><span id="pxCount"></span><span>Todos os itens filtrados são exibidos.</span></div>
      </section>
    </div>
  `;

  const openQuoteForItem=itemId=>{
    state.quoteViewTenderId=tenderId;
    document.querySelector('#mainTabs [data-tab="cotacoes"]')?.click();
    setTimeout(()=>{
      const itemSelect=$('#cotacaoItem');
      if(itemSelect && itemId)itemSelect.value=itemId;
      $('#cotacaoFornecedor')?.focus();
    },0);
  };

  const renderRows=()=>{
    const search=quoteNormalize(shell.querySelector('#pxSearch')?.value||'');
    const filter=shell.querySelector('#pxStatus')?.value||'all';
    const rows=items.filter(item=>{
      const p=pricing(item);
      const flex=p?calcPricingByFlexibleTarget(item,p):null;
      if(search && !quoteNormalize(`ITEM ${item.numero} ${item.descricao}`).includes(search))return false;
      if(filter==='priced' && !flex?.valid)return false;
      if(filter==='unquoted' && itemHasQuote(item.id))return false;
      return true;
    });

    shell.querySelector('#pxRows').innerHTML=rows.map(item=>{
      const p=pricing(item);
      const flex=p?calcPricingByFlexibleTarget(item,p):null;
      const quote=bestQuote(item.id);
      const supplier=quote?state.fornecedores.find(x=>String(x.id)===String(quote.fornecedor_id)):null;
      const invalid=flex && !flex.valid;

      const costCell=flex?.valid
        ? `<span class="px-price">${money(flex.costUnit)}</span><div class="px-item-meta">${esc(supplier?.nome||p?.supplierName||'Melhor cotação')}</div>`
        : quote?'<span class="px-status bad">Dados inválidos</span>':'<span class="px-status neutral">Sem cotação</span>';
      const limitCell=flex?.valid
        ? `<div class="px-price-pair"><div><small>Parada</small><strong>${money(flex.minimumUnit)}</strong></div><div><small>Meta</small><strong>${money(flex.priceTargetUnit)}</strong></div></div>`
        : '—';
      const resultCell=flex?.valid && flex.profitEstimated!=null
        ? `<span class="${flex.profitEstimated>=0?'px-profit':''}" style="${flex.profitEstimated<0?'color:#ff7771;font-weight:850':''}">${money(flex.profitEstimated)}</span><div class="px-item-meta">${flex.marginEstimated.toFixed(2).replace('.',',')}% sobre a venda</div>`
        : '<span class="px-item-meta">Sem valor estimado calculável</span>';
      const statusCell=invalid
        ? `<span class="px-status bad">Revisar dados</span><div class="px-item-meta" style="margin-top:5px">${esc(flex.validationErrors[0])}</div>`
        : flex?`${pricingProfitBadge(flex)}<div class="px-item-meta" style="margin-top:5px">${esc(flex.statusReason)}</div>`:'<span class="px-status neutral">Sem cotação</span>';

      return `<tr>
        <td data-label="Item">
          <div style="display:flex;gap:9px;align-items:flex-start"><span class="px-itemnum">${esc(item.numero)}</span><div><div class="px-item-title">${esc(item.descricao)}</div><div class="px-item-meta">Qtd. ${esc(item.quantidade||'—')} ${esc(item.unidade||'')}</div></div></div>
        </td>
        <td data-label="Custo real">${costCell}</td>
        <td data-label="Estimado">${Number(item.valor_estimado)>0?money(item.valor_estimado):'—'}</td>
        <td data-label="Mínimo / meta">${limitCell}</td>
        <td data-label="Resultado">${resultCell}</td>
        <td data-label="Status">${statusCell}</td>
        <td data-label="Ações"><div class="px-actions"><button type="button" class="px-action primary" data-px-sim-item="${esc(item.id)}">Simular preço</button><button type="button" class="px-action" data-px-quote-item="${esc(item.id)}">${p?'Ver cotações':'Importar PDF'}</button></div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" data-label="Resultado"><span class="px-item-meta">Nenhum item corresponde aos filtros.</span></td></tr>';

    shell.querySelectorAll('[data-px-sim-item]').forEach(btn=>btn.addEventListener('click',()=>{
      selectSimulatorItem(btn.dataset.pxSimItem,true);
    }));
    shell.querySelectorAll('[data-px-quote-item]').forEach(btn=>btn.addEventListener('click',()=>openQuoteForItem(btn.dataset.pxQuoteItem)));
    shell.querySelector('#pxCount').textContent=`Mostrando ${rows.length} de ${items.length} itens`;
  };

  const markerDataFor=(flex,max)=>[
    {label:'Equilíbrio',value:flex.breakEvenUnit,color:'#b74845'},
    {label:'Preço de parada',value:flex.minimumUnit,color:'#d88f2d'},
    {label:'Preço-meta',value:flex.priceTargetUnit,color:'#3185bd'},
    ...(flex.estimated>0?[{label:'Estimado',value:flex.estimated,color:'#2aa766'}]:[])
  ].map(marker=>({...marker,pos:Math.min(100,Math.max(0,(marker.value/max)*100))}));

  const showSimulationMessage=(title,message,kind='neutral',ctaItemId='')=>{
    const result=shell.querySelector('#pxSimResult');
    result.className=`px-sim-result ${kind}`;
    result.innerHTML=`<div class="px-decision"><div><strong>${esc(title)}</strong><span>${esc(message)}</span><span class="px-live-only" role="status" aria-live="polite" aria-atomic="true">${esc(title)}. ${esc(message)}</span>${ctaItemId?'<br><button type="button" class="px-action primary" id="pxSimQuoteCta">Importar PDF da cotação</button>':''}</div></div>`;
    if(ctaItemId)result.querySelector('#pxSimQuoteCta')?.addEventListener('click',()=>openQuoteForItem(ctaItemId));
  };

  const updateSimulationResult=()=>{
    const item=items.find(i=>String(i.id)===String(shell.querySelector('#pxSimItem')?.value));
    const p=item?pricing(item):null;
    const flex=item&&p?calcPricingByFlexibleTarget(item,p):null;
    const slider=shell.querySelector('#pxSimRange');
    const input=shell.querySelector('#pxSimBid');
    const sliderArea=shell.querySelector('#pxSliderArea');

    if(!item){
      sliderArea.hidden=true;
      showSimulationMessage('Nenhum item disponível','Cadastre itens na licitação para iniciar a simulação.');
      return;
    }
    if(!p){
      sliderArea.hidden=true;
      slider.disabled=true;
      showSimulationMessage('Cotação necessária','Adicione uma cotação válida para calcular custos, limites e margens deste item.','neutral',item.id);
      return;
    }
    if(!flex?.valid){
      sliderArea.hidden=true;
      slider.disabled=true;
      showSimulationMessage('Revise os dados',flex?.validationErrors?.join(' ')||'Não foi possível calcular este item.','bad');
      return;
    }

    sliderArea.hidden=false;
    slider.disabled=false;
    const raw=input.value;
    if(raw===''){
      shell.querySelector('#pxSimPriceDisplay').textContent='—';
      showSimulationMessage('Informe um preço','Digite um valor ou mova a bolinha para simular.');
      return;
    }
    const parsedBid=Number(raw);
    const bid=normalizePricingBid(parsedBid);
    if(bid==null || bid<0){
      shell.querySelector('#pxSimPriceDisplay').textContent='Valor inválido';
      showSimulationMessage('Preço inválido','Use um número maior ou igual a zero.','bad');
      return;
    }

    if(bid>Number(slider.max))slider.max=String(ceilPricingMoney(Math.max(bid*1.2,bid+1)));
    slider.value=String(Math.min(bid,Number(slider.max)));
    slider.setAttribute('aria-valuetext',money(bid));
    state.pricingSimulations[String(item.id)]=bid;
    shell.querySelector('#pxSimPriceDisplay').textContent=money(bid);

    const max=Math.max(Number(slider.max),0.01);
    const markers=markerDataFor(flex,max);
    const pos=value=>`${Math.min(100,Math.max(0,(Number(value||0)/max)*100)).toFixed(2)}%`;
    slider.style.setProperty('--break-pos',pos(flex.breakEvenUnit));
    slider.style.setProperty('--stop-pos',pos(Math.max(flex.breakEvenUnit,flex.minimumUnit)));
    slider.style.setProperty('--target-pos',pos(Math.max(flex.breakEvenUnit,flex.minimumUnit,flex.priceTargetUnit)));
    shell.querySelector('#pxTrackMarkers').innerHTML=markers.map(marker=>`<span class="px-track-marker" style="--marker-pos:${marker.pos.toFixed(2)}%"></span>`).join('');
    shell.querySelector('#pxMarkerLegend').innerHTML=markers.map(marker=>`<span class="px-marker-label" style="--marker-color:${marker.color}"><i></i><span><b>${esc(marker.label)}</b><small>${money(marker.value)}</small></span></span>`).join('');

    const qty=Number(item.quantidade);
    const profitUnit=bid*(1-flex.overhead)-flex.costUnit;
    const profit=profitUnit*qty;
    const total=bid*qty;
    const marginSale=bid>0?(profitUnit/bid)*100:null;
    const marginCost=flex.costUnit>0?(profitUnit/flex.costUnit)*100:null;
    const slack=bid-flex.minimumUnit;

    let status='Meta atingida';
    let recommendation='O preço atende ao limite mínimo e à meta definida para o item.';
    let kind='good';
    if(bid<flex.breakEvenUnit){
      status='Prejuízo';
      recommendation='Não recomendado: o preço não cobre custos e encargos.';
      kind='bad';
    }else if(bid<flex.minimumUnit){
      status='Abaixo do preço de parada';
      recommendation='O preço cobre o custo, mas não atende aos limites mínimos configurados.';
      kind='bad';
    }else if(bid<flex.priceTargetUnit){
      status='Viável com cautela';
      recommendation='O preço está acima da parada, porém ainda abaixo da sua meta.';
      kind='warn';
    }

    const result=shell.querySelector('#pxSimResult');
    result.className=`px-sim-result ${kind}`;
    result.innerHTML=`
      <div class="px-decision"><div><strong>${esc(status)}</strong><span>${esc(recommendation)}</span><span class="px-live-only" role="status" aria-live="polite" aria-atomic="true">${esc(status)}. Preço simulado ${money(bid)}. ${esc(recommendation)}</span></div><span>${money(bid)} por unidade</span></div>
      <div class="px-result-grid">
        <div class="px-result-stat"><span>Preço unitário</span><strong>${money(bid)}</strong><small>valor simulado</small></div>
        <div class="px-result-stat"><span>Preço total</span><strong>${money(total)}</strong><small>${qty} ${esc(item.unidade||'un.')}</small></div>
        <div class="px-result-stat"><span>Lucro após custos e encargos</span><strong style="color:${profit<0?'#ff8580':'#55dd8d'}">${money(profit)}</strong><small>resultado total</small></div>
        <div class="px-result-stat"><span>Margem sobre venda</span><strong>${marginSale==null?'—':marginSale.toFixed(2).replace('.',',')+'%'}</strong><small>${bid===0?'indisponível com preço zero':'sobre a receita'}</small></div>
        <div class="px-result-stat"><span>Margem sobre custo</span><strong>${marginCost==null?'—':marginCost.toFixed(2).replace('.',',')+'%'}</strong><small>retorno sobre o custo</small></div>
        <div class="px-result-stat"><span>Folga até a parada</span><strong style="color:${slack<0?'#ff8580':'#55dd8d'}">${money(slack)}</strong><small>${slack<0?'abaixo do limite':'quanto ainda pode baixar'}</small></div>
      </div>`;
  };

  const refreshSimulatorBounds=()=>{
    const item=items.find(i=>String(i.id)===String(shell.querySelector('#pxSimItem')?.value));
    const p=item?pricing(item):null;
    const flex=item&&p?calcPricingByFlexibleTarget(item,p):null;
    const slider=shell.querySelector('#pxSimRange');
    const input=shell.querySelector('#pxSimBid');
    if(!item || !flex?.valid){
      updateSimulationResult();
      return;
    }
    const current=input.value===''?0:Number(input.value);
    slider.max=String(ceilPricingMoney(Math.max(1,flex.estimated||0,flex.priceTargetUnit||0,flex.minimumUnit||0,flex.breakEvenUnit||0,current||0)*1.25));
    updateSimulationResult();
  };

  const renderTargetEditor=()=>{
    const item=items.find(i=>String(i.id)===String(shell.querySelector('#pxSimItem')?.value));
    const target=item?getPricingTarget(item.id):null;
    const mode=target?.mode||'auto';
    const modeSelect=shell.querySelector('#pxSimTargetMode');
    if(modeSelect)modeSelect.value=mode;
    const editor=shell.querySelector('#pxTargetEditor');
    if(!editor)return;
    if(!item || mode==='auto'){
      editor.innerHTML='<div class="px-target-auto">A meta automática usa o maior valor entre a margem desejada e o lucro mínimo.</div>';
      return;
    }
    const isMargin=mode==='margin';
    const value=isMargin?target.margin:target.profit;
    editor.innerHTML=`<label>${isMargin?'Margem desejada (%)':'Lucro desejado no item (R$)'}<input id="pxSimTargetValue" type="number" min="0" step="${isMargin?'0.1':'0.01'}" inputmode="decimal" value="${value??''}" placeholder="${isMargin?Number(state.config?.margem_alvo??25):Number(state.config?.lucro_minimo??500)}" aria-label="${isMargin?'Margem desejada para o item':'Lucro desejado para o item'}"></label>`;
    const valueInput=editor.querySelector('#pxSimTargetValue');
    valueInput?.addEventListener('input',()=>{
      const raw=valueInput.value;
      target[isMargin?'margin':'profit']=raw===''?null:Number(raw);
      if(raw==='' || (Number.isFinite(Number(raw)) && Number(raw)>=0))persistPricingTargets();
      renderRows();
      refreshSimulatorBounds();
    });
  };

  const selectSimulatorItem=(itemId,focusSlider=false)=>{
    const item=items.find(i=>String(i.id)===String(itemId));
    if(!item)return;
    const select=shell.querySelector('#pxSimItem');
    select.value=String(item.id);
    state.pricingSimulationItemId=item.id;
    renderTargetEditor();

    const p=pricing(item);
    const flex=p?calcPricingByFlexibleTarget(item,p):null;
    const hasSaved=Object.prototype.hasOwnProperty.call(state.pricingSimulations,String(item.id));
    const initial=hasSaved
      ? Number(state.pricingSimulations[String(item.id)])
      : flex?.valid
        ? (flex.estimated>0?flex.estimated:(flex.priceTargetUnit??flex.minimumUnit??0))
        : 0;
    shell.querySelector('#pxSimBid').value=Number.isFinite(initial)?String(Math.max(0,initial)):'';
    refreshSimulatorBounds();
    if(focusSlider){
      shell.querySelector('.px-sim-card')?.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>shell.querySelector('#pxSimRange')?.focus(),250);
    }
  };

  shell.querySelector('#openCostSettings')?.addEventListener('click',()=>renderCostSettings());
  shell.querySelector('#pxTenderSelect')?.addEventListener('change',event=>{
    state.pricingViewTenderId=event.target.value||'';
    state.pricingSimulationItemId='';
    renderPricingExactModel();
  });
  shell.querySelector('#pxGoQuotes')?.addEventListener('click',()=>openQuoteForItem(''));
  shell.querySelector('#pxSearch')?.addEventListener('input',renderRows);
  shell.querySelector('#pxStatus')?.addEventListener('change',renderRows);
  shell.querySelector('#pxClear')?.addEventListener('click',()=>{
    shell.querySelector('#pxSearch').value='';
    shell.querySelector('#pxStatus').value='all';
    renderRows();
  });
  shell.querySelector('#pxSimItem')?.addEventListener('change',event=>selectSimulatorItem(event.target.value));
  shell.querySelector('#pxSimTargetMode')?.addEventListener('change',event=>{
    const item=items.find(i=>String(i.id)===String(shell.querySelector('#pxSimItem')?.value));
    if(!item)return;
    getPricingTarget(item.id).mode=event.target.value;
    persistPricingTargets();
    renderTargetEditor();
    renderRows();
    refreshSimulatorBounds();
  });
  shell.querySelector('#pxSimBid')?.addEventListener('input',updateSimulationResult);
  shell.querySelector('#pxSimBid')?.addEventListener('change',event=>{
    const normalized=normalizePricingBid(event.target.value);
    if(normalized!=null && normalized>=0)event.target.value=normalized.toFixed(2);
    updateSimulationResult();
  });
  shell.querySelector('#pxSimRange')?.addEventListener('input',event=>{
    const value=Number(event.target.value);
    shell.querySelector('#pxSimBid').value=String(value);
    updateSimulationResult();
  });
  shell.querySelector('#pxExport')?.addEventListener('click',()=>{
    const header=['Item','Descrição','Quantidade','Unidade','Fornecedor','Custo real unitário','Estimado unitário','Preço de parada','Preço-meta','Lucro no estimado','Margem no estimado','Status'];
    const csvRows=items.map(item=>{
      const p=pricing(item);
      const flex=p?calcPricingByFlexibleTarget(item,p):null;
      const quote=bestQuote(item.id);
      const supplier=quote?state.fornecedores.find(x=>String(x.id)===String(quote.fornecedor_id)):null;
      return [item.numero,item.descricao,item.quantidade,item.unidade,supplier?.nome||p?.supplierName||'',flex?.valid?flex.costUnit:'',item.valor_estimado||'',flex?.valid?flex.minimumUnit:'',flex?.valid?flex.priceTargetUnit:'',flex?.valid?flex.profitEstimated??'':'',flex?.valid?flex.marginEstimated??'':'',flex?.valid?flex.status:(flex?'Dados inválidos':'Sem cotação')];
    });
    const csv=[header,...csvRows].map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(';')).join('\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download=`precificacao-${String(tender?.numero||'edital').replace(/[^a-z0-9_-]+/gi,'_')}.csv`;
    anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });

  renderRows();
  if(items.length)selectSimulatorItem(state.pricingSimulationItemId||items[0].id);
  else updateSimulationResult();
}

function renderPricingExactModelLegacy(){
  const section=$('#precificacao');
  if(!section)return;

  ensurePricingExactModelStyles();
  loadPricingTargets();
  section.classList.add('pricing-exact');

  let side=section.querySelector('.pricing-side');
  if(!side){
    side=document.createElement('aside');
    side.className='pricing-side';
    side.innerHTML=`
      <div class="pricing-side-title">MÓDULO</div>
      <div class="pricing-side-nav">
        <button data-side-tab="dashboard">⌂ Dashboard</button>
        <button data-side-tab="licitacoes">▣ Licitações</button>
        <button data-side-tab="cotacoes">⇄ Cotações</button>
        <button data-side-tab="precificacao" class="active">◉ Precificação</button>
        <button data-side-tab="fornecedores">♙ Fornecedores</button>
        <button data-side-tab="arquivos">▤ Relatórios</button>
      </div>
    `;
    section.insertBefore(side,section.firstChild);

    side.querySelectorAll('[data-side-tab]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const tab=btn.dataset.sideTab;
        document.querySelector(`#mainTabs [data-tab="${tab}"]`)?.click();
      });
    });
  }

  // Hide legacy pricing panels but preserve them for form/event functionality.
  [...section.children].forEach(child=>{
    if(child===side || child.id==='pricingExactShell')return;
    child.style.display='none';
  });

  let shell=$('#pricingExactShell');
  if(!shell){
    shell=document.createElement('div');
    shell.id='pricingExactShell';
    shell.className='pricing-exact-shell';
    section.appendChild(shell);
  }

  const tenderId=state.pricingViewTenderId || state.licitacoes[0]?.id || '';
  if(!state.pricingViewTenderId && tenderId)state.pricingViewTenderId=tenderId;

  const tender=state.licitacoes.find(l=>String(l.id)===String(tenderId));
  const items=state.itens
    .filter(i=>String(i.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero));

  const cotados=items.filter(i=>itemHasQuote(i.id)).length;
  const semCotacao=items.length-cotados;
  const priced=items.map(i=>pricing(i)).filter(Boolean);
  const pricedCount=priced.length;
  const avgMargin=priced.length
    ? priced.reduce((s,p)=>s+Number(p.margin||0),0)/priced.length
    : 0;

  const firstQuote=state.cotacoes.find(q=>items.some(i=>String(i.id)===String(q.item_id)));
  const supplier=firstQuote
    ? state.fornecedores.find(f=>String(f.id)===String(firstQuote.fornecedor_id))
    : null;

  shell.innerHTML=`
    <div class="px-head">
      <div class="px-title">
        <h1>Precificação</h1><button type="button" id="openCostSettings" class="px-action" style="margin-left:14px">⚙ Custos & Impostos</button>
        <p>Defina preços, calcule lucro e simule lances.</p>
      </div>
      <button class="px-export" id="pxExport" type="button">⇩ Exportar planilha</button>
    </div>

    <div class="px-context">
      <div class="px-context-item">
        <span>Licitação</span>
        <select id="pxTenderSelect" aria-label="Licitação para precificar" style="min-width:280px;max-width:100%;height:38px;border:1px solid #31434f;border-radius:7px;background:#07141c;color:#fff;padding:0 10px">
          ${state.licitacoes.length?state.licitacoes.map(l=>`<option value="${esc(l.id)}" ${String(l.id)===String(tenderId)?'selected':''}>${esc(l.numero)} • ${esc(l.orgao)}</option>`).join(''):'<option value="">Nenhuma licitação cadastrada</option>'}
        </select>
      </div>
      <div class="px-context-item">
        <span>Fornecedor</span>
        <strong>${esc(supplier?.nome||'—')}</strong>
      </div>
      <div class="px-context-item">
        <span>Arquivo da cotação</span>
        <strong>${firstQuote?'Cotação cadastrada no sistema':'Nenhuma cotação salva'}</strong>
      </div>
      <button type="button" class="px-context-action" id="pxGoQuotes">Alterar cotação</button>
    </div>

    <div class="px-kpis">
      <div class="px-kpi">
        <small>Itens totais</small>
        <strong>${items.length}</strong>
        <span>100% do edital</span>
      </div>
      <div class="px-kpi">
        <small>Itens cotados</small>
        <strong>${cotados}</strong>
        <span>${items.length?((cotados/items.length)*100).toFixed(1):'0,0'}%</span>
      </div>
      <div class="px-kpi">
        <small>Sem precificação</small>
        <strong>${semCotacao}</strong>
        <span>${items.length?((semCotacao/items.length)*100).toFixed(1):'0,0'}%</span>
      </div>
      <div class="px-kpi">
        <small>Precificados</small>
        <strong>${pricedCount}</strong>
        <span>${items.length?((pricedCount/items.length)*100).toFixed(1):'0,0'}%</span>
      </div>
      <div class="px-kpi">
        <small>Lucro médio</small>
        <strong>${Number.isFinite(avgMargin)?avgMargin.toFixed(1).replace('.',','):'0,0'}%</strong>
        <span>margem média estimada</span>
      </div>
    </div>

    <div class="px-main">
      <div class="px-table-card">
        <div class="px-tabs">
          <div class="px-tab active">Tabela de itens</div>
          <div class="px-tab">Simulador de lance</div>
        </div>

        <div class="px-filters">
          <input id="pxSearch" type="search" placeholder="Buscar item por número ou descrição...">
          <select id="pxStatus">
            <option value="all">Todos os status</option>
            <option value="priced">Precificados</option>
            <option value="unquoted">Sem cotação</option>
          </select>
          <button type="button" class="px-clear" id="pxClear">Limpar filtros</button>
        </div>

        <div class="px-table-wrap">
          <table class="px-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Descrição do item</th>
                <th>Fornecedor</th>
                <th>Preço da cotação</th>
                <th>Frete / un.</th>
                <th>Custo real / un.<br><small>produto + frete</small></th>
                <th>Estimado do edital</th>
                <th>Imposto / un.<br><small>sobre a venda</small></th>
                <th>Lucro no estimado</th>
                <th>Margem no estimado</th>
                <th>Minha meta</th>
                <th>Preço mínimo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="pxRows"></tbody>
          </table>
        </div>

        <div class="px-footer">
          <span id="pxCount"></span>
          <span>Todos os itens filtrados são exibidos.</span>
        </div>
      </div>

      <div class="px-sim-card">
        <div class="px-sim-title">⚒ Simulador de lance</div>
        <div class="px-sim-sub">
          Simule um lance e veja imediatamente seu lucro, margem e até quanto pode baixar.
        </div>

        <label>
          Item
          <select id="pxSimItem">
            ${items.map(i=>`<option value="${i.id}">${esc(i.numero)} • ${esc(i.descricao)}</option>`).join('')}
          </select>
        </label>

        <label>
          Preço de venda atual (sugerido)
          <span id="pxSuggested" class="px-suggested">—</span>
        </label>

        <label>
          Seu lance pretendido (R$)
          <input id="pxSimBid" type="number" step="0.0001" min="0" placeholder="0,00">
        </label>

        <div id="pxSimResult" class="px-sim-result">
          <h4>Resultado da simulação</h4>
          <div class="px-sim-row"><span>Lucro bruto</span><strong>—</strong></div>
          <div class="px-sim-row"><span>Margem sobre venda</span><strong>—</strong></div>
          <div class="px-sim-row"><span>Margem sobre custo</span><strong>—</strong></div>
          <div class="px-sim-row"><span>Posição sugerida</span><strong>—</strong></div>
        </div>

        <div class="px-tip">
          O cálculo considera impostos e custos conforme sua configuração de precificação.
        </div>

        <button type="button" class="px-sim-button" id="pxSimButton">Simular lance</button>
      </div>
    </div>
  `;

  shell.querySelector('#openCostSettings')?.addEventListener('click',()=>renderCostSettings());
  shell.querySelector('#pxTenderSelect')?.addEventListener('change',event=>{
    state.pricingViewTenderId=event.target.value||'';
    renderPricingExactModel();
  });

  const renderRows=()=>{
    const q=quoteNormalize(shell.querySelector('#pxSearch')?.value||'');
    const st=shell.querySelector('#pxStatus')?.value||'all';

    const rows=items.filter(i=>{
      const p=pricing(i);
      if(q && !quoteNormalize(`ITEM ${i.numero} ${i.descricao}`).includes(q))return false;
      if(st==='priced' && !p)return false;
      if(st==='unquoted' && itemHasQuote(i.id))return false;
      return true;
    });

    shell.querySelector('#pxRows').innerHTML=rows.map(i=>{
      const p=pricing(i);
      const q=bestQuote(i.id);
      const f=q?state.fornecedores.find(x=>String(x.id)===String(q.fornecedor_id)):null;
      const status=p?.status || 'Sem cotação';
      const cls=pricingStatusClass(status);

      const flex=p?calcPricingByFlexibleTarget(i,p):null;
      const target=flex?.target;
      const mode=target?.mode||'auto';

      return `
        <tr>
          <td><span class="px-itemnum">${esc(i.numero)}</span></td>

          <td>
            <div class="px-item-title">${esc(i.descricao)}</div>
            <div class="px-item-meta">
              Qtd. ${esc(i.quantidade||'-')} ${esc(i.unidade||'')}
            </div>
          </td>

          <td>${esc(f?.nome||'—')}</td>

          <td>
            ${
              q
                ? `<span class="px-price">${money(
                    q.preco!=null
                      ? Number(q.preco)/Math.max(Number(q.fator_equivalencia||1),0.0001)
                      : Number(p?.productCostUnit||q.custoProduto||q.custoEq||0)
                  )}</span>
                   <div class="px-item-meta">valor do fornecedor por unidade equivalente</div>`
                : '<span class="px-status neutral">Sem cotação</span>'
            }
          </td>

          <td>
            ${p?money(Number(p.freightUnit||0)):'—'}
          </td>

          <td>
            ${
              flex
                ? `<span class="px-price">${money(flex.costUnit)}</span>
                   <div class="px-item-meta">produto + fretes + gasolina rateada</div>`
                : '—'
            }
          </td>

          <td>${i.valor_estimado?money(i.valor_estimado):'—'}</td>

          <td>
            ${
              flex?.estimated
                ? `<span>${money(flex.taxUnitEstimated||0)}</span>
                   <div class="px-item-meta">${(Number(state.config?.imposto||0)).toFixed(2).replace('.',',')}% do preço de venda</div>`
                : '—'
            }
          </td>

          <td>
            ${
              flex?.profitEstimated!=null
                ? `<span class="${flex.profitEstimated>=0?'px-profit':''}" style="${flex.profitEstimated<0?'color:#ff6b66;font-weight:850':''}">
                     ${money(flex.profitEstimated)}
                   </span>`
                : '—'
            }
          </td>

          <td>
            ${
              flex?.marginEstimated!=null
                ? `<div class="px-margin-current">
                     <strong>${flex.marginEstimated.toFixed(2).replace('.',',')}%</strong>
                     <small>sobre venda</small>
                     <small>${flex.profitOnCostEstimated?.toFixed(2).replace('.',',')||'0,00'}% sobre custo</small>
                   </div>`
                : '—'
            }
          </td>

          <td>
            ${
              p
                ? `<div class="px-target-box">
                     <select data-px-target-mode="${i.id}">
                       <option value="auto" ${mode==='auto'?'selected':''}>Automático</option>
                       <option value="margin" ${mode==='margin'?'selected':''}>Margem %</option>
                       <option value="profit" ${mode==='profit'?'selected':''}>Lucro R$</option>
                     </select>

                     ${
                       mode==='margin'
                         ? `<input
                              data-px-target-margin="${i.id}"
                              type="number"
                              min="0"
                              max="90"
                              step="0.1"
                              value="${target?.margin??''}"
                              placeholder="${Number(state.config?.margem_alvo||25)}%"
                            >`
                         : mode==='profit'
                           ? `<input
                                data-px-target-profit="${i.id}"
                                type="number"
                                min="0"
                                step="0.01"
                                value="${target?.profit??''}"
                                placeholder="${money(Number(state.config?.lucro_minimo||500)).replace('R$ ','')}"
                              >`
                           : `<div class="px-help" style="white-space:normal">
                                Avalia lucro em R$ + margem %. Ex.: R$ 2.000 com 5% pode ser classificado como <b>Bom</b>.
                              </div>`
                     }
                   </div>`
                : '—'
            }
          </td>

          <td>
            ${
              flex
                ? `<span class="px-sale">${money(flex.minimumUnit||0)}</span>
                   <div class="px-item-meta">
                     ${
                       mode==='auto'
                         ? 'ponto de equilíbrio'
                         : mode==='margin'
                           ? `para ${flex.desiredMargin.toFixed(1).replace('.',',')}%`
                           : `para ${money(flex.desiredProfit)} de lucro`
                     }
                   </div>`
                : '—'
            }
          </td>

          <td>
            ${flex?pricingProfitBadge(flex):'<span class="px-status neutral">Sem cotação</span>'}
            ${flex?`<div class="px-item-meta" style="margin-top:5px;max-width:170px">${esc(flex.statusReason)}</div>`:''}
          </td>

          <td><button type="button" class="px-action" data-px-quote-item="${esc(i.id)}">${p?'Ver cotações':'Importar PDF'}</button></td>
        </tr>
      `;
    }).join('');

    shell.querySelectorAll('[data-px-target-mode]').forEach(el=>{
      el.addEventListener('change',()=>{
        const t=getPricingTarget(el.dataset.pxTargetMode);
        t.mode=el.value;
        persistPricingTargets();
        renderRows();
        updateSim();
      });
    });

    shell.querySelectorAll('[data-px-target-margin]').forEach(el=>{
      const saveMargin=()=>{
        const t=getPricingTarget(el.dataset.pxTargetMargin);
        let v=el.value===''?null:Number(el.value);
        if(v!=null && Number.isFinite(v)){
          v=Math.max(0,Math.min(90,v));
        }
        t.margin=v;
        persistPricingTargets();
        renderRows();
        updateSim();
      };
      el.addEventListener('change',saveMargin);
    });

    shell.querySelectorAll('[data-px-target-profit]').forEach(el=>{
      const saveProfit=()=>{
        const t=getPricingTarget(el.dataset.pxTargetProfit);
        let v=el.value===''?null:Number(el.value);
        if(v!=null && Number.isFinite(v))v=Math.max(0,v);
        t.profit=v;
        persistPricingTargets();
        renderRows();
        updateSim();
      };
      el.addEventListener('change',saveProfit);
    });

    shell.querySelectorAll('[data-px-quote-item]').forEach(btn=>btn.addEventListener('click',()=>{
      state.quoteViewTenderId=tenderId;
      document.querySelector('#mainTabs [data-tab="cotacoes"]')?.click();
      setTimeout(()=>{
        const itemSelect=$('#cotacaoItem');
        if(itemSelect)itemSelect.value=btn.dataset.pxQuoteItem;
        $('#cotacaoFornecedor')?.focus();
      },0);
    }));

    shell.querySelector('#pxCount').textContent=`Mostrando ${rows.length} de ${items.length} itens`;
  };

  const updateSim=()=>{
    const itemId=shell.querySelector('#pxSimItem')?.value;
    const bid=Number(shell.querySelector('#pxSimBid')?.value||0);
    const item=items.find(i=>String(i.id)===String(itemId));
    const p=item?pricing(item):null;

    const flex=item&&p?calcPricingByFlexibleTarget(item,p):null;
    shell.querySelector('#pxSuggested').textContent=flex?.minimumUnit?money(flex.minimumUnit):'—';

    const box=shell.querySelector('#pxSimResult');
    if(!item || !p || !p.costUnit){
      box.innerHTML=`
        <h4>Resultado da simulação</h4>
        <div class="px-sim-row"><span>Status</span><strong>Sem cotação salva</strong></div>
      `;
      return;
    }

    if(!bid){
      box.innerHTML=`
        <h4>Resultado atual</h4>
        <div class="px-sim-row"><span>Status</span><strong>${esc(flex?.status||'—')}</strong></div>
        <div class="px-sim-row"><span>Custo produto + frete</span><strong>${p?money(p.costUnit):'—'}</strong></div>
        <div class="px-sim-row"><span>Imposto por un. no estimado</span><strong>${flex?.estimated?money(flex.taxUnitEstimated||0):'—'}</strong></div>
        <div class="px-sim-row"><span>Receita líquida por un.</span><strong>${flex?.estimated?money(flex.netRevenueUnitEstimated||0):'—'}</strong></div>
        <div class="px-sim-row"><span>Lucro no estimado</span><strong>${flex?.profitEstimated!=null?money(flex.profitEstimated):'—'}</strong></div>
        <div class="px-sim-row"><span>Margem no estimado</span><strong>${flex?.marginEstimated!=null?flex.marginEstimated.toFixed(2).replace('.',',')+'%':'—'}</strong></div>
        <div class="px-sim-row"><span>Preço mínimo</span><strong>${flex?.minimumUnit?money(flex.minimumUnit):'—'}</strong></div>
      `;
      return;
    }

    const qty=Math.max(Number(item.quantidade||1),1);
    const overhead=(Number(state.config?.imposto||0)+Number(state.config?.reserva_operacional||0)+Number(state.costConfig?.outros_impostos||0))/100;
    const profitUnit=bid*(1-overhead)-Number(flex?.costUnit||p.costUnit||0);
    const profit=profitUnit*qty;
    const marginSale=bid?profitUnit/bid*100:0;
    const marginCost=flex?.costUnit?profitUnit/flex.costUnit*100:0;
    const targetReference=flex?.mode==='profit'?flex.priceByProfit:flex?.priceByMargin;
    const position=bid>=Number(targetReference||0)?'Meta atingida':bid>=Number(flex?.minimumUnit||0)?'Atenção':'Abaixo do mínimo';

    box.innerHTML=`
      <h4>Resultado da simulação</h4>
      <div class="px-sim-row"><span>Lucro bruto</span><strong>${money(profit)}</strong></div>
      <div class="px-sim-row"><span>Margem sobre venda</span><strong>${marginSale.toFixed(2).replace('.',',')}%</strong></div>
      <div class="px-sim-row"><span>Margem sobre custo</span><strong>${marginCost.toFixed(2).replace('.',',')}%</strong></div>
      <div class="px-sim-row"><span>Posição sugerida</span><strong>${position}</strong></div>
    `;
  };

  shell.querySelector('#pxSearch')?.addEventListener('input',renderRows);
  shell.querySelector('#pxStatus')?.addEventListener('change',renderRows);
  shell.querySelector('#pxClear')?.addEventListener('click',()=>{
    shell.querySelector('#pxSearch').value='';
    shell.querySelector('#pxStatus').value='all';
    renderRows();
  });
  shell.querySelector('#pxGoQuotes')?.addEventListener('click',()=>{
    document.querySelector('#mainTabs [data-tab="cotacoes"]')?.click();
  });
  shell.querySelector('#pxExport')?.addEventListener('click',()=>{
    const header=['Item','Descrição','Quantidade','Unidade','Fornecedor','Custo real unitário','Estimado unitário','Lucro estimado','Margem estimada','Preço mínimo','Status'];
    const csvRows=items.map(i=>{
      const p=pricing(i);const flex=p?calcPricingByFlexibleTarget(i,p):null;const q=bestQuote(i.id);
      const f=q?state.fornecedores.find(x=>String(x.id)===String(q.fornecedor_id)):null;
      return [i.numero,i.descricao,i.quantidade,i.unidade,f?.nome||'',flex?.costUnit??'',i.valor_estimado||'',flex?.profitEstimated??'',flex?.marginEstimated??'',flex?.minimumUnit??'',flex?.status||'Sem cotação'];
    });
    const csv=[header,...csvRows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`precificacao-${String(tender?.numero||'edital').replace(/[^a-z0-9_-]+/gi,'_')}.csv`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  shell.querySelector('#pxSimItem')?.addEventListener('change',updateSim);
  shell.querySelector('#pxSimBid')?.addEventListener('input',updateSim);
  shell.querySelector('#pxSimButton')?.addEventListener('click',updateSim);

  renderRows();
  updateSim();
}

function pricingItemResultsStorageKey(){
  const companyId=currentCompanyId()||'local';
  const userId=state.user?.id||state.user?.email||'anonymous';
  return `inova_pricing_item_results:${companyId}:${userId}`;
}

function loadLocalPricingItemResults(){
  const key=pricingItemResultsStorageKey();
  if(state.pricingItemResultsLoadedFor===key)return;
  state.pricingItemResultsLoadedFor=key;
  try{
    const stored=JSON.parse(localStorage.getItem(key)||'{}');
    state.pricingItemResults=stored&&typeof stored==='object'?stored:{};
  }catch{
    state.pricingItemResults={};
  }
}

function persistLocalPricingItemResults(){
  try{
    localStorage.setItem(pricingItemResultsStorageKey(),JSON.stringify(state.pricingItemResults||{}));
    return true;
  }catch(error){
    console.warn('Valor ganho local:',error?.message||error);
    return false;
  }
}

function pricingResultsTableIsMissing(error){
  const code=String(error?.code||'').toUpperCase();
  const message=String(error?.message||'').toLowerCase();
  return ['PGRST204','PGRST205','42P01','42703'].includes(code)||
    message.includes('pricing_item_results')&&(message.includes('not find')||message.includes('does not exist'));
}

async function loadPricingItemResults(itemIds=[]){
  loadLocalPricingItemResults();
  if(state.demo||!configured||!supabase||!itemIds.length||state.pricingItemResultsTableAvailable===false)return;

  const ids=[...new Set(itemIds.map(id=>String(id||'').trim()).filter(Boolean))];
  const rows=[];
  const batchSize=100;

  for(let start=0;start<ids.length;start+=batchSize){
    const batch=ids.slice(start,start+batchSize);
    const {data,error}=await supabase
      .from('pricing_item_results')
      .select('tender_item_id,winning_unit_price')
      .in('tender_item_id',batch);
    if(error){
      state.pricingItemResultsTableAvailable=false;
      if(pricingResultsTableIsMissing(error)){
        console.info('pricing_item_results indisponível; usando armazenamento local.');
      }else{
        console.warn(`Resultados de precificação (lote ${Math.floor(start/batchSize)+1}):`,error.message);
      }
      return;
    }
    rows.push(...(data||[]));
  }

  state.pricingItemResultsTableAvailable=true;
  rows.forEach(row=>{
    const value=row.winning_unit_price;
    if(value!=null&&Number.isFinite(Number(value))&&Number(value)>=0){
      state.pricingItemResults[String(row.tender_item_id)]=Number(value);
    }
  });
  persistLocalPricingItemResults();
}

async function savePricingWinningUnit(itemId,value){
  loadLocalPricingItemResults();
  const key=String(itemId);
  if(value==null)delete state.pricingItemResults[key];
  else state.pricingItemResults[key]=value;
  const localSaved=persistLocalPricingItemResults();

  if(state.demo||!configured||!supabase||state.pricingItemResultsTableAvailable===false||!currentMemberIsAdmin()){
    return {server:false,local:localSaved};
  }

  const payload={
    company_id:currentCompanyId(),
    tender_item_id:itemId,
    winning_unit_price:value,
    updated_by:state.user?.id||null,
    updated_at:new Date().toISOString()
  };
  const {error}=await supabase
    .from('pricing_item_results')
    .upsert(payload,{onConflict:'tender_item_id'});
  if(error){
    state.pricingItemResultsTableAvailable=false;
    if(pricingResultsTableIsMissing(error))console.info('pricing_item_results indisponível; valor mantido neste navegador.');
    else console.warn('Salvar valor ganho:',error.message);
    return {server:false,local:localSaved,error};
  }
  state.pricingItemResultsTableAvailable=true;
  return {server:true,local:true};
}

function pricingSheetMoney(value){
  return value==null||!Number.isFinite(Number(value))
    ? '<span class="pricing-sheet-pending">Pendente</span>'
    : money(Number(value));
}

function renderPricingExactModel(){
  const section=$('#precificacao');
  const shell=$('#pricingExactShell');
  if(!section||!shell)return;

  section.querySelector('.pricing-side')?.remove();
  section.classList.remove('pricing-exact');
  shell.className='pricing-sheet-shell';
  loadLocalPricingItemResults();

  const requestedTenderId=state.pricingViewTenderId||'';
  const tenderId=state.licitacoes.some(row=>String(row.id)===String(requestedTenderId))
    ?requestedTenderId
    :state.licitacoes[0]?.id||'';
  if(tenderId&&!state.pricingViewTenderId)state.pricingViewTenderId=tenderId;
  const tender=state.licitacoes.find(row=>String(row.id)===String(tenderId));
  const items=state.itens
    .filter(item=>String(item.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero)||String(a.numero).localeCompare(String(b.numero),'pt-BR'));
  const tax=Math.max(0,Number(state.config?.imposto??6));
  const nextItemNumber=items.reduce((max,item)=>{
    const number=Number(item.numero);
    return Number.isInteger(number)&&number>max?number:max;
  },0)+1;
  const cityText=String(tender?.cidade||'').trim();
  const municipality=cityText&&!/^[A-Z]{2}$/i.test(cityText)
    ?cityText
    :[tender?.orgao,cityText].filter(Boolean).join(' • ')||'Pendente';
  const deadlineRaw=tender?.proposalEndAt||tender?.raw?.dispute_at||combineDateTime(tender?.data,tender?.horario);
  const deadline=deadlineRaw?dateBR(deadlineRaw,true):'Pendente';

  const pricingRows=items.map(item=>{
    const quantity=Number(item.quantidade)>0?Number(item.quantidade):null;
    const governmentUnit=Number(item.valor_estimado)>0?Number(item.valor_estimado):null;
    const governmentTotal=governmentUnit!=null&&quantity!=null?governmentUnit*quantity:null;
    const quote=bestQuote(item.id);
    const supplierUnit=Number(quote?.custoEq)>0?Number(quote.custoEq):null;
    const supplierTotal=supplierUnit!=null&&quantity!=null?supplierUnit*quantity:null;
    const costUnit=supplierUnit!=null?supplierUnit*(1+tax/100):null;
    const costTotal=costUnit!=null&&quantity!=null?costUnit*quantity:null;
    const supplier=quote?state.fornecedores.find(row=>String(row.id)===String(quote.fornecedor_id)):null;
    const winningRaw=state.pricingItemResults?.[String(item.id)];
    const winningUnit=winningRaw==null||!Number.isFinite(Number(winningRaw))?null:Number(winningRaw);
    const profit=winningUnit!=null&&quantity!=null&&costTotal!=null?(winningUnit*quantity)-costTotal:null;
    return {item,quantity,governmentUnit,governmentTotal,quote,supplierUnit,supplierTotal,costUnit,costTotal,supplier,winningUnit,profit};
  });

  shell.innerHTML=`
    <header class="pricing-sheet-head">
      <div>
        <h1 id="pricingPageTitle">Precificação</h1>
      </div>
      <div class="pricing-sheet-toolbar">
        <label for="pricingSheetTender">Licitação
          <select id="pricingSheetTender">
            ${state.licitacoes.length
              ?state.licitacoes.map(row=>`<option value="${esc(row.id)}" ${String(row.id)===String(tenderId)?'selected':''}>${esc(row.numero)} • ${esc(row.orgao)}</option>`).join('')
              :'<option value="">Nenhuma licitação cadastrada</option>'}
          </select>
        </label>
        <button id="pricingCostSettingsButton" type="button" title="Configurar imposto, frete e outros custos">⚙ Custos e margens</button>
        <button id="pricingAddItemButton" type="button" ${tender?'':'disabled'}>+ Adicionar novo item</button>
      </div>
    </header>

    <section class="pricing-sheet-meta" aria-label="Dados da licitação selecionada">
      <dl><div><dt>MUNICÍPIO</dt><dd>${esc(municipality)}</dd></div><div><dt>EDITAL</dt><dd>${esc(tender?.numero||'Pendente')}</dd></div><div><dt>DATA FINAL</dt><dd>${esc(deadline)}</dd></div></dl>
    </section>

    <section class="pricing-sheet-table-card" aria-labelledby="pricingItemsTitle">
      <div class="pricing-sheet-table-title"><h2 id="pricingItemsTitle">Itens do edital</h2><div class="pricing-item-controls"><span>${items.length} ${items.length===1?'item':'itens'}</span><button type="button" class="action-btn" data-refresh-pricing-items>↻ Atualizar itens</button><button type="button" class="action-btn" data-pricing-undo ${state.pricingUndoStack?.length?'':'disabled'}>↶</button><button type="button" class="action-btn" data-pricing-redo ${state.pricingRedoStack?.length?'':'disabled'}>↷</button></div></div>
      ${tender?`
        <div class="pricing-sheet-scroll" tabindex="0" aria-label="Tabela de precificação; deslize horizontalmente para ver todas as colunas">
          <table class="pricing-sheet-table">
            <thead>
              <tr class="pricing-sheet-groups">
                <th colspan="6" scope="colgroup">GOVERNO</th>
                <th colspan="3" scope="colgroup">FORNECEDOR</th>
                <th rowspan="2" scope="col">MARCA</th>
                <th colspan="2" scope="colgroup">PREÇO DE CUSTO <small>+ ${esc(tax.toFixed(2).replace('.',','))}%</small></th>
                <th rowspan="2" scope="col">PREÇO PARA 25%</th>
                <th rowspan="2" scope="col">PREÇO PARA 15%</th>
                <th rowspan="2" scope="col">PREÇO PARA 10%</th>
                <th rowspan="2" scope="col">VALOR GANHO<br><small>P. unidade</small></th>
                <th rowspan="2" scope="col">LUCRO<br><small>P. total</small></th>
              </tr>
              <tr>
                <th scope="col">Código</th><th scope="col">Descrição</th><th scope="col">Unidade</th><th scope="col">Qntd</th><th scope="col">P. unidade</th><th scope="col">P. total</th>
                <th scope="col">Nome / melhor cotação</th><th scope="col">P. unidade</th><th scope="col">P. total</th>
                <th scope="col">P. unidade</th><th scope="col">P. total</th>
              </tr>
            </thead>
            <tbody>
              ${pricingRows.length?pricingRows.map(row=>`
                <tr data-pricing-item="${esc(row.item.id)}" data-quantity="${row.quantity??''}" data-cost-total="${row.costTotal??''}">
                  <th class="pricing-sheet-code" scope="row"><button type="button" class="pricing-remove-item" data-delete-pricing-item="${esc(row.item.id)}" title="Excluir item">×</button><span>${esc(row.item.numero)}</span></th>
                  <td class="pricing-sheet-description">${esc(row.item.descricao)}</td>
                  <td>${esc(row.item.unidade||'Pendente')}</td>
                  <td>${row.quantity??'<span class="pricing-sheet-pending">Pendente</span>'}</td>
                  <td>${pricingSheetMoney(row.governmentUnit)}</td>
                  <td>${pricingSheetMoney(row.governmentTotal)}</td>
                  <td class="pricing-sheet-supplier">${row.supplierUnit!=null?`<strong>${esc(row.supplier?.nome||'Melhor cotação')}</strong><small>${esc(row.quote?.apresentacao||'Cotação confirmada')}</small>`:`<span class="pricing-sheet-pending">Pendente</span><button type="button" data-pricing-go-quotes="${esc(row.item.id)}">Ir para cotações</button>`}</td>
                  <td>${pricingSheetMoney(row.supplierUnit)}</td>
                  <td>${pricingSheetMoney(row.supplierTotal)}</td>
                  <td>${row.quote?.marca?esc(row.quote.marca):'<span class="pricing-sheet-pending">Pendente</span>'}</td>
                  <td>${pricingSheetMoney(row.costUnit)}</td>
                  <td>${pricingSheetMoney(row.costTotal)}</td>
                  <td>${pricingSheetMoney(row.costUnit==null?null:row.costUnit*1.25)}</td>
                  <td>${pricingSheetMoney(row.costUnit==null?null:row.costUnit*1.15)}</td>
                  <td>${pricingSheetMoney(row.costUnit==null?null:row.costUnit*1.10)}</td>
                  <td class="pricing-sheet-winning"><input type="number" min="0" step="0.01" inputmode="decimal" value="${row.winningUnit??''}" data-winning-input="${esc(row.item.id)}" aria-label="Valor ganho unitário do item ${esc(row.item.numero)}"><small data-winning-status></small></td>
                  <td class="pricing-sheet-profit" data-profit-output>${pricingSheetMoney(row.profit)}</td>
                </tr>`).join(''):'<tr><td colspan="17" class="pricing-sheet-empty">Esta licitação ainda não possui itens. Use “Adicionar novo item”.</td></tr>'}
            </tbody>
          </table>
        </div>`:'<div class="pricing-sheet-empty">Cadastre uma licitação para criar sua tabela de precificação automaticamente.</div>'}
    </section>

    <dialog id="pricingItemDialog" class="pricing-item-dialog" aria-labelledby="pricingItemDialogTitle">
      <form id="pricingItemForm" method="dialog">
        <div class="pricing-item-dialog-head"><div><h2 id="pricingItemDialogTitle">Adicionar novo item</h2><p>${esc(tender?.numero||'Selecione uma licitação')}</p></div><button type="button" data-close-pricing-dialog aria-label="Fechar">×</button></div>
        <div class="pricing-item-form-grid">
          <label>Número<input name="numero" type="number" min="1" step="1" required value="${nextItemNumber}"></label>
          <label>Unidade<input name="unidade" maxlength="30" required placeholder="Ex.: UN"></label>
          <label class="pricing-item-description-field">Descrição<input name="descricao" maxlength="1000" required></label>
          <label>Quantidade<input name="quantidade" type="number" min="0.0001" step="0.0001" required></label>
          <label>Preço estimado <small>(opcional)</small><input name="valor_estimado" type="number" min="0" step="0.0001"></label>
        </div>
        <div class="pricing-item-form-actions"><button type="button" class="secondary" data-close-pricing-dialog>Cancelar</button><button type="submit">Salvar item</button></div>
      </form>
    </dialog>`;

  const goToQuotes=itemId=>{
    state.quoteViewTenderId=tenderId;
    state.quoteWorkspaceSection='import';
    document.querySelector('#mainTabs [data-tab="cotacoes"]')?.click();
    setTimeout(()=>{
      const itemSelect=$('#cotacaoItem');
      if(itemSelect)itemSelect.value=itemId;
      $('#quoteImportSupplier')?.focus();
    },0);
  };

  shell.querySelector('#pricingSheetTender')?.addEventListener('change',event=>{
    state.pricingViewTenderId=event.target.value||'';
    renderPricingExactModel();
  });
  shell.querySelector('#pricingCostSettingsButton')?.addEventListener('click',()=>renderCostSettings());
  shell.querySelectorAll('[data-pricing-go-quotes]').forEach(button=>button.addEventListener('click',()=>goToQuotes(button.dataset.pricingGoQuotes)));

  const dialog=shell.querySelector('#pricingItemDialog');
  shell.querySelector('#pricingAddItemButton')?.addEventListener('click',()=>{
    if(!tender)return;
    if(typeof dialog.showModal==='function')dialog.showModal();
    else dialog.setAttribute('open','');
    dialog.querySelector('[name="descricao"]')?.focus();
  });
  shell.querySelectorAll('[data-close-pricing-dialog]').forEach(button=>button.addEventListener('click',()=>dialog.close?.()||dialog.removeAttribute('open')));
  dialog?.addEventListener('click',event=>{
    if(event.target===dialog)dialog.close?.();
  });
  shell.querySelector('#pricingItemForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!tender)return toast('Selecione uma licitação.','error');
    const values=Object.fromEntries(new FormData(event.currentTarget));
    const number=Number(values.numero);
    const description=String(values.descricao||'').trim();
    const unit=String(values.unidade||'').trim().toUpperCase();
    const quantity=Number(values.quantidade);
    const estimatedText=String(values.valor_estimado??'').trim();
    const estimated=estimatedText===''?null:Number(estimatedText);
    if(!Number.isInteger(number)||number<=0)return toast('Informe um número de item inteiro e maior que zero.','error');
    if(items.some(item=>Number(item.numero)===number))return toast(`O item ${number} já existe nesta licitação.`,'error');
    if(!description)return toast('Informe a descrição do item.','error');
    if(!unit)return toast('Informe a unidade do item.','error');
    if(!Number.isFinite(quantity)||quantity<=0)return toast('A quantidade deve ser maior que zero.','error');
    if(estimated!=null&&(!Number.isFinite(estimated)||estimated<0))return toast('O preço estimado não pode ser negativo.','error');
    const submit=event.currentTarget.querySelector('[type="submit"]');
    submit.disabled=true;submit.textContent='Salvando…';
    if(state.demo){
      state.itens.push({id:crypto.randomUUID(),licitacao_id:tenderId,numero:number,descricao:description,quantidade:quantity,unidade:unit,valor_estimado:estimated||0});
      dialog.close?.();
      renderAll();
      return toast('Item adicionado à tabela.');
    }
    const {error}=await supabase.from('tender_items').insert({
      tender_id:tenderId,item_number:number,description,quantity,unit,estimated_unit_price:estimated
    });
    if(error){submit.disabled=false;submit.textContent='Salvar item';return toast(error.message,'error');}
    dialog.close?.();
    toast('Item adicionado à tabela.');
    await refreshAll();
  });

  shell.querySelector('#pricingTaxSave')?.addEventListener('click',async event=>{
    const input=shell.querySelector('#pricingTaxInput');
    const value=Number(input?.value);
    if(!Number.isFinite(value)||value<0||value>=100)return toast('Informe um imposto entre 0% e 99,99%.','error');
    const button=event.currentTarget;button.disabled=true;button.textContent='Aplicando…';
    state.config={...(state.config||{}),imposto:value};
    if(state.demo){
      try{localStorage.setItem('inova_demo_pricing_config',JSON.stringify(state.config));}catch{}
      renderPricingExactModel();
      return toast('Imposto atualizado.');
    }
    const row={
      company_id:currentCompanyId(),tax_percent:value,
      target_margin_percent:Number(state.config.margem_alvo||0),
      minimum_profit_amount:Number(state.config.lucro_minimo||0),
      minimum_margin_percent:Number(state.config.margem_minima||0),
      operational_reserve_percent:Number(state.config.reserva_operacional||0),
      updated_at:new Date().toISOString()
    };
    const {error}=await supabase.from('pricing_settings').upsert(row,{onConflict:'company_id'});
    if(error){button.disabled=false;button.textContent='Aplicar';return toast(error.message,'error');}
    renderPricingExactModel();
    toast('Imposto atualizado.');
  });

  const updateProfit=input=>{
    const row=input.closest('[data-pricing-item]');
    const output=row?.querySelector('[data-profit-output]');
    if(!row||!output)return;
    const winning=input.value===''?null:Number(input.value);
    const quantity=Number(row.dataset.quantity);
    const costTotal=Number(row.dataset.costTotal);
    const canCalculate=winning!=null&&Number.isFinite(winning)&&winning>=0&&Number.isFinite(quantity)&&quantity>0&&row.dataset.costTotal!==''&&Number.isFinite(costTotal);
    output.innerHTML=pricingSheetMoney(canCalculate?(winning*quantity)-costTotal:null);
  };
  const persistWinning=async input=>{
    const raw=input.value.trim();
    const value=raw===''?null:Number(raw);
    if(value!=null&&(!Number.isFinite(value)||value<0))return toast('O valor ganho deve ser zero ou maior.','error');
    const signature=value==null?'':String(value);
    if(input.dataset.lastPersisted===signature)return;
    input.dataset.lastPersisted=signature;
    const status=input.parentElement.querySelector('[data-winning-status]');
    if(status)status.textContent='Salvando…';
    const result=await savePricingWinningUnit(input.dataset.winningInput,value);
    if(status)status.textContent=result.server?'Salvo para a empresa':result.local?'Salvo neste navegador':'Não foi possível salvar';
    if(!result.server&&!result.local)toast('Não foi possível salvar o valor ganho.','error');
  };
  shell.querySelectorAll('[data-winning-input]').forEach(input=>{
    input.dataset.lastPersisted=input.value;
    input.addEventListener('input',()=>updateProfit(input));
    input.addEventListener('change',()=>persistWinning(input));
    input.addEventListener('blur',()=>persistWinning(input));
  });
}

function renderPricingByTender(){
  renderPricingExactModel();
  return;

  ensurePricingModernStyles();
  ensurePricingWorkspace();
  const list=$('#precificacaoLista');
  if(!list)return;

  ensurePricingTenderViewer();

  const tenderId=state.pricingViewTenderId||'';
  const c=state.config||{};

  if(!tenderId){
    list.innerHTML=`
      <p class="hint">
        Selecione um edital acima e clique em <strong>Abrir precificação</strong>
        para visualizar somente os itens daquela licitação.
      </p>
    `;
    const sumEl=$('#pricingSummary');
    if(sumEl)sumEl.innerHTML='';
    const simItem=$('#simItem');
    if(simItem)simItem.innerHTML='<option value="">Selecione primeiro um edital</option>';
    renderBidSimulator();
    return;
  }

  const tender=state.licitacoes.find(l=>String(l.id)===String(tenderId));
  const allItems=pricingItemsForSelectedTender();
  const quotedCount=allItems.filter(i=>itemHasQuote(i.id)).length;
  const missingCount=allItems.length-quotedCount;

  const items=state.pricingOnlyMissing
    ? allItems.filter(i=>!itemHasQuote(i.id))
    : allItems;

  const info=$('#pricingTenderViewInfo');
  if(info){
    info.textContent=
      `${tender?.numero||'Edital'} • ${allItems.length} itens • `+
      `${quotedCount} com cotação • ${missingCount} sem cotação`+
      `${state.pricingOnlyMissing?' • mostrando apenas pendentes':''}`;
  }

  const precRows=items.map(i=>{
    const p=pricing(i);
    const quoteCount=quotesForItem(i.id).length;
    const action=quoteCount
      ? `<button type="button" class="action-btn danger-btn" title="Retirar as cotações salvas deste item" data-remove-item-quotes="${esc(i.id)}">Retirar cotação${quoteCount>1?' ('+quoteCount+')':''}</button>`
      : '<span class="hint">—</span>';

    if(!p){
      return [
        `Item ${esc(i.numero)} • ${esc(i.descricao)}`,
        '-',
        '-',
        '-',
        money(i.valor_estimado),
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        statusBadge('Sem cotação'),
        'Cotação necessária',
        action
      ];
    }

    const lucroMinUnit=precoLucroMinimo(i,p);
    const parada=precoParada(i,p);

    return [
      `Item ${esc(i.numero)} • ${esc(i.descricao)}`,
      esc(p.supplierName||'-'),
      money(p.costUnit),
      money(p.freightUnit||0),
      money(i.valor_estimado),
      p.targetUnit==null?'-':money(p.targetUnit),
      lucroMinUnit==null?'-':money(lucroMinUnit),
      parada==null?'-':money(parada),
      p.breakEvenUnit==null?'-':money(p.breakEvenUnit),
      p.profit==null?'-':money(p.profit),
      marginText(p.margin),
      signedMoney(p.differenceTarget),
      statusBadge(p.status),
      esc(p.recommendation||'-'),
      action
    ];
  });

  list.innerHTML=table(
    [
      'Item',
      'Melhor fornecedor',
      'Custo real un.',
      'Frete un.',
      'Estimado un.',
      `Preço-alvo ${Number(c.margem_alvo||25)}%`,
      'Preço p/ lucro mín.',
      'Preço de parada',
      'Ponto de equilíbrio',
      'Lucro no estimado',
      'Margem líquida',
      'Dif. p/ alvo',
      'Status',
      'Recomendação',
      'Ações'
    ],
    precRows
  );

  const summary={excelente:0,oportunidade:0,ruim:0,sem:0,lucro:0};
  allItems.forEach(i=>{
    const p=pricing(i);
    if(!p || p.status==='Sem cotação' || p.status==='Sem estimado')summary.sem++;
    else if(p.status==='Ruim')summary.ruim++;
    else if(p.status==='Oportunidade')summary.oportunidade++;
    else summary.excelente++;
    if(p)summary.lucro+=Math.max(0,Number(p.profit||0));
  });

  const sumEl=$('#pricingSummary');
  if(sumEl){
    sumEl.innerHTML=`
      <div class="mini-stat"><span>Excelentes</span><strong>${summary.excelente}</strong></div>
      <div class="mini-stat"><span>Oportunidades</span><strong>${summary.oportunidade}</strong></div>
      <div class="mini-stat"><span>Não participar</span><strong>${summary.ruim}</strong></div>
      <div class="mini-stat"><span>Sem cotação</span><strong>${summary.sem}</strong></div>
      <div class="mini-stat"><span>Lucro positivo no estimado</span><strong>${money(summary.lucro)}</strong></div>
    `;
  }

  const simItem=$('#simItem');
  if(simItem){
    const selected=simItem.value;
    simItem.innerHTML=
      '<option value="">Selecione o item</option>'+
      allItems.map(i=>`<option value="${i.id}">Item ${esc(i.numero)} • ${esc(i.descricao)}</option>`).join('');
    if(allItems.some(i=>String(i.id)===String(selected)))simItem.value=selected;
  }

  renderBidSimulator();
}

async function removeAllQuotesFromItem(itemId){
  const item=state.itens.find(i=>String(i.id)===String(itemId));
  if(!item)return;

  const quotesForItem=state.cotacoes.filter(q=>String(q.item_id)===String(itemId));
  if(!quotesForItem.length){
    toast('Este item não possui cotação.','error');
    return;
  }

  const message=
    quotesForItem.length===1
      ? `Retirar a cotação do Item ${item.numero} — ${item.descricao}?`
      : `Este item possui ${quotesForItem.length} cotações. Deseja retirar TODAS as cotações do Item ${item.numero} — ${item.descricao}?`;

  if(!confirm(message))return;

  if(state.demo){
    state.cotacoes=state.cotacoes.filter(q=>String(q.item_id)!==String(itemId));
    state.pricingMap=state.pricingMap.filter(p=>String(p.item_id)!==String(itemId));
    renderQuotesWorkspace();
    renderPricingByTender();
    toast('Cotação retirada.');
    return;
  }

  const ids=quotesForItem.map(q=>q.id).filter(Boolean);
  if(!ids.length)return;

  const {error}=await supabase.from('quote_items').delete().in('id',ids);
  if(error){
    toast(`Erro ao retirar cotação: ${error.message}`,'error');
    return;
  }

  toast(
    quotesForItem.length===1
      ? 'Cotação retirada do item.'
      : `${quotesForItem.length} cotações retiradas do item.`
  );

  await refreshAll();
  renderPricingByTender();
}




async function autoSyncPncpTenders(force=false){
  if(state.demo || !configured || !supabase || !state.user)return;
  if(window.__pncpAutoSyncRunning)return;
  if(window.__pncpAutoSyncDone && !force)return;

  const pncpTenders=state.licitacoes.filter(l=>l.pncp_control||pncpLinkParts(l.source_url));
  if(!pncpTenders.length)return;

  window.__pncpAutoSyncRunning=true;

  try{
    let changed=false;

    for(const l of pncpTenders){
      try{
        const {data,error}=await supabase.functions.invoke('pncp-import',{
          body:{query:l.pncp_control||l.source_url}
        });
        if(error || data?.error || data?.mode!=='detail' || !data?.tender)continue;

        const t=data.tender;
        const tenderPayload={
          dispute_at:t.dataEncerramentoProposta || t.dataAberturaProposta || l.raw?.dispute_at || null,
          publication_at:t.dataPublicacaoPncp || null,
          proposal_open_at:t.dataAberturaProposta || null,
          proposal_end_at:t.dataEncerramentoProposta || null,
          updated_at:new Date().toISOString()
        };

        const {error:updateError}=await supabase
          .from('tenders')
          .update(tenderPayload)
          .eq('id',l.id);

        if(updateError)continue;

        // Sincroniza os itens também, sem apagar vínculos/cotações já existentes.
        const incoming=Array.isArray(data.items)?data.items:[];
        const existing=state.itens.filter(i=>String(i.licitacao_id)===String(l.id));
        const byNumber=new Map(existing.map(i=>[Number(i.numero),i]));

        for(const row of incoming){
          const numero=Number(row.numeroItem||0);
          if(!numero)continue;

          const payload={
            tender_id:l.id,
            item_number:numero,
            description:String(row.descricao||'Item PNCP'),
            quantity:Number(row.quantidade||1),
            unit:String(row.unidadeMedida||'UN'),
            estimated_unit_price:row.valorUnitarioEstimado==null?null:Number(row.valorUnitarioEstimado)
          };

          const old=byNumber.get(numero);
          if(old){
            await supabase.from('tender_items').update(payload).eq('id',old.id);
          }else{
            await supabase.from('tender_items').insert(payload);
          }
        }

        changed=true;
      }catch(e){
        console.warn('Sincronização automática PNCP:',e);
      }
    }

    window.__pncpAutoSyncDone=true;

    if(changed){
      await refreshAll();
      toast('PNCP sincronizado: prazos e itens atualizados.');
    }
  }finally{
    window.__pncpAutoSyncRunning=false;
  }
}

function ensureTenderExactStyles(){
  if(document.getElementById('tenderExactStyles'))return;
  const style=document.createElement('style');
  style.id='tenderExactStyles';
  style.textContent=`
    #licitacoes.tender-exact-view{
      background:#07131a;
      border:1px solid #243541;
      border-radius:18px;
      overflow:hidden;
      padding:0!important;
      margin:0;
      color:#e8edf2;
    }
    #licitacoes.tender-exact-view > .panel{display:none}
    #licitacoes.tender-exact-view.show-new-tender > .panel.tender-manual-panel{
      display:block;
      margin:18px 22px;
      background:#0b1820;
      border:1px solid #243541;
      box-shadow:none;
    }
    #licitacoes.tender-exact-view .tender-exact-shell{
      font-family:inherit;
      background:#07131a;
      min-height:680px;
    }
    .tx-head{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:18px;
      padding:24px 24px 20px;
      border-bottom:1px solid #243541;
    }
    .tx-title h2{
      margin:0!important;
      color:#f4b727;
      font-size:1.55rem!important;
      letter-spacing:-.02em;
    }
    .tx-title p{margin:7px 0 0;color:#aab6c0;font-size:.9rem}
    .tx-primary{
      border:0;
      border-radius:8px;
      padding:11px 17px;
      background:#f0b429;
      color:#061017;
      font-weight:800;
      cursor:pointer;
      box-shadow:0 0 0 1px rgba(255,255,255,.05) inset;
    }
    .tx-primary:hover{filter:brightness(1.05)}
    .tx-stats{
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:14px;
      padding:20px 24px;
      border-bottom:1px solid #243541;
    }
    .tx-stat{
      display:flex;
      align-items:center;
      gap:14px;
      min-height:88px;
      background:linear-gradient(145deg,#0c1a23,#0d1921);
      border:1px solid #1d2d38;
      border-radius:10px;
      padding:14px 16px;
    }
    .tx-stat-icon{
      width:46px;height:46px;border-radius:50%;
      display:grid;place-items:center;
      background:#132632;
      font-size:1.4rem;
      flex:0 0 auto;
    }
    .tx-stat-icon.yellow{color:#f0b429}
    .tx-stat-icon.green{color:#45cf69}
    .tx-stat-icon.red{color:#ff514b}
    .tx-stat-icon.blue{color:#4ca8ff}
    .tx-stat small{display:block;color:#aab6c0;margin-bottom:2px}
    .tx-stat strong{display:block;color:#fff;font-size:1.25rem;line-height:1.1}
    .tx-stat span{display:block;color:#8e9ba6;font-size:.78rem;margin-top:4px}

    .tx-new-panel{
      display:none;
      margin:18px 24px 4px;
      padding:18px;
      border:1px solid #2a3d49;
      border-radius:10px;
      background:#091820;
    }
    .tx-new-panel.open{display:block}
    .tx-new-title{
      display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:15px
    }
    .tx-new-title h3{margin:0;color:#f0b429;font-size:1.05rem}
    .tx-new-title p{margin:5px 0 0;color:#98a7b1;font-size:.8rem}
    .tx-pncp-form{
      display:grid;
      grid-template-columns:minmax(300px,1fr) 120px 120px auto;
      gap:10px;align-items:end
    }
    .tx-pncp-form label{display:grid;gap:6px;color:#b6c2ca;font-size:.76rem}
    .tx-pncp-form input,.tx-pncp-form select{
      width:100%;height:42px;border:1px solid #31434f;border-radius:8px;
      background:#07141c;color:#eef3f6;padding:0 11px
    }
    .tx-pncp-form button{
      height:42px;border:0;border-radius:8px;background:#f0b429;color:#07131a;
      font-weight:850;padding:0 16px;cursor:pointer
    }
    .tx-pncp-hint{
      margin-top:10px;padding:10px 12px;border:1px solid #243541;border-radius:8px;
      color:#9eacb6;font-size:.76rem
    }
    .tx-pncp-hint strong{color:#f0b429}
    .tx-manual-toggle{
      border:1px solid #31434f;background:#08151d;color:#d8e0e5;border-radius:7px;
      padding:8px 11px;cursor:pointer
    }
    .tx-toolbar{
      display:grid;
      grid-template-columns:minmax(250px,1.4fr) 180px 275px 1fr auto;
      gap:10px;
      align-items:center;
      padding:16px 24px;
      border-bottom:1px solid #243541;
    }
    .tx-toolbar input,.tx-toolbar select{
      width:100%;height:42px;
      border-radius:8px;
      border:1px solid #31434f;
      background:#08151d;
      color:#eef3f6;
      padding:0 12px;
      outline:none;
    }
    .tx-toolbar input::placeholder{color:#71808c}
    .tx-export{
      height:42px;border-radius:8px;border:1px solid #31434f;
      background:#09161e;color:#e8edf2;padding:0 15px;font-weight:700;cursor:pointer;
    }
    .tx-list-tabs{display:flex;gap:8px;padding:0 24px 14px}
    .tx-list-tabs button{border:1px solid #31434f;border-radius:7px;background:#09161e;color:#aebbc4;padding:9px 14px;font-weight:750;cursor:pointer}
    .tx-list-tabs button.active{background:#f0b429;border-color:#f0b429;color:#07131a}
    .tx-table-wrap{padding:0 24px;overflow:auto}
    .tx-table{
      width:100%;min-width:1180px;border-collapse:separate;border-spacing:0;
      border:1px solid #243541;border-radius:9px;overflow:hidden;
    }
    .tx-table th{
      background:#08151d!important;color:#efb426!important;
      font-size:.79rem!important;font-weight:800!important;
      padding:13px 14px!important;border-bottom:1px solid #31434f!important;
      text-align:left;vertical-align:bottom;
    }
    .tx-table td{
      background:#0a1720;color:#e6edf2;
      padding:18px 14px!important;border-bottom:1px solid #263844!important;
      font-size:.83rem!important;vertical-align:middle!important;
    }
    .tx-table tbody tr:last-child td{border-bottom:0!important}
    .tx-table tbody tr:hover td{background:#0d1c25}
    .tx-number{font-size:1.08rem;font-weight:800;color:#fff}
    .tx-number-quoted{display:flex;align-items:center;gap:5px;margin-bottom:7px;color:#aebbc4;font-size:.68rem;font-weight:750;white-space:nowrap;cursor:pointer}
    .tx-number-quoted input{width:14px;height:14px;margin:0;accent-color:#efb426;cursor:pointer}
    .tx-number-quoted input:disabled{cursor:wait}
    .tx-agency{font-weight:700;color:#fff;line-height:1.35}
    .tx-city{line-height:1.35}
    .tx-date-main{display:flex;align-items:center;gap:7px;font-weight:700;color:#fff;white-space:nowrap}
    .tx-date-sub{display:block;margin:4px 0 0 25px;color:#9ba8b2;font-size:.76rem}
    .tx-date-icon{font-size:1rem}
    .tx-deadline-badge{
      display:inline-block;margin:8px 0 0 25px;
      padding:5px 9px;border-radius:6px;
      background:#3a1718;border:1px solid #702727;color:#ff6a63;font-size:.72rem
    }
    .tx-platform strong{display:block;color:#fff}
    .tx-platform small{display:block;color:#95a2ac;margin-top:4px}
    .tx-items{display:flex;align-items:center;gap:7px;white-space:nowrap}
    .tx-quoted-toggle{display:inline-flex;align-items:center;gap:7px;color:#aebbc4;font-size:.78rem;font-weight:750;white-space:nowrap;cursor:pointer}
    .tx-quoted-toggle input{width:16px;height:16px;accent-color:#efb426;cursor:pointer}
    .tx-quoted-toggle input:disabled{cursor:wait}
    .tx-situation-checks{display:grid;gap:5px;min-width:165px}
    .tx-situation-option{display:flex;align-items:center;gap:6px;border-radius:999px;padding:4px 8px;color:#e8edf2;font-size:.72rem;line-height:1;white-space:nowrap;cursor:pointer}
    .tx-situation-option input{width:13px;height:13px;margin:0;accent-color:currentColor;cursor:pointer}
    .tx-situation-option.awaiting{background:#2e638f}.tx-situation-option.qualification{background:#9a5b2f}
    .tx-situation-option.dispute{background:#8c7116}.tx-situation-option.won{background:#28704e}
    .tx-situation-option.lost{background:#913b3b}.tx-situation-option.delivery{background:#76428a}
    .tx-situation-option.finished{background:#666862}.tx-situation-option input:disabled{cursor:wait}
    .tx-situation-menu{position:relative;min-width:165px}
    .tx-situation-button{width:100%;border:1px solid #31434f;border-radius:7px;padding:8px 9px;background:#09161e;color:#fff;text-align:left;font-size:.72rem;font-weight:800;cursor:pointer}
    .tx-situation-button.awaiting{background:#2e638f}.tx-situation-button.qualification{background:#9a5b2f}.tx-situation-button.dispute{background:#8c7116}
    .tx-situation-button.won{background:#28704e}.tx-situation-button.lost{background:#913b3b}.tx-situation-button.delivery{background:#76428a}.tx-situation-button.finished{background:#666862}
    .tx-situation-options{position:absolute;top:calc(100% + 5px);left:0;z-index:20;display:grid;gap:4px;width:100%;padding:6px;border:1px solid #31434f;border-radius:8px;background:#08151d;box-shadow:0 12px 30px rgba(0,0,0,.45)}
    .tx-situation-options[hidden]{display:none}
    .tx-situation-options .tx-situation-option{border:0;text-align:left;width:100%}
    .tx-situation-options .tx-situation-option[aria-current="true"]{outline:2px solid rgba(255,255,255,.75)}
    .tx-situation-options .tx-situation-option:disabled{opacity:.6;cursor:wait}
    .tx-edital-link{
      display:inline-flex;align-items:center;justify-content:center;min-height:44px;
      padding:0 13px;border:1px solid #f0b429;border-radius:7px;
      color:#f0b429;text-decoration:none;font-weight:800;white-space:nowrap
    }
    .tx-edital-link:hover,.tx-edital-link:focus-visible{background:#f0b429;color:#07131a}
    .tx-edital-link:focus-visible{outline:3px solid rgba(240,180,41,.35);outline-offset:2px}
    .tx-edital-missing{display:inline-block;color:#8e9ba6;font-size:.78rem;white-space:nowrap}
    .tx-status{display:inline-flex;border-radius:999px;padding:5px 10px;font-size:.73rem;font-weight:800}
    .tx-status.good{background:#164c2c;color:#73e995}
    .tx-status.warn{background:#55420e;color:#ffd65b}
    .tx-status.bad{background:#5a2020;color:#ff8580}
    .tx-status.neutral{background:#26333c;color:#bac5cc}
    .tx-status-date{display:block;color:#9ba8b2;font-size:.74rem;margin-top:6px;white-space:nowrap}
    .tx-actions{display:grid;gap:7px;min-width:112px}
    .tx-action{
      border:1px solid #31434f;border-radius:7px;background:#09161e;color:#e6edf2;
      min-height:44px;padding:7px 10px;font-weight:650;cursor:pointer
    }
    .tx-action.danger{border-color:#8b2d2d;color:#ff6e67}
    .tx-action:hover{background:#10212b}
    .tx-footer{
      display:flex;justify-content:space-between;align-items:center;
      padding:14px 24px 18px;color:#9ba8b2;font-size:.78rem
    }
    .tx-pages{display:flex;align-items:center;gap:7px}
    .tx-page{
      width:36px;height:36px;border-radius:7px;border:1px solid #31434f;
      background:#0a1b25;color:#aebbc4;display:grid;place-items:center
    }
    .tx-page.active{background:#f0b429;color:#07131a;border-color:#f0b429;font-weight:900}
    .tx-info{
      display:grid;grid-template-columns:1.6fr 1fr;gap:18px;
      margin:0 24px 24px;padding:18px;
      border:1px solid #263844;border-radius:9px;background:#09161e;
    }
    .tx-info-title{color:#66aefe;font-weight:800;margin-bottom:12px}
    .tx-info p{margin:6px 0;color:#b1bec7;font-size:.79rem;line-height:1.45}
    .tx-info .attention{color:#f0b429;font-weight:700;margin-top:13px}
    .tx-legend{
      border:1px solid #263844;border-radius:8px;padding:14px 18px
    }
    .tx-legend h4{margin:0 0 11px;color:#dfe6eb}
    .tx-legend-row{display:flex;gap:9px;align-items:center;margin:9px 0;color:#b5c0c8;font-size:.78rem}
    .tx-dot{width:10px;height:10px;border-radius:50%;flex:0 0 auto}
    .tx-dot.good{background:#45cf69}.tx-dot.warn{background:#f7bd2d}
    .tx-dot.neutral{background:#b8c2c9}.tx-dot.bad{background:#ff514b}
    @media(max-width:1100px){
      .tx-stats{grid-template-columns:repeat(2,1fr)}
      .tx-toolbar{grid-template-columns:1fr 1fr}
      .tx-info{grid-template-columns:1fr}
    }
    @media(max-width:680px){
      .tx-head{padding:18px 14px}.tx-stats,.tx-toolbar,.tx-table-wrap{padding-left:14px;padding-right:14px}
      .tx-stats{grid-template-columns:1fr}.tx-toolbar{grid-template-columns:1fr}.tx-info{margin-left:14px;margin-right:14px}
    }
  `;
  document.head.appendChild(style);
}

function csvEscape(v){
  const s=String(v??'');
  return `"${s.replace(/"/g,'""')}"`;
}

function exportTendersCsv(tenders){
  const headers=['Número','Órgão','Cidade/UF','Abertura para propostas','Data limite para propostas','Plataforma','Itens','Situação','Status'];
  const lines=[headers.map(csvEscape).join(';')];
  for(const l of tenders){
    const status=tenderStatusInfo(l);
    lines.push([
      l.numero,
      l.orgao,
      l.cidade,
      l.proposalOpenAt?dateBR(l.proposalOpenAt,true):'',
      l.proposalEndAt?dateBR(l.proposalEndAt,true):'',
      l.plataforma,
      state.itens.filter(i=>String(i.licitacao_id)===String(l.id)).length,
      tenderSituationInfo(l.situation).label,
      status.label
    ].map(csvEscape).join(';'));
  }
  const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='editais_inova.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function renderTenderManagement(){
  const section=$('#licitacoes');
  const list=$('#licitacoesLista');
  if(!section || !list)return;

  ensureTenderExactStyles();
  section.classList.add('tender-exact-view');

  // Usa o próprio painel da lista como âncora e mantém os formulários originais intactos,
  // apenas ocultos até o botão "+ Novo edital" ser clicado.
  const panels=[...section.querySelectorAll(':scope > .panel')];
  const listPanel=panels.find(p=>p.contains(list));
  panels.forEach(panel=>panel.classList.toggle('tender-manual-panel',Boolean(panel.querySelector('#licitacaoForm, #itemForm'))));
  if(listPanel)listPanel.style.display='none';

  let shell=section.querySelector('.tender-exact-shell');
  if(!shell){
    shell=document.createElement('div');
    shell.className='tender-exact-shell';
    section.insertBefore(shell,section.firstChild);
  }

  const getFiltered=()=>{
    const tenderView=shell.dataset.tenderView||'all';
    const query=quoteNormalize(shell.querySelector('#txSearch')?.value||'');
    const statusFilter=shell.querySelector('#txStatus')?.value||'all';
    const sort=shell.querySelector('#txSort')?.value||'deadline';

    let rows=[...state.licitacoes].filter(l=>{
      const isClosed=tenderStatusInfo(l).label==='Encerrado';
      const situation=String(l.situation||'aguardando_disputa');
      if(tenderView==='closed')return isClosed&&situation==='aguardando_disputa';
      if(tenderView==='all')return !isClosed;
      if(isClosed&&situation==='aguardando_disputa')return false;
      if(situation!==tenderView)return false;
      if(query && !quoteNormalize(`${l.numero} ${l.orgao} ${l.cidade} ${l.plataforma}`).includes(query))return false;
      if(statusFilter!=='all'){
        const s=tenderStatusInfo(l);
        if(statusFilter==='active' && s.label==='Encerrado')return false;
        if(statusFilter==='closed' && s.label!=='Encerrado')return false;
        if(statusFilter==='soon' && !['Fecha hoje','Prazo próximo'].includes(s.label))return false;
      }
      return true;
    });

    rows.sort((a,b)=>{
      if(sort==='number')return String(a.numero||'').localeCompare(String(b.numero||''),undefined,{numeric:true});
      if(sort==='agency')return String(a.orgao||'').localeCompare(String(b.orgao||''));
      const ad=a.proposalEndAt?new Date(a.proposalEndAt).getTime():Number.MAX_SAFE_INTEGER;
      const bd=b.proposalEndAt?new Date(b.proposalEndAt).getTime():Number.MAX_SAFE_INTEGER;
      return ad-bd;
    });
    return rows;
  };

  const total=state.licitacoes.length;
  const active=state.licitacoes.filter(l=>tenderStatusInfo(l).label!=='Encerrado').length;
  const soon=state.licitacoes.filter(l=>{
    if(!l.proposalEndAt)return false;
    const ms=new Date(l.proposalEndAt).getTime()-Date.now();
    return ms>=0&&ms<=5*86400000;
  }).length;

  shell.innerHTML=`
    <div class="tx-head">
      <div class="tx-title">
        <h2>Editais / Licitações</h2>
        <p>Gerencie os editais cadastrados no sistema.</p>
      </div>
      <button type="button" class="tx-primary" id="txNewTender">＋ Novo edital</button>
    </div>

    <div class="tx-new-panel" id="txNewTenderPanel">
      <div class="tx-new-title">
        <div>
          <h3>Importar edital automaticamente do PNCP</h3>
          <p>Cole o link oficial do edital no PNCP. O sistema carrega os dados e os itens automaticamente.</p>
        </div>
        <button type="button" class="tx-manual-toggle" id="txManualTenderToggle">Cadastrar manualmente</button>
      </div>

      <form id="pncpSearchForm" class="tx-pncp-form">
        <label>
          Link do edital no PNCP
          <input id="pncpQuery" name="query" type="url" inputmode="url" autocomplete="url" placeholder="https://pncp.gov.br/app/editais/CNPJ/ANO/NÚMERO" required>
        </label>

        <button type="submit">Carregar edital</button>
      </form>

      <div class="tx-pncp-hint">
        <strong>Como fazer:</strong> abra o edital no site do PNCP, copie o endereço da página e cole acima.
      </div>

      <div id="pncpSearchStatus" class="pncp-status" hidden></div>
      <div id="pncpSearchResults"></div>
      <div id="pncpPreview" hidden></div>
    </div>

    <div class="tx-stats">
      <div class="tx-stat">
        <div class="tx-stat-icon blue">▣</div>
        <div><small>Total de editais</small><strong>${total}</strong><span>cadastrados</span></div>
      </div>
      <div class="tx-stat">
        <div class="tx-stat-icon red">◷</div>
        <div><small>Próximos fechamentos</small><strong>${soon}</strong><span>edital fecha em breve</span></div>
      </div>
      <div class="tx-stat">
        <div class="tx-stat-icon green">✓</div>
        <div><small>Editais ativos</small><strong>${active}</strong><span>ativos</span></div>
      </div>
    </div>

    <div class="tx-toolbar">
      <input id="txSearch" type="search" placeholder="⌕  Buscar edital (órgão, cidade, número, plataforma...)" autocomplete="off">
      <select id="txStatus">
        <option value="all">Todos os status</option>
        <option value="active">Ativos</option>
        <option value="soon">Prazo próximo</option>
        <option value="closed">Encerrados</option>
      </select>
      <select id="txSort">
        <option value="deadline">Ordenar por: Prazo (mais próximo)</option>
        <option value="number">Ordenar por: Número</option>
        <option value="agency">Ordenar por: Órgão</option>
      </select>
      <div></div>
      <button type="button" class="tx-export" id="txExport">⇩ Exportar</button>
    </div>

    <div class="tx-list-tabs" role="tablist" aria-label="Filtrar licitações por situação">
      <button type="button" class="active" data-tender-view="all" role="tab" aria-selected="true">Todas</button>
      ${TENDER_SITUATIONS.map(item=>`<button type="button" data-tender-view="${item.value}" role="tab" aria-selected="false">${item.label}</button>`).join('')}
      <button type="button" data-tender-view="closed" role="tab" aria-selected="false">Encerradas</button>
    </div>

    <div class="tx-table-wrap">
      <table class="tx-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Órgão</th>
            <th>Cidade / UF</th>
            <th>Data limite para propostas<br><small style="color:#efb426">(Fecha propostas)</small></th>
            <th>Plataforma</th>
            <th>Itens</th>
            <th>Situação</th>
            <th>Edital</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="txTenderRows"></tbody>
      </table>
    </div>

    <div class="tx-footer">
      <span id="txCount"></span>
      <div class="tx-pages">
        <span class="tx-page">‹</span>
        <span class="tx-page active">1</span>
        <span class="tx-page">›</span>
      </div>
    </div>

    <div class="tx-info">
      <div>
        <div class="tx-info-title">ⓘ &nbsp;Sobre as datas</div>
        <p><strong>Data limite para propostas (fecha propostas):</strong> último dia e horário para envio de propostas e lances.</p>
        <p class="attention">Atenção: após o horário limite, o sistema da plataforma não aceitará novas propostas.</p>
      </div>
      <div class="tx-legend">
        <h4>Legenda de status</h4>
        <div class="tx-legend-row"><span class="tx-dot good"></span><span><strong>Ativo:</strong> edital disponível para participação</span></div>
        <div class="tx-legend-row"><span class="tx-dot warn"></span><span><strong>Em andamento:</strong> fase de disputa em andamento</span></div>
        <div class="tx-legend-row"><span class="tx-dot neutral"></span><span><strong>Encerrado:</strong> disputa finalizada</span></div>
        <div class="tx-legend-row"><span class="tx-dot bad"></span><span><strong>Cancelado:</strong> edital cancelado ou revogado</span></div>
      </div>
    </div>
  `;

  const renderRows=()=>{
    const rows=getFiltered();
    const tbody=shell.querySelector('#txTenderRows');
    if(!tbody)return;

    tbody.innerHTML=rows.map(l=>{
      const status=tenderStatusInfo(l);
      const itemCount=state.itens.filter(i=>String(i.licitacao_id)===String(l.id)).length;
      const tenderDocument=state.tenderDocuments.find(document=>String(document.tender_id)===String(l.id));
      const officialUrl=officialPncpTenderUrl(l);

      const statusClass=status.cls==='bad'?'bad':status.cls==='warn'?'warn':status.cls==='good'?'good':'neutral';

      return `
        <tr>
          <td>
            <label class="tx-number-quoted" title="Marcar licitação como cotada">
              <input type="checkbox" data-tender-quoted="${esc(l.id)}" ${l.is_quoted?'checked':''}>
              <span>Cotado</span>
            </label>
            <span class="tx-number">${esc(l.numero)}</span>
          </td>
          <td><div class="tx-agency">${esc(l.orgao||'-')}</div></td>
          <td><div class="tx-city">${esc(l.cidade||'-')}</div></td>

          <td>
            ${
              l.proposalEndAt
                ? `<div class="tx-date-main"><span class="tx-date-icon" style="color:#ff5048">▣</span>${dateBR(l.proposalEndAt,false)}</div>
                   <span class="tx-date-sub">${esc(weekdayBR(l.proposalEndAt))}</span>
                   <span class="tx-deadline-badge">${esc(status.detail)}</span>`
                : `<span class="tx-status neutral">Não sincronizado</span>`
            }
          </td>

          <td class="tx-platform">
            <strong>${esc(String(l.plataforma||'-').split('•')[0].trim())}</strong>
            <small>${esc(String(l.plataforma||'').split('•').slice(1).join('•').trim()||'Pregão - Eletrônico')}</small>
          </td>

          <td>
            <div class="tx-items">
              <strong>${itemCount}</strong>
              ${l.pncp_control?'<span class="badge good">PNCP</span>':''}
            </div>
          </td>

          <td>
            <div class="tx-situation-menu">
              <button type="button" class="tx-situation-button ${tenderSituationInfo(l.situation).className}" data-situation-menu="${esc(l.id)}" aria-expanded="false">${tenderSituationInfo(l.situation).label} ▾</button>
              <div class="tx-situation-options" data-situation-options="${esc(l.id)}" hidden>
                ${TENDER_SITUATIONS.map(item=>`<button type="button" class="tx-situation-option ${item.className}" data-tender-situation-option="${esc(l.id)}" data-situation-value="${item.value}" ${String(l.situation||'aguardando_disputa')===item.value?'aria-current="true"':''}>${item.label}</button>`).join('')}
              </div>
            </div>
          </td>

          <td>
            ${officialUrl
              ? `<a class="tx-edital-link" href="${esc(officialUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir edital ${esc(l.numero||'')} no PNCP em nova aba">Abrir no PNCP</a>`
              : '<span class="tx-edital-missing">Sem link</span>'}
          </td>

          <td>
            <span class="tx-status ${statusClass}">${esc(status.label==='Prazo próximo'?'Ativo':status.label)}</span>
            <span class="tx-status-date">${l.createdAt?'Cadastrado em '+dateBR(l.createdAt,false):''}</span>
          </td>

          <td>
            <div class="tx-actions">
              ${tenderDocument
                ? `${tenderDocumentIsPdf(tenderDocument)?`<button type="button" class="tx-action" data-open-tender-document="${esc(tenderDocument.id)}" aria-label="Abrir PDF do edital ${esc(l.numero||'')} em nova aba">Abrir PDF</button>`:''}<button type="button" class="tx-action" data-download-tender-document="${esc(tenderDocument.id)}" aria-label="${esc(tenderDocumentDownloadLabel(tenderDocument))} do edital ${esc(l.numero||'')}">${esc(tenderDocumentDownloadLabel(tenderDocument))}</button>`
                : currentMemberIsAdmin()?`<button type="button" class="tx-action" data-add-tender-document="${esc(l.id)}">Adicionar edital</button>`:''}
              ${l.pncp_control?`<button type="button" class="tx-action" data-direct-pncp-sync="${l.id}">Atualizar itens</button>`:''}
              <button type="button" class="tx-action danger" data-delete="licitacao" data-id="${l.id}">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const count=shell.querySelector('#txCount');
    if(count)count.textContent=`Exibindo ${rows.length?1:0} a ${rows.length} de ${rows.length} editais`;

    tbody.querySelectorAll('[data-situation-menu]').forEach(button=>button.addEventListener('click',event=>{
      const id=event.currentTarget.dataset.situationMenu;
      const options=tbody.querySelector(`[data-situation-options="${id}"]`);
      if(!options)return;
      const open=options.hidden;
      tbody.querySelectorAll('[data-situation-options]').forEach(menu=>{menu.hidden=true;});
      tbody.querySelectorAll('[data-situation-menu]').forEach(toggle=>toggle.setAttribute('aria-expanded','false'));
      options.hidden=!open;
      event.currentTarget.setAttribute('aria-expanded',String(open));
    }));

    tbody.querySelectorAll('[data-tender-situation-option]').forEach(option=>option.addEventListener('click',async event=>{
      const selected=event.currentTarget;
      const tender=state.licitacoes.find(row=>String(row.id)===String(selected.dataset.tenderSituationOption));
      if(!tender)return;
      const situation=selected.dataset.situationValue||'aguardando_disputa';
      const previous=tender.situation||'aguardando_disputa';
      tbody.querySelectorAll(`[data-tender-situation-option="${tender.id}"]`).forEach(item=>item.disabled=true);
      if(state.demo){
        tender.situation=situation;
        renderRows();
        toast(`Situação alterada para ${tenderSituationInfo(situation).label}.`);
        return;
      }
      const {error}=await supabase.from('tenders').update({tender_situation:situation,updated_at:new Date().toISOString()}).eq('id',tender.id);
      if(error){
        tender.situation=previous;
        tbody.querySelectorAll(`[data-tender-situation-option="${tender.id}"]`).forEach(item=>item.disabled=false);
        return toast(`Não foi possível atualizar a situação: ${error.message}`,'error');
      }
      tender.situation=situation;
      renderRows();
      toast(`Situação alterada para ${tenderSituationInfo(situation).label}.`);
    }));

    tbody.querySelectorAll('[data-tender-quoted]').forEach(input=>input.addEventListener('change',async event=>{
      const checkbox=event.currentTarget;
      const tender=state.licitacoes.find(row=>String(row.id)===String(checkbox.dataset.tenderQuoted));
      if(!tender)return;
      const checked=Boolean(checkbox.checked);
      checkbox.disabled=true;
      if(state.demo){
        tender.is_quoted=checked;
        checkbox.disabled=false;
        toast(checked?'Licitação marcada como cotada.':'Marcação de cotado removida.');
        return;
      }
      const {error}=await supabase.from('tenders').update({is_quoted:checked,updated_at:new Date().toISOString()}).eq('id',tender.id);
      if(error){
        checkbox.checked=!checked;
        checkbox.disabled=false;
        return toast(`Não foi possível atualizar a marcação: ${error.message}`,'error');
      }
      tender.is_quoted=checked;
      checkbox.disabled=false;
      toast(checked?'Licitação marcada como cotada.':'Marcação de cotado removida.');
    }));
  };

  shell.querySelector('#txSearch')?.addEventListener('input',renderRows);
  shell.querySelector('#txStatus')?.addEventListener('change',renderRows);
  shell.querySelector('#txSort')?.addEventListener('change',renderRows);
  shell.querySelectorAll('[data-tender-view]').forEach(button=>button.addEventListener('click',()=>{
    const view=button.dataset.tenderView||'active';
    shell.dataset.tenderView=view;
    shell.querySelectorAll('[data-tender-view]').forEach(tab=>{
      const active=tab.dataset.tenderView===view;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-selected',String(active));
    });
    const statusSelect=shell.querySelector('#txStatus');
    if(statusSelect)statusSelect.value='all';
    renderRows();
  }));

  shell.querySelector('#txExport')?.addEventListener('click',()=>{
    exportTendersCsv(getFiltered());
  });

  shell.querySelector('#txNewTender')?.addEventListener('click',()=>{
    const panel=shell.querySelector('#txNewTenderPanel');
    const open=!panel?.classList.contains('open');
    panel?.classList.toggle('open',open);

    const btn=shell.querySelector('#txNewTender');
    if(btn)btn.textContent=open?'× Fechar novo edital':'＋ Novo edital';

    if(!open){
      section.classList.remove('show-new-tender');
    }

    if(open){
      panel?.scrollIntoView({behavior:'smooth',block:'nearest'});
      shell.querySelector('#pncpQuery')?.focus();
    }
  });

  shell.querySelector('#txManualTenderToggle')?.addEventListener('click',()=>{
    section.classList.toggle('show-new-tender');
    const open=section.classList.contains('show-new-tender');
    const btn=shell.querySelector('#txManualTenderToggle');
    if(btn)btn.textContent=open?'Ocultar cadastro manual':'Cadastrar manualmente';
    if(open)section.querySelector(':scope > .panel.tender-manual-panel')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  });

  // Como este formulário é criado dinamicamente, o evento precisa ser ligado aqui.
  shell.querySelector('#pncpSearchForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const f=Object.fromEntries(new FormData(e.target));
    await searchPncp(String(f.query||'').trim());
  });

  renderRows();

  // A sincronização em massa ao abrir a tela sobrecarregava o PNCP e bloqueava novas buscas.
  // Cada edital continua podendo ser atualizado explicitamente pelo botão “Atualizar itens”.
}



function ensureDashboardModelStyles(){
  if(document.getElementById('dashboardModelStyles'))return;

  const style=document.createElement('style');
  style.id='dashboardModelStyles';
  style.textContent=`
    #dashboard.dashboard-model{
      background:#06131b;
      color:#edf3f6;
      padding:0!important;
    }

    #dashboard.dashboard-model > .cards,
    #dashboard.dashboard-model > .two-col{
      display:none!important;
    }

    /* SEM MENU LATERAL: somente o menu superior global do sistema */
    .db-shell{
      display:block;
      min-height:calc(100vh - 62px);
      width:100%;
    }

    .db-side{
      display:none!important;
    }

    .db-main{
      padding:18px 22px 28px;
      min-width:0;
      max-width:1800px;
      margin:0 auto;
    }

    .db-head{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:16px;
      margin-bottom:17px;
    }

    .db-title h1{
      margin:0;
      font-size:1.72rem;
      color:#f2f5f7;
      letter-spacing:-.02em;
    }

    .db-title p{
      margin:5px 0 0;
      color:#95a4ae;
      font-size:.8rem;
    }

    .db-date-pill{
      border:1px solid #27414f;
      border-radius:8px;
      background:#081720;
      color:#e3e9ed;
      padding:10px 13px;
      font-size:.76rem;
      white-space:nowrap;
    }

    .db-kpis{
      display:grid;
      grid-template-columns:repeat(4,minmax(180px,1fr));
      gap:12px;
      margin-bottom:14px;
    }

    .db-kpi{
      min-height:104px;
      border:1px solid #203743;
      border-radius:11px;
      background:linear-gradient(145deg,#0a1a23,#081720);
      padding:15px 16px;
      display:grid;
      grid-template-columns:52px 1fr;
      gap:13px;
      align-items:center;
    }

    .db-kpi-icon{
      width:52px;height:52px;
      border-radius:12px;
      display:grid;place-items:center;
      font-size:1.4rem;
      font-weight:900;
    }

    .db-kpi-icon.yellow{background:#3b3210;color:#f2b52a}
    .db-kpi-icon.red{background:#46171d;color:#ff625d}
    .db-kpi-icon.green{background:#123a26;color:#35d379}
    .db-kpi-icon.purple{background:#251a43;color:#b18bff}

    .db-kpi small{display:block;color:#93a3ad;font-size:.68rem;text-transform:uppercase}
    .db-kpi strong{display:block;color:#f4f7f9;font-size:1.52rem;line-height:1.1;margin-top:4px}
    .db-kpi span{display:block;color:#9aa8b2;font-size:.7rem;margin-top:5px}

    /* Linha principal igual ao modelo: prazos | calendário | resumo */
    .db-primary-grid{
      display:grid;
      grid-template-columns:280px minmax(520px,1fr) 330px;
      gap:14px;
      align-items:stretch;
      margin-bottom:14px;
    }

    /* Linha inferior igual ao modelo: status | dicas | tabela */
    .db-secondary-grid{
      display:grid;
      grid-template-columns:300px 320px minmax(620px,1fr);
      gap:14px;
      align-items:stretch;
    }

    .db-card{
      border:1px solid #203743;
      border-radius:11px;
      background:#081720;
      overflow:hidden;
      min-width:0;
    }

    .db-card-head{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      min-height:48px;
      padding:12px 15px;
      border-bottom:1px solid #203743;
    }

    .db-card-head strong{
      color:#f2b52a;
      font-size:.9rem;
    }

    .db-card-head button{
      border:1px solid #2c4654;
      border-radius:7px;
      background:#07151d;
      color:#cbd5da;
      height:32px;
      padding:0 10px;
      font-size:.7rem;
      cursor:pointer;
    }

    .db-deadlines{
      padding:4px 12px 10px;
    }

    .db-deadline{
      position:relative;
      padding:13px 10px 13px 18px;
      border-bottom:1px solid #1b303a;
    }

    .db-deadline:last-child{border-bottom:0}

    .db-deadline:before{
      content:'';
      position:absolute;
      left:2px;top:13px;bottom:13px;width:4px;border-radius:999px;
      background:#4b9cff;
    }

    .db-deadline.urgent:before{background:#ff334a}
    .db-deadline.soon:before{background:#ffc21c}

    .db-deadline-time{
      font-weight:850;
      font-size:.8rem;
      color:#e9eef1;
    }

    .db-deadline.urgent .db-deadline-time{color:#ff5d66}
    .db-deadline.soon .db-deadline-time{color:#ffd02d}

    .db-deadline-title{
      color:#e8edf0;
      font-size:.73rem;
      margin-top:5px;
      line-height:1.35;
    }

    .db-deadline-meta{
      color:#8f9fa9;
      font-size:.67rem;
      margin-top:4px;
    }

    .db-deadline-actions{
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      gap:7px;
      margin-top:8px;
    }

    .db-open-tender{
      margin-top:8px;
      height:30px;
      border:1px solid #2d4654;
      border-radius:6px;
      background:#07151d;
      color:#dfe7eb;
      padding:0 9px;
      font-size:.66rem;
      cursor:pointer;
      display:inline-flex;
      align-items:center;
      text-decoration:none;
    }

    .db-deadline-actions .db-open-tender{
      margin-top:0;
    }

    .db-edital-unavailable{
      color:#8f9fa9;
      font-size:.67rem;
    }

    .db-calendar{
      padding:12px 14px 14px;
    }

    .db-calendar-top{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      margin-bottom:10px;
    }

    .db-calendar-month{
      color:#eef3f6;
      font-weight:850;
      text-transform:capitalize;
    }

    .db-cal-nav{
      display:flex;gap:7px;align-items:center
    }

    .db-cal-nav button{
      height:32px;
      min-width:32px;
      border:1px solid #2d4654;
      border-radius:7px;
      background:#07151d;
      color:#d6e0e5;
      padding:0 9px;
      cursor:pointer;
    }

    .db-cal-legend{
      display:flex;
      gap:12px;
      align-items:center;
      color:#9aa8b2;
      font-size:.64rem;
      margin-bottom:8px;
      flex-wrap:wrap;
    }

    .db-cal-legend i{
      width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px
    }

    .db-cal-grid{
      display:grid;
      grid-template-columns:repeat(7,1fr);
      border:1px solid #203743;
      border-radius:9px;
      overflow:hidden;
    }

    .db-cal-week{
      padding:8px 4px;
      background:#07151d;
      text-align:center;
      color:#a8b5bd;
      font-size:.66rem;
      border-right:1px solid #1d313c;
      border-bottom:1px solid #1d313c;
      font-weight:700;
    }

    .db-cal-day{
      min-height:68px;
      padding:6px;
      background:#091821;
      border-right:1px solid #1d313c;
      border-bottom:1px solid #1d313c;
      color:#e1e8ec;
      font-size:.68rem;
    }

    .db-cal-day.other{opacity:.35;background:#07151d}
    .db-cal-day.today{box-shadow:inset 0 0 0 1px #f2b52a}

    .db-cal-num{
      font-weight:800;
      margin-bottom:5px;
    }

    .db-cal-event{
      display:block;
      width:100%;
      border:0;
      border-radius:6px;
      padding:5px 6px;
      text-align:left;
      font-size:.61rem;
      line-height:1.25;
      color:#fff;
      cursor:pointer;
      background:#145ea7;
    }

    .db-cal-event.urgent{background:#9f1e2e}
    .db-cal-event.soon{background:#d6a000;color:#171100}
    .db-cal-event + .db-cal-event{margin-top:4px}
    .db-cal-event small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.82}

    .db-company{
      padding:8px 14px 13px;
    }

    .db-company-row{
      display:flex;
      justify-content:space-between;
      gap:12px;
      padding:9px 0;
      border-bottom:1px solid #1d313c;
      color:#c6d1d7;
      font-size:.72rem;
    }

    .db-company-row:last-child{border-bottom:0}
    .db-company-row strong{color:#f1f5f7}

    .db-status{
      padding:14px;
      display:grid;
      grid-template-columns:118px 1fr;
      gap:14px;
      align-items:center;
      min-height:190px;
    }

    .db-donut{
      width:108px;height:108px;border-radius:50%;
      background:conic-gradient(#35d379 0 62.5%, #f2b52a 62.5% 87.5%, #55a8ff 87.5% 100%);
      display:grid;place-items:center;
      position:relative;
    }

    .db-donut:after{
      content:'';
      width:70px;height:70px;border-radius:50%;
      background:#081720;position:absolute;
    }

    .db-donut strong{
      position:relative;z-index:2;font-size:1.2rem;color:#f4f7f8
    }

    .db-status-list{
      display:grid;gap:9px;font-size:.7rem;color:#b6c2c9
    }

    .db-status-list span{
      display:flex;justify-content:space-between;gap:10px
    }

    .db-tip{
      padding:14px;
      color:#c3ced4;
      font-size:.71rem;
      line-height:1.5;
    }

    .db-tip div{
      padding:8px 0;
      border-bottom:1px solid #1d313c;
    }

    .db-tip div:last-child{border-bottom:0}
    .db-tip b{color:#35d379}

    .db-table-card table{
      width:100%;
      border-collapse:separate;
      border-spacing:0;
      min-width:680px;
    }

    .db-table-card th{
      background:#07151d;
      color:#a9b5bd;
      text-align:left;
      font-size:.66rem;
      padding:10px 10px;
      border-bottom:1px solid #203743;
      position:sticky;
      top:0;
    }

    .db-table-card td{
      background:#091821;
      color:#e1e8ec;
      font-size:.69rem;
      padding:10px;
      border-bottom:1px solid #1d313c;
    }

    .db-table-scroll{
      overflow:auto;
      max-height:260px;
    }

    .db-progress{
      height:7px;
      border-radius:999px;
      background:#1b2e39;
      overflow:hidden;
      min-width:72px;
    }

    .db-progress span{
      display:block;height:100%;background:#35d379;border-radius:inherit
    }

    .db-footer{
      text-align:center;
      color:#758690;
      font-size:.66rem;
      padding:20px 0 3px;
    }

    @media(max-width:1400px){
      .db-primary-grid{grid-template-columns:250px minmax(500px,1fr)}
      .db-primary-grid > .db-company-card{grid-column:1/-1}
      .db-secondary-grid{grid-template-columns:1fr 1fr}
      .db-secondary-grid > .db-table-card{grid-column:1/-1}
    }

    @media(max-width:960px){
      .db-main{padding:14px 12px 24px}
      .db-kpis{grid-template-columns:repeat(2,1fr)}
      .db-primary-grid,.db-secondary-grid{grid-template-columns:1fr}
      .db-primary-grid > .db-company-card,
      .db-secondary-grid > .db-table-card{grid-column:auto}
      .db-head{flex-direction:column}
    }
  `;
  document.head.appendChild(style);
}

function dashboardCalendarLocalYMD(v){
  if(!v)return '';
  const d=new Date(v);
  if(Number.isNaN(d.getTime()))return '';

  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Fortaleza',
    year:'numeric',
    month:'2-digit',
    day:'2-digit'
  }).formatToParts(d);

  const get=type=>parts.find(p=>p.type===type)?.value||'';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

function dashboardDeadlineMeta(l){
  const raw=l.proposalEndAt || l.raw?.dispute_at;
  if(!raw)return null;
  const d=new Date(raw);
  if(Number.isNaN(d.getTime()))return null;

  const ms=d.getTime()-Date.now();
  const days=Math.ceil(ms/86400000);

  return {
    date:d,
    days,
    cls:days<=2?'urgent':days<=5?'soon':'normal'
  };
}

function dashboardTenderCloseYMD(l){
  const raw=l.proposalEndAt || l.raw?.dispute_at;
  if(!raw)return '';
  return dashboardCalendarLocalYMD(raw);
}

function renderDashboardModel(){
  const dashboard=$('#dashboard');
  if(!dashboard)return;

  ensureDashboardModelStyles();
  dashboard.classList.add('dashboard-model');

  let shell=$('#dashboardModelShell');
  if(!shell){
    shell=document.createElement('div');
    shell.id='dashboardModelShell';
    shell.className='db-shell';
    dashboard.appendChild(shell);
  }

  const allTenders=[...state.licitacoes];
  const activeTenders=allTenders.filter(l=>{
    const meta=dashboardDeadlineMeta(l);
    return !meta || meta.date.getTime()>=Date.now();
  });

  const allItems=state.itens;
  const quotedItems=allItems.filter(i=>itemHasQuote(i.id));
  const opportunities=allItems.filter(i=>pricing(i)?.status==='Excelente');

  const closingWeek=activeTenders.filter(l=>{
    const m=dashboardDeadlineMeta(l);
    return m && m.days>=0 && m.days<=7;
  });

  const upcoming=activeTenders
    .map(l=>({l,meta:dashboardDeadlineMeta(l)}))
    .filter(x=>x.meta&&x.meta.days>=0&&x.meta.days<=7)
    .sort((a,b)=>a.meta.date-b.meta.date);

  if(!state.dashboardCalendarDate){
    const base=upcoming[0]?.meta?.date || new Date();
    state.dashboardCalendarDate=new Date(base.getFullYear(),base.getMonth(),1);
  }

  const view=new Date(state.dashboardCalendarDate);
  const year=view.getFullYear();
  const month=view.getMonth();
  const gridStart=new Date(year,month,1-new Date(year,month,1).getDay());
  const todayKey=dashboardCalendarLocalYMD(new Date());

  const eventMap=new Map();
  activeTenders.forEach(l=>{
    const key=dashboardTenderCloseYMD(l);
    if(!key)return;
    if(!eventMap.has(key))eventMap.set(key,[]);
    eventMap.get(key).push(l);
  });

  const cells=[];
  for(let i=0;i<42;i++){
    const d=new Date(gridStart);
    d.setDate(gridStart.getDate()+i);

    const key=[
      d.getFullYear(),
      String(d.getMonth()+1).padStart(2,'0'),
      String(d.getDate()).padStart(2,'0')
    ].join('-');

    const events=eventMap.get(key)||[];
    const other=d.getMonth()!==month;
    const today=key===todayKey;
    cells.push(`
      <div class="db-cal-day ${other?'other':''} ${today?'today':''}">
        <div class="db-cal-num">${d.getDate()}</div>
        ${events.map(event=>{
          const meta=dashboardDeadlineMeta(event);
          return `<button class="db-cal-event ${meta?.cls||''}" data-db-tender="${event.id}" title="Abrir edital ${esc(event.numero)}">
            Edital ${esc(event.numero)}
          </button>`;
        }).join('')}
      </div>
    `);
  }

  const monthLabel=new Intl.DateTimeFormat('pt-BR',{
    month:'long',
    year:'numeric'
  }).format(view);

  const tenderRows=activeTenders
    .map(l=>{
      const items=allItems.filter(i=>String(i.licitacao_id)===String(l.id));
      const quoted=items.filter(i=>itemHasQuote(i.id)).length;
      const missing=items.length-quoted;
      const pct=items.length?quoted/items.length*100:0;
      const meta=dashboardDeadlineMeta(l);
      return {l,items,quoted,missing,pct,meta};
    })
    .sort((a,b)=>(a.meta?.date||Infinity)-(b.meta?.date||Infinity))
    .slice(0,6);

  const ended=Math.max(0,allTenders.length-activeTenders.length);
  const quoteRate=allItems.length?(quotedItems.length/allItems.length)*100:0;

  shell.innerHTML=`
    <main class="db-main">
      <div class="db-head">
        <div class="db-title">
          <h1>Dashboard</h1>
          <p>Visão geral das suas licitações, prazos e oportunidades.</p>
        </div>

        <div class="db-date-pill">
          ${new Intl.DateTimeFormat('pt-BR',{
            day:'2-digit',
            month:'long',
            year:'numeric'
          }).format(new Date())}
        </div>
      </div>

      <div class="db-kpis">
        <div class="db-kpi">
          <div class="db-kpi-icon yellow">▤</div>
          <div>
            <small>Editais ativos</small>
            <strong>${activeTenders.length}</strong>
            <span>editais em andamento</span>
          </div>
        </div>

        <div class="db-kpi">
          <div class="db-kpi-icon red">◷</div>
          <div>
            <small>Fecham esta semana</small>
            <strong>${closingWeek.length}</strong>
            <span>prazos importantes</span>
          </div>
        </div>

        <div class="db-kpi">
          <div class="db-kpi-icon green">✓</div>
          <div>
            <small>Itens cotados</small>
            <strong>${quotedItems.length} / ${allItems.length}</strong>
            <span>${quoteRate.toFixed(1).replace('.',',')}% do total</span>
          </div>
        </div>

      </div>

      <div class="db-primary-grid">
        <section class="db-card">
          <div class="db-card-head">
            <strong>◷ Próximos prazos</strong>
            <button type="button" data-db-open-tab="licitacoes">Ver todos</button>
          </div>

          <div class="db-deadlines">
            ${upcoming.length?upcoming.map(({l,meta})=>{
              const officialUrl=officialPncpTenderUrl(l);
              const tenderDocument=state.tenderDocuments.find(document=>String(document.tender_id)===String(l.id));
              const pdfAction=tenderDocument&&tenderDocumentIsPdf(tenderDocument)
                ? `<button type="button" class="db-open-tender" data-open-tender-document="${esc(tenderDocument.id)}" aria-label="Abrir PDF do edital ${esc(l.numero||'')} em nova aba">Abrir PDF</button>`
                : '';
              const pncpAction=officialUrl
                ? `<a class="db-open-tender" href="${esc(officialUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir edital ${esc(l.numero||'')} no PNCP em nova aba">Abrir no PNCP</a>`
                : '';
              return `
              <div class="db-deadline ${meta.cls}">
                <div class="db-deadline-time">${dateBR(l.proposalEndAt||l.raw?.dispute_at,true)}</div>
                <div class="db-deadline-title">
                  Edital ${esc(l.numero)} • ${esc(l.cidade||l.orgao||'')}
                </div>
                <div class="db-deadline-meta">
                  ${state.itens.filter(i=>String(i.licitacao_id)===String(l.id)).length} itens
                </div>
                <div class="db-deadline-actions">
                  ${pncpAction}${pdfAction}${!pncpAction&&!pdfAction?'<span class="db-edital-unavailable">Edital indisponível</span>':''}
                </div>
              </div>
            `}).join(''):'<div class="db-tip">Nenhum fechamento futuro encontrado.</div>'}
          </div>
        </section>

        <section class="db-card">
          <div class="db-card-head">
            <strong>▣ Calendário de Fechamento de Propostas</strong>
          </div>

          <div class="db-calendar">
            <div class="db-calendar-top">
              <div class="db-cal-nav">
                <button id="dbCalPrev">‹</button>
              </div>

              <div class="db-calendar-month">${esc(monthLabel)}</div>

              <div class="db-cal-nav">
                <button id="dbCalToday">Hoje</button>
                <button id="dbCalNext">›</button>
              </div>
            </div>

            <div class="db-cal-legend">
              <span><i style="background:#ff334a"></i>Hoje / Até 2 dias</span>
              <span><i style="background:#ffc21c"></i>3 a 5 dias</span>
              <span><i style="background:#4b9cff"></i>Mais de 5 dias</span>
            </div>

            <div class="db-cal-grid">
              ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
                .map(d=>`<div class="db-cal-week">${d}</div>`).join('')}
              ${cells.join('')}
            </div>
          </div>
        </section>

        <section class="db-card db-company-card">
          <div class="db-card-head">
            <strong>▦ Resumo da empresa</strong>
          </div>

          <div class="db-company">
            <div class="db-company-row"><span>Licitações ativas</span><strong>${activeTenders.length}</strong></div>
            <div class="db-company-row"><span>Itens totais</span><strong>${allItems.length}</strong></div>
            <div class="db-company-row"><span>Itens cotados</span><strong>${quotedItems.length}</strong></div>
            <div class="db-company-row"><span>% itens cotados</span><strong>${quoteRate.toFixed(1).replace('.',',')}%</strong></div>
            <div class="db-company-row"><span>Oportunidades</span><strong>${opportunities.length}</strong></div>
            <div class="db-company-row"><span>Fornecedores</span><strong>${state.fornecedores.length}</strong></div>
          </div>
        </section>
      </div>

      <div class="db-secondary-grid">
        <section class="db-card">
          <div class="db-card-head">
            <strong>▥ Licitações por status</strong>
          </div>

          <div class="db-status">
            <div class="db-donut"><strong>${allTenders.length}</strong></div>

            <div class="db-status-list">
              <span><i>Em andamento</i><b>${activeTenders.length}</b></span>
              <span><i>Fecham esta semana</i><b>${closingWeek.length}</b></span>
              <span><i>Encerradas</i><b>${ended}</b></span>
            </div>
          </div>
        </section>

        <section class="db-card">
          <div class="db-card-head">
            <strong>💡 Dicas rápidas</strong>
          </div>

          <div class="db-tip">
            <div><b>✓</b> ${closingWeek.length} licitação(ões) fecham nesta semana.</div>
            <div><b>✓</b> ${Math.max(0,allItems.length-quotedItems.length)} itens ainda estão sem cotação.</div>
            <div><b>✓</b> Mantenha os fornecedores e preços atualizados.</div>
          </div>
        </section>

        <section class="db-card db-table-card">
          <div class="db-card-head">
            <strong>⚒ Editais em andamento</strong>
            <button type="button" data-db-open-tab="licitacoes">Ver todos</button>
          </div>

          <div class="db-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Edital</th>
                  <th>Órgão / Município</th>
                  <th>Itens</th>
                  <th>Cotados</th>
                  <th>Faltam cotar</th>
                  <th>% Cotado</th>
                  <th>Prazo (fechamento)</th>
                </tr>
              </thead>
              <tbody>
                ${tenderRows.map(r=>`
                  <tr>
                    <td><strong>${esc(r.l.numero)}</strong></td>
                    <td>${esc(r.l.orgao||r.l.cidade||'-')}</td>
                    <td>${r.items.length}</td>
                    <td>${r.quoted}</td>
                    <td>${r.missing}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:7px">
                        <div class="db-progress">
                          <span style="width:${Math.min(100,r.pct)}%"></span>
                        </div>
                        <span>${r.pct.toFixed(1).replace('.',',')}%</span>
                      </div>
                    </td>
                    <td>${r.meta?dateBR(r.l.proposalEndAt||r.l.raw?.dispute_at,true):'-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div class="db-footer">
        © 2026 INOVA LTDA — Sistema de Licitações
      </div>
    </main>
  `;

  $('#dbCalPrev')?.addEventListener('click',()=>{
    state.dashboardCalendarDate=new Date(year,month-1,1);
    renderDashboardModel();
  });

  $('#dbCalNext')?.addEventListener('click',()=>{
    state.dashboardCalendarDate=new Date(year,month+1,1);
    renderDashboardModel();
  });

  $('#dbCalToday')?.addEventListener('click',()=>{
    const now=new Date();
    state.dashboardCalendarDate=new Date(now.getFullYear(),now.getMonth(),1);
    renderDashboardModel();
  });

  shell.querySelectorAll('[data-db-tender]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const l=state.licitacoes.find(x=>String(x.id)===String(btn.dataset.dbTender));
      if(!l)return;
      toast(`Edital ${l.numero} fecha em ${dateBR(l.proposalEndAt||l.raw?.dispute_at,false)}.`);
    });
  });

  shell.querySelectorAll('[data-db-open-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelector(`#mainTabs [data-tab="${btn.dataset.dbOpenTab}"]`)?.click();
    });
  });

}


function currentMemberIsAdmin(){
  return state.membership?.role==='admin';
}

function activateDocumentTab(tab='editais',focus=false){
  const selected=['editais','habilitacao','cotacoes'].includes(tab)?tab:'editais';
  state.documentTab=selected;
  document.querySelectorAll('[data-document-tab]').forEach(button=>{
    const active=button.dataset.documentTab===selected;
    button.setAttribute('aria-selected',String(active));
    button.tabIndex=active?0:-1;
    if(active&&focus)button.focus();
  });
  const editais=$('#documentPanelEditais');
  const habilitacao=$('#documentPanelHabilitacao');
  const cotacoes=$('#documentPanelCotacoes');
  if(editais)editais.hidden=selected!=='editais';
  if(habilitacao)habilitacao.hidden=selected!=='habilitacao';
  if(cotacoes)cotacoes.hidden=selected!=='cotacoes';
}

function setTenderDocumentStatus(message='',type=''){
  const status=$('#tenderDocumentStatus');
  if(!status)return;
  status.hidden=!message;
  status.textContent=message;
  status.className=`document-status${type?` is-${type}`:''}`;
}

function documentDate(value){
  const date=new Date(value||'');
  return Number.isNaN(date.getTime())?'-':date.toLocaleString('pt-BR');
}

function localDateString(value){
  if(!value)return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return String(value);
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  const pad=number=>String(number).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

function localTodayString(){
  const date=new Date();
  const pad=number=>String(number).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

function dateOrdinal(value){
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])):null;
}

function qualificationDateBR(value){
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?`${match[3]}/${match[2]}/${match[1]}`:'Não informada';
}

function qualificationDocumentStatus(document){
  if(document.has_no_expiry)return {key:'valid',label:'Sem prazo de validade',tone:'good'};
  if(!document.expires_on)return {key:'no_expiry_info',label:'Validade não informada',tone:'warn'};
  const expiry=dateOrdinal(document.expires_on);
  const today=dateOrdinal(localTodayString());
  // Certidões normalmente permanecem válidas durante todo o dia informado.
  if(expiry<today)return {key:'expired',label:'Vencido na data de hoje',tone:'bad'};
  const tender=state.licitacoes.find(row=>String(row.id)===String(document.tender_id));
  const tenderDate=localDateString(tender?.proposalEndAt||tender?.raw?.dispute_at||tender?.data);
  if(tenderDate&&expiry<dateOrdinal(tenderDate))return {key:'expired_for_tender',label:'Válido hoje, mas vencido no pregão',tone:'bad'};
  const remaining=Math.floor((expiry-today)/86400000);
  if(remaining<=30)return {key:'expiring',label:`Vence em ${remaining} dia${remaining===1?'':'s'}`,tone:'warn'};
  return {key:'valid',label:'Válido',tone:'good'};
}

function qualificationCurrentDocuments(){
  const groups=new Map();
  state.qualificationDocuments.forEach(document=>{
    const key=document.document_series_id||document.id;
    const rows=groups.get(key)||[];
    rows.push(document);
    groups.set(key,rows);
  });
  return [...groups.values()].map(rows=>rows.sort((a,b)=>Number(b.version||1)-Number(a.version||1)||String(b.created_at).localeCompare(String(a.created_at)))[0]);
}

function setQualificationDocumentStatus(message='',type=''){
  const status=$('#qualificationDocumentStatus');
  if(!status)return;
  status.hidden=!message;
  status.textContent=message;
  status.className=`document-status${type?` is-${type}`:''}`;
}

function cancelQualificationRenewal(){
  state.qualificationRenewSeriesId='';
  const form=$('#qualificationDocumentForm');
  form?.reset();
  const series=$('#qualificationDocumentSeries');
  if(series)series.value='';
  const expiry=$('#qualificationExpiresOn');
  if(expiry){expiry.disabled=false;expiry.required=true;}
  const submit=$('#qualificationDocumentSubmit');
  if(submit)submit.textContent='Cadastrar documento';
  const cancel=$('#qualificationRenewCancel');
  if(cancel)cancel.hidden=true;
  setQualificationDocumentStatus('');
}

function renderQualification(){
  const pending=$('#qualificationPending');
  const workspace=$('#qualificationWorkspace');
  if(pending){pending.hidden=!state.qualificationError;pending.innerHTML=state.qualificationError?`<strong>Configuração pendente:</strong> ${esc(state.qualificationError)}`:'';}
  if(workspace)workspace.hidden=Boolean(state.qualificationError);
  if(state.qualificationError)return;

  const tenderSelect=$('#qualificationDocumentTender');
  const selectedTender=tenderSelect?.value||'';
  if(tenderSelect){
    tenderSelect.innerHTML='<option value="">Geral da empresa</option>'+state.licitacoes.map(tender=>`<option value="${esc(tender.id)}">${esc(tender.numero)} • ${esc(tender.orgao)}</option>`).join('');
    if(state.licitacoes.some(tender=>String(tender.id)===String(selectedTender)))tenderSelect.value=selectedTender;
  }

  const canWrite=currentMemberIsAdmin();
  $('#qualificationDocumentForm')?.querySelectorAll('input,select,textarea,button').forEach(control=>{
    if(control.id==='qualificationRenewCancel')return;
    control.disabled=!canWrite;
  });
  const permission=$('#qualificationDocumentPermission');
  if(permission)permission.innerHTML=canWrite
    ? '<strong>Acesso administrativo:</strong> você pode cadastrar e renovar documentos. Cada renovação preserva as versões anteriores.'
    : '<strong>Somente leitura:</strong> apenas administradores podem cadastrar ou renovar documentos.';

  const current=qualificationCurrentDocuments();
  const statuses=current.map(document=>qualificationDocumentStatus(document));
  const expired=statuses.filter(status=>['expired','expired_for_tender'].includes(status.key)).length;
  const expiring=statuses.filter(status=>status.key==='expiring').length;
  const valid=statuses.filter(status=>status.key==='valid').length;
  const unknown=statuses.filter(status=>status.key==='no_expiry_info').length;
  const summary=$('#qualificationSummary');
  if(summary)summary.innerHTML=`
    <div class="qualification-summary-card"><span>Documentos atuais</span><strong>${current.length}</strong></div>
    <div class="qualification-summary-card"><span>Válidos</span><strong>${valid}</strong></div>
    <div class="qualification-summary-card"><span>Vencendo em 30 dias</span><strong>${expiring}</strong></div>
    <div class="qualification-summary-card"><span>Vencidos</span><strong>${expired}</strong></div>
    <div class="qualification-summary-card"><span>Sem validade informada</span><strong>${unknown}</strong></div>`;

  const alerts=$('#qualificationAlerts');
  if(alerts){
    const parts=[];
    if(expired)parts.push(`<div class="qualification-alert bad"><div><strong>${expired} documento${expired===1?'':'s'} vencido${expired===1?'':'s'}</strong><span>Renove antes de usar em uma habilitação.</span></div></div>`);
    if(expiring)parts.push(`<div class="qualification-alert warn"><div><strong>${expiring} documento${expiring===1?'':'s'} vence${expiring===1?'':'m'} em até 30 dias</strong><span>Programe a renovação com antecedência.</span></div></div>`);
    if(!parts.length)parts.push('<div class="qualification-alert good"><div><strong>Nenhum alerta crítico agora</strong><span>Continue conferindo as exigências específicas de cada edital.</span></div></div>');
    alerts.innerHTML=parts.join('');
  }

  document.querySelectorAll('[data-qualification-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.qualificationFilter===state.qualificationFilter)));
  const matches=document=>{
    const key=qualificationDocumentStatus(document).key;
    if(state.qualificationFilter==='all')return true;
    if(state.qualificationFilter==='expired')return ['expired','expired_for_tender'].includes(key);
    return key===state.qualificationFilter;
  };
  const library=$('#qualificationLibrary');
  if(!library)return;
  const groups=new Map();
  state.qualificationDocuments.forEach(document=>{
    const key=document.document_series_id||document.id;
    const rows=groups.get(key)||[];rows.push(document);groups.set(key,rows);
  });
  const rows=[...groups.values()].map(versions=>versions.sort((a,b)=>Number(b.version||1)-Number(a.version||1))[0]).filter(matches);
  if(!rows.length){library.innerHTML='<div class="qualification-empty">Nenhum documento encontrado neste filtro.</div>';return;}
  library.innerHTML=rows.map(document=>{
    const versions=(groups.get(document.document_series_id||document.id)||[]).sort((a,b)=>Number(b.version||1)-Number(a.version||1));
    const status=qualificationDocumentStatus(document);
    const tender=state.licitacoes.find(row=>String(row.id)===String(document.tender_id));
    const history=versions.slice(1).map(version=>`<div class="qualification-history-row"><span>Versão ${Number(version.version||1)} • emissão ${qualificationDateBR(version.issued_on)} • validade ${version.has_no_expiry?'sem prazo':qualificationDateBR(version.expires_on)}</span><button type="button" class="action-btn" data-download-qualification-document="${esc(version.id)}">Baixar</button></div>`).join('');
    return `<article class="qualification-library-card">
      <div class="qualification-library-main">
        <div><h3>${esc(document.name)}</h3><p>${esc(document.document_type)} • ${esc(document.issuer)}</p><span class="badge ${status.tone} qualification-status-label">${esc(status.label)}</span></div>
        <div class="qualification-library-field"><small>Uso</small><strong>${esc(tender?`Pregão ${tender.numero}`:'Geral da empresa')}</strong></div>
        <div class="qualification-library-field"><small>Emissão</small><strong>${qualificationDateBR(document.issued_on)}</strong></div>
        <div class="qualification-library-field"><small>Validade</small><strong>${document.has_no_expiry?'Sem prazo':qualificationDateBR(document.expires_on)}</strong></div>
        <div class="document-action-group"><button type="button" class="action-btn" data-download-qualification-document="${esc(document.id)}">Baixar</button>${canWrite?`<button type="button" class="action-btn" data-renew-qualification-document="${esc(document.document_series_id||document.id)}">Renovar</button>`:''}</div>
      </div>
      ${document.coverage||document.notes?`<p class="hint">${esc([document.coverage,document.notes].filter(Boolean).join(' • '))}</p>`:''}
      ${history?`<details class="qualification-history"><summary>Histórico (${versions.length-1})</summary><div class="qualification-history-list">${history}</div></details>`:''}
    </article>`;
  }).join('');
}

function renderDocumentation(){
  activateDocumentTab(state.documentTab,false);
  const tenderSelect=$('#tenderDocumentTender');
  const currentTender=tenderSelect?.value||'';
  const options='<option value="">Selecione a licitação</option>'+state.licitacoes.map(l=>`<option value="${esc(l.id)}">${esc(l.numero)} • ${esc(l.orgao)}</option>`).join('');
  if(tenderSelect){
    tenderSelect.innerHTML=options;
    if(state.licitacoes.some(l=>String(l.id)===String(currentTender)))tenderSelect.value=currentTender;
  }

  const canWrite=currentMemberIsAdmin()&&!state.tenderDocumentsError;
  const form=$('#tenderDocumentForm');
  form?.querySelectorAll('select,input,button').forEach(control=>control.disabled=!canWrite);
  const permission=$('#tenderDocumentPermission');
  if(permission){
    permission.innerHTML=state.tenderDocumentsError
      ? `<strong>Configuração pendente:</strong> ${esc(state.tenderDocumentsError)}`
      : canWrite
        ? '<strong>Acesso administrativo:</strong> você pode adicionar ou substituir o edital vigente.'
        : '<strong>Somente leitura:</strong> apenas administradores da empresa podem adicionar ou substituir editais.';
  }

  const tenderList=$('#tenderDocumentsList');
  if(tenderList){
    tenderList.innerHTML=table(
      ['Licitação','Atualizado','Ação'],
      state.tenderDocuments.map(document=>{
        const tender=state.licitacoes.find(l=>String(l.id)===String(document.tender_id));
        const tenderLabel=tender
          ? [tender.numero,tender.orgao||tender.cidade].filter(Boolean).join(' • ')
          : 'Licitação não encontrada';
        return [
          esc(tenderLabel),
          documentDate(document.updated_at||document.created_at),
          `<div class="document-action-group">${tenderDocumentIsPdf(document)?`<button type="button" class="action-btn" data-open-tender-document="${esc(document.id)}" aria-label="Abrir PDF de ${esc(tenderLabel)} em nova aba">Abrir PDF</button>`:''}<button type="button" class="action-btn" data-download-tender-document="${esc(document.id)}" aria-label="${esc(tenderDocumentDownloadLabel(document))} de ${esc(tenderLabel)}">${esc(tenderDocumentDownloadLabel(document))}</button></div>`
        ];
      })
    );
  }

  const quoteList=$('#arquivosLista');
  if(quoteList){
    quoteList.innerHTML=table(
      ['Arquivo','Licitação','Fornecedor','Status','Enviado','Ações'],
      state.documentos.map(document=>{
        const tender=state.licitacoes.find(l=>String(l.id)===String(document.licitacao_id));
        const supplier=state.fornecedores.find(f=>String(f.id)===String(document.fornecedor_id));
        const download=document.storage_path
          ? `<button type="button" class="action-btn" data-download-quote-document="${esc(document.id)}">Baixar</button>`
          : '<span class="document-empty-action">Arquivo indisponível</span>';
        const shortcut=document.licitacao_id
          ? `<button type="button" class="action-btn" data-open-quote-document="${esc(document.licitacao_id)}">Abrir em Cotações</button>`
          : '';
        return [
          esc(document.nome_arquivo),
          esc(tender?.numero||'-'),
          esc(supplier?.nome||'-'),
          `<span class="badge neutral">${esc(document.status||'arquivado')}</span>`,
          documentDate(document.created_at),
          `<div class="document-action-group">${download}${shortcut}</div>`
        ];
      })
    );
  }
  renderQualification();
}

async function downloadPrivateDocument(bucket,path,fileName,button){
  if(state.demo||!configured||!supabase)return toast('O download privado funciona somente no modo online.','error');
  const allowed=bucket==='tender-files'
    ? state.tenderDocuments.some(document=>document.storage_path===path)
    : bucket==='quote-files'
      ? state.documentos.some(document=>document.storage_path===path)
      : bucket==='qualification-files'&&state.qualificationDocuments.some(document=>document.storage_path===path);
  if(!allowed||!path?.startsWith(`${currentCompanyId()}/`))return toast('Arquivo não encontrado ou sem acesso.','error');
  const oldText=button?.textContent||'Baixar';
  if(button){button.disabled=true;button.textContent='Baixando…';}
  try{
    const {data,error}=await supabase.storage.from(bucket).download(path);
    if(error||!data)throw error||new Error('Arquivo não encontrado.');
    const url=URL.createObjectURL(data);
    const link=document.createElement('a');
    link.href=url;
    link.download=fileName||'documento';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){
    console.warn('Download de documento:',error?.message||error);
    toast('Não foi possível baixar o arquivo. Verifique seu acesso e tente novamente.','error');
  }finally{
    if(button){button.disabled=false;button.textContent=oldText;}
  }
}

async function openPrivateTenderPdf(documentId,button){
  const document=state.tenderDocuments.find(row=>String(row.id)===String(documentId));
  const companyId=currentCompanyId();
  if(
    !document||
    !tenderDocumentIsPdf(document)||
    !companyId||
    !document.storage_path?.startsWith(`${companyId}/`)
  )return toast('Edital não encontrado ou sem acesso.','error');
  if(state.demo||!configured||!supabase)return toast('A abertura do PDF funciona somente no modo online.','error');

  const popup=window.open('about:blank','_blank');
  if(!popup)return toast('O navegador bloqueou a nova aba. Permita pop-ups para abrir o PDF.','error');
  popup.opener=null;

  const oldText=button?.textContent||'Abrir PDF';
  if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Abrindo…';}
  try{
    const {data,error}=await supabase.storage.from('tender-files').createSignedUrl(document.storage_path,60);
    if(error||!data?.signedUrl)throw error||new Error('URL temporária indisponível.');
    if(popup.closed)throw new Error('A nova aba foi fechada.');
    popup.location.replace(data.signedUrl);
  }catch(error){
    try{if(!popup.closed)popup.close();}catch{}
    console.warn('Abertura do edital privado:',error?.message||'falha');
    toast('Não foi possível abrir o PDF. Verifique seu acesso e tente novamente.','error');
  }finally{
    if(button){button.disabled=false;button.removeAttribute('aria-busy');button.textContent=oldText;}
  }
}

function renderFinance(){
  const summary=$('#financeSummary'), chart=$('#financeChart'), tenders=$('#financeTenders'), detail=$('#financeTenderDetail');
  if(!summary||!chart||!tenders)return;
  const days=state.financePeriod==='all'?null:Number(state.financePeriod||'all');
  const now=Date.now();
  const rows=state.licitacoes.map(t=>{const items=state.itens.filter(i=>String(i.licitacao_id)===String(t.id));const profit=items.reduce((sum,i)=>{const p=pricing(i);return sum+(Number.isFinite(Number(p?.profit))?Number(p.profit):0)},0);const raw=t.proposalEndAt||t.createdAt||t.raw?.created_at;const date=raw?new Date(raw):null;return {t,profit,date};}).filter(r=>!days||!r.date||now-r.date.getTime()<=days*86400000);
  const total=rows.reduce((s,r)=>s+r.profit,0), positive=rows.filter(r=>r.profit>0).length;
  summary.innerHTML=`<div class="finance-kpis"><article><span>Balanço líquido</span><strong>${money(total)}</strong><small>no período selecionado</small></article><article><span>Licitações analisadas</span><strong>${rows.length}</strong><small>com dados de precificação</small></article><article><span>Com lucro positivo</span><strong>${positive}</strong><small>licitações rentáveis</small></article></div>`;
  const months={};rows.forEach(r=>{const d=r.date||new Date();const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;months[key]=(months[key]||0)+r.profit;});const keys=Object.keys(months).sort().slice(-12);const max=Math.max(1,...keys.map(k=>Math.abs(months[k])));chart.innerHTML=keys.length?keys.map(k=>{const value=months[k],height=Math.max(6,Math.round(Math.abs(value)/max*150));return `<div class="finance-bar-wrap" title="${esc(k)}: ${esc(money(value))}"><div class="finance-bar ${value<0?'negative':''}" style="height:${height}px"><span>${money(value)}</span></div><small>${k.slice(5)}/${k.slice(0,4)}</small></div>`}).join(''):'<p class="hint">Sem dados para o período.</p>';
  tenders.innerHTML=rows.length?table(['Órgão comprador','Ver edital','Cidade / UF','Data','Balanço líquido',''],rows.map(r=>[esc(r.t.orgao||'Órgão não informado'),`<button class="action-btn" data-finance-edital="${esc(r.t.id)}">Ver edital</button>`,esc(r.t.cidade||'Cidade não informada'),r.date?dateBR(r.date,false):'-',`<strong class="${r.profit<0?'negative':'positive'}">${money(r.profit)}</strong>`,`<button class="action-btn" data-finance-tender="${esc(r.t.id)}">Ver resultado</button>`])):'<p class="hint">Nenhuma licitação encontrada no período.</p>';
  const overlay=$('#financeTenderOverlay');if(overlay)overlay.remove();
  if(state.financeEditalId){const selectedTender=state.licitacoes.find(t=>String(t.id)===String(state.financeEditalId));if(selectedTender){const items=state.itens.filter(i=>String(i.licitacao_id)===String(selectedTender.id));const panel=document.createElement('div');panel.id='financeTenderOverlay';panel.className='finance-overlay';panel.innerHTML=`<div class="finance-overlay-backdrop" data-close-finance-edital></div><article class="finance-overlay-card"><div class="panel-title"><div><h2>Edital da licitação</h2><p class="hint">${esc(selectedTender.orgao||'Órgão não informado')} • ${esc(selectedTender.cidade||'Cidade não informada')}</p></div><button class="action-btn" data-close-finance-edital>Fechar</button></div><div class="finance-overlay-grid"><div><span>Data limite</span><strong>${selectedTender.proposalEndAt?dateBR(selectedTender.proposalEndAt,true):'-'}</strong></div><div><span>Itens</span><strong>${items.length}</strong></div><div><span>Plataforma</span><strong>${esc(selectedTender.plataforma||'-')}</strong></div></div><div class="finance-overlay-actions">${selectedTender.source_url?`<a class="action-btn" href="${esc(selectedTender.source_url)}" target="_blank" rel="noopener noreferrer">Abrir no PNCP</a>`:''}<button class="action-btn" data-finance-tender="${esc(selectedTender.id)}">Ver resultado financeiro</button></div>${table(['Item','Descrição','Quantidade','Unidade'],items.map(i=>[String(i.numero),esc(i.descricao),String(i.quantidade||'-'),esc(i.unidade||'-')]))}</article>`;document.body.appendChild(panel);}}
  const selected=state.financeTenderId&&rows.find(r=>String(r.t.id)===String(state.financeTenderId));
  detail.innerHTML=selected?`<div class="finance-detail-head"><strong>${esc(selected.t.numero)}</strong><span>${money(selected.profit)}</span></div>${table(['Item','Descrição','Lucro'],state.itens.filter(i=>String(i.licitacao_id)===String(selected.t.id)).map(i=>{const p=pricing(i);return [String(i.numero),esc(i.descricao),money(Number(p?.profit||0))]}))}`:'';
}

function renderAll(){
  const companyNameEl=$('#companyName');
  if(companyNameEl) companyNameEl.textContent=state.company?.name || state.company?.nome || 'Modo demonstração';
  const userNameEl=$('#userName');
  if(userNameEl) userNameEl.textContent=profileName();
  const inviteCodeEl=$('#inviteCode');
  if(inviteCodeEl) inviteCodeEl.textContent=state.company?.invite_code || state.company?.codigo_convite || 'DEMO2026';
  $('#kpiLicitacoes').textContent=state.licitacoes.length; $('#kpiItens').textContent=state.itens.length; $('#kpiFornecedores').textContent=state.fornecedores.length;
  const ps=state.itens.map(pricing).filter(Boolean); $('#kpiLucro').textContent=money(ps.reduce((a,p)=>a+Math.max(0,Number(p.profit||0)),0));
  $('#proximasDisputas').innerHTML=table(
    ['Licitação','Órgão','Fecha propostas','Itens'],
    state.licitacoes
      .slice()
      .sort((a,b)=>{
        const ad=a.proposalEndAt?new Date(a.proposalEndAt).getTime():Number.MAX_SAFE_INTEGER;
        const bd=b.proposalEndAt?new Date(b.proposalEndAt).getTime():Number.MAX_SAFE_INTEGER;
        return ad-bd;
      })
      .map(l=>[
        esc(l.numero),
        esc(l.orgao),
        l.proposalEndAt?dateBR(l.proposalEndAt,true):'<span class="review-note">Atualize PNCP</span>',
        String(state.itens.filter(i=>i.licitacao_id===l.id).length)
      ])
  );
  const c=state.config||{}; const buckets={excelente:0,oportunidade:0,ruim:0,sem:0};
  state.itens.forEach(i=>{const p=pricing(i);if(!p || p.status==='Sem cotação' || p.status==='Sem estimado')buckets.sem++;else if(p.status==='Ruim')buckets.ruim++;else if(p.status==='Oportunidade')buckets.oportunidade++;else buckets.excelente++;});
  $('#resumoOportunidades').innerHTML=`<div class="opp"><strong>${buckets.excelente}</strong><span>Excelentes</span></div><div class="opp"><strong>${buckets.oportunidade}</strong><span>Oportunidades</span></div><div class="opp"><strong>${buckets.ruim}</strong><span>Ruins</span></div><div class="opp"><strong>${buckets.sem}</strong><span>Sem cotação</span></div>`;
  try{
    renderDashboardModel();
  }catch(err){
    console.error('Dashboard render error:',err);
    const dash=$('#dashboard');
    if(dash){
      dash.classList.remove('dashboard-model');
      const broken=$('#dashboardModelShell');
      if(broken)broken.remove();
      dash.querySelector(':scope > .cards')?.style.removeProperty('display');
      dash.querySelector(':scope > .two-col')?.style.removeProperty('display');
    }
    toast('O novo Dashboard encontrou um erro e o sistema voltou ao Dashboard padrão.','error');
  }
  renderTenderManagement();
  renderFinance();
  const supplierWithPhone=state.fornecedores.filter(f=>supplierPhone(f)).length;
  const supplierWhatsapp=state.fornecedores.filter(f=>supplierWhatsappUrl(supplierPhone(f))).length;
  const supplierList=state.fornecedores.length
    ? table(['Fornecedor','Nome fantasia','CNPJ','UF','Vendedor','WhatsApp','E-mail',''],state.fornecedores.map(f=>{
      const phone=supplierPhone(f); const whatsapp=supplierWhatsappUrl(phone);
      return [esc(f.nome),esc(f.nome_fantasia||'-'),esc(f.cnpj||'-'),esc(supplierUfFromPhone(phone)||f.uf||'-'),esc(f.vendedor||'-'),phone?`<span class="supplier-phone">${esc(supplierPhoneLabel(phone))}</span>`:'<span class="muted">Não informado</span>',f.email?`<a class="supplier-email" href="mailto:${esc(f.email)}">${esc(f.email)}</a>`:'<span class="muted">Não informado</span>',`<div class="supplier-actions">${whatsapp?`<a class="action-btn supplier-whatsapp" href="${esc(whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`:'<span class="supplier-no-contact">Sem WhatsApp</span>'}<button class="action-btn" data-edit-supplier="${esc(f.id)}">Editar</button><button class="action-btn danger-btn" data-delete="fornecedor" data-id="${esc(f.id)}">Excluir</button></div>`];
    }))
    : '<p class="hint">Nenhum fornecedor cadastrado ainda.</p>';
  $('#fornecedoresLista').innerHTML=`<div class="supplier-kpis"><article class="supplier-kpi"><span>Total de fornecedores</span><strong>${state.fornecedores.length}</strong><small>cadastrados</small></article><article class="supplier-kpi"><span>Com telefone</span><strong>${supplierWithPhone}</strong><small>contatos registrados</small></article><article class="supplier-kpi"><span>WhatsApp disponível</span><strong>${supplierWhatsapp}</strong><small>acesso em um clique</small></article></div><div class="supplier-list">${supplierList}</div>`;
  const licOpts='<option value="">Selecione a licitação</option>'+state.licitacoes.map(l=>`<option value="${l.id}">${esc(l.numero)} • ${esc(l.orgao)}</option>`).join('');
  $('#itemLicitacao').innerHTML=licOpts; $('#arquivoLicitacao').innerHTML=licOpts;
  if($('#pncpSyncTender'))$('#pncpSyncTender').innerHTML='<option value="">Selecione a licitação PNCP</option>'+state.licitacoes.filter(l=>l.pncp_control||l.source_url).map(l=>`<option value="${l.id}">${esc(l.numero)} • ${esc(l.orgao)}</option>`).join('');
  const fornOpts='<option value="">Selecione o fornecedor</option>'+state.fornecedores.map(f=>`<option value="${f.id}">${esc(f.nome)}</option>`).join('');
  if($('#cotacaoFornecedor'))$('#cotacaoFornecedor').innerHTML=fornOpts;
  $('#arquivoFornecedor').innerHTML=fornOpts;
  const importSupplier=$('#quoteImportSupplier');
  if(importSupplier){
    const selectedSupplier=state.quoteImportContext?.supplierId||importSupplier.value||'';
    importSupplier.innerHTML=fornOpts;
    if([...importSupplier.options].some(option=>String(option.value)===String(selectedSupplier)))importSupplier.value=selectedSupplier;
  }
  renderQuotesWorkspace();
  renderPricingByTender();
  renderDocumentation();
  $('#equipeLista').innerHTML=table(['Nome','Papel','Desde'],state.equipe.map(p=>[esc(p.nome),esc(p.papel==='admin'?'Administrador':'Usuário'),new Date(p.created_at).toLocaleDateString('pt-BR')]));
  for(const [k,v] of Object.entries(c)){const el=$(`#configForm [name="${k}"]`);if(el)el.value=v;}
}

function demoSeed(){
  state.demo=true;state.user={email:'demo@inova.local'};state.profile={name:'Demonstração'};state.company={id:'demo',name:'INOVA Licitações — Demonstração',invite_code:'DEMO2026'};state.config={imposto:6,margem_alvo:25,lucro_minimo:500,margem_minima:10,reserva_operacional:0};
  try{state.config={...state.config,...JSON.parse(localStorage.getItem('inova_demo_pricing_config')||'{}')}}catch{}
  state.pricingTargetsLoadedFor='';loadPricingTargets();
  state.pricingItemResultsLoadedFor='';loadLocalPricingItemResults();
  state.licitacoes=[{id:'l1',numero:'PE 050/2026',orgao:'Prefeitura Municipal',cidade:'PB',data:'2026-08-26',horario:'09:00',plataforma:'Portal de Compras Públicas',pncp_control:'11308823000103-1-000027/2026',source_url:'https://pncp.gov.br/app/editais/11308823000103/2026/27'}];
  state.itens=[{id:'i1',licitacao_id:'l1',numero:20,descricao:'Desengraxante líquido',quantidade:500,unidade:'L',valor_estimado:11.95},{id:'i2',licitacao_id:'l1',numero:21,descricao:'Detergente líquido',quantidade:300,unidade:'UN',valor_estimado:7.8}];
  state.fornecedores=[{id:'f1',nome:'Fornecedor A',frete_padrao:0},{id:'f2',nome:'Fornecedor B',frete_padrao:0}];state.cotacoes=[{id:'c1',item_id:'i1',fornecedor_id:'f1',preco:31.9,fator_equivalencia:5,frete_rateado:0,apresentacao:'Galão 5 L',marca:'Marca A'},{id:'c2',item_id:'i1',fornecedor_id:'f2',preco:7.1,fator_equivalencia:1,frete_rateado:0,apresentacao:'Frasco 1 L',marca:'Marca B'}];state.pricingMap=[];state.documentos=[];state.qualificationDocuments=[{id:'qd1',company_id:'demo',tender_id:null,document_series_id:'qs1',version:1,document_type:'FGTS/CRF',name:'Certificado de Regularidade do FGTS',issuer:'Caixa Econômica Federal',issued_on:'2026-08-01',expires_on:'2026-09-12',has_no_expiry:false,file_name:'crf-demo.pdf',storage_path:'demo/qs1/qd1-crf-demo.pdf',created_at:new Date().toISOString()}];state.qualificationError='';state.equipe=[{nome:'Administrador',papel:'admin',created_at:new Date().toISOString()}];renderAll();showOnly('appShell');
}

async function findOrCreateQuote(tenderId,supplierId,extra={}){
  let q=state.quotes.find(x=>x.tender_id===tenderId&&x.supplier_id===supplierId&&!x.source_filename);
  if(q)return q;
  const {data,error}=await supabase.from('quotes').insert({company_id:currentCompanyId(),tender_id:tenderId,supplier_id:supplierId,created_by:state.user.id,status:'manual',...extra}).select().single();
  if(error){toast(error.message,'error');return null;} state.quotes.push(data); return data;
}

$('#demoModeBtn')?.addEventListener('click',demoSeed);
$('#authDemoModeBtn')?.addEventListener('click',demoSeed);
$('#showLoginBtn').addEventListener('click',()=>{$('#showLoginBtn').classList.add('active');$('#showSignupBtn').classList.remove('active');$('#loginForm').hidden=false;$('#signupForm').hidden=true;});
$('#showSignupBtn').addEventListener('click',()=>{$('#showSignupBtn').classList.add('active');$('#showLoginBtn').classList.remove('active');$('#signupForm').hidden=false;$('#loginForm').hidden=true;});
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {data,error}=await supabase.auth.signInWithPassword({email:f.email,password:f.password});if(error)return toast(error.message,'error');state.user=data.user;await ensureProfile();await loadMembershipAndData();});
$('#signupForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {data,error}=await supabase.auth.signUp({email:f.email,password:f.password,options:{data:{nome:f.nome}}});if(error)return toast(error.message,'error');if(!data.session)return toast('Conta criada. Abra o e-mail de confirmação enviado pelo sistema.');state.user=data.user;await ensureProfile();await loadMembershipAndData();});
$('#createCompanyForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {data,error}=await supabase.rpc('create_company_with_owner',{p_name:f.nome});if(error)return toast(error.message,'error');toast(`Empresa criada. Código: ${data?.[0]?.invite_code||''}`);await loadMembershipAndData();});
$('#joinCompanyForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {error}=await supabase.rpc('join_company_by_invite',{p_invite_code:f.codigo});if(error)return toast(error.message,'error');toast('Você entrou na empresa.');await loadMembershipAndData();});
async function logout(){if(state.demo){location.reload();return;}await supabase.auth.signOut();location.reload();} $('#logoutBtn').addEventListener('click',logout);$('#logoutCompanyBtn').addEventListener('click',logout);

$('#licitacaoForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const parts=(f.cidade||'').split('/').map(x=>x.trim());const manualDate=combineDateTime(f.data,f.horario);const linkText=String(f.link_pncp||'').trim();const linkParts=linkText?pncpLinkParts(linkText):null;if(linkText&&!linkParts)return toast('Informe um link válido de edital do PNCP.','error');const sourceUrl=linkParts?`https://pncp.gov.br/app/editais/${linkParts.cnpj}/${linkParts.ano}/${linkParts.sequencial}`:'';if(state.demo){state.licitacoes.push({id:crypto.randomUUID(),numero:f.numero,orgao:f.orgao,cidade:f.cidade||'',data:f.data||'',horario:f.horario||'',plataforma:f.plataforma||'',objeto:f.objeto||'',source_url:sourceUrl,proposalEndAt:manualDate});e.target.reset();renderAll();return toast('Licitação adicionada à demonstração.');}const row={company_id:currentCompanyId(),number:f.numero,agency:f.orgao,city:parts[0]||null,state:parts[1]||null,platform:f.plataforma||null,object:f.objeto||null,dispute_at:manualDate,proposal_end_at:manualDate,source_url:sourceUrl||null,created_by:state.user.id};const {error}=await supabase.from('tenders').insert(row);if(error)return toast(error.message,'error');e.target.reset();toast('Licitação cadastrada.');await refreshAll();});
$('#itemForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo){state.itens.push({id:crypto.randomUUID(),licitacao_id:f.licitacao_id,numero:Number(f.numero),descricao:f.descricao,quantidade:Number(f.quantidade),unidade:f.unidade,valor_estimado:Number(f.valor_estimado||0)});renderAll();return;}const {error}=await supabase.from('tender_items').insert({tender_id:f.licitacao_id,item_number:Number(f.numero),description:f.descricao,quantity:Number(f.quantidade),unit:f.unidade,estimated_unit_price:Number(f.valor_estimado||0)});if(error)return toast(error.message,'error');e.target.reset();toast('Item adicionado.');await refreshAll();});
let editingSupplierId='';
$('#fornecedorForm').addEventListener('submit',async e=>{
  if(!editingSupplierId)return;
  e.preventDefault();e.stopImmediatePropagation();
  const f=Object.fromEntries(new FormData(e.target));
  const uf=supplierUfFromPhone(f.telefone); const values={name:f.nome,trade_name:f.nome_fantasia||null,cnpj:f.cnpj||null,state_uf:uf||null,contact_name:f.vendedor||null,phone:f.telefone||null,email:f.email||null};
  if(state.demo){const item=state.fornecedores.find(x=>String(x.id)===String(editingSupplierId));if(item)Object.assign(item,{nome:f.nome,nome_fantasia:f.nome_fantasia||'',cnpj:f.cnpj||'',uf,vendedor:f.vendedor||'',telefone:f.telefone||'',email:f.email||''});}
  else {const {error}=await supabase.from('suppliers').update(values).eq('id',editingSupplierId);if(error)return toast(error.message,'error');}
  editingSupplierId='';e.target.reset();e.target.hidden=true;$('#novoFornecedor').textContent='＋ Novo fornecedor';const submit=$('#fornecedorSubmit');if(submit)submit.textContent='Cadastrar fornecedor';renderAll();toast('Fornecedor atualizado.');
},true);
document.addEventListener('click',e=>{const button=e.target.closest('[data-edit-supplier]');if(!button)return;const item=state.fornecedores.find(x=>String(x.id)===String(button.dataset.editSupplier));if(!item)return;editingSupplierId=item.id;const form=$('#fornecedorForm');form.hidden=false;for(const [name,value] of Object.entries({nome:item.nome,nome_fantasia:item.nome_fantasia,cnpj:item.cnpj,vendedor:item.vendedor,telefone:item.telefone,email:item.email})){const field=form.elements.namedItem(name);if(field)field.value=value||'';}$('#novoFornecedor').textContent='× Fechar cadastro';const submit=$('#fornecedorSubmit');if(submit)submit.textContent='Salvar edição';form.elements.namedItem('nome')?.focus();});
$('#fornecedorForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const uf=supplierUfFromPhone(f.telefone);if(state.demo){state.fornecedores.push({id:crypto.randomUUID(),nome:f.nome,nome_fantasia:f.nome_fantasia||'',uf,cnpj:f.cnpj||'',vendedor:f.vendedor||'',telefone:f.telefone||'',email:f.email||'',frete_padrao:0,pedido_minimo:0,prazo_dias:null});e.target.reset();renderAll();return toast('Fornecedor adicionado à demonstração.');}const {error}=await supabase.from('suppliers').insert({company_id:currentCompanyId(),name:f.nome,trade_name:f.nome_fantasia||null,cnpj:f.cnpj||null,state_uf:uf||null,contact_name:f.vendedor||null,phone:f.telefone||null,email:f.email||null});if(error)return toast(error.message,'error');e.target.reset();toast('Fornecedor cadastrado.');await refreshAll();});
$('#novoFornecedor')?.addEventListener('click',()=>{const form=$('#fornecedorForm');if(!form)return;const open=form.hidden;form.hidden=!open;const button=$('#novoFornecedor');if(button)button.textContent=open?'× Fechar cadastro':'＋ Novo fornecedor';if(open)$('#fornecedorCnpj')?.focus();});
let supplierCnpjLookupTimer;
async function lookupSupplierCnpj(digits){
  const sources=[
    `https://publica.cnpj.ws/cnpj/${digits}`,
    `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
    `https://www.receitaws.com.br/v1/cnpj/${digits}`
  ];
  for(const url of sources){
    try{
      const response=await fetch(url,{headers:{Accept:'application/json'}});
      if(!response.ok)continue;
      const data=await response.json();
      const establishment=data.estabelecimento||data.company||{};
      const emails=[data.email,data.email_comercial,data.email_empresa,data.emailContato,establishment.email].filter(Boolean);
      const phones=[data.ddd_telefone_1,data.ddd_telefone_2,data.telefone,data.telefone1,data.telefone2,establishment.telefone1,establishment.telefone2].filter(Boolean);
      const partners=Array.isArray(data.qsa)?data.qsa:Array.isArray(data.socios)?data.socios:[];
      const contact=data.contato||data.nome_contato||data.responsavel||data.representante_legal||partners[0]?.nome||partners[0]?.nome_socio||'';
      const companyName=data.razao_social||data.nome||data.razaoSocial||establishment.razao_social||'';
      const uf=data.uf||data.estado||establishment.estado||establishment.uf||'';
      const tradeName=data.nome_fantasia||data.fantasia||establishment.nome_fantasia||'';
      if(companyName||emails[0]||phones[0]||contact)return {data:{...data,razao_social:companyName,nome_fantasia:tradeName,uf,email:emails[0]||'',telefone:supplierContactInput(phones[0]||''),contato:contact},source:url};
    }catch{}
  }
  throw new Error('CNPJ não encontrado');
}
$('#fornecedorCnpj')?.addEventListener('input',e=>{clearTimeout(supplierCnpjLookupTimer);const digits=e.target.value.replace(/\D/g,'');if(digits.length!==14)return;supplierCnpjLookupTimer=setTimeout(async()=>{const input=e.target;input.classList.add('is-loading');try{const result=await lookupSupplierCnpj(digits);const data=result.data;const form=$('#fornecedorForm');const set=(name,value)=>{const field=form?.elements?.namedItem(name);if(field&&value&&!field.value)field.value=value;};set('nome',data.razao_social||data.nome_fantasia||data.fantasia);set('email',data.email);set('uf',data.uf);toast(data.email?'Razão social, e-mail e UF preenchidos. Informe vendedor e WhatsApp manualmente.':'Empresa encontrada; o cadastro público não informa e-mail. Preencha-o manualmente.');}catch(error){toast('Não foi possível localizar dados públicos para este CNPJ. Preencha os campos manualmente.','error');}finally{input.classList.remove('is-loading');}},650);});
$('#cotacaoForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const f=Object.fromEntries(new FormData(e.target));
  const item=state.itens.find(i=>String(i.id)===String(f.item_id));
  const price=Number(f.preco);
  const factor=Number(f.fator_equivalencia);
  const freight=Number(f.frete_rateado||0);
  if(!item||String(item.licitacao_id)!==String(state.quoteViewTenderId))return toast('Selecione um item do edital ativo.','error');
  if(!f.fornecedor_id)return toast('Selecione o fornecedor.','error');
  if(!Number.isFinite(price)||price<=0)return toast('Informe um preço maior que zero.','error');
  if(!Number.isFinite(factor)||factor<=0)return toast('A quantidade por embalagem deve ser maior que zero.','error');
  if(!Number.isFinite(freight)||freight<0)return toast('O frete não pode ser negativo.','error');

  if(state.demo){
    state.cotacoes.push({id:crypto.randomUUID(),item_id:f.item_id,fornecedor_id:f.fornecedor_id,preco:price,fator_equivalencia:factor,frete_rateado:freight,apresentacao:f.apresentacao||'',marca:f.marca||''});
    e.target.reset();
    $('#cotacaoFator').value='1';
    $('#cotacaoFrete').value='0';
    state.quoteWorkspaceMode='list';
    renderAll();
    return toast('Cotação adicionada à demonstração.');
  }

  const q=await findOrCreateQuote(item.licitacao_id,f.fornecedor_id);
  if(!q)return;
  const {error}=await supabase.from('quote_items').insert({quote_id:q.id,tender_item_id:f.item_id,supplier_description:item.descricao,brand:f.marca||null,package_description:f.apresentacao||null,package_base_quantity:factor,unit_price:price,freight_per_package:freight});
  if(error)return toast(error.message,'error');
  e.target.reset();
  $('#cotacaoFator').value='1';
  $('#cotacaoFrete').value='0';
  state.quoteWorkspaceMode='list';
  toast('Cotação salva.');
  await refreshAll();
});
$('#configForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo){state.config=Object.fromEntries(Object.entries(f).map(([k,v])=>[k,Number(v||0)]));try{localStorage.setItem('inova_demo_pricing_config',JSON.stringify(state.config));}catch{}renderAll();return toast('Regras atualizadas neste navegador.');}const row={company_id:currentCompanyId(),tax_percent:Number(f.imposto||0),target_margin_percent:Number(f.margem_alvo||0),minimum_profit_amount:Number(f.lucro_minimo||0),minimum_margin_percent:Number(f.margem_minima||0),operational_reserve_percent:Number(f.reserva_operacional||0),updated_at:new Date().toISOString()};const {error}=await supabase.from('pricing_settings').upsert(row,{onConflict:'company_id'});if(error)return toast(error.message,'error');toast('Regras salvas.');await refreshAll();});

async function tenderDocumentHasValidSignature(file,extension){
  const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
  if(extension==='pdf')return bytes.length>=5&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46&&bytes[4]===0x2d;
  if(extension==='docx')return bytes[0]===0x50&&bytes[1]===0x4b&&(
    (bytes[2]===0x03&&bytes[3]===0x04)||
    (bytes[2]===0x05&&bytes[3]===0x06)||
    (bytes[2]===0x07&&bytes[3]===0x08)
  );
  if(extension==='doc')return [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((value,index)=>bytes[index]===value);
  return false;
}

$('#tenderDocumentForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const values=new FormData(form);
  const tenderId=String(values.get('licitacao_id')||'');
  const file=values.get('arquivo');
  const submit=form.querySelector('button[type="submit"]');
  if(state.demo||!configured||!supabase)return toast('O arquivamento privado funciona somente no modo online.','error');
  if(!currentMemberIsAdmin())return toast('Somente administradores podem adicionar ou substituir editais.','error');
  if(state.tenderDocumentsError)return toast(state.tenderDocumentsError,'error');
  if(!state.licitacoes.some(tender=>String(tender.id)===tenderId))return toast('Selecione uma licitação válida.','error');
  if(!file?.name)return toast('Selecione o arquivo PDF, DOC ou DOCX do edital.','error');
  const extension=file.name.toLowerCase().split('.').pop()||'';
  if(!TENDER_DOCUMENT_EXTENSIONS.has(extension))return toast('Formato não suportado. Use PDF, DOC ou DOCX.','error');
  if(file.size<1||file.size>MAX_QUOTE_FILE_SIZE)return toast('O arquivo deve ter no máximo 25 MB.','error');
  const expectedMime=TENDER_DOCUMENT_MIME_TYPES[extension];
  const declaredMime=String(file.type||'').toLowerCase();
  if(!['','application/octet-stream',expectedMime].includes(declaredMime))return toast('O tipo do arquivo não corresponde à extensão PDF, DOC ou DOCX informada.','error');
  if(!await tenderDocumentHasValidSignature(file,extension))return toast('O conteúdo do arquivo não corresponde a um PDF, DOC ou DOCX válido.','error');

  const existing=state.tenderDocuments.find(document=>String(document.tender_id)===tenderId);
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${currentCompanyId()}/${tenderId}/${Date.now()}-${safeName}`;
  const now=new Date().toISOString();
  const oldText=submit?.textContent||'Enviar edital';
  if(submit){submit.disabled=true;submit.textContent='Enviando…';}
  setTenderDocumentStatus('Enviando o edital para a área privada…');
  try{
    const {error:uploadError}=await supabase.storage.from('tender-files').upload(path,file,{upsert:false,contentType:expectedMime});
    if(uploadError)throw uploadError;
    const metadata={
      id:existing?.id||crypto.randomUUID(),
      company_id:currentCompanyId(),
      tender_id:tenderId,
      file_name:file.name,
      mime_type:expectedMime,
      file_size:file.size,
      storage_path:path,
      created_by:state.user.id,
      created_at:existing?.created_at||now,
      updated_at:now
    };
    const {error:metadataError}=await supabase.from('tender_documents').upsert(metadata,{onConflict:'tender_id'});
    if(metadataError){
      await supabase.storage.from('tender-files').remove([path]);
      throw metadataError;
    }
    let cleanupWarning=false;
    if(existing?.storage_path&&existing.storage_path!==path){
      const {error:removeError}=await supabase.storage.from('tender-files').remove([existing.storage_path]);
      if(removeError){cleanupWarning=true;console.warn('Limpeza do edital anterior:',removeError.message);}
    }
    form.reset();
    await refreshAll();
    if($('#tenderDocumentTender'))$('#tenderDocumentTender').value=tenderId;
    const message=cleanupWarning
      ? 'Edital atualizado. O arquivo anterior não pôde ser removido automaticamente e deve ser revisado por um administrador.'
      : 'Edital vigente atualizado com segurança.';
    setTenderDocumentStatus(message,cleanupWarning?'error':'success');
    toast(message,cleanupWarning?'error':'success');
  }catch(error){
    console.warn('Upload do edital:',error?.message||error);
    setTenderDocumentStatus('Não foi possível enviar o edital. Verifique seu acesso e tente novamente.','error');
    toast('Não foi possível enviar o edital. Verifique seu acesso e tente novamente.','error');
  }finally{
    if(submit){submit.disabled=!currentMemberIsAdmin()||Boolean(state.tenderDocumentsError);submit.textContent=oldText;}
  }
});

async function qualificationPdfHasValidSignature(file){
  const bytes=new Uint8Array(await file.slice(0,5).arrayBuffer());
  return bytes.length>=4&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46;
}

$('#qualificationNoExpiry')?.addEventListener('change',event=>{
  const expiry=$('#qualificationExpiresOn');
  if(!expiry)return;
  expiry.disabled=event.currentTarget.checked;
  expiry.required=!event.currentTarget.checked;
  if(event.currentTarget.checked)expiry.value='';
});

$('#qualificationRenewCancel')?.addEventListener('click',cancelQualificationRenewal);

$('#qualificationDocumentForm')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  const values=new FormData(form);
  const file=values.get('file');
  const tenderId=String(values.get('tender_id')||'');
  const hasNoExpiry=values.get('has_no_expiry')==='on';
  const issuedOn=String(values.get('issued_on')||'');
  const expiresOn=String(values.get('expires_on')||'');
  const submit=$('#qualificationDocumentSubmit');
  if(state.demo||!configured||!supabase)return toast('O arquivamento privado funciona somente no modo online.','error');
  if(!currentMemberIsAdmin())return toast('Somente administradores podem cadastrar documentos fiscais.','error');
  if(state.qualificationError)return toast(state.qualificationError,'error');
  if(tenderId&&!state.licitacoes.some(tender=>String(tender.id)===tenderId))return toast('Selecione um pregão válido ou deixe como documento geral.','error');
  if(!file?.name)return toast('Selecione o arquivo PDF.','error');
  if(file.name.toLowerCase().split('.').pop()!=='pdf')return toast('Formato não suportado. Use PDF.','error');
  if(file.size<1||file.size>QUALIFICATION_FILE_SIZE_LIMIT)return toast('O PDF deve ter no máximo 25 MB.','error');
  if(!QUALIFICATION_PDF_MIME_TYPES.has(String(file.type||'').toLowerCase()))return toast('O tipo do arquivo não corresponde a um PDF.','error');
  if(!await qualificationPdfHasValidSignature(file))return toast('O conteúdo não possui a assinatura de um PDF válido.','error');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(issuedOn))return toast('Informe uma data de emissão válida.','error');
  if(!hasNoExpiry&&!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn))return toast('Informe a validade ou marque “sem validade definida”.','error');
  if(!hasNoExpiry&&dateOrdinal(expiresOn)<dateOrdinal(issuedOn))return toast('A validade não pode ser anterior à emissão.','error');

  const seriesId=String(values.get('document_series_id')||'')||crypto.randomUUID();
  const versions=state.qualificationDocuments.filter(document=>String(document.document_series_id)===seriesId);
  const version=Math.max(0,...versions.map(document=>Number(document.version||1)))+1;
  const id=crypto.randomUUID();
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${currentCompanyId()}/${seriesId}/${id}-${safeName}`;
  const oldText=submit?.textContent||'Cadastrar documento';
  if(submit){submit.disabled=true;submit.textContent='Enviando…';}
  setQualificationDocumentStatus('Enviando o PDF para a área privada…');
  try{
    const {error:uploadError}=await supabase.storage.from('qualification-files').upload(path,file,{upsert:false,contentType:'application/pdf'});
    if(uploadError)throw uploadError;
    const metadata={
      id,company_id:currentCompanyId(),tender_id:tenderId||null,document_series_id:seriesId,version,
      document_type:String(values.get('document_type')||'').trim(),name:String(values.get('name')||'').trim(),issuer:String(values.get('issuer')||'').trim(),
      document_number:String(values.get('document_number')||'').trim()||null,issued_on:issuedOn,expires_on:hasNoExpiry?null:expiresOn,
      has_no_expiry:hasNoExpiry,coverage:String(values.get('coverage')||'').trim()||null,notes:String(values.get('notes')||'').trim()||null,
      file_name:file.name,mime_type:'application/pdf',file_size:file.size,storage_path:path,created_by:state.user.id
    };
    const {error:metadataError}=await supabase.from('qualification_documents').insert(metadata);
    if(metadataError){await supabase.storage.from('qualification-files').remove([path]);throw metadataError;}
    cancelQualificationRenewal();
    await refreshAll();
    activateDocumentTab('habilitacao');
    setQualificationDocumentStatus(version>1?'Documento renovado; a versão anterior foi preservada.':'Documento fiscal cadastrado com segurança.','success');
    toast(version>1?'Documento renovado com histórico preservado.':'Documento fiscal cadastrado.');
  }catch(error){
    console.warn('Upload de habilitação fiscal:',error?.message||error);
    setQualificationDocumentStatus('Não foi possível cadastrar o documento. Verifique a configuração e tente novamente.','error');
    toast('Não foi possível cadastrar o documento fiscal.','error');
  }finally{
    if(submit){submit.disabled=!currentMemberIsAdmin()||Boolean(state.qualificationError);submit.textContent=state.qualificationRenewSeriesId?'Salvar renovação':'Cadastrar documento';}
  }
});

$('#arquivoForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=new FormData(e.target),file=f.get('arquivo');
  if(!file?.name)return;
  if(state.demo || !configured || !supabase)return toast('O arquivamento privado funciona somente no modo online.','error');
  const ext=file.name.toLowerCase().split('.').pop()||'';
  if(!QUOTE_FILE_EXTENSIONS.has(ext))return toast('Formato não suportado. Use PDF, Excel ou CSV.','error');
  if(file.size>MAX_QUOTE_FILE_SIZE)return toast('O arquivo excede o limite de 25 MB.','error');
  if(file.type && !QUOTE_FILE_MIME_TYPES.has(String(file.type).toLowerCase()))return toast('O tipo do arquivo não corresponde a PDF, Excel ou CSV.','error');

  const tenderId=f.get('licitacao_id'),supplierId=f.get('fornecedor_id');
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const inferredMime={pdf:'application/pdf',csv:'text/csv',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}[ext];
  const {data:q,error:qErr}=await supabase.from('quotes').insert({company_id:currentCompanyId(),tender_id:tenderId,supplier_id:supplierId,source_filename:file.name,source_type:ext,status:'uploaded',created_by:state.user.id}).select().single();
  if(qErr)return toast(qErr.message,'error');
  const path=`${currentCompanyId()}/${q.id}/${Date.now()}-${safe}`;
  const contentType=!file.type||file.type==='application/octet-stream'?inferredMime:file.type;
  const {error:upErr}=await supabase.storage.from('quote-files').upload(path,file,{upsert:false,contentType});
  if(upErr){await supabase.from('quotes').delete().eq('id',q.id);return toast(upErr.message,'error');}
  const {error:uErr}=await supabase.from('quotes').update({storage_path:path}).eq('id',q.id);
  if(uErr){
    await supabase.storage.from('quote-files').remove([path]);
    await supabase.from('quotes').delete().eq('id',q.id);
    return toast(uErr.message,'error');
  }
  e.target.reset();toast('Cotação arquivada com segurança. Use a aba Cotações para ler e relacionar os itens.');await refreshAll();
});

$('#copyInviteBtn').addEventListener('click',async()=>{const code=state.company?.invite_code||'DEMO2026';try{await navigator.clipboard.writeText(code);toast('Código copiado.');}catch{toast(`Código: ${code}`);}});
document.addEventListener('click',async e=>{
  const directSync=e.target.closest('[data-direct-pncp-sync]');
  if(directSync){
    if(state.demo || !configured || !supabase || !state.user){
      toast('A sincronização PNCP exige uma sessão online.','error');
      return;
    }
    const id=directSync.dataset.directPncpSync;
    const l=state.licitacoes.find(x=>String(x.id)===String(id));
    if(!l?.pncp_control)return;
    directSync.disabled=true;
    const oldText=directSync.textContent;
    directSync.textContent='Sincronizando…';
    try{
      const {data,error}=await supabase.functions.invoke('pncp-import',{body:{query:l.pncp_control}});
      if(error || data?.error || data?.mode!=='detail')throw new Error(error?.message||data?.error||'Falha ao consultar o PNCP');

      const t=data.tender||{};
      const {error:updateError}=await supabase.from('tenders').update({
        dispute_at:t.dataEncerramentoProposta || t.dataAberturaProposta || null,
        publication_at:t.dataPublicacaoPncp || null,
        proposal_open_at:t.dataAberturaProposta || null,
        proposal_end_at:t.dataEncerramentoProposta || null,
        updated_at:new Date().toISOString()
      }).eq('id',l.id);
      if(updateError)throw updateError;

      const existing=state.itens.filter(i=>String(i.licitacao_id)===String(l.id));
      const byNumber=new Map(existing.map(i=>[Number(i.numero),i]));
      for(const row of (data.items||[])){
        const numero=Number(row.numeroItem||0);
        if(!numero)continue;
        const payload={
          tender_id:l.id,item_number:numero,description:String(row.descricao||'Item PNCP'),
          quantity:Number(row.quantidade||1),unit:String(row.unidadeMedida||'UN'),
          estimated_unit_price:row.valorUnitarioEstimado==null?null:Number(row.valorUnitarioEstimado)
        };
        const old=byNumber.get(numero);
        if(old)await supabase.from('tender_items').update(payload).eq('id',old.id);
        else await supabase.from('tender_items').insert(payload);
      }
      await refreshAll();
      toast('PNCP sincronizado: datas, prazo e itens atualizados.');
    }catch(err){
      toast(`Erro ao sincronizar PNCP: ${err.message||err}`,'error');
    }finally{
      directSync.disabled=false;
      directSync.textContent=oldText;
    }
    return;
  }

  const addTenderDocument=e.target.closest('[data-add-tender-document]');
  if(addTenderDocument){
    document.querySelector('#mainTabs [data-tab="arquivos"]')?.click();
    activateDocumentTab('editais');
    const select=$('#tenderDocumentTender');
    if(select){select.value=addTenderDocument.dataset.addTenderDocument;select.focus();}
    $('#documentPanelEditais')?.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }

  const downloadTenderDocument=e.target.closest('[data-download-tender-document]');
  if(downloadTenderDocument){
    const document=state.tenderDocuments.find(row=>String(row.id)===String(downloadTenderDocument.dataset.downloadTenderDocument));
    if(!document)return toast('Edital não encontrado. Atualize a página e tente novamente.','error');
    await downloadPrivateDocument('tender-files',document.storage_path,document.file_name,downloadTenderDocument);
    return;
  }

  const openTenderDocument=e.target.closest('[data-open-tender-document]');
  if(openTenderDocument){
    await openPrivateTenderPdf(openTenderDocument.dataset.openTenderDocument,openTenderDocument);
    return;
  }

  const downloadQuoteDocument=e.target.closest('[data-download-quote-document]');
  if(downloadQuoteDocument){
    const document=state.documentos.find(row=>String(row.id)===String(downloadQuoteDocument.dataset.downloadQuoteDocument));
    if(!document)return toast('Cotação não encontrada. Atualize a página e tente novamente.','error');
    await downloadPrivateDocument('quote-files',document.storage_path,document.nome_arquivo,downloadQuoteDocument);
    return;
  }

  const qualificationFilter=e.target.closest('[data-qualification-filter]');
  if(qualificationFilter){
    state.qualificationFilter=qualificationFilter.dataset.qualificationFilter||'all';
    renderQualification();
    return;
  }

  const downloadQualification=e.target.closest('[data-download-qualification-document]');
  if(downloadQualification){
    const document=state.qualificationDocuments.find(row=>String(row.id)===String(downloadQualification.dataset.downloadQualificationDocument));
    if(!document)return toast('Documento fiscal não encontrado. Atualize a página e tente novamente.','error');
    await downloadPrivateDocument('qualification-files',document.storage_path,document.file_name,downloadQualification);
    return;
  }

  const renewQualification=e.target.closest('[data-renew-qualification-document]');
  if(renewQualification){
    if(!currentMemberIsAdmin())return toast('Somente administradores podem renovar documentos.','error');
    const seriesId=renewQualification.dataset.renewQualificationDocument;
    const document=state.qualificationDocuments.filter(row=>String(row.document_series_id||row.id)===String(seriesId)).sort((a,b)=>Number(b.version||1)-Number(a.version||1))[0];
    const form=$('#qualificationDocumentForm');
    if(!document||!form)return;
    state.qualificationRenewSeriesId=seriesId;
    $('#qualificationDocumentSeries').value=seriesId;
    form.elements.tender_id.value=document.tender_id||'';
    form.elements.document_type.value=document.document_type||'';
    form.elements.name.value=document.name||'';
    form.elements.issuer.value=document.issuer||'';
    form.elements.document_number.value=document.document_number||'';
    form.elements.coverage.value=document.coverage||'';
    form.elements.notes.value=document.notes||'';
    form.elements.issued_on.value='';
    form.elements.expires_on.value='';
    form.elements.has_no_expiry.checked=false;
    form.elements.expires_on.disabled=false;
    form.elements.expires_on.required=true;
    $('#qualificationDocumentSubmit').textContent='Salvar renovação';
    $('#qualificationRenewCancel').hidden=false;
    setQualificationDocumentStatus(`Renovando ${document.name}. Selecione o novo PDF e informe as novas datas.`);
    form.scrollIntoView({behavior:'smooth',block:'start'});
    form.elements.issued_on.focus();
    return;
  }

  const openQuoteDocument=e.target.closest('[data-open-quote-document]');
  if(openQuoteDocument){
    state.quoteViewTenderId=openQuoteDocument.dataset.openQuoteDocument||'';
    state.quoteWorkspaceMode='list';
    renderQuotesWorkspace();
    document.querySelector('#mainTabs [data-tab="cotacoes"]')?.click();
    return;
  }

  const removeQuoteBtn=e.target.closest('[data-remove-item-quotes]');
  if(removeQuoteBtn){
    await removeAllQuotesFromItem(removeQuoteBtn.dataset.removeItemQuotes);
    return;
  }

  const btn=e.target.closest('[data-delete]');if(!btn)return;if(!confirm('Deseja excluir este registro?'))return;if(state.demo){if(btn.dataset.delete==='licitacao'){const tenderItems=state.itens.filter(i=>String(i.licitacao_id)===String(btn.dataset.id)).map(i=>String(i.id));state.licitacoes=state.licitacoes.filter(x=>String(x.id)!==String(btn.dataset.id));state.itens=state.itens.filter(x=>String(x.licitacao_id)!==String(btn.dataset.id));state.cotacoes=state.cotacoes.filter(x=>!tenderItems.includes(String(x.item_id)));}else{state.fornecedores=state.fornecedores.filter(x=>String(x.id)!==String(btn.dataset.id));state.cotacoes=state.cotacoes.filter(x=>String(x.fornecedor_id)!==String(btn.dataset.id));}renderAll();return toast('Registro removido da demonstração.');}const {error}=await supabase.from(btn.dataset.delete==='licitacao'?'tenders':'suppliers').delete().eq('id',btn.dataset.id);if(error)return toast(error.message,'error');await refreshAll();
});
document.querySelectorAll('.tabs button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tabs button,.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#'+btn.dataset.tab).classList.add('active');}));
$('#financePeriod')?.addEventListener('change',e=>{state.financePeriod=e.target.value;state.financeTenderId='';renderFinance();});
document.addEventListener('click',e=>{const close=e.target.closest('[data-close-finance-edital]');if(close){state.financeEditalId='';renderFinance();return;}const edital=e.target.closest('[data-finance-edital]');if(edital){state.financeEditalId=edital.dataset.financeEdital;renderFinance();}});
document.addEventListener('click',e=>{const button=e.target.closest('[data-finance-tender]');if(!button)return;state.financeTenderId=button.dataset.financeTender;renderFinance();});
document.addEventListener('click',async e=>{const refresh=e.target.closest('[data-refresh-pricing-items]');if(refresh){await refreshAll();toast('Itens atualizados.');return;}const undo=e.target.closest('[data-pricing-undo]');if(undo&&state.pricingUndoStack?.length){const action=state.pricingUndoStack.pop();state.pricingRedoStack=state.pricingRedoStack||[];state.pricingRedoStack.push(action);if(state.demo){state.itens.push(action.item);state.cotacoes.push(...action.quotes);}else{await supabase.from('tender_items').insert(action.item.raw||action.item);await refreshAll();}renderAll();toast('Exclusão desfeita.');return;}const redo=e.target.closest('[data-pricing-redo]');if(redo&&state.pricingRedoStack?.length){const action=state.pricingRedoStack.pop();state.pricingUndoStack=state.pricingUndoStack||[];state.pricingUndoStack.push(action);if(state.demo){state.itens=state.itens.filter(item=>String(item.id)!==String(action.item.id));state.cotacoes=state.cotacoes.filter(q=>String(q.item_id)!==String(action.item.id));}else{await supabase.from('tender_items').delete().eq('id',action.item.id);await refreshAll();}renderAll();toast('Exclusão refeita.');return;}const button=e.target.closest('[data-delete-pricing-item]');if(!button)return;if(!confirm('Excluir este item da licitação?'))return;const id=button.dataset.deletePricingItem;const item=state.itens.find(x=>String(x.id)===String(id));const quotes=state.cotacoes.filter(q=>String(q.item_id)===String(id));state.pricingUndoStack=state.pricingUndoStack||[];state.pricingRedoStack=[];state.pricingUndoStack.push({item,quotes});if(state.demo){state.itens=state.itens.filter(item=>String(item.id)!==String(id));state.cotacoes=state.cotacoes.filter(quote=>String(quote.item_id)!==String(id));renderAll();toast('Item excluído.');return;}const {error}=await supabase.from('tender_items').delete().eq('id',id);if(error)return toast(error.message,'error');await refreshAll();toast('Item excluído.');});

document.addEventListener('click',async e=>{
  const refresh=e.target.closest('[data-refresh-quote-items]');
  if(refresh){
    const tenderId=String(state.quoteViewTenderId||'');
    if(tenderId)delete state.quoteExcludedItems[tenderId];
    state.quoteUndoStack=[];state.quoteRedoStack=[];
    await refreshAll();
    toast('Itens originais da cotação restaurados.');
    return;
  }
  const undo=e.target.closest('[data-quote-undo]');
  if(undo&&state.quoteUndoStack?.length){
    const currentTender=String(state.quoteViewTenderId||'');const index=state.quoteUndoStack.map(action=>String(action.tenderId)).lastIndexOf(currentTender);if(index<0)return;
    const action=state.quoteUndoStack.splice(index,1)[0];
    const key=String(action.tenderId);const list=state.quoteExcludedItems[key]||[];
    state.quoteExcludedItems[key]=list.filter(id=>String(id)!==String(action.itemId));
    state.quoteRedoStack=state.quoteRedoStack||[];state.quoteRedoStack.push(action);
    renderQuotesWorkspace();toast('Exclusão desfeita.');return;
  }
  const redo=e.target.closest('[data-quote-redo]');
  if(redo&&state.quoteRedoStack?.length){
    const currentTender=String(state.quoteViewTenderId||'');const index=state.quoteRedoStack.map(action=>String(action.tenderId)).lastIndexOf(currentTender);if(index<0)return;
    const action=state.quoteRedoStack.splice(index,1)[0];const key=String(action.tenderId);
    state.quoteExcludedItems[key]=Array.from(new Set([...(state.quoteExcludedItems[key]||[]),String(action.itemId)]));
    state.quoteUndoStack=state.quoteUndoStack||[];state.quoteUndoStack.push(action);
    renderQuotesWorkspace();toast('Exclusão refeita.');return;
  }
  const remove=e.target.closest('[data-quote-delete-item]');
  if(!remove)return;
  if(!confirm('Excluir este item somente da cotação?'))return;
  const tenderId=String(state.quoteViewTenderId||'');const itemId=String(remove.dataset.quoteDeleteItem||'');
  if(!tenderId||!itemId)return;
  state.quoteExcludedItems[tenderId]=Array.from(new Set([...(state.quoteExcludedItems[tenderId]||[]),itemId]));
  state.quoteUndoStack=state.quoteUndoStack||[];state.quoteRedoStack=[];state.quoteUndoStack.push({tenderId,itemId});
  renderQuotesWorkspace();toast('Item removido desta cotação.');
});
document.querySelectorAll('[data-document-tab]').forEach(button=>{
  button.addEventListener('click',()=>activateDocumentTab(button.dataset.documentTab));
  button.addEventListener('keydown',event=>{
    const tabs=[...document.querySelectorAll('[data-document-tab]')];
    const index=tabs.indexOf(button);
    let next=-1;
    if(event.key==='ArrowRight')next=(index+1)%tabs.length;
    if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=tabs.length-1;
    if(next<0)return;
    event.preventDefault();
    activateDocumentTab(tabs[next].dataset.documentTab,true);
  });
});
let deferredInstallPrompt=null;
const installBtn=$('#installBtn');
const isStandaloneApp=()=>window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
const isIosDevice=()=>/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
function updateInstallButton(){
  if(!installBtn)return;
  const installed=isStandaloneApp();
  installBtn.textContent=installed?'App instalado':'Instalar App';
  installBtn.disabled=installed;
  installBtn.setAttribute('aria-disabled',String(installed));
  installBtn.title=installed?'O INOVA Licitações já está instalado neste dispositivo.':'Instalar o INOVA Licitações neste dispositivo.';
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  updateInstallButton();
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  updateInstallButton();
  toast('App instalado com sucesso.');
});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change',updateInstallButton);
installBtn?.addEventListener('click',async()=>{
  if(isStandaloneApp()){
    updateInstallButton();
    return toast('O app já está instalado neste dispositivo.');
  }
  if(deferredInstallPrompt){
    const prompt=deferredInstallPrompt;
    deferredInstallPrompt=null;
    try{
      await prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice?.outcome==='dismissed')toast('Instalação cancelada. Você pode tentar novamente pelo menu do navegador.');
    }catch(error){
      console.warn('Instalação do app:',error?.message||error);
      toast('Use o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.');
    }
    updateInstallButton();
    return;
  }
  if(isIosDevice())return toast('No iPhone ou iPad, toque em Compartilhar e depois em “Adicionar à Tela de Início”.');
  toast('Abra o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.');
});
updateInstallButton();
if('serviceWorker' in navigator)window.addEventListener('load',async()=>{
  try{
    const isLocal=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
    if(isLocal){
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.filter(reg=>reg.scope.startsWith(location.origin)).map(reg=>reg.unregister()));
      return;
    }
    const registration=await navigator.serviceWorker.register('./service-worker.js',{scope:'./'});
    let updatePending=false;
    let reloading=false;
    let hasLeftTab=false;
    const applyWhenReturning=()=>{
      if(document.visibilityState!=='visible'||!updatePending||!hasLeftTab||reloading)return;
      reloading=true;
      // A troca de versão só é aplicada quando o usuário volta para esta aba.
      window.location.reload();
    };
    registration.addEventListener('updatefound',()=>{
      const installing=registration.installing;
      if(!installing)return;
      installing.addEventListener('statechange',()=>{
        if(installing.state==='installed'&&navigator.serviceWorker.controller){
          updatePending=true;
          applyWhenReturning();
        }
      });
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden'){hasLeftTab=true;registration.update().catch(()=>{});}
      else applyWhenReturning();
    });
  }catch(err){console.warn('Service worker:',err?.message||err);}
});
if(configured)supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')showOnly('authScreen');if(event==='SIGNED_IN'&&session)state.user=session.user;});

$('#simItem')?.addEventListener('change', () => {
  const item = state.itens.find(i => i.id === $('#simItem').value);
  const p = item ? pricing(item) : null;

  if(item && p && p.targetUnit){
    $('#simBid').value = Number(p.targetUnit).toFixed(4);
  } else {
    $('#simBid').value = '';
  }

  renderBidSimulator();
});

$('#simBid')?.addEventListener('input', renderBidSimulator);

initAppearanceControls();

$('#pncpYear') && ($('#pncpYear').value = new Date().getFullYear());

$('#pncpSearchForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const f=Object.fromEntries(new FormData(e.target));
  await searchPncp(String(f.query||'').trim());
});

document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-pncp-control],[data-pncp-cnpj]');
  if(btn && btn.classList.contains('pncp-open-btn')){
    await openPncpResult(btn);
  }
});



$('#quoteWorkspaceTender')?.addEventListener('change',e=>{
  state.quoteViewTenderId=e.target.value||'';
  const importTender=$('#quoteImportTender');
  if(importTender)importTender.value=state.quoteViewTenderId;
  clearQuoteImportPreview('O edital mudou. Leia o arquivo novamente para revisar os itens corretos.');
  state.quoteWorkspaceMode='import';
  state.quoteWorkspaceSection='import';
  renderQuotesWorkspace();
  startAutomaticQuoteImport();
});
$('#quoteNewBtn')?.addEventListener('click',()=>{state.quoteWorkspaceMode='import';state.quoteWorkspaceSection='import';renderQuotesWorkspace();document.querySelector('#quoteImportSupplier')?.focus();});
document.addEventListener('click',e=>{if(e.target.closest('#quoteExportPdf'))exportQuotePdf();if(e.target.closest('#quoteExportWord'))exportQuoteWord();});
document.querySelectorAll('[data-quote-section]').forEach(button=>button.addEventListener('click',()=>{
  setQuoteWorkspaceSection(button.dataset.quoteSection||'import');
}));
$('#quoteImportTender')?.addEventListener('change',()=>clearQuoteImportPreview('O edital mudou. Leia o arquivo novamente.'));
$('#quoteImportSupplier')?.addEventListener('change',()=>startAutomaticQuoteImport());
$('#quoteImportFile')?.addEventListener('change',()=>startAutomaticQuoteImport());
$('#quoteRetryBtn')?.addEventListener('click',()=>startAutomaticQuoteImport(true));
$('#quoteWorkspaceSearch')?.addEventListener('input',e=>{
  state.quoteWorkspaceSearch=e.target.value||'';
  renderQuoteTenderComparison();
});
document.querySelectorAll('[data-quote-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  state.quoteWorkspaceFilter=btn.dataset.quoteFilter||'all';
  renderQuoteTenderComparison();
}));
$('#pncpSyncBtn')?.addEventListener('click',syncPncpItems);

document.addEventListener('input',e=>{
  if(e.target.closest('[data-quote-row]'))syncQuoteRowsFromDom();
});
document.addEventListener('change',e=>{
  const tr=e.target.closest('[data-quote-row]');
  if(!tr)return;
  syncQuoteRowsFromDom();

  if(e.target.dataset.qField==='itemId'){
    const i=Number(tr.dataset.quoteRow);
    const row=state.quoteImportRows[i];
    if(row){
      const item=state.itens.find(x=>x.id===row.itemId);
      row.editalItemNumber=item?Number(item.numero):null;
      row.manualMatched=Boolean(row.itemId);
      row.itemSearch=row.itemId ? (row.itemSearch||'') : '';
    }
    renderQuoteImportPreview();
  }
});

document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-sync-pncp]');
  if(!btn)return;
  const select=$('#pncpSyncTender');
  if(select)select.value=btn.dataset.syncPncp;
  await syncPncpItems();
});

setupManualQuoteMode();
boot();
