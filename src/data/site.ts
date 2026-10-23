export type Category = {
  title: string;
  tagline: string;
  image: string;
};

export type Story = {
  name: string;
  role: string;
  quote: string;
  image: string;
};

export const faqCategories = ["General", "Courses", "Mentors", "Payments"] as const;

export type FaqCategory = (typeof faqCategories)[number];

export type Faq = {
  category: FaqCategory;
  question: string;
  answer: string;
};

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Mentors", href: "/mentors" },
  { label: "Stories", href: "/stories" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export const categories: Category[] = [
  { title: "Design", tagline: "UI/UX, Figma & design systems", image: "/images/cat-design.webp" },
  { title: "Web Development", tagline: "Full-stack, React & Node.js", image: "/images/cat-webdev.webp" },
  { title: "Business Consulting", tagline: "Strategy, pricing & growth", image: "/images/cat-business.webp" },
  { title: "Digital Marketing", tagline: "Social media & content", image: "/images/cat-marketing.webp" },
  { title: "Photography & Video", tagline: "Coming soon", image: "/images/cat-photo.webp" },
  { title: "Language Learning", tagline: "Spoken English & communication", image: "/images/cat-language.webp" },
];

export const stories: Story[] = [
  {
    name: "Ananya Reddy",
    role: "Junior Data Analyst",
    quote:
      "The Python course was so practical. My mentor reviewed every project and I landed my first analyst role in four months.",
    image: "/images/story-ananya.webp",
  },
  {
    name: "Rohan Gupta",
    role: "Frontend Developer",
    quote:
      "Weekly doubt sessions with Arjun sir changed everything. I finally understood how real projects are built.",
    image: "/images/story-rohan.webp",
  },
  {
    name: "Meera Joshi",
    role: "Freelance UI Designer",
    quote:
      "I built a full portfolio during the UI/UX Masterclass and got my first three freelance clients from it.",
    image: "/images/story-meera.webp",
  },
  {
    name: "Vikram Singh",
    role: "Digital Marketing Executive",
    quote:
      "Kavita ma'am teaches from real campaigns, not theory. The skills transferred straight to my job.",
    image: "/images/story-vikram.webp",
  },
];

export const faqs: Faq[] = [
  {
    category: "General",
    question: "What is Nuels?",
    answer:
      "Nuels is an online learning platform where every course is taught by an experienced mentor from that field. You learn practical, job-ready skills through recorded lessons, live sessions and real projects.",
  },
  {
    category: "General",
    question: "Do I need any prior experience before starting a course?",
    answer:
      "No. Most Nuels courses start from the basics and every course page lists its level. Your mentor will guide you step by step, and beginner-friendly tracks are clearly marked.",
  },
  {
    category: "General",
    question: "Can I learn on my phone?",
    answer:
      "Yes. Nuels works on any modern browser on your phone, tablet or laptop, so you can continue a lesson wherever you left off.",
  },
  {
    category: "Courses",
    question: "How long will I have access to a course after enrolling?",
    answer:
      "You get lifetime access to the recorded lessons and resources, including any future updates the mentor adds to the course.",
  },
  {
    category: "Courses",
    question: "Are the courses self-paced or scheduled?",
    answer:
      "Lessons are self-paced, so you can learn whenever it suits you. Live doubt sessions and project reviews run on a weekly schedule shared inside each course.",
  },
  {
    category: "Courses",
    question: "Will I work on real projects?",
    answer:
      "Yes. Every course includes hands-on assignments and at least one portfolio project, reviewed with feedback from your mentor or a teaching assistant.",
  },
  {
    category: "Mentors",
    question: "Who teaches the courses on Nuels?",
    answer:
      "Every course is taught by an experienced mentor who works in that field. Developers teach development, designers teach design and marketers teach marketing, so you learn how things are done in practice.",
  },
  {
    category: "Mentors",
    question: "Can I ask my mentor questions while learning?",
    answer:
      "Yes. Each course includes live doubt-clearing sessions and a discussion space where mentors and teaching assistants answer your questions.",
  },
  {
    category: "Mentors",
    question: "Can I get one-on-one guidance?",
    answer:
      "Many courses offer optional one-on-one mentorship slots for career advice, portfolio reviews or mock interviews. Availability is listed on each course page.",
  },
  {
    category: "Payments",
    question: "What payment methods do you accept?",
    answer:
      "You can pay with UPI, debit and credit cards, net banking and popular wallets. EMI options are available on eligible courses.",
  },
  {
    category: "Payments",
    question: "Is there a refund policy?",
    answer:
      "Yes. If a course isn't right for you, you can request a full refund within 7 days of enrolling, as long as you have completed less than 25% of it.",
  },
  {
    category: "Payments",
    question: "Do I get a certificate after completing a course?",
    answer:
      "Yes. When you finish all lessons and projects you receive a Nuels certificate of completion that you can share on LinkedIn and your resume.",
  },
];

export const contactInfo = {
  phones: [
    { display: "+91 81218 46844", href: "tel:+918121846844" },
    { display: "+91 81218 46845", href: "tel:+918121846845" },
  ],
  email: "info@nuelsmart.com",
  address: "Hyderabad, Telangana, India",
};
