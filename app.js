import { createClient } from '@supabase/supabase-js';

const $ = (s) => document.querySelector(s);
const money = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg = window.INOVA_CONFIG || {};
const configured = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY && createClient);
const supabase = configured ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;

let state = {
  user:null, profile:null, membership:null, company:null, config:null,
  licitacoes:[], itens:[], fornecedores:[], quotes:[], cotacoes:[], documentos:[], equipe:[], demo:false
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

function bestQuote(itemId){
  const qs=state.cotacoes.filter(q=>q.item_id===itemId).map(q=>({...q,custoEq:(Number(q.preco)+Number(q.frete_rateado||0))/Math.max(Number(q.fator_equivalencia||1),0.0001)}));
  return qs.sort((a,b)=>a.custoEq-b.custoEq)[0] || null;
}
function pricing(item){
  const q=bestQuote(item.id); if(!q)return null;
  const c=state.config || {imposto:6,margem_alvo:25,lucro_minimo:500,margem_minima:10,reserva_operacional:0};
  const qty=Number(item.quantidade||0), costUnit=q.custoEq, totalCost=costUnit*qty;
  const tax=(Number(c.imposto||0)+Number(c.reserva_operacional||0))/100;
  const targetMargin=Number(c.margem_alvo||0)/100, minMargin=Number(c.margem_minima||0)/100;
  const est=Number(item.valor_estimado||0);
  const targetUnit=costUnit/Math.max(1-tax-targetMargin,0.01);
  const minByMargin=costUnit/Math.max(1-tax-minMargin,0.01);
  const minByProfit=(totalCost+Number(c.lucro_minimo||0))/Math.max(qty*(1-tax),0.01);
  const limitUnit=Math.max(minByMargin,minByProfit);
  const sellUnit=est||targetUnit, revenue=sellUnit*qty, profit=revenue*(1-tax)-totalCost, margin=revenue?profit/revenue*100:0;
  return {q,costUnit,totalCost,targetUnit,limitUnit,sellUnit,profit,margin};
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
  state.licitacoes=(tenders.data||[]).map(t=>{const dt=toLocalDateTime(t.dispute_at);return {id:t.id,numero:t.number,processo:t.process_number,orgao:t.agency||'',cidade:[t.city,t.state].filter(Boolean).join('/'),data:dt.data,horario:dt.horario,plataforma:t.platform||'',objeto:t.object||'',raw:t};});
  state.fornecedores=(suppliers.data||[]).map(f=>({id:f.id,nome:f.name,cnpj:f.cnpj,contato:f.contact_name,frete_padrao:Number(f.default_freight_amount||0),pedido_minimo:Number(f.minimum_order||0),prazo_dias:f.delivery_days,raw:f}));
  state.quotes=quotes.data||[];
  const tenderIds=state.licitacoes.map(x=>x.id), quoteIds=state.quotes.map(x=>x.id);
  const itemResp=tenderIds.length?await supabase.from('tender_items').select('*').in('tender_id',tenderIds).order('item_number'):{data:[],error:null};
  const qiResp=quoteIds.length?await supabase.from('quote_items').select('*').in('quote_id',quoteIds).order('created_at'):{data:[],error:null};
  if(itemResp.error)return toast(itemResp.error.message,'error'); if(qiResp.error)return toast(qiResp.error.message,'error');
  state.itens=(itemResp.data||[]).map(i=>({id:i.id,licitacao_id:i.tender_id,numero:i.item_number,descricao:i.description,quantidade:Number(i.quantity),unidade:i.unit||'',valor_estimado:Number(i.estimated_unit_price||0),raw:i}));
  state.cotacoes=(qiResp.data||[]).map(qi=>{const q=state.quotes.find(x=>x.id===qi.quote_id);return {id:qi.id,quote_id:qi.quote_id,item_id:qi.tender_item_id,fornecedor_id:q?.supplier_id,preco:Number(qi.unit_price),fator_equivalencia:Number(qi.package_base_quantity||1),frete_rateado:Number(qi.freight_per_package||0),apresentacao:qi.package_description||'',marca:[qi.brand,qi.model].filter(Boolean).join(' '),raw:qi};});
  state.documentos=state.quotes.filter(q=>q.source_filename).map(q=>({id:q.id,nome_arquivo:q.source_filename,tipo:'cotacao',licitacao_id:q.tender_id,fornecedor_id:q.supplier_id,status:q.status||'enviado',created_at:q.created_at,storage_path:q.storage_path,ai_error:q.ai_error}));
  const memberRows=members.data||[], userIds=memberRows.map(m=>m.user_id);
  const profiles=userIds.length?await supabase.from('profiles').select('id,name,email,created_at').in('id',userIds):{data:[],error:null};
  state.equipe=memberRows.map(m=>{const p=(profiles.data||[]).find(x=>x.id===m.user_id);return {id:m.user_id,nome:p?.name||p?.email||`Usuário ${m.user_id.slice(0,6)}`,papel:m.role,created_at:m.created_at};});
  renderAll();
}

function renderAll(){
  $('#companyName').textContent=state.company?.name || state.company?.nome || 'Modo demonstração'; $('#userName').textContent=profileName(); $('#inviteCode').textContent=state.company?.invite_code || state.company?.codigo_convite || 'DEMO2026';
  $('#kpiLicitacoes').textContent=state.licitacoes.length; $('#kpiItens').textContent=state.itens.length; $('#kpiFornecedores').textContent=state.fornecedores.length;
  const ps=state.itens.map(pricing).filter(Boolean); $('#kpiLucro').textContent=money(ps.reduce((a,p)=>a+Math.max(0,p.profit),0));
  $('#proximasDisputas').innerHTML=table(['Licitação','Órgão','Data','Itens'],state.licitacoes.map(l=>[esc(l.numero),esc(l.orgao),esc([l.data,l.horario].filter(Boolean).join(' ')||'-'),String(state.itens.filter(i=>i.licitacao_id===l.id).length)]));
  const c=state.config||{}; const buckets={excelente:0,oportunidade:0,ruim:0,sem:0};
  state.itens.forEach(i=>{const p=pricing(i);if(!p)buckets.sem++;else if(p.margin<Number(c.margem_minima||10))buckets.ruim++;else if(p.margin<Number(c.margem_alvo||25))buckets.oportunidade++;else buckets.excelente++;});
  $('#resumoOportunidades').innerHTML=`<div class="opp"><strong>${buckets.excelente}</strong><span>Excelentes</span></div><div class="opp"><strong>${buckets.oportunidade}</strong><span>Oportunidades</span></div><div class="opp"><strong>${buckets.ruim}</strong><span>Ruins</span></div><div class="opp"><strong>${buckets.sem}</strong><span>Sem cotação</span></div>`;
  $('#licitacoesLista').innerHTML=table(['Número','Órgão','Cidade','Data','Plataforma',''],state.licitacoes.map(l=>[esc(l.numero),esc(l.orgao),esc(l.cidade||'-'),esc(l.data||'-'),esc(l.plataforma||'-'),`<button class="action-btn danger-btn" data-delete="licitacao" data-id="${l.id}">Excluir</button>`]));
  $('#fornecedoresLista').innerHTML=table(['Fornecedor','CNPJ','Contato','Frete','Pedido mín.','Prazo',''],state.fornecedores.map(f=>[esc(f.nome),esc(f.cnpj||'-'),esc(f.contato||'-'),money(f.frete_padrao),money(f.pedido_minimo),f.prazo_dias?`${f.prazo_dias} dias`:'-',`<button class="action-btn danger-btn" data-delete="fornecedor" data-id="${f.id}">Excluir</button>`]));
  const licOpts='<option value="">Selecione a licitação</option>'+state.licitacoes.map(l=>`<option value="${l.id}">${esc(l.numero)} • ${esc(l.orgao)}</option>`).join(''); $('#itemLicitacao').innerHTML=licOpts; $('#arquivoLicitacao').innerHTML=licOpts;
  $('#cotacaoItem').innerHTML='<option value="">Selecione o item</option>'+state.itens.map(i=>`<option value="${i.id}">${esc(itemName(i))}</option>`).join('');
  const fornOpts='<option value="">Selecione o fornecedor</option>'+state.fornecedores.map(f=>`<option value="${f.id}">${esc(f.nome)}</option>`).join(''); $('#cotacaoFornecedor').innerHTML=fornOpts; $('#arquivoFornecedor').innerHTML=fornOpts;
  $('#comparativoLista').innerHTML=table(['Item','Melhor fornecedor','Custo equivalente','Apresentação','Marca'],state.itens.map(i=>{const q=bestQuote(i.id);if(!q)return [esc(itemName(i)),'<span class="badge neutral">Sem cotação</span>','-','-','-'];const f=state.fornecedores.find(x=>x.id===q.fornecedor_id);return [esc(itemName(i)),esc(f?.nome||'-'),money(q.custoEq),esc(q.apresentacao||'-'),esc(q.marca||'-')];}));
  $('#precificacaoLista').innerHTML=table(['Item','Custo un.','Estimado un.','Preço alvo','Preço limite','Lucro potencial','Margem','Status'],state.itens.map(i=>{const p=pricing(i);if(!p)return [esc(itemName(i)),'-',money(i.valor_estimado),'-','-','-','-','<span class="badge neutral">Sem cotação</span>'];let cls='good',txt='Excelente';if(p.margin<Number(c.margem_minima||10)){cls='bad';txt='Ruim';}else if(p.margin<Number(c.margem_alvo||25)){cls='warn';txt='Oportunidade';}return [esc(itemName(i)),money(p.costUnit),money(i.valor_estimado),money(p.targetUnit),money(p.limitUnit),money(p.profit),`${p.margin.toFixed(1)}%`,`<span class="badge ${cls}">${txt}</span>`];}));
  $('#arquivosLista').innerHTML=table(['Arquivo','Licitação','Fornecedor','Status','Enviado',''],state.documentos.map(d=>{const l=state.licitacoes.find(x=>x.id===d.licitacao_id),f=state.fornecedores.find(x=>x.id===d.fornecedor_id);const action=d.status==='processado'?'<span class="badge good">Concluído</span>':`<button class="action-btn" data-process-doc="${d.id}">Processar IA</button>`;return [esc(d.nome_arquivo),esc(l?.numero||'-'),esc(f?.nome||'-'),`<span class="badge ${d.status==='processado'?'good':'neutral'}">${esc(d.status||'enviado')}</span>`,new Date(d.created_at).toLocaleString('pt-BR'),action];}));
  $('#equipeLista').innerHTML=table(['Nome','Papel','Desde'],state.equipe.map(p=>[esc(p.nome),esc(p.papel==='admin'?'Administrador':'Usuário'),new Date(p.created_at).toLocaleDateString('pt-BR')]));
  for(const [k,v] of Object.entries(c)){const el=$(`#configForm [name="${k}"]`);if(el)el.value=v;}
}

function demoSeed(){
  state.demo=true;state.user={email:'demo@inova.local'};state.profile={name:'Demonstração'};state.company={id:'demo',name:'INOVA Licitações — Demonstração',invite_code:'DEMO2026'};state.config={imposto:6,margem_alvo:25,lucro_minimo:500,margem_minima:10,reserva_operacional:0};
  state.licitacoes=[{id:'l1',numero:'PE 050/2026',orgao:'Prefeitura Municipal',cidade:'PB',data:'2026-08-26',horario:'09:00',plataforma:'Portal de Compras Públicas'}];
  state.itens=[{id:'i1',licitacao_id:'l1',numero:20,descricao:'Desengraxante líquido',quantidade:500,unidade:'L',valor_estimado:11.95},{id:'i2',licitacao_id:'l1',numero:21,descricao:'Detergente líquido',quantidade:300,unidade:'UN',valor_estimado:7.8}];
  state.fornecedores=[{id:'f1',nome:'Fornecedor A',frete_padrao:0},{id:'f2',nome:'Fornecedor B',frete_padrao:0}];state.cotacoes=[{id:'c1',item_id:'i1',fornecedor_id:'f1',preco:31.9,fator_equivalencia:5,frete_rateado:0,apresentacao:'Galão 5 L',marca:'Marca A'},{id:'c2',item_id:'i1',fornecedor_id:'f2',preco:7.1,fator_equivalencia:1,frete_rateado:0,apresentacao:'Frasco 1 L',marca:'Marca B'}];state.documentos=[];state.equipe=[{nome:'Administrador',papel:'admin',created_at:new Date().toISOString()}];renderAll();showOnly('appShell');
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

$('#licitacaoForm').addEventListener('submit',async e=>{e.preventDefault();if(state.demo)return toast('Use o modo online para salvar no banco.','error');const f=Object.fromEntries(new FormData(e.target));const parts=(f.cidade||'').split('/').map(x=>x.trim());const row={company_id:currentCompanyId(),number:f.numero,agency:f.orgao,city:parts[0]||null,state:parts[1]||null,platform:f.plataforma||null,object:f.objeto||null,dispute_at:combineDateTime(f.data,f.horario),created_by:state.user.id};const {error}=await supabase.from('tenders').insert(row);if(error)return toast(error.message,'error');e.target.reset();toast('Licitação cadastrada.');await refreshAll();});
$('#itemForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo){state.itens.push({id:crypto.randomUUID(),licitacao_id:f.licitacao_id,numero:Number(f.numero),descricao:f.descricao,quantidade:Number(f.quantidade),unidade:f.unidade,valor_estimado:Number(f.valor_estimado||0)});renderAll();return;}const {error}=await supabase.from('tender_items').insert({tender_id:f.licitacao_id,item_number:Number(f.numero),description:f.descricao,quantity:Number(f.quantidade),unit:f.unidade,estimated_unit_price:Number(f.valor_estimado||0)});if(error)return toast(error.message,'error');e.target.reset();toast('Item adicionado.');await refreshAll();});
$('#fornecedorForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo)return toast('Use o modo online para salvar no banco.','error');const {error}=await supabase.from('suppliers').insert({company_id:currentCompanyId(),name:f.nome,cnpj:f.cnpj||null,contact_name:f.contato||null,default_freight_amount:Number(f.frete_padrao||0),minimum_order:Number(f.pedido_minimo||0),delivery_days:f.prazo_dias?Number(f.prazo_dias):null});if(error)return toast(error.message,'error');e.target.reset();toast('Fornecedor cadastrado.');await refreshAll();});
$('#cotacaoForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo)return toast('Use o modo online para salvar no banco.','error');const item=state.itens.find(i=>i.id===f.item_id);if(!item)return;const q=await findOrCreateQuote(item.licitacao_id,f.fornecedor_id);if(!q)return;const {error}=await supabase.from('quote_items').insert({quote_id:q.id,tender_item_id:f.item_id,supplier_description:item.descricao,brand:f.marca||null,package_description:f.apresentacao||null,package_base_quantity:Number(f.fator_equivalencia||1),unit_price:Number(f.preco),freight_per_package:Number(f.frete_rateado||0)});if(error)return toast(error.message,'error');e.target.reset();toast('Cotação salva.');await refreshAll();});
$('#configForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.demo){state.config=Object.fromEntries(Object.entries(f).map(([k,v])=>[k,Number(v||0)]));renderAll();return toast('Regras atualizadas.');}const row={company_id:currentCompanyId(),tax_percent:Number(f.imposto||0),target_margin_percent:Number(f.margem_alvo||0),minimum_profit_amount:Number(f.lucro_minimo||0),minimum_margin_percent:Number(f.margem_minima||0),operational_reserve_percent:Number(f.reserva_operacional||0),updated_at:new Date().toISOString()};const {error}=await supabase.from('pricing_settings').upsert(row,{onConflict:'company_id'});if(error)return toast(error.message,'error');toast('Regras salvas.');await refreshAll();});

$('#arquivoForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),file=f.get('arquivo');if(!file?.name)return;if(state.demo)return toast('Upload funciona no modo online.','error');const tenderId=f.get('licitacao_id'),supplierId=f.get('fornecedor_id'),safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const {data:q,error:qErr}=await supabase.from('quotes').insert({company_id:currentCompanyId(),tender_id:tenderId,supplier_id:supplierId,source_filename:file.name,source_type:file.name.split('.').pop()?.toLowerCase(),status:'uploaded',created_by:state.user.id}).select().single();if(qErr)return toast(qErr.message,'error');const path=`${currentCompanyId()}/${q.id}/${Date.now()}-${safe}`;const {error:upErr}=await supabase.storage.from('quote-files').upload(path,file,{upsert:false,contentType:file.type||undefined});if(upErr){await supabase.from('quotes').delete().eq('id',q.id);return toast(upErr.message,'error');}const {error:uErr}=await supabase.from('quotes').update({storage_path:path}).eq('id',q.id);if(uErr)return toast(uErr.message,'error');e.target.reset();toast('Arquivo enviado e pronto para a IA.');await refreshAll();});

$('#copyInviteBtn').addEventListener('click',async()=>{const code=state.company?.invite_code||'DEMO2026';try{await navigator.clipboard.writeText(code);toast('Código copiado.');}catch{toast(`Código: ${code}`);}});
document.addEventListener('click',async e=>{
  const p=e.target.closest('[data-process-doc]');if(p){return toast('O botão da IA já está preparado. Falta apenas conectar a chave da OpenAI no servidor para ativar a leitura automática.','error');}
  const btn=e.target.closest('[data-delete]');if(!btn)return;if(!confirm('Deseja excluir este registro?'))return;if(state.demo)return;const {error}=await supabase.from(btn.dataset.delete==='licitacao'?'tenders':'suppliers').delete().eq('id',btn.dataset.id);if(error)return toast(error.message,'error');await refreshAll();
});
document.querySelectorAll('.tabs button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tabs button,.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#'+btn.dataset.tab).classList.add('active');}));
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false;});$('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true;});
if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()));}catch{}});
if(configured)supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')showOnly('authScreen');if(event==='SIGNED_IN'&&session)state.user=session.user;});
boot();
