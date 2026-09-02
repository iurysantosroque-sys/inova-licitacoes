import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const API='https://pncp.gov.br/api'
// O PNCP pode levar alguns segundos para responder em editais com muitos itens.
// Mantemos um limite finito, mas acima do timeout típico do portal, para que a
// consulta consiga concluir antes de o cliente aplicar suas tentativas de retry.
// O PNCP costuma demorar mais de 7 segundos para liberar editais recentes.
// O limite anterior abortava uma consulta válida antes de a API responder.
const TOTAL_BUDGET_MS=45_000
const FETCH_TIMEOUT_MS=15_000
const SEARCH_CONCURRENCY=4
const PAGE_SIZE=100
const MODALITIES=[6,8,9,4,5,7,12,1,2,3,10,11,13]

class BudgetExceeded extends Error{constructor(){super('BUDGET');this.name='BudgetExceeded'}}
class PncpHttpError extends Error{
  constructor(public status:number,public hint=''){super(`PNCP_HTTP_${status}`);this.name='PncpHttpError'}
}
type Metrics={fetches:number,failures:number}

function controlParts(value:string){
  let decoded=''
  try{decoded=decodeURIComponent(value||'')}catch{decoded=value||''}
  const path=decoded.match(/editais\/(\d{14})\/(20\d{2})\/(\d{1,10})(?:[/?#]|$)/i)
  if(path)return {cnpj:path[1],ano:Number(path[2]),sequencial:Number(path[3])}
  const control=decoded.match(/(\d{14})-\d+-0*(\d{1,10})\/(20\d{2})/)
  return control?{cnpj:control[1],ano:Number(control[3]),sequencial:Number(control[2])}:null
}
function parseEditalNumber(value:string){
  const match=String(value||'').trim().match(/(?:^|\D)0*(\d{1,6})\s*[\/.-]\s*(20\d{2})(?:\D|$)/)
  return match?{numero:Number(match[1]),ano:Number(match[2])}:null
}
function ymd(date:Date){return date.toISOString().slice(0,10).replaceAll('-','')}
function normalize(value:unknown){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')
}
function compraMatches(row:any,target:{numero:number,ano:number}){
  if(Number(row?.anoCompra||0)!==target.ano)return false
  const raw=String(row?.numeroCompra??'').trim()
  if(!raw)return false
  if(/^0*\d{1,6}$/.test(raw)&&Number(raw)===target.numero)return true
  return [...raw.matchAll(/(?:^|\D)0*(\d{1,6})(?:\D|$)/g)].some(match=>Number(match[1])===target.numero)
}
function rowsFromPayload(payload:any){
  return Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.content)?payload.content:Array.isArray(payload?.itens)?payload.itens:[]
}
function decodeHtmlAttribute(value:string){
  return value.replace(/&quot;/g,'"').replace(/&#039;|&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
}
function brMoney(value:unknown){
  const clean=String(value??'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.')
  const parsed=Number(clean)
  return Number.isFinite(parsed)?parsed:null
}
function licitanetQuantity(value:unknown){
  let clean=String(value??'').trim()
  if(/^\d{1,3}(?:\.\d{3})+\.\d{2}$/.test(clean))clean=clean.slice(0,-3).replace(/\./g,'')+clean.slice(-3)
  const parsed=Number(clean.replace(',','.'))
  return Number.isFinite(parsed)?parsed:1
}
function friendlyError(error:unknown){
  if(error instanceof BudgetExceeded)return 'A consulta atingiu o limite de tempo. Use o link ou número de controle PNCP para abrir diretamente.'
  if(error instanceof PncpHttpError){
    if(error.status===404)return 'Contratação não encontrada no PNCP.'
    if(error.status===429)return 'O PNCP limitou temporariamente as consultas. Aguarde um instante e tente novamente.'
    return `O PNCP está temporariamente indisponível (HTTP ${error.status}). Tente novamente.`
  }
  if(error instanceof Error&&error.name==='AbortError')return 'O PNCP demorou demais para responder. Tente novamente.'
  return 'Não foi possível consultar o PNCP neste momento. Tente novamente.'
}

async function getJson(url:string,deadline:number,metrics:Metrics){
  const remaining=deadline-Date.now()
  if(remaining<800)throw new BudgetExceeded()
  metrics.fetches++
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),Math.min(FETCH_TIMEOUT_MS,Math.max(250,remaining-250)))
  try{
    // O PNCP alterna entre os hosts principal e www. Tratamos o Location de
    // forma explícita porque o runtime pode devolver o 301 sem segui-lo.
    let current=url
    for(let redirects=0;redirects<=3;redirects++){
      // O manual do PNCP especifica `accept: */*` para este recurso. O WAF do
      // portal pode reter chamadas do endpoint legado quando o cliente exige
      // `application/json`, embora a resposta bem-sucedida continue sendo JSON.
      const response=await fetch(current,{headers:{Accept:'*/*'},redirect:'manual',signal:controller.signal})
      if(response.status>=300&&response.status<400){
        const location=response.headers.get('location')
        if(!location){
          const hint=(await response.text()).slice(0,240).replace(/\s+/g,' ').trim()
          metrics.failures++;throw new PncpHttpError(response.status,hint)
        }
        const next=new URL(location,current)
        if(next.protocol!=='https:'||!/(^|\.)pncp\.gov\.br$/i.test(next.hostname)){
          metrics.failures++;throw new PncpHttpError(response.status,next.toString())
        }
        current=next.toString()
        continue
      }
      if(!response.ok){metrics.failures++;throw new PncpHttpError(response.status)}
      if(response.status===204)return null
      const raw=await response.text()
      return raw?JSON.parse(raw):null
    }
    metrics.failures++
    throw new PncpHttpError(508)
  }catch(error){
    if(!(error instanceof PncpHttpError))metrics.failures++
    throw error
  }finally{clearTimeout(timer)}
}

async function getLicitanetItems(url:string,deadline:number,metrics:Metrics){
  const remaining=deadline-Date.now()
  if(remaining<800)throw new BudgetExceeded()
  metrics.fetches++
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),Math.min(4_500,Math.max(250,remaining-250)))
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{
      'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language':'pt-BR,pt;q=0.9,en;q=0.8',
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
      'Sec-Fetch-Dest':'document','Sec-Fetch-Mode':'navigate','Sec-Fetch-Site':'none','Upgrade-Insecure-Requests':'1'
    }})
    if(!response.ok)throw new PncpHttpError(response.status)
    const html=await response.text()
    const encoded=html.match(/data-page="([^"]+)"/)?.[1]
    if(!encoded)return []
    const page=JSON.parse(decodeHtmlAttribute(encoded))
    const rows=page?.props?.disputeRoom?.items
    if(!Array.isArray(rows))return []
    return rows.map((row:any,index:number)=>({
      numeroItem:Number(row?.batch||index+1),
      descricao:String(row?.name||''),
      quantidade:licitanetQuantity(row?.quantity),
      unidadeMedida:String(row?.unit||'UN'),
      valorUnitarioEstimado:brMoney(row?.estimatedValue),
      valorTotal:brMoney(row?.totalEstimatedValue)
    }))
  }catch(error){metrics.failures++;throw error}
  finally{clearTimeout(timer)}
}

