Warning: truncated output (original token count: 77786)
Total output lines: 8404

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
  licitacoes:[], itens:[], fornecedores:[], quotes:[], cotacoes:[], pricingMap:[], documentos:[], equipe:[], pncpPreview:null, quoteImportRows:[], quoteImportContext:null, quoteImportRunToken:'', quoteImportBusy:false, quoteImportLastError:false, quoteViewTenderId:'', quoteWorkspaceMode:'import', quoteWorkspaceSearch:'', quoteWorkspaceFilter:'all', pricingViewTenderId:'', quoteImportFilter:'', quoteOnlyUnrelated:false, quoteSupplierSearches:{}, pricingOnlyMissing:false, dashboardCalendarDate:null, pricingTargets:{}, pricingTargetsLoadedFor:'', pricingSimulations:{}, pricingSimulationItemId:'', costConfig:{frete_fixo:0, gasolina:0, outros_impostos:0}, demo:false
};

const MAX_QUOTE_FILE_SIZE=25*1024*1024;
const QUOTE_PARSER_VERSION='36.11.2';
const QUOTE_FILE_EXTENSIONS=new Set(['pdf','xlsx','xls','csv']);
const QUOTE_FILE_MIME_TYPES=new Set([
  'application/pdf','text/csv','application/csv','application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/octet-stream',''
]);

