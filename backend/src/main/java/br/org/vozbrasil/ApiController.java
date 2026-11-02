package br.org.vozbrasil;

import static br.org.vozbrasil.Dtos.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@Validated
public class ApiController {
  final CivicService service;
  final SecurityConfig.Guard guard;
  final ReportService reports;

  public ApiController(CivicService service, SecurityConfig.Guard guard, ReportService reports) {
    this.service = service;
    this.guard = guard;
    this.reports = reports;
  }

  @GetMapping("/health")
  Object health() {
    return Map.of("status", "UP");
  }

  @GetMapping("/session")
  Object session() {
    return Map.of("anonymous", true);
  }

  @GetMapping("/states")
  Object states() {
    return service.states();
  }

  @GetMapping("/states/{id}/municipalities")
  Object municipalities(@PathVariable int id) {
    return service.municipalities(id);
  }

  @GetMapping("/surveys")
  Object surveys(
      @RequestParam(required = false) Integer stateId,
      @RequestParam(required = false) Integer municipalityId,
      @RequestParam(required = false) String theme,
      @RequestParam(required = false) String scope,
      @RequestParam(defaultValue = "0") @Min(0) @Max(100000) int page) {
    return service.surveys(stateId, municipalityId, theme, scope, page, false);
  }

  @GetMapping("/surveys/catalog")
  Object catalog() {
    return service.catalog();
  }

  @GetMapping("/surveys/{id}")
  Object survey(@PathVariable UUID id) {
    return service.survey(id, false);
  }

  @PostMapping("/surveys/{id}/start")
  Object start(@PathVariable UUID id, HttpServletRequest req) {
    return service.start(id, guard.participant(req));
  }

  @PostMapping("/surveys/{id}/responses")
  @ResponseStatus(HttpStatus.CREATED)
  Object respond(
      @PathVariable UUID id, @RequestBody @Valid Submission body, HttpServletRequest req) {
    return service.submit(id, body, guard.participant(req));
  }

  @GetMapping("/stats")
  Object stats() {
    return service.stats();
  }

  @GetMapping("/results")
  Object results(
      @RequestParam(required = false) UUID surveyId,
      @RequestParam(required = false) Integer stateId,
      @RequestParam(required = false) Integer municipalityId,
      @RequestParam(required = false) String theme,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to) {
    return service.results(new Filters(surveyId, stateId, municipalityId, theme, from, to));
  }

  @GetMapping("/states/{id}/results")
  Object stateResults(@PathVariable Integer id, @RequestParam(required = false) UUID surveyId) {
    return service.results(new Filters(surveyId, id, null, null, null, null));
  }

  @GetMapping("/municipalities/{id}/results")
  Object cityResults(
      @PathVariable Integer id,
      @RequestParam Integer stateId,
      @RequestParam(required = false) UUID surveyId) {
    return service.results(new Filters(surveyId, stateId, id, null, null, null));
  }

  @GetMapping("/reports.pdf")
  ResponseEntity<byte[]> pdf(
      @RequestParam(required = false) UUID surveyId,
      @RequestParam(required = false) Integer stateId,
      @RequestParam(required = false) Integer municipalityId,
      @RequestParam(required = false) String theme,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to)
      throws Exception {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header("Content-Disposition", "attachment; filename=vozbrasil-relatorio.pdf")
        .body(reports.pdf(new Filters(surveyId, stateId, municipalityId, theme, from, to)));
  }

  @GetMapping("/suggestions")
  Object ideas(
      @RequestParam(required = false) Integer stateId,
      @RequestParam(required = false) Integer municipalityId,
      @RequestParam(required = false) String theme,
      @RequestParam(defaultValue = "recent") String sort,
      @RequestParam(defaultValue = "0") @Min(0) @Max(100000) int page) {
    return service.ideas(stateId, municipalityId, theme, sort, page, false);
  }

  @PostMapping("/suggestions")
  @ResponseStatus(HttpStatus.CREATED)
  Object idea(@RequestBody @Valid Idea body) {
    return service.createIdea(body);
  }

  @PostMapping("/suggestions/{id}/support")
  Object support(@PathVariable UUID id, HttpServletRequest req) {
    return service.support(id, guard.participant(req));
  }

  @PostMapping("/suggestions/{id}/reports")
  @ResponseStatus(HttpStatus.CREATED)
  Object report(
      @PathVariable UUID id, @RequestBody @Valid ReportInput body, HttpServletRequest req) {
    return service.report(id, body, guard.participant(req));
  }

  @GetMapping("/admin/me")
  Object me(Principal p) {
    return Map.of("username", p.getName());
  }

  @GetMapping("/admin/surveys")
  Object adminSurveys(@RequestParam(defaultValue = "0") @Min(0) @Max(100000) int page) {
    return service.surveys(null, null, null, null, page, true);
  }

  @PostMapping("/admin/surveys")
  Object create(@RequestBody @Valid SurveyDraft body, Principal p) {
    return service.saveSurvey(null, body, p.getName());
  }

  @PutMapping("/admin/surveys/{id}")
  Object edit(@PathVariable UUID id, @RequestBody @Valid SurveyDraft body, Principal p) {
    return service.saveSurvey(id, body, p.getName());
  }

  @PostMapping("/admin/surveys/{id}/status")
  Object status(@PathVariable UUID id, @RequestBody @Valid StatusInput body, Principal p) {
    return service.status(id, body.status(), p.getName());
  }

  @PostMapping("/admin/surveys/{id}/duplicate")
  Object duplicate(@PathVariable UUID id, Principal p) {
    return service.duplicate(id, p.getName());
  }

  @GetMapping("/admin/suggestions")
  Object moderation(@RequestParam(defaultValue = "0") @Min(0) @Max(100000) int page) {
    return service.ideas(null, null, null, "recent", page, true);
  }

  @PostMapping("/admin/suggestions/{id}/status")
  Object moderate(@PathVariable UUID id, @RequestBody @Valid StatusInput body, Principal p) {
    return service.moderate(id, body.status(), p.getName());
  }

  @GetMapping("/admin/reports")
  Object reports(@RequestParam(defaultValue = "0") @Min(0) @Max(100000) int page) {
    return service.reports(page);
  }

  @GetMapping("/admin/analytics")
  Object analytics(
      @RequestParam(required = false) UUID surveyId,
      @RequestParam(required = false) Integer stateId,
      @RequestParam(required = false) Integer municipalityId,
      @RequestParam(required = false) String theme,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to) {
    return service.analytics(new Filters(surveyId, stateId, municipalityId, theme, from, to));
  }

  @GetMapping("/admin/export.csv")
  ResponseEntity<String> csv(
      @RequestParam(required = false) UUID surveyId,
      @RequestParam(required = false) Integer stateId,
      @RequestParam(required = false) Integer municipalityId,
      @RequestParam(required = false) String theme,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to) {
    return ResponseEntity.ok()
        .header("Content-Disposition", "attachment; filename=vozbrasil-agregados.csv")
        .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
        .body(reports.csv(new Filters(surveyId, stateId, municipalityId, theme, from, to)));
  }
}
