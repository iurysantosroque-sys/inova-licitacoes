import { createClient } from '@supabase/supabase-js';

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
  licitacoes:[], itens:[], fornecedores:[], quotes:[], cotacoes:[], pricingMap:[], documentos:[], equipe:[], pncpPreview:null, quoteImportRows:[], quoteViewTenderId:'', pricingViewTenderId:'', quoteImportFilter:'', quoteOnlyUnrelated:false, pricingOnlyMissing:false, demo:false
};

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


function bestQuote(itemId){
  const server=state.pricingMap.find(p=>p.item_id===itemId && p.supplier_id);
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
  const item=state.itens.find(i=>i.id===itemId);
  const qty=Math.max(Number(item?.quantidade||0),0.0001);
  const qs=state.cotacoes.filter(q=>q.item_id===itemId).map(q=>{
    const fator=Math.max(Number(q.fator_equivalencia||1),0.0001);
    const fornecedor=state.fornecedores.find(f=>f.id===q.fornecedor_id);
    const freteApresentacao=Number(q.frete_rateado||0);
    const pacotes=Math.ceil(qty/fator);
    const freteTotal=freteApresentacao>0 ? pacotes*freteApresentacao : Number(fornecedor?.frete_padrao||0);
    const custoProduto=Number(q.preco||0)/fator;
    const freteUnit=freteTotal/qty;
    return {...q,custoProduto,freteTotal,freteUnit,custoEq:custoProduto+freteUnit};
  });
  return qs.sort((a,b)=>a.custoEq-b.custoEq)[0] || null;
}

function pricing(item){
  const server=state.pricingMap.find(p=>p.item_id===item.id);
  if(server){
    return {
      q:server.supplier_id?{fornecedor_id:server.supplier_id,apresentacao:server.package_description||'',custoEq:Number(server.real_unit_cost||0)}:null,
      supplierName:server.supplier_name||'',
      productCostUnit:Number(server.product_unit_cost||0),
      freightUnit:Number(server.freight_unit||0),
      freightTotal:Number(server.freight_total||0),
      costUnit:Number(server.real_unit_cost||0),
      totalCost:Number(server.real_unit_cost||0)*Number(server.quantity||0),
      targetUnit:server.target_bid==null?null:Number(server.target_bid),
      limitUnit:server.minimum_bid==null?null:Number(server.minimum_bid),
      breakEvenUnit:server.break_even_bid==null?null:Number(server.break_even_bid),
      sellUnit:server.estimated_unit_price==null?null:Number(server.estimated_unit_price),
      profit:server.profit_at_estimated==null?null:Number(server.profit_at_estimated),
      margin:server.margin_at_estimated_percent==null?null:Number(server.margin_at_estimated_percent),
      differenceTarget:server.difference_to_target==null?null:Number(server.difference_to_target),
      differenceMinimum:server.difference_to_minimum==null?null:Number(server.difference_to_minimum),
      status:server.status||'Sem cotação',
      recommendation:server.recommendation||''
    };
  }

  // Fallback para modo demonstração.
  const q=bestQuote(item.id); if(!q)return null;
  const c=state.config || {imposto:6,margem_alvo:25,lucro_minimo:500,margem_minima:10,reserva_operacional:0};
  const qty=Math.max(Number(item.quantidade||0),0.0001), costUnit=q.custoEq, totalCost=costUnit*qty;
  const overhead=(Number(c.imposto||0)+Number(c.reserva_operacional||0))/100;
  const targetMargin=Number(c.margem_alvo||0)/100, minMargin=Number(c.margem_minima||0)/100;
  const est=Number(item.valor_estimado||0);
  const targetUnit=costUnit/Math.max(1-overhead-targetMargin,0.01);
  const minByMargin=costUnit/Math.max(1-overhead-minMargin,0.01);
  const minByProfit=(costUnit+(Number(c.lucro_minimo||0)/qty))/Math.max(1-overhead,0.01);
  const limitUnit=Math.max(minByMargin,minByProfit);
  const breakEvenUnit=costUnit/Math.max(1-overhead,0.01);
  const revenue=est*qty, profit=est ? revenue*(1-overhead)-totalCost : null;
  const margin=est ? profit/revenue*100 : null;
  let status='Sem estimado', recommendation='Informe o valor estimado do edital';
  if(est){
    if(est<breakEvenUnit){status='Ruim';recommendation='Não participar — estimado abaixo do ponto de equilíbrio';}
    else if(est<limitUnit){status='Ruim';recommendation='Não participar — estimado abaixo do lance mínimo';}
    else if(est<targetUnit){status='Oportunidade';recommendation='Participar com cautela — margem abaixo da desejada';}
    else if(profit<Number(c.lucro_minimo||0)){status='Oportunidade';recommendation='Participar com cautela — lucro total abaixo do mínimo';}
    else {status='Excelente';recommendation='Boa oportunidade — estimado atende a margem desejada';}
  }
  return {q,supplierName:state.fornecedores.find(f=>f.id===q.fornecedor_id)?.nome||'',productCostUnit:q.custoProduto,freightUnit:q.freteUnit,freightTotal:q.freteTotal,costUnit,totalCost,targetUnit,limitUnit,breakEvenUnit,sellUnit:est||null,profit,margin,differenceTarget:est?est-targetUnit:null,differenceMinimum:est?est-limitUnit:null,status,recommendation};
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
    result.innerHTML = `
      <div class="bid-decision bad">
        <strong>SEM COTAÇÃO</strong>
        <span>Cadastre uma cotação para este item antes de simular um lance.</span>
      </div>
    `;
    return;
  }

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

