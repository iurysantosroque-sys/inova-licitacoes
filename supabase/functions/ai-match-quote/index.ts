import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Content-Type':'application/json'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'Método não permitido'},405)
  try{
    if(Number(req.headers.get('content-length')||0)>1_000_000)return json({error:'Payload excede o limite de 1 MB'},413)
    const authorization=req.headers.get('Authorization')||''
    if(!authorization.startsWith('Bearer '))return json({error:'Não autorizado'},401)
    const url=Deno.env.get('SUPABASE_URL')
    const anon=Deno.env.get('SUPABASE_ANON_KEY')
    const geminiKey=Deno.env.get('GEMINI_API_KEY')
    if(!url||!anon)throw new Error('Ambiente Supabase incompleto')
    if(!geminiKey)throw new Error('GEMINI_API_KEY não configurada')

    const db=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}})
    const {data:userData,error:userError}=await db.auth.getUser()
    if(userError||!userData.user)return json({error:'Não autorizado'},401)

    const body=await req.json()
    const tenderId=String(body?.tender_id||'')
    if(!tenderId)return json({error:'tender_id é obrigatório'},400)
    const quoteItems=Array.isArray(body?.quote_items)?body.quote_items.slice(0,500):[]
    if(!quoteItems.length)return json({error:'quote_items é obrigatório'},400)

    // A consulta usa o JWT do chamador e as políticas RLS. Um edital de outra
    // empresa não é retornado, mesmo que o cliente envie IDs arbitrários.
    const {data:tender,error:tenderError}=await db.from('tenders').select('id,company_id').eq('id',tenderId).single()
    if(tenderError||!tender)return json({error:'Licitação não encontrada ou sem acesso'},403)
    const {data:membership}=await db.from('company_members').select('user_id').eq('company_id',tender.company_id).eq('user_id',userData.user.id).maybeSingle()
    if(!membership)return json({error:'Usuário não pertence à empresa da licitação'},403)
    const {data:tenderItems,error:itemsError}=await db.from('tender_items')
      .select('id,item_number,description,quantity,unit').eq('tender_id',tenderId).order('item_number')
    if(itemsError)throw itemsError
    if(!tenderItems?.length)return json({error:'A licitação não possui itens'},400)

    const compactQuotes=quoteItems.map((row:any,index:number)=>({
      row_index:Number.isInteger(Number(row?.row_index))?Number(row.row_index):index,
      code:String(row?.code||'').slice(0,120),description:String(row?.description||'').slice(0,1200),
      quantity:Number(row?.quantity)||null,unit:String(row?.unit||'').slice(0,40),price:Number(row?.price)||null,
      brand:String(row?.brand||'').slice(0,160),presentation:String(row?.presentation||'').slice(0,240)
    })).filter((row:any)=>row.description)

    const prompt=`Associe produtos de uma cotação aos itens de uma licitação brasileira. Seja conservador: match=false quando especificação, medida, material ou apresentação forem incompatíveis. Use apenas tender_item_id existentes na lista. Retorne JSON puro no formato {"matches":[{"row_index":0,"match":true,"tender_item_id":"uuid ou null","item_number":1,"confidence":0.0,"reason":"curto"}]}.\n\nITENS OFICIAIS:\n${JSON.stringify(tenderItems)}\n\nPRODUTOS DO FORNECEDOR:\n${JSON.stringify(compactQuotes)}`
    const model=Deno.env.get('GEMINI_MODEL')||'gemini-3.5-flash-lite'
    const controller=new AbortController()
    const timer=setTimeout(()=>controller.abort(),20000)
    let response:Response
    try{
      response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
        method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},signal:controller.signal,
        body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.1}})
      })
    }finally{clearTimeout(timer)}
    if(!response.ok)return json({error:`Serviço de IA indisponível (HTTP ${response.status})`},response.status===429?429:502)
    const generated=await response.json()
    const text=generated?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('')||''
    const clean=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')
    const parsed=JSON.parse(clean)
    const validIds=new Map(tenderItems.map((item:any)=>[String(item.id),item]))
    const validRows=new Set(compactQuotes.map((row:any)=>row.row_index))
    const matches=(Array.isArray(parsed?.matches)?parsed.matches:[]).filter((m:any)=>validRows.has(Number(m.row_index))).map((m:any)=>{
      const item=validIds.get(String(m.tender_item_id||''))
      const confidence=Math.max(0,Math.min(1,Number(m.confidence)||0))
      const match=Boolean(m.match&&item&&confidence>=0.5)
      return {row_index:Number(m.row_index),match,tender_item_id:match?item.id:null,item_number:match?item.item_number:null,confidence,reason:String(m.reason||'').slice(0,300)}
    })
    return json({success:true,provider:'gemini',model,matches})
  }catch(error){
    const message=error instanceof Error?error.message:String(error)
    const aborted=error instanceof Error&&error.name==='AbortError'
    return json({error:aborted?'Tempo limite da IA excedido':message},aborted?504:(message.includes('não configurada')?503:400))
  }
})
