/**
 * Literature Integration — OpenAlex, Crossref, Semantic Scholar, User PDF Upload
 */

import type { BibliographyEntry } from "@/types";

/** ==================== OpenAlex API ==================== */

const OPENALEX_BASE = "https://api.openalex.org";

export interface OpenAlexWork {
  id: string;
  doi: string | null;
  title: string;
  publication_year: number;
  authorships: { author: { id: string; display_name: string } }[];
  host_venue: { id: string; display_name: string; type: string; url: string } | null;
  cited_by_count: number;
  abstract_inverted_index: Record<string, number[]> | null;
  concepts: { id: string; display_name: string; score: number }[];
  keywords: { keyword: string; score: number }[];
  open_access: { is_oa: boolean; oa_url: string | null } | null;
}

function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string {
  if (!invertedIndex) return "";
  const words: (string | null)[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.filter(Boolean).join(" ");
}

/** Search OpenAlex by topic/query */
export async function searchOpenAlex(
  query: string,
  filters: {
    yearFrom?: number;
    yearTo?: number;
    citedByCount?: number;
    openAccessOnly?: boolean;
    concepts?: string[];
  } = {},
  limit: number = 20
): Promise<OpenAlexWork[]> {
  const params = new URLSearchParams({
    search: query,
    per_page: limit.toString(),
    sort: "cited_by_count:desc",
  });

  if (filters.yearFrom) params.append("filter", `from_publication_date:${filters.yearFrom}-01-01`);
  if (filters.yearTo) params.append("filter", `to_publication_date:${filters.yearTo}-12-31`);
  if (filters.citedByCount) params.append("filter", `cited_by_count:>${filters.citedByCount}`);
  if (filters.openAccessOnly) params.append("filter", "open_access.is_oa:true");
  if (filters.concepts?.length) {
    for (const c of filters.concepts) {
      params.append("filter", `concepts:${encodeURIComponent(c)}`);
    }
  }

  const response = await fetch(`${OPENALEX_BASE}/works?${params}`);
  if (!response.ok) throw new Error(`OpenAlex API error: ${response.status}`);
  const data = await response.json();
  return data.results || [];
}

/** Get work by DOI */
export async function getOpenAlexByDOI(doi: string): Promise<OpenAlexWork | null> {
  const response = await fetch(`${OPENALEX_BASE}/works/https://doi.org/${encodeURIComponent(doi)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`OpenAlex API error: ${response.status}`);
  return response.json();
}

/** Convert OpenAlex work to bibliography entry */
export function openAlexToBibliography(work: OpenAlexWork): {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string | undefined;
  doi: string | undefined;
  url: string | undefined;
  abstract: string | undefined;
  type: "journal" | "conference" | "preprint" | "other";
  tags: string[];
  source: "openalex";
} {
  const authors = work.authorships.map((a) => a.author.display_name);
  const venue = work.host_venue?.display_name;
  const type = work.host_venue?.type === "journal" ? "journal" :
               work.host_venue?.type === "conference" ? "conference" :
               work.host_venue?.type === "repository" ? "preprint" : "other";

  return {
    id: `oa-${work.id.split("/").pop()}`,
    title: work.title,
    authors,
    year: work.publication_year,
    venue,
    doi: work.doi ? work.doi.replace("https://doi.org/", "") : undefined,
    url: work.doi ? `https://doi.org/${work.doi.replace("https://doi.org/", "")}` : work.id,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    type,
    tags: work.concepts.slice(0, 5).map((c) => c.display_name),
    source: "openalex",
  };
}

/** ==================== Crossref API ==================== */

const CROSSREF_BASE = "https://api.crossref.org";

export interface CrossrefItem {
  DOI: string;
  title: string[];
  author: { given: string; family: string; sequence: string }[];
  "published-print"?: { "date-parts": number[][] };
  "published-online"?: { "date-parts": number[][] };
  container_title?: string[];
  type: string;
  "is-referenced-by-count": number;
  URL?: string;
  abstract?: string;
}

export async function searchCrossref(
  query: string,
  filters: {
    yearFrom?: number;
    yearTo?: number;
    type?: string;
  } = {},
  limit: number = 20
): Promise<CrossrefItem[]> {
  const params = new URLSearchParams({
    query,
    rows: limit.toString(),
    sort: "relevance",
    order: "desc",
  });

  if (filters.yearFrom) params.append("filter", `from-pub-date:${filters.yearFrom}`);
  if (filters.yearTo) params.append("filter", `until-pub-date:${filters.yearTo}`);
  if (filters.type) params.append("filter", `type:${filters.type}`);

  const response = await fetch(`${CROSSREF_BASE}/works?${params}`, {
    headers: { "User-Agent": "CapstoneAI/1.0 (mailto:user@example.com)" },
  });
  if (!response.ok) throw new Error(`Crossref API error: ${response.status}`);
  const data = await response.json();
  return data.message?.items || [];
}

export function crossrefToBibliography(item: CrossrefItem): {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string | undefined;
  doi: string | undefined;
  url: string | undefined;
  abstract: string | undefined;
  type: "journal" | "conference" | "book" | "other";
  tags: string[];
  source: "crossref";
} {
  const year = item["published-print"]?.["date-parts"]?.[0]?.[0] ||
               item["published-online"]?.["date-parts"]?.[0]?.[0] ||
               new Date().getFullYear();

  const authors = item.author?.map((a) => `${a.given} ${a.family}`) || [];
  const venue = item.container_title?.[0];
  const type = item.type === "journal-article" ? "journal" :
               item.type === "proceedings-article" ? "conference" :
               item.type === "book" || item.type === "book-chapter" ? "book" : "other";

  return {
    id: `cr-${item.DOI.replace(/[^a-zA-Z0-9]/g, "")}`,
    title: item.title[0] || "Untitled",
    authors,
    year,
    venue,
    doi: item.DOI,
    url: item.URL,
    abstract: item.abstract,
    type,
    tags: [],
    source: "crossref",
  };
}

/** ==================== Semantic Scholar API ==================== */

const SEMANTIC_SCHOLAR_BASE = "https://api.semanticscholar.org/graph/v1";

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors: { authorId: string; name: string }[];
  year: number;
  venue: string | null;
  citationCount: number;
  influentialCitationCount: number;
  isOpenAccess: boolean;
  openAccessPdf: { url: string } | null;
  fieldsOfStudy: string[];
  s2FieldsOfStudy: { category: string; source: string }[];
  publicationTypes: string[];
  publicationVenue: { id: string; name: string; type: string; url: string } | null;
  abstract: string | null;
  tldr: { text: string; model: string } | null;
  references: { paperId: string }[] | null;
  citations: { paperId: string }[] | null;
}

