export const SITE_URL = "https://ice.devshram.com";
export const SITE_NAME = "ICE Demo";
export const COURSE_NAME =
  "Interactive Connectivity Establishment for WebRTC";

export type PagePath =
  | "/"
  | "/algorithm"
  | "/demo"
  | "/candidates"
  | "/limitations";

const author = {
  "@type": "Person" as const,
  name: "avi892nash",
  url: "https://github.com/avi892nash",
};

const courseRef = {
  "@type": "Course" as const,
  name: COURSE_NAME,
  url: SITE_URL,
};

export function absoluteUrl(path: PagePath): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

export type LearningResourceInput = {
  path: PagePath;
  name: string;
  description: string;
  learningResourceType: string | string[];
  teaches: string[];
  timeRequired: string;
  interactivityType: "active" | "expositive" | "mixed";
  educationalLevel?: "beginner" | "intermediate" | "advanced";
};

export function buildLearningResource(input: LearningResourceInput) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    learningResourceType: input.learningResourceType,
    interactivityType: input.interactivityType,
    educationalLevel: input.educationalLevel ?? "intermediate",
    timeRequired: input.timeRequired,
    educationalUse: "self-study",
    teaches: input.teaches.map((t) => ({
      "@type": "DefinedTerm",
      name: t,
    })),
    isAccessibleForFree: true,
    inLanguage: "en",
    isPartOf: courseRef,
    author,
    publisher: author,
  };
}

export function buildBreadcrumbs(
  crumbs: { name: string; path: PagePath }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export const COURSE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: COURSE_NAME,
  description:
    "A self-paced, interactive tutorial covering how WebRTC's ICE protocol (RFC 8445) establishes peer-to-peer connections across NATs and firewalls. Includes a live two-peer demo, a candidate explorer, an animated algorithm simulator across four network topologies, and a frank look at production failure modes.",
  url: SITE_URL,
  provider: author,
  educationalLevel: "intermediate",
  educationalUse: "self-study",
  inLanguage: "en",
  isAccessibleForFree: true,
  about: [
    { "@type": "Thing", name: "WebRTC" },
    { "@type": "Thing", name: "Interactive Connectivity Establishment (ICE)" },
    { "@type": "Thing", name: "STUN" },
    { "@type": "Thing", name: "TURN" },
    { "@type": "Thing", name: "NAT traversal" },
    { "@type": "Thing", name: "Peer-to-peer networking" },
  ],
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "online",
    courseWorkload: "PT45M",
    instructor: author,
  },
  syllabusSections: [
    { "@type": "Syllabus", name: "Overview of ICE", url: SITE_URL },
    {
      "@type": "Syllabus",
      name: "Algorithm walkthrough with simulator",
      url: `${SITE_URL}/algorithm`,
    },
    {
      "@type": "Syllabus",
      name: "Live two-peer demo",
      url: `${SITE_URL}/demo`,
    },
    {
      "@type": "Syllabus",
      name: "Candidate explorer",
      url: `${SITE_URL}/candidates`,
    },
    {
      "@type": "Syllabus",
      name: "Limitations and failure modes",
      url: `${SITE_URL}/limitations`,
    },
  ],
};

export function JsonLdScript({ id, data }: { id: string; data: object }) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