async function searchPncp(query,year,uf){
  clearPncpPreview();
  const results=$('#pncpSearchResults');
  if(results)results.innerHTML='';
  setPncpStatus('Consultando o PNCP…','loading');

  const {data,error}=await supabase.functions.invoke('pncp-import',{
    body:{query,year:year?Number(year):undefined,uf:uf||undefined}
  });

  if(error){
    setPncpStatus(`Não foi possível consultar o PNCP: ${error.message}`,'error');
    return;
  }
  if(data?.error){
    setPncpStatus(data.error,'error');
    return;
  }

  if(data?.mode==='detail'){
    setPncpStatus('Edital encontrado. Confira os dados antes de importar.','success');
    renderPncpPreview(data);
    return;
  }

  const rows=data?.results||[];
  setPncpStatus(rows.length ? `Resultados encontrados${uf ? ' em '+uf : ''}. Selecione o edital correto.` : `Nenhum resultado encontrado${uf ? ' em '+uf : ''}.`,rows.length?'success':'warn');
  renderPncpSearchResults(rows);
}

async function openPncpResult(btn){
  const control=btn.dataset.pncpControl;
  setPncpStatus('Carregando dados e itens do edital…','loading');
  clearPncpPreview();

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
  setPncpStatus('Dados carregados. Revise e importe quando estiver pronto.','success');
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
  const byY=new Map();
  for(const it of items){
    const y=Math.round((it.transform?.[5]||0)/3)*3;
    if(!byY.has(y))byY.set(y,[]);
    byY.get(y).push({x:it.transform?.[4]||0,text:String(it.str||'').trim()});
  }
  return [...byY.entries()]
    .sort((a,b)=>b[0]-a[0])
    .map(([,arr])=>arr.sort((a,b)=>a.x-b.x).map(x=>x.text).filter(Boolean).join(' ').replace(/\s+/g,' ').trim())
    .filter(Boolean);
}

