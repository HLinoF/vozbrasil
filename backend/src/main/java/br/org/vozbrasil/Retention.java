package br.org.vozbrasil;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class Retention {
  final EntityManager em;
  final int days;

  public Retention(EntityManager em, @Value("${app.retention-days}") int days) {
    this.em = em;
    this.days = days;
  }

  @Scheduled(cron = "0 0 3 * * *", zone = "America/Sao_Paulo")
  @Transactional
  public void purge() {
    var cutoff = Instant.now().minus(days, ChronoUnit.DAYS);
    em.createQuery(
            "delete from Answer a where a.response.id in (select r.id from SurveyResponse r where"
                + " r.createdAt<:d)")
        .setParameter("d", cutoff)
        .executeUpdate();
    for (String entity :
        new String[] {"SurveyResponse", "SurveyStart", "Report", "SuggestionSupport", "AuditLog"})
      em.createQuery("delete from " + entity + " where createdAt<:d")
          .setParameter("d", cutoff)
          .executeUpdate();
    em.createQuery(
            "delete from Suggestion s where s.createdAt<:d and not exists (select r.id from Report"
                + " r where r.suggestionId=s.id) and not exists (select x.id from SuggestionSupport"
                + " x where x.suggestionId=s.id)")
        .setParameter("d", cutoff)
        .executeUpdate();
  }
}
