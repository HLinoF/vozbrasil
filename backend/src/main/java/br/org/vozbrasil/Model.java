package br.org.vozbrasil;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

public final class Model {
  @MappedSuperclass
  public static class Identified {
    @Id public UUID id = UUID.randomUUID();
  }

  @Entity(name = "State")
  @Table(name = "states")
  public static class State {
    @Id public Integer id;
    public String name;
    public String uf;
  }

  @Entity(name = "Municipality")
  @Table(name = "municipalities")
  public static class Municipality {
    @Id public Integer id;
    public Integer stateId;
    public String name;
  }

  @Entity(name = "Survey")
  @Table(name = "surveys")
  public static class Survey extends Identified {
    public String title;
    public String description;
    public String theme;
    public String scope;
    public String status = "DRAFT";
    public Integer stateId;
    public Integer municipalityId;
    public Instant opensAt;
    public Instant closesAt;
    public Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "survey", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    public List<Question> questions = new ArrayList<>();
  }

  @Entity(name = "Question")
  @Table(name = "questions")
  public static class Question extends Identified {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_id")
    public Survey survey;

    public String questionKey;
    public String text;
    public String type;
    public String theme;
    public boolean required;
    public int position;
    public String conditionKey;
    public String conditionValue;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    public List<QuestionOption> options = new ArrayList<>();
  }

  @Entity(name = "QuestionOption")
  @Table(name = "question_options")
  public static class QuestionOption extends Identified {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    public Question question;

    public String optionKey;
    public String label;
    public int position;
  }

  @Entity(name = "SurveyResponse")
  @Table(
      name = "survey_responses",
      uniqueConstraints = @UniqueConstraint(columnNames = {"survey_id", "participant"}))
  public static class SurveyResponse extends Identified {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_id")
    public Survey survey;

    public String participant;
    public Integer stateId;
    public Integer municipalityId;
    public Instant createdAt = Instant.now();
  }

  @Entity(name = "Answer")
  @Table(name = "answers")
  public static class Answer extends Identified {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "response_id")
    public SurveyResponse response;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    public Question question;

    @Column(columnDefinition = "text")
    public String content;
  }

  @Entity(name = "Suggestion")
  @Table(name = "suggestions")
  public static class Suggestion extends Identified {
    public String title;

    @Column(columnDefinition = "text")
    public String description;

    public String theme;
    public Integer stateId;
    public Integer municipalityId;
    public String status = "PENDING";
    public Instant createdAt = Instant.now();
  }

  @Entity(name = "SuggestionSupport")
  @Table(
      name = "suggestion_supports",
      uniqueConstraints = @UniqueConstraint(columnNames = {"suggestion_id", "participant"}))
  public static class SuggestionSupport extends Identified {
    public UUID suggestionId;
    public String participant;
    public Instant createdAt = Instant.now();
  }

  @Entity(name = "Report")
  @Table(
      name = "reports",
      uniqueConstraints = @UniqueConstraint(columnNames = {"suggestion_id", "participant"}))
  public static class Report extends Identified {
    public UUID suggestionId;
    public String participant;
    public String reason;
    public String status = "OPEN";
    public Instant createdAt = Instant.now();
  }

  @Entity(name = "AdminUser")
  @Table(name = "admin_users")
  public static class AdminUser extends Identified {
    public String username;
    public String passwordHash;
    public boolean enabled = true;
  }

  @Entity(name = "AuditLog")
  @Table(name = "audit_logs")
  public static class AuditLog extends Identified {
    public String actor;
    public String action;
    public UUID resourceId;
    public Instant createdAt = Instant.now();
  }

  @Entity(name = "SurveyStart")
  @Table(
      name = "survey_starts",
      uniqueConstraints = @UniqueConstraint(columnNames = {"survey_id", "participant"}))
  public static class SurveyStart extends Identified {
    public UUID surveyId;
    public String participant;
    public Instant createdAt = Instant.now();
  }
}
