// Conectores assistidos: não executam scraping, login, CAPTCHA ou emissão simulada.
export const OFFICIAL_SOURCES=[
 {id:'rfb',name:'RFB / PGFN',url:'https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal',limitation:'Emissão e autenticação no portal oficial. API não homologada para esta empresa.'},
 {id:'fgts',name:'CAIXA — FGTS / CRF',url:'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf',limitation:'Consulta assistida. CAPTCHA e acesso restrito exigem intervenção do usuário.'},
 {id:'cndt',name:'TST — CNDT',url:'https://cndt-certidao.tst.jus.br/',limitation:'Emissão e validação assistidas no TST. Nenhuma API de emissão está habilitada.'},
 {id:'tcu',name:'TCU — consultas',url:'https://certidoes-apf.apps.tcu.gov.br/',limitation:'Consulta assistida. Resultado e abrangência precisam ser conferidos na fonte.'},
 {id:'regional',name:'Órgãos estaduais, municipais e judiciais',url:'',limitation:'Configure a jurisdição e a fonte oficial após revisão; não há conector universal.'}
];
export function officialConnector(id){const source=OFFICIAL_SOURCES.find(s=>s.id===id)||OFFICIAL_SOURCES.at(-1);const intervention=()=>({mode:'ASSISTIDO',status:'intervencao_necessaria',official_url:source.url,reason:source.limitation,official_result:null});return {source,capabilities:{MANUAL:true,ASSISTIDO:!!source.url,AUTOMATICO_AUTORIZADO:false},consultarSituacao:async()=>intervention(),verificarEmissao:async()=>intervention(),solicitarEmissao:async()=>intervention(),baixarDocumento:async()=>intervention(),validarAutenticidade:async()=>intervention(),identificarIntervencao:intervention};}
