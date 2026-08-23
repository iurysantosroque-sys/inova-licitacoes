const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Content-Type':'application/json'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const API='https://pncp.gov.br/api'
const TOTAL_BUDGET_MS=19000

function controlParts(value:string){
  const decoded=decodeURIComponent(value||'')
  const path=decoded.match(/editais\/(\d{14})\/(\d{4})\/(\d+)/i)
  if(path)return {cnpj:path[1],ano:Number(path[2]),sequencial:Number(path[3])}
  const control=decoded.match(/(\d{14})-\d+-(\d+)\/(\d{4})/)
  return control?{cnpj:control[1],ano:Number(control[3]),sequencial:Number(control[2])}:null
}
function ymd(date:Date){return date.toISOString().slice(0,10).replaceAll('-','')}
function normalize(value:unknown){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
async function getJson(url:string,deadline:number){
  const remaining=deadline-Date.now()
  if(remaining<800)throw new Error('BUDGET')
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),Math.min(5000,remaining))
  try{
    const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal})
    if(!response.ok)throw new Error(`PNCP HTTP ${response.status}`)
    return await response.json()
  }finally{clearTimeout(timer)}
}
async function detail(cnpj:string,ano:number,sequencial:number,deadline:number){
  const bases=[`${API}/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`,`${API}/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`]
  let tender:any=null,base=bases[0]
  for(const candidate of bases){
    try{tender=await getJson(candidate,deadline);base=candidate;break}catch(error){if(candidate===bases.at(-1))throw error}
  }
  const items:any[]=[]
  let hasMore=false
  for(let page=1;page<=10;page++){
    if(Date.now()>deadline-1000){hasMore=true;break}
    let data:any
    try{data=await getJson(`${base}/itens?pagina=${page}&tamanhoPagina=500`,deadline)}
    catch(error){
      const fallback=base===bases[0]?bases[1]:bases[0]
      data=await getJson(`${fallback}/itens?pagina=${page}&tamanhoPagina=500`,deadline)
    }
    const rows=Array.isArray(data)?data:(data?.data||[])
    items.push(...rows)
    const totalPages=Number(data?.totalPaginas||data?.totalPages||page)
    if(!rows.length||page>=totalPages||rows.length<500)break
    if(page===10)hasMore=true
  }
  return {mode:'detail',tender,items,has_more:hasMore,message:hasMore?'Itens limitados para manter a consulta responsiva.':''}
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'Método não permitido'},405)
  if(Number(req.headers.get('content-length')||0)>65_536)return json({error:'Payload muito grande'},413)
  const deadline=Date.now()+TOTAL_BUDGET_MS
  try{
    const body=await req.json()
    const query=String(body?.query||'').trim()
    const direct=controlParts(query)
    if(direct)return json(await detail(direct.cnpj,direct.ano,direct.sequencial,deadline))
    if(body?.cnpj&&body?.ano&&body?.sequencial)return json(await detail(String(body.cnpj).replace(/\D/g,''),Number(body.ano),Number(body.sequencial),deadline))
    if(query.length<2)return json({error:'Informe ao menos dois caracteres para pesquisar'},400)

    const year=Math.max(2021,Math.min(2100,Number(body?.year)||new Date().getFullYear()))
    const uf=String(body?.uf||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,2)
    const modalities=[6,8,9,10,12,13]
    const normalized=normalize(query)
    const results:any[]=[]
    const seen=new Set<string>()
    let partial=false
    let reachedYearStart=false

    // No máximo oito janelas recentes do ano e uma página por modalidade.
    // O caminho direto por link/controle permanece completo e prioritário.
    const yearEnd=new Date(Date.UTC(year,11,31))
    const today=new Date()
    let end=year===today.getUTCFullYear()&&today<yearEnd?today:yearEnd
    outer: for(let windowIndex=0;windowIndex<8;windowIndex++){
      const start=new Date(end);start.setUTCDate(start.getUTCDate()-20)
      if(start.getUTCFullYear()<year)start=new Date(Date.UTC(year,0,1))
      for(const modality of modalities){
        if(Date.now()>deadline-1200){partial=true;break outer}
        const params=new URLSearchParams({dataInicial:ymd(start),dataFinal:ymd(end),codigoModalidadeContratacao:String(modality),pagina:'1',tamanhoPagina:'50'})
        if(uf)params.set('uf',uf)
        try{
          const data=await getJson(`${API}/consulta/v1/contratacoes/publicacao?${params}`,deadline)
          for(const row of (data?.data||[])){
            const hay=normalize(`${row.numeroCompra||''} ${row.processo||''} ${row.objetoCompra||''} ${row.numeroControlePNCP||''}`)
            if(!hay.includes(normalized))continue
            const key=String(row.numeroControlePNCP||`${row.orgaoEntidade?.cnpj}-${row.anoCompra}-${row.sequencialCompraPncp}`)
            if(!seen.has(key)){
              seen.add(key)
              results.push({
                numeroControlePNCP:row.numeroControlePNCP||'',numeroCompra:row.numeroCompra||'',processo:row.processo||'',
                objetoCompra:row.objetoCompra||'',modalidadeNome:row.modalidadeNome||'',
                dataAberturaProposta:row.dataAberturaProposta||null,dataEncerramentoProposta:row.dataEncerramentoProposta||null,
                valorTotalEstimado:row.valorTotalEstimado??null,orgao:row.orgaoEntidade?.razaoSocial||row.orgaoEntidade?.nome||'',
                cnpj:row.orgaoEntidade?.cnpj||row.cnpjOrgao||'',municipio:row.unidadeOrgao?.municipioNome||'',
                uf:row.unidadeOrgao?.ufSigla||row.uf||'',anoCompra:Number(row.anoCompra||year),
                sequencialCompra:Number(row.sequencialCompra||row.sequencialCompraPncp||0)
              })
            }
            if(results.length>=50){partial=true;break outer}
          }
        }catch(error){if(String(error).includes('BUDGET')||String(error).includes('AbortError')){partial=true;break outer}}
      }
      if(start.getUTCMonth()===0&&start.getUTCDate()===1){reachedYearStart=true;break}
      end=new Date(start);end.setUTCDate(end.getUTCDate()-1)
    }
    if(!reachedYearStart)partial=true
    return json({mode:'search',query,year,uf,results,has_more:partial,message:partial?'Busca limitada por tempo. Refine com UF, ano ou use o link/número de controle PNCP.':''})
  }catch(error){
    const message=error instanceof Error?error.message:String(error)
    return json({error:message==='BUDGET'||message.includes('AbortError')?'A consulta ao PNCP excedeu o tempo. Refine os filtros ou use o link direto.':message},message.includes('HTTP 404')?404:400)
  }
})
