import { PageHead } from "@/components/shared";
export default function Privacy() {
  return (
    <div className="container page prose-page">
      <PageHead
        eyebrow="PRIVACIDADE E METODOLOGIA"
        title="Confiança se constrói com clareza."
        description="Política técnica da instalação local · versão de 2 de novembro de 2026."
      />
      <article className="card">
        <h2>Finalidade e dados mínimos</h2>
        <p>
          A participação é voluntária. Coletamos as respostas da pesquisa, a
          data, o estado e o município informados manualmente. Não solicitamos
          nome, CPF, endereço, localização precisa ou preferência política
          individual. A finalidade é organizar e publicar opiniões agregadas
          sobre serviços e prioridades.
        </p>
        <h2>Identificador anônimo e rascunhos</h2>
        <p>
          Um cookie técnico aleatório, assinado e HttpOnly permite limitar uma
          participação por pesquisa e um apoio por ideia neste navegador. No
          servidor é armazenado apenas um HMAC desse identificador. Apagar o
          cookie ou trocar de navegador pode permitir nova participação; a
          plataforma não garante eliminar duplicações. O IP é usado
          temporariamente em memória, em forma HMAC, para limitar requisições e
          não é salvo no banco pela aplicação.
        </p>
        <p>
          Rascunhos ficam no armazenamento local do navegador por até 7 dias,
          são descartados ao reabrir um rascunho expirado e removidos após o
          envio. Você pode limpar o rascunho no questionário. Em computadores
          compartilhados, evite deixar respostas salvas.
        </p>
        <h2>Agregação e proteção de amostras</h2>
        <p>
          Distribuições de uma pergunta só são divulgadas com ao menos 5
          respostas e sem alternativas com 1 a 4 respostas. A pergunta inteira é
          suprimida quando uma célula não atende esse limite, reduzindo
          inferências por subtração. Totais globais de participação continuam
          visíveis. Séries mensais e contagens no mapa suprimem grupos com menos
          de 5 respostas. Esses limites reduzem riscos, mas não tornam
          impossível toda inferência entre filtros sobrepostos.
        </p>
        <p>
          Escalas usam valores de 1 a 5 e média aritmética. Questões de múltipla
          seleção calculam percentuais sobre o total de pessoas que responderam
          à questão e podem somar mais de 100%. Rankings mostram a primeira
          prioridade escolhida. Perguntas condicionais têm sua própria base de
          participantes elegíveis. Perguntas opcionais não respondidas ficam
          fora da base da questão.
        </p>
        <h2>Conteúdo livre e moderação</h2>
        <p>
          Respostas discursivas de pesquisas não são publicadas. Ideias aguardam
          revisão antes de serem publicadas e podem ser ocultadas após denúncia.
          Não inclua dados pessoais seus ou de terceiros. Apoios representam
          engajamento nesta instalação.
        </p>
        <h2>Retenção e acesso</h2>
        <p>
          Por padrão, respostas, identificadores de participação, apoios,
          denúncias e logs de auditoria são apagados após 730 dias por uma
          rotina diária. Ideias também são removidas após esse prazo quando não
          há registros dependentes ativos. A retenção pode ser configurada pelo
          operador e deve ser comunicada aqui antes de uma publicação pública.
          Os resultados são recalculados após a exclusão.
        </p>
        <p>
          Operações administrativas exigem autenticação e são registradas em
          auditoria. A exportação administrativa contém somente agregados com as
          mesmas supressões, sem textos individuais ou identificadores de
          participantes.
        </p>
        <h2>Responsabilidade da instalação</h2>
        <p>
          Esta é uma instalação local. Antes de abrir ao público, o operador
          deve identificar aqui o controlador, disponibilizar contato para
          direitos dos titulares, definir a base legal adequada e configurar
          HTTPS, backups protegidos e sua política de acesso. Ainda não há um
          canal de atendimento ao titular configurado nesta instalação.
        </p>
        <h2>Interpretação responsável</h2>
        <p>
          Os dados descrevem uma amostra voluntária de usuários da plataforma.
          Não há sorteio amostral, ponderação populacional, margem de erro
          eleitoral ou alegação de representatividade. Comparações exigem a
          mesma pergunta e as mesmas opções da mesma pesquisa. Diferenças entre
          amostras não permitem concluir diferenças entre populações.
        </p>
        <h2>Fontes geográficas</h2>
        <p>
          As localidades e os códigos territoriais foram obtidos da{" "}
          <a href="https://servicodados.ibge.gov.br/api/docs/localidades">
            API oficial de localidades do IBGE
          </a>
          . A malha estadual usa o{" "}
          <a href="https://servicodados.ibge.gov.br/api/docs/malhas">
            serviço oficial de malhas do IBGE
          </a>
          . O mapa é um recurso de navegação, sem geolocalização do
          participante.
        </p>
      </article>
    </div>
  );
}
