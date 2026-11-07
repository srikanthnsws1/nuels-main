/**
 * CBSE Class 10 Mathematics (Standard, Code 041), 2026-27: unit weightage, question-paper design and the
 * full syllabus of all 15 chapters (topics, theorems, competencies, expected learning outcomes).
 * The board gives marks per unit, not per chapter, so each chapter shows the marks of its unit.
 */

export type UnitWeight = { roman: string; name: string; marks: number };

export const theoryMarks = 80;

export const units: UnitWeight[] = [
  { roman: "I", name: "Number Systems", marks: 6 },
  { roman: "II", name: "Algebra", marks: 20 },
  { roman: "III", name: "Coordinate Geometry", marks: 6 },
  { roman: "IV", name: "Geometry", marks: 15 },
  { roman: "V", name: "Trigonometry", marks: 12 },
  { roman: "VI", name: "Mensuration", marks: 10 },
  { roman: "VII", name: "Statistics and Probability", marks: 11 },
];

/** Units carrying the most marks (Algebra, Geometry, Trigonometry): highlighted for learners. */
export const highWeightage = new Set(
  [...units].sort((a, b) => b.marks - a.marks).slice(0, 3).map((u) => u.roman),
);

/** "18.75%" / "25%" */
export const percentOf = (marks: number) => `${Math.round((marks / theoryMarks) * 10000) / 100}%`;

/** The unit for a chapter's `unit` label, e.g. "Unit II: Algebra". */
export function unitFor(label: string | undefined): UnitWeight | undefined {
  const roman = label?.match(/^Unit\s+([IVX]+)\b/i)?.[1]?.toUpperCase();
  return units.find((u) => u.roman === roman);
}

export const paperDesign = {
  time: "3 hours",
  rows: [
    {
      type: "Remembering & Understanding",
      detail: "Recall facts, terms, basic concepts and answers; organise, compare, interpret and describe ideas.",
      marks: 43,
      percent: 54,
    },
    { type: "Applying", detail: "Solve problems in new situations using acquired knowledge, facts, techniques and rules.", marks: 19, percent: 24 },
    {
      type: "Analysing, Evaluating & Creating",
      detail: "Break information into parts, make and defend judgements, and combine ideas in new ways.",
      marks: 18,
      percent: 22,
    },
  ],
  internal: [
    { item: "Pen-paper tests and multiple assessment (5 + 5)", marks: 10 },
    { item: "Portfolio", marks: 5 },
    { item: "Lab practical (activities from the prescribed books)", marks: 5 },
  ],
};

/** A syllabus line, optionally with sub-points (e.g. the methods a topic covers). */
export type Point = string | { text: string; sub: string[] };

export type ChapterSyllabus = {
  /** Heading over the topics, when the syllabus gives one (e.g. Circles). */
  topicsHeading?: string;
  topics: Point[];
  theorems?: { label: string; text: string }[];
  competencies: string[];
  outcomes: Point[];
};

