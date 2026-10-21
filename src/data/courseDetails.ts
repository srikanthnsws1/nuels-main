// Long-form content for each course page. Keep it accurate: review with the mentor
// before launch and update when the syllabus changes.

export type CourseDetail = {
  /** Search phrase the page is built around, used in the title and H1. */
  keyword: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  intro: string;
  outcomes: string[];
  modules: { title: string; topics: string[] }[];
  audience: string[];
  tools: string[];
  faqs: { question: string; answer: string }[];
};

export const courseDetails: Record<string, CourseDetail> = {
  "ui-ux-design-masterclass": {
    keyword: "UI/UX Design Course Online",
    seoTitle: "UI/UX Design Course Online with a Mentor",
    seoDescription:
      "Learn UI/UX design online from a working design lead. User research, wireframes, Figma prototyping, design systems and a mentor-reviewed portfolio case study. Beginner friendly.",
    keywords: ["UI UX design course online", "UI UX course in Hyderabad", "Figma course for beginners", "UX design course with portfolio"],
    intro:
      "This UI/UX design course takes you from your first wireframe to a portfolio-ready case study. You learn the same process product teams use: research the problem, sketch ideas, prototype in Figma and test with real users. Your mentor reviews every assignment, so you get feedback that matches what hiring managers look for.",
    outcomes: [
      "Run user interviews and turn findings into clear problem statements",
      "Create user flows, wireframes and high-fidelity screens in Figma",
      "Build clickable prototypes and run simple usability tests",
      "Use typography, colour, spacing and grids with confidence",
      "Set up a reusable design system with components and variants",
      "Present a complete UI/UX case study in your portfolio",
    ],
    modules: [
      { title: "Foundations of UX", topics: ["What UI and UX designers do", "Design thinking process", "Heuristics and usability basics"] },
      { title: "User research", topics: ["Interview planning", "Personas and journey maps", "Defining the problem"] },
      { title: "Wireframing & information architecture", topics: ["Sitemaps and user flows", "Low-fidelity wireframes", "Content hierarchy"] },
      { title: "Visual design in Figma", topics: ["Auto layout and constraints", "Typography and colour systems", "Responsive layouts"] },
      { title: "Prototyping & testing", topics: ["Interactive prototypes", "Usability testing sessions", "Iterating from feedback"] },
      { title: "Design systems & portfolio", topics: ["Components and variants", "Writing a case study", "Portfolio review with your mentor"] },
    ],
    audience: ["Complete beginners who want to start a design career", "Graphic designers moving into product design", "Developers and product managers who want stronger UX skills"],
    tools: ["Figma", "FigJam", "Maze", "Notion"],
    faqs: [
      { question: "Do I need drawing skills for this UI/UX course?", answer: "No. UI/UX design is about solving problems and organising information. You will learn layout, typography and colour step by step in Figma." },
      { question: "Will I have a portfolio at the end?", answer: "Yes. The final module is a complete case study that your mentor reviews with you before you publish it." },
    ],
  },
  "full-stack-web-development-bootcamp": {
    keyword: "Full Stack Web Development Course",
    seoTitle: "Full Stack Web Development Course Online",
    seoDescription:
      "Mentor-led full stack web development course: HTML, CSS, JavaScript, React, Node.js, databases and deployment. Build and deploy real projects with code reviews from a senior engineer.",
    keywords: ["full stack web development course", "full stack developer course in Hyderabad", "MERN stack course online", "React and Node.js course"],
    intro:
      "This full stack web development course teaches you to build complete web applications, from the page a user sees to the server and database behind it. You write real code from the first week, push it to GitHub and get line-by-line code reviews from a senior engineer who has built production software.",
    outcomes: [
      "Build responsive pages with semantic HTML, modern CSS and JavaScript",
      "Create interactive interfaces with React and component-based design",
      "Write REST APIs with Node.js and Express",
      "Model and query data with SQL and MongoDB",
      "Handle authentication, environment variables and security basics",
      "Deploy full stack projects and present them on GitHub",
    ],
    modules: [
      { title: "Web fundamentals", topics: ["HTML and accessibility", "CSS layout with Flexbox and Grid", "Responsive design"] },
      { title: "JavaScript in depth", topics: ["Functions, objects and arrays", "Async code and fetch", "Debugging in the browser"] },
      { title: "React", topics: ["Components, props and state", "Hooks and data fetching", "Routing and forms"] },
      { title: "Back end with Node.js", topics: ["Express servers and REST APIs", "Middleware and validation", "Authentication"] },
      { title: "Databases", topics: ["SQL fundamentals", "MongoDB and data modelling", "Connecting APIs to databases"] },
      { title: "Deployment & capstone", topics: ["Git workflow and GitHub", "Deploying front end and back end", "Capstone project review"] },
    ],
    audience: ["Students and graduates preparing for developer roles", "Working professionals switching to software development", "Front-end developers who want back-end skills"],
    tools: ["VS Code", "Git & GitHub", "React", "Node.js", "MongoDB", "PostgreSQL"],
    faqs: [
      { question: "Is this full stack course suitable without a computer science degree?", answer: "Yes. The course starts with web fundamentals. Some comfort with computers is enough; your mentor helps you through the harder parts in live sessions." },
      { question: "Which stack does the course use?", answer: "React on the front end and Node.js with Express on the back end, with both SQL and MongoDB databases, so you can work with the stacks most teams use." },
    ],
  },
  "python-for-data-analysis": {
    keyword: "Python for Data Analysis Course",
    seoTitle: "Python for Data Analysis Course Online",
    seoDescription:
      "Beginner-friendly Python for data analysis course with a mentor. Learn Python, pandas, NumPy and data visualisation on real business datasets and build analyst-ready projects.",
    keywords: ["Python for data analysis course", "data analytics course online", "pandas course for beginners", "data analyst course in Hyderabad"],
    intro:
      "This Python for data analysis course is built for beginners who want to work with data. You learn Python from scratch, then use pandas and NumPy to clean, analyse and visualise real business datasets. Every project is reviewed by your mentor, so you finish with work you can show in analyst interviews.",
    outcomes: [
      "Write clean Python code with variables, loops and functions",
      "Load, clean and reshape data with pandas",
      "Calculate and compare metrics with NumPy and grouping",
      "Create clear charts with Matplotlib and Seaborn",
      "Answer business questions with exploratory data analysis",
      "Present findings in a portfolio-ready notebook",
    ],
    modules: [
      { title: "Python basics", topics: ["Variables and data types", "Loops and conditions", "Functions and modules"] },
      { title: "Working with data", topics: ["Jupyter notebooks", "Reading CSV and Excel files", "Data types and missing values"] },
      { title: "pandas in depth", topics: ["Filtering and sorting", "Grouping and aggregating", "Merging datasets"] },
      { title: "NumPy & statistics", topics: ["Arrays and vectorised maths", "Descriptive statistics", "Spotting outliers"] },
      { title: "Data visualisation", topics: ["Matplotlib basics", "Seaborn charts", "Choosing the right chart"] },
      { title: "Analysis projects", topics: ["Sales data case study", "Writing up insights", "Mentor project review"] },
    ],
    audience: ["Beginners aiming for data analyst roles", "Excel users who want to automate analysis", "Students in commerce, science or engineering"],
    tools: ["Python", "Jupyter", "pandas", "NumPy", "Matplotlib", "Seaborn"],
    faqs: [
      { question: "Do I need to know programming before this data analysis course?", answer: "No. The first module teaches Python from the basics, with examples that use data from day one." },
      { question: "Will this course help me become a data analyst?", answer: "It teaches the core Python skills analysts use daily and gives you projects for your portfolio. Your mentor can also guide you on resumes and interview preparation." },
    ],
  },
  "social-media-content-marketing": {
    keyword: "Social Media & Digital Marketing Course",
    seoTitle: "Social Media & Digital Marketing Course Online",
    seoDescription:
      "Learn social media and content marketing from an experienced marketing director. Content calendars, Instagram, LinkedIn and YouTube growth, paid ads and analytics, with real campaign practice.",
    keywords: ["digital marketing course online", "social media marketing course", "digital marketing course in Hyderabad", "content marketing course"],
    intro:
      "This social media and content marketing course teaches you how brands grow online today. You plan content, write posts that people engage with, run small paid campaigns and read the numbers to improve them. Your mentor shares examples from real campaigns, not just theory.",
    outcomes: [
      "Build a content strategy and monthly content calendar",
      "Write hooks, captions and scripts for short-form video",
      "Grow audiences on Instagram, LinkedIn and YouTube",
      "Plan and run paid social campaigns on a small budget",
      "Measure results with platform analytics and simple reports",
      "Create a campaign case study for your portfolio",
    ],
    modules: [
      { title: "Marketing foundations", topics: ["Audience and positioning", "The marketing funnel", "Setting goals and KPIs"] },
      { title: "Content strategy", topics: ["Content pillars", "Content calendars", "Repurposing content"] },
      { title: "Platform playbooks", topics: ["Instagram and Reels", "LinkedIn for brands and creators", "YouTube basics"] },
      { title: "Copywriting & creatives", topics: ["Hooks and captions", "Short-form video scripts", "Design tools for marketers"] },
      { title: "Paid social", topics: ["Meta Ads Manager", "Audiences and budgets", "Testing creatives"] },
      { title: "Analytics & reporting", topics: ["Reading platform insights", "Monthly reports", "Campaign case study review"] },
    ],
    audience: ["Students starting a marketing career", "Small business owners promoting their brand", "Creators and freelancers who want more clients"],
    tools: ["Meta Business Suite", "Canva", "LinkedIn", "YouTube Studio", "Google Analytics"],
    faqs: [
      { question: "Is this digital marketing course suitable for business owners?", answer: "Yes. The content and paid social modules are practical enough to apply to your own business while you learn." },
      { question: "Does the course cover paid ads?", answer: "Yes. You learn to plan, launch and test paid social campaigns on small budgets, and how to read the results." },
    ],
  },
  "business-strategy-for-founders": {
    keyword: "Business Strategy Course for Founders",
    seoTitle: "Business Strategy Course for Founders Online",
    seoDescription:
      "Advanced business strategy course for founders and managers. Validate ideas, price products, plan go-to-market and build financial models with a management consultant.",
    keywords: ["business strategy course online", "entrepreneurship course India", "startup course for founders", "go to market strategy course"],
    intro:
      "This business strategy course is for people building or running a business. You work on your own idea or company throughout: validating demand, choosing a pricing model, planning go-to-market and building a simple financial model. Your mentor is a management consultant who challenges your assumptions the way an investor or board would.",
    outcomes: [
      "Validate a business idea with customer interviews and simple tests",
      "Analyse competitors and define a clear positioning",
      "Choose a pricing model and set prices with confidence",
      "Plan a go-to-market strategy and first sales channels",
      "Build a basic financial model and unit economics",
      "Prepare a one-page strategy and pitch narrative",
    ],
    modules: [
      { title: "Strategy foundations", topics: ["What strategy is and is not", "Business model canvas", "Choosing where to play"] },
      { title: "Customer & market", topics: ["Customer discovery interviews", "Market sizing", "Competitor analysis"] },
      { title: "Pricing", topics: ["Value-based pricing", "Pricing models", "Testing price points"] },
      { title: "Go-to-market", topics: ["Positioning and messaging", "Channels and partnerships", "Sales basics for founders"] },
      { title: "Finance for founders", topics: ["Unit economics", "Simple financial models", "Cash flow planning"] },
      { title: "Strategy review", topics: ["One-page strategy", "Pitch narrative", "Mentor strategy session"] },
    ],
    audience: ["Founders and aspiring entrepreneurs", "Managers responsible for growth", "Freelancers turning a service into a business"],
    tools: ["Google Sheets", "Business model canvas", "Notion"],
    faqs: [
      { question: "Can I use my own business idea in this course?", answer: "Yes. Every module is designed so you can apply it to your own idea or company and discuss it with your mentor." },
      { question: "Why is this course marked advanced?", answer: "It assumes you have an idea or business to work on and moves quickly through finance and pricing. Beginners are welcome but should expect to put in extra time." },
    ],
  },
  "spoken-english-communication": {
    keyword: "Spoken English Course Online",
    seoTitle: "Spoken English Course Online with Live Practice",
    seoDescription:
      "Speak English with confidence for interviews, meetings and presentations. Spoken English and communication course with live practice, pronunciation drills and personal mentor feedback.",
    keywords: ["spoken English course online", "English speaking course for professionals", "communication skills course", "spoken English classes in Hyderabad"],
    intro:
      "This spoken English course helps you speak clearly and confidently at work and in interviews. Lessons focus on real situations: introducing yourself, joining meetings, presenting ideas and handling questions. Live practice sessions and personal feedback from your mentor help you fix habits and sound natural.",
    outcomes: [
      "Introduce yourself and make small talk with confidence",
      "Improve pronunciation, stress and intonation",
      "Speak in meetings, calls and group discussions",
      "Answer interview questions clearly and concisely",
      "Structure and deliver short presentations",
      "Write clear, professional emails and messages",
    ],
    modules: [
      { title: "Speaking foundations", topics: ["Everyday conversation", "Common grammar in speech", "Building vocabulary"] },
      { title: "Pronunciation", topics: ["Sounds and word stress", "Intonation", "Speaking speed and clarity"] },
      { title: "Workplace English", topics: ["Meetings and calls", "Giving updates", "Polite disagreement"] },
      { title: "Interview English", topics: ["Tell me about yourself", "Answering with examples", "Mock interviews"] },
      { title: "Presentations", topics: ["Structuring a talk", "Using slides well", "Handling questions"] },
      { title: "Professional writing", topics: ["Emails and messages", "Clear, short sentences", "Final speaking assessment"] },
    ],
    audience: ["Students preparing for interviews", "Working professionals in client-facing roles", "Anyone who understands English but hesitates to speak"],
    tools: ["Live video sessions", "Recording practice", "Speaking worksheets"],
    faqs: [
      { question: "Is this spoken English course live or recorded?", answer: "Both. Lessons are recorded so you can learn at your own pace, and live practice sessions let you speak and get feedback from your mentor." },
      { question: "What level of English do I need?", answer: "If you can understand simple English but find it hard to speak, this course is a good fit. It starts with everyday conversation." },
    ],
  },
};