async function detail(cnpj:string,ano:number,sequencial:number,deadline:number,metrics:Metrics){
  const detailPath=`/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`
  const detailUrls=[
    `${API}${detailPath}`,
    `https://www.pncp.gov.br/api${detailPath}`,
    `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`
  ]
  let tender:any=null,lastError:unknown=null
  // O PNCP alterna entre os hosts principal e www. Consultar os dois em
  // paralelo evita esperar o limite inteiro quando um deles está lento.
  try{
    tender=await Promise.any(detailUrls.map(url=>getJson(url,deadline,metrics)))
  }catch(error){
    lastError=error instanceof AggregateError ? error.errors?.[0] : error
  }
  if(!tender)throw lastError||new PncpHttpError(404)

  const realCnpj=String(tender?.orgaoEntidade?.cnpj||cnpj).replace(/\D/g,'')
  const realAno=Number(tender?.anoCompra||ano)
  const realSequencial=Number(tender?.sequencialCompra||sequencial)
  const items:any[]=[]
  const seen=new Set<string>()
  let partial=false,itemSourceWorked=false

  // Quando o WAF do PNCP retém o endpoint legado, aproveitamos a fonte
  // pública indicada pelo próprio PNCP. A sessão pública da Licitanet expõe
  // todos os itens em dados estruturados, sem exigir login.
  const origin=String(tender?.linkSistemaOrigem||'')
  if(/^https:\/\/(?:www\.)?licitanet\.com\.br\/sessao\/\d+/i.test(origin)){
    try{
      const rows=await getLicitanetItems(origin,deadline,metrics)
      for(const row of rows){
        const key=String(row.numeroItem)
        if(!seen.has(key)){seen.add(key);items.push(row)}
      }
      if(rows.length)itemSourceWorked=true
    }catch{/* tenta a fonte oficial do PNCP abaixo */}
  }
  const itemSources=[
    // O PNCP limita algumas contratações a 10 itens quando estes parâmetros
    // são omitidos. Pedir uma página ampla recupera a lista completa.
    {url:`${API}/pncp/v1/orgaos/${realCnpj}/compras/${realAno}/${realSequencial}/itens`,paginated:true},
    // Mantém compatibilidade caso o PNCP conclua a migração deste recurso.
    {url:`${API}/consulta/v1/orgaos/${realCnpj}/compras/${realAno}/${realSequencial}/itens`,paginated:true}
  ]
  // Mesmo quando a Licitanet fornece uma lista parcial, consulte também a
  // fonte oficial do PNCP para completar editais com muitos itens.
  for(const source of itemSources){
    let sourceFailed=false
    let sourceHadRows=false
    for(let page=1;page<=100;page++){
      if(Date.now()>deadline-900){partial=true;break}
      try{
        const url=new URL(source.url)
        if(source.paginated){
          url.searchParams.set('pagina',String(page))
          url.searchParams.set('tamanhoPagina','500')
        }
        const payload=await getJson(url.toString(),deadline,metrics)
        const rows=rowsFromPayload(payload)
        if(rows.length){sourceHadRows=true;itemSourceWorked=true}
        for(const row of rows){
          const key=String(row?.numeroItem??`${page}-${items.length}`)
          if(seen.has(key))continue
          seen.add(key);items.push(row)
        }
        if(!source.paginated)break
        const totalPagesRaw=payload?.totalPaginas??payload?.totalPages??payload?.pagination?.totalPages
        const totalPages=Number(totalPagesRaw)
        if(!rows.length)break
        if(Number.isFinite(totalPages)&&totalPages>0&&page>=totalPages)break
        // Alguns endpoints do PNCP ignoram tamanhoPagina=500 e devolvem 10, 50
        // ou 100 linhas. Nesses casos, continue até a página vazia em vez de
        // interpretar uma página curta como o fim da contratação.
        if(page===100)partial=true
      }catch{sourceFailed=true;break}
    }
    if(sourceHadRows&&!sourceFailed)break
  }
  if(!itemSourceWorked)partial=true
  return {
    mode:'detail',tender,items,has_more:partial,
    message:partial?'Dados principais carregados, mas o PNCP não disponibilizou a lista completa de itens nesta tentativa. Tente atualizar novamente.':''
  }
}

