export type SectionStatus = "not_started" | "in_progress" | "complete";

export interface ChapterSection {
  id: string;
  chapterId: string;
  title: string;
  /** HTML content produced by the TipTap editor. */
  content: string;
  orderIndex: number;
  status: SectionStatus;
  wordCount: number;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  number: number;
  title: string;
  orderIndex: number;
  status: SectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterVersion {
  id: string;
  sectionId: string;
  content: string;
  label: string;
  createdAt: string;
}

/**
 * Canonical capstone documentation structure.
 * Schools will be able to customize this later; for now it seeds
 * every new project with the standard five-chapter format.
 */
export const DEFAULT_CHAPTER_STRUCTURE: Array<{
  number: number;
  title: string;
  sections: string[];
}> = [
  {
    number: 1,
    title: "Introduction",
    sections: [
      "Background of the Study",
      "Statement of the Problem",
      "Objectives of the Study",
      "Scope and Limitations",
      "Significance of the Study",
    ],
  },
  {
    number: 2,
    title: "Review of Related Literature",
    sections: [
      "Related Literature",
      "Related Studies",
      "Synthesis",
      "Conceptual Framework",
    ],
  },
  {
    number: 3,
    title: "Methodology",
    sections: [
      "Research Design",
      "System Development Methodology",
      "Requirements Analysis",
      "System Architecture",
      "Development Process",
    ],
  },
  {
    number: 4,
    title: "Results and Discussion",
    sections: ["Implementation", "Testing", "Results", "Evaluation"],
  },
  {
    number: 5,
    title: "Summary, Conclusions and Recommendations",
    sections: ["Summary", "Conclusions", "Recommendations"],
  },
];

export interface ActivityEntry {
  id: string;
  userId: string;
  projectId: string | null;
  type:
    | "project_created"
    | "chapter_edited"
    | "ai_chat"
    | "review_run"
    | "profile_updated";
  description: string;
  createdAt: string;
}
