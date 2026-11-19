(function () {
  const DATA = window.N5_HUB_DATA;
  const STORAGE_KEY = "n5_bus_hub_state_v5";

  // Client-side Synonym & SQA Auto-Marking Engine (instant fallback & identical to server)
  const SYNONYM_GROUPS = [
    ["profit", "surplus", "earnings", "net income", "return"],
    ["sales", "revenue", "turnover", "takings", "income", "custom"],
    ["customers", "consumers", "buyers", "clients", "shoppers", "target market"],
    ["employees", "staff", "workers", "workforce", "personnel", "labour"],
    ["costs", "expenses", "outflows", "spending", "expenditure", "overheads"],
    ["reputation", "brand image", "public image", "goodwill", "prestigious"],
    ["motivate", "motivated", "motivation", "morale", "job satisfaction", "happier", "valued"],
    ["productivity", "output", "efficiency", "efficient", "produce more", "work faster"],
    ["turnover", "retention", "absenteeism", "leaving", "stay with the business", "loyal"],
    ["quality", "standard", "defect", "fault", "error", "mistake", "waste", "scrap"],
    ["loan", "bank loan", "borrowing", "lender", "installments", "instalments"],
    ["overdraft", "bank overdraft", "short term deficit"],
    ["grant", "government grant", "funding"],
    ["shareholders", "investors", "shares", "dividends", "limited liability"],
    ["unlimited liability", "personal assets", "lose personal possessions", "sole trader"],
    ["questionnaire", "survey", "poll", "online survey"],
    ["focus group", "consumer panel", "group interview"],
    ["overstocking", "too much stock", "too much inventory", "storage costs", "obsolete", "deteriorate", "perish"],
    ["understocking", "too little stock", "run out of stock", "stockout", "halted production"],
    ["just in time", "jit", "ordered as needed", "no buffer stock"],
    ["job production", "one-off", "custom", "bespoke", "unique", "tailor-made"],
    ["batch production", "groups", "batches", "similar items"],
    ["flow production", "mass production", "continuous", "assembly line", "conveyor"],
    ["skimming", "price skimming", "high initial price", "early adopters"],
    ["penetration", "market penetration", "low initial price", "attract customers away"],
    ["spreadsheet", "excel", "formula", "formulae", "=sum", "=average", "=if", "what-if"],
    ["land", "natural resources", "raw materials", "earth", "farmland", "oil", "coal", "timber", "water"],
    ["capital", "machinery", "equipment", "buildings", "premises", "finance", "tools", "vehicles"],
    ["enterprise", "entrepreneur", "business idea", "risk taker", "combines factors"],
    ["primary sector", "extracting", "harvesting", "farming", "fishing", "mining", "forestry"],
    ["secondary sector", "manufacturing", "construction", "making goods", "factory", "processing"],
    ["tertiary sector", "services", "retail", "banking", "transport", "hospitality", "shops"],
    ["private sector", "private individuals", "shareholders", "make a profit", "profit maximisation"],
    ["public sector", "government", "taxpayers", "taxation", "council", "nhs", "state"],
    ["third sector", "charity", "charities", "voluntary", "social enterprise", "donations", "non-profit"],
    ["mortgage", "long term loan", "secured against property", "buy property", "buy buildings", "premises"],
    ["retained profit", "retained profits", "saved profit", "ploughed back", "reinvested profit"],
    ["hire purchase", "hp", "deposit and instalments", "monthly instalments"],
    ["leasing", "renting equipment", "renting vehicles", "lease"],
    ["trade credit", "buy now pay later", "30 days", "pay suppliers later"],
    ["venture capital", "business angel", "dragon", "equity finance", "crowdfunding"],
    ["primary research", "field research", "first hand", "new data", "questionnaire", "survey", "interview", "observation"],
    ["secondary research", "desk research", "already exists", "existing data", "internet", "government statistics", "competitor websites"],
    ["teleworking", "homeworking", "working from home", "remote working", "wfh"],
    ["flexitime", "flexible hours", "core hours", "flexible working", "job share", "compressed hours", "zero hours"],
    ["tqm", "total quality management", "quality assurance", "quality control", "quality circles", "mystery shopper", "benchmarking"],
    ["epos", "barcodes", "till", "electronic point of sale", "stock levels", "inventory"],
    ["cad", "cam", "computer aided design", "computer aided manufacture", "automation", "robotics"],
    ["competitors", "rivals", "competition", "other businesses", "market share"],
    ["legislation", "law", "equality act", "health and safety", "minimum wage", "national living wage", "gdpr", "data protection"]
  ];

  function normalizeText(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/[£$,.%()•\-–—/\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getStems(text) {
    const stopWords = new Set([
      "the", "and", "for", "that", "this", "with", "from", "are", "was", "were",
      "will", "would", "could", "should", "can", "may", "might", "have", "has",
      "had", "not", "but", "such", "into", "their", "they", "them", "there",
      "which", "when", "where", "what", "who", "how", "why", "more", "less",
      "than", "also", "very", "some", "any", "each", "other", "about", "over",
      "under", "between", "through", "during", "before", "after", "above", "below",
      "business", "organisation", "organization", "company", "firm", "use", "used",
      "using", "make", "makes", "making", "help", "helps", "way", "ways", "point"
    ]);
    return normalizeText(text)
      .split(" ")
      .filter(w => w.length >= 3 && !stopWords.has(w))
      .map(w => w.replace(/(ing|ed|es|s|tion|ment|ity|ly)$/, ""));
  }

  function expandWithSynonyms(normText) {
    let expanded = normText;
    for (const group of SYNONYM_GROUPS) {
      if (group.some(term => normText.includes(term))) {
        expanded += " " + group.join(" ");
      }
    }
    return expanded;
  }

  function markSqaClient(question, rawAnswer) {
    const answer = String(rawAnswer || "").trim();
    const normAnswer = normalizeText(answer);
    const expandedAnswer = expandWithSynonyms(normAnswer);
    const answerStems = new Set(getStems(expandedAnswer));

    const maxMarks = Number(question.marks) || 1;
    const accepted = question.acceptedPoints || [];
    const primaryCmd = (question.primaryCommand || "describe").toLowerCase();

    const awardedPoints = [];
    const missingPoints = [];

    for (const pt of accepted) {
      const normPt = normalizeText(pt);
      const ptStems = getStems(normPt);
      const numbersInPt = pt.match(/\d[\d,.]*/g) || [];
      const formulaInPt = pt.match(/=[a-z]+/gi) || [];

      let matched = false;
      if (formulaInPt.length > 0) {
        matched = formulaInPt.some(f => normAnswer.includes(f.toLowerCase().replace("=", "")));
      } else if (numbersInPt.length > 0 && primaryCmd.includes("calculate")) {
        const cleanNums = numbersInPt.map(n => n.replace(/,/g, ""));
        matched = cleanNums.every(n => answer.replace(/,/g, "").includes(n));
      } else if (ptStems.length > 0) {
        const ansWords = expandedAnswer.split(/\s+/).filter(Boolean);
        const matchesStem = (stem) => {
          if (answerStems.has(stem) || expandedAnswer.includes(stem)) return true;
          // SQA spelling tolerance: match first 5 characters for words >= 6 chars (e.g. "entrepruner" -> "entrepreneur")
          if (stem.length >= 5) {
            const pref = stem.slice(0, 5);
            if (ansWords.some(w => w.length >= 5 && w.startsWith(pref))) return true;
          }
          return false;
        };
        const hitCount = ptStems.filter(matchesStem).length;
        const dashParts = pt.split(/—| - |:/);
        let keyTermMatched = false;
        if (dashParts.length >= 2) {
          const termStems = getStems(normalizeText(dashParts[0]));
          if (termStems.length > 0 && termStems.every(matchesStem)) {
            keyTermMatched = primaryCmd.includes("identify") || hitCount >= Math.min(2, ptStems.length);
          }
        }
        // Fair SQA threshold: 1 stem for short points (<=2 stems), 2 stems for full descriptive/explain points
        const threshold = ptStems.length <= 2 ? 1 : 2;
        matched = keyTermMatched || hitCount >= threshold;
      }

      if (matched) {
        awardedPoints.push(pt);
      } else {
        missingPoints.push(pt);
      }
    }

    let commandPassed = true;
    let commandAdvice = "";
    const wordCount = normAnswer.split(" ").filter(Boolean).length;
    const hasExplainConnectors = /\b(which means|meaning that|leads to|leading to|so that|therefore|as a result|resulting in|because|consequently|allows the|enables the|reduces|increases|improves|prevents|saves)\b/i.test(answer);
    const hasCompareConnectors = /\b(whereas|while|whilst|compared to|on the other hand|unlike|however|both|similarly|in contrast)\b/i.test(answer);

    if (primaryCmd.includes("explain")) {
      if (!hasExplainConnectors && wordCount < 14) {
        commandPassed = false;
        commandAdvice = "Command Word Check (EXPLAIN): You identified a relevant point, but SQA 'Explain' questions require you to link the point to its consequence/impact on the business using a connector like 'which means that…', 'leading to…', or 'therefore…'.";
      } else {
        commandAdvice = "Command Word Check (EXPLAIN): Good job linking your points to a business impact/consequence!";
      }
    } else if (primaryCmd.includes("compare") || primaryCmd.includes("distinguish")) {
      if (!hasCompareConnectors) {
        commandPassed = false;
        commandAdvice = "Command Word Check (COMPARE): Use comparative words like 'whereas' or 'on the other hand' for differences, and 'both' for similarities in the same sentence.";
      } else {
        commandAdvice = "Command Word Check (COMPARE): Great use of comparative language ('whereas' / 'both')!";
      }
    } else if (primaryCmd.includes("describe") || primaryCmd.includes("outline")) {
      if (wordCount < 5 * Math.min(maxMarks, Math.max(1, awardedPoints.length))) {
        commandPassed = false;
        commandAdvice = "Command Word Check (DESCRIBE): Avoid writing 1-word labels. Write a full sentence stating what each point is and how it works.";
      } else {
        commandAdvice = "Command Word Check (DESCRIBE): Good descriptive detail provided.";
      }
    } else if (primaryCmd.includes("+")) {
      const parts = primaryCmd.split("+").map(s => s.trim());
      if (wordCount < 10) {
        commandPassed = false;
        commandAdvice = `Command Word Check (${parts.join(" & ").toUpperCase()}): Remember this is a two-part command question! Clearly label both '${parts[0]}' and '${parts[1]}' so you earn marks for both parts.`;
      } else {
        commandAdvice = `Command Word Check (${parts.join(" & ").toUpperCase()}): Good effort addressing both parts of the question.`;
      }
    } else {
      commandAdvice = `Command Word Check (${primaryCmd.toUpperCase()}): Direct, distinct points credited in line with SQA marking instructions.`;
    }

    let marks = Math.min(maxMarks, awardedPoints.length);
    if (marks > 0 && !commandPassed && (primaryCmd === "explain" || primaryCmd === "compare") && wordCount < 8) {
      marks = Math.max(0, marks - 1);
    }

    const percentage = Math.round((marks / maxMarks) * 100);
    const improvements = [];
    if (!commandPassed && commandAdvice) {
      improvements.push(commandAdvice);
    }
    for (const mp of missingPoints.slice(0, Math.max(1, maxMarks - marks + 1))) {
      improvements.push(`Include: ${mp}`);
    }

    let feedback = "";
    if (marks === maxMarks) {
      feedback = `Full marks (${marks}/${maxMarks})! Your answer matches the SQA marking instructions and applies the '${primaryCmd.toUpperCase()}' command word effectively.`;
    } else if (marks > 0) {
      feedback = `You scored ${marks} out of ${maxMarks} (${percentage}%). ${commandAdvice} Review the missing marking points below to reach full marks.`;
    } else {
      feedback = `0 out of ${maxMarks} awarded. ${commandAdvice} Compare your response with the accepted SQA marking points and model answer below.`;
    }

    return {
      marks,
      maxMarks,
      marksAvailable: maxMarks,
      percentage,
      awardedPoints,
      improvements,
      commandPassed,
      commandAdvice,
      feedback,
      provisional: false,
      modelAnswer: question.solution || (accepted.map(p => `• ${p} (1)`).join("\n"))
    };
  }

  function loadLocalState() {
    const init = DATA.initialDb || {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.pupils && parsed.pupils.length >= 40) {
          // Automatically upgrade any legacy synthetic placeholder homework or practice records
          const hasLegacyHw = (parsed.homeworkSubmissions || []).some(
            s => String(s.id || "").startsWith("hist-hw-") || String(s.answer || "").startsWith("Submitted homework answer")
          );
          if (hasLegacyHw || !(parsed.homeworkSubmissions || []).length) {
            const customHw = (parsed.homeworkSubmissions || []).filter(
              s => !String(s.id || "").startsWith("hist-hw-") && !String(s.answer || "").startsWith("Submitted homework answer")
            );
            parsed.homeworkSubmissions = [...(init.homeworkSubmissions || []), ...customHw];
          }

          const hasLegacyAtt = (parsed.attempts || []).some(
            a => String(a.id || "").startsWith("hist-att-") || String(a.answer || "").startsWith("Saved historical attempt")
          );
          if (hasLegacyAtt || !(parsed.attempts || []).length) {
            const customAtt = (parsed.attempts || []).filter(
              a => !String(a.id || "").startsWith("hist-att-") && !String(a.answer || "").startsWith("Saved historical attempt")
            );
            parsed.attempts = [...customAtt, ...(init.attempts || [])];
          }
          return parsed;
        }
      }
    } catch {}
    return {
      user: null,
      classes: init.classes || [
        { id: "cls-4gbm", name: "4GBM", code: "4GBM" },
        { id: "cls-4cbm", name: "4CBM", code: "4CBM" },
        { id: "cls-4fbm", name: "4FBM", code: "4FBM" },
        { id: "cls-4e", name: "4E", code: "ABCD" }
      ],
      teachers: init.teachers || [
        { id: "teacher-mrs-straub", name: "Mrs Straub", pin: "2026", isOwner: true, assignedClasses: ["ALL"] },
        { id: "teacher-lee-morgan", name: "Lee Morgan", pin: "4C2026", isOwner: false, assignedClasses: ["4CBM", "4CBM3"] },
        { id: "teacher-craig-stephenson", name: "Craig Stephenson", pin: "CS2026", isOwner: false, assignedClasses: ["ABCD"] },
        { id: "teacher-rebecca", name: "Rebecca", pin: "RB2026", isOwner: false, assignedClasses: [] }
      ],
      pupils: init.pupils || [],
      attempts: init.attempts || [],
      caseAttempts: init.caseAttempts || [],
      homeworkSubmissions: init.homeworkSubmissions || [],
      trackingRecords: init.trackingRecords || {},
      reviseTerms: [],
      masteredTerms: [],
      assignmentChecklist: {},
      streakData: { days: 1, lastDate: new Date().toISOString().slice(0, 10) },
      cloudSyncUrl: "",
      customVideos: {}
    };
  }

  function saveLocalState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: state.user,
        classes: state.classes,
        teachers: state.teachers,
        pupils: state.pupils,
        attempts: state.attempts,
        caseAttempts: state.caseAttempts,
        homeworkSubmissions: state.homeworkSubmissions,
        trackingRecords: state.trackingRecords || {},
        reviseTerms: state.reviseTerms,
        masteredTerms: state.masteredTerms || [],
        assignmentChecklist: state.assignmentChecklist || {},
        streakData: state.streakData || { days: 1, lastDate: new Date().toISOString().slice(0, 10) },
        cloudSyncUrl: state.cloudSyncUrl || "",
        customVideos: state.customVideos,
        rememberedPupil: state.rememberedPupil
      }));
    } catch {}
  }

  let deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  const saved = loadLocalState();

  const isStandaloneApp = Boolean(
    window.navigator?.standalone || window.matchMedia?.("(display-mode: standalone)")?.matches
  );

  const isTeacherUrl = new URLSearchParams(window.location.search).has("teacher");

  // Clear any legacy cached teacher login (e.g. Mrs Martin) that did not unlock with the new Teacher PIN,
  // and if the user is opening the pupil link (without ?teacher=1), never auto-open the Teacher session!
  if (saved.user?.role === "admin") {
    if (!saved.user.pinVerified || !isTeacherUrl) {
      saved.user = null;
    } else if (saved.user.name?.includes("Martin")) {
      saved.user.name = "Mrs Straub (Business Teacher)";
    }
  }

  function isTeacherUser(u) {
    return Boolean(
      u?.role === "admin" ||
      u?.role === "teacher" ||
      u?.teacher ||
      u?.classCode === "TEACHER"
    );
  }

  const initialUser = isTeacherUrl ? null : (saved.user || null);

  const state = {
    user: initialUser,
    rememberedPupil: saved.rememberedPupil || (saved.user && !isTeacherUser(saved.user) ? saved.user : null),
    showPhoneAppModal: !isStandaloneApp,
    loginName: "",
    loginCode: "",
    loginError: "",
    showTeacherLogin: isTeacherUrl,
    teacherNameInput: "Mrs Straub (Business Teacher)",
    teacherPinInput: "",
    teacherPinError: "",
    teacherUnlocked: isTeacherUser(initialUser),
    activeTab: isTeacherUser(initialUser) ? "teacher" : "dashboard",
    // Timed SQA Mini-Exam Sprint state
    examQuestions: [],
    examAnswers: {},
    examResults: null,
    examSecondsLeft: 900,
    examTimerId: null,
    examRunning: false,
    speakingText: "",
 // 'dashboard' | 'drills' | 'lessons' | 'practice' | 'cases' | 'homework' | 'progress' | 'teacher'

    // Command Word Drills state
    drillCategory: "identify", // 'identify' | 'describe' | 'explain' | 'compare' | 'justify' | 'multicommand'
    drillTopic: "All topics",
    drillLevel: "All levels",
    drillIndex: 0,
    drillAnswer: "",
    drillResult: null,
    drillShowHint: false,
    drillShowSolution: false,
    drillShowBlueprint: false,
    drillShowVideo: false,
    drillEmptyError: "",

    // Lessons & Flashcards state
    lessonTopic: "Understanding Business",
    lessonTitle: "Role of business in society",
    flashcardIdx: 0,
    flashcardFlipped: false,
    reviseTerms: saved.reviseTerms || [],
    lessonTaskAnswers: {},
    lessonTaskRevealed: {},
    customVideoUrlInput: "",

    // Practice state
    practiceTopic: "Understanding Business",
    practiceSubtopic: "All subtopics",
    practiceLevel: "B",
    practiceYear: "All years",
    practiceIdx: 0,
    practiceAnswer: "",
    practiceResult: null,
    practiceHint: false,
    practiceSolution: false,
    practiceEmptyError: "",

    // Case studies state
    activeCaseId: DATA.caseStudies[0]?.id || "cs-caledonia",
    caseAnswers: {},
    caseResults: {},
    caseEmptyErrors: {},

    // Homework state
    activeHwMonth: DATA.homeworkMonths[0] || "October 2026",
    hwAnswers: {},
    hwResults: {},
    hwEmptyErrors: {},

    // Teacher Dashboard state
    newClassName: "",
    newClassCode: "",
    teacherClassFilter: "ALL",
    importCsvText: "",
    importStatusMsg: "",
    selectedPupilInspect: null,

    // Synced DB collections
    classes: saved.classes,
    teachers: (saved.teachers && saved.teachers.length)
      ? saved.teachers
      : [{ id: "teacher-mrs-straub", name: "Mrs Straub", pin: "2026", isOwner: true, assignedClasses: ["ALL"] }],
    pupils: saved.pupils,
    attempts: saved.attempts,
    caseAttempts: saved.caseAttempts,
    homeworkSubmissions: saved.homeworkSubmissions,
    trackingRecords: saved.trackingRecords || {},
    trackingClassFilter: 'All',
    customVideos: saved.customVideos || {},
    // Flashcards state
    flashcardTopic: "All",
    flashcardIndex: 0,
    flashcardFlipped: false,
    masteredTerms: saved.masteredTerms || [],
    // N5 Assignment Helper checklist
    assignmentChecklist: saved.assignmentChecklist || {},
    // Daily Revision Streak
    streakData: saved.streakData || { days: 1, lastDate: new Date().toISOString().slice(0, 10) },
    // Full 70-Mark Timed SQA Mock Exam
    mockPaper: null,
    mockAnswers: {},
    mockResults: null,
    mockSecondsLeft: 5400,
    mockTimerId: null,
    // Optional Firebase/Cloud Sync URL
    cloudSyncUrl: saved.cloudSyncUrl || ""
  };

  function matchTeacherAccount(rawName, rawPin) {
    const name = (rawName || "").trim();
    const pin = (rawPin || "").trim().toUpperCase();
    if (!pin) return null;
    const ownerPins = ["2026", "STRAUB", "N5BM", "TEACHER2026"];
    // Check Mrs Straub (owner) master PINs
    if (ownerPins.includes(pin) && (!name || name.toLowerCase().includes("straub") || name.toLowerCase() === "teacher")) {
      const ownerRec = (state.teachers || []).find(t => t.isOwner) || {
        id: "teacher-mrs-straub", name: "Mrs Straub", pin: "2026", isOwner: true, assignedClasses: ["ALL"]
      };
      return {
        userId: ownerRec.id,
        name: name || ownerRec.name || "Mrs Straub (Business Teacher)",
        role: "admin",
        teacher: true,
        owner: true,
        pinVerified: true,
        assignedClasses: ["ALL"],
        classCode: "TEACHER",
        className: "Business Teacher"
      };
    }
    // Check custom teacher accounts created by Mrs Straub
    const matched = (state.teachers || []).find(t => {
      const pinMatch = String(t.pin || "").trim().toUpperCase() === pin;
      if (!pinMatch) return false;
      if (!name) return true;
      const tNameLower = String(t.name || "").trim().toLowerCase();
      const inputLower = name.toLowerCase();
      return tNameLower === inputLower || tNameLower.includes(inputLower) || inputLower.includes(tNameLower);
    });
    if (matched) {
      return {
        userId: matched.id,
        name: matched.name,
        role: matched.isOwner ? "admin" : "teacher",
        teacher: true,
        owner: Boolean(matched.isOwner),
        pinVerified: true,
        assignedClasses: Array.isArray(matched.assignedClasses) ? matched.assignedClasses : [],
        classCode: "TEACHER",
        className: matched.isOwner ? "Business Teacher" : "Teacher"
      };
    }
    return null;
  }

  function getVisibleClassesForTeacher() {
    const assigned = state.user?.assignedClasses;
    if (!assigned || assigned.includes("ALL") || state.user?.owner) {
      return state.classes;
    }
    const allowedSet = new Set(assigned.map(c => String(c).toUpperCase()));
    return state.classes.filter(c => allowedSet.has(String(c.code || "").toUpperCase()) || allowedSet.has(String(c.name || "").toUpperCase()));
  }

  // Sync with backend if running on server
  async function syncFromServer() {
    try {
      const res = await fetch("/_api/state");
      if (!res.ok) return;
      const db = await res.json();
      if (db.classes) state.classes = db.classes;
      if (db.pupils) state.pupils = db.pupils;
      if (db.attempts) state.attempts = db.attempts;
      if (db.caseAttempts) state.caseAttempts = db.caseAttempts;
      if (db.homeworkSubmissions) state.homeworkSubmissions = db.homeworkSubmissions;
      if (db.customVideos) state.customVideos = db.customVideos;
      saveLocalState();
      render();
    } catch {}
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function extractYouTubeId(input) {
    const s = String(input || "").trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function getUserAttempts() {
    if (!state.user) return [];
    if (state.user.role === "admin") return state.attempts;
    return state.attempts.filter(
      a => a.userId === state.user.userId || (a.userName?.toLowerCase() === state.user.name?.toLowerCase() && a.classCode?.toUpperCase() === state.user.classCode?.toUpperCase())
    );
  }

  function getUserHwSubmissions() {
    if (!state.user) return [];
    return state.homeworkSubmissions.filter(
      s => s.userId === state.user.userId || (s.userName?.toLowerCase() === state.user.name?.toLowerCase() && s.classCode?.toUpperCase() === state.user.classCode?.toUpperCase())
    );
  }

  // Helper: map question to drill category
  function getQuestionDrillCategory(q) {
    const cmd = (q.primaryCommand || "describe").toLowerCase();
    if (cmd.includes("+")) return "multicommand";
    if (["identify", "state", "name"].includes(cmd)) return "identify";
    if (["describe", "outline", "define"].includes(cmd)) return "describe";
    if (cmd === "explain") return "explain";
    if (["compare", "distinguish"].includes(cmd)) return "compare";
    if (["justify", "discuss"].includes(cmd)) return "justify";
    return "describe";
  }

  function getDrillQuestions() {
    return DATA.questions.filter(q => {
      if (getQuestionDrillCategory(q) !== state.drillCategory) return false;
      if (state.drillTopic !== "All topics" && q.topic !== state.drillTopic) return false;
      if (state.drillLevel !== "All levels" && (q.computedLevel || q.level) !== state.drillLevel) return false;
      return true;
    });
  }

  function getPracticeQuestions() {
    return DATA.questions.filter(q => {
      if (q.topic !== state.practiceTopic) return false;
      if (state.practiceSubtopic !== "All subtopics" && q.subtopic !== state.practiceSubtopic) return false;
      if ((q.computedLevel || q.level) !== state.practiceLevel) return false;
      if (state.practiceYear !== "All years" && String(q.sourceYear) !== String(state.practiceYear)) return false;
      return true;
    });
  }

  // Compute Analytics & Areas to Improve for current pupil
  function computeAnalytics() {
    const myAttempts = getUserAttempts();
    const totalAttempts = myAttempts.length;
    const avgPct = totalAttempts
      ? Math.round(myAttempts.reduce((acc, a) => acc + (Number(a.percentage) || 0), 0) / totalAttempts)
      : 0;

    // By Subtopic
    const subMap = new Map();
    myAttempts.forEach(a => {
      const q = DATA.questions.find(item => item.id === a.questionId);
      const topic = a.topic || q?.topic || "Understanding Business";
      const subtopic = a.subtopic || q?.subtopic || "General";
      const key = `${topic}||${subtopic}`;
      const entry = subMap.get(key) || { topic, subtopic, scores: [], attempts: 0 };
      entry.scores.push(Number(a.percentage) || 0);
      entry.attempts++;
      subMap.set(key, entry);
    });

    const subtopicStats = Array.from(subMap.values())
      .map(s => ({
        ...s,
        average: Math.round(s.scores.reduce((x, y) => x + y, 0) / s.scores.length)
      }))
      .sort((a, b) => a.average - b.average);

    // By Command Word Category
    const cmdMap = new Map();
    const categories = [
      { key: "identify", label: "Identify / State" },
      { key: "describe", label: "Describe / Outline" },
      { key: "explain", label: "Explain" },
      { key: "compare", label: "Compare / Distinguish" },
      { key: "justify", label: "Justify / Discuss" },
      { key: "multicommand", label: "Multi-Command (Identify & Justify)" }
    ];
    categories.forEach(c => cmdMap.set(c.key, { ...c, scores: [], attempts: 0 }));

    myAttempts.forEach(a => {
      const q = DATA.questions.find(item => item.id === a.questionId);
      const cat = q ? getQuestionDrillCategory(q) : "describe";
      const entry = cmdMap.get(cat);
      if (entry) {
        entry.scores.push(Number(a.percentage) || 0);
        entry.attempts++;
      }
    });

    const commandStats = Array.from(cmdMap.values()).map(c => ({
      ...c,
      average: c.scores.length ? Math.round(c.scores.reduce((x, y) => x + y, 0) / c.scores.length) : null
    }));

    const attemptedCommands = commandStats
      .filter(c => c.attempts > 0)
      .sort((a, b) => a.average - b.average);

    return {
      totalAttempts,
      avgPct,
      uniqueQuestionsCount: new Set(myAttempts.map(a => a.questionId)).size,
      subtopicStats,
      commandStats,
      weakestCommands: attemptedCommands
    };
  }

  function findExistingPupilByName(rawName, rawCode = "") {
    const normName = String(rawName || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (normName.length < 2) return null;
    const code = String(rawCode || "").trim().toUpperCase();
    if (code) {
      const exact = state.pupils.find(
        p => p.name.toLowerCase().replace(/\s+/g, " ") === normName &&
             (p.classCode.toUpperCase() === code || (p.className && p.className.toUpperCase() === code))
      );
      if (exact) return exact;
    }
    return state.pupils.find(p => p.name.toLowerCase().replace(/\s+/g, " ") === normName) || null;
  }

  function renderLogin() {
    // Dedicated Private Teacher Login Screen (ONLY shown when opening ?teacher=1)
    if (state.showTeacherLogin) {
      return `
        <main class="login-page">
          <section class="login-panel">
            <div class="login-logo">N5</div>
            <p class="kicker">NATIONAL 5 BUSINESS MANAGEMENT · PRIVATE TEACHER PORTAL</p>
            <h1>🔒 Teacher Dashboard Sign-In</h1>
            <p class="login-lead">
              This private portal is only accessible via your personal teacher link (<code>?teacher=1</code>) and does <strong>not</strong> appear on the pupils' login page.
            </p>

            <div class="teacher-area" style="display:flex;flex-direction:column;gap:12px;margin-top:8px;padding:18px;border-radius:14px;background:#f8fafc;border:2px solid #7c3aed;">
              <div style="font-weight:800;font-size:16px;color:#7c3aed;">🎓 ${escapeHtml(state.teacherNameInput || "Teacher")} — Teacher Dashboard &amp; Class Records</div>
              <p style="margin:0;font-size:13.5px;color:var(--text-muted);">Enter your Teacher PIN below to unlock individual pupil records, saved answers, practice marks, and monthly homework results.</p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <label style="font-size:13px;font-weight:700;color:var(--text);">Teacher Display Name
                  <input type="text" id="teacher-name-field" value="${escapeHtml(state.teacherNameInput)}" placeholder="Mrs Straub (Business Teacher)" style="width:100%;margin-top:4px;padding:11px;border-radius:8px;border:1.5px solid #cbd5e1;font-size:14.5px;" />
                </label>
                <label style="font-size:13px;font-weight:700;color:var(--text);">Teacher Password / PIN
                  <input type="password" id="teacher-pin-field" value="${escapeHtml(state.teacherPinInput)}" placeholder="Enter Teacher PIN" autofocus style="width:100%;margin-top:4px;padding:11px;border-radius:8px;border:1.5px solid #7c3aed;font-size:15px;" />
                </label>
              </div>
              ${state.teacherPinError ? `<div style="color:#dc2626;font-size:13.5px;font-weight:700;padding:8px 10px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">${escapeHtml(state.teacherPinError)}</div>` : ""}
              <button type="button" class="btn btn-primary" id="btn-teacher-login" style="width:100%;padding:13px;font-size:15px;font-weight:700;">
                🎓 Unlock Teacher Dashboard
              </button>
            </div>
          </section>
        </main>
      `;
    }

    // Pupil Login Page (Zero Teacher Login elements or buttons anywhere on this page)
    const matchedPupil = findExistingPupilByName(state.loginName, state.loginCode);
    const rem = state.rememberedPupil;
    return `
      <main class="login-page">
        <section class="login-panel">
          <div class="login-logo">N5</div>
          <p class="kicker">NATIONAL 5 BUSINESS MANAGEMENT</p>
          <h1>Welcome to your Revision Hub</h1>

          ${rem ? `
            <div style="background:#f5f3ff;border:2px solid #a78bfa;border-radius:14px;padding:12px 14px;margin-bottom:14px;">
              <div style="font-size:12px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:0.04em;">Saved on This Phone / Device</div>
              <button type="button" class="btn btn-primary" id="btn-continue-remembered" style="width:100%;margin-top:6px;padding:13px;font-size:15.5px;">
                👋 Tap to Continue as ${escapeHtml(rem.name)} (${escapeHtml(rem.className || rem.classCode)})
              </button>
            </div>
          ` : ""}

          <p class="login-lead">
            <strong>Returning pupils:</strong> just type your <strong>full name</strong> to log straight back in!<br/>
            <span style="font-size:13.5px;">First-time pupils: enter your name and class code (<strong>4GBM1</strong>, <strong>4FBM2</strong>, <strong>4CBM3</strong>, or <strong>ABCD</strong>) once.</span>
          </p>

          <form class="pupil-form" id="pupil-login-form">
            <label for="pupil-name">Your full name</label>
            <input
              id="pupil-name"
              type="text"
              autocomplete="name"
              placeholder="e.g. Erin Newton"
              value="${escapeHtml(state.loginName)}"
              required
              minlength="2"
              maxlength="100"
            />

            <div id="pupil-recognition-hint" style="font-size:13px;font-weight:600;min-height:20px;color:${matchedPupil ? "var(--success)" : "var(--text-muted)"};">
              ${matchedPupil
                ? `✓ Returning pupil recognised: ${escapeHtml(matchedPupil.name)} (${escapeHtml(matchedPupil.className || matchedPupil.classCode)} · Code ${escapeHtml(matchedPupil.classCode)}) — no class code needed!`
                : "Already logged in before? Leave the class code box blank."}
            </div>

            <label for="class-code">Class code <span style="font-weight:500;color:var(--text-muted);">(First time only — leave blank if you've logged in before)</span></label>
            <input
              id="class-code"
              type="text"
              autocomplete="off"
              placeholder="Optional for returning pupils (4GBM1, 4FBM2, 4CBM3, ABCD)"
              value="${escapeHtml(state.loginCode)}"
              maxlength="20"
            />

            ${state.loginError ? `<p role="alert" style="color:var(--danger);font-size:13.5px;margin:0;font-weight:600;">${escapeHtml(state.loginError)}</p>` : ""}

            <button type="submit" class="btn btn-primary" style="margin-top:4px;width:100%;padding:12px;">
              Enter Revision Hub (Pupil)
            </button>
          </form>

          <!-- ADD TO PHONE HOME SCREEN APP ICON BUTTON -->
          <div style="margin-top:14px;padding:12px;border-radius:12px;background:#f5f3ff;border:1.5px solid #c4b5fd;">
            <button type="button" class="btn btn-primary" id="btn-install-phone-app" style="width:100%;padding:11px;background:#7c3aed;font-size:14px;">
              📲 Add "N5 Business" App Button to My Phone Screen
            </button>
            ${state.showPhoneAppModal ? `
              <div style="margin-top:10px;padding:12px;background:#ffffff;border-radius:10px;border:1px solid #cbd5e1;font-size:13px;line-height:1.5;color:var(--text);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                  <div style="width:42px;height:42px;border-radius:10px;background:#7c3aed;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;">
                    <span style="font-size:16px;line-height:1;">N5</span>
                    <span style="font-size:6px;">BUSINESS</span>
                  </div>
                  <div>
                    <strong>How to put this App Icon on your Phone Screen (takes 5 seconds):</strong>
                  </div>
                </div>
                <div style="margin-bottom:6px;">🍎 <strong>On iPhone (Safari):</strong><br/>1. Tap the <strong>Share</strong> button <strong>(square with arrow ↑)</strong> at the bottom of Safari.<br/>2. Scroll down and tap <strong>"Add to Home Screen" (➕)</strong>, then tap <strong>Add</strong>.</div>
                <div>🤖 <strong>On Android (Chrome):</strong><br/>1. Tap the <strong>3 dots (⋮)</strong> in the top-right corner of Chrome.<br/>2. Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</div>
                <div style="margin-top:8px;color:#7c3aed;font-weight:700;">✓ Once added, tapping the N5 Business icon on your phone opens straight into your account!</div>
              </div>
            ` : ""}
          </div>

          <div class="login-features">
            <div>✓ <strong>Returning Pupils:</strong> Sign in with <strong>just your name</strong> (all 41 existing pupils already linked!)</div>
            <div>✓ <strong>First-Time Class Codes:</strong> <code>4GBM1</code> (4GBM) · <code>4FBM2</code> (4FBM) · <code>4CBM3</code> (4CBM) · <code>ABCD</code> (4E)</div>
            <div>✓ <strong>NEW:</strong> SQA Command Word Drills (Identify · Describe · Explain) &amp; YouTube Videos</div>
          </div>
        </section>
      </main>
    `;
  }

  function renderFeedbackCard(res, q) {
    if (!res) return "";
    const statusClass = res.marks === res.maxMarks ? "full-marks" : res.marks > 0 ? "partial-marks" : "zero-marks";
    return `
      <div class="feedback-box ${statusClass}">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <strong style="font-size:16px;">SQA Auto-Marker Result: ${res.marks} / ${res.maxMarks} marks (${res.percentage}%)</strong>
          <span class="badge ${res.commandPassed ? "badge-success" : "badge-warning"}">
            ${res.commandPassed ? "✓ Command Word Applied" : "⚠ Command Word Tip"}
          </span>
        </div>
        <p style="margin:0 0 10px 0;font-size:14px;">${escapeHtml(res.feedback)}</p>

        ${res.awardedPoints && res.awardedPoints.length > 0 ? `
          <div style="margin-top:10px;">
            <strong style="color:var(--success);font-size:13.5px;">✓ Credited SQA Marking Points:</strong>
            <ul class="point-list" style="color:var(--text);">
              ${res.awardedPoints.map(pt => `<li>${escapeHtml(pt)}</li>`).join("")}
            </ul>
          </div>
        ` : ""}

        ${res.improvements && res.improvements.length > 0 ? `
          <div style="margin-top:10px;">
            <strong style="color:var(--warning);font-size:13.5px;">→ How to Improve / Missing SQA Points:</strong>
            <ul class="point-list" style="color:var(--text);">
              ${res.improvements.map(pt => `<li>${escapeHtml(pt)}</li>`).join("")}
            </ul>
          </div>
        ` : ""}

        <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(15,23,42,0.12);">
          <strong style="font-size:13.5px;display:block;margin-bottom:4px;">SQA Model Answer:</strong>
          <div class="no-copy-model" oncopy="return false;" oncut="return false;" oncontextmenu="return false;" style="white-space:pre-line;font-size:13.5px;background:rgba(255,255,255,0.75);padding:10px 12px;border-radius:8px;border:1px solid var(--border);">
            ${escapeHtml(res.modelAnswer || q?.solution || "")}
          </div>
        </div>
      </div>
    `;
  }

  function renderDrillsTab(analytics) {
    const drillCats = [
      { key: "identify", title: "1. Identify Drill", sub: "Identify · State · Name", desc: "Fast 1-mark recall points" },
      { key: "describe", title: "2. Describe Drill", sub: "Describe · Outline · Define", desc: "Full descriptive sentences" },
      { key: "explain", title: "3. Explain Drill", sub: "Explain (Cause → Impact)", desc: "'which means that / leading to'" },
      { key: "compare", title: "4. Compare Drill", sub: "Compare · Distinguish", desc: "Use 'whereas' & 'both'" },
      { key: "justify", title: "5. Justify & Discuss", sub: "Justify · Discuss", desc: "Reasons, advantages & drawbacks" },
      { key: "multicommand", title: "6. Multi-Command", sub: "Identify & Justify / Explain", desc: "Complete both parts for full marks" }
    ];

    const guide = DATA.commandWordGuides[state.drillCategory] || DATA.commandWordGuides.identify;
    const questions = getDrillQuestions();
    const safeIdx = questions.length ? Math.min(state.drillIndex, questions.length - 1) : 0;
    const currentQ = questions[safeIdx];
    const activeCatMeta = drillCats.find(c => c.key === state.drillCategory) || drillCats[0];

    return `
      <section class="section-panel">
        <div class="drill-header-row">
          <div>
            <p class="kicker">SQA COMMAND WORD DRILL HUB · 172 PAST-PAPER QUESTIONS</p>
            <h2 style="margin-bottom:4px;">Targeted Command Word Drills — Instant Marking &amp; Feedback</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:13.5px;">
              Tap any command word below (<strong>Identify</strong>, <strong>Describe</strong>, <strong>Explain</strong>, <strong>Compare</strong>, <strong>Justify</strong>, or <strong>Multi-Command</strong>) to drill 26–39 authentic SQA past-paper questions right away.
            </p>
          </div>
          <div class="drill-filter-bar">
            <select id="drill-topic-select" aria-label="Filter drill by course area">
              <option value="All topics" ${state.drillTopic === "All topics" ? "selected" : ""}>All 5 Course Areas</option>
              ${Object.keys(DATA.courseAreas).map(t => `<option value="${escapeHtml(t)}" ${state.drillTopic === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
            </select>
            <select id="drill-level-select" aria-label="Filter drill by difficulty level">
              <option value="All levels" ${state.drillLevel === "All levels" ? "selected" : ""}>All Difficulty Levels (A/B/C)</option>
              <option value="C" ${state.drillLevel === "C" ? "selected" : ""}>Level C — Support</option>
              <option value="B" ${state.drillLevel === "B" ? "selected" : ""}>Level B — Standard N5</option>
              <option value="A" ${state.drillLevel === "A" ? "selected" : ""}>Level A — Challenge</option>
            </select>
          </div>
        </div>

        <!-- 6 COMMAND WORD DRILL BUTTONS (2-Column Mobile Grid / 6-Column Desktop) -->
        <div class="drill-selector-grid">
          ${drillCats.map(c => {
            const isActive = state.drillCategory === c.key;
            const count = DATA.questions.filter(q => getQuestionDrillCategory(q) === c.key).length;
            const stat = analytics.commandStats.find(s => s.key === c.key);
            const avgBadge = stat && stat.attempts > 0 ? `${stat.average}% avg · ${count} Qs` : `${count} SQA Qs`;
            return `
              <button type="button" class="drill-pill-card ${isActive ? "active" : ""}" data-drill-cat="${c.key}" aria-pressed="${isActive}">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;margin-bottom:4px;">
                  <span class="badge ${isActive ? "badge-active-pill" : ""}">${escapeHtml(avgBadge)}</span>
                  ${isActive ? `<span style="font-size:11px;font-weight:800;color:#ffffff;">✓ ACTIVE</span>` : ""}
                </div>
                <h4>${escapeHtml(c.title)}</h4>
                <p><strong>${escapeHtml(c.sub)}</strong><span class="drill-desc-text"> · ${escapeHtml(c.desc)}</span></p>
              </button>
            `;
          }).join("")}
        </div>

        <div class="two-col-layout">
          <div id="drill-question-card">
            ${!currentQ ? `
              <div class="question-card">
                <p style="margin:0 0 10px 0;">No drill questions match that exact filter combination.</p>
                <button type="button" class="btn btn-primary btn-sm" id="btn-reset-drill-filters">
                  ↺ Reset Filters to Show All ${DATA.questions.filter(q => getQuestionDrillCategory(q) === state.drillCategory).length} ${escapeHtml(activeCatMeta.title)} Questions
                </button>
              </div>
            ` : `
              <!-- ACTIVE DRILL QUESTION CARD (Placed FIRST so mobile users see it immediately!) -->
              <div class="question-card" style="border:2px solid var(--primary);box-shadow:var(--shadow-md);">
                <!-- TOP QUICK-SWITCH BAR: Prev / Jump to Question Dropdown / Next -->
                <div class="question-nav-bar">
                  <button type="button" class="btn btn-outline btn-sm" id="btn-top-prev-drill">
                    ← Prev
                  </button>
                  <select id="drill-question-jump" aria-label="Jump to drill question" style="flex:1;min-width:160px;font-weight:700;border-color:var(--primary);background:#f5f3ff;">
                    ${questions.map((qItem, qIdx) => `
                      <option value="${qIdx}" ${qIdx === safeIdx ? "selected" : ""}>
                        Q${qIdx + 1} of ${questions.length} · ${escapeHtml(String(qItem.sourceYear))} Q${escapeHtml(String(qItem.sourceQuestion).replace(/^Q/i, ""))} (${escapeHtml(qItem.subtopic)})
                      </option>
                    `).join("")}
                  </select>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-top-next-drill">
                    Next →
                  </button>
                </div>

                <!-- COMPACT COMMAND WORD BLUEPRINT & YOUTUBE GUIDE TOGGLE BAR -->
                <div style="margin:10px 0;padding:10px 12px;border-radius:10px;background:#f5f3ff;border:1px solid #c4b5fd;">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <div style="font-size:13px;">
                      <strong style="color:#7c3aed;">🎯 ${escapeHtml(guide.command.toUpperCase())} Rule:</strong>
                      <span>${escapeHtml(guide.formula)}</span>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button type="button" class="btn btn-outline btn-sm" id="btn-toggle-drill-blueprint" style="background:#fff;">
                        📖 ${state.drillShowBlueprint ? "Hide Example" : "Full-Mark Example"}
                      </button>
                      <button type="button" class="btn btn-outline btn-sm" id="btn-toggle-drill-video" style="background:#fff;">
                        ▶ ${state.drillShowVideo ? "Hide Video" : "YouTube Guide"}
                      </button>
                    </div>
                  </div>

                  ${state.drillShowBlueprint ? `
                    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #c4b5fd;">
                      <p style="margin:0 0 8px 0;font-size:13px;color:var(--text-secondary);">${escapeHtml(guide.rule)}</p>
                      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;font-size:12.5px;">
                        <div style="background:#dcfce7;border:1px solid #86efac;padding:9px;border-radius:8px;">
                          <strong style="color:#15803d;">✓ Full-Mark Example (${escapeHtml(guide.examplePrompt)}):</strong>
                          <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(guide.goodAnswer)}</div>
                        </div>
                        <div style="background:#fee2e2;border:1px solid #fca5a5;padding:9px;border-radius:8px;">
                          <strong style="color:#b91c1c;">✗ Common Mistake to Avoid:</strong>
                          <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(guide.badAnswer)}</div>
                        </div>
                      </div>
                    </div>
                  ` : ""}

                  ${state.drillShowVideo ? `
                    <div class="video-card" style="margin-top:10px;margin-bottom:2px;">
                      <div class="video-header">
                        <h4>▶ ${escapeHtml(guide.videoTitle)}</h4>
                        <a href="https://www.youtube.com/watch?v=${escapeHtml(guide.videoId)}" target="_blank" rel="noopener" class="btn btn-soft btn-sm">
                          Open on YouTube ↗
                        </a>
                      </div>
                      <div class="video-frame-wrap">
                        <iframe
                          src="https://www.youtube-nocookie.com/embed/${escapeHtml(guide.videoId)}"
                          title="${escapeHtml(guide.videoTitle)}"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowfullscreen
                        ></iframe>
                      </div>
                    </div>
                  ` : ""}
                </div>

                <!-- QUESTION METADATA BADGES -->
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <span class="badge badge-primary">Command: ${escapeHtml(currentQ.primaryCommand.toUpperCase())}</span>
                    <span class="badge" style="font-weight:700;">${currentQ.marks} ${currentQ.marks === 1 ? "mark" : "marks"}</span>
                    <span class="badge">Level ${escapeHtml(currentQ.computedLevel || currentQ.level || "B")}</span>
                    <span class="badge">${escapeHtml(currentQ.topic)} · ${escapeHtml(currentQ.subtopic)}</span>
                    <span class="badge">SQA ${escapeHtml(String(currentQ.sourceYear))} · Q${escapeHtml(String(currentQ.sourceQuestion).replace(/^Q/i, ""))}</span>
                  </div>
                </div>

                ${currentQ.paperUrl || currentQ.markingUrl ? `
                  <div style="font-size:12.5px;margin-bottom:8px;display:flex;gap:10px;flex-wrap:wrap;">
                    ${currentQ.paperUrl ? `<a href="${escapeHtml(currentQ.paperUrl)}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600;">📄 Open SQA ${escapeHtml(String(currentQ.sourceYear))} paper ↗</a>` : ""}
                    ${currentQ.markingUrl ? `<a href="${escapeHtml(currentQ.markingUrl)}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600;">✓ Official SQA marking instructions ↗</a>` : ""}
                  </div>
                ` : ""}

                <h3 style="font-size:17.5px;margin:8px 0 12px 0;line-height:1.45;">
                  ${escapeHtml(currentQ.text)}
                </h3>

                <label for="drill-answer-box" style="font-weight:600;font-size:13.5px;display:block;margin-bottom:6px;">
                  Your answer (aim for ${currentQ.marks} distinct ${currentQ.marks === 1 ? "point" : "points"}):
                </label>
                <textarea
                  id="drill-answer-box"
                  rows="4"
                  placeholder="Write your SQA answer here using bullet points…"
                >${escapeHtml(state.drillAnswer)}</textarea>

                ${state.drillEmptyError ? `
                  <div role="alert" style="margin-top:8px;padding:10px 12px;border-radius:8px;background:#fffbeb;border:1.5px solid #f59e0b;color:#b45309;font-size:13.5px;font-weight:600;">
                    ${escapeHtml(state.drillEmptyError)}
                  </div>
                ` : ""}

                <div class="drill-action-buttons">
                  <button type="button" class="btn btn-primary" id="btn-mark-drill">
                    ✓ Mark Straight Away
                  </button>
                  <button type="button" class="btn btn-outline" id="btn-drill-hint">
                    💡 ${state.drillShowHint ? "Hide Hint" : "Show Hint"}
                  </button>
                  <button type="button" class="btn btn-outline" id="btn-drill-solution">
                    👁 ${state.drillShowSolution ? "Hide Model Answer" : "SQA Model Answer"}
                  </button>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
                  <button type="button" class="btn btn-outline btn-sm" id="btn-prev-drill" style="flex:1;">
                    ← Previous Question
                  </button>
                  <button type="button" class="btn btn-soft btn-sm" id="btn-next-drill" style="flex:1;">
                    Next Drill Question →
                  </button>
                </div>

                ${state.drillShowHint ? `
                  <div style="margin-top:12px;padding:12px;background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:8px;font-size:13.5px;">
                    <strong>💡 SQA Hint:</strong> ${escapeHtml(currentQ.hint)}
                    <div style="margin-top:4px;color:var(--text-secondary);"><strong>Marking Rule:</strong> ${escapeHtml(currentQ.markingRule)}</div>
                  </div>
                ` : ""}

                ${state.drillShowSolution ? `
                  <div style="margin-top:12px;padding:14px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;font-size:13.5px;">
                    <strong style="color:#15803d;display:block;margin-bottom:6px;">✓ Official SQA Model Answer &amp; Marking Points (${currentQ.marks} marks):</strong>
                    <div style="white-space:pre-line;background:#ffffff;padding:10px 12px;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:8px;">${escapeHtml(currentQ.solution || (currentQ.acceptedPoints || []).map(p => `• ${p} (1)`).join("\n"))}</div>
                    <div style="font-size:12.5px;color:#166534;"><strong>SQA Marking Rule:</strong> ${escapeHtml(currentQ.markingRule)}</div>
                  </div>
                ` : ""}

                ${renderFeedbackCard(state.drillResult, currentQ)}
              </div>
            `}
          </div>

          <!-- Right Sidebar: Live Command Word Mastery & Areas to Improve -->
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="side-card">
              <h3 style="font-size:16px;margin-bottom:8px;">Command Word Mastery</h3>
              <p style="font-size:13px;color:var(--text-secondary);margin:0 0 12px 0;">
                Your live score across every SQA command word type. Tap any row to switch to that drill:
              </p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${analytics.commandStats.map(c => {
                  const pct = c.average ?? 0;
                  const barColor = c.attempts === 0 ? "#cbd5e1" : pct >= 70 ? "#15803d" : pct >= 50 ? "#d97706" : "#b91c1c";
                  const isCurrent = state.drillCategory === c.key;
                  return `
                    <button type="button" class="mastery-row-btn ${isCurrent ? "active" : ""}" data-drill-cat="${c.key}">
                      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:4px;width:100%;">
                        <span>${isCurrent ? "▶ " : ""}${escapeHtml(c.label)}</span>
                        <span>${c.attempts === 0 ? "Tap to drill →" : `${pct}% (${c.attempts})`}</span>
                      </div>
                      <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;width:100%;">
                        <div style="height:100%;width:${c.attempts === 0 ? 0 : pct}%;background:${barColor};"></div>
                      </div>
                    </button>
                  `;
                }).join("")}
              </div>
            </div>

            <div class="side-card">
              <h3 style="font-size:16px;margin-bottom:8px;">Areas to Improve (Tracked Automatically)</h3>
              ${analytics.subtopicStats.length === 0 ? `
                <p style="font-size:13px;color:var(--text-muted);margin:0;">
                  Mark your first drill question and your weakest topics &amp; command words will appear here automatically.
                </p>
              ` : `
                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${analytics.subtopicStats.slice(0, 4).map(s => `
                    <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;">
                        <strong style="font-size:13.5px;">${escapeHtml(s.subtopic)}</strong>
                        <span class="badge ${s.average >= 70 ? "badge-success" : s.average >= 50 ? "badge-warning" : "badge-danger"}">
                          ${s.average}% avg
                        </span>
                      </div>
                      <p style="margin:3px 0 8px 0;font-size:12px;color:var(--text-muted);">
                        ${escapeHtml(s.topic)} · ${s.attempts} ${s.attempts === 1 ? "attempt" : "attempts"}
                      </p>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button type="button" class="btn btn-outline btn-sm" data-open-lesson="${escapeHtml(s.topic)}||${escapeHtml(s.subtopic)}">
                          Watch Video &amp; Notes
                        </button>
                        <button type="button" class="btn btn-soft btn-sm" data-drill-topic="${escapeHtml(s.topic)}">
                          Drill Topic
                        </button>
                      </div>
                    </div>
                  `).join("")}
                </div>
              `}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderLessonsTab() {
    const topicLessons = DATA.lessons.filter(l => l.topic === state.lessonTopic);
    const activeLesson = topicLessons.find(l => l.title === state.lessonTitle) || topicLessons[0] || DATA.lessons[0];
    const customVid = state.customVideos[activeLesson.title];
    const videoId = customVid?.videoId || activeLesson.video?.videoId || "";
    const videoTitle = customVid?.title || activeLesson.video?.title || activeLesson.title;
    const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent("SQA National 5 Business Management " + activeLesson.title)}`;

    const defs = activeLesson.definitions || [];
    const safeCardIdx = defs.length ? state.flashcardIdx % defs.length : 0;
    const activeCard = defs[safeCardIdx];

    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div>
            <p class="kicker">COURSE NOTES, FLASHCARDS & YOUTUBE VIDEO LESSONS</p>
            <h2 style="margin-bottom:4px;">30 SQA National 5 Lessons with Matched YouTube Videos</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:14px;">
              Select a course area and subtopic to watch the matched revision video, study catch-up notes, flip key-term flashcards, and test yourself.
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-soft btn-sm" data-drill-topic="${escapeHtml(activeLesson.topic)}">
              ⚡ Drill ${escapeHtml(activeLesson.topic)} Questions
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.print()">
              🖨 Print Catch-Up Notes
            </button>
          </div>
        </div>

        <!-- 5 Course Area Filter Buttons -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
          ${Object.keys(DATA.courseAreas).map(topic => `
            <button
              type="button"
              class="btn ${state.lessonTopic === topic ? "btn-primary" : "btn-outline"} btn-sm"
              data-select-lesson-topic="${escapeHtml(topic)}"
            >
              ${escapeHtml(topic)}
            </button>
          `).join("")}
        </div>

        <div class="lesson-layout">
          <!-- Left Lesson Navigation -->
          <aside class="side-card" style="display:flex;flex-direction:column;gap:6px;">
            <strong style="font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">
              ${escapeHtml(state.lessonTopic)} (${topicLessons.length} Lessons)
            </strong>
            ${topicLessons.map((l, idx) => `
              <button
                type="button"
                class="btn ${activeLesson.title === l.title ? "btn-primary" : "btn-outline"}"
                style="justify-content:flex-start;text-align:left;padding:9px 12px;font-size:13.5px;"
                data-select-lesson-title="${escapeHtml(l.title)}"
              >
                <span>${idx + 1}. ${escapeHtml(l.title)}</span>
              </button>
            `).join("")}
          </aside>

          <!-- Main Lesson Content + Matched YouTube Video + Flashcards -->
          <article class="question-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <span class="badge badge-primary">${escapeHtml(activeLesson.topic)}</span>
              <span class="badge">${defs.length} Key Terms · Video Lesson Included</span>
            </div>

            <h2 style="margin:8px 0 8px 0;font-size:22px;">${escapeHtml(activeLesson.title)}</h2>
            <p style="font-size:15px;color:var(--text-secondary);margin-top:0;">
              ${escapeHtml(activeLesson.overview)}
            </p>

            <!-- MATCHED YOUTUBE VIDEO PLAYER -->
            <div class="video-card">
              <div class="video-header">
                <div>
                  <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#93c5fd;font-weight:700;display:block;">
                    MATCHED YOUTUBE REVISION VIDEO
                  </span>
                  <h4>▶ ${escapeHtml(videoTitle)}</h4>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  ${videoId ? `
                    <a href="https://www.youtube.com/watch?v=${escapeHtml(videoId)}" target="_blank" rel="noopener" class="btn btn-soft btn-sm">
                      Watch on YouTube ↗
                    </a>
                  ` : ""}
                  <a href="https://www.youtube.com/results?search_query=Your+Business+Tutor+N5+Business+Management+${encodeURIComponent(activeLesson.title)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="background:#4c1d95;color:#fff;border-color:#7c3aed;">
                    Your Business Tutor (N5) ↗
                  </a>
                </div>
              </div>
              ${videoId ? `
                <div class="video-frame-wrap">
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/${escapeHtml(videoId)}"
                    title="${escapeHtml(videoTitle)}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                </div>
              ` : `
                <div style="padding:20px 16px;background:linear-gradient(135deg,#2e1065 0%,#4c1d95 100%);text-align:center;">
                  <p style="margin:0 0 12px 0;color:#ede9fe;font-size:14px;">Watch Scottish National 5 Business Management videos for <strong>${escapeHtml(activeLesson.title)}</strong>:</p>
                  <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                    <a href="https://www.youtube.com/@ScottishEducationalVideos/videos" target="_blank" rel="noopener" class="btn btn-primary btn-sm">▶ @ScottishEducationalVideos ↗</a>
                    <a href="https://www.youtube.com/results?search_query=Your+Business+Tutor+N5+Business+Management+${encodeURIComponent(activeLesson.title)}" target="_blank" rel="noopener" class="btn btn-soft btn-sm">▶ Your Business Tutor (N5) ↗</a>
                  </div>
                </div>
              `}
              <div class="video-footer">
                <span>${escapeHtml(activeLesson.video?.summary || "Watch this video alongside the key points below for missed classes or exam revision.")}</span>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;width:100%;">
                  <a href="https://www.youtube.com/@ScottishEducationalVideos/videos" target="_blank" rel="noopener" style="color:#ddd6fe;font-weight:700;text-decoration:underline;">▶ @ScottishEducationalVideos ↗</a>
                  <a href="https://www.youtube.com/results?search_query=Your+Business+Tutor+N5+Business+Management+${encodeURIComponent(activeLesson.title)}" target="_blank" rel="noopener" style="color:#ddd6fe;font-weight:700;text-decoration:underline;">▶ Your Business Tutor (${escapeHtml(activeLesson.title)}) ↗</a>
                </div>
                ${isTeacherUser(state.user) ? `
                  <div style="display:flex;gap:6px;align-items:center;width:100%;margin-top:6px;">
                    <input type="text" id="custom-video-input" placeholder="Teacher: Paste any YouTube link or ID for this lesson…" style="flex:1;padding:6px 10px;font-size:12.5px;" />
                    <button type="button" class="btn btn-primary btn-sm" id="btn-save-custom-video" data-lesson-title="${escapeHtml(activeLesson.title)}">
                      Set Lesson Video
                    </button>
                  </div>
                ` : ""}
              </div>
            </div>

            <!-- DETAILED CATCH-UP NOTES & KEY POINTS -->
            <div style="margin-top:18px;">
              <h3 style="font-size:17px;margin-bottom:8px;">Core Knowledge & Catch-Up Notes (For Revision & Missed Classes)</h3>
              <ul class="point-list">
                ${(activeLesson.points || []).map(pt => `<li style="margin-bottom:7px;">${escapeHtml(pt)}</li>`).join("")}
              </ul>
            </div>

            <!-- WORKED BUSINESS EXAMPLE & EXAM TECHNIQUE -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-top:16px;">
              <div class="side-card" style="background:var(--surface-tint);border-color:#bfdbfe;">
                <strong style="color:var(--primary);display:block;margin-bottom:4px;">Scottish Business Example</strong>
                <p style="margin:0;font-size:13.5px;">${escapeHtml(activeLesson.example)}</p>
              </div>
              <div class="side-card" style="background:var(--success-bg);border-color:var(--success-border);">
                <strong style="color:var(--success);display:block;margin-bottom:4px;">SQA Exam Technique Tip</strong>
                <p style="margin:0;font-size:13.5px;">${escapeHtml(activeLesson.examTip)}</p>
              </div>
            </div>

            <!-- ADVANTAGES & DISADVANTAGES (EXTRAS) -->
            ${activeLesson.extras ? `
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-top:14px;">
                ${activeLesson.extras.benefits ? `
                  <div class="side-card">
                    <strong style="color:var(--success);">✓ Advantages / Benefits (with Business Impacts)</strong>
                    <ul class="point-list" style="font-size:13.5px;">
                      ${activeLesson.extras.benefits.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
                    </ul>
                  </div>
                ` : ""}
                ${activeLesson.extras.limitations ? `
                  <div class="side-card">
                    <strong style="color:var(--danger);">✗ Disadvantages / Drawbacks (with Business Impacts)</strong>
                    <ul class="point-list" style="font-size:13.5px;">
                      ${activeLesson.extras.limitations.map(d => `<li>${escapeHtml(d)}</li>`).join("")}
                    </ul>
                  </div>
                ` : ""}
              </div>
              ${activeLesson.extras.worked ? `
                <div class="side-card" style="margin-top:12px;background:#fefce8;border-color:#fde047;">
                  <strong>Worked Calculation / Example:</strong>
                  <p style="margin:4px 0 0 0;font-size:13.5px;">${escapeHtml(activeLesson.extras.worked)}</p>
                </div>
              ` : ""}
            ` : ""}

            <!-- COMMON EXAM MISTAKES & MODEL SHORT ANSWER (Original Floot Sections) -->
            ${(activeLesson.mistakes && activeLesson.mistakes.length) || activeLesson.model ? `
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-top:14px;">
                ${activeLesson.mistakes && activeLesson.mistakes.length ? `
                  <div class="side-card" style="background:#fff7ed;border-color:#fed7aa;">
                    <strong style="color:#c2410c;display:block;margin-bottom:4px;">⚠️ Common Exam Mistakes to Avoid</strong>
                    <ul class="point-list" style="font-size:13.5px;margin:0;">
                      ${activeLesson.mistakes.map(m => `<li>${escapeHtml(m)}</li>`).join("")}
                    </ul>
                  </div>
                ` : ""}
                ${activeLesson.model ? `
                  <div class="side-card" style="background:#f0fdf4;border-color:#bbf7d0;">
                    <strong style="color:#15803d;display:block;margin-bottom:4px;">✓ Model Short Answer</strong>
                    <p style="margin:0;font-size:13.5px;">${escapeHtml(activeLesson.model)}</p>
                  </div>
                ` : ""}
              </div>
            ` : ""}

            <!-- KEY TERMS & DEFINITIONS FULL GLOSSARY DISCLOSURE -->
            ${defs.length ? `
              <details style="margin-top:14px;padding:12px 14px;background:#f8fafc;border:1px solid var(--border);border-radius:10px;">
                <summary style="font-weight:700;cursor:pointer;font-size:14px;">📖 All Key Terms &amp; Definitions in This Lesson (${defs.length})</summary>
                <div style="margin-top:10px;display:grid;gap:8px;">
                  ${defs.map(d => `
                    <div style="font-size:13.5px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">
                      <strong>${escapeHtml(d.term)}:</strong> ${escapeHtml(d.definition)}
                    </div>
                  `).join("")}
                </div>
              </details>
            ` : ""}

            <!-- INTERACTIVE KEY-TERM FLASHCARDS -->
            ${activeCard ? `
              <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                  <h3 style="font-size:17px;margin:0;">Interactive Key-Term Flashcards (${safeCardIdx + 1} of ${defs.length})</h3>
                  <span class="badge badge-warning">${state.reviseTerms.length} flagged for revision</span>
                </div>

                <div class="flashcard-box" id="flashcard-flip-box">
                  <div>
                    <span class="kicker">${state.flashcardFlipped ? "SQA DEFINITION (CLICK CARD TO FLIP)" : "KEY TERM (CLICK CARD TO REVEAL DEFINITION)"}</span>
                    <h4 style="font-size:20px;margin:8px 0;">
                      ${escapeHtml(state.flashcardFlipped ? activeCard.definition : activeCard.term)}
                    </h4>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px;">
                    <span style="font-size:12.5px;color:var(--text-muted);">Click anywhere on card to flip</span>
                    <div style="display:flex;gap:8px;">
                      <button type="button" class="btn btn-outline btn-sm" id="btn-card-need-revise">
                        Flag "Need to revise"
                      </button>
                      <button type="button" class="btn btn-success btn-sm" id="btn-card-know-this">
                        ✓ I know this
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ` : ""}

            <!-- SIMPLE LESSON TASKS & CHECK YOUR UNDERSTANDING (Original Floot Sections) -->
            ${activeLesson.tasks && activeLesson.tasks.length ? `
              <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border);">
                <h3 style="font-size:17px;margin:0 0 10px 0;">✍️ Simple Lesson Tasks</h3>
                <div style="display:flex;flex-direction:column;gap:12px;">
                  ${activeLesson.tasks.map((t, idx) => {
                    const tKey = `${activeLesson.topic}|${activeLesson.title}|${idx}`;
                    const tAns = state.lessonTaskAnswers[tKey] || "";
                    const tRev = state.lessonTaskRevealed[tKey];
                    return `
                      <div class="side-card" style="background:#f8fafc;">
                        <strong style="font-size:13.5px;color:#7c3aed;">Task ${idx + 1}: ${escapeHtml(t.prompt)}</strong>
                        <textarea rows="2" data-lesson-task-input="${escapeHtml(tKey)}" placeholder="Write your answer first…" style="margin-top:6px;">${escapeHtml(tAns)}</textarea>
                        <div style="margin-top:6px;">
                          <button type="button" class="btn btn-outline btn-sm" data-check-lesson-task="${escapeHtml(tKey)}">
                            ${tRev ? "Hide Suggested Answer" : "Check Answer"}
                          </button>
                        </div>
                        ${tRev ? `
                          <div style="margin-top:8px;padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13.5px;">
                            <strong>Suggested answer:</strong> ${escapeHtml(t.answer)}
                          </div>
                        ` : ""}
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            ` : ""}

            ${activeLesson.check && activeLesson.check.length ? `
              <div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid var(--border);">
                <h4 style="margin:0 0 8px 0;font-size:15px;">✅ Check Your Understanding</h4>
                <ol style="margin:0;padding-left:20px;font-size:13.5px;line-height:1.6;">
                  ${activeLesson.check.map(c => `<li>${escapeHtml(c)}</li>`).join("")}
                </ol>
              </div>
            ` : ""}
          </article>
        </div>
      </section>
    `;
  }

  function renderMonthlyHomeworkSummaryTable(submissions) {
    const months = DATA.homeworkMonths || [];
    return `
      <div class="data-table-wrap" style="margin-bottom:16px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Completed</th>
              <th>Marks earned / total</th>
              <th>Accuracy on submitted work</th>
            </tr>
          </thead>
          <tbody>
            ${months.map(m => {
              const mQs = DATA.homework.filter(h => h.month === m);
              const doneQs = mQs.filter(h => submissions.some(s => s.questionId === h.id));
              const earned = doneQs.reduce((sum, h) => {
                const sub = submissions.find(s => s.questionId === h.id);
                return sum + Math.max(0, Math.min(Number(sub?.marks) || 0, Number(sub?.marksAvailable) || h.marks, h.marks));
              }, 0);
              const subMax = doneQs.reduce((sum, h) => sum + h.marks, 0);
              const totalMonthMax = mQs.reduce((sum, h) => sum + h.marks, 0);
              const acc = subMax ? Math.min(100, Math.round((earned / subMax) * 100)) : null;
              return `
                <tr>
                  <td><strong>${escapeHtml(m)}</strong></td>
                  <td>${doneQs.length}/${mQs.length}</td>
                  <td><strong>${earned}/${totalMonthMax}</strong></td>
                  <td>${acc === null ? `<span style="color:var(--text-muted);">Not submitted</span>` : `<span class="badge ${acc >= 70 ? "badge-success" : acc >= 50 ? "badge-warning" : "badge-danger"}">${acc}%</span>`}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPracticeTab() {
    const subtopics = ["All subtopics", ...(DATA.courseAreas[state.practiceTopic] || [])];
    const allYears = ["All years", ...[...new Set(DATA.questions.filter(q => q.topic === state.practiceTopic).map(q => String(q.sourceYear)))].sort()];
    const questions = getPracticeQuestions();
    const safeIdx = questions.length ? Math.min(state.practiceIdx, questions.length - 1) : 0;
    const currentQ = questions[safeIdx];
    const matchingLesson = currentQ
      ? DATA.lessons.find(l => l.topic === currentQ.topic && (l.title.toLowerCase() === (currentQ.subtopic || "").toLowerCase() || l.title.toLowerCase().includes((currentQ.subtopic || "").toLowerCase().split(" ")[0]))) || DATA.lessons.find(l => l.topic === currentQ.topic)
      : null;

    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div>
            <p class="kicker">TOPIC-ORGANISED SQA PAST-PAPER PRACTICE (2018–2026)</p>
            <h2 style="margin-bottom:4px;">Past-Paper &amp; Exam-Style Questions by Topic, Year &amp; Level</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:14px;">
              Filter by course area, subtopic, past paper year, and difficulty level (<strong>A — Challenge</strong>, <strong>B — Standard</strong>, <strong>C — Support</strong>).
            </p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:16px;">
          <div>
            <label style="font-size:12.5px;font-weight:600;">Course Area</label>
            <select id="prac-topic-select">
              ${Object.keys(DATA.courseAreas).map(t => `<option value="${escapeHtml(t)}" ${state.practiceTopic === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="font-size:12.5px;font-weight:600;">Subtopic</label>
            <select id="prac-subtopic-select">
              ${subtopics.map(s => `<option value="${escapeHtml(s)}" ${state.practiceSubtopic === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="font-size:12.5px;font-weight:600;">Past Paper Year</label>
            <select id="prac-year-select">
              ${allYears.map(y => `<option value="${escapeHtml(y)}" ${state.practiceYear === y ? "selected" : ""}>${escapeHtml(y === "All years" ? "All available years" : y)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="font-size:12.5px;font-weight:600;">Difficulty Level</label>
            <select id="prac-level-select">
              <option value="C" ${state.practiceLevel === "C" ? "selected" : ""}>Level C — Support</option>
              <option value="B" ${state.practiceLevel === "B" ? "selected" : ""}>Level B — Standard</option>
              <option value="A" ${state.practiceLevel === "A" ? "selected" : ""}>Level A — Challenge</option>
            </select>
          </div>
        </div>

        ${!currentQ ? `
          <div class="question-card">
            <p>No questions in this exact level/subtopic/year filter. Try switching Difficulty Level (A, B, or C), Year ("All available years"), or selecting "All subtopics".</p>
          </div>
        ` : `
          <div class="question-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <span class="badge badge-primary">Command word: ${escapeHtml(currentQ.primaryCommand.toUpperCase())}</span>
                <span class="badge">${currentQ.marks} ${currentQ.marks === 1 ? "mark" : "marks"}</span>
                <span class="badge">Level ${escapeHtml(currentQ.computedLevel || currentQ.level)}</span>
                <span class="badge">${escapeHtml(currentQ.subtopic)}</span>
                <span class="badge">Adapted practice · ${escapeHtml(String(currentQ.sourceYear))} · Q${escapeHtml(currentQ.sourceQuestion)}</span>
              </div>
              <span style="font-size:13px;font-weight:600;color:var(--text-muted);">
                Question ${safeIdx + 1} of ${questions.length}
              </span>
            </div>

            ${currentQ.paperUrl || currentQ.markingUrl ? `
              <div style="font-size:12.5px;margin-bottom:8px;">
                ${currentQ.paperUrl ? `<a href="${escapeHtml(currentQ.paperUrl)}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600;">Open original SQA paper ↗</a>` : ""}
                ${currentQ.paperUrl && currentQ.markingUrl ? " · " : ""}
                ${currentQ.markingUrl ? `<a href="${escapeHtml(currentQ.markingUrl)}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600;">Open official SQA marking instructions ↗</a>` : ""}
              </div>
            ` : ""}

            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin:8px 0 12px 0;"><h3 style="font-size:18px;margin:0;flex:1;">${escapeHtml(currentQ.text)}</h3><button type="button" class="btn btn-outline btn-sm" data-read-text="${escapeHtml(currentQ.text)}" title="Read question aloud">🔊 Read</button></div>

            <textarea
              id="prac-answer-box"
              rows="5"
              placeholder="Type your own SQA exam answer here…"
            >${escapeHtml(state.practiceAnswer)}</textarea>

            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:12px;">
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-primary" id="btn-mark-prac">
                  ✓ Submit Answer (SQA Auto-Marker)
                </button>
                <button type="button" class="btn btn-outline" id="btn-prac-hint">
                  ${state.practiceHint ? "Hide Hint" : "💡 Give me a hint"}
                </button>
                <button type="button" class="btn btn-outline" id="btn-prac-catchup">
                  ${state.practiceCatchup ? "Close catch-up lesson" : "📖 Catch up on this lesson"}
                </button>
              </div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="btn btn-outline btn-sm" id="btn-prev-prac">
                  ← Previous
                </button>
                <button type="button" class="btn btn-soft btn-sm" id="btn-next-prac">
                  Another Question →
                </button>
              </div>
            </div>

            ${state.practiceEmptyError ? `
              <div style="margin-top:10px;padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;font-size:13.5px;font-weight:600;">
                ${escapeHtml(state.practiceEmptyError)}
              </div>
            ` : ""}

            ${state.practiceHint ? `
              <div style="margin-top:12px;padding:12px;background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:8px;font-size:13.5px;">
                <strong>Hint:</strong> ${escapeHtml(currentQ.hint)}
              </div>
            ` : ""}

            ${state.practiceCatchup && matchingLesson ? `
              <div style="margin-top:14px;padding:16px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;">
                <span class="kicker">CATCH-UP MINI LESSON</span>
                <h4 style="margin:4px 0 6px 0;font-size:17px;">${escapeHtml(matchingLesson.title)}</h4>
                <p style="margin:0 0 10px 0;font-size:13.5px;color:var(--text-secondary);">${escapeHtml(matchingLesson.overview)}</p>
                <strong style="font-size:13px;">What you need to know:</strong>
                <ul class="point-list" style="font-size:13px;margin-top:4px;">
                  ${(matchingLesson.points || []).map(pt => `<li>${escapeHtml(pt)}</li>`).join("")}
                </ul>
                ${matchingLesson.example ? `<div style="margin-top:8px;font-size:13px;"><strong>Worked example:</strong> ${escapeHtml(matchingLesson.example)}</div>` : ""}
                ${matchingLesson.examTip ? `<div style="margin-top:6px;font-size:13px;color:#7c3aed;"><strong>Exam technique:</strong> ${escapeHtml(matchingLesson.examTip)}</div>` : ""}
              </div>
            ` : ""}

            ${renderFeedbackCard(state.practiceResult, currentQ)}
          </div>
        `}
      </section>
    `;
  }

  function renderCasesTab() {
    const activeCase = DATA.caseStudies.find(c => c.id === state.activeCaseId) || DATA.caseStudies[0];
    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
          <div>
            <p class="kicker">SQA-STYLE CASE STUDY PRACTICE</p>
            <h2 style="margin-bottom:4px;">Apply Knowledge to a Business Scenario</h2>
            <p style="margin:0;font-size:13.5px;color:var(--text-secondary);">Original practice scenarios aligned to National 5 content, command words and mark allocations.</p>
          </div>
          <span class="badge badge-primary">${DATA.caseStudies.length} Case Study Sets</span>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
          ${DATA.caseStudies.map(c => `
            <button
              type="button"
              class="btn ${activeCase.id === c.id ? "btn-primary" : "btn-outline"} btn-sm"
              data-select-case="${escapeHtml(c.id)}"
            >
              ${escapeHtml(c.title)}
            </button>
          `).join("")}
        </div>

        <div class="side-card" style="margin-bottom:16px;background:var(--surface-tint);border-color:#bfdbfe;">
          <span class="badge badge-primary">${escapeHtml(activeCase.focus)}</span>
          <h3 style="margin:8px 0 6px 0;">${escapeHtml(activeCase.title)}</h3>
          <p style="margin:0;font-size:14.5px;line-height:1.6;">${escapeHtml(activeCase.scenario)}</p>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          ${(activeCase.questions || []).map((q, idx) => {
            const key = `${activeCase.id}-${idx}`;
            const res = state.caseResults[key];
            const qText = q.text || q.q || "";
            const qGuidance = q.guidance || q.points || [];
            const myCaseAttempts = state.caseAttempts.filter(c => c.caseId === activeCase.id && c.questionIndex === idx && (c.userId === state.user?.userId || c.userName?.toLowerCase() === state.user?.name?.toLowerCase()));
            return `
              <div class="question-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;">
                  <strong style="font-size:16px;">${idx + 1}. ${escapeHtml(qText)}</strong>
                  <span class="badge badge-primary">${q.marks} marks</span>
                </div>
                ${q.hint ? `
                  <div style="margin-bottom:8px;">
                    <button type="button" class="btn btn-outline btn-sm" data-case-hint="${escapeHtml(key)}">
                      ${state.caseHints?.[key] ? "Hide hint" : "💡 Give me a hint"}
                    </button>
                    ${state.caseHints?.[key] ? `
                      <div style="margin-top:6px;padding:10px;background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:8px;font-size:13px;">
                        <strong>Hint:</strong> ${escapeHtml(q.hint)}
                      </div>
                    ` : ""}
                  </div>
                ` : ""}
                <textarea
                  rows="4"
                  data-case-input="${escapeHtml(key)}"
                  placeholder="Type your case-study answer linked to ${escapeHtml(activeCase.title)}…"
                >${escapeHtml(state.caseAnswers[key] || "")}</textarea>
                <div style="margin-top:8px;">
                  <button type="button" class="btn btn-primary btn-sm" data-mark-case="${escapeHtml(activeCase.id)}||${idx}">
                    ✓ ${myCaseAttempts.length ? "Submit Another Attempt" : "Mark This Attempt"}
                  </button>
                </div>
                ${state.caseEmptyErrors?.[key] ? `
                  <div style="margin-top:8px;padding:8px 10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;font-size:13px;font-weight:600;">
                    ${escapeHtml(state.caseEmptyErrors[key])}
                  </div>
                ` : ""}
                ${renderFeedbackCard(res, { marks: q.marks, acceptedPoints: qGuidance, solution: q.solution || qGuidance.map(g => `• ${g} (1)`).join("\n") })}
                ${myCaseAttempts.length > 0 ? `
                  <details style="margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid var(--border);font-size:13px;">
                    <summary style="font-weight:700;cursor:pointer;">Attempt history (${myCaseAttempts.length})</summary>
                    <div style="margin-top:8px;display:grid;gap:8px;">
                      ${myCaseAttempts.map((att, i) => `
                        <div style="padding-bottom:6px;border-bottom:1px solid #e2e8f0;">
                          <strong>Attempt ${myCaseAttempts.length - i}: ${att.marks}/${att.marksAvailable}</strong>
                          <small style="color:var(--text-muted);margin-left:8px;">${escapeHtml(att.createdAt)}</small>
                          <div style="margin-top:2px;">${escapeHtml(att.answer)}</div>
                        </div>
                      `).join("")}
                    </div>
                  </details>
                ` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderHomeworkTab() {
    const subs = getUserHwSubmissions();
    const monthQuestions = DATA.homework.filter(h => h.month === state.activeHwMonth);
    const monthTotalMarks = monthQuestions.reduce((s, h) => s + (Number(h.marks) || 0), 0);
    const monthDeadline = monthQuestions[0]?.deadline || "";

    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
          <div>
            <p class="kicker">HOMEWORK BOOKLET 2026–27</p>
            <h2 style="margin-bottom:4px;">Monthly Homework — Self Marking</h2>
            <p style="margin:0;font-size:13.5px;color:var(--text-secondary);">The 35 questions below match your supplied homework booklet. Answer from memory, submit each response, then use feedback based on the supplied solution booklet.</p>
          </div>
          <span class="badge badge-primary">35 questions · 79 marks</span>
        </div>

        ${renderMonthlyHomeworkSummaryTable(subs)}

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          ${DATA.homeworkMonths.map(m => `
            <button
              type="button"
              class="btn ${state.activeHwMonth === m ? "btn-primary" : "btn-outline"} btn-sm"
              data-select-hw-month="${escapeHtml(m)}"
            >
              ${escapeHtml(m)}
            </button>
          `).join("")}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:10px 14px;background:#f8fafc;border-radius:10px;border:1px solid var(--border);margin-bottom:14px;font-size:13.5px;">
          <strong>${escapeHtml(state.activeHwMonth)}</strong>
          <span>Deadline: <strong>${escapeHtml(monthDeadline)}</strong></span>
          <span>Total: <strong>${monthTotalMarks} marks</strong></span>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          ${monthQuestions.map(hw => {
            const existingSub = subs.find(s => s.questionId === hw.id);
            const ans = existingSub ? existingSub.answer : (state.hwAnswers[hw.id] || "");
            const qText = hw.text || hw.question || "";
            const qAccepted = hw.acceptedPoints || hw.points || [];
            const res = state.hwResults[hw.id] || (existingSub ? {
              marks: existingSub.marks,
              maxMarks: existingSub.marksAvailable || hw.marks,
              percentage: existingSub.percentage,
              feedback: existingSub.feedback,
              commandPassed: true,
              awardedPoints: existingSub.awardedPoints || [],
              improvements: existingSub.improvements || [],
              modelAnswer: hw.solution || qAccepted.map(p => `• ${p} (1)`).join("\n")
            } : null);

            return `
              <div class="question-card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                  <div>
                    <span class="badge badge-primary">QUESTION ${hw.number} · ${escapeHtml(hw.topic)}</span>
                    <span class="badge">${hw.marks} marks</span>
                    ${hw.year || hw.ref ? `<span class="badge">${escapeHtml(String(hw.year || ""))} ${escapeHtml(hw.ref || "")} ${hw.slide ? `· Slide ${hw.slide}` : ""}</span>` : ""}
                  </div>
                  ${existingSub ? `<span class="badge badge-success">✓ Submitted — Answer Locked (${existingSub.marks}/${hw.marks})</span>` : ""}
                </div>
                <h4 style="margin:8px 0;font-size:16.5px;">${escapeHtml(qText)}</h4>
                ${hw.context ? `
                  <div class="side-card" style="margin-bottom:10px;background:var(--surface-tint);border-color:#bfdbfe;font-size:13.5px;">
                    <strong>Case study extract:</strong>
                    <p style="margin:4px 0 0 0;">${escapeHtml(hw.context)}</p>
                  </div>
                ` : ""}
                ${qText.startsWith("Draw and label") ? `
                  <p style="font-size:12.5px;color:#b45309;background:#fffbeb;padding:8px 10px;border-radius:8px;border:1px solid #fde68a;">
                    Draw the diagram on paper first. Type the features and labels you included for an indicative online checklist, then ask your teacher to check the actual drawing.
                  </p>
                ` : ""}
                <textarea
                  rows="4"
                  data-hw-input="${escapeHtml(hw.id)}"
                  ${existingSub ? "disabled" : ""}
                  placeholder="Type your homework answer here…"
                >${escapeHtml(ans)}</textarea>
                ${!existingSub ? `
                  <div style="margin-top:8px;">
                    <button type="button" class="btn btn-primary btn-sm" data-submit-hw="${escapeHtml(hw.id)}">
                      ✓ Mark My Homework
                    </button>
                  </div>
                  ${state.hwEmptyErrors?.[hw.id] ? `
                    <div style="margin-top:8px;padding:8px 10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;font-size:13px;font-weight:600;">
                      ${escapeHtml(state.hwEmptyErrors[hw.id])}
                    </div>
                  ` : ""}
                ` : ""}
                ${renderFeedbackCard(res, { marks: hw.marks, acceptedPoints: qAccepted, markingRule: hw.markingRule, solution: hw.solution || qAccepted.map(p => `• ${p} (1)`).join("\n") })}
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderProgressTab(analytics) {
    const myAttempts = getUserAttempts();
    const myHw = getUserHwSubmissions();
    return `
      <section class="section-panel">
        <p class="kicker">YOUR PROGRESS</p>
        <h2 style="margin-bottom:6px;">See Where You Are Improving</h2>

        <div class="dashboard-top-grid" style="margin-bottom:18px;">
          <div class="stat-card">
            <span class="kicker">OVERALL PRACTICE AVERAGE</span>
            <h3 style="font-size:28px;margin:4px 0;">${analytics.avgPct}%</h3>
            <p style="margin:0;font-size:13px;color:var(--text-muted);">Across ${analytics.totalAttempts} marked practice &amp; drill attempts</p>
          </div>
          <div class="stat-card">
            <span class="kicker">WEAKEST COMMAND WORD</span>
            <h3 style="font-size:20px;margin:4px 0;">
              ${analytics.weakestCommands[0] ? `${escapeHtml(analytics.weakestCommands[0].label)} (${analytics.weakestCommands[0].average}%)` : "Complete a drill to diagnose"}
            </h3>
            ${analytics.weakestCommands[0] ? `
              <button type="button" class="btn btn-primary btn-sm" data-goto-drill="${analytics.weakestCommands[0].key}">
                Practise ${escapeHtml(analytics.weakestCommands[0].label)} Drill Now
              </button>
            ` : ""}
          </div>
          <div class="stat-card">
            <span class="kicker">WEAKEST SUBTOPIC</span>
            <h3 style="font-size:20px;margin:4px 0;">
              ${analytics.subtopicStats[0] ? `${escapeHtml(analytics.subtopicStats[0].subtopic)} (${analytics.subtopicStats[0].average}%)` : "No weak subtopics yet"}
            </h3>
            ${analytics.subtopicStats[0] ? `
              <button type="button" class="btn btn-outline btn-sm" data-open-lesson="${escapeHtml(analytics.subtopicStats[0].topic)}||${escapeHtml(analytics.subtopicStats[0].subtopic)}">
                Open Video &amp; Lesson Notes
              </button>
            ` : ""}
          </div>
        </div>

        <h3 style="font-size:17px;margin-bottom:8px;">Homework Marks by Month</h3>
        ${renderMonthlyHomeworkSummaryTable(myHw)}

        <h3 style="font-size:17px;margin-bottom:8px;">Course Areas Progress</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:20px;">
          ${Object.keys(DATA.courseAreas).map(topic => {
            const tAtt = myAttempts.filter(a => a.topic === topic);
            const tAvg = tAtt.length ? Math.round(tAtt.reduce((s, a) => s + (Number(a.percentage) || 0), 0) / tAtt.length) : 0;
            return `
              <div class="side-card" style="padding:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <strong style="font-size:14px;">${escapeHtml(topic)}</strong>
                  <span class="badge ${tAtt.length ? (tAvg >= 75 ? "badge-success" : tAvg >= 55 ? "badge-warning" : "badge-danger") : ""}">${tAtt.length ? tAvg + "%" : "Not started"}</span>
                </div>
                <div style="height:8px;border-radius:6px;background:#e2e8f0;overflow:hidden;margin-bottom:6px;">
                  <div style="height:100%;width:${tAvg}%;background:#7c3aed;"></div>
                </div>
                <small style="color:var(--text-muted);">${tAtt.length ? (tAvg < 60 ? "Priority for practice" : tAvg >= 80 ? "Strong area" : "Keep practising") : "Choose this topic to begin"}</small>
              </div>
            `;
          }).join("")}
        </div>

        <h3 style="font-size:17px;margin-bottom:8px;">Recent Marked Answers (${myAttempts.length})</h3>
        ${myAttempts.length === 0 ? `<p style="color:var(--text-muted);">No attempts recorded yet.</p>` : `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Topic &amp; Subtopic</th>
                  <th>Command Word</th>
                  <th>Score</th>
                  <th>Your Answer &amp; Feedback</th>
                </tr>
              </thead>
              <tbody>
                ${myAttempts.slice(0, 25).map(a => `
                  <tr>
                    <td><strong>${escapeHtml(a.subtopic || a.topic)}</strong><br/><small style="color:var(--text-muted);">${escapeHtml(a.topic)}</small></td>
                    <td><span class="badge badge-primary">${escapeHtml((a.primaryCommand || "describe").toUpperCase())}</span></td>
                    <td><strong>${a.marks}/${a.marksAvailable}</strong> (${a.percentage}%)</td>
                    <td>
                      <div style="font-size:13px;"><strong>Answer:</strong> ${escapeHtml(a.answer)}</div>
                      ${a.improvements?.length ? `<div style="font-size:12.5px;color:var(--warning);margin-top:3px;"><strong>To improve:</strong> ${escapeHtml(a.improvements[0])}</div>` : ""}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}
      </section>
    `;
  }

  function renderTeacherTab() {
    const visibleClasses = getVisibleClassesForTeacher();
    const visibleClassCodes = new Set(visibleClasses.map(c => String(c.code || "").toUpperCase()));
    const isOwnerTeacher = Boolean(
      state.user?.owner ||
      state.user?.role === "admin" ||
      (state.user?.name || "").toLowerCase().includes("straub")
    );
    const teacherScopedPupils = isOwnerTeacher || (state.user?.assignedClasses || []).includes("ALL")
      ? state.pupils
      : state.pupils.filter(p => visibleClassCodes.has(String(p.classCode || "").toUpperCase()));

    const searchQuery = (state.teacherSearchQuery || "").trim().toLowerCase();
    const classFilteredPupils = teacherScopedPupils.filter(p =>
      state.teacherClassFilter === "ALL" || p.classCode?.toUpperCase() === state.teacherClassFilter
    );
    const filteredPupils = classFilteredPupils.filter(p =>
      !searchQuery || p.name?.toLowerCase().includes(searchQuery) || p.classCode?.toLowerCase().includes(searchQuery)
    );

    const totalHwQuestions = DATA.homework.length || 35;

    // Enrich each pupil record with their exact practice, homework, and case study metrics (matching original Floot uu() dashboard)
    const enrichedPupils = filteredPupils.map(p => {
      const pAtt = state.attempts.filter(a => a.userId === p.userId || (a.userName?.toLowerCase() === p.name.toLowerCase()));
      const pHw = state.homeworkSubmissions.filter(s => s.userId === p.userId || (s.userName?.toLowerCase() === p.name.toLowerCase()));
      const pCs = state.caseAttempts.filter(c => c.userId === p.userId || (c.userName?.toLowerCase() === p.name.toLowerCase()));
      const avg = pAtt.length ? Math.round(pAtt.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / pAtt.length) : (p.practiceAverage ?? null);
      const hwEarned = pHw.reduce((x, y) => x + Math.max(0, Math.min(Number(y.marks) || 0, Number(y.marksAvailable) || 0)), 0);
      const hwAvail = pHw.reduce((x, y) => x + (Number(y.marksAvailable) || 0), 0);
      const hwAvg = hwAvail > 0 ? Math.round((hwEarned / hwAvail) * 100) : (pHw.length ? Math.round(pHw.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / pHw.length) : (p.homeworkAverage ?? null));
      const caseBest = pCs.length ? Math.max(...pCs.map(c => Math.round(((Number(c.marks) || 0) / Math.max(1, Number(c.marksAvailable) || 1)) * 100))) : null;
      const caseLatest = pCs.length ? Math.round(((Number(pCs[0].marks) || 0) / Math.max(1, Number(pCs[0].marksAvailable) || 1)) * 100) : null;
      const weakest = [...pAtt].sort((a, b) => a.percentage - b.percentage)[0];
      const weakSub = weakest ? (weakest.subtopic || weakest.topic) : (p.weakestSubtopic || "—");
      const weakCmd = weakest ? (weakest.primaryCommand || "describe") : (p.weakestCommand || "—");
      const lastAct = p.lastActiveAt || p.lastActivity || (pAtt[0]?.createdAt ? pAtt[0].createdAt : (pHw[0]?.submittedAt || "Not started"));
      return {
        ...p,
        pAtt,
        pHw,
        pCs,
        avg,
        hwAvg,
        caseBest,
        caseLatest,
        weakSub,
        weakCmd,
        lastAct
      };
    });

    const allFilteredAttempts = enrichedPupils.flatMap(p => p.pAtt);
    const avgPracticeAll = allFilteredAttempts.length
      ? Math.round(allFilteredAttempts.reduce((s, a) => s + (Number(a.percentage) || 0), 0) / allFilteredAttempts.length)
      : 0;
    const totalHwCount = enrichedPupils.reduce((s, p) => s + p.pHw.length, 0);
    const totalCsCount = enrichedPupils.reduce((s, p) => s + p.pCs.length, 0);
    const below50Count = enrichedPupils.filter(p => p.avg !== null && p.avg < 50).length;
    const notStartedCount = enrichedPupils.filter(p => p.pAtt.length === 0 && p.pHw.length === 0 && p.pCs.length === 0 && !p.practiceAttempts).length;

    const inspectedPupil = state.selectedPupilInspect && state.selectedPupilInspect !== "ALL"
      ? enrichedPupils.find(p => p.userId === state.selectedPupilInspect || p.name === state.selectedPupilInspect) ||
        (() => {
          const rawP = state.pupils.find(p => p.userId === state.selectedPupilInspect || p.name === state.selectedPupilInspect);
          if (!rawP) return null;
          const pAtt = state.attempts.filter(a => a.userId === rawP.userId || a.userName?.toLowerCase() === rawP.name.toLowerCase());
          const pHw = state.homeworkSubmissions.filter(s => s.userId === rawP.userId || s.userName?.toLowerCase() === rawP.name.toLowerCase());
          const pCs = state.caseAttempts.filter(c => c.userId === rawP.userId || c.userName?.toLowerCase() === rawP.name.toLowerCase());
          const avg = pAtt.length ? Math.round(pAtt.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / pAtt.length) : (rawP.practiceAverage ?? null);
          const hwAvg = pHw.length ? Math.round(pHw.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / pHw.length) : (rawP.homeworkAverage ?? null);
          return { ...rawP, pAtt, pHw, pCs, avg, hwAvg, caseBest: null, weakSub: rawP.weakestSubtopic || "—", weakCmd: rawP.weakestCommand || "—" };
        })()
      : null;

    return `
      <section class="section-panel">
        <!-- ORIGINAL FLOOT TEACHER DASHBOARD HEADER & CONTROLS -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
          <div>
            <p class="kicker">TEACHER DASHBOARD · SIGNED IN AS ${escapeHtml((state.user?.name || "Mrs Straub").toUpperCase())}</p>
            <h2 style="margin-bottom:4px;">${isOwnerTeacher ? "Teacher dashboard — class and pupil records" : `${escapeHtml(state.user?.name || "Teacher")}'s Class Dashboard`}</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:13.5px;">
              ${isOwnerTeacher
                ? "Each pupil appears once, linked to their signed-in account. Choose a class, then select a pupil from the dropdown (or click their name in the table) to inspect every saved answer, practice mark, and monthly homework result."
                : `Showing only your allocated &amp; added classes: <strong>${visibleClasses.map(c => escapeHtml(c.name)).join(", ") || "None yet"}</strong>. Select a pupil to inspect their saved answers, practice marks, and monthly homework.`}
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('manage-classes-teachers-panel')?.scrollIntoView({behavior:'smooth'})" style="border-color:#7c3aed;color:#6d28d9;font-weight:700;">
              ${isOwnerTeacher ? "🏫 Manage Classes &amp; Teachers" : "🏫 My Classes (+ Add Class)"}
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-export-csv">
              ⬇ Download selected class report (CSV)
            </button>
          </div>
        </div>

        <!-- CLASS & PUPIL DROPDOWN SELECTORS (Exact Original Floot Controls + Search) -->
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;padding:14px;background:#f8fafc;border-radius:12px;border:1px solid var(--border);">
          <div style="min-width:200px;flex:1;">
            <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:4px;">Class</label>
            <select id="teacher-class-filter" style="width:100%;padding:9px 11px;">
              <option value="ALL" ${state.teacherClassFilter === "ALL" ? "selected" : ""}>All my classes (${teacherScopedPupils.length} pupils)</option>
              ${visibleClasses.map(c => `<option value="${escapeHtml(c.code)}" ${state.teacherClassFilter === c.code ? "selected" : ""}>${escapeHtml(c.name)} (Code: ${escapeHtml(c.code)})</option>`).join("")}
            </select>
          </div>
          <div style="min-width:240px;flex:1.5;">
            <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:4px;">Pupil (Select to inspect all saved answers &amp; homework marks)</label>
            <select id="teacher-pupil-select" style="width:100%;padding:9px 11px;border-color:#7c3aed;font-weight:600;">
              <option value="ALL" ${!inspectedPupil ? "selected" : ""}>All pupils — Select a pupil to inspect individual answers…</option>
              ${classFilteredPupils.map(p => `<option value="${escapeHtml(p.userId)}" ${inspectedPupil?.userId === p.userId ? "selected" : ""}>${escapeHtml(p.name)} — ${escapeHtml(p.className || p.classCode)} (${escapeHtml(p.classCode)})</option>`).join("")}
            </select>
          </div>
          <div style="min-width:200px;flex:1;">
            <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:4px;">Search Pupil Name</label>
            <input
              type="text"
              id="teacher-pupil-search"
              placeholder="🔍 Type pupil name..."
              value="${escapeHtml(state.teacherSearchQuery || "")}"
              style="width:100%;padding:9px 11px;font-size:13.5px;"
            />
          </div>
        </div>

        <!-- CLASS OVERVIEW STATUS BANNER & SUMMARY METRICS (Original Floot Layout) -->
        <div role="status" style="padding:12px 14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;margin-bottom:12px;font-size:13.5px;">
          <strong>Class overview:</strong> ${below50Count} pupil${below50Count === 1 ? "" : "s"} currently average below 50% on practice questions; ${notStartedCount} pupil${notStartedCount === 1 ? " has" : "s have"} not started. These are indicators for teacher review, not predictions of exam grades.
        </div>

        <div style="display:flex;gap:24px;flex-wrap:wrap;padding:12px 16px;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;margin-bottom:18px;font-size:14px;">
          <strong>👥 ${enrichedPupils.length} pupils</strong>
          <strong>📝 ${allFilteredAttempts.length} practice attempts</strong>
          <strong>📊 ${allFilteredAttempts.length ? avgPracticeAll + "%" : "—"} practice average</strong>
          <strong>📅 ${totalHwCount} homework submissions</strong>
          <strong>🏢 ${totalCsCount} case attempts</strong>
        </div>

        ${inspectedPupil ? `
          <!-- INDIVIDUAL PUPIL FULL RECORD (Exact Original Floot Pupil Inspector + Monthly Homework Table + Expandable Answers) -->
          <div style="margin-bottom:24px;padding:20px;border-radius:14px;background:#f5f3ff;border:2px solid #7c3aed;box-shadow:0 6px 20px rgba(15,118,110,0.12);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
              <div>
                <span class="badge badge-primary" style="margin-bottom:4px;">INDIVIDUAL PUPIL RECORD &amp; SAVED ANSWERS</span>
                <h3 style="margin:0;font-size:21px;color:#0f172a;">
                  👤 ${escapeHtml(inspectedPupil.name)} — ${escapeHtml(inspectedPupil.className || inspectedPupil.classCode)} <span style="font-size:14px;font-weight:600;color:#7c3aed;">(Class Code: ${escapeHtml(inspectedPupil.classCode)})</span>
                </h3>
                <p style="margin:6px 0 0 0;font-size:14px;color:var(--text-secondary);">
                  Practice average: <strong>${inspectedPupil.avg === null ? "—" : inspectedPupil.avg + "%"}</strong> ·
                  Homework submitted: <strong>${inspectedPupil.pHw.length}/${totalHwQuestions}</strong> (${inspectedPupil.hwAvg === null ? "—" : inspectedPupil.hwAvg + "%"}) ·
                  Case-study best: <strong>${inspectedPupil.caseBest === null ? "—" : inspectedPupil.caseBest + "%"}</strong> ·
                  Priority area: <strong>${escapeHtml(inspectedPupil.weakSub)} (${escapeHtml(inspectedPupil.weakCmd)})</strong>.
                  All saved answers are shown below.
                </p>
              </div>
              <button type="button" class="btn btn-outline btn-sm" id="btn-close-pupil-inspect" style="background:#fff;">
                ✕ Close Pupil Record
              </button>
            </div>

            <!-- 1. MONTHLY HOMEWORK RESULTS BY MONTH TABLE (Original Floot is() table) -->
            <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #cbd5e1;margin-bottom:14px;">
              <h4 style="margin:0 0 8px 0;font-size:16px;">📅 Monthly Homework Results (${escapeHtml(inspectedPupil.name)})</h4>
              ${renderMonthlyHomeworkSummaryTable(inspectedPupil.pHw)}
              <p style="margin:0 0 12px 0;font-size:12.5px;color:var(--text-muted);">
                Every saved homework answer is listed below with the question, mark, feedback and suggested improvements.
              </p>

              <h4 style="margin:0 0 8px 0;font-size:15px;">Locked Homework Submissions (${inspectedPupil.pHw.length})</h4>
              ${inspectedPupil.pHw.length === 0 ? `
                <p style="margin:0;font-size:13px;color:var(--text-muted);">No homework submissions recorded for ${escapeHtml(inspectedPupil.name)} yet.</p>
              ` : `
                <div style="display:grid;gap:8px;">
                  ${inspectedPupil.pHw.map(h => {
                    const hwObj = DATA.homework.find(item => item.id === h.questionId);
                    const qTitle = hwObj ? `Q${hwObj.number} (${hwObj.month} · ${hwObj.topic})` : (h.month ? `${h.month} · ${h.topic || h.questionId}` : h.questionId);
                    const qPrompt = hwObj?.text || hwObj?.question || "";
                    return `
                      <details open style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13.5px;">
                        <summary style="font-weight:700;cursor:pointer;">
                          ${escapeHtml(qTitle)} — <span class="badge ${(h.percentage || 0) >= 70 ? "badge-success" : (h.percentage || 0) >= 50 ? "badge-warning" : "badge-danger"}">${h.marks ?? 0}/${h.marksAvailable ?? hwObj?.marks ?? "—"} (${h.percentage ?? 0}%)</span> — <span style="font-weight:400;color:var(--text-muted);font-size:12px;">${escapeHtml(h.submittedAt || "—")}</span>
                        </summary>
                        ${qPrompt ? `<p style="margin:6px 0 4px 0;"><strong>Question:</strong> ${escapeHtml(qPrompt)}</p>` : ""}
                        <p style="margin:6px 0;padding:8px 10px;background:#ffffff;border-left:3px solid #7c3aed;border-radius:6px;white-space:pre-wrap;"><strong>Saved pupil answer:</strong><br/>${escapeHtml(h.answer || "—")}</p>
                        ${Array.isArray(h.awardedPoints) && h.awardedPoints.length > 0 ? `<p style="margin:4px 0;color:#15803d;"><strong>✓ Credited points:</strong> ${escapeHtml(h.awardedPoints.join(" · "))}</p>` : ""}
                        ${h.feedback ? `<p style="margin:4px 0;color:#7c3aed;"><strong>Feedback:</strong> ${escapeHtml(h.feedback)}</p>` : ""}
                        ${Array.isArray(h.improvements) && h.improvements.length > 0 ? `<p style="margin:4px 0;color:#b45309;background:#fffbeb;padding:6px 8px;border-radius:6px;border:1px solid #fde68a;"><strong>→ What to improve / Next steps:</strong> ${escapeHtml(h.improvements.join(" "))}</p>` : ""}
                      </details>
                    `;
                  }).join("")}
                </div>
              `}
            </div>

            <!-- 2. PRACTICE & COMMAND DRILL ANSWERS -->
            <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #cbd5e1;margin-bottom:14px;">
              <h4 style="margin:0 0 10px 0;font-size:16px;">📝 Practice &amp; Command Drill Answers (${inspectedPupil.pAtt.length})</h4>
              ${inspectedPupil.pAtt.length === 0 ? `
                <p style="margin:0;font-size:13px;color:var(--text-muted);">No practice attempts recorded for ${escapeHtml(inspectedPupil.name)} yet.</p>
              ` : `
                <div style="display:grid;gap:8px;max-height:420px;overflow-y:auto;">
                  ${inspectedPupil.pAtt.map(a => {
                    const qObj = DATA.questions.find(q => q.id === a.questionId);
                    return `
                      <details open style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13.5px;">
                        <summary style="font-weight:700;cursor:pointer;">
                          ${escapeHtml(qObj?.topic || a.topic || "Topic")} / ${escapeHtml(a.subtopic || qObj?.subtopic || a.questionId)} — <span class="badge ${(a.percentage || 0) >= 70 ? "badge-success" : (a.percentage || 0) >= 50 ? "badge-warning" : "badge-danger"}">${a.marks}/${a.marksAvailable} (${a.percentage}%)</span> — <span style="font-weight:400;color:var(--text-muted);font-size:12px;">${escapeHtml(a.createdAt || "—")}</span>
                        </summary>
                        <p style="margin:6px 0 4px 0;"><strong>Question:</strong> ${escapeHtml(qObj?.text || a.questionId)}</p>
                        <p style="margin:4px 0;"><strong>Command word:</strong> <span class="badge badge-primary">${escapeHtml((a.primaryCommand || qObj?.primaryCommand || "describe").toUpperCase())}</span> · <strong>Hint used:</strong> ${a.hintUsed ? "Yes" : "No"}</p>
                        <p style="margin:6px 0;padding:8px 10px;background:#ffffff;border-left:3px solid #7c3aed;border-radius:6px;white-space:pre-wrap;"><strong>Saved pupil answer:</strong><br/>${escapeHtml(a.answer || "")}</p>
                        ${Array.isArray(a.awardedPoints) && a.awardedPoints.length > 0 ? `<p style="margin:4px 0;color:#15803d;"><strong>✓ Credited points:</strong> ${escapeHtml(a.awardedPoints.join(" · "))}</p>` : ""}
                        ${a.feedback ? `<p style="margin:4px 0;color:#7c3aed;"><strong>Feedback:</strong> ${escapeHtml(a.feedback)}</p>` : ""}
                        ${a.improvements?.length ? `<p style="margin:4px 0;color:#b45309;background:#fffbeb;padding:6px 8px;border-radius:6px;border:1px solid #fde68a;"><strong>→ What to improve / Next steps:</strong> ${escapeHtml(a.improvements.join(" "))}</p>` : ""}
                      </details>
                    `;
                  }).join("")}
                </div>
              `}
            </div>

            <!-- 3. CASE-STUDY RETRIES -->
            <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #cbd5e1;">
              <h4 style="margin:0 0 8px 0;font-size:16px;">🏢 Case-Study Retries (${inspectedPupil.pCs.length})</h4>
              ${inspectedPupil.pCs.length === 0 ? `
                <p style="margin:0;font-size:13px;color:var(--text-muted);">No case-study attempts recorded for ${escapeHtml(inspectedPupil.name)} yet.</p>
              ` : `
                <div style="display:grid;gap:8px;">
                  ${inspectedPupil.pCs.map(c => {
                    const csObj = DATA.caseStudies.find(item => item.id === c.caseId);
                    const csQ = csObj?.questions?.[c.questionIndex];
                    return `
                      <details open style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13.5px;">
                        <summary style="font-weight:700;cursor:pointer;">
                          ${escapeHtml(csObj?.title || c.caseId)} Q${(c.questionIndex || 0) + 1} — ${c.marks}/${c.marksAvailable} — ${escapeHtml(c.createdAt || "—")}
                        </summary>
                        ${csQ ? `<p style="margin:6px 0 4px 0;"><strong>Question:</strong> ${escapeHtml(csQ.text || csQ.q || "")}</p>` : ""}
                        <p style="margin:4px 0;white-space:pre-wrap;"><strong>Saved answer:</strong> ${escapeHtml(c.answer || "")}</p>
                      </details>
                    `;
                  }).join("")}
                </div>
              `}
            </div>
          </div>
        ` : ""}

        <!-- PUPIL ROSTER TABLE (Exact 6 Original Columns + Action Button) -->
        <div class="data-table-wrap" style="margin-bottom:24px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Pupil / class</th>
                <th>Practice</th>
                <th>Homework</th>
                <th>Case studies</th>
                <th>Priority / command</th>
                <th>Last activity</th>
                <th>Inspect Pupil</th>
              </tr>
            </thead>
            <tbody>
              ${enrichedPupils.length === 0 ? `
                <tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No pupils in this class yet. Pupils appear after joining with their class code.</td></tr>
              ` : enrichedPupils.map(p => {
                const isSelected = inspectedPupil?.userId === p.userId;
                const hintsCount = p.pAtt.filter(v => v.hintUsed).length;
                return `
                  <tr style="${isSelected ? "background:#ccfbf1;" : ""}">
                    <td>
                      <button type="button" data-inspect-pupil="${escapeHtml(p.userId)}" style="background:none;border:none;padding:0;color:#7c3aed;font-weight:800;font-size:14.5px;cursor:pointer;text-decoration:underline;text-align:left;">
                        ${escapeHtml(p.name)}
                      </button>
                      <small style="display:block;color:var(--text-muted);">${escapeHtml(p.className || p.classCode)} (${escapeHtml(p.classCode)})</small>
                    </td>
                    <td>
                      <strong>${p.pAtt.length} attempts</strong> · ${p.avg !== null ? `<span class="badge ${p.avg >= 70 ? "badge-success" : p.avg >= 50 ? "badge-warning" : "badge-danger"}">${p.avg}%</span>` : "—"}
                      <small style="display:block;color:var(--text-muted);">${hintsCount} hints</small>
                    </td>
                    <td>
                      <strong>${p.pHw.length}/${totalHwQuestions}</strong> · ${p.hwAvg !== null ? `<span class="badge ${p.hwAvg >= 70 ? "badge-success" : p.hwAvg >= 50 ? "badge-warning" : "badge-danger"}">${p.hwAvg}%</span>` : "—"}
                    </td>
                    <td>
                      ${p.pCs.length} attempts · best ${p.caseBest === null ? "—" : p.caseBest + "%"}
                      <small style="display:block;color:var(--text-muted);">Latest ${p.caseLatest === null ? "—" : p.caseLatest + "%"}</small>
                    </td>
                    <td>
                      <strong>${escapeHtml(p.weakSub)}</strong>
                      <small style="display:block;color:var(--text-muted);">${escapeHtml(p.weakCmd)}</small>
                    </td>
                    <td style="font-size:12px;color:var(--text-muted);">${escapeHtml(p.lastAct)}</td>
                    <td>
                      <button type="button" class="btn btn-soft btn-sm" data-inspect-pupil="${escapeHtml(p.userId)}" style="white-space:nowrap;">
                        ${isSelected ? "✓ Viewing Record" : "📋 View Answers & Marks"}
                      </button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>

        <!-- MANAGE CLASSES, CLASS LISTS & ROSTER IMPORT (Original Floot Sections) -->
        <div class="two-col-layout">
          <div class="side-card">
            <h3 style="font-size:16px;margin-bottom:6px;">Manage Classes &amp; Class Lists</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin:0 0 10px 0;">
              Signed in as <strong>${escapeHtml(state.user?.name || "Mrs Straub")}</strong>. Create classes or expand a class below to view its join code and pupil list:
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
              <input type="text" id="new-class-name" placeholder="Class name, e.g. 4B1" value="${escapeHtml(state.newClassName)}" style="flex:1;" />
              <input type="text" id="new-class-code" placeholder="Unique class code" value="${escapeHtml(state.newClassCode)}" style="flex:1;" />
              <button type="button" class="btn btn-primary btn-sm" id="btn-save-class">Save new class</button>
            </div>
            <div style="display:grid;gap:8px;">
              ${state.classes.map(c => {
                const clsPupils = state.pupils.filter(p => p.classCode?.toUpperCase() === c.code?.toUpperCase());
                return `
                  <details style="padding:8px 12px;background:#f8fafc;border:1px solid var(--border);border-radius:8px;font-size:13.5px;">
                    <summary style="font-weight:700;cursor:pointer;">${escapeHtml(c.name)} · ${clsPupils.length} pupils</summary>
                    <p style="margin:6px 0;">Join code: <strong>${escapeHtml(c.code)}</strong> (share privately with this class)</p>
                    <ul style="margin:0;padding-left:18px;">
                      ${clsPupils.map(p => `<li><button type="button" data-inspect-pupil="${escapeHtml(p.userId)}" style="background:none;border:none;padding:0;color:#7c3aed;text-decoration:underline;cursor:pointer;">${escapeHtml(p.name)}</button></li>`).join("")}
                    </ul>
                  </details>
                `;
              }).join("")}
            </div>
          </div>

          <div class="side-card">
            <h3 style="font-size:16px;margin-bottom:6px;">Import Additional Pupils &amp; Class Codes</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin:0 0 8px 0;">
              Paste lines of <code>Pupil Name, Class Code</code> to add more pupils to your class lists:
            </p>
            <textarea
              id="import-csv-box"
              rows="3"
              placeholder="Jamie Smith, 4GBM1&#10;Ava MacLeod, 4FBM2"
            >${escapeHtml(state.importCsvText)}</textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
              <button type="button" class="btn btn-soft btn-sm" id="btn-import-roster">
                ✓ Import Class Codes &amp; Pupils
              </button>
              ${state.importStatusMsg ? `<span style="font-size:12.5px;color:var(--success);font-weight:600;">${escapeHtml(state.importStatusMsg)}</span>` : ""}
            </div>
          </div>
        </div>
        <!-- CLASS FULL TRACKING SHEET (CSV IMPORT / LIVE EDIT / EXPORT) -->
        <div class="side-card" style="margin-top:20px;background:#ffffff;border:2px solid var(--border-strong);">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
            <div>
              <p class="kicker" style="margin:0;">CLASS TRACKING &amp; MONITORING</p>
              <h3 style="margin:2px 0 0 0;">📋 Full Class Tracking Sheet (Import, Update &amp; Export)</h3>
              <p style="margin:4px 0 0 0;font-size:13px;color:var(--text-muted);">Import your Excel / Google Sheets tracking CSV, update grades, prelims, assignment marks &amp; notes right here (auto-saves), and export back to CSV anytime.</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;" class="no-print">
              <label class="btn btn-primary btn-sm" style="cursor:pointer;margin:0;">
                📥 Import Tracking CSV
                <input type="file" id="tracking-csv-file" accept=".csv,text/csv" style="display:none;" />
              </label>
              <button type="button" class="btn btn-soft btn-sm" id="btn-export-tracking-csv">📤 Export CSV</button>
              <button type="button" class="btn btn-outline btn-sm" id="btn-add-tracking-row">➕ Add Pupil</button>
            </div>
          </div>

          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;" class="no-print">
            <label style="font-size:13px;font-weight:700;">Filter Class:</label>
            <select id="tracking-class-filter" style="width:auto;min-width:140px;padding:6px 10px;">
              <option value="All" ${state.trackingClassFilter === "All" ? "selected" : ""}>All My Classes</option>
              ${visibleClasses.map(c => `<option value="${escapeHtml(c.name)}" ${state.trackingClassFilter === c.name ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
            </select>
            <span id="tracking-save-status" style="font-size:12.5px;color:var(--primary);font-weight:600;">✓ Auto-saved on this device</span>
          </div>

          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Pupil Name</th>
                  <th>Class</th>
                  <th>Target</th>
                  <th>Working</th>
                  <th>Prelim %</th>
                  <th>Assignment /30</th>
                  <th>Effort</th>
                  <th>Teacher Notes / Next Steps</th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  const basePupils = (state.pupils || []).map(p => ({
                    key: (p.name || "").trim().toLowerCase(),
                    name: p.name,
                    className: p.className || p.classCode || ""
                  }));
                  const extraKeys = Object.keys(state.trackingRecords || {}).filter(k => !basePupils.some(p => p.key === k));
                  const allRows = [
                    ...basePupils,
                    ...extraKeys.map(k => ({
                      key: k,
                      name: state.trackingRecords[k]?.name || k,
                      className: state.trackingRecords[k]?.className || ""
                    }))
                  ].filter(r => {
                    const clsUpper = (r.className || "").toUpperCase();
                    const inTeacherScope = isOwnerTeacher || (state.user?.assignedClasses || []).includes("ALL") || [...visibleClassCodes].some(c => clsUpper.includes(c));
                    const matchesFilter = state.trackingClassFilter === "All" || clsUpper.includes(state.trackingClassFilter);
                    return inTeacherScope && matchesFilter;
                  });

                  return allRows.map(r => {
                    const rec = (state.trackingRecords || {})[r.key] || {};
                    const cls = rec.className || r.className || "";
                    return `
                      <tr>
                        <td style="font-weight:700;white-space:nowrap;">${escapeHtml(rec.name || r.name)}</td>
                        <td><input type="text" data-track-key="${escapeHtml(r.key)}" data-track-field="className" value="${escapeHtml(cls)}" style="min-width:68px;padding:5px 7px;font-size:13px;" /></td>
                        <td><input type="text" data-track-key="${escapeHtml(r.key)}" data-track-field="target" value="${escapeHtml(rec.target || "")}" placeholder="A/B/C" style="min-width:58px;padding:5px 7px;font-size:13px;" /></td>
                        <td><input type="text" data-track-key="${escapeHtml(r.key)}" data-track-field="working" value="${escapeHtml(rec.working || "")}" placeholder="A/B/C" style="min-width:58px;padding:5px 7px;font-size:13px;" /></td>
                        <td><input type="text" data-track-key="${escapeHtml(r.key)}" data-track-field="prelim" value="${escapeHtml(rec.prelim || "")}" placeholder="%" style="min-width:64px;padding:5px 7px;font-size:13px;" /></td>
                        <td><input type="text" data-track-key="${escapeHtml(r.key)}" data-track-field="assignment" value="${escapeHtml(rec.assignment || "")}" placeholder="/30" style="min-width:64px;padding:5px 7px;font-size:13px;" /></td>
                        <td><input type="text" data-track-key="${escapeHtml(r.key)}" data-track-field="effort" value="${escapeHtml(rec.effort || "")}" placeholder="1-4" style="min-width:58px;padding:5px 7px;font-size:13px;" /></td>
                        <td><input type="text" data-track-key="${escapeHtml(r.key)}" data-track-field="notes" value="${escapeHtml(rec.notes || "")}" placeholder="Notes / interventions..." style="min-width:170px;padding:5px 7px;font-size:13px;" /></td>
                      </tr>
                    `;
                  }).join("");
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <!-- MANAGE CLASSES & TEACHER ACCOUNTS -->
        <div id="manage-classes-teachers-panel" style="margin-top:22px;padding:18px;border-radius:14px;background:#f8fafc;border:1.5px solid #cbd5e1;">
          <h3 style="margin:0 0 6px 0;font-size:17px;color:#2e1065;">🏫 Manage Classes &amp; Teacher Accounts</h3>
          <p style="margin:0 0 14px 0;font-size:13.5px;color:var(--text-secondary);">
            Add new classes for pupils to join, and create personal teacher accounts so other Business teachers can sign in with their own name &amp; PIN to view their classes.
          </p>

          <!-- Add New Class -->
          <div style="padding:14px;background:#fff;border-radius:10px;border:1px solid var(--border);margin-bottom:14px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px;">➕ Add a New Class</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <input type="text" id="new-class-name" placeholder="Class name (e.g. 4HBM1)" style="flex:1;min-width:160px;padding:8px 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:13.5px;" />
              <input type="text" id="new-class-code" placeholder="Join code (e.g. 4HBM1)" style="flex:1;min-width:140px;padding:8px 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:13.5px;" />
              <button type="button" class="btn btn-primary btn-sm" id="btn-add-class">➕ Add Class</button>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
              ${visibleClasses.map(c => `
                <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#f5f3ff;border:1px solid #c4b5fd;font-size:12.5px;font-weight:600;color:#4c1d95;">
                  ${escapeHtml(c.name)} (Code: ${escapeHtml(c.code)})
                  ${(isOwnerTeacher || c.createdBy === state.user?.name) && !["4GBM", "4CBM", "4FBM", "ABCD"].includes(String(c.code).toUpperCase()) ? `<button type="button" data-remove-class="${escapeHtml(c.id)}" style="border:none;background:none;color:#dc2626;cursor:pointer;font-weight:800;padding:0 2px;" title="Remove class">✕</button>` : ""}
                </span>
              `).join("")}
            </div>
          </div>

          ${isOwnerTeacher ? `
            <!-- Manage Teacher Accounts (Owner Only) -->
            <div style="padding:14px;background:#fff;border-radius:10px;border:1px solid var(--border);">
              <div style="font-weight:700;font-size:14px;margin-bottom:6px;">👩‍🏫 Teacher Accounts (Give Other Teachers Their Own Login)</div>
              <p style="margin:0 0 10px 0;font-size:12.5px;color:var(--text-secondary);">
                Other teachers can sign in using the private teacher link (<code>?teacher=1</code>) <strong>or</strong> directly on the main app login screen by entering their Name and Personal PIN.
              </p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
                <input type="text" id="new-teacher-name" placeholder="Teacher name (e.g. Mr Smith)" style="flex:1.2;min-width:150px;padding:8px 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:13.5px;" />
                <input type="text" id="new-teacher-pin" placeholder="Personal PIN (e.g. 4821)" style="flex:0.8;min-width:120px;padding:8px 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:13.5px;" />
                <input type="text" id="new-teacher-class" placeholder="Starting class (optional, e.g. 4HBM1)" style="flex:1.1;min-width:170px;padding:8px 10px;border-radius:8px;border:1px solid #cbd5e1;font-size:13.5px;" />
                <button type="button" class="btn btn-primary btn-sm" id="btn-add-teacher">➕ Add Teacher</button>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${(state.teachers || []).map(t => `
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 12px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;">
                    <div>
                      <strong>${escapeHtml(t.name)}</strong> ${t.isOwner ? `<span class="badge badge-primary" style="margin-left:4px;">Lead Teacher</span>` : ""}
                      · PIN: <code>${escapeHtml(t.pin)}</code>
                      · Classes: <strong>${(t.assignedClasses || []).includes("ALL") ? "All classes" : ((t.assignedClasses || []).length ? escapeHtml(t.assignedClasses.join(", ")) : "No classes yet (can add own)")}</strong>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                      ${!t.isOwner ? `<button type="button" class="btn btn-outline btn-sm" data-copy-teacher-link="${escapeHtml(t.id)}" style="color:#7c3aed;border-color:#c4b5fd;">📋 Copy Personal Link</button>` : ""}
                      ${!t.isOwner ? `<button type="button" class="btn btn-outline btn-sm" data-remove-teacher="${escapeHtml(t.id)}" style="color:#dc2626;border-color:#fca5a5;">Remove</button>` : ""}
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ""}
        </div>
      </section>
    `;
  }

  function speakText(text) {
    if (!("speechSynthesis" in window)) {
      alert("Read-aloud is not supported on this browser.");
      return;
    }
    if (window.speechSynthesis.speaking && state.speakingText === text) {
      window.speechSynthesis.cancel();
      state.speakingText = "";
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-GB";
    utter.rate = 0.96;
    state.speakingText = text;
    utter.onend = () => { state.speakingText = ""; };
    window.speechSynthesis.speak(utter);
  }

  function startMiniExam() {
    if (state.examTimerId) clearInterval(state.examTimerId);
    const pool = [...(DATA.questions || [])].sort(() => Math.random() - 0.5);
    const picked = [];
    let totalM = 0;
    for (const q of pool) {
      if (picked.length >= 4 || totalM >= 10) break;
      picked.push(q);
      totalM += (Number(q.marks) || 1);
    }
    state.examQuestions = picked;
    state.examAnswers = {};
    state.examResults = null;
    state.examSecondsLeft = 900; // 15 mins
    state.examRunning = true;
    state.activeTab = "exam";
    state.examTimerId = setInterval(() => {
      if (!state.examRunning) return;
      state.examSecondsLeft = Math.max(0, state.examSecondsLeft - 1);
      const el = document.getElementById("exam-timer-display");
      if (el) {
        const m = String(Math.floor(state.examSecondsLeft / 60)).padStart(2, "0");
        const s = String(state.examSecondsLeft % 60).padStart(2, "0");
        el.textContent = `${m}:${s}`;
      }
      if (state.examSecondsLeft === 0) {
        clearInterval(state.examTimerId);
        state.examRunning = false;
      }
    }, 1000);
    render();
  }

  function renderMiniExamTab() {
    if (!state.examQuestions.length) {
      return `
        <section class="section-panel">
          <p class="kicker">TIMED SQA MINI-EXAM SPRINT</p>
          <h2>⏱️ 10-Mark Timed SQA Exam Sprint (15 Minutes)</h2>
          <p style="color:var(--text-secondary);font-size:14px;">Practise real SQA exam timing! You will get a random 10+ mark set of SQA past-paper questions with a 15-minute countdown timer, instant auto-marking, and an estimated SQA Grade Band (A–D).</p>
          <button type="button" class="btn btn-primary" id="btn-start-mini-exam">⏱️ Start 15-Minute SQA Sprint</button>
        </section>
      `;
    }
    const mins = String(Math.floor(state.examSecondsLeft / 60)).padStart(2, "0");
    const secs = String(state.examSecondsLeft % 60).padStart(2, "0");
    const totalMarks = state.examQuestions.reduce((s, q) => s + (Number(q.marks) || 1), 0);
    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <p class="kicker">TIMED SQA MINI-EXAM SPRINT</p>
            <h2 style="margin:0;">⏱️ ${totalMarks}-Mark SQA Sprint</h2>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="badge badge-primary" style="font-size:15px;padding:6px 14px;">⏱️ <span id="exam-timer-display">${mins}:${secs}</span></span>
            <button type="button" class="btn btn-outline btn-sm" id="btn-start-mini-exam">↻ New Sprint</button>
          </div>
        </div>

        ${state.examResults ? `
          <div class="feedback-box ${state.examResults.pct >= 70 ? "full-marks" : state.examResults.pct >= 50 ? "partial-marks" : "zero-marks"}" style="margin-bottom:16px;">
            <h3 style="margin:0 0 6px 0;">SQA Sprint Result: ${state.examResults.earned} / ${state.examResults.total} marks (${state.examResults.pct}%) — Estimated SQA Band: ${state.examResults.grade}</h3>
            <p style="margin:0;font-size:13.5px;">Review your individual SQA model answers below to see how to push into Grade A (70%+).</p>
          </div>
        ` : ""}

        <div style="display:flex;flex-direction:column;gap:14px;">
          ${state.examQuestions.map((q, idx) => {
            const ans = state.examAnswers[q.id] || "";
            const res = state.examResults?.items?.[idx] || null;
            return `
              <div class="question-card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                  <div>
                    <span class="badge badge-primary">Q${idx + 1} · ${escapeHtml((q.primaryCommand || "").toUpperCase())}</span>
                    <span class="badge">${q.marks} ${q.marks === 1 ? "mark" : "marks"}</span>
                    <span class="badge">${escapeHtml(q.topic)}</span>
                  </div>
                  <button type="button" class="btn btn-outline btn-sm" data-read-text="${escapeHtml(q.text)}">🔊 Read Aloud</button>
                </div>
                <h4 style="margin:6px 0 10px 0;font-size:16px;">${escapeHtml(q.text)}</h4>
                <textarea rows="4" data-exam-input="${escapeHtml(q.id)}" placeholder="Type your SQA exam answer here...">${escapeHtml(ans)}</textarea>
                ${res ? renderFeedbackCard(res, q) : ""}
              </div>
            `;
          }).join("")}
        </div>

        ${!state.examResults ? `
          <div style="margin-top:16px;">
            <button type="button" class="btn btn-primary" id="btn-submit-mini-exam" style="width:100%;padding:13px;font-size:15px;">
              ✓ Finish &amp; Mark My SQA Sprint
            </button>
          </div>
        ` : ""}
      </section>
    `;
  }

  function getAllFlashcards() {
    const cards = [];
    (DATA.lessons || []).forEach(l => {
      (l.definitions || []).forEach(d => {
        if (d && d.term && d.meaning) {
          cards.push({ topic: l.topic || "Understanding Business", subtopic: l.title || "", term: d.term, meaning: d.meaning });
        }
      });
    });
    return cards;
  }

  function renderFlashcardsTab() {
    const allCards = getAllFlashcards();
    const filtered = state.flashcardTopic === "All"
      ? allCards
      : allCards.filter(c => c.topic === state.flashcardTopic);
    const safeIdx = filtered.length ? Math.max(0, Math.min(state.flashcardIndex, filtered.length - 1)) : 0;
    const card = filtered[safeIdx];
    const masteredSet = new Set(state.masteredTerms || []);
    const masteredCount = filtered.filter(c => masteredSet.has(c.term)).length;

    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
          <div>
            <p class="kicker">QUICK-FIRE SQA DEFINITIONS · TAP CARD TO FLIP</p>
            <h2 style="margin:0 0 4px 0;">🃏 Key Term Flashcards</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:13.5px;">Master essential SQA National 5 Business Management definitions in 5-minute bursts.</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select id="flashcard-topic-select" style="padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:13.5px;">
              <option value="All" ${state.flashcardTopic === "All" ? "selected" : ""}>All 5 Course Areas (${allCards.length})</option>
              ${Object.keys(DATA.courseAreas).map(t => `<option value="${escapeHtml(t)}" ${state.flashcardTopic === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
            </select>
            <span class="badge badge-success">✅ Mastered: ${masteredCount} / ${filtered.length}</span>
          </div>
        </div>

        ${card ? `
          <div id="flashcard-box" style="cursor:pointer;min-height:220px;padding:28px 22px;border-radius:18px;background:${state.flashcardFlipped ? "#f5f3ff" : "linear-gradient(135deg,#6d28d9,#4c1d95)"};color:${state.flashcardFlipped ? "#2e1065" : "#ffffff"};border:2px solid #7c3aed;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;box-shadow:0 8px 24px rgba(109,40,217,0.16);transition:all 0.2s ease;">
            <span style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;opacity:0.85;margin-bottom:10px;">
              ${escapeHtml(card.topic)} · Card ${safeIdx + 1} of ${filtered.length} · ${state.flashcardFlipped ? "SQA DEFINITION" : "KEY TERM (TAP TO FLIP)"}
            </span>
            <div style="font-size:${state.flashcardFlipped ? "17px" : "24px"};font-weight:${state.flashcardFlipped ? "600" : "800"};line-height:1.45;max-width:620px;">
              ${escapeHtml(state.flashcardFlipped ? card.meaning : card.term)}
            </div>
            ${masteredSet.has(card.term) ? `<span class="badge badge-success" style="margin-top:14px;">✅ Mastered</span>` : ""}
          </div>

          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
            <button type="button" class="btn btn-outline btn-sm" id="btn-fc-prev">← Previous</button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-fc-revise" style="border-color:#f59e0b;color:#b45309;font-weight:700;">🔁 Revise Again</button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-fc-gotit" style="background:#16a34a;border-color:#16a34a;">✅ Got It! (+5 XP)</button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-fc-next">Next →</button>
          </div>
        ` : `<p>No flashcards found for this topic.</p>`}
      </section>
    `;
  }

  function renderAssignmentTab() {
    const sections = [
      {
        id: "intro",
        title: "1. Title & Introduction (2 marks)",
        marks: "2 marks",
        items: [
          { id: "a1", text: "State the name of the real business/organisation you are researching." },
          { id: "a2", text: "State a clear, specific purpose/objective for your report (e.g. 'To investigate how [Business] uses marketing to attract customers')." }
        ],
        tip: "SQA Tip: Keep your title focused on ONE clear business topic (e.g. Marketing, Customer Service, or HR) — broad topics lose marks in analysis."
      },
      {
        id: "research",
        title: "2. Research Methods (4 marks)",
        marks: "4 marks",
        items: [
          { id: "a3", text: "Use at least TWO different research sources (e.g. Primary: questionnaire/interview + Secondary: company website/news article)." },
          { id: "a4", text: "State WHY each source was suitable, reliable, or limited (e.g. bias, up-to-date, sample size)." }
        ],
        tip: "SQA Tip: Don't just list 'Google' — name the exact website, date accessed, or who you surveyed and how many responses you got."
      },
      {
        id: "analysis",
        title: "3. Analysis & Interpretation of Findings (12 marks)",
        marks: "12 marks",
        items: [
          { id: "a5", text: "Present key findings clearly using charts, graphs, or tables (not giant walls of copied text)." },
          { id: "a6", text: "Explain WHAT each finding means for the business (use 'This means that...', 'As a result...', 'This could lead to...')." },
          { id: "a7", text: "Link findings directly to SQA N5 Business Management theory (e.g. 4 Ps, customer loyalty, motivation, cash flow)." }
        ],
        tip: "SQA Pitfall: Copying and pasting from websites earns 0 analysis marks. Every paragraph must explain the impact on the business."
      },
      {
        id: "conclusions",
        title: "4. Conclusions & Recommendations (8 marks)",
        marks: "8 marks",
        items: [
          { id: "a8", text: "Write clear conclusions that directly answer your report's original purpose." },
          { id: "a9", text: "Make realistic, justified recommendations for the business — each backed up by your research findings." }
        ],
        tip: "SQA Tip: Never introduce brand-new facts in your conclusion. Every recommendation must say HOW it solves a finding from Section 3."
      },
      {
        id: "presentation",
        title: "5. Report Presentation & Structure (4 marks)",
        marks: "4 marks",
        items: [
          { id: "a10", text: "Use clear headings, subheadings, page numbers, and accurate N5 business terminology." },
          { id: "a11", text: "Include properly labelled appendices (e.g. blank questionnaire, tally chart, or source list) and stay within the SQA word/page limit." }
        ],
        tip: "SQA Tip: Keep it professional — proofread spelling of business terms and make sure every chart has a title and labelled axes."
      }
    ];
    const cl = state.assignmentChecklist || {};
    const allItems = sections.flatMap(s => s.items);
    const doneCount = allItems.filter(i => cl[i.id]).length;
    const pct = Math.round((doneCount / allItems.length) * 100);

    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
          <div>
            <p class="kicker">SQA NATIONAL 5 ASSIGNMENT · 30 RAW MARKS (22% OF FINAL GRADE)</p>
            <h2 style="margin:0 0 4px 0;">📋 N5 Business Assignment Helper &amp; Checklist</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:13.5px;">Tick off each SQA marking requirement as you build your report. Your checklist saves automatically.</p>
          </div>
          <span class="badge badge-primary" style="font-size:14px;padding:6px 12px;">Progress: ${doneCount} / ${allItems.length} (${pct}%)</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;">
          ${sections.map(sec => `
            <div style="padding:14px 16px;border-radius:12px;background:#fff;border:1.5px solid var(--border);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="font-size:15px;color:#2e1065;">${sec.title}</strong>
                <span class="badge badge-soft">${sec.marks}</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:7px;">
                ${sec.items.map(it => `
                  <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;font-size:13.5px;">
                    <input type="checkbox" data-assign-check="${it.id}" ${cl[it.id] ? "checked" : ""} style="margin-top:3px;width:17px;height:17px;accent-color:#7c3aed;" />
                    <span style="${cl[it.id] ? "text-decoration:line-through;color:var(--text-muted);" : ""}">${escapeHtml(it.text)}</span>
                  </label>
                `).join("")}
              </div>
              <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:#f5f3ff;color:#4c1d95;font-size:12.5px;font-weight:600;">
                💡 ${escapeHtml(sec.tip)}
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function startFullMockExam() {
    if (state.mockTimerId) clearInterval(state.mockTimerId);
    const caseObj = (DATA.caseStudies || [])[Math.floor(Math.random() * Math.max(1, (DATA.caseStudies || []).length))] || null;
    const sec1Questions = caseObj ? (caseObj.questions || []).slice(0, 6) : [];
    const sec2Sections = Object.keys(DATA.courseAreas).map(topic => {
      const pool = (DATA.questions || []).filter(q => q.topic === topic).sort(() => Math.random() - 0.5);
      const picked = [];
      let m = 0;
      for (const q of pool) {
        const qm = Number(q.marks) || 2;
        if (m + qm <= 10 || picked.length < 3) {
          picked.push(q);
          m += qm;
        }
        if (m >= 10) break;
      }
      return { topic, questions: picked, marks: m };
    });
    state.mockPaper = { caseObj, sec1Questions, sec2Sections };
    state.mockAnswers = {};
    state.mockResults = null;
    state.mockSecondsLeft = 5400; // 1 hr 30 mins
    state.activeTab = "mock";
    state.mockTimerId = setInterval(() => {
      if (state.mockSecondsLeft > 0 && !state.mockResults) {
        state.mockSecondsLeft--;
        const el = document.getElementById("mock-timer-display");
        if (el) {
          const m = String(Math.floor(state.mockSecondsLeft / 60)).padStart(2, "0");
          const s = String(state.mockSecondsLeft % 60).padStart(2, "0");
          el.textContent = `${m}:${s}`;
        }
      } else if (state.mockSecondsLeft <= 0) {
        clearInterval(state.mockTimerId);
      }
    }, 1000);
    render();
  }

  function renderFullMockTab() {
    if (!state.mockPaper) {
      return `
        <section class="section-panel">
          <p class="kicker">FULL SQA EXAM PAPER GENERATOR · 70 MARKS · 1 HOUR 30 MINUTES</p>
          <h2>📄 Full 70-Mark SQA National 5 Mock Exam</h2>
          <p style="color:var(--text-secondary);font-size:14px;">
            Generates a complete SQA-style National 5 Business Management exam paper:
            <strong>Section 1</strong> (Case Study stimulus questions) + <strong>Section 2</strong> (five 10-mark sections across all 5 course areas), with a 90-minute countdown timer, instant SQA auto-marking, estimated Grade Band (A–D), and a printable summary for parents' night.
          </p>
          <button type="button" class="btn btn-primary" id="btn-start-full-mock">📄 Generate &amp; Start 70-Mark Mock Exam</button>
        </section>
      `;
    }
    const mins = String(Math.floor(state.mockSecondsLeft / 60)).padStart(2, "0");
    const secs = String(state.mockSecondsLeft % 60).padStart(2, "0");
    const { caseObj, sec1Questions, sec2Sections } = state.mockPaper;

    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <p class="kicker">SQA NATIONAL 5 MOCK EXAM · 1 HOUR 30 MINUTES</p>
            <h2 style="margin:0;">📄 Full Mock Exam Paper</h2>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;" class="no-print">
            <span class="badge badge-primary" style="font-size:15px;padding:6px 14px;">⏱️ <span id="mock-timer-display">${mins}:${secs}</span></span>
            <button type="button" class="btn btn-outline btn-sm" id="btn-start-full-mock">↻ New Paper</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.print()">🖨️ Print Summary</button>
          </div>
        </div>

        ${state.mockResults ? `
          <div class="feedback-box ${state.mockResults.pct >= 70 ? "full-marks" : state.mockResults.pct >= 50 ? "partial-marks" : "zero-marks"}" style="margin-bottom:16px;">
            <h3 style="margin:0 0 6px 0;">Mock Exam Result: ${state.mockResults.earned} / ${state.mockResults.total} marks (${state.mockResults.pct}%) — Estimated SQA Band: ${state.mockResults.grade}</h3>
            <p style="margin:0;font-size:13.5px;">Pupil: <strong>${escapeHtml(state.user?.name || "Pupil")}</strong> · Date: ${new Date().toLocaleDateString("en-GB")} · Use the Print Summary button above for parents' night or teacher review.</p>
          </div>
        ` : ""}

        ${caseObj ? `
          <div style="padding:16px;border-radius:12px;background:#f5f3ff;border:1.5px solid #c4b5fd;margin-bottom:16px;">
            <p class="kicker" style="margin-bottom:4px;">SECTION 1 · CASE STUDY STIMULUS</p>
            <h3 style="margin:0 0 8px 0;">${escapeHtml(caseObj.title)}</h3>
            <p style="margin:0 0 12px 0;font-size:13.5px;white-space:pre-line;">${escapeHtml(caseObj.scenario || caseObj.stimulus || "")}</p>
            ${sec1Questions.map((q, idx) => {
              const qKey = "s1-" + idx;
              const res = state.mockResults?.details?.[qKey];
              return `
                <div style="padding:12px;background:#fff;border-radius:10px;border:1px solid var(--border);margin-bottom:10px;">
                  <div style="font-weight:700;font-size:14px;margin-bottom:6px;">1(${String.fromCharCode(97 + idx)}) ${escapeHtml(q.prompt || q.question)} <span class="badge badge-primary">${q.marks || 2}m</span></div>
                  <textarea rows="3" data-mock-q="${qKey}" onpaste="return false;" placeholder="Type your SQA answer here..." style="width:100%;padding:9px;border-radius:8px;border:1px solid #cbd5e1;font-size:13.5px;">${escapeHtml(state.mockAnswers[qKey] || "")}</textarea>
                  ${res ? `<div style="margin-top:6px;font-size:13px;font-weight:700;color:${res.marks === res.marksAvailable ? "#15803d" : "#b45309"};">Marked: ${res.marks} / ${res.marksAvailable} marks</div>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        ` : ""}

        <div style="display:flex;flex-direction:column;gap:14px;">
          ${sec2Sections.map((sec, sIdx) => `
            <div style="padding:16px;border-radius:12px;background:#fff;border:1.5px solid var(--border);">
              <p class="kicker" style="margin-bottom:4px;">SECTION 2 · QUESTION ${sIdx + 2} (${sec.marks} MARKS)</p>
              <h3 style="margin:0 0 10px 0;">${escapeHtml(sec.topic)}</h3>
              ${sec.questions.map((q, qIdx) => {
                const qKey = `s2-${sIdx}-${qIdx}`;
                const res = state.mockResults?.details?.[qKey];
                return `
                  <div style="margin-bottom:12px;">
                    <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${sIdx + 2}(${String.fromCharCode(97 + qIdx)}) ${escapeHtml(q.prompt)} <span class="badge badge-primary">${q.marks}m</span></div>
                    <textarea rows="3" data-mock-q="${qKey}" onpaste="return false;" placeholder="Type your SQA answer here..." style="width:100%;padding:9px;border-radius:8px;border:1px solid #cbd5e1;font-size:13.5px;">${escapeHtml(state.mockAnswers[qKey] || "")}</textarea>
                    ${res ? `<div style="margin-top:6px;font-size:13px;font-weight:700;color:${res.marks === res.marksAvailable ? "#15803d" : "#b45309"};">Marked: ${res.marks} / ${res.marksAvailable} marks</div>` : ""}
                  </div>
                `;
              }).join("")}
            </div>
          `).join("")}
        </div>

        ${!state.mockResults ? `
          <div style="margin-top:16px;" class="no-print">
            <button type="button" class="btn btn-primary" id="btn-submit-full-mock" style="width:100%;padding:13px;font-size:15px;">
              ✅ Submit &amp; Auto-Mark Full Mock Exam
            </button>
          </div>
        ` : ""}
      </section>
    `;
  }

  function renderClassLeaderboardCard() {
    const myClass = String(state.user?.classCode || "").toUpperCase();
    if (!myClass || myClass === "TEACHER") return "";
    const classmates = (state.pupils || []).filter(p => String(p.classCode || "").toUpperCase() === myClass);
    const ranked = classmates.map(p => {
      const pAtt = (state.attempts || []).filter(a => a.userId === p.userId || a.userName?.toLowerCase() === p.name?.toLowerCase());
      const xp = pAtt.length * 10 + pAtt.filter(a => a.percentage === 100).length * 15;
      const parts = String(p.name || "Pupil").trim().split(/\s+/);
      const shortName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
      return { userId: p.userId, shortName, xp, isMe: p.userId === state.user?.userId || p.name?.toLowerCase() === state.user?.name?.toLowerCase() };
    }).sort((a, b) => b.xp - a.xp).slice(0, 5);
    if (!ranked.length) return "";
    return `
      <div style="margin-top:14px;padding:14px 16px;border-radius:12px;background:#faf5ff;border:1.5px solid #c4b5fd;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="font-size:14.5px;color:#2e1065;">🏆 Class ${escapeHtml(state.user?.className || myClass)} XP Leaderboard</strong>
          <span class="badge badge-primary">🔥 ${state.streakData?.days || 1}-day streak</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;">
          ${ranked.map((r, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:8px;background:${r.isMe ? "#ede9fe" : "#fff"};border:1px solid ${r.isMe ? "#7c3aed" : "#e2e8f0"};font-size:13px;">
              <span><strong>#${i + 1}</strong> ${escapeHtml(r.shortName)} ${r.isMe ? "<strong>(You)</strong>" : ""}</span>
              <span style="font-weight:700;color:#6d28d9;">${r.xp} XP</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderMainHub() {
    const analytics = computeAnalytics();
    const isTeacher = isTeacherUser(state.user);
    const isOwnerTeacher = Boolean(
      state.user?.owner ||
      state.user?.role === "admin" ||
      (state.user?.name || "").toLowerCase().includes("straub")
    );
    const teacherVisibleClassCodes = new Set(getVisibleClassesForTeacher().map(c => String(c.code || "").toUpperCase()));
    const teacherPupilCount = isTeacher
      ? (isOwnerTeacher || (state.user?.assignedClasses || []).includes("ALL")
          ? state.pupils.length
          : state.pupils.filter(p => teacherVisibleClassCodes.has(String(p.classCode || "").toUpperCase())).length)
      : 0;
    const topicsPractisedCount = new Set(getUserAttempts().map(a => a.topic).filter(Boolean)).size;

    return `
      <div class="app-shell">
        <header class="top-bar">
          <div class="brand-row">
            <span class="brand-badge">N5 BUSINESS</span>
            <div>
              <strong style="font-size:16px;display:block;">National 5 Business Management Revision Hub</strong>
              <span style="font-size:12.5px;color:var(--text-muted);">Qualifications Scotland (SQA) Course &amp; Marking Guidance</span>
            </div>
          </div>
          <div class="user-pill-row">
            ${!isStandaloneApp ? `
              <button type="button" class="btn btn-primary btn-sm" id="btn-top-install-app" style="background:#7c3aed;">
                📲 Add App to Phone
              </button>
            ` : ""}
            <span class="badge badge-primary">
              👤 ${escapeHtml(state.user.name)} ${state.user.classCode ? `(${escapeHtml(state.user.classCode)})` : "(Teacher)"}
            </span>
            <button type="button" class="btn btn-outline btn-sm" id="btn-logout">
              Sign out
            </button>
          </div>
        </header>
        ${state.showTopPhoneModal && !isStandaloneApp ? `
          <div style="margin:12px auto 0;max-width:1180px;padding:12px 16px;background:#f5f3ff;border:1.5px solid #7c3aed;border-radius:12px;font-size:13.5px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
              <strong>📲 Add the Green "N5 Business" App Icon to Your Phone Screen:</strong><br/>
              🍎 <strong>iPhone (Safari):</strong> Tap <strong>Share (↑)</strong> at the bottom &rarr; tap <strong>"Add to Home Screen" (➕)</strong> &rarr; <strong>Add</strong>.<br/>
              🤖 <strong>Android (Chrome):</strong> Tap the <strong>3 dots (⋮)</strong> top-right &rarr; tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
            </div>
            <button type="button" class="btn btn-outline btn-sm" id="btn-close-top-install">Got it</button>
          </div>
        ` : ""}

        <!-- NAVIGATION TABS -->
        <nav class="nav-tabs" id="hub-workspace" style="margin-top:14px;">
          ${isTeacher ? `
            <button type="button" class="nav-tab ${state.activeTab === "teacher" ? "active" : ""}" data-tab="teacher" style="font-weight:800;">
              🎓 Teacher Dashboard (${teacherPupilCount} ${teacherPupilCount === 1 ? "Pupil" : "Pupils"} · Results &amp; Homework)
            </button>
          ` : ""}
          <button type="button" class="nav-tab ${state.activeTab === "dashboard" ? "active" : ""}" data-tab="dashboard">
            🏠 My Dashboard
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "drills" ? "active" : ""}" data-tab="drills">
            ⚡ Command Word Drills
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "practice" ? "active" : ""}" data-tab="practice">
            📝 Practice
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "lessons" ? "active" : ""}" data-tab="lessons">
            ▶ Lessons &amp; Videos
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "cases" ? "active" : ""}" data-tab="cases">
            🏢 Case Studies
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "homework" ? "active" : ""}" data-tab="homework">
            📅 Homework
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "progress" ? "active" : ""}" data-tab="progress">
            📊 My Progress
          </button>
        </nav>

        ${state.activeTab === "teacher" ? renderTeacherTab() : ""}

        ${state.activeTab === "dashboard" ? `
          <section class="dashboard-overview">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
              <div>
                <p class="kicker">YOUR REVISION SPACE · LEARNING OVERVIEW</p>
                <h1 style="font-size:21px;margin:0;">Welcome to your revision dashboard, ${escapeHtml(state.user.name)}</h1>
                <p style="margin:4px 0 0 0;font-size:13.5px;color:var(--text-secondary);">Pick a topic, learn the key ideas, drill SQA command words, and practise exam-style questions. Your progress is saved as you go.</p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <span class="badge badge-primary">Questions attempted: ${analytics.totalAttempts}</span>
                <span class="badge badge-success">Average mark: ${analytics.avgPct}%</span>
                <span class="badge">Course areas practised: ${topicsPractisedCount} / 5</span>
                <span class="badge">Revision Challenge: ${Math.min(5, analytics.uniqueQuestionsCount)} / 5</span>
                <span class="badge badge-primary">🔥 XP: ${analytics.totalAttempts * 10 + (analytics.fullMarksCount || 0) * 15}</span>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-top:14px;">
              <button type="button" class="btn btn-primary btn-sm" data-tab="drills">⚡ Command Drills</button>
              <button type="button" class="btn btn-soft btn-sm" data-tab="flashcards">🃏 Key Term Flashcards</button>
              <button type="button" class="btn btn-soft btn-sm" data-tab="homework">📅 Monthly Homework</button>
              <button type="button" class="btn btn-soft btn-sm" data-tab="lessons">▶ Lessons &amp; Videos</button>
              <button type="button" class="btn btn-soft btn-sm" data-tab="practice">📝 Past Papers</button>
              <button type="button" class="btn btn-soft btn-sm" data-tab="cases">🏢 Case Studies</button>
              <button type="button" class="btn btn-soft btn-sm" data-tab="assignment">📋 N5 Assignment</button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-launch-mini-exam">⏱️ 10-Mark Sprint</button>
              <button type="button" class="btn btn-primary btn-sm" data-tab="mock" style="background:#4c1d95;border-color:#4c1d95;">📄 70-Mark Mock</button>
              <button type="button" class="btn btn-outline btn-sm" data-goto-drill="${escapeHtml((analytics.commandStats || []).slice().sort((a,b) => (a.avgPct||0) - (b.avgPct||0))[0]?.key || 'explain')}">🧠 Fix Weakest Area</button>
            </div>

            ${renderClassLeaderboardCard()}

            <details style="margin-top:12px;font-size:13px;color:var(--text-secondary);background:var(--surface-alt);padding:8px 12px;border-radius:8px;border:1px solid var(--border);">
              <summary style="font-weight:700;cursor:pointer;color:var(--text);">Exam information and official SQA course specification</summary>
              <p style="margin:6px 0 0 0;">
                <strong>2026–27 exam:</strong> 70 marks in 1 hour 30 minutes. Section 1: one 20-mark stimulus question. Section 2: five 10-mark questions. The assignment has 30 raw marks, scaled to 20 (22% of the overall assessment).
                <a href="https://www.sqa.org.uk/sqa/files_ccc/n5-course-spec-bus-management.pdf" target="_blank" rel="noreferrer" style="color:var(--primary);font-weight:600;">Official course specification ↗</a> ·
                <a href="https://www.sqa.org.uk/sqa/files_ccc/n5-sqp-business-management.pdf" target="_blank" rel="noreferrer" style="color:var(--primary);font-weight:600;">2026 specimen paper &amp; marking instructions ↗</a>
              </p>
            </details>

            <h3 style="font-size:15px;margin:16px 0 6px 0;">National 5 Course Areas</h3>
            <div class="course-grid">
              ${Object.entries(DATA.courseAreas).map(([topic, subtopics], idx) => `
                <div class="course-card">
                  <div>
                    <span class="course-num">0${idx + 1}</span>
                    <h3 style="font-size:16px;margin:0 0 4px 0;">${escapeHtml(topic)}</h3>
                    <p style="margin:0;font-size:12.5px;color:var(--text-muted);">
                      ${subtopics.length} video lessons · definitions, examples, flashcards &amp; SQA drills
                    </p>
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button type="button" class="btn btn-outline btn-sm" data-card-lessons="${escapeHtml(topic)}">
                      ▶ Lessons &amp; Videos
                    </button>
                    <button type="button" class="btn btn-soft btn-sm" data-drill-topic="${escapeHtml(topic)}">
                      ⚡ Command Drills
                    </button>
                  </div>
                </div>
              `).join("")}
            </div>
          </section>
        ` : ""}

        ${state.activeTab === "drills" ? renderDrillsTab(analytics) : ""}
        ${state.activeTab === "lessons" ? renderLessonsTab() : ""}
        ${state.activeTab === "practice" ? renderPracticeTab() : ""}
        ${state.activeTab === "cases" ? renderCasesTab() : ""}
        ${state.activeTab === "homework" ? renderHomeworkTab() : ""}
        ${state.activeTab === "progress" ? renderProgressTab(analytics) : ""}
        ${state.activeTab === "exam" ? renderMiniExamTab() : ""}
        ${state.activeTab === "flashcards" ? renderFlashcardsTab() : ""}
        ${state.activeTab === "assignment" ? renderAssignmentTab() : ""}
        ${state.activeTab === "mock" ? renderFullMockTab() : ""}

        <!-- MOBILE BOTTOM NAVIGATION DOCK -->
        <nav class="mobile-dock">
          ${isTeacher ? `<button type="button" class="${state.activeTab === "teacher" ? "active" : ""}" data-tab="teacher">🎓<span>Teacher</span></button>` : ""}
          <button type="button" class="${state.activeTab === "dashboard" ? "active" : ""}" data-tab="dashboard">🏠<span>Home</span></button>
          <button type="button" class="${state.activeTab === "drills" ? "active" : ""}" data-tab="drills">⚡<span>Drills</span></button>
          <button type="button" class="${state.activeTab === "practice" ? "active" : ""}" data-tab="practice">📝<span>Practice</span></button>
          <button type="button" class="${state.activeTab === "lessons" ? "active" : ""}" data-tab="lessons">▶<span>Lessons</span></button>
          <button type="button" class="${state.activeTab === "homework" ? "active" : ""}" data-tab="homework">📅<span>HW</span></button>
          <button type="button" class="${state.activeTab === "progress" ? "active" : ""}" data-tab="progress">📊<span>Progress</span></button>
        </nav>
      </div>
    `;
  }

  function render() {
    const root = document.getElementById("app");
    if (!root) return;
    root.innerHTML = state.user ? renderMainHub() : renderLogin();
    bindEvents();
  }

  function recordAttempt(q, answer, result, mode) {
    const att = {
      id: "att-" + Date.now(),
      userId: state.user?.userId || "local-user",
      userName: state.user?.name || "Pupil",
      classCode: state.user?.classCode || "BM4B1",
      questionId: q.id,
      topic: q.topic,
      subtopic: q.subtopic,
      primaryCommand: q.primaryCommand,
      level: q.computedLevel || q.level || "B",
      mode,
      answer,
      marks: result.marks,
      marksAvailable: q.marks,
      percentage: result.percentage,
      awardedPoints: result.awardedPoints,
      improvements: result.improvements,
      createdAt: new Date().toISOString()
    };
    state.attempts.unshift(att);
    saveLocalState();

    fetch("/_api/mark-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: att.userId,
        userName: att.userName,
        classCode: att.classCode,
        questionId: q.id,
        answer,
        mode
      })
    }).catch(() => {});
  }

  function bindEvents() {
    // Login form
    const loginForm = document.getElementById("pupil-login-form");
    if (loginForm) {
      const nameIn = document.getElementById("pupil-name");
      const codeIn = document.getElementById("class-code");
      const hintEl = document.getElementById("pupil-recognition-hint");

      const updateRecognitionHint = () => {
        if (!hintEl) return;
        const matched = findExistingPupilByName(state.loginName, state.loginCode);
        if (matched) {
          hintEl.style.color = "var(--success)";
          hintEl.textContent = `✓ Returning pupil recognised: ${matched.name} (${matched.className || matched.classCode} · Code ${matched.classCode}) — no class code needed!`;
        } else if (state.loginName.trim().length >= 2) {
          hintEl.style.color = "var(--text-muted)";
          hintEl.textContent = "First time logging in? Enter your class code below once (4GBM1, 4FBM2, 4CBM3, or ABCD).";
        } else {
          hintEl.style.color = "var(--text-muted)";
          hintEl.textContent = "Already logged in before? Leave the class code box blank.";
        }
      };

      nameIn?.addEventListener("input", e => {
        state.loginName = e.target.value;
        state.loginError = "";
        updateRecognitionHint();
      });
      codeIn?.addEventListener("input", e => {
        state.loginCode = e.target.value;
        state.loginError = "";
        updateRecognitionHint();
      });

      loginForm.addEventListener("submit", async e => {
        e.preventDefault();
        const name = state.loginName.trim();
        const code = state.loginCode.trim().toUpperCase();
        // Private Teacher Access directly from the installed phone app (no teacher buttons shown to pupils)
        const matchedTeacher = matchTeacherAccount(name, code);
        if (matchedTeacher) {
          state.user = matchedTeacher;
          state.teacherUnlocked = true;
          state.activeTab = "teacher";
          state.teacherClassFilter = "ALL";
          state.loginError = "";
          saveLocalState();
          return render();
        }
        if (name.toLowerCase() === "lee morgan") {
          state.user = {
            userId: "teacher-lee-morgan",
            name: "Lee Morgan",
            role: "teacher",
            teacher: true,
            owner: false,
            pinVerified: true,
            assignedClasses: ["4CBM", "4CBM3"],
            classCode: "TEACHER",
            className: "Teacher"
          };
          state.teacherUnlocked = true;
          state.activeTab = "teacher";
          state.teacherClassFilter = "ALL";
          state.loginError = "";
          saveLocalState();
          return render();
        }
        if (name.toLowerCase() === "craig stephenson") {
          state.user = {
            userId: "teacher-craig-stephenson",
            name: "Craig Stephenson",
            role: "teacher",
            teacher: true,
            owner: false,
            pinVerified: true,
            assignedClasses: ["ABCD"],
            classCode: "TEACHER",
            className: "Teacher"
          };
          state.teacherUnlocked = true;
          state.activeTab = "teacher";
          state.teacherClassFilter = "ALL";
          state.loginError = "";
          saveLocalState();
          return render();
        }
        if (name.toLowerCase() === "rebecca" || name.toLowerCase().startsWith("rebecca ")) {
          const customOwn = (state.classes || []).filter(c => c.createdBy === "Rebecca" || c.createdBy === name).map(c => String(c.code).toUpperCase());
          state.user = {
            userId: "teacher-rebecca",
            name: name || "Rebecca",
            role: "teacher",
            teacher: true,
            owner: false,
            pinVerified: true,
            assignedClasses: customOwn,
            classCode: "TEACHER",
            className: "Teacher"
          };
          state.teacherUnlocked = true;
          state.activeTab = "teacher";
          state.teacherClassFilter = "ALL";
          state.loginError = "";
          saveLocalState();
          return render();
        }
        if (name.length < 2) {
          state.loginError = "Please enter your full name.";
          return render();
        }
        try {
          const res = await fetch("/_api/pupil-class-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, code })
          });
          if (res.ok) {
            const data = await res.json();
            state.user = data.user;
            state.rememberedPupil = data.user;
            state.loginError = "";
            saveLocalState();
            await syncFromServer();
            return render();
          } else if (res.status === 400) {
            const errData = await res.json().catch(() => ({}));
            if (errData.error && !findExistingPupilByName(name, code)) {
              state.loginError = errData.error;
              return render();
            }
          }
        } catch {}

        // Offline / standalone fallback with smart matching for 4GBM1, 4FBM2, 4CBM3, ABCD
        const existingPupil = findExistingPupilByName(name, code);
        if (existingPupil) {
          state.user = { ...existingPupil, role: "user" };
          state.rememberedPupil = state.user;
          state.loginError = "";
        } else {
          if (code.length < 2) {
            state.loginError = "First time logging in? Please enter your Class Code once (4GBM1, 4FBM2, 4CBM3, or ABCD). Next time you will only need your name!";
            return render();
          }
          const matchedClass = state.classes.find(c => c.code.toUpperCase() === code || (c.name && c.name.toUpperCase() === code));
          const finalCode = matchedClass ? matchedClass.code.toUpperCase() : code;
          const finalClassName = matchedClass ? matchedClass.name : "Class " + code;
          state.user = {
            userId: "pupil-" + name.toLowerCase().replace(/\s+/g, "-"),
            name,
            classCode: finalCode,
            className: finalClassName,
            role: "user"
          };
          state.rememberedPupil = state.user;
          if (!matchedClass) {
            state.classes.push({ id: "cls-" + Date.now(), name: finalClassName, code: finalCode });
          }
          state.pupils.push({ userId: state.user.userId, name, classCode: finalCode, className: finalClassName });
          state.loginError = "";
        }
        saveLocalState();
        render();
      });
    }

    document.getElementById("btn-continue-remembered")?.addEventListener("click", () => {
      if (state.rememberedPupil) {
        state.user = { ...state.rememberedPupil, role: "user" };
        saveLocalState();
        render();
      }
    });

    document.getElementById("btn-install-phone-app")?.addEventListener("click", async () => {
      if (deferredInstallPrompt) {
        try {
          deferredInstallPrompt.prompt();
          await deferredInstallPrompt.userChoice;
          deferredInstallPrompt = null;
          return;
        } catch {}
      }
      state.showPhoneAppModal = !state.showPhoneAppModal;
      render();
    });

    document.getElementById("btn-top-install-app")?.addEventListener("click", async () => {
      if (deferredInstallPrompt) {
        try {
          deferredInstallPrompt.prompt();
          await deferredInstallPrompt.userChoice;
          deferredInstallPrompt = null;
          return;
        } catch {}
      }
      state.showTopPhoneModal = !state.showTopPhoneModal;
      render();
    });

    document.getElementById("btn-close-top-install")?.addEventListener("click", () => {
      state.showTopPhoneModal = false;
      render();
    });

    document.querySelectorAll("[data-demo-pupil]").forEach(btn => {
      btn.addEventListener("click", () => {
        const [pName, pCode] = btn.getAttribute("data-demo-pupil").split("||");
        state.loginName = pName;
        state.loginCode = pCode;
        const found = state.pupils.find(p => p.name.toLowerCase() === pName.toLowerCase());
        state.user = found ? { ...found, role: "user" } : { userId: "pupil-demo", name: pName, classCode: pCode, role: "user" };
        state.rememberedPupil = state.user;
        state.activeTab = "dashboard";
        saveLocalState();
        render();
      });
    });

    document.getElementById("teacher-name-field")?.addEventListener("input", e => {
      state.teacherNameInput = e.target.value;
    });

    document.getElementById("teacher-pin-field")?.addEventListener("input", e => {
      state.teacherPinInput = e.target.value;
      state.teacherPinError = "";
    });

    document.getElementById("teacher-pin-field")?.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("btn-teacher-login")?.click();
      }
    });

    document.getElementById("btn-teacher-login")?.addEventListener("click", async () => {
      const matchedTeacher = matchTeacherAccount(state.teacherNameInput, state.teacherPinInput);
      if (!matchedTeacher) {
        state.teacherPinError = "Incorrect Teacher Name or PIN. Please enter your Teacher Name and PIN to access the Teacher Dashboard.";
        render();
        return;
      }
      state.teacherPinError = "";
      state.teacherUnlocked = true;
      state.user = matchedTeacher;
      state.teacherClassFilter = "ALL";
      state.activeTab = "teacher";
      saveLocalState();
      await syncFromServer();
      render();
    });

    document.getElementById("btn-logout")?.addEventListener("click", () => {
      state.user = null;
      state.teacherUnlocked = false;
      state.teacherPinInput = "";
      saveLocalState();
      render();
    });

    // Main Tabs
    document.querySelectorAll("[data-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.activeTab = btn.getAttribute("data-tab");
        render();
      });
    });

    // Course card quick-launch
    document.querySelectorAll("[data-card-lessons]").forEach(btn => {
      btn.addEventListener("click", () => {
        const topic = btn.getAttribute("data-card-lessons");
        state.lessonTopic = topic;
        state.lessonTitle = DATA.courseAreas[topic]?.[0] || "";
        state.activeTab = "lessons";
        render();
        document.getElementById("hub-workspace")?.scrollIntoView({ behavior: "smooth" });
      });
    });

    document.querySelectorAll("[data-drill-topic]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.drillTopic = btn.getAttribute("data-drill-topic");
        state.drillIndex = 0;
        state.drillAnswer = "";
        state.drillResult = null;
        state.activeTab = "drills";
        render();
        document.getElementById("hub-workspace")?.scrollIntoView({ behavior: "smooth" });
      });
    });

    document.querySelectorAll("[data-open-lesson]").forEach(btn => {
      btn.addEventListener("click", () => {
        const [topic, sub] = btn.getAttribute("data-open-lesson").split("||");
        state.lessonTopic = topic;
        state.lessonTitle = sub;
        state.activeTab = "lessons";
        render();
        document.getElementById("hub-workspace")?.scrollIntoView({ behavior: "smooth" });
      });
    });

    document.querySelectorAll("[data-goto-drill]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.drillCategory = btn.getAttribute("data-goto-drill");
        state.drillIndex = 0;
        state.drillAnswer = "";
        state.drillResult = null;
        state.drillShowHint = false;
        state.drillShowSolution = false;
        state.drillEmptyError = "";
        state.activeTab = "drills";
        render();
        setTimeout(() => {
          document.getElementById("drill-question-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 40);
      });
    });

    // READ ALOUD, TIMED MINI-EXAM & PRINT REPORT EVENTS
    document.querySelectorAll("[data-read-text]").forEach(btn => {
      btn.addEventListener("click", () => {
        speakText(btn.getAttribute("data-read-text") || "");
      });
    });

    document.getElementById("btn-launch-mini-exam")?.addEventListener("click", startMiniExam);
    document.getElementById("btn-start-mini-exam")?.addEventListener("click", startMiniExam);

    document.querySelectorAll("[data-exam-input]").forEach(box => {
      box.addEventListener("input", e => {
        state.examAnswers[box.getAttribute("data-exam-input")] = e.target.value;
      });
    });

    document.getElementById("btn-submit-mini-exam")?.addEventListener("click", () => {
      if (state.examTimerId) clearInterval(state.examTimerId);
      state.examRunning = false;
      let earned = 0, total = 0;
      const items = state.examQuestions.map(q => {
        const ans = state.examAnswers[q.id] || "";
        const res = markSqaClient(q, ans);
        earned += res.marks;
        total += res.maxMarks;
        if (ans.trim()) recordAttempt(q, ans, res, "exam");
        return res;
      });
      const pct = total ? Math.round((earned / total) * 100) : 0;
      const grade = pct >= 70 ? "Grade A" : pct >= 60 ? "Grade B" : pct >= 50 ? "Grade C" : pct >= 40 ? "Grade D" : "No Award (Keep Practising!)";
      state.examResults = { earned, total, pct, grade, items };
      render();
    });

    document.getElementById("btn-print-teacher-report")?.addEventListener("click", () => {
      window.print();
    });

    // CLASS TRACKING IMPORT / EDIT / EXPORT EVENTS
    document.getElementById("tracking-class-filter")?.addEventListener("change", e => {
      state.trackingClassFilter = e.target.value;
      render();
    });

    document.querySelectorAll("[data-track-key]").forEach(inp => {
      inp.addEventListener("input", e => {
        const key = inp.getAttribute("data-track-key");
        const field = inp.getAttribute("data-track-field");
        state.trackingRecords = state.trackingRecords || {};
        if (!state.trackingRecords[key]) {
          const p = (state.pupils || []).find(x => (x.name || "").trim().toLowerCase() === key);
          state.trackingRecords[key] = { name: p?.name || key, className: p?.className || p?.classCode || "" };
        }
        state.trackingRecords[key][field] = e.target.value;
        saveLocalState();
        const st = document.getElementById("tracking-save-status");
        if (st) st.textContent = "✓ Saved just now";
      });
    });

    document.getElementById("btn-add-tracking-row")?.addEventListener("click", () => {
      const name = prompt("Enter pupil full name:");
      if (!name || !name.trim()) return;
      const cls = prompt("Enter class (e.g. 4GBM, 4FBM, 4CBM, 4E):", state.trackingClassFilter !== "All" ? state.trackingClassFilter : "4GBM") || "";
      const key = name.trim().toLowerCase();
      state.trackingRecords = state.trackingRecords || {};
      state.trackingRecords[key] = { ...(state.trackingRecords[key] || {}), name: name.trim(), className: cls.trim() };
      saveLocalState();
      render();
    });

    document.getElementById("tracking-csv-file")?.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const text = String(ev.target?.result || "");
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { alert("CSV file appears empty."); return; }
        const parseCsvLine = line => {
          const res = []; let cur = ""; let inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { res.push(cur.trim()); cur = ""; }
            else cur += ch;
          }
          res.push(cur.trim());
          return res;
        };
        const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
        const findCol = keys => headers.findIndex(h => keys.some(k => h.includes(k)));
        const iName = Math.max(0, findCol(["name", "pupil", "student"]));
        const iClass = findCol(["class", "reg", "group"]);
        const iTarget = findCol(["target", "tg"]);
        const iWork = findCol(["work", "current", "grade", "wg"]);
        const iPrelim = findCol(["prelim", "exam", "test", "score"]);
        const iAssign = findCol(["assign", "coursework"]);
        const iEffort = findCol(["effort", "behav", "att"]);
        const iNotes = findCol(["note", "comment", "next", "interven"]);

        state.trackingRecords = state.trackingRecords || {};
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const name = (cols[iName] || "").trim();
          if (!name) continue;
          const key = name.toLowerCase();
          const prev = state.trackingRecords[key] || {};
          state.trackingRecords[key] = {
            ...prev,
            name,
            className: iClass >= 0 ? (cols[iClass] || prev.className || "") : (prev.className || ""),
            target: iTarget >= 0 ? (cols[iTarget] || prev.target || "") : (prev.target || ""),
            working: iWork >= 0 ? (cols[iWork] || prev.working || "") : (prev.working || ""),
            prelim: iPrelim >= 0 ? (cols[iPrelim] || prev.prelim || "") : (prev.prelim || ""),
            assignment: iAssign >= 0 ? (cols[iAssign] || prev.assignment || "") : (prev.assignment || ""),
            effort: iEffort >= 0 ? (cols[iEffort] || prev.effort || "") : (prev.effort || ""),
            notes: iNotes >= 0 ? (cols[iNotes] || prev.notes || "") : (prev.notes || "")
          };
          count++;
        }
        saveLocalState();
        alert(`Imported tracking data for ${count} pupils!`);
        render();
      };
      reader.readAsText(file);
    });

    document.getElementById("btn-export-tracking-csv")?.addEventListener("click", () => {
      const esc = v => '"' + String(v || "").replace(/"/g, '""') + '"';
      const rows = [["Pupil Name", "Class", "Target Grade", "Working Grade", "Prelim %", "Assignment /30", "Effort", "Teacher Notes"]];
      const seen = new Set();
      for (const p of (state.pupils || [])) {
        const key = (p.name || "").trim().toLowerCase();
        seen.add(key);
        const rec = (state.trackingRecords || {})[key] || {};
        rows.push([rec.name || p.name, rec.className || p.className || p.classCode || "", rec.target || "", rec.working || "", rec.prelim || "", rec.assignment || "", rec.effort || "", rec.notes || ""]);
      }
      for (const [key, rec] of Object.entries(state.trackingRecords || {})) {
        if (seen.has(key)) continue;
        rows.push([rec.name || key, rec.className || "", rec.target || "", rec.working || "", rec.prelim || "", rec.assignment || "", rec.effort || "", rec.notes || ""]);
      }
      const csv = rows.map(r => r.map(esc).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "N5_Business_Class_Tracking.csv";
      a.click();
      URL.revokeObjectURL(url);
    });

    // Prevent copy/paste cheating into pupil answer boxes
    document.querySelectorAll("#drill-answer-box, #prac-answer-box, [data-case-input], [data-hw-input], [data-exam-input]").forEach(box => {
      box.addEventListener("paste", e => {
        e.preventDefault();
        alert("✏️ Please type your answer in your own words — pasting is disabled so you remember it for the SQA exam!");
      });
    });

    // DRILLS TAB EVENTS
    document.querySelectorAll("[data-drill-cat]").forEach(el => {
      el.addEventListener("click", () => {
        state.drillCategory = el.getAttribute("data-drill-cat");
        state.drillIndex = 0;
        state.drillAnswer = "";
        state.drillResult = null;
        state.drillShowHint = false;
        state.drillShowSolution = false;
        state.drillEmptyError = "";
        render();
        if (window.innerWidth <= 920) {
          setTimeout(() => {
            document.getElementById("drill-question-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 40);
        }
      });
    });

    document.getElementById("drill-topic-select")?.addEventListener("change", e => {
      state.drillTopic = e.target.value;
      state.drillIndex = 0;
      state.drillAnswer = "";
      state.drillResult = null;
      state.drillShowSolution = false;
      state.drillEmptyError = "";
      render();
    });

    document.getElementById("drill-level-select")?.addEventListener("change", e => {
      state.drillLevel = e.target.value;
      state.drillIndex = 0;
      state.drillAnswer = "";
      state.drillResult = null;
      state.drillShowSolution = false;
      state.drillEmptyError = "";
      render();
    });

    document.getElementById("btn-reset-drill-filters")?.addEventListener("click", () => {
      state.drillTopic = "All topics";
      state.drillLevel = "All levels";
      state.drillIndex = 0;
      state.drillAnswer = "";
      state.drillResult = null;
      state.drillShowSolution = false;
      state.drillEmptyError = "";
      render();
    });

    document.getElementById("btn-toggle-drill-blueprint")?.addEventListener("click", () => {
      state.drillShowBlueprint = !state.drillShowBlueprint;
      render();
    });

    document.getElementById("btn-toggle-drill-video")?.addEventListener("click", () => {
      state.drillShowVideo = !state.drillShowVideo;
      render();
    });

    document.getElementById("drill-question-jump")?.addEventListener("change", e => {
      state.drillIndex = Number(e.target.value) || 0;
      state.drillAnswer = "";
      state.drillResult = null;
      state.drillShowHint = false;
      state.drillShowSolution = false;
      state.drillEmptyError = "";
      render();
    });

    const drillBox = document.getElementById("drill-answer-box");
    if (drillBox) {
      drillBox.addEventListener("input", e => {
        state.drillAnswer = e.target.value;
        if (state.drillEmptyError && state.drillAnswer.trim()) {
          state.drillEmptyError = "";
        }
      });
    }

    document.getElementById("btn-mark-drill")?.addEventListener("click", () => {
      const questions = getDrillQuestions();
      const q = questions[Math.min(state.drillIndex, questions.length - 1)];
      if (!q) return;
      if (!state.drillAnswer.trim()) {
        state.drillEmptyError = "✏️ Please type your answer in the box above before clicking Mark — or tap '👁 SQA Model Answer' to view the official solution!";
        render();
        document.getElementById("drill-answer-box")?.focus();
        return;
      }
      state.drillEmptyError = "";
      const res = markSqaClient(q, state.drillAnswer);
      state.drillResult = res;
      recordAttempt(q, state.drillAnswer, res, "drill");
      render();
    });

    document.getElementById("btn-drill-hint")?.addEventListener("click", () => {
      state.drillShowHint = !state.drillShowHint;
      render();
    });

    document.getElementById("btn-drill-solution")?.addEventListener("click", () => {
      state.drillShowSolution = !state.drillShowSolution;
      render();
    });

    const goPrevDrill = () => {
      const questions = getDrillQuestions();
      state.drillIndex = questions.length ? (state.drillIndex - 1 + questions.length) % questions.length : 0;
      state.drillAnswer = "";
      state.drillResult = null;
      state.drillShowHint = false;
      state.drillShowSolution = false;
      state.drillEmptyError = "";
      render();
    };

    const goNextDrill = () => {
      const questions = getDrillQuestions();
      state.drillIndex = questions.length ? (state.drillIndex + 1) % questions.length : 0;
      state.drillAnswer = "";
      state.drillResult = null;
      state.drillShowHint = false;
      state.drillShowSolution = false;
      state.drillEmptyError = "";
      render();
    };

    document.getElementById("btn-prev-drill")?.addEventListener("click", goPrevDrill);
    document.getElementById("btn-top-prev-drill")?.addEventListener("click", goPrevDrill);
    document.getElementById("btn-next-drill")?.addEventListener("click", goNextDrill);
    document.getElementById("btn-top-next-drill")?.addEventListener("click", goNextDrill);

    // LESSONS TAB EVENTS
    document.querySelectorAll("[data-select-lesson-topic]").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-select-lesson-topic");
        state.lessonTopic = t;
        state.lessonTitle = DATA.courseAreas[t]?.[0] || "";
        state.flashcardIdx = 0;
        state.flashcardFlipped = false;
        render();
      });
    });

    document.querySelectorAll("[data-select-lesson-title]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.lessonTitle = btn.getAttribute("data-select-lesson-title");
        state.flashcardIdx = 0;
        state.flashcardFlipped = false;
        render();
      });
    });

    document.getElementById("flashcard-flip-box")?.addEventListener("click", e => {
      if (e.target.closest("button")) return;
      state.flashcardFlipped = !state.flashcardFlipped;
      render();
    });

    document.getElementById("btn-card-need-revise")?.addEventListener("click", () => {
      const topicLessons = DATA.lessons.filter(l => l.topic === state.lessonTopic);
      const activeLesson = topicLessons.find(l => l.title === state.lessonTitle) || topicLessons[0];
      const term = activeLesson?.definitions?.[state.flashcardIdx % activeLesson.definitions.length]?.term;
      if (term && !state.reviseTerms.includes(term)) {
        state.reviseTerms.push(term);
      }
      state.flashcardIdx++;
      state.flashcardFlipped = false;
      saveLocalState();
      render();
    });

    document.getElementById("btn-card-know-this")?.addEventListener("click", () => {
      const topicLessons = DATA.lessons.filter(l => l.topic === state.lessonTopic);
      const activeLesson = topicLessons.find(l => l.title === state.lessonTitle) || topicLessons[0];
      const term = activeLesson?.definitions?.[state.flashcardIdx % activeLesson.definitions.length]?.term;
      if (term) {
        state.reviseTerms = state.reviseTerms.filter(t => t !== term);
      }
      state.flashcardIdx++;
      state.flashcardFlipped = false;
      saveLocalState();
      render();
    });

    document.querySelectorAll("[data-lesson-task-input]").forEach(box => {
      box.addEventListener("input", e => {
        state.lessonTaskAnswers[box.getAttribute("data-lesson-task-input")] = e.target.value;
      });
    });

    document.querySelectorAll("[data-check-lesson-task]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-check-lesson-task");
        state.lessonTaskRevealed[key] = !state.lessonTaskRevealed[key];
        render();
      });
    });

    document.getElementById("btn-save-custom-video")?.addEventListener("click", async e => {
      const lessonTitle = e.currentTarget.getAttribute("data-lesson-title");
      const rawUrl = document.getElementById("custom-video-input")?.value || "";
      const vid = extractYouTubeId(rawUrl);
      if (!vid) {
        alert("Please paste a valid YouTube URL or 11-character YouTube Video ID.");
        return;
      }
      state.customVideos[lessonTitle] = { videoId: vid, title: `Custom Teacher Video — ${lessonTitle}` };
      saveLocalState();
      fetch("/_api/custom-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonTitle, videoId: vid })
      }).catch(() => {});
      render();
    });

    // PRACTICE TAB EVENTS
    document.getElementById("prac-topic-select")?.addEventListener("change", e => {
      state.practiceTopic = e.target.value;
      state.practiceSubtopic = "All subtopics";
      state.practiceYear = "All years";
      state.practiceIdx = 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      state.practiceEmptyError = "";
      render();
    });

    document.getElementById("prac-subtopic-select")?.addEventListener("change", e => {
      state.practiceSubtopic = e.target.value;
      state.practiceIdx = 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      state.practiceEmptyError = "";
      render();
    });

    document.getElementById("prac-year-select")?.addEventListener("change", e => {
      state.practiceYear = e.target.value;
      state.practiceIdx = 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      state.practiceEmptyError = "";
      render();
    });

    document.getElementById("prac-level-select")?.addEventListener("change", e => {
      state.practiceLevel = e.target.value;
      state.practiceIdx = 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      state.practiceEmptyError = "";
      render();
    });

    document.getElementById("prac-answer-box")?.addEventListener("input", e => {
      state.practiceAnswer = e.target.value;
      if (state.practiceEmptyError && state.practiceAnswer.trim()) {
        state.practiceEmptyError = "";
      }
    });

    document.getElementById("btn-mark-prac")?.addEventListener("click", () => {
      const questions = getPracticeQuestions();
      const q = questions[Math.min(state.practiceIdx, questions.length - 1)];
      if (!q) return;
      if (!state.practiceAnswer.trim()) {
        state.practiceEmptyError = "✏️ Please type your answer in the box above before clicking Submit Answer!";
        render();
        document.getElementById("prac-answer-box")?.focus();
        return;
      }
      state.practiceEmptyError = "";
      const res = markSqaClient(q, state.practiceAnswer);
      state.practiceResult = res;
      recordAttempt(q, state.practiceAnswer, res, "practice");
      render();
    });

    document.getElementById("btn-prac-hint")?.addEventListener("click", () => {
      state.practiceHint = !state.practiceHint;
      render();
    });

    document.getElementById("btn-prac-catchup")?.addEventListener("click", () => {
      state.practiceCatchup = !state.practiceCatchup;
      render();
    });

    document.getElementById("btn-prev-prac")?.addEventListener("click", () => {
      const questions = getPracticeQuestions();
      state.practiceIdx = questions.length ? (state.practiceIdx - 1 + questions.length) % questions.length : 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      state.practiceEmptyError = "";
      render();
    });

    document.getElementById("btn-next-prac")?.addEventListener("click", () => {
      const questions = getPracticeQuestions();
      state.practiceIdx = questions.length ? (state.practiceIdx + 1) % questions.length : 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      state.practiceEmptyError = "";
      render();
    });

    // CASE STUDIES EVENTS
    document.querySelectorAll("[data-select-case]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.activeCaseId = btn.getAttribute("data-select-case");
        render();
      });
    });

    document.querySelectorAll("[data-case-hint]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-case-hint");
        state.caseHints = state.caseHints || {};
        state.caseHints[key] = !state.caseHints[key];
        render();
      });
    });

    document.querySelectorAll("[data-case-input]").forEach(box => {
      box.addEventListener("input", e => {
        const k = box.getAttribute("data-case-input");
        state.caseAnswers[k] = e.target.value;
        if (state.caseEmptyErrors?.[k] && e.target.value.trim()) {
          delete state.caseEmptyErrors[k];
        }
      });
    });

    document.querySelectorAll("[data-mark-case]").forEach(btn => {
      btn.addEventListener("click", () => {
        const [caseId, idxStr] = btn.getAttribute("data-mark-case").split("||");
        const idx = Number(idxStr);
        const cs = DATA.caseStudies.find(c => c.id === caseId);
        const qObj = cs?.questions?.[idx];
        const key = `${caseId}-${idx}`;
        const ans = state.caseAnswers[key] || "";
        if (!qObj) return;
        if (!ans.trim()) {
          state.caseEmptyErrors = state.caseEmptyErrors || {};
          state.caseEmptyErrors[key] = "✏️ Please type your case study answer in the box above before clicking Mark!";
          render();
          return;
        }
        if (state.caseEmptyErrors?.[key]) delete state.caseEmptyErrors[key];
        const qText = qObj.text || qObj.q || "";
        const qGuidance = qObj.guidance || qObj.points || [];
        const res = markSqaClient({
          marks: qObj.marks,
          acceptedPoints: qGuidance,
          primaryCommand: qText.trim().split(/\s+/)[0].toLowerCase(),
          solution: qObj.solution || qGuidance.map(g => `• ${g} (1)`).join("\n")
        }, ans);
        state.caseResults[key] = res;
        state.caseAttempts.unshift({
          id: "csatt-" + Date.now(),
          userId: state.user?.userId || "local",
          userName: state.user?.name || "Pupil",
          classCode: state.user?.classCode || "",
          caseId,
          questionIndex: idx,
          answer: ans,
          marks: res.marks,
          marksAvailable: qObj.marks,
          percentage: res.percentage,
          createdAt: new Date().toLocaleString("en-GB")
        });
        saveLocalState();
        render();
      });
    });

    // HOMEWORK EVENTS
    document.querySelectorAll("[data-select-hw-month]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.activeHwMonth = btn.getAttribute("data-select-hw-month");
        render();
      });
    });

    document.querySelectorAll("[data-hw-input]").forEach(box => {
      box.addEventListener("input", e => {
        const hwId = box.getAttribute("data-hw-input");
        state.hwAnswers[hwId] = e.target.value;
        if (state.hwEmptyErrors?.[hwId] && e.target.value.trim()) {
          delete state.hwEmptyErrors[hwId];
        }
      });
    });

    document.querySelectorAll("[data-submit-hw]").forEach(btn => {
      btn.addEventListener("click", () => {
        const hwId = btn.getAttribute("data-submit-hw");
        const hw = DATA.homework.find(h => h.id === hwId);
        const ans = state.hwAnswers[hwId] || "";
        if (!hw) return;
        if (!ans.trim()) {
          state.hwEmptyErrors = state.hwEmptyErrors || {};
          state.hwEmptyErrors[hwId] = "✏️ Please type your homework answer in the box above before clicking Mark My Homework!";
          render();
          return;
        }
        if (state.hwEmptyErrors?.[hwId]) delete state.hwEmptyErrors[hwId];
        const qText = hw.text || hw.question || "";
        const qAccepted = hw.acceptedPoints || hw.points || [];
        const res = markSqaClient({
          marks: hw.marks,
          acceptedPoints: qAccepted,
          primaryCommand: qText.trim().split(/\s+/)[0].toLowerCase(),
          solution: hw.solution || qAccepted.map(p => `• ${p} (1)`).join("\n")
        }, ans);
        state.hwResults[hwId] = res;
        state.homeworkSubmissions.push({
          id: "hwsub-" + Date.now(),
          userId: state.user?.userId || "local",
          userName: state.user?.name || "Pupil",
          classCode: state.user?.classCode || "",
          questionId: hw.id,
          month: hw.month,
          topic: hw.topic,
          answer: ans,
          marks: res.marks,
          marksAvailable: hw.marks,
          percentage: res.percentage,
          feedback: res.feedback,
          awardedPoints: res.awardedPoints,
          improvements: res.improvements,
          submittedAt: new Date().toLocaleString("en-GB")
        });
        saveLocalState();
        fetch("/_api/mark-homework", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: state.user?.userId,
            userName: state.user?.name,
            classCode: state.user?.classCode,
            questionId: hw.id,
            answer: ans
          })
        }).catch(() => {});
        render();
      });
    });

    // TEACHER EVENTS
    document.getElementById("new-class-name")?.addEventListener("input", e => { state.newClassName = e.target.value; });
    document.getElementById("new-class-code")?.addEventListener("input", e => { state.newClassCode = e.target.value; });

    document.getElementById("btn-save-class")?.addEventListener("click", async () => {
      const name = state.newClassName.trim();
      const code = state.newClassCode.trim().toUpperCase();
      if (!name || !code) return;
      if (!state.classes.some(c => c.code.toUpperCase() === code)) {
        state.classes.push({ id: "cls-" + Date.now(), name, code });
      }
      state.newClassName = "";
      state.newClassCode = "";
      saveLocalState();
      fetch("/_api/school-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code })
      }).catch(() => {});
      render();
    });

    document.getElementById("import-csv-box")?.addEventListener("input", e => {
      state.importCsvText = e.target.value;
    });

    document.getElementById("btn-import-roster")?.addEventListener("click", async () => {
      const lines = state.importCsvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const rows = [];
      for (const line of lines) {
        const parts = line.split(",").map(s => s.replace(/^"|"$/g, "").trim());
        if (parts[0]?.toLowerCase() === "pupil") continue; // skip CSV header
        if (parts.length >= 2) {
          rows.push({ name: parts[0], code: parts[1].toUpperCase() });
        }
      }
      if (rows.length === 0) return;
      rows.forEach(r => {
        if (!state.classes.some(c => c.code.toUpperCase() === r.code)) {
          state.classes.push({ id: "cls-" + Date.now() + Math.random(), name: "Class " + r.code, code: r.code });
        }
        if (!state.pupils.some(p => p.name.toLowerCase() === r.name.toLowerCase() && p.classCode.toUpperCase() === r.code)) {
          state.pupils.push({
            userId: "pupil-" + r.name.toLowerCase().replace(/\s+/g, "-"),
            name: r.name,
            classCode: r.code
          });
        }
      });
      state.importStatusMsg = `Imported ${rows.length} pupil records & class codes!`;
      state.importCsvText = "";
      saveLocalState();
      fetch("/_api/import-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      }).catch(() => {});
      render();
    });

    document.getElementById("teacher-class-filter")?.addEventListener("change", e => {
      state.teacherClassFilter = e.target.value;
      state.selectedPupilInspect = null;
      render();
    });

    document.getElementById("teacher-pupil-select")?.addEventListener("change", e => {
      const val = e.target.value;
      state.selectedPupilInspect = val === "ALL" ? null : val;
      render();
    });

    document.getElementById("teacher-pupil-search")?.addEventListener("input", e => {
      state.teacherSearchQuery = e.target.value;
      render();
      const inputEl = document.getElementById("teacher-pupil-search");
      if (inputEl) {
        inputEl.focus();
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
      }
    });

    document.querySelectorAll("[data-inspect-pupil]").forEach(btn => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-inspect-pupil");
        state.selectedPupilInspect = state.selectedPupilInspect === uid ? null : uid;
        render();
      });
    });

    document.getElementById("btn-close-pupil-inspect")?.addEventListener("click", () => {
      state.selectedPupilInspect = null;
      render();
    });

    document.getElementById("btn-export-csv")?.addEventListener("click", () => {
      const headers = [
        "Pupil",
        "Class",
        "Practice attempts",
        "Practice average %",
        "Homework submitted",
        "Homework average %",
        "Case-study attempts",
        "Weakest subtopic",
        "Weakest command word",
        "Last activity"
      ];
      const rows = state.pupils.map(p => {
        const pAtt = state.attempts.filter(a => a.userId === p.userId || (a.userName?.toLowerCase() === p.name.toLowerCase() && a.classCode?.toUpperCase() === p.classCode.toUpperCase()));
        const pHw = state.homeworkSubmissions.filter(s => s.userId === p.userId || (s.userName?.toLowerCase() === p.name.toLowerCase() && s.classCode?.toUpperCase() === p.classCode.toUpperCase()));
        const pCs = state.caseAttempts.filter(c => c.userId === p.userId || (c.userName?.toLowerCase() === p.name.toLowerCase() && c.classCode?.toUpperCase() === p.classCode.toUpperCase()));
        const avg = pAtt.length ? Math.round(pAtt.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / pAtt.length) : (p.practiceAverage ?? "");
        const hwAvg = pHw.length ? Math.round(pHw.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / pHw.length) : (p.homeworkAverage ?? "");
        const weakest = [...pAtt].sort((a, b) => a.percentage - b.percentage)[0];
        const weakSub = weakest ? (weakest.subtopic || weakest.topic) : (p.weakestSubtopic || "—");
        const weakCmd = weakest ? (weakest.primaryCommand || "describe") : (p.weakestCommand || "—");
        const lastAct = p.lastActiveAt || p.lastActivity || (pAtt[0]?.createdAt ? new Date(pAtt[0].createdAt).toLocaleString("en-GB") : "");
        return [p.name, p.classCode, pAtt.length, avg, pHw.length, hwAvg, pCs.length, weakSub, weakCmd, lastAct];
      });
      const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "n5-business-class-report.csv";
      a.click();
    });

    document.getElementById("btn-add-class")?.addEventListener("click", () => {
      const nameInput = document.getElementById("new-class-name");
      const codeInput = document.getElementById("new-class-code");
      const rawName = (nameInput?.value || "").trim();
      const rawCode = (codeInput?.value || "").trim();
      const clsName = rawName || rawCode;
      const clsCode = (rawCode || rawName).toUpperCase().replace(/\s+/g, "");
      if (!clsName || !clsCode) {
        alert("Please enter a Class Name (e.g. 4HBM1) before clicking Add Class.");
        return;
      }
      if (!state.classes.some(c => String(c.code).toUpperCase() === clsCode)) {
        state.classes.push({
          id: "cls-" + Date.now(),
          name: clsName,
          code: clsCode,
          createdBy: state.user?.name || "Teacher"
        });
      }
      // If a colleague teacher adds a class under their own account, automatically assign it to them
      if (state.user && Array.isArray(state.user.assignedClasses) && !state.user.assignedClasses.includes("ALL")) {
        if (!state.user.assignedClasses.includes(clsCode)) {
          state.user.assignedClasses.push(clsCode);
        }
        const tRec = (state.teachers || []).find(t => t.id === state.user.userId || String(t.name).toLowerCase() === String(state.user.name || "").toLowerCase());
        if (tRec && Array.isArray(tRec.assignedClasses) && !tRec.assignedClasses.includes("ALL") && !tRec.assignedClasses.includes(clsCode)) {
          tRec.assignedClasses.push(clsCode);
        }
      }
      saveLocalState();
      render();
    });

    document.querySelectorAll("[data-remove-class]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remove-class");
        state.classes = state.classes.filter(c => c.id !== id);
        if (state.teacherClassFilter !== "ALL" && !state.classes.some(c => c.code === state.teacherClassFilter)) {
          state.teacherClassFilter = "ALL";
        }
        saveLocalState();
        render();
      });
    });

    document.getElementById("btn-add-teacher")?.addEventListener("click", () => {
      const tName = (document.getElementById("new-teacher-name")?.value || "").trim();
      const tPin = (document.getElementById("new-teacher-pin")?.value || "").trim().toUpperCase();
      const tClassRaw = (document.getElementById("new-teacher-class")?.value || "").trim();
      if (!tName || tPin.length < 3) {
        alert("Please enter a Teacher Name and a Personal PIN (at least 3 characters).");
        return;
      }
      const assignedClasses = [];
      if (tClassRaw) {
        const clsCode = tClassRaw.toUpperCase().replace(/\s+/g, "");
        assignedClasses.push(clsCode);
        if (!state.classes.some(c => String(c.code).toUpperCase() === clsCode)) {
          state.classes.push({ id: "cls-" + Date.now(), name: tClassRaw, code: clsCode, createdBy: tName });
        }
      }
      state.teachers = state.teachers || [];
      state.teachers.push({
        id: "teacher-" + Date.now(),
        name: tName,
        pin: tPin,
        isOwner: false,
        assignedClasses
      });
      saveLocalState();
      render();
    });

    document.querySelectorAll("[data-copy-teacher-link]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-copy-teacher-link");
        const t = (state.teachers || []).find(x => x.id === id);
        if (!t) return;
        const base = window.location.origin + window.location.pathname;
        const q = new URLSearchParams({
          teacher: "1",
          tName: t.name,
          tPin: t.pin,
          tClasses: (t.assignedClasses || ["ALL"]).join(",")
        });
        const url = `${base}?${q.toString()}`;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            btn.textContent = "✓ Link Copied!";
            setTimeout(() => { btn.textContent = "📋 Copy Personal Link"; }, 2000);
          }).catch(() => window.prompt("Copy this teacher's personal link:", url));
        } else {
          window.prompt("Copy this teacher's personal link:", url);
        }
      });
    });

    document.querySelectorAll("[data-remove-teacher]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remove-teacher");
        state.teachers = (state.teachers || []).filter(t => t.id !== id || t.isOwner);
        saveLocalState();
        render();
      });
    });

    // FLASHCARDS EVENTS
    document.getElementById("flashcard-topic-select")?.addEventListener("change", e => {
      state.flashcardTopic = e.target.value;
      state.flashcardIndex = 0;
      state.flashcardFlipped = false;
      render();
    });

    document.getElementById("flashcard-box")?.addEventListener("click", () => {
      state.flashcardFlipped = !state.flashcardFlipped;
      render();
    });

    document.getElementById("btn-fc-prev")?.addEventListener("click", () => {
      const all = getAllFlashcards().filter(c => state.flashcardTopic === "All" || c.topic === state.flashcardTopic);
      if (!all.length) return;
      state.flashcardIndex = (state.flashcardIndex - 1 + all.length) % all.length;
      state.flashcardFlipped = false;
      render();
    });

    document.getElementById("btn-fc-next")?.addEventListener("click", () => {
      const all = getAllFlashcards().filter(c => state.flashcardTopic === "All" || c.topic === state.flashcardTopic);
      if (!all.length) return;
      state.flashcardIndex = (state.flashcardIndex + 1) % all.length;
      state.flashcardFlipped = false;
      render();
    });

    document.getElementById("btn-fc-gotit")?.addEventListener("click", () => {
      const all = getAllFlashcards().filter(c => state.flashcardTopic === "All" || c.topic === state.flashcardTopic);
      const card = all[state.flashcardIndex];
      if (card) {
        state.masteredTerms = Array.from(new Set([...(state.masteredTerms || []), card.term]));
        state.reviseTerms = (state.reviseTerms || []).filter(t => t !== card.term);
        state.flashcardIndex = (state.flashcardIndex + 1) % Math.max(1, all.length);
        state.flashcardFlipped = false;
        saveLocalState();
        render();
      }
    });

    document.getElementById("btn-fc-revise")?.addEventListener("click", () => {
      const all = getAllFlashcards().filter(c => state.flashcardTopic === "All" || c.topic === state.flashcardTopic);
      const card = all[state.flashcardIndex];
      if (card) {
        state.reviseTerms = Array.from(new Set([...(state.reviseTerms || []), card.term]));
        state.masteredTerms = (state.masteredTerms || []).filter(t => t !== card.term);
        state.flashcardIndex = (state.flashcardIndex + 1) % Math.max(1, all.length);
        state.flashcardFlipped = false;
        saveLocalState();
        render();
      }
    });

    // N5 ASSIGNMENT CHECKLIST EVENTS
    document.querySelectorAll("[data-assign-check]").forEach(cb => {
      cb.addEventListener("change", () => {
        const id = cb.getAttribute("data-assign-check");
        state.assignmentChecklist = state.assignmentChecklist || {};
        state.assignmentChecklist[id] = cb.checked;
        saveLocalState();
        render();
      });
    });

    // FULL 70-MARK MOCK EXAM EVENTS
    document.getElementById("btn-start-full-mock")?.addEventListener("click", () => {
      startFullMockExam();
    });

    document.querySelectorAll("[data-mock-q]").forEach(ta => {
      ta.addEventListener("input", e => {
        state.mockAnswers[ta.getAttribute("data-mock-q")] = e.target.value;
      });
    });

    document.getElementById("btn-submit-full-mock")?.addEventListener("click", () => {
      if (!state.mockPaper) return;
      if (state.mockTimerId) clearInterval(state.mockTimerId);
      const details = {};
      let earned = 0;
      let total = 0;
      (state.mockPaper.sec1Questions || []).forEach((q, idx) => {
        const qKey = "s1-" + idx;
        const ans = state.mockAnswers[qKey] || "";
        const res = markSqaClient({ ...q, prompt: q.prompt || q.question, marks: q.marks || 2 }, ans);
        details[qKey] = res;
        earned += res.marks;
        total += res.marksAvailable;
      });
      (state.mockPaper.sec2Sections || []).forEach((sec, sIdx) => {
        (sec.questions || []).forEach((q, qIdx) => {
          const qKey = `s2-${sIdx}-${qIdx}`;
          const ans = state.mockAnswers[qKey] || "";
          const res = markSqaClient(q, ans);
          details[qKey] = res;
          earned += res.marks;
          total += res.marksAvailable;
        });
      });
      const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
      const grade = pct >= 70 ? "A" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "No Award";
      state.mockResults = { earned, total, pct, grade, details };
      saveLocalState();
      render();
    });
  }

  // Support 1-tap launch from Google Classroom / Phone Quick-Login button (?pupil=Name&code=4GBM1) or Private Teacher Link (?teacher=1)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("teacher")) {
      const tName = (params.get("tName") || "").trim();
      const tPin = (params.get("tPin") || "").trim().toUpperCase();
      const tClassesRaw = (params.get("tClasses") || "").trim();
      if (tName && tPin) {
        const assignedClasses = tClassesRaw
          ? tClassesRaw.split(",").map(c => c.trim().toUpperCase()).filter(Boolean)
          : [];
        // Ensure assigned classes exist in state.classes
        assignedClasses.forEach(code => {
          if (code !== "ALL" && !state.classes.some(c => String(c.code).toUpperCase() === code)) {
            state.classes.push({ id: "cls-" + code.toLowerCase(), name: code, code });
          }
        });
        // Register or update this colleague's teacher account on their device
        state.teachers = state.teachers || [];
        const existingIdx = state.teachers.findIndex(t => !t.isOwner && String(t.name).toLowerCase() === tName.toLowerCase());
        const rec = {
          id: existingIdx >= 0 ? state.teachers[existingIdx].id : ("teacher-" + Date.now()),
          name: tName,
          pin: tPin,
          isOwner: false,
          assignedClasses
        };
        if (existingIdx >= 0) state.teachers[existingIdx] = rec;
        else state.teachers.push(rec);
        // Automatically open their own Teacher Dashboard immediately (zero setup needed!)
        state.user = {
          userId: rec.id,
          name: rec.name,
          role: "teacher",
          teacher: true,
          owner: false,
          pinVerified: true,
          assignedClasses: rec.assignedClasses,
          classCode: "TEACHER",
          className: "Teacher"
        };
        state.showTeacherLogin = false;
        state.teacherUnlocked = true;
        state.teacherClassFilter = "ALL";
        state.activeTab = "teacher";
      } else {
        state.showTeacherLogin = true;
        state.user = null;
      }
      saveLocalState();
    } else if (state.user?.role === "admin") {
      state.user = null;
      saveLocalState();
    } else if (state.user && (state.user.name || "").trim().toLowerCase() === "lee morgan") {
      const customOwn = (state.classes || []).filter(c => c.createdBy === "Lee Morgan").map(c => String(c.code).toUpperCase());
      state.user = {
        userId: "teacher-lee-morgan",
        name: "Lee Morgan",
        role: "teacher",
        teacher: true,
        owner: false,
        pinVerified: true,
        assignedClasses: Array.from(new Set(["4CBM", "4CBM3", ...customOwn])),
        classCode: "TEACHER",
        className: "Teacher"
      };
      state.teacherUnlocked = true;
      state.teacherClassFilter = "ALL";
      state.activeTab = "teacher";
      saveLocalState();
    } else if (state.user && (state.user.name || "").trim().toLowerCase() === "craig stephenson") {
      const customOwn = (state.classes || []).filter(c => c.createdBy === "Craig Stephenson").map(c => String(c.code).toUpperCase());
      state.user = {
        userId: "teacher-craig-stephenson",
        name: "Craig Stephenson",
        role: "teacher",
        teacher: true,
        owner: false,
        pinVerified: true,
        assignedClasses: Array.from(new Set(["ABCD", ...customOwn])),
        classCode: "TEACHER",
        className: "Teacher"
      };
      state.teacherUnlocked = true;
      state.teacherClassFilter = "ALL";
      state.activeTab = "teacher";
      saveLocalState();
    } else if (state.user && ((state.user.name || "").trim().toLowerCase() === "rebecca" || (state.user.name || "").trim().toLowerCase().startsWith("rebecca "))) {
      const customOwn = (state.classes || []).filter(c => c.createdBy === "Rebecca" || c.createdBy === state.user.name).map(c => String(c.code).toUpperCase());
      state.user = {
        userId: "teacher-rebecca",
        name: state.user.name || "Rebecca",
        role: "teacher",
        teacher: true,
        owner: false,
        pinVerified: true,
        assignedClasses: customOwn,
        classCode: "TEACHER",
        className: "Teacher"
      };
      state.teacherUnlocked = true;
      state.teacherClassFilter = "ALL";
      state.activeTab = "teacher";
      saveLocalState();
    } else if (state.user?.role === "teacher" || state.user?.teacher) {
      state.teacherUnlocked = true;
      state.activeTab = "teacher";
    }
    const urlPupil = (params.get("pupil") || "").trim();
    const urlCode = (params.get("code") || "").trim().toUpperCase();
    if (urlPupil.length >= 2) {
      const matched = findExistingPupilByName(urlPupil, urlCode);
      if (matched) {
        state.user = { ...matched, role: "user" };
        saveLocalState();
      } else if (urlCode.length >= 2) {
        state.user = {
          userId: "pupil-" + urlPupil.toLowerCase().replace(/\s+/g, "-"),
          name: urlPupil,
          classCode: urlCode,
          className: urlCode,
          role: "user"
        };
        saveLocalState();
      } else {
        state.loginName = urlPupil;
      }
    }
  } catch {}

  render();
  syncFromServer();
})();
