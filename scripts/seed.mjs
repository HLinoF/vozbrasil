import fs from 'node:fs';
import {randomUUID as uuid} from 'node:crypto';
const states=JSON.parse(fs.readFileSync('.tools/states.json','utf8').replace(/^\uFEFF/,''));
const cities=JSON.parse(fs.readFileSync('.tools/municipalities.json','utf8').replace(/^\uFEFF/,''));
const sql=v=>v==null?'NULL':typeof v==='boolean'?String(v):typeof v==='number'?v:`'${String(v).replaceAll("'","''")}'`;
const insert=(table,values)=>`INSERT INTO ${table}(${Object.keys(values)}) VALUES(${Object.values(values).map(sql)});`;
const rows=['-- Fonte: API oficial de localidades do IBGE. Nenhuma resposta de demonstracao.'];
for(const s of states)rows.push(insert('states',{id:s.id,name:s.nome,uf:s.sigla}));
for(const c of cities){const state=c.microrregiao?.mesorregiao?.UF?.id??c['regiao-imediata']?.['regiao-intermediaria']?.UF?.id;if(!state)throw Error('UF ausente '+c.id);rows.push(insert('municipalities',{id:c.id,state_id:state,name:c.nome}));}
fs.writeFileSync('backend/src/main/resources/db/migration/V2__ibge_localities.sql',rows.join('\n'));
const themes=['Educação','Saúde','Segurança','Emprego','Tecnologia','Meio ambiente','Infraestrutura'];
const priority={key:'priority',text:'Qual deveria ser a principal prioridade dos investimentos públicos?',type:'SINGLE',theme:'Geral',options:themes};
const questions=[priority,
{key:'education',text:'O que mais precisa melhorar nas escolas públicas?',theme:'Educação',type:'MULTI',options:['Formação dos professores','Infraestrutura das escolas','Acesso à tecnologia','Alimentação e permanência']},
{key:'education_rating',text:'Como você avalia a qualidade da educação pública?',theme:'Educação',type:'SCALE'},
{key:'health',text:'Qual é o maior problema do SUS na sua região?',theme:'Saúde',type:'SINGLE',options:['Tempo de espera','Falta de especialistas','Falta de medicamentos','Estrutura das unidades']},
{key:'health_rating',text:'Como você avalia o atendimento público de saúde?',theme:'Saúde',type:'SCALE'},
{key:'security',text:'Você considera sua região segura?',theme:'Segurança',type:'SINGLE',options:['Sim','Em parte','Não']},
{key:'prevention',text:'Quais medidas preventivas são mais importantes?',theme:'Segurança',type:'MULTI',conditionKey:'security',conditionValue:'3',options:['Iluminação pública','Oportunidades para jovens','Policiamento comunitário','Espaços de convivência']},
{key:'jobs',text:'O que mais ajudaria a ampliar as oportunidades de emprego?',theme:'Emprego',type:'SINGLE',options:['Qualificação profissional','Apoio a pequenos negócios','Atração de investimentos','Primeiro emprego']},
{key:'innovation',text:'Quais investimentos em tecnologia deveriam vir primeiro?',theme:'Tecnologia',type:'RANK',options:['Pesquisa científica','Internet em áreas rurais','Serviços públicos digitais','Startups nacionais']},
{key:'environment',text:'Qual problema ambiental mais preocupa você?',theme:'Meio ambiente',type:'SINGLE',options:['Falta de saneamento','Desmatamento','Poluição dos rios','Eventos climáticos extremos']},
{key:'mobility',text:'Como você avalia o transporte público?',theme:'Infraestrutura',type:'SCALE'},
{key:'solution',text:'Qual mudança concreta você propõe para o Brasil?',theme:'Geral',type:'TEXT',required:false}];
const seeds=[
{title:'O Brasil que queremos construir',description:'Uma escuta sobre educação, saúde, segurança e as mudanças que devem vir primeiro. Sua experiência ajuda a revelar as prioridades de quem participa.',theme:'Geral',scope:'NATIONAL',questions},
{title:'As prioridades do seu estado',description:'Conte o que precisa avançar na sua unidade federativa. Selecione seu estado antes de participar.',theme:'Geral',scope:'STATE',questions:[priority,{key:'state_solution',text:'O que mais precisa melhorar no seu estado?',type:'TEXT',theme:'Geral'}]},
{title:'Uma cidade melhor começa por aqui',description:'Dos serviços públicos ao seu bairro: compartilhe o que tornaria seu município melhor para viver, sem informar seu endereço.',theme:'Infraestrutura',scope:'MUNICIPAL',questions:[priority,{key:'cleaning',text:'Como você avalia a limpeza urbana?',type:'SCALE',theme:'Infraestrutura'},{key:'neighborhood',text:'O que falta no seu bairro? Não inclua endereços ou dados pessoais.',type:'TEXT',theme:'Infraestrutura'}]},
{title:'Tecnologia a serviço das pessoas',description:'Ciência, conectividade e inovação para melhorar o dia a dia de quem vive no Brasil.',theme:'Tecnologia',scope:'THEMATIC',questions:[questions[8],{key:'science',text:'O Brasil deveria investir mais em pesquisa científica?',type:'SINGLE',theme:'Tecnologia',options:['Sim','Manter o investimento atual','Não sei avaliar']}]},
{title:'Sergipe: próximos caminhos',description:'Emprego, turismo e qualidade dos serviços: uma escuta dedicada a quem vive em Sergipe.',theme:'Geral',scope:'STATE',stateId:28,questions:[priority,{key:'tourism',text:'O que poderia estimular o turismo em Sergipe?',type:'MULTI',theme:'Emprego',options:['Infraestrutura dos destinos','Valorização da cultura local','Capacitação profissional','Preservação ambiental']},{key:'state_idea',text:'Qual deveria ser o principal investimento do estado?',type:'TEXT',theme:'Geral'}]}
];
const out=['-- Pesquisas editoriais iniciais; banco inicia com ZERO participacoes e ZERO ideias.'];
for(const s of seeds){const sid=uuid();out.push(insert('surveys',{id:sid,title:s.title,description:s.description,theme:s.theme,scope:s.scope,status:'PUBLISHED',state_id:s.stateId??null,created_at:'2026-11-02T00:00:00Z'}));s.questions.forEach((q,i)=>{const qid=uuid();out.push(insert('questions',{id:qid,survey_id:sid,question_key:q.key,text:q.text,type:q.type,theme:q.theme,required:q.required??true,position:i,condition_key:q.conditionKey??null,condition_value:q.conditionValue??null}));const opts=q.type==='SCALE'?['Muito ruim','Ruim','Regular','Bom','Muito bom']:(q.options??[]);opts.forEach((label,j)=>out.push(insert('question_options',{id:uuid(),question_id:qid,option_key:String(j+1),label,position:j})));});}
fs.writeFileSync('backend/src/main/resources/db/migration/V3__initial_surveys.sql',out.join('\n'));
console.log(`${states.length} UFs e ${cities.length} municípios oficiais; ${seeds.length} pesquisas, nenhuma resposta.`);
