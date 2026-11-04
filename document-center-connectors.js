import {RFB_SOURCE,rfbConnector} from './document-connectors/rfb-pgfn.js';
import {FGTS_SOURCE,fgtsConnector} from './document-connectors/fgts-crf.js';
import {CNDT_SOURCE,cndtConnector} from './document-connectors/cndt-tst.js';
import {assistedConnector} from './document-connectors/common.js';
export const OFFICIAL_SOURCES=[RFB_SOURCE,FGTS_SOURCE,CNDT_SOURCE,{id:'tcu',name:'TCU — consultas',url:'https://certidoes-apf.apps.tcu.gov.br/',limitation:'Consulta assistida; resultado e abrangência precisam de conferência na fonte.'},{id:'regional',name:'Órgãos estaduais, municipais e judiciais',url:'',limitation:'Configure jurisdição e fonte oficial; não há conector universal.'}];
export function officialConnector(id){const factory={rfb:rfbConnector,fgts:fgtsConnector,cndt:cndtConnector}[id];return factory?factory():assistedConnector(OFFICIAL_SOURCES.find(s=>s.id===id)||OFFICIAL_SOURCES.at(-1));}
