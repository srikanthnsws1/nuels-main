/**
 * CBSE Class 10 Mathematics (Standard, Code 041), 2026-27: unit weightage, question-paper design and the
 * full chapter-wise syllabus (content, competencies, explanation), as printed in the board syllabus.
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

export type ChapterSyllabus = {
  content: { heading?: string; points: string[] }[];
  competencies: string[];
  explanation: string[];
};

export const chapterSyllabus: Record<string, ChapterSyllabus> = {
  "class-10-maths-01-real-numbers": {
    content: [
      {
        points: [
          "Fundamental Theorem of Arithmetic: statements after reviewing work done earlier and after illustrating and motivating through examples.",
          "Proofs of irrationality of √2, √3, √5.",
        ],
      },
    ],
    competencies: [
      "Develops understanding of numbers, including the set of real numbers and its properties.",
      "Extends the understanding of powers (radical powers) and exponents.",
      "Applies the Fundamental Theorem of Arithmetic to solve problems related to real-life contexts.",
    ],
    explanation: [
      "Describes the Fundamental Theorem of Arithmetic with examples.",
      "Proves algebraically the irrationality of numbers like √2, √3, √5, 3 + 2√5, etc.",
    ],
  },
  "class-10-maths-02-polynomials": {
    content: [{ points: ["Zeroes of a polynomial.", "Relationship between zeroes and coefficients of quadratic polynomials."] }],
    competencies: ["Develops a relationship between algebraic and graphical methods of finding the zeroes of a polynomial."],
    explanation: [
      "Finds the zeroes of a polynomial graphically and algebraically, and verifies the relation between zeroes and coefficients of quadratic polynomials.",
    ],
  },
  "class-10-maths-03-linear-equations": {
    content: [
      {
        points: [
          "Pair of linear equations in two variables and the graphical method of their solution, consistency / inconsistency.",
          "Algebraic conditions for the number of solutions.",
          "Solution of a pair of linear equations in two variables algebraically: by substitution and by elimination. Simple situational problems.",
        ],
      },
    ],
    competencies: [
      "Describes plotting a pair of linear equations and graphically finding the solution.",
      "Models and solves contextualised problems using equations (e.g. simultaneous linear equations in two variables).",
    ],
    explanation: ["Finds the solution of a pair of linear equations in two variables graphically and algebraically (substitution and elimination methods)."],
  },
  "class-10-maths-04-quadratic-equations": {
    content: [
      {
        points: [
          "Standard form of a quadratic equation ax² + bx + c = 0 (a ≠ 0).",
          "Solutions of quadratic equations (only real roots) by factorisation and by using the quadratic formula. Relationship between the discriminant and the nature of roots.",
          "Situational problems based on quadratic equations related to day-to-day activities.",
        ],
      },
    ],
    competencies: ["Demonstrates strategies for finding roots and determining the nature of roots of a quadratic equation."],
    explanation: [
      "Solves quadratic equations using factorisation and the quadratic formula.",
      "Determines the nature of roots using the discriminant.",
      "Formulates and solves problems based on real-life contexts.",
    ],
  },
  "class-10-maths-05-arithmetic-progressions": {
    content: [
      {
        points: [
          "Motivation for studying Arithmetic Progressions.",
          "Derivation of the nth term and the sum of the first n terms of an AP, and their application in solving daily-life problems.",
        ],
      },
    ],
    competencies: ["Develops strategies to apply the concept of AP to daily-life situations."],
    explanation: ["Applies concepts of AP to find the nth term and the sum of n terms.", "Applies AP to real-life problems."],
  },
  "class-10-maths-06-coordinate-geometry": {
    content: [{ points: ["Review of the concepts of coordinate geometry.", "Distance formula.", "Section formula (internal division)."] }],
    competencies: [
      "Derives formulae to establish relations for geometrical shapes in the coordinate plane, such as the distance between two given points and the coordinates of a point between any two given points.",
    ],
    explanation: ["Solves problems using the distance formula and the section formula."],
  },
  "class-10-maths-07-triangles": {
    content: [
      {
        points: [
          "Definitions, examples and counter-examples of similar triangles.",
          "(Prove) If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, the other two sides are divided in the same ratio.",
          "(State without proof) If a line divides two sides of a triangle in the same ratio, the line is parallel to the third side.",
          "(State without proof) If in two triangles the corresponding angles are equal, their corresponding sides are proportional and the triangles are similar.",
          "(State without proof) If the corresponding sides of two triangles are proportional, their corresponding angles are equal and the two triangles are similar.",
          "(State without proof) If one angle of a triangle is equal to one angle of another triangle and the sides including these angles are proportional, the two triangles are similar.",
        ],
      },
    ],
    competencies: [
      "Works out ways to differentiate between congruent and similar figures.",
      "Establishes properties for the similarity of two triangles logically, using geometric criteria established earlier such as the Basic Proportionality Theorem.",
    ],
    explanation: [
      "Proves the Basic Proportionality Theorem and applies the theorem and its converse in solving questions.",
      "Proves the similarity of triangles using different similarity criteria.",
    ],
  },
  "class-10-maths-08-circles": {
    content: [
      {
        heading: "Tangent to a circle at the point of contact",
        points: [
          "(Prove) The tangent at any point of a circle is perpendicular to the radius through the point of contact.",
          "(Prove) The lengths of tangents drawn from an external point to a circle are equal.",
        ],
      },
    ],
    competencies: ["Derives proofs of theorems related to the tangents of circles."],
    explanation: ["Proves the theorems based on the tangent to a circle.", "Applies the concept of tangents of a circle to solve various problems."],
  },
  "class-10-maths-09-introduction-to-trigonometry": {
    content: [
      {
        heading: "Introduction to trigonometry",
        points: [
          "Trigonometric ratios of an acute angle of a right-angled triangle. Proof of their existence (well defined).",
          "Motivate the ratios which are defined at 0° and 90°. Values of the trigonometric ratios of 30°, 45° and 60°.",
          "Relationships between the ratios.",
        ],
      },
      {
        heading: "Trigonometric identities",
        points: ["Proof and applications of the identity sin²A + cos²A = 1.", "Only simple identities to be given."],
      },
    ],
    competencies: [
      "Understands the definitions of the basic trigonometric functions (including the introduction of the sine and cosine functions).",
      "Uses trigonometric identities to solve problems.",
    ],
    explanation: [
      "Evaluates trigonometric ratios.",
      "Describes the trigonometric ratios of standard angles and solves related expressions.",
      "Proves trigonometric identities using sin²A + cos²A = 1 and other identities.",
    ],
  },
  "class-10-maths-10-heights-and-distances": {
    content: [
      {
        heading: "Heights and distances: angle of elevation, angle of depression",
        points: [
          "Simple problems on heights and distances.",
          "Problems should not involve more than two right triangles.",
          "Angles of elevation / depression should be only 30°, 45° and 60°.",
        ],
      },
    ],
    competencies: [
      "Applies trigonometric ratios to solve problems in daily-life contexts, like finding the heights of different structures or the distance from them.",
    ],
    explanation: ["Finds heights and distances in real-life word problems using trigonometric ratios."],
  },
  "class-10-maths-11-areas-related-to-circles": {
    content: [
      {
        points: [
          "Area of sectors and segments of a circle.",
          "Problems based on the areas and perimeter / circumference of these plane figures. (For the area of a segment, problems are restricted to central angles of 60°, 90° and 120° only.)",
        ],
      },
    ],
    competencies: ["Derives and uses formulae to calculate areas of plane figures."],
    explanation: ["Visualises and evaluates the areas of a sector and a segment of a circle."],
  },
  "class-10-maths-12-surface-areas-and-volumes": {
    content: [
      {
        points: [
          "Surface areas and volumes of combinations of any two of the following: cubes, cuboids, spheres, hemispheres and right circular cylinders / cones.",
        ],
      },
    ],
    competencies: [
      "Visualises and uses mathematical thinking to discover formulae for the surface areas and volumes of solid objects (cubes, cuboids, spheres, hemispheres, right circular cylinders / cones, and their combinations).",
    ],
    explanation: ["Evaluates the surface areas and volumes of combinations of solids by visualisation."],
  },
  "class-10-maths-13-statistics": {
    content: [{ points: ["Mean, median and mode of grouped data (bimodal situations to be avoided)."] }],
    competencies: ["Calculates the mean, median and mode for different sets of data related to real-life contexts."],
    explanation: [
      "Computes the mean of a grouped frequency distribution using the direct, assumed-mean and step-deviation methods.",
      "Computes the median and mode of a grouped frequency distribution by the algebraic method.",
    ],
  },
  "class-10-maths-14-probability": {
    content: [{ points: ["Classical definition of probability.", "Simple problems on finding the probability of an event."] }],
    competencies: ["Applies concepts from probability to solve problems on the likelihood of everyday events."],
    explanation: ["Determines probabilities in simple real-life problems."],
  },
};
