package br.org.vozbrasil;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.File;

/** PostgreSQL real para desenvolvimento sem Docker. Nunca usado na aplicação de produção. */
public class DevDatabase {
  public static void main(String[] args) throws Exception {
    File data = new File(args.length > 0 ? args[0] : ".tools/postgres-data");
    EmbeddedPostgres pg =
        EmbeddedPostgres.builder()
            .setPort(5432)
            .setDataDirectory(data)
            .setCleanDataDirectory(false)
            .start();
    Runtime.getRuntime()
        .addShutdownHook(
            new Thread(
                () -> {
                  try {
                    pg.close();
                  } catch (Exception ignored) {
                  }
                }));
    try (var connection = pg.getPostgresDatabase().getConnection();
        var statement = connection.createStatement()) {
      var exists = statement.executeQuery("SELECT 1 FROM pg_database WHERE datname='vozbrasil'");
      if (!exists.next()) statement.execute("CREATE DATABASE vozbrasil");
    }
    System.out.println("PostgreSQL local pronto em localhost:5432 / vozbrasil");
    File stop=new File(data.getParentFile(),"database.stop");
    while(!stop.exists())Thread.sleep(1000);
    pg.close();
  }
}
