// Supabase Edge Function: processar-cotacao
// Secrets necessários: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!
    if (!openaiKey) throw new Error('OPENAI_API_KEY não configurada')

    const admin = createClient(supabaseUrl, serviceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return json({ error: 'Não autorizado' }, 401)

    const { documento_id } = await req.json()
    if (!documento_id) throw new Error('documento_id é obrigatório')

    const { data: perfil } = await admin.from('perfis').select('empresa_id').eq('id', userData.user.id).single()
    if (!perfil?.empresa_id) return json({ error: 'Usuário sem empresa' }, 403)

    const { data: doc, error: docError } = await admin.from('documentos').select('*').eq('id', documento_id).eq('empresa_id', perfil.empresa_id).single()
    if (docError || !doc) return json({ error: 'Documento não encontrado' }, 404)

    const { data: itens } = await admin.from('itens').select('id,numero,descricao,quantidade,unidade').eq('licitacao_id', doc.licitacao_id).eq('empresa_id', perfil.empresa_id).order('numero')
    if (!itens?.length) throw new Error('A licitação não possui itens cadastrados')

    const { data: fileBlob, error: downloadError } = await admin.storage.from('licitacoes').download(doc.storage_path)
    if (downloadError || !fileBlob) throw new Error('Não foi possível baixar o arquivo')

    const fd = new FormData()
    fd.append('purpose', 'user_data')
    fd.append('file', fileBlob, doc.nome_arquivo)
    const upload = await fetch('https://api.openai.com/v1/files', { method:'POST', headers:{ Authorization:`Bearer ${openaiKey}` }, body:fd })
    if (!upload.ok) throw new Error(`OpenAI Files: ${await upload.text()}`)
    const openaiFile = await upload.json()

    const itemList = itens.map((i:any)=>`${i.id} | ITEM ${i.numero} | ${i.descricao} | QTD ${i.quantidade} ${i.unidade}`).join('\n')
    const schema = {
      type:'object', additionalProperties:false,
      properties:{
        fornecedor:{type:['string','null']},
        linhas:{type:'array',items:{
          type:'object', additionalProperties:false,
          properties:{
            item_id:{type:['string','null']}, descricao_fornecedor:{type:'string'}, marca:{type:['string','null']}, apresentacao:{type:['string','null']}, preco:{type:'number'}, fator_equivalencia:{type:'number'}, confianca:{type:'number'}
          },
          required:['item_id','descricao_fornecedor','marca','apresentacao','preco','fator_equivalencia','confianca']
        }}
      }, required:['fornecedor','linhas']
    }
    const prompt = `Você está extraindo uma cotação para licitação pública no Brasil. Leia o arquivo inteiro e associe cada produto cotado ao item MAIS PROVÁVEL da lista abaixo. Não associe quando houver incompatibilidade material. O preço deve ser o preço da apresentação ofertada. fator_equivalencia indica quantas unidades da unidade do edital existem em uma apresentação do fornecedor (ex.: galão 5 L para edital em L => 5). confianca entre 0 e 1.\n\nITENS DO EDITAL:\n${itemList}`

    const response = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{Authorization:`Bearer ${openaiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gpt-5.6-luna',
        input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_file',file_id:openaiFile.id}]}],
        text:{format:{type:'json_schema',name:'cotacao_extraida',strict:true,schema}}
      })
    })
    if (!response.ok) throw new Error(`OpenAI Responses: ${await response.text()}`)
    const result = await response.json()
    const text = (result.output || []).flatMap((o:any)=>o.content||[]).find((c:any)=>c.type==='output_text')?.text
    if (!text) throw new Error('A IA não retornou conteúdo estruturado')
    const parsed = JSON.parse(text)

    const validItemIds = new Set(itens.map((i:any)=>i.id))
    const rows = (parsed.linhas || []).filter((l:any)=>l.item_id && validItemIds.has(l.item_id) && Number(l.preco)>0 && Number(l.confianca)>=0.55).map((l:any)=>({
      empresa_id:perfil.empresa_id,
      item_id:l.item_id,
      fornecedor_id:doc.fornecedor_id,
      preco:Number(l.preco),
      apresentacao:l.apresentacao,
      fator_equivalencia:Math.max(Number(l.fator_equivalencia)||1,0.0001),
      frete_rateado:0,
      marca:l.marca,
      confianca_ia:Number(l.confianca)
    }))

    if (rows.length) {
      const { error: insertError } = await admin.from('cotacoes').insert(rows)
      if (insertError) throw insertError
    }
    await admin.from('documentos').update({status:'processado',resultado_ia:parsed}).eq('id',doc.id)
    return json({ ok:true, importadas:rows.length, total_extraidas:(parsed.linhas||[]).length, resultado:parsed })
  } catch (e) {
    return json({ error:e instanceof Error?e.message:String(e) }, 400)
  }
})

function json(body:any,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})}
