// PostgreSQL descartável, sem conexão ao banco da empresa.
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const pkg=resolve(process.argv[2]||'tmp/central-stage2-runtime/node_modules/@electric-sql/pglite');
const {PGlite}=await import(pathToFileURL(join(pkg,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(join(pkg,'dist/contrib/pgcrypto.js')));
const db=new PGlite({extensions:{pgcrypto}}),read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
try{
 for(const file of ['tests/helpers/central-local-bootstrap.sql','supabase/migrations/202608260001_add_qualification_documents.sql','supabase/migrations/202609180001_fix_qualification_storage_download_policy.sql','supabase/migrations/20261104155400_central_document_center.sql','supabase/migrations/20261104172113_central_official_connectors.sql'])await db.exec(await read(file));
 for(const suite of ['tests/document-center-rls.sql','tests/document-center-official-rls.sql']){
  await db.exec('begin;');await db.exec(await read(suite));await db.exec('rollback;');console.log('PASS PostgreSQL local:',suite);
 }
}catch(error){console.error(JSON.stringify({message:error.message,detail:error.detail,where:error.where}));process.exitCode=1;}
finally{await db.close();}
