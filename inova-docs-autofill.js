// Read-only projection of already loaded pricing data. No network, storage or writes.
const text=value=>String(value??'').trim();
export const AUTOFILL_FIELDS=['number','agency','process','object','recipient','product','quantity','unit_price'];
const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:6});
const quantity=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:8});

export function pricingDocumentSource(state,tenderId,resolveQuote){
  const tender=(state.licitacoes||[]).find(t=>String(t.id)===String(tenderId));
  if(!tender||(!state.demo&&(!state.company?.id||tender.raw?.company_id!==state.company.id)))return null;
  const excluded=new Set((state.pricingExcludedItems?.[tender.id]||[]).map(String));
  const items=(state.itens||[]).filter(item=>String(item.licitacao_id)===String(tender.id)&&!excluded.has(String(item.id))).map(item=>{
    // The host owns quote selection, including its current supplier preference.
    const quote=resolveQuote(item),brand=text(quote?.marca);
    const won=state.pricingItemResults?.[String(item.id)];
    const hasWon=won!==null&&won!==undefined&&won!==''&&Number.isFinite(Number(won))&&Number(won)>=0;
    const qty=item.quantidade;
    const hasQty=qty!==null&&qty!==undefined&&qty!==''&&Number.isFinite(Number(qty));
    return {
      id:String(item.id),label:`${text(item.numero)} · ${text(item.descricao)}`,
      product:[text(item.descricao),brand?`Marca / modelo: ${brand}`:''].filter(Boolean).join(' — '),
      quantity:hasQty?[quantity.format(Number(qty)),text(item.unidade)].filter(Boolean).join(' '):'',
      unit_price:hasWon?currency.format(Number(won)):'',
      quote_label:quote?'Marca/modelo da cotação exibida na precificação.':'Sem cotação exibida: marca/modelo não informados.',
      price_label:hasWon?'Preço: Valor ganho salvo na precificação (por unidade do edital).':'Sem Valor ganho salvo. Informe o preço declarado; custo e estimativa do governo não são utilizados.'
    };
  });
  return {tender:{id:String(tender.id),number:text(tender.numero),agency:text(tender.orgao),process:text(tender.processo||tender.process_number),object:text(tender.objeto),recipient:text(tender.orgao)},items};
}

export function markAutofillEdit(metadata,field){
  if(!AUTOFILL_FIELDS.includes(field))return metadata;
  return {...metadata,manual:{...metadata?.manual,[field]:true}};
}

// Saved documents remain snapshots. Call only after a source selection or explicit refresh.
export function applyDocumentAutofill(context={},metadata={},source=null,itemId='',now=new Date().toISOString()){
  const item=source?.items.find(i=>String(i.id)===String(itemId));
  const values={number:source?.tender.number||'',agency:source?.tender.agency||'',process:source?.tender.process||'',object:source?.tender.object||'',recipient:source?.tender.recipient||'',product:item?.product||'',quantity:item?.quantity||'',unit_price:item?.unit_price||''};
  const next={...context,item_id:item?.id||''},manual={...metadata.manual},retained=[];
  for(const field of AUTOFILL_FIELDS){
    const current=String(context[field]??''),previous=metadata.applied?.[field];
    if(manual[field]||(current!==''&&current!==previous)){
      manual[field]=true;retained.push(field);
    }else next[field]=values[field];
  }
  return {context:next,metadata:{tender_id:source?.tender.id||'',item_id:item?.id||'',applied:values,manual,updated_at:now},retained};
}