function toast(msg,type='success'){
  const el=$('#toast'); el.textContent=msg; el.className=`toast ${type}`; el.hidden=false;
  clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.hidden=true,4000);
}
function showOnly(id){ ['setupScreen','authScreen','companyScreen','appShell'].forEach(x=>$('#'+x).hidden=x!==id); }
function table(headers,rows){
  if(!rows.length) return '<p class="hint">Nenhum registro ainda.</p>';
  return `<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
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

function setPncpStatus(message,type='loading'){
  const el=$('#pncpSearchStatus');
  if(!el)return;
  el.hidden=!message;
  el.className=`pncp-status ${type}`;
  el.textContent=message||'';
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

  setPncpStatus('Consultando o PNCP…','loading');
  if(state.demo || !configured || !supabase || !state.user){
    setPncpStatus('A consulta ao PNCP exige uma sessão online. No modo demonstração, use os editais fictícios já carregados.','warn');
    return;
  }

  let data,error;
  try{
    ({data,error}=await supabase.functions.invoke('pncp-import',{
      body:{query}
    }));
  }catch(err){
    setPncpStatus(`Não foi possível consultar o PNCP: ${err?.message||err}`,'error');
    return;
  }

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
  setPncpStatus('Carregando dados e itens do edital…','loading');
  clearPncpPreview();
  if(state.demo || !configured || !supabase || !state.user){
    setPncpStatus('A abertura de editais do PNCP está disponível somente com sessão online.','warn');
    return;
  }

  const payload=control
    ? {query:control}
    : {query:'detalhe',cnpj:btn.dataset.pncpCnpj,ano:Number(btn.dataset.pncpYear),sequencial:Number(btn.dataset.pncpSeq)};

  const {data,error}=await supabase.functions.invoke('pncp-import',{body:payload});
  if(error){
    setPncpStatus(`Erro ao abrir edital: ${error.message}`,'error');
    return;
  }
  if(data?.error){
    setPncpStatus(data.error,'error');
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
  setPncpSyncStatus('Consultando itens no PNCP…','loading');

  try{
    const {data,error}=await supabase.functions.invoke('pncp-import',{body:{query}});
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
      const invokeBody={quote_id:quoteId,parser_version:QUOTE_PARSER_VERSION};
      if(extractedRows.length){
        invokeBody.extracted_rows=extractedRows;
        setQuoteImportProgress('matching');
        setQuoteImportStatus(`${extractedRows.length} itens identificados. A IA está relacionando cada produto aos itens oficiais…`,'loading');
      }else{
        setQuoteImportProgress('reading');
        setQuoteImportStatus('Não foi possível extrair itens localmente. A IA está lendo o PDF completo…','loading');
      }
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

  // Se o usuário filtrou a lista, preserva o item já selecionado mesmo que ele não bata c…37786 tokens truncated…im-row"><span>Posição sugerida</span><strong>${position}</strong></div>
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

  const pncpTenders=state.licitacoes.filter(l=>l.pncp_control);
  if(!pncpTenders.length)return;

  window.__pncpAutoSyncRunning=true;

  try{
    let changed=false;

    for(const l of pncpTenders){
      try{
        const {data,error}=await supabase.functions.invoke('pncp-import',{
          body:{query:l.pncp_control}
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
    .tx-status{display:inline-flex;border-radius:999px;padding:5px 10px;font-size:.73rem;font-weight:800}
    .tx-status.good{background:#164c2c;color:#73e995}
    .tx-status.warn{background:#55420e;color:#ffd65b}
    .tx-status.bad{background:#5a2020;color:#ff8580}
    .tx-status.neutral{background:#26333c;color:#bac5cc}
    .tx-status-date{display:block;color:#9ba8b2;font-size:.74rem;margin-top:6px;white-space:nowrap}
    .tx-actions{display:grid;gap:7px;min-width:112px}
    .tx-action{
      border:1px solid #31434f;border-radius:7px;background:#09161e;color:#e6edf2;
      height:34px;padding:0 10px;font-weight:650;cursor:pointer
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
  const headers=['Número','Órgão','Cidade/UF','Abertura para propostas','Data limite para propostas','Plataforma','Itens','Status'];
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
    const query=quoteNormalize(shell.querySelector('#txSearch')?.value||'');
    const statusFilter=shell.querySelector('#txStatus')?.value||'all';
    const sort=shell.querySelector('#txSort')?.value||'deadline';

    let rows=[...state.licitacoes].filter(l=>{
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
  const totalItems=state.itens.length;
  const platformCounts={};
  state.licitacoes.forEach(l=>{
    const p=String(l.plataforma||'Não informado').split('•')[0].trim()||'Não informado';
    platformCounts[p]=(platformCounts[p]||0)+1;
  });
  const mainPlatform=Object.entries(platformCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-';
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
        <div class="tx-stat-icon yellow">◆</div>
        <div><small>Itens totais</small><strong>${totalItems}</strong><span>itens cadastrados</span></div>
      </div>
      <div class="tx-stat">
        <div class="tx-stat-icon yellow">⚒</div>
        <div><small>Plataforma principal</small><strong>${esc(mainPlatform)}</strong><span>Pregão - Eletrônico</span></div>
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

    <div class="tx-table-wrap">
      <table class="tx-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Órgão</th>
            <th>Cidade / UF</th>
            <th>Abertura do edital</th>
            <th>Data limite para propostas<br><small style="color:#efb426">(Fecha propostas)</small></th>
            <th>Plataforma</th>
            <th>Itens</th>
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
        <p><strong>Abertura do edital:</strong> data em que o edital foi publicado/disponibilizado.</p>
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

      // Abertura do edital = publicação quando disponível.
      const opening=l.publicationAt||l.proposalOpenAt;
      const statusClass=status.cls==='bad'?'bad':status.cls==='warn'?'warn':status.cls==='good'?'good':'neutral';

      return `
        <tr>
          <td><span class="tx-number">${esc(l.numero)}</span></td>
          <td><div class="tx-agency">${esc(l.orgao||'-')}</div></td>
          <td><div class="tx-city">${esc(l.cidade||'-')}</div></td>

          <td>
            ${
              opening
                ? `<div class="tx-date-main"><span class="tx-date-icon" style="color:#43d16e">▣</span>${dateBR(opening,false)}</div>
                   <span class="tx-date-sub">${esc(weekdayBR(opening))}</span>`
                : '<span style="color:#73838f">-</span>'
            }
          </td>

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
            <span class="tx-status ${statusClass}">${esc(status.label==='Prazo próximo'?'Ativo':status.label)}</span>
            <span class="tx-status-date">${l.createdAt?'Cadastrado em '+dateBR(l.createdAt,false):''}</span>
          </td>

          <td>
            <div class="tx-actions">
              ${l.pncp_control?`<button class="tx-action" data-direct-pncp-sync="${l.id}">Atualizar itens</button>`:''}
              <button class="tx-action danger" data-delete="licitacao" data-id="${l.id}">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const count=shell.querySelector('#txCount');
    if(count)count.textContent=`Exibindo ${rows.length?1:0} a ${rows.length} de ${rows.length} editais`;
  };

  shell.querySelector('#txSearch')?.addEventListener('input',renderRows);
  shell.querySelector('#txStatus')?.addEventListener('change',renderRows);
  shell.querySelector('#txSort')?.addEventListener('change',renderRows);

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
    .filter(x=>x.meta)
    .sort((a,b)=>a.meta.date-b.meta.date)
    .slice(0,3);

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
    const event=events[0];
    const meta=event?dashboardDeadlineMeta(event):null;

    cells.push(`
      <div class="db-cal-day ${other?'other':''} ${today?'today':''}">
        <div class="db-cal-num">${d.getDate()}</div>
        ${event?`
          <button class="db-cal-event ${meta?.cls||''}" data-db-tender="${event.id}">
            ${dateBR(event.proposalEndAt||event.raw?.dispute_at,true).split(' ')[1]||''}<br>
            Edital ${esc(event.numero)}
          </button>
        `:''}
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

        <div class="db-kpi">
          <div class="db-kpi-icon purple">◎</div>
          <div>
            <small>Oportunidades</small>
            <strong>${opportunities.length}</strong>
            <span>itens com margem</span>
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
            ${upcoming.length?upcoming.map(({l,meta})=>`
              <div class="db-deadline ${meta.cls}">
                <div class="db-deadline-time">${dateBR(l.proposalEndAt||l.raw?.dispute_at,true)}</div>
                <div class="db-deadline-title">
                  Edital ${esc(l.numero)} • ${esc(l.cidade||l.orgao||'')}
                </div>
                <div class="db-deadline-meta">
                  ${state.itens.filter(i=>String(i.licitacao_id)===String(l.id)).length} itens
                </div>
                <button type="button" class="db-open-tender" data-db-open-tender="${l.id}">
                  Abrir edital
                </button>
              </div>
            `).join(''):'<div class="db-tip">Nenhum fechamento futuro encontrado.</div>'}
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
      toast(`Edital ${l.numero} fecha em ${dateBR(l.proposalEndAt||l.raw?.dispute_at,true)}.`);
    });
  });

  shell.querySelectorAll('[data-db-open-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelector(`#mainTabs [data-tab="${btn.dataset.dbOpenTab}"]`)?.click();
    });
  });

  shell.querySelectorAll('[data-db-open-tender]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelector('#mainTabs [data-tab="licitacoes"]')?.click();
    });
  });
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
  $('#fornecedoresLista').innerHTML=table(['Fornecedor','CNPJ','Contato','Frete','Pedido mín.','Prazo',''],state.fornecedores.map(f=>[esc(f.nome),esc(f.cnpj||'-'),esc(f.contato||'-'),money(f.frete_padrao),money(f.pedido_minimo),f.prazo_dias?`${f.prazo_dias} dias`:'-',`<button class="action-btn danger-btn" data-delete="fornecedor" data-id="${f.id}">Excluir</button>`]));
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
  $('#arquivosLista').innerHTML=table(['Arquivo','Licitação','Fornecedor','Status','Enviado','Próximo passo'],state.documentos.map(d=>{const l=state.licitacoes.find(x=>x.id===d.licitacao_id),f=state.fornecedores.find(x=>x.id===d.fornecedor_id);return [esc(d.nome_arquivo),esc(l?.numero||'-'),esc(f?.nome||'-'),`<span class="badge neutral">${esc(d.status||'arquivado')}</span>`,new Date(d.created_at).toLocaleString('pt-BR'),'<span class="hint">Leia e revise na aba Cotações</span>'];}));
  $('#equipeLista').innerHTML=table(['Nome','Papel','Desde'],state.equipe.map(p=>[esc(p.nome),esc(p.papel==='admin'?'Administrador':'Usuário'),new Date(p.created_at).toLocaleDateString('pt-BR')]));
  for(const [k,v] of Object.entries(c)){const el=$(`#configForm [name="${k}"]`);if(el)el.value=v;}
}