export async function searchSemanticScholar(
  query: string,
  filters: {
    yearFrom?: number;
    yearTo?: number;
    fieldsOfStudy?: string[];
    openAccessOnly?: boolean;
  } = {},
  limit: number = 20
): Promise<SemanticScholarPaper[]> {
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
    fields: "title,year,venue,authors,citationCount,influentialCitationCount,isOpenAccess,openAccessPdf,fieldsOfStudy,publicationTypes,publicationVenue,abstract,tldr",
  });

  if (filters.yearFrom) params.append("year", `${filters.yearFrom}-`);
  if (filters.fieldsOfStudy?.length) params.append("fieldsOfStudy", filters.fieldsOfStudy.join(","));

  const response = await fetch(`${SEMANTIC_SCHOLAR_BASE}/paper/search?${params}`, {
    headers: { "User-Agent": "CapstoneAI/1.0" },
  });
  if (!response.ok) throw new Error(`Semantic Scholar API error: ${response.status}`);
  const data = await response.json();
  return data.data || [];
}

export function semanticScholarToBibliography(paper: SemanticScholarPaper): {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string | undefined;
  doi: string | undefined;
  url: string | undefined;
  abstract: string | undefined;
  type: "journal" | "conference" | "preprint" | "other";
  tags: string[];
  source: "semantic-scholar";
} {
  const authors = paper.authors.map((a) => a.name);
  const venue = paper.venue || paper.publicationVenue?.name;
  const type = paper.publicationTypes.includes("JournalArticle") ? "journal" :
               paper.publicationTypes.includes("Conference") ? "conference" :
               paper.publicationTypes.includes("Preprint") ? "preprint" : "other";

  return {
    id: `ss-${paper.paperId}`,
    title: paper.title,
    authors,
    year: paper.year,
    venue,
    doi: undefined,
    url: `https://www.semanticscholar.org/paper/${paper.paperId}`,
    abstract: paper.abstract ?? undefined,
    type,
    tags: paper.fieldsOfStudy || [],
    source: "semantic-scholar",
  };
}

/** ==================== Unified Search ==================== */

export async function unifiedLiteratureSearch(
  query: string,
  options: {
    yearFrom?: number;
    yearTo?: number;
    limitPerSource?: number;
    openAccessOnly?: boolean;
    fieldsOfStudy?: string[];
  } = {}
): Promise<{
  openalex: { id: string; title: string; authors: string[]; year: number; venue: string | undefined; doi: string | undefined; url: string | undefined; abstract: string | undefined; type: string; tags: string[]; source: "openalex" }[];
  crossref: { id: string; title: string; authors: string[]; year: number; venue: string | undefined; doi: string | undefined; url: string | undefined; abstract: string | undefined; type: string; tags: string[]; source: "crossref" }[];
  semanticscholar: { id: string; title: string; authors: string[]; year: number; venue: string | undefined; doi: string | undefined; url: string | undefined; abstract: string | undefined; type: string; tags: string[]; source: "semantic-scholar" }[];
}> {
  const limit = options.limitPerSource || 10;

  const [openalex, crossref, semanticscholar] = await Promise.allSettled([
    searchOpenAlex(query, {
      yearFrom: options.yearFrom,
      yearTo: options.yearTo,
      openAccessOnly: options.openAccessOnly,
    }, limit),
    searchCrossref(query, {
      yearFrom: options.yearFrom,
      yearTo: options.yearTo,
    }, limit),
    searchSemanticScholar(query, {
      yearFrom: options.yearFrom,
      yearTo: options.yearTo,
      fieldsOfStudy: options.fieldsOfStudy,
    }, limit),
  ]);

  return {
    openalex: openalex.status === "fulfilled" ? openalex.value.map(openAlexToBibliography) : [],
    crossref: crossref.status === "fulfilled" ? crossref.value.map(crossrefToBibliography) : [],
    semanticscholar: semanticscholar.status === "fulfilled" ? semanticscholar.value.map(semanticScholarToBibliography) : [],
  };
}