async function searchPublished(query:string,year:number,uf:string,deadline:number,metrics:Metrics){
  const normalized=normalize(query)
  const parsed=parseEditalNumber(query)
  const results:any[]=[]
  const seen=new Set<string>()
  const today=new Date()
  const yearStart=new Date(Date.UTC(year,0,1))
  const yearEnd=year===today.getUTCFullYear()?today:new Date(Date.UTC(year,11,31))
  let end=new Date(yearEnd),reachedYearStart=false,partial=false

  outer: while(end>=yearStart){
    const start=new Date(Math.max(yearStart.getTime(),end.getTime()-20*86_400_000))
    for(let offset=0;offset<MODALITIES.length;offset+=SEARCH_CONCURRENCY){
      if(Date.now()>deadline-1_000){partial=true;break outer}
      const group=MODALITIES.slice(offset,offset+SEARCH_CONCURRENCY)
      const settled=await Promise.allSettled(group.map(modality=>{
        const params=new URLSearchParams({
          dataInicial:ymd(start),dataFinal:ymd(end),codigoModalidadeContratacao:String(modality),pagina:'1',tamanhoPagina:String(PAGE_SIZE)
        })
        if(uf)params.set('uf',uf)
        return getJson(`${API}/consulta/v1/contratacoes/publicacao?${params}`,deadline,metrics)
      }))
      for(const outcome of settled){
        if(outcome.status==='rejected'){partial=true;continue}
        const rows=rowsFromPayload(outcome.value)
        if(rows.length>=PAGE_SIZE)partial=true
        for(const row of rows){
          if(uf&&String(row?.unidadeOrgao?.ufSigla||row?.uf||'').toUpperCase()!==uf)continue
          const matches=parsed?compraMatches(row,parsed):normalize(`${row?.numeroCompra||''} ${row?.processo||''} ${row?.numeroControlePNCP||''} ${row?.objetoCompra||''} ${row?.orgaoEntidade?.razaoSocial||''}`).includes(normalized)
          if(!matches)continue
          const key=String(row?.numeroControlePNCP||`${row?.orgaoEntidade?.cnpj}-${row?.anoCompra}-${row?.sequencialCompra}`)
          if(seen.has(key))continue
          seen.add(key)
          results.push({
            numeroControlePNCP:row?.numeroControlePNCP||'',numeroCompra:row?.numeroCompra||'',processo:row?.processo||'',
            objetoCompra:row?.objetoCompra||'',modalidadeNome:row?.modalidadeNome||'',
            dataAberturaProposta:row?.dataAberturaProposta||null,dataEncerramentoProposta:row?.dataEncerramentoProposta||null,
            valorTotalEstimado:row?.valorTotalEstimado??null,orgao:row?.orgaoEntidade?.razaoSocial||row?.orgaoEntidade?.nome||'',
            cnpj:row?.orgaoEntidade?.cnpj||row?.cnpjOrgao||'',municipio:row?.unidadeOrgao?.municipioNome||'',
            uf:row?.unidadeOrgao?.ufSigla||row?.uf||'',anoCompra:Number(row?.anoCompra||year),
            sequencialCompra:Number(row?.sequencialCompra||row?.sequencialCompraPncp||0)
          })
          if(results.length>=50){partial=true;break outer}
        }
      }
    }
    // Uma busca por número de edital já é precisa. Depois de consultar todas as
    // modalidades da janela que encontrou resultados, não há motivo para varrer
    // as demais datas do ano e manter o usuário esperando.
    if(parsed&&results.length){partial=true;break}
    if(start.getTime()===yearStart.getTime()){reachedYearStart=true;break}
    end=new Date(start.getTime()-86_400_000)
  }
  if(!reachedYearStart)partial=true
  const message=partial
    ?results.length?'Busca parcial concluída. Para localizar outro edital com precisão, use o link ou número de controle PNCP.':'O PNCP respondeu parcialmente. Refine o ano/UF ou use o link ou número de controle PNCP.'
    :''
  return {mode:'search',query,year,uf,results,has_more:partial,message}
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'Método não permitido'},405)
  if(Number(req.headers.get('content-length')||0)>65_536)return json({error:'Requisição muito grande'},413)
  const requestId=crypto.randomUUID(),started=Date.now(),deadline=started+TOTAL_BUDGET_MS
  const metrics:Metrics={fetches:0,failures:0}
  try{
    const raw=await req.text()
    if(new TextEncoder().encode(raw).byteLength>65_536)return json({error:'Requisição muito grande'},413)
    let body:any
    try{body=JSON.parse(raw)}catch{return json({error:'Requisição inválida'},400)}
    const query=String(body?.query||'').trim()
    if(query.length<2)return json({error:'Informe ao menos dois caracteres, um link ou o número de controle PNCP.'},400)
    const direct=controlParts(query)
    let result:any
    if(direct)result=await detail(direct.cnpj,direct.ano,direct.sequencial,deadline,metrics)
    else if(body?.cnpj&&body?.ano&&body?.sequencial){
      result=await detail(String(body.cnpj).replace(/\D/g,''),Number(body.ano),Number(body.sequencial),deadline,metrics)
    }else return json({error:'Cole o link completo do edital no PNCP para carregar os dados e os itens.'})
    console.info(JSON.stringify({event:'pncp_complete',requestId,mode:result?.mode,durationMs:Date.now()-started,fetches:metrics.fetches,failures:metrics.failures,resultCount:result?.results?.length||0,itemCount:result?.items?.length||0,partial:Boolean(result?.has_more)}))
    return json(result)
  }catch(error){
    const message=friendlyError(error)
    console.warn(JSON.stringify({event:'pncp_failed',requestId,durationMs:Date.now()-started,fetches:metrics.fetches,failures:metrics.failures,code:error instanceof PncpHttpError?`HTTP_${error.status}`:error instanceof Error?error.name:'UNKNOWN'}))
    return json({error:message,code:'PNCP_UNAVAILABLE'})
  }
})
