/**
 * Export Engine — DOCX, LaTeX, PDF (via typst)
 */

import type {
  ThesisDocument,
  Chapter as ThesisChapter,
  BibliographyEntry,
  DocumentSettings,
} from "@/types/thesis";

/** ==================== DOCX Export ==================== */

export function exportToDOCX(doc: ThesisDocument): Blob {
  const xml = buildDOCXXML(doc);
  return new Blob([xml], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function buildDOCXXML(doc: ThesisDocument): string {
  const settings = doc.settings;
  const chapters = [...doc.chapters].sort((a, b) => (a.number || 0) - (b.number || 0));

  let body = `
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        ${buildTitlePage(doc, settings)}
        ${settings.includeTOC ? '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r></w:p><w:p><w:r><w:instrText>TOC \\o "1-3" \\h \\z \\u</w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p><w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ""}
        ${chapters.map((ch) => buildChapterXML(ch, settings)).join("")}
        ${doc.bibliography.length > 0 ? buildReferencesXML(doc.bibliography, settings) : ""}
      </w:body>
    </w:document>
  `;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:wordDocument xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${body}
</w:wordDocument>`;
}

function buildTitlePage(doc: ThesisDocument, settings: DocumentSettings): string {
  return `
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:b/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${escapeXML(doc.title)}</w:t></w:r></w:p>
    ${doc.subtitle ? `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${escapeXML(doc.subtitle)}</w:t></w:r></w:p>` : ""}
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${escapeXML(doc.author)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${escapeXML(doc.program)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${escapeXML(doc.institution)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${doc.year}</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
  `;
}

function buildChapterXML(ch: ThesisChapter, settings: DocumentSettings): string {
  const sections = ch.sections!.filter((s) => s.selectedAlternativeId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const chapterNumber = ch.number ?? 1;
  let xml = `
    <w:p><w:pPr><w:pageBreakBefore/><w:outlineLvl w:val="0"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:b/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>Chapter ${chapterNumber}: ${escapeXML(ch.title)}</w:t></w:r></w:p>
  `;

  for (const section of sections) {
    const alt = section.alternatives!.find((a) => a.id === section.selectedAlternativeId);
    if (!alt) continue;

    xml += `
      <w:p><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:b/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${escapeXML(section.title)}</w:t></w:r></w:p>
      ${markdownToDOCX(alt.content, settings)}
    `;
  }

  return xml;
}

function buildReferencesXML(bib: BibliographyEntry[], settings: DocumentSettings): string {
  let xml = `<w:p><w:pPr><w:pageBreakBefore/><w:outlineLvl w:val="0"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:b/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>References</w:t></w:r></w:p>`;

  for (const entry of bib.sort((a, b) => a.authors[0].localeCompare(b.authors[0]))) {
    xml += `<w:p><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:r><w:t>${escapeXML(formatCitationAPA(entry))}</w:t></w:r></w:p>`;
  }

  return xml;
}

function markdownToDOCX(md: string, settings: DocumentSettings): string {
  let xml = "";
  const lines = md.split("\n");

  for (const line of lines) {
    if (line.startsWith("## ")) {
      xml += `<w:p><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:b/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${escapeXML(line.slice(3))}</w:t></w:r></w:p>`;
    } else if (line.startsWith("### ")) {
      xml += `<w:p><w:pPr><w:outlineLvl w:val="2"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:b/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${escapeXML(line.slice(4))}</w:t></w:r></w:p>`;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      xml += `<w:p><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:r><w:t>${escapeXML("• " + line.slice(2))}</w:t></w:r></w:p>`;
    } else if (line.startsWith("1. ") || /^\d+\.\s/.test(line)) {
      xml += `<w:p><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:r><w:t>${escapeXML(line)}</w:t></w:r></w:p>`;
    } else if (line.trim() === "") {
      xml += `<w:p><w:r><w:br/></w:r></w:p>`;
    } else {
      xml += `<w:p><w:r><w:rPr><w:sz w:val="${settings.fontSize * 2}"/><w:font w:val="${fontFamilyXML(settings.fontFamily)}"/></w:rPr><w:t>${escapeXML(line)}</w:t></w:r></w:p>`;
    }
  }

  return xml;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatCitationAPA(entry: BibliographyEntry): string {
  const authors = entry.authors.map((a) => {
    const parts = a.split(" ");
    const last = parts.pop() || "";
    const initials = parts.map((p) => p[0] + ".").join(" ");
    return `${last}, ${initials}`;
  }).join(", ");

  let citation = `${authors} (${entry.year}). ${entry.title}.`;
  if (entry.venue) citation += ` ${entry.venue}.`;
  if (entry.doi) citation += ` https://doi.org/${entry.doi}`;
  else if (entry.url) citation += ` ${entry.url}`;
  return citation;
}

function fontFamilyXML(family: string): string {
  const map: Record<string, string> = {
    "Times New Roman": "Times New Roman",
    Arial: "Arial",
    Calibri: "Calibri",
    Georgia: "Georgia",
  };
  return map[family] || "Times New Roman";
}

/** ==================== LaTeX Export ==================== */

export function exportToLaTeX(doc: ThesisDocument): string {
  const settings = doc.settings;
  const chapters = [...doc.chapters].sort((a, b) => (a.number || 0) - (b.number || 0));

  let latex = `\\documentclass[${settings.fontSize}pt,${settings.pageSize.toLowerCase()},oneside]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[english]{babel}
\\usepackage{${fontFamilyLaTeX(settings.fontFamily)}}
\\usepackage{setspace}
\\usepackage{geometry}
\\geometry{${marginGeometry(settings.margins)}}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{caption}
\\usepackage{hyperref}
\\hypersetup{colorlinks=true,linkcolor=blue,citecolor=blue,urlcolor=blue}
\\usepackage{csquotes}
\\usepackage[style=${settings.citationStyle.toLowerCase()},backend=biber]{biblatex}
${doc.bibliography.length > 0 ? `\\addbibresource{references.bib}` : ""}

\\begin{document}
\\setstretch{${settings.lineSpacing}}

${buildLaTeXTitlePage(doc)}
${settings.includeTOC ? "\\tableofcontents\\newpage" : ""}

${chapters.map((ch) => buildLaTeXChapter(ch, settings)).join("\n")}

${doc.bibliography.length > 0 ? "\\printbibliography" : ""}

\\end{document}
`;

  return latex;
}

function buildLaTeXTitlePage(doc: ThesisDocument): string {
  return `
\\begin{titlepage}
\\centering
\\vspace*{2cm}
{\\LARGE \\textbf{${escapeLaTeX(doc.title)}}\\\\[0.5cm]}
${doc.subtitle ? `{\\large ${escapeLaTeX(doc.subtitle)}}\\\\[1cm]` : ""}
{\\large ${escapeLaTeX(doc.author)}\\\\[1cm]}
{\\large ${escapeLaTeX(doc.program)}\\\\[0.5cm]}
{\\large ${escapeLaTeX(doc.institution)}\\\\[0.5cm]}
{\\large ${doc.year}\\\\[2cm]}
\\end{titlepage}
\\newpage
`;
}

function buildLaTeXChapter(ch: ThesisChapter, _settings: DocumentSettings): string {
  const sections = ch.sections!.filter((s) => s.selectedAlternativeId).sort((a, b) => (a.order || 0) - (b.order || 0));

  let latex = `\\chapter{${escapeLaTeX(ch.title!)}}\n\\label{ch:${ch.id}}\n\n`;

  for (const section of sections) {
    const alt = section.alternatives!.find((a) => a.id === section.selectedAlternativeId);
    if (!alt) continue;

    const level = section.order === 0 ? "section" : "subsection";
    latex += `\\${level}{${escapeLaTeX(section.title)}}\n\\label{sec:${section.id}}\n\n`;
    latex += `${markdownToLaTeX(alt.content)}\n\n`;
  }

  return latex;
}

function markdownToLaTeX(md: string): string {
  let latex = "";
  const lines = md.split("\n");

  for (const line of lines) {
    if (line.startsWith("## ")) {
      latex += `\\section{${escapeLaTeX(line.slice(3))}}\n`;
    } else if (line.startsWith("### ")) {
      latex += `\\subsection{${escapeLaTeX(line.slice(4))}}\n`;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      latex += `\\item ${escapeLaTeX(line.slice(2))}\n`;
    } else if (line.startsWith("1. ") || /^\d+\.\s/.test(line)) {
      latex += `\\item ${escapeLaTeX(line.replace(/^\d+\.\s/, ""))}\n`;
    } else if (line.trim() === "") {
      latex += "\n\n";
    } else if (line.startsWith("```")) {
      // code blocks - skip for now
    } else if (line.startsWith("> ")) {
      latex += `\\begin{quote}\n${escapeLaTeX(line.slice(2))}\n\\end{quote}\n\n`;
    } else {
      latex += `${escapeLaTeX(line)}\n\n`;
    }
  }

  latex = latex.replace(/(\\item .+\n)+/g, (match) => `\\begin{itemize}\n${match}\\end{itemize}\n`);
  return latex;
}

function escapeLaTeX(str: string): string {
  return str
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/%/g, "\\%")
    .replace(/&/g, "\\&")
    .replace(/_/g, "\\_")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/~/g, "\\textasciitilde{}");
}

function fontFamilyLaTeX(family: string): string {
  const map: Record<string, string> = {
    "Times New Roman": "times",
    Arial: "helvet",
    Calibri: "calibri",
    Georgia: "garamond",
  };
  return map[family] || "times";
}

function marginGeometry(margin: string): string {
  const map: Record<string, string> = {
    normal: "margin=1in",
    narrow: "margin=0.75in",
    wide: "margin=1.25in",
  };
  return map[margin] || "margin=1in";
}

/** ==================== Typst Export ==================== */

export function exportToTypst(doc: ThesisDocument): string {
  const settings = doc.settings;
  const chapters = [...doc.chapters].sort((a, b) => (a.number || 0) - (b.number || 0));

  const S = { n: "\n", bs: "\\" };
  const pagebreak = S.bs + S.bs + "pagebreak" + "\n";

  let typst = `#set page(paper: "${settings.pageSize}", margin: ${marginTypst(settings.margins)})
#set text(font: "${fontFamilyTypst(settings.fontFamily)}", size: ${settings.fontSize}pt, spacing: ${settings.lineSpacing})
#set par(justify: true, first-line-indent: 1.2em)

${buildTypstTitlePage(doc, S)}

${settings.includeTOC ? "#outline(title: [Table of Contents])\n\\pagebreak\n" : ""}

${chapters.map((ch) => buildTypstChapter(ch, S)).join("\n" + pagebreak)}

${doc.bibliography.length > 0 ? buildTypstBibliography(doc.bibliography, S) : ""}
`;

  return typst;
}

function buildTypstTitlePage(doc: ThesisDocument, S: { n: string; bs: string }): string {
  const titleLines = [
    "#align(center)[",
    "  #v(3cm)",
    "  #text(size: 28pt, weight: 700)[" + escapeTypst(doc.title) + "]",
  ];
  if (doc.subtitle) {
    titleLines.push("  #v(1cm)");
    titleLines.push("  #text(size: 20pt)[" + escapeTypst(doc.subtitle) + "]");
  }
  titleLines.push("  #v(2cm)");
  titleLines.push("  #text(size: 18pt)[" + escapeTypst(doc.author) + "]");
  titleLines.push("  #v(1cm)");
  titleLines.push("  #text(size: 16pt)[" + escapeTypst(doc.program) + "]");
  titleLines.push("  #v(0.5cm)");
  titleLines.push("  #text(size: 16pt)[" + escapeTypst(doc.institution) + "]");
  titleLines.push("  #v(0.5cm)");
  titleLines.push("  #text(size: 16pt)[" + doc.year + "]");
  titleLines.push("]");
  titleLines.push(S.bs + "pagebreak");
  return titleLines.join(S.n);
}

function buildTypstChapter(ch: ThesisChapter, S: { n: string; bs: string }): string {
  const sections = ch.sections!.filter((s) => s.selectedAlternativeId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const chapterNum = ch.number || 1;

  const lines: string[] = [];
  lines.push("#heading(" + chapterNum + ". " + escapeTypst(ch.title!) + ")");
  lines.push("");

  for (const section of sections) {
    const alt = section.alternatives!.find((a) => a.id === section.selectedAlternativeId);
    if (!alt) continue;
    lines.push("## " + escapeTypst(section.title));
    lines.push("");
    lines.push(markdownToTypst(alt.content, S));
    lines.push("");
  }

  return lines.join(S.n);
}

function markdownToTypst(md: string, S: { n: string; bs: string }): string {
  const out: string[] = [];
  const lines = md.split("\n");

  for (const line of lines) {
    if (line.startsWith("## ")) {
      out.push("#heading(" + escapeTypst(line.slice(3)) + ")");
    } else if (line.startsWith("### ")) {
      out.push("### " + escapeTypst(line.slice(4)));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      out.push("- " + escapeTypst(line.slice(2)));
    } else if (line.startsWith("1. ") || /^\d+\.\s/.test(line)) {
      out.push(escapeTypst(line));
    } else if (line.startsWith("```")) {
      // code blocks
    } else if (line.startsWith("> ")) {
      out.push("#quote[" + escapeTypst(line.slice(2)) + "]");
    } else if (line.trim() === "") {
      out.push("");
    } else {
      out.push(escapeTypst(line));
    }
  }

  return out.join(S.n);
}

function escapeTypst(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/"/g, '\\"');
}

function fontFamilyTypst(family: string): string {
  const map: Record<string, string> = {
    "Times New Roman": "Times New Roman",
    Arial: "Arial",
    Calibri: "Calibri",
    Georgia: "Georgia",
  };
  return map[family] || "Times New Roman";
}

function marginTypst(margin: string): string {
  const map: Record<string, string> = {
    normal: "1in",
    narrow: "0.75in",
    wide: "1.25in",
  };
  return map[margin] || "1in";
}

/** ==================== Bibliography Helpers ==================== */

export function generateBibTeX(bibliography: BibliographyEntry[]): string {
  return bibliography.map((entry) => {
    const authors = entry.authors.join(" and ");
    const fields = [
      `@${entryTypeToBibTeX(entry.type)}:${entry.id},{`,
      `  title = {${entry.title}},`,
      `  author = {${authors}},`,
      `  year = {${entry.year}},`,
      entry.venue ? `  journal = {${entry.venue}},` : "",
      entry.doi ? `  doi = {${entry.doi}},` : "",
      entry.url ? `  url = {${entry.url}},` : "",
      `}`,
    ].filter(Boolean).join("\n");
    return fields;
  }).join("\n\n");
}

function buildTypstBibliography(bib: BibliographyEntry[], S: { n: string; bs: string }): string {
  const out: string[] = [];
  out.push("");
  for (const entry of bib) {
    let line = `${entry.authors[0] ?? ""}, et al. (${entry.year}). ${entry.title}.`;
    if (entry.venue) line += ` ${entry.venue}.`;
    if (entry.doi) line += ` https://doi.org/${entry.doi}`;
    else if (entry.url) line += ` ${entry.url}`;
    out.push(line);
    out.push("");
  }
  return out.join(S.n);
}

function entryTypeToBibTeX(type: string): string {
  const map: Record<string, string> = {
    journal: "article",
    conference: "inproceedings",
    book: "book",
    thesis: "phdthesis",
    web: "misc",
    other: "misc",
  };
  return map[type] || "misc";
}