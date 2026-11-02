package br.org.vozbrasil;

import static br.org.vozbrasil.Model.*;

import jakarta.persistence.EntityManager;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {
  @Bean
  BCryptPasswordEncoder encoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  UserDetailsService users(EntityManager em) {
    return username -> {
      var rows =
          em.createQuery("from AdminUser where username=:u and enabled=true", AdminUser.class)
              .setParameter("u", username)
              .getResultList();
      if (rows.isEmpty()) throw new UsernameNotFoundException("Credenciais inválidas");
      var u = rows.getFirst();
      return User.withUsername(u.username).password(u.passwordHash).roles("ADMIN").build();
    };
  }

  @Bean
  ApplicationRunner bootstrap(
      EntityManager em,
      TransactionTemplate tx,
      BCryptPasswordEncoder encoder,
      @Value("${app.admin-user}") String username,
      @Value("${app.admin-password}") String password) {
    return args -> {
      if (!password.isBlank()) {
        if (password.length() < 12)
          throw new IllegalStateException("ADMIN_PASSWORD precisa de 12 caracteres");
        tx.execute(
            s -> {
              var rows =
                  em.createQuery("from AdminUser where username=:u", AdminUser.class)
                      .setParameter("u", username)
                      .getResultList();
              AdminUser u = rows.isEmpty() ? new AdminUser() : rows.getFirst();
              u.username = username;
              u.passwordHash = encoder.encode(password);
              em.persist(u);
              return null;
            });
      }
    };
  }

  @Bean
  SecurityFilterChain chain(HttpSecurity http, Guard guard) throws Exception {
    return http.csrf(c -> c.disable())
        .sessionManagement(
            s ->
                s.sessionCreationPolicy(
                    org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a -> a.requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().permitAll())
        .httpBasic(
            b ->
                b.authenticationEntryPoint(
                    (q, r, e) -> {
                      r.setStatus(401);
                      r.setContentType("application/json");
                      r.getWriter().write("{\"message\":\"Autenticação necessária\"}");
                    }))
        .headers(
            h ->
                h.contentTypeOptions(c -> {})
                    .frameOptions(f -> f.deny())
                    .referrerPolicy(
                        r ->
                            r.policy(
                                org.springframework.security.web.header.writers
                                    .ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN)))
        .addFilterBefore(guard, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Component
  public static class Guard extends OncePerRequestFilter {
    private final byte[] secret;
    private final String origin;
    private final boolean secure;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    record Bucket(long minute, int count) {}

    public Guard(
        @Value("${app.secret}") String secret,
        @Value("${app.origin}") String origin,
        @Value("${app.secure-cookie}") boolean secure) {
      if (secret.length() < 32)
        throw new IllegalStateException("Defina APP_SECRET com ao menos 32 caracteres");
      this.secret = secret.getBytes(StandardCharsets.UTF_8);
      this.origin = origin;
      this.secure = secure;
    }

    String sign(String value) {
      try {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
      } catch (Exception e) {
        throw new IllegalStateException(e);
      }
    }

    public String participant(HttpServletRequest req) {
      return (String) req.getAttribute("participant");
    }

    protected void doFilterInternal(
        HttpServletRequest req, HttpServletResponse res, FilterChain chain)
        throws ServletException, IOException {
      if (!req.getRequestURI().startsWith("/api/")) {
        chain.doFilter(req, res);
        return;
      }
      if (req.getContentLengthLong() > 262144) {
        res.setStatus(413);
        return;
      }
      long minute = System.currentTimeMillis() / 60000;
      if (buckets.size() > 10000) buckets.entrySet().removeIf(e -> e.getValue().minute() < minute);
      String key = sign(req.getRemoteAddr());
      Bucket bucket =
          buckets.compute(
              key,
              (k, v) -> new Bucket(minute, v == null || v.minute() != minute ? 1 : v.count() + 1));
      if (bucket.count() > 180) {
        res.setStatus(429);
        res.setHeader("Retry-After", "60");
        res.getWriter().write("{\"message\":\"Muitas solicitações. Aguarde um minuto.\"}");
        return;
      }
      if (!Set.of("GET", "HEAD", "OPTIONS").contains(req.getMethod())
          && req.getHeader("Origin") != null
          && !origin.equals(req.getHeader("Origin"))) {
        res.setStatus(403);
        return;
      }
      String token = null;
      if (req.getCookies() != null)
        for (Cookie c : req.getCookies())
          if (c.getName().equals("vb_participant")) token = c.getValue();
      boolean valid = false;
      if (token != null && token.length() < 200) {
        String[] p = token.split("\\.");
        valid =
            p.length == 2
                && p[0].matches("[a-f0-9-]{36}")
                && MessageDigest.isEqual(
                    sign(p[0]).getBytes(StandardCharsets.UTF_8),
                    p[1].getBytes(StandardCharsets.UTF_8));
      }
      if (!valid) {
        String id = UUID.randomUUID().toString();
        token = id + "." + sign(id);
        res.addHeader(
            "Set-Cookie",
            "vb_participant="
                + token
                + "; Path=/api; HttpOnly; SameSite=Lax; Max-Age=31536000"
                + (secure ? "; Secure" : ""));
      }
      String participant = sign(token);
      if (!Set.of("GET", "HEAD", "OPTIONS").contains(req.getMethod())
          && !req.getRequestURI().startsWith("/api/admin/")) {
        String category =
            req.getRequestURI().equals("/api/suggestions")
                ? "ideas"
                : req.getRequestURI().endsWith("/reports") ? "reports" : "writes";
        long window = category.equals("writes") ? minute : minute / 60;
        int limit = category.equals("ideas") ? 5 : category.equals("reports") ? 20 : 30;
        Bucket write =
            buckets.compute(
                participant + category,
                (k, v) ->
                    new Bucket(window, v == null || v.minute() != window ? 1 : v.count() + 1));
        if (write.count() > limit) {
          res.setStatus(429);
          res.setContentType("application/json");
          res.getWriter()
              .write("{\"message\":\"Limite temporário de envios atingido. Tente mais tarde.\"}");
          return;
        }
      }
      req.setAttribute("participant", participant);
      chain.doFilter(req, res);
    }
  }
}