function demoSeed(){
  state.demo=true;state.user={email:'demo@inova.local'};state.profile={name:'Demonstração'};state.company={id:'demo',name:'INOVA Licitações — Demonstração',invite_code:'DEMO2026'};state.config={imposto:6,margem_alvo:25,lucro_minimo:500,margem_minima:10,reserva_operacional:0};
  try{state.config={...state.config,...JSON.parse(localStorage.getItem('inova_demo_pricing_config')||'{}')}}catch{}
  state.pricingTargetsLoadedFor='';loadPricingTargets();
  state.licitacoes=[{id:'l1',numero:'PE 050/2026',orgao:'Prefeitura Municipal',cidade:'PB',data:'2026-08-26',horario:'09:00',plataforma:'Portal de Compras Públicas'}];
  state.itens=[{id:'i1',licitacao_id:'l1',numero:20,descricao:'Desengraxante líquido',quantidade:500,unidade:'L',valor_estimado:11.95},{id:'i2',licitacao_id:'l1',numero:21,descricao:'Detergente líquido',quantidade:300,unidade:'UN',valor_estimado:7.8}];
  state.fornecedores=[{id:'f1',nome:'Fornecedor A',frete_padrao:0},{id:'f2',nome:'Fornecedor B',frete_padrao:0}];state.cotacoes=[{id:'c1',item_id:'i1',fornecedor_id:'f1',preco:31.9,fator_equivalencia:5,frete_rateado:0,apresentacao:'Galão 5 L',marca:'Marca A'},{id:'c2',item_id:'i1',fornecedor_id:'f2',preco:7.1,fator_equivalencia:1,frete_rateado:0,apresentacao:'Frasco 1 L',marca:'Marca B'}];state.pricingMap=[];state.documentos=[];state.equipe=[{nome:'Administrador',papel:'admin',created_at:new Date().toISOString()}];renderAll();showOnly('appShell');
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

$('#licitacaoForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const parts=(f.cidade||'').split('/').map(x=>x.trim());const manualDate=combineDateTime(f.data,f.horario);if(state.demo){state.licitacoes.push({id:crypto.randomUUID(),numero:f.numero,orgao:f.orgao,cidade:f.cidade||'',data:f.data||'',horario:f.horario||'',plataforma:f.plataforma||'',objeto:f.objeto||'',proposalEndAt:manualDate});e.target.reset();renderAll();return toast('Licitação adicionada à demonstração.');}const row={company_id:currentCompanyId(),number:f.numero,agency:f.orgao,city:parts[0]||null,state:parts[1]||null,platform:f.plataforma||null,object:f.objeto||null,dispute_at:manualDate,proposal_end_at:manualDate,created_by:state.user.id};const {error}=await supabase.from('tenders').insert(row);if(error)return toast(error.message,'error');e.target.reset();toast('Licitação cadastrada.');await refreshAll();});
$('#itemForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo){state.itens.push({id:crypto.randomUUID(),licitacao_id:f.licitacao_id,numero:Number(f.numero),descricao:f.descricao,quantidade:Number(f.quantidade),unidade:f.unidade,valor_estimado:Number(f.valor_estimado||0)});renderAll();return;}const {error}=await supabase.from('tender_items').insert({tender_id:f.licitacao_id,item_number:Number(f.numero),description:f.descricao,quantity:Number(f.quantidade),unit:f.unidade,estimated_unit_price:Number(f.valor_estimado||0)});if(error)return toast(error.message,'error');e.target.reset();toast('Item adicionado.');await refreshAll();});
$('#fornecedorForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo){state.fornecedores.push({id:crypto.randomUUID(),nome:f.nome,cnpj:f.cnpj||'',contato:f.contato||'',frete_padrao:Number(f.frete_padrao||0),pedido_minimo:Number(f.pedido_minimo||0),prazo_dias:f.prazo_dias?Number(f.prazo_dias):null});e.target.reset();renderAll();return toast('Fornecedor adicionado à demonstração.');}const {error}=await supabase.from('suppliers').insert({company_id:currentCompanyId(),name:f.nome,cnpj:f.cnpj||null,contact_name:f.contato||null,default_freight_amount:Number(f.frete_padrao||0),minimum_order:Number(f.pedido_minimo||0),delivery_days:f.prazo_dias?Number(f.prazo_dias):null});if(error)return toast(error.message,'error');e.target.reset();toast('Fornecedor cadastrado.');await refreshAll();});
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

  const removeQuoteBtn=e.target.closest('[data-remove-item-quotes]');
  if(removeQuoteBtn){
    await removeAllQuotesFromItem(removeQuoteBtn.dataset.removeItemQuotes);
    return;
  }

  const btn=e.target.closest('[data-delete]');if(!btn)return;if(!confirm('Deseja excluir este registro?'))return;if(state.demo){if(btn.dataset.delete==='licitacao'){const tenderItems=state.itens.filter(i=>String(i.licitacao_id)===String(btn.dataset.id)).map(i=>String(i.id));state.licitacoes=state.licitacoes.filter(x=>String(x.id)!==String(btn.dataset.id));state.itens=state.itens.filter(x=>String(x.licitacao_id)!==String(btn.dataset.id));state.cotacoes=state.cotacoes.filter(x=>!tenderItems.includes(String(x.item_id)));}else{state.fornecedores=state.fornecedores.filter(x=>String(x.id)!==String(btn.dataset.id));state.cotacoes=state.cotacoes.filter(x=>String(x.fornecedor_id)!==String(btn.dataset.id));}renderAll();return toast('Registro removido da demonstração.');}const {error}=await supabase.from(btn.dataset.delete==='licitacao'?'tenders':'suppliers').delete().eq('id',btn.dataset.id);if(error)return toast(error.message,'error');await refreshAll();
});
document.querySelectorAll('.tabs button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tabs button,.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#'+btn.dataset.tab).classList.add('active');}));
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false;});$('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true;});
if('serviceWorker' in navigator)window.addEventListener('load',async()=>{
  try{
    const isLocal=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
    if(isLocal){
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.filter(reg=>reg.scope.startsWith(location.origin)).map(reg=>reg.unregister()));
      return;
    }
    await navigator.serviceWorker.register('./service-worker.js',{scope:'./'});
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
  renderQuotesWorkspace();
  startAutomaticQuoteImport();
});
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

