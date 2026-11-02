package br.org.vozbrasil;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import jakarta.servlet.http.Cookie;
import java.io.IOException;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.*;

@SpringBootTest(
    properties = {
      "app.secret=test-secret-at-least-thirty-two-characters",
      "app.admin-password=test-admin-password-123"
    })
@AutoConfigureMockMvc
class PlatformTest {
  static EmbeddedPostgres pg;

  static {
    try {
      pg = EmbeddedPostgres.builder().setPort(0).start();
    } catch (IOException e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void db(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", () -> pg.getJdbcUrl("postgres", "postgres"));
    r.add("spring.datasource.username", () -> "postgres");
    r.add("spring.datasource.password", () -> "postgres");
  }

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired Retention retention;
  String survey;
  String qid;

  @BeforeEach
  void reset() {
    jdbc.update("DELETE FROM answers");
    jdbc.update("DELETE FROM survey_responses");
    jdbc.update("DELETE FROM survey_starts");
    jdbc.update("DELETE FROM reports");
    jdbc.update("DELETE FROM suggestion_supports");
    jdbc.update("DELETE FROM suggestions");
    survey =
        jdbc.queryForObject("select id from surveys where scope='NATIONAL' limit 1", String.class);
    qid =
        jdbc.queryForObject(
            "select id from questions where survey_id=?::uuid and question_key='priority'",
            String.class,
            survey);
  }

  Cookie participant() throws Exception {
    var res = mvc.perform(get("/api/session")).andExpect(status().isOk()).andReturn().getResponse();
    String value = res.getHeader("Set-Cookie").split(";")[0].split("=", 2)[1];
    return new Cookie("vb_participant", value);
  }

  Map<String, List<String>> valid() throws Exception {
    JsonNode data =
        json.readTree(
            mvc.perform(get("/api/surveys/" + survey))
                .andReturn()
                .getResponse()
                .getContentAsString());
    Map<String, List<String>> answers = new LinkedHashMap<>();
    for (JsonNode q : data.get("questions")) {
      if (!q.get("conditionKey").isNull()) continue;
      String key = q.get("key").asText();
      String type = q.get("type").asText();
      answers.put(
          key,
          type.equals("TEXT")
              ? List.of("Não publicar este texto privado")
              : type.equals("RANK")
                  ? json
                      .convertValue(
                          q.get("options"),
                          new com.fasterxml.jackson.core.type.TypeReference<
                              List<Map<String, String>>>() {})
                      .stream()
                      .map(o -> o.get("key"))
                      .toList()
                  : List.of("1"));
    }
    return answers;
  }

  ResultActions submit(Cookie c, Map<String, List<String>> answers, int state) throws Exception {
    return mvc.perform(
        post("/api/surveys/" + survey + "/responses")
            .cookie(c)
            .contentType("application/json")
            .content(
                json.writeValueAsString(
                    Map.of("consent", true, "stateId", state, "answers", answers))));
  }

  @Test
  void realPostgresMigrationsAndEmptyStats() throws Exception {
    assertThat(jdbc.queryForObject("select count(*) from states", Integer.class)).isEqualTo(27);
    assertThat(jdbc.queryForObject("select count(*) from municipalities", Integer.class))
        .isGreaterThan(5500);
    mvc.perform(get("/api/stats")).andExpect(jsonPath("$.responses").value(0));
  }

  @Test
  void validTransactionalSubmissionAndDuplicateProtection() throws Exception {
    var c = participant();
    var a = valid();
    submit(c, a, 28).andExpect(status().isCreated());
    submit(c, a, 28).andExpect(status().isConflict());
    assertThat(jdbc.queryForObject("select count(*) from survey_responses", Integer.class))
        .isEqualTo(1);
  }

  @Test
  void mandatoryQuestionsRejectWithoutPartialWrites() throws Exception {
    var a = valid();
    a.remove("priority");
    submit(participant(), a, 28).andExpect(status().isBadRequest());
    assertThat(jdbc.queryForObject("select count(*) from answers", Integer.class)).isZero();
  }

  @Test
  void conditionalRequiredAndHiddenAnswers() throws Exception {
    var a = valid();
    a.put("security", List.of("3"));
    submit(participant(), a, 28).andExpect(status().isBadRequest());
    a.put("prevention", List.of("1"));
    submit(participant(), a, 28).andExpect(status().isCreated());
    a.put("security", List.of("1"));
    submit(participant(), a, 28).andExpect(status().isBadRequest());
  }

  @Test
  void unknownOptionsAndMalformedRankRejected() throws Exception {
    var a = valid();
    a.put("priority", List.of("bad"));
    submit(participant(), a, 28).andExpect(status().isBadRequest());
    a.put("priority", List.of("1"));
    a.put("innovation", List.of("1"));
    submit(participant(), a, 28).andExpect(status().isBadRequest());
  }

  @Test
  void municipalGeographyMustMatchState() throws Exception {
    var body =
        Map.of("consent", true, "stateId", 28, "municipalityId", 3550308, "answers", valid());
    mvc.perform(
            post("/api/surveys/" + survey + "/responses")
                .contentType("application/json")
                .content(json.writeValueAsString(body)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void geographicAndPeriodFiltersPercentagesAndPrivacy() throws Exception {
    for (int i = 0; i < 5; i++) submit(participant(), valid(), 28).andExpect(status().isCreated());
    var result =
        mvc.perform(get("/api/results").param("surveyId", survey).param("stateId", "28"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(5))
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode questions = json.readTree(result).get("questions");
    JsonNode priority = null;
    for (JsonNode q : questions) if (q.get("key").asText().equals("priority")) priority = q;
    assertThat(priority.get("options").get(0).get("percent").asDouble()).isEqualTo(100);
    assertThat(result)
        .doesNotContain("Não publicar este texto privado", "\"participant\":", "\"content\":");
    mvc.perform(get("/api/results").param("stateId", "29")).andExpect(jsonPath("$.total").value(0));
    mvc.perform(get("/api/results").param("from", "2099-01-01T00:00:00Z"))
        .andExpect(jsonPath("$.total").value(0));
  }

  @Test
  void smallCellsSuppressWholeQuestion() throws Exception {
    for (int i = 0; i < 5; i++) submit(participant(), valid(), 28).andExpect(status().isCreated());
    var a = valid();
    a.put("priority", List.of("2"));
    submit(participant(), a, 28).andExpect(status().isCreated());
    var result =
        json.readTree(
            mvc.perform(get("/api/results")).andReturn().getResponse().getContentAsString());
    for (JsonNode q : result.get("questions"))
      if (q.get("key").asText().equals("priority")) {
        assertThat(q.get("suppressed").asBoolean()).isTrue();
        assertThat(q.get("options").get(0).get("count").isNull()).isTrue();
      }
  }

  @Test
  void adminEndpointsDenyAnonymousAndBadCredentials() throws Exception {
    mvc.perform(get("/api/admin/surveys")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/admin/surveys")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/admin/me").with(httpBasic("admin", "wrong")))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/admin/me").with(httpBasic("admin", "test-admin-password-123")))
        .andExpect(status().isOk());
  }

  @Test
  void originProtection() throws Exception {
    mvc.perform(
            post("/api/suggestions")
                .header("Origin", "https://evil.example")
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void moderationSupportAndReportLifecycle() throws Exception {
    var input =
        Map.of(
            "title",
            "Bibliotecas em todos os bairros",
            "description",
            "Criar espaços de leitura acessíveis, com acervo e internet pública.",
            "theme",
            "Educação",
            "consent",
            true);
    var created =
        json.readTree(
            mvc.perform(
                    post("/api/suggestions")
                        .contentType("application/json")
                        .content(json.writeValueAsString(input)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
    String id = created.get("id").asText();
    mvc.perform(get("/api/suggestions")).andExpect(jsonPath("$.total").value(0));
    mvc.perform(
            post("/api/admin/suggestions/" + id + "/status")
                .with(httpBasic("admin", "test-admin-password-123"))
                .contentType("application/json")
                .content("{\"status\":\"APPROVED\"}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/suggestions")).andExpect(jsonPath("$.total").value(1));
    Cookie c = participant();
    mvc.perform(post("/api/suggestions/" + id + "/support").cookie(c)).andExpect(status().isOk());
    mvc.perform(post("/api/suggestions/" + id + "/support").cookie(c))
        .andExpect(status().isConflict());
    mvc.perform(
            post("/api/suggestions/" + id + "/reports")
                .cookie(c)
                .contentType("application/json")
                .content("{\"reason\":\"Revisar este conteúdo\"}"))
        .andExpect(status().isCreated());
    mvc.perform(
            post("/api/admin/suggestions/" + id + "/status")
                .with(httpBasic("admin", "test-admin-password-123"))
                .contentType("application/json")
                .content("{\"status\":\"HIDDEN\"}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/suggestions")).andExpect(jsonPath("$.total").value(0));
  }

  @Test
  void pdfAndAuthorizedCsvNeverExposeText() throws Exception {
    submit(participant(), valid(), 28).andExpect(status().isCreated());
    byte[] pdf =
        mvc.perform(get("/api/reports.pdf"))
            .andExpect(status().isOk())
            .andExpect(content().contentType("application/pdf"))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();
    assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    mvc.perform(get("/api/admin/export.csv")).andExpect(status().isUnauthorized());
    String csv =
        mvc.perform(
                get("/api/admin/export.csv").with(httpBasic("admin", "test-admin-password-123")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(csv).doesNotContain("Não publicar este texto privado", "participant");
  }

  @Test
  void surveyEditorLifecycleAndAudit() throws Exception {
    String body =
        """
        {"title":"Teste de pesquisa","description":"Pesquisa de integração","theme":"Geral","scope":"NATIONAL","questions":[{"key":"p","text":"Sua prioridade?","type":"SINGLE","theme":"Geral","required":true,"options":[{"key":"1","label":"Saúde"},{"key":"2","label":"Educação"}]}]}
        """;
    String id =
        json.readTree(
                mvc.perform(
                        post("/api/admin/surveys")
                            .with(httpBasic("admin", "test-admin-password-123"))
                            .contentType("application/json")
                            .content(body))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("id")
            .asText();
    mvc.perform(get("/api/surveys/" + id)).andExpect(status().isNotFound());
    mvc.perform(
            put("/api/admin/surveys/" + id)
                .with(httpBasic("admin", "test-admin-password-123"))
                .contentType("application/json")
                .content(body.replace("Sua prioridade?", "Sua nova prioridade?")))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/admin/surveys/" + id + "/status")
                .with(httpBasic("admin", "test-admin-password-123"))
                .contentType("application/json")
                .content("{\"status\":\"PUBLISHED\"}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/surveys/" + id)).andExpect(status().isOk());
    mvc.perform(
            put("/api/admin/surveys/" + id)
                .with(httpBasic("admin", "test-admin-password-123"))
                .contentType("application/json")
                .content(body))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/admin/surveys/" + id + "/duplicate")
                .with(httpBasic("admin", "test-admin-password-123")))
        .andExpect(status().isOk());
    assertThat(
            jdbc.queryForObject(
                "select count(*) from audit_logs where resource_id=?::uuid", Integer.class, id))
        .isGreaterThanOrEqualTo(2);
  }

  @Test
  void retentionRemovesExpiredResponsesAndTheirText() throws Exception {
    submit(participant(), valid(), 28).andExpect(status().isCreated());
    jdbc.update("update survey_responses set created_at='2020-01-01T00:00:00Z'");
    retention.purge();
    assertThat(jdbc.queryForObject("select count(*) from survey_responses", Integer.class))
        .isZero();
    assertThat(jdbc.queryForObject("select count(*) from answers", Integer.class)).isZero();
  }

  @Test
  void themeAndMunicipalityFiltersKeepCorrectDenominators() throws Exception {
    var body =
        Map.of("consent", true, "stateId", 28, "municipalityId", 2800308, "answers", valid());
    mvc.perform(
            post("/api/surveys/" + survey + "/responses")
                .contentType("application/json")
                .content(json.writeValueAsString(body)))
        .andExpect(status().isCreated());
    mvc.perform(
            get("/api/results")
                .param("stateId", "28")
                .param("municipalityId", "2800308")
                .param("theme", "Saúde"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1));
    mvc.perform(get("/api/results").param("stateId", "28").param("municipalityId", "2800100"))
        .andExpect(jsonPath("$.total").value(0));
    mvc.perform(get("/api/surveys").param("theme", "Saúde"))
        .andExpect(jsonPath("$.total").value(org.hamcrest.Matchers.greaterThan(0)));
  }

  @AfterAll
  static void close() throws IOException {
    pg.close();
  }
}
