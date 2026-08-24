import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const API='https://pncp.gov.br/api'
const TOTAL_BUDGET_MS=18_000
const FETCH_TIMEOUT_MS=4_500
const SEARCH_CONCURRENCY=4
const PAGE_SIZE=100
const MODALITIES=[6,8,9,4,5,7,12,1,2,3,10,11,13]

class BudgetExceeded extends Error{constructor(){super('BUDGET');this.name='BudgetExceeded'}}
class PncpHttpError extends Error{
  constructor(public status:number){super(`PNCP_HTTP_${status}`);this.name='PncpHttpError'}
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
    const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'INOVA-Licitacoes/36.11.3'},signal:controller.signal})
    if(!response.ok){metrics.failures++;throw new PncpHttpError(response.status)}
    if(response.status===204)return null
    const raw=await response.text()
    return raw?JSON.parse(raw):null
  }catch(error){
    if(!(error instanceof PncpHttpError))metrics.failures++
    throw error
  }finally{clearTimeout(timer)}
}

async function detail(cnpj:string,ano:number,sequencial:number,deadline:number,metrics:Metrics){
  const detailBases=[
    `${API}/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`,
    `${API}/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`
  ]
  let tender:any=null,lastError:unknown=null
  for(const candidate of detailBases){
    try{tender=await getJson(candidate,deadline,metrics);if(tender)break}catch(error){lastError=error}
  }
  if(!tender)throw lastError||new PncpHttpError(404)

  const realCnpj=String(tender?.orgaoEntidade?.cnpj||cnpj).replace(/\D/g,'')
  const realAno=Number(tender?.anoCompra||ano)
  const realSequencial=Number(tender?.sequencialCompra||sequencial)
  const itemBases=[
    `${API}/pncp/v1/orgaos/${realCnpj}/compras/${realAno}/${realSequencial}/itens`,
    `${API}/consulta/v1/orgaos/${realCnpj}/compras/${realAno}/${realSequencial}/itens`
  ]
  const items:any[]=[]
  const seen=new Set<string>()
  let partial=false,itemSourceWorked=false

  for(const base of itemBases){
    let sourceFailed=false
    for(let page=1;page<=10;page++){
      if(Date.now()>deadline-900){partial=true;break}
      try{
        const url=new URL(base)
        url.searchParams.set('pagina',String(page))
        url.searchParams.set('tamanhoPagina','500')
        const payload=await getJson(url.toString(),deadline,metrics)
        const rows=rowsFromPayload(payload)
        itemSourceWorked=true
        for(const row of rows){
          const key=String(row?.numeroItem??`${page}-${items.length}`)
          if(seen.has(key))continue
          seen.add(key);items.push(row)
        }
        const totalPages=Number(payload?.totalPaginas??payload?.totalPages??page)
        if(!rows.length||page>=totalPages||rows.length<500)break
        if(page===10)partial=true
      }catch{sourceFailed=true;break}
    }
    if(itemSourceWorked&&!sourceFailed)break
  }
  if(!itemSourceWorked)partial=true
  return {
    mode:'detail',tender,items,has_more:partial,
    message:partial?'Dados principais carregados, mas o PNCP não entregou todos os itens dentro do tempo. Tente atualizar novamente.':''
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

