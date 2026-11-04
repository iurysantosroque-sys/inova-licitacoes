import {assistedConnector} from './common.js';
export const CNDT_SOURCE={id:'cndt',typeId:'cndt',name:'TST — CNDT',url:'https://cndt-certidao.tst.jus.br/',emissionUrl:'https://cndt-certidao.tst.jus.br/gerarCertidao',validationUrl:'https://cndt-certidao.tst.jus.br/consultarCertidao',documentationUrl:'https://www.tst.jus.br/certidao1',limitation:'Emissão com desafio visual e validação no portal TST. Não há API de emissão autorizada/homologada nesta instalação. O sistema não resolve CAPTCHA nem automatiza endpoints internos.'};
export const cndtConnector=()=>assistedConnector(CNDT_SOURCE);