function rowsFromPdfLines(lines){
  const out=[];
  const unitRx='(?:UN|UND|PC|PÇ|PCA|RL|SC|CT|KG|MT|M|M2|M3|BD|GL|PA|PT|CX|FD|LT|L)';
  const brMoney='(?:\\d{1,3}(?:\\.\\d{3})*|\\d+),\\d{2}';

  for(const original of lines){
    let line=String(original||'').replace(/\s+/g,' ').trim();
    if(!line)continue;

    // Ignora cabeçalhos, rodapés e totais.
    if(/^(CODIGO|CÓDIGO|DESCRIÇÃO|DESCRICAO|VENDEDOR|CLIENTE|CONDICOES|CONDIÇÕES|VALIDADE|PRAZO|GARANTIA|OBSERVAÇÕES|OBSERVACOES)/i.test(line))continue;
    if(/\bSUB-?TOTAL\b|\bTOTAL\s*:/i.test(line))continue;

    // Estrutura mais comum da cotação:
    // CODIGO | DESCRICAO | UN | QTD | PRECO UNITARIO | SUBTOTAL
    const rx=new RegExp(
      '^\\s*(\\d{4,8})\\s+(.+?)\\s+('+unitRx+')\\s+(\\d+(?:[.,]\\d+)?)\\s+('+brMoney+')\\s+('+brMoney+')\\s*$',
      'i'
    );
    const m=line.match(rx);
    if(!m)continue;

    const code=m[1];
    let description=m[2].trim();
    const unit=m[3].toUpperCase();
    const quantity=parseBrazilianNumber(m[4]);
    const unitPrice=parseBrazilianNumber(m[5]);
    const subtotal=parseBrazilianNumber(m[6]);

    if(!description || unitPrice==null || unitPrice<=0)continue;

    // Separa a marca quando ela aparece após " - " no fim da descrição.
    let brand='';
    const brandMatch=description.match(/\s+-\s+([A-Z0-9][A-Z0-9 .&/'-]{1,40})$/i);
    if(brandMatch){
      brand=brandMatch[1].trim();
      description=description.slice(0,brandMatch.index).trim();
    }

    out.push({
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
    });
  }

  const seen=new Set();
  return out.filter(r=>{
    const key=`${r.code}|${quoteNormalize(r.description)}|${r.price}`;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,2000);
}
async function parsePdfFile(file){
  const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  const buf=await file.arrayBuffer();
  const pdf=await pdfjs.getDocument({data:buf}).promise;
  const lines=[];
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);
    const content=await page.getTextContent();
    lines.push(...groupPdfTextItems(content.items));
  }
  return rowsFromPdfLines(lines);
}


function setupManualQuoteMode(){
  const aiBtn=$('#quoteAiMatchBtn');
  if(aiBtn)aiBtn.style.display='none';

  const help=$('.quote-import-help span');
  if(help){
    help.innerHTML='Primeiro leia a cotação. Em cada produto, use <b>Buscar item</b> para localizar pelo nome ou número o item correto do edital e faça o relacionamento manualmente. Depois revise e salve.';
  }

  const titleHint=document.querySelector('#view-cotacoes .panel .panel-title .hint, #view-cotacoes .panel-title .hint');
  if(titleHint && /IA|inteligente/i.test(titleHint.textContent||'')){
    titleHint.textContent='Importe a cotação, pesquise os itens do edital e revise antes de salvar.';
  }
}

function setQuoteImportStatus(message,type='loading'){
  const el=$('#quoteImportStatus');
  if(!el)return;
  el.hidden=!message;
  el.className=`quote-import-status ${type}`;
  el.textContent=message||'';
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

function renderQuoteImportPreview(){
  const el=$('#quoteImportPreview');
  if(!el)return;

  const tenderId=$('#quoteImportTender')?.value||'';
  const rows=prepareQuoteRowsByTenderOrder(tenderId);

  if(!rows.length){
    el.innerHTML='';
    return;
  }

  const tenderItems=state.itens
    .filter(i=>String(i.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero));

  const relatedIds=new Set(
    rows.filter(r=>r.itemId).map(r=>String(r.itemId))
  );

  const totalTender=tenderItems.length;
  const relatedTender=tenderItems.filter(i=>relatedIds.has(String(i.id))).length;
  const missingTender=Math.max(0,totalTender-relatedTender);
  const progress=totalTender ? Math.round((relatedTender/totalTender)*100) : 0;

  const term=quoteNormalize(state.quoteImportFilter||'');

  const visibleRows=rows.filter(r=>{
    const matched=state.itens.find(i=>String(i.id)===String(r.itemId));
    if(state.quoteOnlyUnrelated && matched)return false;
    if(!term)return true;

    const hay=quoteNormalize([
      r.description,
      r.code,
      r.brand,
      matched?.numero ? `ITEM ${matched.numero}` : '',
      matched?.descricao||''
    ].filter(Boolean).join(' '));

    return hay.includes(term);
  });

  // Detecta relacionamentos repetidos para avisar visualmente.
  const itemUseCount=new Map();
  rows.forEach(r=>{
    if(!r.itemId)return;
    const key=String(r.itemId);
    itemUseCount.set(key,(itemUseCount.get(key)||0)+1);
  });

  el.innerHTML=`
    <div class="quote-preview-head">
      <div>
        <strong>${rows.length} produto${rows.length===1?'':'s'} lido${rows.length===1?'':'s'} da cotação</strong>
        <span>
          ${relatedTender} de ${totalTender} itens do edital relacionados
          • ${missingTender} ainda sem cotação
        </span>
      </div>
      <button type="button" id="quoteSaveImportedBtn">Salvar cotações selecionadas</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:10px;margin:14px 0">
      <div class="mini-stat">
        <span>Progresso</span>
        <strong>${progress}%</strong>
      </div>
      <div class="mini-stat">
        <span>Cotados</span>
        <strong>${relatedTender}</strong>
      </div>
      <div class="mini-stat">
        <span>Sem cotação</span>
        <strong>${missingTender}</strong>
      </div>
      <div class="mini-stat">
        <span>Produtos do fornecedor</span>
        <strong>${rows.length}</strong>
      </div>
    </div>

    <div class="quote-import-status success" style="margin:14px 0">
      Pesquise pelo produto, código, marca ou número do item. Os relacionamentos são manuais e ficam ordenados pelo número oficial do edital.
    </div>

    <div style="display:grid;grid-template-columns:minmax(260px,1fr) auto auto;gap:10px;align-items:center;margin:0 0 14px">
      <input
        id="quoteGlobalSearch"
        type="search"
        value="${esc(state.quoteImportFilter||'')}"
        placeholder="Buscar na cotação: produto, código, marca ou item..."
        autocomplete="off"
      >

      <button
        type="button"
        id="quoteOnlyUnrelatedBtn"
        class="action-btn ${state.quoteOnlyUnrelated?'active':''}"
      >
        ${state.quoteOnlyUnrelated?'✓ Só não relacionados':'Mostrar só não relacionados'}
      </button>

      <button type="button" id="quoteClearFiltersBtn" class="action-btn">
        Limpar filtros
      </button>
    </div>

    <div class="hint" style="margin:0 0 10px">
      Exibindo ${visibleRows.length} de ${rows.length} produtos.
    </div>

    <div class="table-wrap quote-preview-table">
      <table>
        <thead>
          <tr>
            <th>✓</th>
            <th>Item edital</th>
            <th>Produto do fornecedor</th>
            <th>Pesquisar e relacionar ao item do edital</th>
            <th>Status</th>
            <th>Preço</th>
            <th>Apresentação</th>
            <th>Equivale a</th>
            <th>Marca</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${visibleRows.map(r=>{
            const index=state.quoteImportRows.indexOf(r);
            const itemMatched=state.itens.find(i=>String(i.id)===String(r.itemId));
            const weak=!itemMatched;
            const duplicated=itemMatched && (itemUseCount.get(String(itemMatched.id))||0)>1;

            return `<tr data-quote-row="${index}" class="${weak?'quote-row-review':''}">
              <td>
                <input type="checkbox" data-q-field="selected" ${r.selected!==false?'checked':''}>
              </td>

              <td class="quote-edital-number">
                ${itemMatched?`<strong>${esc(itemMatched.numero)}</strong>`:'<span>—</span>'}
              </td>

              <td>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  <span
                    data-product-item-badge="${index}"
                    class="${itemMatched?'badge good':'badge neutral'}"
                  >
                    ${itemMatched?`Item ${esc(itemMatched.numero)}`:'Sem item'}
                  </span>
                  <strong>${esc(r.description)}</strong>
                </div>
                <small>
                  ${r.code?`Cód. ${esc(r.code)} • `:''}
                  ${r.quantity?`${esc(r.quantity)} ${esc(r.unit||'')}`:''}
                  ${r.subtotal!=null?` • Subtotal ${money(r.subtotal)}`:''}
                </small>
              </td>

              <td>
                <input
                  type="search"
                  data-item-search="${index}"
                  value="${esc(r.itemSearch||'')}"
                  placeholder="Buscar item: ex. caixa d'água 500, cadeado, item 48..."
                  autocomplete="off"
                  style="width:100%;margin-bottom:7px"
                >

                <select data-q-field="itemId" data-item-select="${index}">
                  ${quoteItemOptions(tenderId,r.itemId||'',r.itemSearch||'')}
                </select>

                <small class="${duplicated?'review-note':itemMatched?'match-ok':'review-note'}">
                  ${
                    duplicated
                      ? `⚠ Item ${esc(itemMatched.numero)} está relacionado a mais de um produto`
                      : itemMatched
                        ? `Relacionado manualmente ao Item ${esc(itemMatched.numero)}`
                        : 'Pesquise acima e escolha o item correto do edital'
                  }
                </small>
              </td>

              <td>
                ${
                  duplicated
                    ? '<span class="badge warn">Revisar duplicidade</span>'
                    : itemMatched
                      ? '<span class="badge good">Cotado</span>'
                      : '<span class="badge neutral">Sem relação</span>'
                }
              </td>

              <td>
                <input data-q-field="price" type="number" step="0.0001" min="0" value="${Number(r.price||0)}">
              </td>

              <td>
                <input data-q-field="presentation" value="${esc(r.presentation||'')}" placeholder="Ex.: caixa c/ 50">
              </td>

              <td>
                <input data-q-field="factor" type="number" min="0.0001" step="0.001" value="${Number(r.factor||1)}">
              </td>

              <td>
                <input data-q-field="brand" value="${esc(r.brand||'')}">
              </td>

              <td>
                <button
                  type="button"
                  class="action-btn"
                  data-clear-quote-relation="${index}"
                  ${itemMatched?'':'disabled'}
                >
                  Limpar relação
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
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
    renderQuoteImportPreview();
  });

  document.querySelectorAll('[data-clear-quote-relation]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      syncQuoteRowsFromDom();
      const index=Number(btn.dataset.clearQuoteRelation);
      const row=state.quoteImportRows[index];
      if(!row)return;

      row.itemId='';
      row.editalItemNumber=null;
      row.manualMatched=false;
      row.itemSearch='';
      renderQuoteImportPreview();
      toast('Relacionamento removido. O produto voltou para revisão.');
    });
  });

  document.querySelectorAll('[data-item-search]').forEach(input=>{
    input.addEventListener('input',()=>{
      const rowIndex=Number(input.dataset.itemSearch);
      const row=state.quoteImportRows[rowIndex];
      const select=document.querySelector(`[data-item-select="${rowIndex}"]`);
      if(!row || !select)return;

      row.itemSearch=input.value;
      select.innerHTML=quoteItemOptions(tenderId,row.itemId||'',input.value);
    });
  });

  document.querySelectorAll('[data-item-select]').forEach(select=>{
    select.addEventListener('change',()=>{
      const rowIndex=Number(select.dataset.itemSelect);
      const row=state.quoteImportRows[rowIndex];
      if(!row)return;

      const previousId=row.itemId||'';
      const nextId=select.value||'';

      if(nextId){
        const other=state.quoteImportRows.find((r,i)=>i!==rowIndex && String(r.itemId)===String(nextId));
        if(other){
          const item=state.itens.find(i=>String(i.id)===String(nextId));
          const ok=confirm(
            `Atenção: o Item ${item?.numero||''} já está relacionado ao produto "${other.description}".\n\n`+
            `Deseja relacionar também este produto ao mesmo item?`
          );
          if(!ok){
            select.value=previousId;
            return;
          }
        }
      }

      row.itemId=nextId;
      row.manualMatched=Boolean(row.itemId);

      const item=state.itens.find(i=>String(i.id)===String(row.itemId));
      row.editalItemNumber=item ? Number(item.numero) : null;

      // Re-renderiza para atualizar ordem, progresso, status e alertas de duplicidade.
      renderQuoteImportPreview();
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

  const btn=$('#quoteReadBtn');
  if(btn){btn.disabled=true;btn.textContent='Lendo…';}
  setQuoteImportStatus('Lendo o arquivo e identificando produtos…','loading');
  state.quoteImportRows=[];
  renderQuoteImportPreview();

  try{
    const ext=file.name.toLowerCase().split('.').pop();
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
    state.quoteImportFilter='';
    state.quoteOnlyUnrelated=false;
    setQuoteImportStatus(`${rows.length} linhas identificadas. Use a busca em cada produto para selecionar o item correto do edital.`,'success');
    renderQuoteImportPreview();
  }catch(e){
    setQuoteImportStatus(`Erro ao ler cotação: ${e?.message||e}`,'error');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Ler cotação';}
  }
}


async function saveImportedQuotes(){
  syncQuoteRowsFromDom();
  const tenderId=$('#quoteImportTender')?.value;
  const supplierId=$('#quoteImportSupplier')?.value;
  const rows=(state.quoteImportRows||[])
    .filter(r=>r.selected!==false&&r.itemId&&Number(r.price)>0)
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

    const proceed=confirm(
      `ATENÇÃO: existem ${duplicateGroups.length} item(ns) do edital relacionados a mais de um produto.\n\n`+
      `${details}${more}\n\n`+
      `Isso pode gerar mais de uma cotação para o mesmo item. Deseja salvar mesmo assim?`
    );

    if(!proceed)return;
  }

  if(!confirm(`Salvar ${rows.length} cotação${rows.length===1?'':'ões'} para este fornecedor?`))return;

  const btn=$('#quoteSaveImportedBtn');
  if(btn){btn.disabled=true;btn.textContent='Salvando…';}
  setQuoteImportStatus('Salvando cotações…','loading');

  try{
    const q=await findOrCreateQuote(tenderId,supplierId);
    if(!q)throw new Error('Não foi possível criar a cotação.');

    const payload=rows.map(r=>({
      quote_id:q.id,
      tender_item_id:r.itemId,
      supplier_description:r.description,
      brand:r.brand||null,
      package_description:r.presentation||null,
      package_base_quantity:Number(r.factor||1),
      unit_price:Number(r.price),
      freight_per_package:0
    }));

    for(let start=0;start<payload.length;start+=300){
      const chunk=payload.slice(start,start+300);
      const {error}=await supabase.from('quote_items').insert(chunk);
      if(error)throw error;
    }

    setQuoteImportStatus(`${payload.length} cotações salvas. A precificação foi atualizada.`,'success');
    toast('Cotação importada com sucesso.');
    state.quoteImportRows=[];
    renderQuoteImportPreview();
    await refreshAll();
  }catch(e){
    setQuoteImportStatus(`Erro ao salvar: ${e?.message||e}`,'error');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Salvar cotações selecionadas';}
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
      raw:t
    };
  });
  state.fornecedores=(suppliers.data||[]).map(f=>({id:f.id,nome:f.name,cnpj:f.cnpj,contato:f.contact_name,frete_padrao:Number(f.default_freight_amount||0),pedido_minimo:Number(f.minimum_order||0),prazo_dias:f.delivery_days,raw:f}));
  state.quotes=quotes.data||[];
  const tenderIds=state.licitacoes.map(x=>x.id), quoteIds=state.quotes.map(x=>x.id);
  const itemResp=tenderIds.length?await supabase.from('tender_items').select('*').in('tender_id',tenderIds).order('item_number'):{data:[],error:null};
  const qiResp=quoteIds.length?await supabase.from('quote_items').select('*').in('quote_id',quoteIds).order('created_at'):{data:[],error:null};
  if(itemResp.error)return toast(itemResp.error.message,'error'); if(qiResp.error)return toast(qiResp.error.message,'error');
  state.itens=(itemResp.data||[]).map(i=>({id:i.id,licitacao_id:i.tender_id,numero:i.item_number,descricao:i.description,quantidade:Number(i.quantity),unidade:i.unit||'',valor_estimado:Number(i.estimated_unit_price||0),raw:i}));
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


function ensureQuoteTenderViewer(){
  const list=$('#comparativoLista');
  if(!list)return null;

  let box=$('#quoteTenderViewer');
  if(!box){
    box=document.createElement('div');
    box.id='quoteTenderViewer';
    box.className='quote-tender-viewer';
    box.style.margin='0 0 16px';
    box.innerHTML=`
      <div style="display:grid;grid-template-columns:minmax(260px,1fr) auto;gap:12px;align-items:end">
        <label style="display:grid;gap:6px">
          <span>Visualizar cotações de qual edital?</span>
          <select id="quoteTenderViewSelect">
            <option value="">Selecione a licitação</option>
          </select>
        </label>
        <button type="button" id="quoteTenderViewBtn">Abrir edital</button>
      </div>
      <div id="quoteTenderViewInfo" class="hint" style="margin-top:8px">
        Selecione um edital e clique em Abrir edital. Os itens e produtos dos outros editais ficarão ocultos.
      </div>
    `;
    list.parentNode?.insertBefore(box,list);

    $('#quoteTenderViewBtn')?.addEventListener('click',()=>{
      const tenderId=$('#quoteTenderViewSelect')?.value||'';
      state.quoteViewTenderId=tenderId;
      renderQuoteTenderComparison();
    });
  }

  const select=$('#quoteTenderViewSelect');
  if(select){
    const current=state.quoteViewTenderId||'';
    select.innerHTML='<option value="">Selecione a licitação</option>'+
      state.licitacoes.map(l=>`<option value="${l.id}" ${String(l.id)===String(current)?'selected':''}>${esc(l.numero)} • ${esc(l.orgao)}</option>`).join('');
  }

  return box;
}

function renderQuoteTenderComparison(){
  const list=$('#comparativoLista');
  if(!list)return;

  ensureQuoteTenderViewer();

  const tenderId=state.quoteViewTenderId||'';

  if(!tenderId){
    list.innerHTML='<p class="hint">Selecione um edital acima e clique em <strong>Abrir edital</strong> para ver somente os itens e produtos daquela licitação.</p>';
    return;
  }

  const tender=state.licitacoes.find(l=>String(l.id)===String(tenderId));
  const items=state.itens
    .filter(i=>String(i.licitacao_id)===String(tenderId))
    .sort((a,b)=>Number(a.numero)-Number(b.numero));

  const info=$('#quoteTenderViewInfo');
  if(info){
    const quoted=items.filter(i=>bestQuote(i.id)).length;
    info.textContent=`${tender?.numero||'Edital'} • ${items.length} itens • ${quoted} com cotação • ${items.length-quoted} sem cotação`;
  }

  list.innerHTML=table(
    ['Item','Descrição','Melhor fornecedor','Produto un.','Frete un.','Custo real un.','Apresentação'],
    items.map(i=>{
      const q=bestQuote(i.id);
      const itemLabel=`Item ${esc(i.numero)}`;
      if(!q){
        return [
          itemLabel,
          esc(i.descricao),
          '<span class="badge neutral">Sem cotação</span>',
          '-','-','-','-'
        ];
      }
      const f=state.fornecedores.find(x=>x.id===q.fornecedor_id);
      return [
        itemLabel,
        esc(i.descricao),
        esc(f?.nome||'-'),
        money(q.custoProduto??q.custoEq),
        money(q.freteUnit||0),
        money(q.custoEq),
        esc(q.apresentacao||'-')
      ];
    })
  );
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

function renderPricingByTender(){
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
  const quotedCount=allItems.filter(i=>pricing(i)).length;
  const missingCount=allItems.length-quotedCount;

  const items=state.pricingOnlyMissing
    ? allItems.filter(i=>!pricing(i))
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
    const quoteCount=state.cotacoes.filter(q=>String(q.item_id)===String(i.id)).length;
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
    #licitacoes.tender-exact-view.show-new-tender > .panel:first-of-type{
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
              ${l.pncp_control?`<button class="tx-action" data-sync-pncp="${l.id}">Atualizar itens</button>`:''}
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
    section.classList.toggle('show-new-tender');
    const open=section.classList.contains('show-new-tender');
    const btn=shell.querySelector('#txNewTender');
    if(btn)btn.textContent=open?'× Fechar cadastro':'＋ Novo edital';
    if(open){
      panels[0]?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  renderRows();
}

function renderAll(){
  $('#companyName').textContent=state.company?.name || state.company?.nome || 'Modo demonstração'; $('#userName').textContent=profileName(); $('#inviteCode').textContent=state.company?.invite_code || state.company?.codigo_convite || 'DEMO2026';
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
  renderTenderManagement();
  $('#fornecedoresLista').innerHTML=table(['Fornecedor','CNPJ','Contato','Frete','Pedido mín.','Prazo',''],state.fornecedores.map(f=>[esc(f.nome),esc(f.cnpj||'-'),esc(f.contato||'-'),money(f.frete_padrao),money(f.pedido_minimo),f.prazo_dias?`${f.prazo_dias} dias`:'-',`<button class="action-btn danger-btn" data-delete="fornecedor" data-id="${f.id}">Excluir</button>`]));
  const licOpts='<option value="">Selecione a licitação</option>'+state.licitacoes.map(l=>`<option value="${l.id}">${esc(l.numero)} • ${esc(l.orgao)}</option>`).join('');
  $('#itemLicitacao').innerHTML=licOpts; $('#arquivoLicitacao').innerHTML=licOpts;
  if($('#quoteImportTender'))$('#quoteImportTender').innerHTML=licOpts;
  if($('#pncpSyncTender'))$('#pncpSyncTender').innerHTML='<option value="">Selecione a licitação PNCP</option>'+state.licitacoes.filter(l=>l.pncp_control||l.source_url).map(l=>`<option value="${l.id}">${esc(l.numero)} • ${esc(l.orgao)}</option>`).join('');
  $('#cotacaoItem').innerHTML='<option value="">Selecione o item</option>'+state.itens.map(i=>`<option value="${i.id}">${esc(itemName(i))}</option>`).join('');
  const fornOpts='<option value="">Selecione o fornecedor</option>'+state.fornecedores.map(f=>`<option value="${f.id}">${esc(f.nome)}</option>`).join('');
  $('#cotacaoFornecedor').innerHTML=fornOpts; $('#arquivoFornecedor').innerHTML=fornOpts;
  if($('#quoteImportSupplier'))$('#quoteImportSupplier').innerHTML=fornOpts;
  renderQuoteTenderComparison();
  renderPricingByTender();
  $('#arquivosLista').innerHTML=table(['Arquivo','Licitação','Fornecedor','Status','Enviado',''],state.documentos.map(d=>{const l=state.licitacoes.find(x=>x.id===d.licitacao_id),f=state.fornecedores.find(x=>x.id===d.fornecedor_id);const action=d.status==='processado'?'<span class="badge good">Concluído</span>':`<button class="action-btn" data-process-doc="${d.id}">Processar IA</button>`;return [esc(d.nome_arquivo),esc(l?.numero||'-'),esc(f?.nome||'-'),`<span class="badge ${d.status==='processado'?'good':'neutral'}">${esc(d.status||'enviado')}</span>`,new Date(d.created_at).toLocaleString('pt-BR'),action];}));
  $('#equipeLista').innerHTML=table(['Nome','Papel','Desde'],state.equipe.map(p=>[esc(p.nome),esc(p.papel==='admin'?'Administrador':'Usuário'),new Date(p.created_at).toLocaleDateString('pt-BR')]));
  for(const [k,v] of Object.entries(c)){const el=$(`#configForm [name="${k}"]`);if(el)el.value=v;}
}

function demoSeed(){
  state.demo=true;state.user={email:'demo@inova.local'};state.profile={name:'Demonstração'};state.company={id:'demo',name:'INOVA Licitações — Demonstração',invite_code:'DEMO2026'};state.config={imposto:6,margem_alvo:25,lucro_minimo:500,margem_minima:10,reserva_operacional:0};
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
$('#showLoginBtn').addEventListener('click',()=>{$('#showLoginBtn').classList.add('active');$('#showSignupBtn').classList.remove('active');$('#loginForm').hidden=false;$('#signupForm').hidden=true;});
$('#showSignupBtn').addEventListener('click',()=>{$('#showSignupBtn').classList.add('active');$('#showLoginBtn').classList.remove('active');$('#signupForm').hidden=false;$('#loginForm').hidden=true;});
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {data,error}=await supabase.auth.signInWithPassword({email:f.email,password:f.password});if(error)return toast(error.message,'error');state.user=data.user;await ensureProfile();await loadMembershipAndData();});
$('#signupForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {data,error}=await supabase.auth.signUp({email:f.email,password:f.password,options:{data:{nome:f.nome}}});if(error)return toast(error.message,'error');if(!data.session)return toast('Conta criada. Abra o e-mail de confirmação enviado pelo sistema.');state.user=data.user;await ensureProfile();await loadMembershipAndData();});
$('#createCompanyForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {data,error}=await supabase.rpc('create_company_with_owner',{p_name:f.nome});if(error)return toast(error.message,'error');toast(`Empresa criada. Código: ${data?.[0]?.invite_code||''}`);await loadMembershipAndData();});
$('#joinCompanyForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {error}=await supabase.rpc('join_company_by_invite',{p_invite_code:f.codigo});if(error)return toast(error.message,'error');toast('Você entrou na empresa.');await loadMembershipAndData();});
async function logout(){if(state.demo){location.reload();return;}await supabase.auth.signOut();location.reload();} $('#logoutBtn').addEventListener('click',logout);$('#logoutCompanyBtn').addEventListener('click',logout);

$('#licitacaoForm').addEventListener('submit',async e=>{e.preventDefault();if(state.demo)return toast('Use o modo online para salvar no banco.','error');const f=Object.fromEntries(new FormData(e.target));const parts=(f.cidade||'').split('/').map(x=>x.trim());const manualDate=combineDateTime(f.data,f.horario);const row={company_id:currentCompanyId(),number:f.numero,agency:f.orgao,city:parts[0]||null,state:parts[1]||null,platform:f.plataforma||null,object:f.objeto||null,dispute_at:manualDate,proposal_end_at:manualDate,created_by:state.user.id};const {error}=await supabase.from('tenders').insert(row);if(error)return toast(error.message,'error');e.target.reset();toast('Licitação cadastrada.');await refreshAll();});
$('#itemForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo){state.itens.push({id:crypto.randomUUID(),licitacao_id:f.licitacao_id,numero:Number(f.numero),descricao:f.descricao,quantidade:Number(f.quantidade),unidade:f.unidade,valor_estimado:Number(f.valor_estimado||0)});renderAll();return;}const {error}=await supabase.from('tender_items').insert({tender_id:f.licitacao_id,item_number:Number(f.numero),description:f.descricao,quantity:Number(f.quantidade),unit:f.unidade,estimated_unit_price:Number(f.valor_estimado||0)});if(error)return toast(error.message,'error');e.target.reset();toast('Item adicionado.');await refreshAll();});
$('#fornecedorForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo)return toast('Use o modo online para salvar no banco.','error');const {error}=await supabase.from('suppliers').insert({company_id:currentCompanyId(),name:f.nome,cnpj:f.cnpj||null,contact_name:f.contato||null,default_freight_amount:Number(f.frete_padrao||0),minimum_order:Number(f.pedido_minimo||0),delivery_days:f.prazo_dias?Number(f.prazo_dias):null});if(error)return toast(error.message,'error');e.target.reset();toast('Fornecedor cadastrado.');await refreshAll();});
$('#cotacaoForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo)return toast('Use o modo online para salvar no banco.','error');const item=state.itens.find(i=>i.id===f.item_id);if(!item)return;const q=await findOrCreateQuote(item.licitacao_id,f.fornecedor_id);if(!q)return;const {error}=await supabase.from('quote_items').insert({quote_id:q.id,tender_item_id:f.item_id,supplier_description:item.descricao,brand:f.marca||null,package_description:f.apresentacao||null,package_base_quantity:Number(f.fator_equivalencia||1),unit_price:Number(f.preco),freight_per_package:Number(f.frete_rateado||0)});if(error)return toast(error.message,'error');e.target.reset();toast('Cotação salva.');await refreshAll();});
$('#configForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo){state.config=Object.fromEntries(Object.entries(f).map(([k,v])=>[k,Number(v||0)]));renderAll();return toast('Regras atualizadas.');}const row={company_id:currentCompanyId(),tax_percent:Number(f.imposto||0),target_margin_percent:Number(f.margem_alvo||0),minimum_profit_amount:Number(f.lucro_minimo||0),minimum_margin_percent:Number(f.margem_minima||0),operational_reserve_percent:Number(f.reserva_operacional||0),updated_at:new Date().toISOString()};const {error}=await supabase.from('pricing_settings').upsert(row,{onConflict:'company_id'});if(error)return toast(error.message,'error');toast('Regras salvas.');await refreshAll();});

$('#arquivoForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),file=f.get('arquivo');if(!file?.name)return;if(state.demo)return toast('Upload funciona no modo online.','error');const tenderId=f.get('licitacao_id'),supplierId=f.get('fornecedor_id'),safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const {data:q,error:qErr}=await supabase.from('quotes').insert({company_id:currentCompanyId(),tender_id:tenderId,supplier_id:supplierId,source_filename:file.name,source_type:file.name.split('.').pop()?.toLowerCase(),status:'uploaded',created_by:state.user.id}).select().single();if(qErr)return toast(qErr.message,'error');const path=`${currentCompanyId()}/${q.id}/${Date.now()}-${safe}`;const {error:upErr}=await supabase.storage.from('quote-files').upload(path,file,{upsert:false,contentType:file.type||undefined});if(upErr){await supabase.from('quotes').delete().eq('id',q.id);return toast(upErr.message,'error');}const {error:uErr}=await supabase.from('quotes').update({storage_path:path}).eq('id',q.id);if(uErr)return toast(uErr.message,'error');e.target.reset();toast('Arquivo enviado e pronto para a IA.');await refreshAll();});

$('#copyInviteBtn').addEventListener('click',async()=>{const code=state.company?.invite_code||'DEMO2026';try{await navigator.clipboard.writeText(code);toast('Código copiado.');}catch{toast(`Código: ${code}`);}});
document.addEventListener('click',async e=>{
  const removeQuoteBtn=e.target.closest('[data-remove-item-quotes]');
  if(removeQuoteBtn){
    await removeAllQuotesFromItem(removeQuoteBtn.dataset.removeItemQuotes);
    return;
  }

  const p=e.target.closest('[data-process-doc]');if(p){return toast('O botão da IA já está preparado. Falta apenas conectar a chave da OpenAI no servidor para ativar a leitura automática.','error');}
  const btn=e.target.closest('[data-delete]');if(!btn)return;if(!confirm('Deseja excluir este registro?'))return;if(state.demo)return;const {error}=await supabase.from(btn.dataset.delete==='licitacao'?'tenders':'suppliers').delete().eq('id',btn.dataset.id);if(error)return toast(error.message,'error');await refreshAll();
});
document.querySelectorAll('.tabs button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tabs button,.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#'+btn.dataset.tab).classList.add('active');}));
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false;});$('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true;});
if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()));}catch{}});
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
  await searchPncp(String(f.query||'').trim(),f.year,f.uf);
});

document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-pncp-control],[data-pncp-cnpj]');
  if(btn && btn.classList.contains('pncp-open-btn')){
    await openPncpResult(btn);
  }
});



document.addEventListener('change',e=>{
  if(e.target?.id==='quoteTenderViewSelect'){
    // Só muda a seleção; os dados só abrem quando o usuário clicar em "Abrir edital".
    return;
  }
});

$('#quoteReadBtn')?.addEventListener('click',readQuoteImportFile);
$('#quoteImportTender')?.addEventListener('change',()=>{state.quoteImportRows=[];state.quoteImportFilter='';state.quoteOnlyUnrelated=false;renderQuoteImportPreview();});
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