/** Full syllabus per chapter, keyed by catalog slug (slugs are fixed; chapter numbers live in the catalog). */
export const chapterSyllabus: Record<string, ChapterSyllabus> = {
  "class-10-maths-01-real-numbers": {
    topics: [
      { text: "Fundamental Theorem of Arithmetic:", sub: ["Statements after reviewing earlier work.", "Motivation through examples."] },
      { text: "Proofs of irrationality of:", sub: ["√2", "√3", "√5"] },
    ],
    competencies: [
      "Develops understanding of numbers, including real numbers and their properties.",
      "Extends understanding of powers (radical powers) and exponents.",
      "Applies the Fundamental Theorem of Arithmetic to solve real-life problems.",
    ],
    outcomes: [
      "Describes the Fundamental Theorem of Arithmetic with examples.",
      "Proves algebraically the irrationality of numbers such as √2, √3, √5, 3 + 2√5, etc.",
    ],
  },
  "class-10-maths-02-polynomials": {
    topics: ["Zeroes of a polynomial.", "Relationship between zeroes and coefficients of quadratic polynomials."],
    competencies: ["Develops a relationship between algebraic and graphical methods of finding the zeroes of a polynomial."],
    outcomes: [
      "Finds the zeroes of a polynomial graphically and algebraically.",
      "Verifies the relationship between zeroes and coefficients of quadratic polynomials.",
    ],
  },
  "class-10-maths-03-linear-equations": {
    topics: [
      "Pair of linear equations in two variables and graphical method of their solution.",
      "Consistency and inconsistency.",
      "Algebraic conditions for the number of solutions.",
      { text: "Solution of a pair of linear equations in two variables algebraically:", sub: ["Substitution method.", "Elimination method."] },
      "Simple situational problems.",
    ],
    competencies: [
      "Describes plotting a pair of linear equations and graphically finding the solution.",
      "Models and solves contextualised problems using simultaneous linear equations in two variables.",
    ],
    outcomes: ["Finds solutions graphically.", "Solves pairs of linear equations algebraically using substitution and elimination methods."],
  },
  "class-10-maths-04-quadratic-equations": {
    topics: [
      "Standard form of a quadratic equation: ax² + bx + c = 0, a ≠ 0",
      { text: "Solutions of quadratic equations (only real roots) by:", sub: ["Factorization method.", "Quadratic formula."] },
      "Relationship between discriminant and nature of roots.",
      "Situational problems based on quadratic equations related to day-to-day activities.",
    ],
    competencies: ["Demonstrates strategies for finding roots and determining the nature of roots of a quadratic equation."],
    outcomes: [
      "Solves quadratic equations using factorization and the quadratic formula.",
      "Determines the nature of roots using the discriminant.",
      "Formulates and solves problems based on real-life contexts.",
    ],
  },
  "class-10-maths-05-arithmetic-progressions": {
    topics: [
      "Motivation for studying Arithmetic Progression.",
      "Derivation of the nth term and sum of the first n terms of an AP.",
      "Application in solving daily-life problems.",
    ],
    competencies: ["Develops strategies to apply the concept of AP to daily-life situations."],
    outcomes: ["Applies the concept of AP to find the nth term and sum of n terms.", "Solves applications of AP in real-life problems."],
  },
  "class-10-maths-06-coordinate-geometry": {
    topics: [
      "Review of concepts of coordinate geometry.",
      "Distance formula.",
      "Section formula (internal division).",
      "Geometrical relations in the coordinate plane.",
      "Finding the distance between two given points.",
      "Determining the coordinates of a point between any two given points.",
    ],
    competencies: [
      "Derives formulae to establish geometrical relations in the context of a coordinate plane.",
      "Uses the distance between two given points and coordinates of a point between two points.",
    ],
    outcomes: ["Solves problems using the distance formula and section formula."],
  },
  "class-10-maths-07-triangles": {
    topics: ["Definitions and examples of similar triangles.", "Counterexamples of similar triangles.", "Basic Proportionality Theorem (BPT)."],
    theorems: [
      {
        label: "Basic Proportionality Theorem (Prove)",
        text: "If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, the other two sides are divided in the same ratio.",
      },
      {
        label: "Converse of BPT (Statement without proof)",
        text: "If a line divides two sides of a triangle in the same ratio, the line is parallel to the third side.",
      },
      {
        label: "Similarity Criterion (Statement without proof)",
        text: "If in two triangles, the corresponding angles are equal, their corresponding sides are proportional and the triangles are similar.",
      },
      {
        label: "Similarity Criterion (Statement without proof)",
        text: "If the corresponding sides of two triangles are proportional, their corresponding angles are equal and the two triangles are similar.",
      },
      {
        label: "Similarity Criterion (Statement without proof)",
        text: "If one angle of a triangle is equal to one angle of another triangle and the sides including these angles are proportional, the two triangles are similar.",
      },
    ],
    competencies: [
      "Differentiates between congruent and similar figures.",
      "Establishes properties for the similarity of two triangles using geometrical criteria such as the Basic Proportionality Theorem.",
    ],
    outcomes: [
      "Proves the Basic Proportionality Theorem and applies it and its converse in solving questions.",
      "Proves similarity of triangles using different similarity criteria.",
    ],
  },
  "class-10-maths-08-circles": {
    topicsHeading: "Tangent to a Circle at a Point of Contact",
    topics: [],
    theorems: [
      { label: "Theorem (Prove)", text: "The tangent at any point of a circle is perpendicular to the radius through the point of contact." },
      { label: "Theorem (Prove)", text: "The lengths of tangents drawn from an external point to a circle are equal." },
    ],
    competencies: ["Derives proofs of theorems related to tangents of circles."],
    outcomes: ["Proves the theorems based on tangents to a circle.", "Applies the concept of tangents to circles to solve various problems."],
  },
  "class-10-maths-09-introduction-to-trigonometry": {
    topics: [
      "Trigonometric ratios of an acute angle of a right-angled triangle.",
      "Proof of their existence (well-defined).",
      "Motivation of ratios whenever angles are defined at 0° and 90°.",
      "Values of trigonometric ratios of 30°, 45° and 60°.",
      "Relationships between the ratios.",
    ],
    competencies: ["Understands the definitions of the basic trigonometric functions, including the introduction of sine and cosine functions."],
    outcomes: ["Evaluates trigonometric ratios.", "Describes trigonometric ratios of standard angles and solves related expressions."],
  },
  "class-10-maths-trigonometric-identities": {
    topics: ["Proof and applications of the identity: sin²A + cos²A = 1", "Only simple identities are to be given."],
    competencies: ["Uses trigonometric identities to solve problems."],
    outcomes: ["Proves trigonometric identities using sin²A + cos²A = 1 and other identities."],
  },
  "class-10-maths-10-heights-and-distances": {
    topics: [
      "Angle of Elevation.",
      "Angle of Depression.",
      "Simple problems on heights and distances.",
      "Problems should not involve more than two right triangles.",
      "Angles of elevation and depression should only be 30°, 45° and 60°.",
    ],
    competencies: [
      "Applies trigonometric ratios in daily-life situations, such as finding the heights of different structures or distances from them.",
    ],
    outcomes: ["Finds heights and distances in real-life word problems using trigonometric ratios."],
  },
  "class-10-maths-11-areas-related-to-circles": {
    topics: [
      "Area of sectors and segments of a circle.",
      "Problems based on areas and perimeter/circumference of the above-mentioned plane figures.",
      "In calculating the area of a segment of a circle, problems should be restricted to central angles of 60°, 90° and 120° only.",
    ],
    competencies: ["Derives and uses formulae to calculate areas of plane figures."],
    outcomes: ["Visualises and evaluates areas of sectors and segments of a circle."],
  },
  "class-10-maths-12-surface-areas-and-volumes": {
    topics: [
      {
        text: "Surface areas and volumes of combinations of any two of the following:",
        sub: ["Cubes", "Cuboids", "Spheres", "Hemispheres", "Right circular cylinders", "Cones"],
      },
    ],
    competencies: ["Visualises and uses mathematical thinking to discover formulae to calculate surface areas and volumes of solid objects and their combinations."],
    outcomes: ["Evaluates the surface areas and volumes of combinations of solids by visualisation."],
  },
  "class-10-maths-13-statistics": {
    topics: ["Mean, median and mode of grouped data.", "Bimodal situations are to be avoided."],
    competencies: ["Calculates mean, median and mode for different sets of data related to real-life contexts."],
    outcomes: [
      { text: "Computes the mean of a grouped frequency distribution using:", sub: ["Direct method.", "Assumed mean method.", "Step deviation method."] },
      "Computes the median and mode of grouped frequency distribution by algebraic method.",
    ],
  },
  "class-10-maths-14-probability": {
    topics: ["Classical definition of probability.", "Simple problems on finding the probability of an event."],
    competencies: ["Applies concepts from probability to solve problems on the likelihood of everyday events."],
    outcomes: ["Determines probabilities in simple real-life problems."],
  },
};