/** ==================== User PDF Upload & Processing ==================== */

export interface ProcessedPDF {
  id: string;
  filename: string;
  pages: number;
  text: string;
  metadata: {
    title?: string;
    authors?: string[];
    year?: number;
    doi?: string;
  };
  chunks: { page: number; text: string }[];
  extractedReferences: BibliographyEntry[];
}

/** Extract text from PDF using PDF.js (client-side) */
export async function processPDFFile(file: File): Promise<ProcessedPDF> {
  // Dynamic import of pdfjs-dist
  const pdfjsLib = await import("pdfjs-dist");

  // Set worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  const chunks: { page: number; text: string }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    chunks.push({ page: i, text: pageText });
    fullText += pageText + "\n\n";
  }

  // Extract metadata from first page text
  const firstPageText = chunks[0]?.text || "";
  const metadata = extractMetadataFromText(firstPageText);

  // Extract references from text
  const extractedReferences = extractReferencesFromText(fullText);

  return {
    id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    filename: file.name,
    pages: pdf.numPages,
    text: fullText,
    metadata,
    chunks,
    extractedReferences,
  };
}

function extractMetadataFromText(text: string): { title?: string; authors?: string[]; year?: number; doi?: string } {
  const lines = text.split("\n").slice(0, 20).join("\n");
  const metadata: { title?: string; authors?: string[]; year?: number; doi?: string } = {};

  // DOI
  const doiMatch = lines.match(/10\.\d{4,}\/[-._;()/:A-Z0-9]+/i);
  if (doiMatch) metadata.doi = doiMatch[0];

  // Year
  const yearMatch = lines.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) metadata.year = parseInt(yearMatch[0], 10);

  // Title (first substantial line)
  const titleLine = lines.split("\n").find((l) => l.length > 20 && l.length < 200);
  if (titleLine) metadata.title = titleLine.trim();

  // Authors (lines with common patterns)
  const authorLines = lines.split("\n").filter((l) =>
    /^[A-Z][a-z]+ [A-Z]\.?(,? [A-Z][a-z]+ [A-Z]\.?)*$/.test(l.trim()) ||
    /^[A-Z][a-z]+, [A-Z]\./.test(l.trim())
  );
  if (authorLines.length) metadata.authors = authorLines.map((l) => l.trim());

  return metadata;
}

function extractReferencesFromText(text: string): BibliographyEntry[] {
  // Simple heuristic: look for "References" or "Bibliography" section
  const refSectionMatch = text.split(/\n\s*(References|Bibliography|Literature Cited)\s*\n/i)[1];
  if (!refSectionMatch) return [];

  const refLines = refSectionMatch.split("\n").filter((l) => l.trim().length > 20);
  const entries: BibliographyEntry[] = [];

  for (let i = 0; i < refLines.length; i++) {
    const line = refLines[i].trim();
    if (line.length < 30) continue;

    // Try to parse basic fields
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
    const titleMatch = line.match(/[.!?]\s+([A-Z][^.!?]{20,}[.!?])/);

    entries.push({
      id: `extracted-${Date.now()}-${i}`,
      title: titleMatch?.[1]?.trim() || line.slice(0, 100),
      authors: [],
      year: yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear(),
      type: "other",
      source: "user-upload",
      tags: ["extracted-from-pdf"],
      addedAt: new Date().toISOString(),
    });
  }

  return entries;
}

/** ==================== RRL Generator ==================== */

export interface RRLGenerationRequest {
  topic: string;
  subtopics: string[];
  profile: {
    title: string;
    problemStatement: string;
    objectives: { general: string; specific: string[] };
  };
  options: {
    organization: "thematic" | "chronological" | "methodological" | "geographical";
    includeGapAnalysis: boolean;
    maxSourcesPerSubtopic: number;
    yearRange: [number, number];
  };
}

export async function generateRRL(
  request: RRLGenerationRequest,
  sources: { openalex: any[]; crossref: any[]; semanticscholar: any[] }
): Promise<{
  sections: { subtopic: string; content: string; sources: any[] }[];
  gapAnalysis: string;
  synthesis: string;
}> {
  // This would be implemented with the AI provider
  // For now, return structure
  return {
    sections: request.subtopics.map((sub) => ({
      subtopic: sub,
      content: `## ${sub}\n\n[RRL content for ${sub} — generated from ${sources.openalex.length + sources.crossref.length + sources.semanticscholar.length} sources]`,
      sources: [],
    })),
    gapAnalysis: "## Gap Analysis\n\n[Identified research gaps based on literature review]",
    synthesis: "## Synthesis\n\n[Integrated synthesis of all reviewed literature]",
  };
}