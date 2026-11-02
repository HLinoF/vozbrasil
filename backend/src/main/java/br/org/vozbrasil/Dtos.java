package br.org.vozbrasil;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;

public final class Dtos {
  public record Option(
      @NotBlank @Size(max = 60) String key, @NotBlank @Size(max = 200) String label) {}

  public record Question(
      @NotBlank @Size(max = 60) String key,
      @NotBlank @Size(max = 500) String text,
      @Pattern(regexp = "SINGLE|MULTI|SCALE|RANK|TEXT") String type,
      @NotBlank @Size(max = 60) String theme,
      boolean required,
      @Size(max = 60) String conditionKey,
      @Size(max = 60) String conditionValue,
      @NotNull @Size(max = 20) List<@Valid Option> options) {}

  public record SurveyDraft(
      @NotBlank @Size(max = 160) String title,
      @NotBlank @Size(max = 1500) String description,
      @NotBlank @Size(max = 60) String theme,
      @Pattern(regexp = "NATIONAL|STATE|MUNICIPAL|THEMATIC") String scope,
      Integer stateId,
      Integer municipalityId,
      Instant opensAt,
      Instant closesAt,
      @NotEmpty @Size(max = 50) List<@Valid Question> questions) {}

  public record Submission(
      Integer stateId,
      Integer municipalityId,
      @AssertTrue boolean consent,
      @NotNull @Size(max = 50)
          Map<@NotBlank String, @NotNull @Size(max = 20) List<@NotBlank @Size(max = 3000) String>>
              answers) {}

  public record Idea(
      @NotBlank @Size(min = 8, max = 160) String title,
      @NotBlank @Size(min = 20, max = 3000) String description,
      @NotBlank @Size(max = 60) String theme,
      Integer stateId,
      Integer municipalityId,
      @AssertTrue boolean consent) {}

  public record ReportInput(@NotBlank @Size(min = 5, max = 500) String reason) {}

  public record StatusInput(@NotBlank String status) {}

  public record Filters(
      UUID surveyId,
      Integer stateId,
      Integer municipalityId,
      String theme,
      Instant from,
      Instant to) {}
}
