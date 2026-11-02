package br.org.vozbrasil;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyRepository extends JpaRepository<Model.Survey, UUID> {}
