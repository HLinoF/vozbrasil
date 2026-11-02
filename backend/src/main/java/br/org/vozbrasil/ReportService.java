package br.org.vozbrasil;

import java.io.*;
import java.util.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import org.springframework.stereotype.Service;

@Service
public class ReportService {
  final CivicService service;

  public ReportService(CivicService service) {
    this.service = service;
  }

  @SuppressWarnings("unchecked")
  public String csv(Dtos.Filters f) {
    var data = service.results(f);
    StringBuilder b =
        new StringBuilder("\uFEFFpesquisa;pergunta;alternativa;respostas;percentual;filtros\r\n");
    for (Object obj : (List<?>) data.get("questions")) {
      var q = (Map<String, Object>) obj;
      for (Object opt : (List<?>) q.get("options")) {
        var o = (Map<String, Object>) opt;
        b.append(cell(q.get("surveyTitle")))
            .append(';')
            .append(cell(q.get("text")))
            .append(';')
            .append(cell(o.get("label")))
            .append(';')
            .append(cell(o.get("count")))
            .append(';')
            .append(cell(o.get("percent")))
            .append(';')
            .append(cell(f.toString()))
            .append("\r\n");
      }
    }
    return b.toString();
  }

  static String cell(Object o) {
    String s = o == null ? "Suprimido" : o.toString();
    if (s.matches("^[=+@\\-].*")) s = "'" + s;
    return "\"" + s.replace("\"", "\"\"") + "\"";
  }

  @SuppressWarnings("unchecked")
  public byte[] pdf(Dtos.Filters f) throws IOException {
    var data = service.results(f);
    try (PDDocument doc = new PDDocument();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Page writer = new Page(doc);
      writer.line("VOZBRASIL / BRASIL EM DADOS", 20);
      writer.line("Relatorio de participacao voluntaria", 12);
      writer.line("Gerado em: " + data.get("generatedAt"), 10);
      writer.line("Respostas no recorte: " + data.get("total"), 12);
      writer.line("Estado IBGE: " + f.stateId() + " | Municipio: " + f.municipalityId(), 9);
      writer.line("Pesquisa: " + f.surveyId() + " | Tema: " + f.theme(), 9);
      writer.line(
          "Periodo UTC: "
              + (f.from() == null ? "inicio" : f.from())
              + " a "
              + (f.to() == null ? "agora" : f.to()),
          9);
      writer.line("Amostra voluntaria. Nao representa a populacao brasileira.", 10);
      writer.line("Minimo: 5 respostas por celula. Textos individuais nao sao publicados.", 10);
      for (Object obj : (List<?>) data.get("questions")) {
        var q = (Map<String, Object>) obj;
        writer.line(q.get("surveyTitle").toString(), 11);
        writer.line(q.get("text").toString(), 12);
        if (Boolean.TRUE.equals(q.get("suppressed"))) {
          writer.line("Resultado protegido por amostra insuficiente.", 10);
          continue;
        }
        writer.line("Base da pergunta: " + q.get("total"), 10);
        for (Object opt : (List<?>) q.get("options")) {
          var o = (Map<String, Object>) opt;
          writer.line(
              o.get("label") + ": " + o.get("percent") + "% (n=" + o.get("count") + ")", 10);
          writer.bar(((Number) o.get("percent")).floatValue());
        }
      }
      if (((List<?>) data.get("questions")).isEmpty())
        writer.line("Ainda nao ha resultados neste recorte.", 12);
      writer.close();
      doc.save(out);
      return out.toByteArray();
    }
  }

  static class Page implements AutoCloseable {
    PDDocument doc;
    PDPageContentStream stream;
    float y;
    PDFont font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

    Page(PDDocument d) throws IOException {
      doc = d;
      next();
    }

    void next() throws IOException {
      if (stream != null) stream.close();
      PDPage page = new PDPage();
      doc.addPage(page);
      stream = new PDPageContentStream(doc, page);
      y = 745;
    }

    void line(String value, int size) throws IOException {
      String cleaned =
          java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
              .replaceAll("\\p{M}", "")
              .replaceAll("[^\\x20-\\x7E]", " ");
      int limit = 90;
      for (int i = 0; i < Math.max(1, cleaned.length()); i += limit) {
        if (y < 55) next();
        stream.beginText();
        stream.setFont(font, size);
        stream.newLineAtOffset(45, y);
        stream.showText(cleaned.substring(i, Math.min(cleaned.length(), i + limit)));
        stream.endText();
        y -= size + 9;
      }
    }

    void bar(float percent) throws IOException {
      if (y < 65) next();
      stream.setNonStrokingColor(0.03f, 0.5f, 0.35f);
      stream.addRect(45, y, Math.max(0, Math.min(percent, 100)) * 4, 7);
      stream.fill();
      stream.setNonStrokingColor(0f, 0f, 0f);
      y -= 20;
    }

    public void close() throws IOException {
      stream.close();
    }
  }
}
