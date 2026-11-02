package br.org.vozbrasil;

import static br.org.vozbrasil.Dtos.*;
import static br.org.vozbrasil.Model.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;
import java.util.stream.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CivicService {
  final EntityManager em;
  final SurveyRepository surveys;
  final ObjectMapper json;
  static final int MIN = 5;

  public CivicService(EntityManager em, SurveyRepository surveys, ObjectMapper json) {
    this.em = em;
    this.surveys = surveys;
    this.json = json;
  }

  static void require(boolean ok, String message) {
    if (!ok) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  static Map<String, Object> map(Object... pairs) {
    Map<String, Object> m = new LinkedHashMap<>();
    for (int i = 0; i < pairs.length; i += 2) m.put((String) pairs[i], pairs[i + 1]);
    return m;
  }

  <T> T get(Class<T> cls, Object id) {
    T e = em.find(cls, id);
    if (e == null)
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro não encontrado");
    return e;
  }

  void geography(Integer state, Integer municipality) {
    if (state != null) get(State.class, state);
    if (municipality != null) {
      Municipality m = get(Municipality.class, municipality);
      require(
          state != null && state.equals(m.stateId), "Município não pertence ao estado selecionado");
    }
  }

  boolean open(Survey s) {
    Instant now = Instant.now();
    return s.status.equals("PUBLISHED")
        && (s.opensAt == null || !now.isBefore(s.opensAt))
        && (s.closesAt == null || now.isBefore(s.closesAt));
  }

  long count(Survey s) {
    return em.createQuery("select count(r) from SurveyResponse r where r.survey.id=:id", Long.class)
        .setParameter("id", s.id)
        .getSingleResult();
  }

  public Map<String, Object> surveyView(Survey s) {
    return map(
        "id",
        s.id,
        "title",
        s.title,
        "description",
        s.description,
        "theme",
        s.theme,
        "scope",
        s.scope,
        "status",
        s.status,
        "stateId",
        s.stateId,
        "municipalityId",
        s.municipalityId,
        "opensAt",
        s.opensAt,
        "closesAt",
        s.closesAt,
        "accepting",
        open(s),
        "responseCount",
        count(s),
        "questions",
        s.questions.stream()
            .map(
                q ->
                    map(
                        "id",
                        q.id,
                        "key",
                        q.questionKey,
                        "text",
                        q.text,
                        "type",
                        q.type,
                        "theme",
                        q.theme,
                        "required",
                        q.required,
                        "conditionKey",
                        q.conditionKey,
                        "conditionValue",
                        q.conditionValue,
                        "options",
                        q.options.stream()
                            .map(o -> map("key", o.optionKey, "label", o.label))
                            .toList()))
            .toList());
  }

  public Object catalog() {
    return em
        .createQuery(
            "from Survey s where s.status in ('PUBLISHED','CLOSED') order by s.createdAt desc",
            Survey.class)
        .getResultList()
        .stream()
        .map(s -> map("id", s.id, "title", s.title))
        .toList();
  }

  public Object surveys(
      Integer state, Integer municipality, String theme, String scope, int page, boolean admin) {
    String where = " where 1=1";
    Map<String, Object> params = new LinkedHashMap<>();
    if (!admin) where += " and s.status in ('PUBLISHED','CLOSED')";
    if (state != null) {
      where += " and (s.stateId is null or s.stateId=:state)";
      params.put("state", state);
    }
    if (municipality != null) {
      where += " and (s.municipalityId is null or s.municipalityId=:city)";
      params.put("city", municipality);
    }
    if (theme != null && !theme.isBlank()) {
      where +=
          " and (s.theme=:theme or exists (select q.id from Question q where q.survey=s and"
              + " q.theme=:theme))";
      params.put("theme", theme);
    }
    if (scope != null) {
      where += " and s.scope=:scope";
      params.put("scope", scope);
    }
    var listing =
        em.createQuery("from Survey s" + where + " order by s.createdAt desc,s.id", Survey.class);
    var total = em.createQuery("select count(s) from Survey s" + where, Long.class);
    params.forEach(
        (k, v) -> {
          listing.setParameter(k, v);
          total.setParameter(k, v);
        });
    var all = listing.setFirstResult(page * 12).setMaxResults(12).getResultList();
    return map(
        "items",
        all.stream().map(this::surveyView).toList(),
        "total",
        total.getSingleResult(),
        "page",
        page);
  }

  public Object survey(UUID id, boolean admin) {
    Survey s = get(Survey.class, id);
    if (!admin && Set.of("DRAFT", "ARCHIVED").contains(s.status))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return surveyView(s);
  }

  public Object states() {
    return em.createQuery("from State order by name", State.class).getResultList();
  }

  public Object municipalities(int state) {
    get(State.class, state);
    return em.createQuery("from Municipality where stateId=:s order by name", Municipality.class)
        .setParameter("s", state)
        .getResultList();
  }

  public Object start(UUID id, String participant) {
    Survey s = get(Survey.class, id);
    require(open(s), "Pesquisa não está aberta");
    var existing =
        em.createQuery(
                "select count(s) from SurveyStart s where s.surveyId=:id and s.participant=:p",
                Long.class)
            .setParameter("id", id)
            .setParameter("p", participant)
            .getSingleResult();
    if (existing == 0) {
      SurveyStart st = new SurveyStart();
      st.surveyId = id;
      st.participant = participant;
      em.persist(st);
    }
    return map("started", true);
  }

  public Object submit(UUID id, Submission input, String participant) {
    Survey s = get(Survey.class, id);
    require(open(s), "Pesquisa não está aberta");
    geography(input.stateId(), input.municipalityId());
    require(input.consent(), "Confirme a participação voluntária");
    require(
        s.stateId == null || s.stateId.equals(input.stateId()),
        "Selecione o estado desta pesquisa");
    require(
        s.municipalityId == null || s.municipalityId.equals(input.municipalityId()),
        "Selecione o município desta pesquisa");
    require(!s.scope.equals("STATE") || input.stateId() != null, "Selecione seu estado");
    require(
        !s.scope.equals("MUNICIPAL") || input.municipalityId() != null, "Selecione seu município");
    long duplicate =
        em.createQuery(
                "select count(r) from SurveyResponse r where r.survey=:s and r.participant=:p",
                Long.class)
            .setParameter("s", s)
            .setParameter("p", participant)
            .getSingleResult();
    if (duplicate > 0)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Você já participou desta pesquisa neste navegador");
    validateAnswers(s, input.answers());
    SurveyResponse r = new SurveyResponse();
    r.survey = s;
    r.participant = participant;
    r.stateId = input.stateId();
    r.municipalityId = input.municipalityId();
    em.persist(r);
    for (var q : s.questions) {
      List<String> values = input.answers().get(q.questionKey);
      if (values != null && !values.isEmpty() && visible(q, input.answers())) {
        Answer a = new Answer();
        a.response = r;
        a.question = q;
        try {
          a.content = json.writeValueAsString(values);
        } catch (Exception e) {
          throw new IllegalStateException(e);
        }
        em.persist(a);
      }
    }
    em.flush();
    return map("id", r.id, "message", "Sua voz foi registrada. Obrigado por participar!");
  }

  static boolean visible(Model.Question q, Map<String, List<String>> answers) {
    return q.conditionKey == null
        || answers.getOrDefault(q.conditionKey, List.of()).contains(q.conditionValue);
  }

  static void validateAnswers(Survey s, Map<String, List<String>> answers) {
    var keys = s.questions.stream().map(q -> q.questionKey).collect(Collectors.toSet());
    require(keys.containsAll(answers.keySet()), "Pergunta desconhecida");
    for (var q : s.questions) {
      List<String> values = answers.getOrDefault(q.questionKey, List.of());
      if (!visible(q, answers)) {
        require(values.isEmpty(), "Remova respostas de perguntas não aplicáveis");
        continue;
      }
      require(!q.required || !values.isEmpty(), "Responda a pergunta obrigatória: " + q.text);
      if (values.isEmpty()) continue;
      require(new HashSet<>(values).size() == values.size(), "Alternativas repetidas");
      if (Set.of("SINGLE", "SCALE", "TEXT").contains(q.type))
        require(values.size() == 1, "Escolha apenas uma resposta");
      if (q.type.equals("TEXT")) {
        require(
            !values.getFirst().isBlank() && values.getFirst().length() <= 3000,
            "Resposta deve ter até 3000 caracteres");
        continue;
      }
      var allowed = q.options.stream().map(o -> o.optionKey).collect(Collectors.toSet());
      require(allowed.containsAll(values), "Alternativa inválida");
      if (q.type.equals("RANK"))
        require(values.size() == allowed.size(), "Ordene todas as prioridades");
    }
  }

  List<SurveyResponse> responses(Filters f) {
    String query =
        "select r from SurveyResponse r join fetch r.survey s where s.status in"
            + " ('PUBLISHED','CLOSED')";
    if (f.surveyId() != null) query += " and s.id=:survey";
    if (f.stateId() != null) query += " and r.stateId=:state";
    if (f.municipalityId() != null) query += " and r.municipalityId=:city";
    if (f.theme() != null && !f.theme().isBlank())
      query +=
          " and (s.theme=:theme or exists (select q.id from Question q where q.survey=s and"
              + " q.theme=:theme))";
    if (f.from() != null) query += " and r.createdAt>=:from";
    if (f.to() != null) query += " and r.createdAt<:to";
    var q = em.createQuery(query, SurveyResponse.class);
    if (f.surveyId() != null) q.setParameter("survey", f.surveyId());
    if (f.stateId() != null) q.setParameter("state", f.stateId());
    if (f.municipalityId() != null) q.setParameter("city", f.municipalityId());
    if (f.theme() != null && !f.theme().isBlank()) q.setParameter("theme", f.theme());
    if (f.from() != null) q.setParameter("from", f.from());
    if (f.to() != null) q.setParameter("to", f.to());
    return q.getResultList();
  }

  List<String> values(Answer a) {
    try {
      return json.readValue(a.content, new TypeReference<List<String>>() {});
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  List<Answer> filteredAnswers(Filters f) {
    String query =
        "select a from Answer a join fetch a.response r join fetch a.question q join fetch q.survey"
            + " s where s.status in ('PUBLISHED','CLOSED') and q.type<>'TEXT'";
    Map<String, Object> params = new LinkedHashMap<>();
    if (f.surveyId() != null) {
      query += " and s.id=:survey";
      params.put("survey", f.surveyId());
    }
    if (f.stateId() != null) {
      query += " and r.stateId=:state";
      params.put("state", f.stateId());
    }
    if (f.municipalityId() != null) {
      query += " and r.municipalityId=:city";
      params.put("city", f.municipalityId());
    }
    if (f.theme() != null && !f.theme().isBlank()) {
      query += " and (q.theme=:theme or s.theme=:theme)";
      params.put("theme", f.theme());
    }
    if (f.from() != null) {
      query += " and r.createdAt>=:from";
      params.put("from", f.from());
    }
    if (f.to() != null) {
      query += " and r.createdAt<:to";
      params.put("to", f.to());
    }
    var result = em.createQuery(query + " order by s.createdAt desc,s.id,q.position", Answer.class);
    params.forEach(result::setParameter);
    return result.getResultList();
  }

  public Map<String, Object> results(Filters f) {
    geography(f.stateId(), f.municipalityId());
    if (f.from() != null && f.to() != null) require(f.from().isBefore(f.to()), "Período inválido");
    List<SurveyResponse> rs = responses(f);
    List<Answer> answers = rs.isEmpty() ? List.of() : filteredAnswers(f);
    var grouped =
        answers.stream()
            .collect(
                Collectors.groupingBy(a -> a.question.id, LinkedHashMap::new, Collectors.toList()));
    List<Object> questions = new ArrayList<>();
    for (var group : grouped.values()) {
      var q = group.getFirst().question;
      Map<String, Long> counts = new LinkedHashMap<>();
      for (var o : q.options) counts.put(o.optionKey, 0L);
      for (Answer a : group) {
        var vs = values(a);
        if (q.type.equals("RANK")) counts.merge(vs.getFirst(), 1L, Long::sum);
        else for (String v : vs) counts.merge(v, 1L, Long::sum);
      }
      boolean enough =
          group.size() >= MIN && counts.values().stream().noneMatch(n -> n > 0 && n < MIN);
      Double average = null;
      if (enough && q.type.equals("SCALE"))
        average =
            group.stream()
                .mapToDouble(a -> Double.parseDouble(values(a).getFirst()))
                .average()
                .orElse(0);
      var options =
          q.options.stream()
              .map(
                  o ->
                      map(
                          "key",
                          o.optionKey,
                          "label",
                          o.label,
                          "count",
                          enough ? counts.get(o.optionKey) : null,
                          "percent",
                          enough
                              ? Math.round(counts.get(o.optionKey) * 1000.0 / group.size()) / 10.0
                              : null))
              .toList();
      questions.add(
          map(
              "id",
              q.id,
              "key",
              q.questionKey,
              "surveyId",
              q.survey.id,
              "surveyTitle",
              q.survey.title,
              "text",
              q.text,
              "theme",
              q.theme,
              "type",
              q.type,
              "total",
              enough ? group.size() : null,
              "suppressed",
              !enough,
              "average",
              average,
              "options",
              options));
    }
    var byState =
        rs.stream()
            .filter(r -> r.stateId != null)
            .collect(Collectors.groupingBy(r -> r.stateId, Collectors.counting()));
    var geo =
        byState.entrySet().stream()
            .map(
                e ->
                    map(
                        "stateId",
                        e.getKey(),
                        "count",
                        e.getValue() >= MIN ? e.getValue() : null,
                        "suppressed",
                        e.getValue() < MIN))
            .toList();
    var municipal =
        rs.stream()
            .filter(r -> r.municipalityId != null)
            .collect(Collectors.groupingBy(r -> r.municipalityId, Collectors.counting()))
            .entrySet()
            .stream()
            .map(
                e ->
                    map(
                        "municipalityId",
                        e.getKey(),
                        "count",
                        e.getValue() >= MIN ? e.getValue() : null,
                        "suppressed",
                        e.getValue() < MIN))
            .toList();
    var timeline =
        rs.stream()
            .collect(
                Collectors.groupingBy(
                    r ->
                        r.createdAt
                            .atZone(ZoneOffset.UTC)
                            .toLocalDate()
                            .withDayOfMonth(1)
                            .toString(),
                    TreeMap::new,
                    Collectors.counting()))
            .entrySet()
            .stream()
            .map(e -> map("date", e.getKey(), "count", e.getValue() >= MIN ? e.getValue() : null))
            .toList();
    return map(
        "total",
        rs.size(),
        "participants",
        rs.stream().map(r -> r.participant).distinct().count(),
        "questions",
        questions,
        "geography",
        geo,
        "municipalities",
        municipal,
        "timeline",
        timeline,
        "minSample",
        MIN,
        "filters",
        f,
        "generatedAt",
        Instant.now(),
        "notice",
        "Participação voluntária e não representativa da população. Células com 1 a 4 respostas são"
            + " protegidas; outras células podem ser suprimidas para evitar inferência. Perguntas"
            + " de múltipla seleção podem somar mais de 100%.");
  }

  public Object stats() {
    var rs = responses(new Filters(null, null, null, null, null, null));
    long ideas =
        em.createQuery("select count(s) from Suggestion s where s.status='APPROVED'", Long.class)
            .getSingleResult();
    return map(
        "participants",
        rs.stream().map(r -> r.participant).distinct().count(),
        "responses",
        rs.size(),
        "states",
        rs.stream().map(r -> r.stateId).filter(Objects::nonNull).distinct().count(),
        "suggestions",
        ideas);
  }

  public Object ideas(
      Integer state, Integer city, String theme, String sort, int page, boolean admin) {
    String where = admin ? " where 1=1" : " where s.status='APPROVED'";
    Map<String, Object> params = new LinkedHashMap<>();
    if (state != null) {
      where += " and s.stateId=:state";
      params.put("state", state);
    }
    if (city != null) {
      where += " and s.municipalityId=:city";
      params.put("city", city);
    }
    if (theme != null && !theme.isBlank()) {
      where += " and s.theme=:theme";
      params.put("theme", theme);
    }
    String order =
        "popular".equals(sort)
            ? " order by (select count(x) from SuggestionSupport x where x.suggestionId=s.id)"
                  + " desc,s.createdAt desc,s.id"
            : " order by s.createdAt desc,s.id";
    var listing = em.createQuery("from Suggestion s" + where + order, Suggestion.class);
    var total = em.createQuery("select count(s) from Suggestion s" + where, Long.class);
    params.forEach(
        (k, v) -> {
          listing.setParameter(k, v);
          total.setParameter(k, v);
        });
    var list =
        listing.setFirstResult(page * 12).setMaxResults(12).getResultList().stream()
            .map(this::ideaView)
            .toList();
    return map("items", list, "total", total.getSingleResult(), "page", page);
  }

  Map<String, Object> ideaView(Suggestion s) {
    long supports =
        em.createQuery(
                "select count(x) from SuggestionSupport x where x.suggestionId=:s", Long.class)
            .setParameter("s", s.id)
            .getSingleResult();
    return map(
        "id",
        s.id,
        "title",
        s.title,
        "description",
        s.description,
        "theme",
        s.theme,
        "stateId",
        s.stateId,
        "municipalityId",
        s.municipalityId,
        "status",
        s.status,
        "createdAt",
        s.createdAt,
        "supports",
        supports);
  }

  public Object createIdea(Idea i) {
    geography(i.stateId(), i.municipalityId());
    require(i.consent(), "Confirme os termos de publicação");
    Suggestion s = new Suggestion();
    s.title = i.title().strip();
    s.description = i.description().strip();
    s.theme = i.theme();
    s.stateId = i.stateId();
    s.municipalityId = i.municipalityId();
    em.persist(s);
    return map(
        "id",
        s.id,
        "message",
        "Ideia recebida e enviada para moderação. Nenhum texto é publicado automaticamente.");
  }

  public Object support(UUID id, String participant) {
    Suggestion s = get(Suggestion.class, id);
    require(s.status.equals("APPROVED"), "Ideia indisponível");
    long existing =
        em.createQuery(
                "select count(s) from SuggestionSupport s where s.suggestionId=:id and"
                    + " s.participant=:p",
                Long.class)
            .setParameter("id", id)
            .setParameter("p", participant)
            .getSingleResult();
    if (existing > 0)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Apoio já registrado neste navegador");
    SuggestionSupport x = new SuggestionSupport();
    x.suggestionId = id;
    x.participant = participant;
    em.persist(x);
    return map("supported", true);
  }

  public Object report(UUID id, ReportInput input, String participant) {
    require(get(Suggestion.class, id).status.equals("APPROVED"), "Ideia indisponível");
    Report r = new Report();
    r.suggestionId = id;
    r.participant = participant;
    r.reason = input.reason();
    em.persist(r);
    return map("reported", true);
  }

  void audit(String actor, String action, UUID resource) {
    AuditLog log = new AuditLog();
    log.actor = actor;
    log.action = action;
    log.resourceId = resource;
    em.persist(log);
  }

  public Object saveSurvey(UUID id, SurveyDraft d, String actor) {
    geography(d.stateId(), d.municipalityId());
    require(d.scope() != null, "Defina o alcance");
    require(
        d.opensAt() == null || d.closesAt() == null || d.opensAt().isBefore(d.closesAt()),
        "Datas de publicação inválidas");
    require(
        !d.scope().equals("MUNICIPAL") || d.stateId() != null || d.municipalityId() == null,
        "Selecione o estado");
    Survey s = id == null ? new Survey() : get(Survey.class, id);
    require(count(s) == 0, "Pesquisas com respostas não podem ser alteradas; duplique a pesquisa");
    require(!s.status.equals("PUBLISHED"), "Encerre a pesquisa antes de editar");
    Set<String> previous = new HashSet<>();
    Map<String, Set<String>> options = new HashMap<>();
    for (var q : d.questions()) {
      require(q.type() != null, "Defina o tipo da pergunta");
      require(!previous.contains(q.key()), "Chave de pergunta repetida");
      if (q.conditionKey() != null && !q.conditionKey().isBlank())
        require(
            previous.contains(q.conditionKey())
                && options.get(q.conditionKey()).contains(q.conditionValue()),
            "Condição deve referenciar alternativa de pergunta anterior");
      var os = q.options().stream().map(Dtos.Option::key).collect(Collectors.toSet());
      require(os.size() == q.options().size(), "Alternativas repetidas");
      require(q.type().equals("TEXT") ? os.isEmpty() : os.size() >= 2, "Configure as alternativas");
      if (q.type().equals("SCALE"))
        require(os.equals(Set.of("1", "2", "3", "4", "5")), "Escalas devem ter valores de 1 a 5");
      previous.add(q.key());
      options.put(q.key(), os);
    }
    s.title = d.title();
    s.description = d.description();
    s.theme = d.theme();
    s.scope = d.scope();
    s.stateId = d.stateId();
    s.municipalityId = d.municipalityId();
    s.opensAt = d.opensAt();
    s.closesAt = d.closesAt();
    s.questions.clear();
    em.flush();
    int pos = 0;
    for (var q : d.questions()) {
      Model.Question x = new Model.Question();
      x.survey = s;
      x.questionKey = q.key();
      x.text = q.text();
      x.type = q.type();
      x.theme = q.theme();
      x.required = q.required();
      x.position = pos++;
      x.conditionKey =
          q.conditionKey() == null || q.conditionKey().isBlank() ? null : q.conditionKey();
      x.conditionValue = x.conditionKey == null ? null : q.conditionValue();
      int op = 0;
      for (var o : q.options()) {
        QuestionOption y = new QuestionOption();
        y.question = x;
        y.optionKey = o.key();
        y.label = o.label();
        y.position = op++;
        x.options.add(y);
      }
      s.questions.add(x);
    }
    em.persist(s);
    audit(actor, id == null ? "CREATE_SURVEY" : "EDIT_SURVEY", s.id);
    return surveyView(s);
  }

  public Object status(UUID id, String status, String actor) {
    Survey s = get(Survey.class, id);
    require(Set.of("DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED").contains(status), "Status inválido");
    require(
        !status.equals("DRAFT") || count(s) == 0,
        "Pesquisa com respostas não pode voltar a rascunho");
    require(
        !status.equals("PUBLISHED") || !s.questions.isEmpty(),
        "Adicione perguntas antes de publicar");
    s.status = status;
    audit(actor, "SURVEY_" + status, id);
    return surveyView(s);
  }

  public Object duplicate(UUID id, String actor) {
    Survey s = get(Survey.class, id);
    var qs =
        s.questions.stream()
            .map(
                q ->
                    new Dtos.Question(
                        q.questionKey,
                        q.text,
                        q.type,
                        q.theme,
                        q.required,
                        q.conditionKey,
                        q.conditionValue,
                        q.options.stream()
                            .map(o -> new Dtos.Option(o.optionKey, o.label))
                            .toList()))
            .toList();
    return saveSurvey(
        null,
        new SurveyDraft(
            s.title + " (cópia)",
            s.description,
            s.theme,
            s.scope,
            s.stateId,
            s.municipalityId,
            null,
            null,
            qs),
        actor);
  }

  public Object moderate(UUID id, String status, String actor) {
    require(Set.of("APPROVED", "HIDDEN", "PENDING").contains(status), "Status inválido");
    Suggestion s = get(Suggestion.class, id);
    s.status = status;
    audit(actor, "IDEA_" + status, id);
    if (!status.equals("PENDING"))
      em.createQuery("update Report set status='REVIEWED' where suggestionId=:id")
          .setParameter("id", id)
          .executeUpdate();
    return ideaView(s);
  }

  public Object reports(int page) {
    return em
        .createQuery("from Report order by createdAt desc", Report.class)
        .setFirstResult(page * 12)
        .setMaxResults(12)
        .getResultList()
        .stream()
        .map(
            r ->
                map(
                    "id",
                    r.id,
                    "suggestionId",
                    r.suggestionId,
                    "reason",
                    r.reason,
                    "status",
                    r.status,
                    "createdAt",
                    r.createdAt))
        .toList();
  }

  public Object analytics(Filters f) {
    var result = results(f);
    long starts =
        em.createQuery("select count(s) from SurveyStart s", Long.class).getSingleResult();
    result.put("startsAllTime", starts);
    result.put(
        "completedAllTime", responses(new Filters(null, null, null, null, null, null)).size());
    result.put(
        "surveys",
        surveys.findAll().stream()
            .map(s -> map("id", s.id, "title", s.title, "responses", count(s)))
            .toList());
    return result;
  }
}
