// Na dúvida, reter o arquivo. Um erro de leitura nunca prova que o upload é órfão.
export async function cleanupConfirmedOrphan(admin,path){
 if(!path)return;
 try{
  const [artifacts,versions]=await Promise.all([admin.from('central_connector_artifacts').select('id').eq('storage_path',path).limit(1),admin.from('qualification_documents').select('id').eq('storage_path',path).limit(1)]);
  if(!artifacts.error&&!versions.error&&Array.isArray(artifacts.data)&&Array.isArray(versions.data)&&artifacts.data.length===0&&versions.data.length===0)await admin.storage.from('qualification-files').remove([path]);
 }catch{
  // Não mascarar o resultado da gravação nem excluir arquivo em estado incerto.
 }
}
