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
    ["spreadsheet", "excel", "formula", "formulae", "=sum", "=average", "=if", "what-if"]
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
        const hitCount = ptStems.filter(stem =>
          answerStems.has(stem) || expandedAnswer.includes(stem)
        ).length;
        const threshold = ptStems.length <= 2 ? 1 : Math.max(2, Math.ceil(ptStems.length * 0.42));
        matched = hitCount >= threshold;
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
        if (parsed.pupils && parsed.pupils.length >= 40) return parsed;
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
      pupils: init.pupils || [],
      attempts: init.attempts || [],
      caseAttempts: init.caseAttempts || [],
      homeworkSubmissions: init.homeworkSubmissions || [],
      reviseTerms: [],
      customVideos: {}
    };
  }

  function saveLocalState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: state.user,
        classes: state.classes,
        pupils: state.pupils,
        attempts: state.attempts,
        caseAttempts: state.caseAttempts,
        homeworkSubmissions: state.homeworkSubmissions,
        reviseTerms: state.reviseTerms,
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

  const state = {
    user: isTeacherUrl ? null : (saved.user || null),
    rememberedPupil: saved.rememberedPupil || (saved.user && saved.user.role !== "admin" ? saved.user : null),
    showPhoneAppModal: !isStandaloneApp,
    loginName: "",
    loginCode: "",
    loginError: "",
    showTeacherLogin: isTeacherUrl,
    teacherNameInput: "Mrs Straub (Business Teacher)",
    teacherPinInput: "",
    teacherPinError: "",
    teacherUnlocked: false,
    activeTab: "drills", // 'drills' | 'lessons' | 'practice' | 'cases' | 'homework' | 'progress' | 'teacher'

    // Command Word Drills state
    drillCategory: "identify", // 'identify' | 'describe' | 'explain' | 'compare' | 'justify' | 'multicommand'
    drillTopic: "All topics",
    drillLevel: "All levels",
    drillIndex: 0,
    drillAnswer: "",
    drillResult: null,
    drillShowHint: false,
    drillShowVideo: false,

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

    // Case studies state
    activeCaseId: DATA.caseStudies[0]?.id || "cs-caledonia",
    caseAnswers: {},
    caseResults: {},

    // Homework state
    activeHwMonth: DATA.homeworkMonths[0] || "October 2026",
    hwAnswers: {},
    hwResults: {},

    // Teacher Dashboard state
    newClassName: "",
    newClassCode: "",
    teacherClassFilter: "ALL",
    importCsvText: "",
    importStatusMsg: "",
    selectedPupilInspect: null,

    // Synced DB collections
    classes: saved.classes,
    pupils: saved.pupils,
    attempts: saved.attempts,
    caseAttempts: saved.caseAttempts,
    homeworkSubmissions: saved.homeworkSubmissions,
    customVideos: saved.customVideos || {}
  };

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
    const matchedPupil = findExistingPupilByName(state.loginName, state.loginCode);
    const rem = state.rememberedPupil;
    return `
      <main class="login-page">
        <section class="login-panel">
          <div class="login-logo">N5</div>
          <p class="kicker">NATIONAL 5 BUSINESS MANAGEMENT</p>
          <h1>Welcome to your Revision Hub</h1>

          ${rem ? `
            <div style="background:#dcfce7;border:2px solid #22c55e;border-radius:14px;padding:12px 14px;margin-bottom:14px;">
              <div style="font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.04em;">Saved on This Phone / Device</div>
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
          <div style="margin-top:14px;padding:12px;border-radius:12px;background:#f0fdfa;border:1.5px solid #99f6e4;">
            <button type="button" class="btn btn-primary" id="btn-install-phone-app" style="width:100%;padding:11px;background:#0d9488;font-size:14px;">
              📲 Add "N5 Business" App Button to My Phone Screen
            </button>
            ${state.showPhoneAppModal ? `
              <div style="margin-top:10px;padding:12px;background:#ffffff;border-radius:10px;border:1px solid #cbd5e1;font-size:13px;line-height:1.5;color:var(--text);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                  <div style="width:42px;height:42px;border-radius:10px;background:#0f766e;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;">
                    <span style="font-size:16px;line-height:1;">N5</span>
                    <span style="font-size:6px;">BUSINESS</span>
                  </div>
                  <div>
                    <strong>How to put this App Icon on your Phone Screen (takes 5 seconds):</strong>
                  </div>
                </div>
                <div style="margin-bottom:6px;">🍎 <strong>On iPhone (Safari):</strong><br/>1. Tap the <strong>Share</strong> button <strong>(square with arrow ↑)</strong> at the bottom of Safari.<br/>2. Scroll down and tap <strong>"Add to Home Screen" (➕)</strong>, then tap <strong>Add</strong>.</div>
                <div>🤖 <strong>On Android (Chrome):</strong><br/>1. Tap the <strong>3 dots (⋮)</strong> in the top-right corner of Chrome.<br/>2. Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</div>
                <div style="margin-top:8px;color:#0f766e;font-weight:700;">✓ Once added, tapping the N5 Business icon on your phone opens straight into your account!</div>
              </div>
            ` : ""}
          </div>

          ${state.showTeacherLogin ? `
            <div class="teacher-area" style="display:flex;flex-direction:column;gap:12px;margin-top:8px;padding:18px;border-radius:14px;background:#f8fafc;border:2px solid #0f766e;">
              <div style="font-weight:800;font-size:16px;color:#0f766e;">🔒 Private Teacher Dashboard Login (Mrs Straub)</div>
              <p style="margin:0;font-size:13.5px;color:var(--text-muted);">Enter your Teacher PIN below to unlock the Teacher Dashboard &amp; Class Progress Reports.</p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <label style="font-size:13px;font-weight:700;color:var(--text);">Teacher Display Name
                  <input type="text" id="teacher-name-field" value="${escapeHtml(state.teacherNameInput)}" placeholder="Mrs Straub (Business Teacher)" style="width:100%;margin-top:4px;padding:11px;border-radius:8px;border:1.5px solid #cbd5e1;font-size:14.5px;" />
                </label>
                <label style="font-size:13px;font-weight:700;color:var(--text);">Teacher Password / PIN
                  <input type="password" id="teacher-pin-field" value="${escapeHtml(state.teacherPinInput)}" placeholder="Enter Teacher PIN" autofocus style="width:100%;margin-top:4px;padding:11px;border-radius:8px;border:1.5px solid #0f766e;font-size:15px;" />
                </label>
              </div>
              ${state.teacherPinError ? `<div style="color:#dc2626;font-size:13.5px;font-weight:700;padding:8px 10px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">${escapeHtml(state.teacherPinError)}</div>` : ""}
              <button type="button" class="btn btn-primary" id="btn-teacher-login" style="width:100%;padding:13px;font-size:15px;font-weight:700;">
                🎓 Unlock Teacher Dashboard
              </button>
            </div>
          ` : ""}

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
          <div style="white-space:pre-line;font-size:13.5px;background:rgba(255,255,255,0.75);padding:10px 12px;border-radius:8px;border:1px solid var(--border);">
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

    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
          <div>
            <p class="kicker">SQA COMMAND WORD DRILL HUB</p>
            <h2 style="margin-bottom:4px;">Targeted Command Word Drills — Instant Marking & Feedback</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:14px;">
              Choose a command word below (<strong>Identify</strong>, <strong>Describe</strong>, <strong>Explain</strong>, etc.) to practise SQA questions back-to-back, get marked straight away, and track your areas to improve.
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <select id="drill-topic-select" style="width:auto;">
              <option value="All topics" ${state.drillTopic === "All topics" ? "selected" : ""}>All 5 Course Areas</option>
              ${Object.keys(DATA.courseAreas).map(t => `<option value="${escapeHtml(t)}" ${state.drillTopic === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
            </select>
            <select id="drill-level-select" style="width:auto;">
              <option value="All levels" ${state.drillLevel === "All levels" ? "selected" : ""}>All Difficulty Levels (A/B/C)</option>
              <option value="C" ${state.drillLevel === "C" ? "selected" : ""}>Level C — Support</option>
              <option value="B" ${state.drillLevel === "B" ? "selected" : ""}>Level B — Standard N5</option>
              <option value="A" ${state.drillLevel === "A" ? "selected" : ""}>Level A — Challenge</option>
            </select>
          </div>
        </div>

        <div class="drill-selector-grid">
          ${drillCats.map(c => {
            const count = DATA.questions.filter(q => getQuestionDrillCategory(q) === c.key).length;
            const stat = analytics.commandStats.find(s => s.key === c.key);
            const avgBadge = stat && stat.attempts > 0 ? `${stat.average}% avg (${stat.attempts})` : `${count} questions`;
            return `
              <button type="button" class="drill-pill-card ${state.drillCategory === c.key ? "active" : ""}" data-drill-cat="${c.key}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <span class="badge ${state.drillCategory === c.key ? "badge-primary" : ""}">${escapeHtml(avgBadge)}</span>
                </div>
                <h4>${escapeHtml(c.title)}</h4>
                <p><strong>${escapeHtml(c.sub)}</strong> · ${escapeHtml(c.desc)}</p>
              </button>
            `;
          }).join("")}
        </div>

        <div class="two-col-layout">
          <div>
            <!-- Command Word Blueprint + YouTube Video Toggle -->
            <div class="side-card" style="margin-bottom:16px;background:var(--surface-tint);border-color:#bfdbfe;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div>
                  <span class="badge badge-primary">SQA Exam Technique Blueprint: ${escapeHtml(guide.command)}</span>
                  <h3 style="margin:6px 0 4px 0;font-size:17px;">${escapeHtml(guide.formula)}</h3>
                  <p style="margin:0;font-size:13.5px;color:var(--text-secondary);">${escapeHtml(guide.rule)}</p>
                </div>
                <button type="button" class="btn btn-outline btn-sm" id="btn-toggle-drill-video">
                  ▶ ${state.drillShowVideo ? "Hide Command Word Video" : "Watch YouTube Guide (" + guide.command + ")"}
                </button>
              </div>

              ${state.drillShowVideo ? `
                <div class="video-card" style="margin-top:12px;">
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

              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:12px;font-size:13px;">
                <div style="background:#dcfce7;border:1px solid #86efac;padding:10px;border-radius:8px;">
                  <strong style="color:#15803d;">✓ Full-Mark Example (${escapeHtml(guide.examplePrompt)}):</strong>
                  <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(guide.goodAnswer)}</div>
                </div>
                <div style="background:#fee2e2;border:1px solid #fca5a5;padding:10px;border-radius:8px;">
                  <strong style="color:#b91c1c;">✗ Common Mistake to Avoid:</strong>
                  <div style="white-space:pre-line;margin-top:4px;">${escapeHtml(guide.badAnswer)}</div>
                </div>
              </div>
            </div>

            ${!currentQ ? `
              <div class="question-card">
                <p>No drill questions match that exact filter combination. Try selecting "All 5 Course Areas" or "All Difficulty Levels".</p>
              </div>
            ` : `
              <div class="question-card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <span class="badge badge-primary">${escapeHtml(currentQ.primaryCommand.toUpperCase())}</span>
                    <span class="badge">${ currentQ.marks } ${ currentQ.marks === 1 ? "mark" : "marks" }</span>
                    <span class="badge">Level ${escapeHtml(currentQ.computedLevel || currentQ.level || "B")}</span>
                    <span class="badge">${escapeHtml(currentQ.topic)} · ${escapeHtml(currentQ.subtopic)}</span>
                    <span class="badge">${escapeHtml(String(currentQ.sourceYear))} ${escapeHtml(currentQ.sourceQuestion)}</span>
                  </div>
                  <span style="font-size:13px;font-weight:600;color:var(--text-muted);">
                    Drill Question ${safeIdx + 1} of ${questions.length}
                  </span>
                </div>

                <h3 style="font-size:18px;margin:8px 0 12px 0;line-height:1.45;">
                  ${escapeHtml(currentQ.text)}
                </h3>

                <label for="drill-answer-box" style="font-weight:600;font-size:13.5px;display:block;margin-bottom:6px;">
                  Your answer (aim for ${currentQ.marks} distinct ${currentQ.marks === 1 ? "point" : "points"}):
                </label>
                <textarea
                  id="drill-answer-box"
                  rows="5"
                  placeholder="Write your SQA answer here using bullet points…"
                >${escapeHtml(state.drillAnswer)}</textarea>

                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:12px;">
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="btn btn-primary" id="btn-mark-drill">
                      ✓ Mark Straight Away
                    </button>
                    <button type="button" class="btn btn-outline" id="btn-drill-hint">
                      ${state.drillShowHint ? "Hide Hint" : "Show Hint"}
                    </button>
                  </div>
                  <div style="display:flex;gap:8px;">
                    <button type="button" class="btn btn-outline btn-sm" id="btn-prev-drill" ${safeIdx === 0 ? "disabled" : ""}>
                      ← Previous
                    </button>
                    <button type="button" class="btn btn-soft btn-sm" id="btn-next-drill">
                      Next Drill Question →
                    </button>
                  </div>
                </div>

                ${state.drillShowHint ? `
                  <div style="margin-top:12px;padding:12px;background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:8px;font-size:13.5px;">
                    <strong>SQA Hint:</strong> ${escapeHtml(currentQ.hint)}
                    <div style="margin-top:4px;color:var(--text-secondary);"><strong>Marking Rule:</strong> ${escapeHtml(currentQ.markingRule)}</div>
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
                Your live score across every SQA command word type. Click any row to drill it immediately:
              </p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${analytics.commandStats.map(c => {
                  const pct = c.average ?? 0;
                  const barColor = c.attempts === 0 ? "#cbd5e1" : pct >= 70 ? "#15803d" : pct >= 50 ? "#d97706" : "#b91c1c";
                  return `
                    <div style="cursor:pointer;" data-drill-cat="${c.key}">
                      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:3px;">
                        <span>${escapeHtml(c.label)}</span>
                        <span>${c.attempts === 0 ? "Not drilled yet" : `${pct}% (${c.attempts})`}</span>
                      </div>
                      <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
                        <div style="height:100%;width:${c.attempts === 0 ? 0 : pct}%;background:${barColor};"></div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>

            <div class="side-card">
              <h3 style="font-size:16px;margin-bottom:8px;">Areas to Improve (Tracked Automatically)</h3>
              ${analytics.subtopicStats.length === 0 ? `
                <p style="font-size:13px;color:var(--text-muted);margin:0;">
                  Mark your first drill question on the left and your weakest topics & command words will appear here automatically.
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
                          Watch Video & Notes
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
    const videoId = customVid?.videoId || activeLesson.video?.videoId || "vjnHyYKHey4";
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
                  <a href="https://www.youtube.com/watch?v=${escapeHtml(videoId)}" target="_blank" rel="noopener" class="btn btn-soft btn-sm">
                    Watch on YouTube ↗
                  </a>
                  <a href="${escapeHtml(ytSearchUrl)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="background:#1e293b;color:#fff;border-color:#334155;">
                    More N5 Videos on Topic ↗
                  </a>
                </div>
              </div>
              <div class="video-frame-wrap">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/${escapeHtml(videoId)}"
                  title="${escapeHtml(videoTitle)}"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              </div>
              <div class="video-footer">
                <span>${escapeHtml(activeLesson.video?.summary || "Watch this video alongside the key points below for missed classes or exam revision.")}</span>
                ${state.user?.role === "admin" ? `
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
          </article>
        </div>
      </section>
    `;
  }

  function renderPracticeTab() {
    const subtopics = ["All subtopics", ...(DATA.courseAreas[state.practiceTopic] || [])];
    const questions = getPracticeQuestions();
    const safeIdx = questions.length ? Math.min(state.practiceIdx, questions.length - 1) : 0;
    const currentQ = questions[safeIdx];

    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div>
            <p class="kicker">TOPIC-ORGANISED SQA PAST-PAPER PRACTICE (2018–2026)</p>
            <h2 style="margin-bottom:4px;">Past-Paper & Exam-Style Questions by Topic & Level</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:14px;">
              Filter by course area, subtopic, and difficulty level (<strong>A — Challenge</strong>, <strong>B — Standard</strong>, <strong>C — Support</strong>).
            </p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-bottom:16px;">
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
            <p>No questions in this exact level/subtopic filter. Try switching Difficulty Level (A, B, or C) or selecting "All subtopics".</p>
          </div>
        ` : `
          <div class="question-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <span class="badge badge-primary">${escapeHtml(currentQ.primaryCommand.toUpperCase())}</span>
                <span class="badge">${currentQ.marks} ${currentQ.marks === 1 ? "mark" : "marks"}</span>
                <span class="badge">Level ${escapeHtml(currentQ.computedLevel || currentQ.level)}</span>
                <span class="badge">${escapeHtml(currentQ.subtopic)}</span>
                <span class="badge">${escapeHtml(String(currentQ.sourceYear))} · ${escapeHtml(currentQ.sourceQuestion)}</span>
              </div>
              <span style="font-size:13px;font-weight:600;color:var(--text-muted);">
                Question ${safeIdx + 1} of ${questions.length}
              </span>
            </div>

            <h3 style="font-size:18px;margin:8px 0 12px 0;">${escapeHtml(currentQ.text)}</h3>

            <textarea
              id="prac-answer-box"
              rows="5"
              placeholder="Type your own SQA exam answer here…"
            >${escapeHtml(state.practiceAnswer)}</textarea>

            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:12px;">
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-primary" id="btn-mark-prac">
                  ✓ Mark Answer (SQA Auto-Marker)
                </button>
                <button type="button" class="btn btn-outline" id="btn-prac-hint">
                  ${state.practiceHint ? "Hide Hint" : "Show Hint"}
                </button>
              </div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="btn btn-outline btn-sm" id="btn-prev-prac" ${safeIdx === 0 ? "disabled" : ""}>
                  ← Previous
                </button>
                <button type="button" class="btn btn-soft btn-sm" id="btn-next-prac">
                  Next Question →
                </button>
              </div>
            </div>

            ${state.practiceHint ? `
              <div style="margin-top:12px;padding:12px;background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:8px;font-size:13.5px;">
                <strong>Hint:</strong> ${escapeHtml(currentQ.hint)}
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
        <p class="kicker">SCOTTISH BUSINESS CASE STUDIES</p>
        <h2 style="margin-bottom:6px;">Apply Business Knowledge to Real-World Scenarios</h2>
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
          <p style="margin:0;font-size:14.5px;">${escapeHtml(activeCase.scenario)}</p>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          ${(activeCase.questions || []).map((q, idx) => {
            const key = `${activeCase.id}-${idx}`;
            const res = state.caseResults[key];
            return `
              <div class="question-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <strong>Question ${idx + 1}: ${escapeHtml(q.q)}</strong>
                  <span class="badge">${q.marks} marks</span>
                </div>
                <textarea
                  rows="3"
                  data-case-input="${escapeHtml(key)}"
                  placeholder="Write your answer linked to ${escapeHtml(activeCase.title)}…"
                >${escapeHtml(state.caseAnswers[key] || "")}</textarea>
                <div style="margin-top:8px;">
                  <button type="button" class="btn btn-primary btn-sm" data-mark-case="${escapeHtml(activeCase.id)}||${idx}">
                    ✓ Mark Case Study Answer
                  </button>
                </div>
                ${renderFeedbackCard(res, { marks: q.marks, solution: q.solution })}
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

    return `
      <section class="section-panel">
        <p class="kicker">MONTHLY HOMEWORK (OCTOBER 2026 – APRIL 2027)</p>
        <h2 style="margin-bottom:6px;">Monthly SQA Homework Tasks (Auto-Marked & Saved)</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
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

        <div style="display:flex;flex-direction:column;gap:14px;">
          ${monthQuestions.map(hw => {
            const existingSub = subs.find(s => s.questionId === hw.id);
            const ans = existingSub ? existingSub.answer : (state.hwAnswers[hw.id] || "");
            const res = state.hwResults[hw.id] || (existingSub ? {
              marks: existingSub.marks,
              maxMarks: existingSub.marksAvailable,
              percentage: existingSub.percentage,
              feedback: existingSub.feedback,
              commandPassed: true,
              awardedPoints: [],
              improvements: [],
              modelAnswer: hw.solution
            } : null);

            return `
              <div class="question-card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                  <div>
                    <span class="badge badge-primary">Q${hw.number} · ${escapeHtml(hw.topic)}</span>
                    <span class="badge">${hw.marks} marks</span>
                    <span class="badge">Due: ${escapeHtml(hw.deadline)}</span>
                  </div>
                  ${existingSub ? `<span class="badge badge-success">✓ Submitted (${existingSub.marks}/${hw.marks})</span>` : ""}
                </div>
                <h4 style="margin:8px 0;">${escapeHtml(hw.question)}</h4>
                <textarea
                  rows="3"
                  data-hw-input="${escapeHtml(hw.id)}"
                  ${existingSub ? "disabled" : ""}
                  placeholder="Write your homework answer here…"
                >${escapeHtml(ans)}</textarea>
                ${!existingSub ? `
                  <div style="margin-top:8px;">
                    <button type="button" class="btn btn-primary btn-sm" data-submit-hw="${escapeHtml(hw.id)}">
                      ✓ Submit & Mark Homework Question
                    </button>
                  </div>
                ` : ""}
                ${renderFeedbackCard(res, { marks: hw.marks, solution: hw.solution })}
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderProgressTab(analytics) {
    const myAttempts = getUserAttempts();
    return `
      <section class="section-panel">
        <p class="kicker">PERSONAL PROGRESS & AREAS REQUIRING IMPROVEMENT</p>
        <h2 style="margin-bottom:6px;">Your Saved Revision Record & Weak Topic Diagnosis</h2>

        <div class="dashboard-top-grid" style="margin-bottom:18px;">
          <div class="stat-card">
            <span class="kicker">OVERALL AVERAGE</span>
            <h3 style="font-size:28px;margin:4px 0;">${analytics.avgPct}%</h3>
            <p style="margin:0;font-size:13px;color:var(--text-muted);">Across ${analytics.totalAttempts} marked practice & drill attempts</p>
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
                Open Video & Lesson Notes
              </button>
            ` : ""}
          </div>
        </div>

        <h3 style="font-size:17px;margin-bottom:8px;">Recent Marked Answers (${myAttempts.length})</h3>
        ${myAttempts.length === 0 ? `<p style="color:var(--text-muted);">No attempts recorded yet.</p>` : `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Topic & Subtopic</th>
                  <th>Command Word</th>
                  <th>Score</th>
                  <th>Your Answer & Feedback</th>
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
    const searchQuery = (state.teacherSearchQuery || "").trim().toLowerCase();
    const filteredPupils = state.pupils.filter(p => {
      const matchesClass = state.teacherClassFilter === "ALL" || p.classCode?.toUpperCase() === state.teacherClassFilter;
      const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery) || p.classCode?.toLowerCase().includes(searchQuery);
      return matchesClass && matchesSearch;
    });

    const totalAttempts = state.attempts.length;
    const totalHw = state.homeworkSubmissions.length;
    const avgPracticeAll = totalAttempts
      ? Math.round(state.attempts.reduce((s, a) => s + (Number(a.percentage) || 0), 0) / totalAttempts)
      : 0;
    const avgHwAll = totalHw
      ? Math.round(state.homeworkSubmissions.reduce((s, h) => s + (Number(h.percentage) || 0), 0) / totalHw)
      : 0;

    const inspectedPupil = state.selectedPupilInspect
      ? state.pupils.find(p => p.userId === state.selectedPupilInspect || p.name === state.selectedPupilInspect)
      : null;
    const inspectedAtt = inspectedPupil
      ? state.attempts.filter(a => a.userId === inspectedPupil.userId || (a.userName?.toLowerCase() === inspectedPupil.name.toLowerCase()))
      : [];
    const inspectedHw = inspectedPupil
      ? state.homeworkSubmissions.filter(s => s.userId === inspectedPupil.userId || (s.userName?.toLowerCase() === inspectedPupil.name.toLowerCase()))
      : [];

    return `
      <section class="section-panel">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div>
            <p class="kicker">MRS STRAUB'S TEACHER DASHBOARD · PUPIL RESULTS &amp; HOMEWORK MARKS</p>
            <h2 style="margin-bottom:4px;">Class Overview, Individual Pupil Results &amp; Homework Submissions</h2>
            <p style="margin:0;color:var(--text-secondary);font-size:14px;">
              Click <strong>"📋 View Results &amp; Homework"</strong> next to any pupil below to inspect all of their practice answers, topic breakdown, and homework marks.
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="btn-export-csv">
            ⬇ Download Full Class Results CSV
          </button>
        </div>

        <!-- SUMMARY METRIC CARDS -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:20px;">
          <div class="side-card" style="padding:14px;">
            <span style="font-size:12px;color:var(--text-muted);font-weight:700;text-transform:uppercase;">Enrolled Pupils</span>
            <div style="font-size:26px;font-weight:900;color:#0f766e;margin-top:4px;">${state.pupils.length}</div>
            <div style="font-size:12.5px;color:var(--text-secondary);">Across ${state.classes.length} classes (4GBM1, 4FBM2, 4CBM3, ABCD)</div>
          </div>
          <div class="side-card" style="padding:14px;">
            <span style="font-size:12px;color:var(--text-muted);font-weight:700;text-transform:uppercase;">Practice &amp; Drill Attempts</span>
            <div style="font-size:26px;font-weight:900;color:#0284c7;margin-top:4px;">${totalAttempts}</div>
            <div style="font-size:12.5px;color:var(--text-secondary);">Class Practice Average: <strong>${avgPracticeAll}%</strong></div>
          </div>
          <div class="side-card" style="padding:14px;">
            <span style="font-size:12px;color:var(--text-muted);font-weight:700;text-transform:uppercase;">Homework Submissions</span>
            <div style="font-size:26px;font-weight:900;color:#7c3aed;margin-top:4px;">${totalHw}</div>
            <div style="font-size:12.5px;color:var(--text-secondary);">Class Homework Average: <strong>${avgHwAll}%</strong></div>
          </div>
        </div>

        ${inspectedPupil ? `
          <!-- INDIVIDUAL PUPIL INSPECTOR PANEL -->
          <div style="margin-bottom:24px;padding:18px;border-radius:14px;background:#f0fdfa;border:2px solid #0f766e;box-shadow:0 4px 16px rgba(15,118,110,0.1);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
              <div>
                <span class="badge badge-primary" style="margin-bottom:4px;">INDIVIDUAL PUPIL REPORT</span>
                <h3 style="margin:0;font-size:20px;color:#0f172a;">
                  👤 ${escapeHtml(inspectedPupil.name)} <span style="font-size:14px;font-weight:600;color:#0f766e;">(Class ${escapeHtml(inspectedPupil.className || inspectedPupil.classCode)} · Code: ${escapeHtml(inspectedPupil.classCode)})</span>
                </h3>
              </div>
              <button type="button" class="btn btn-outline btn-sm" id="btn-close-pupil-inspect" style="background:#fff;">
                ✕ Close Pupil Report
              </button>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px;">
              <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #cbd5e1;">
                <div style="font-size:12px;color:var(--text-muted);font-weight:700;">PRACTICE ATTEMPTS</div>
                <div style="font-size:22px;font-weight:800;">${inspectedAtt.length}</div>
              </div>
              <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #cbd5e1;">
                <div style="font-size:12px;color:var(--text-muted);font-weight:700;">PRACTICE AVERAGE</div>
                <div style="font-size:22px;font-weight:800;color:#0f766e;">
                  ${inspectedAtt.length ? Math.round(inspectedAtt.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / inspectedAtt.length) + "%" : (inspectedPupil.practiceAverage ? inspectedPupil.practiceAverage + "%" : "—")}
                </div>
              </div>
              <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #cbd5e1;">
                <div style="font-size:12px;color:var(--text-muted);font-weight:700;">HOMEWORK SUBMITTED</div>
                <div style="font-size:22px;font-weight:800;">${inspectedHw.length}</div>
              </div>
              <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #cbd5e1;">
                <div style="font-size:12px;color:var(--text-muted);font-weight:700;">HOMEWORK AVERAGE</div>
                <div style="font-size:22px;font-weight:800;color:#7c3aed;">
                  ${inspectedHw.length ? Math.round(inspectedHw.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / inspectedHw.length) + "%" : (inspectedPupil.homeworkAverage ? inspectedPupil.homeworkAverage + "%" : "—")}
                </div>
              </div>
              <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #cbd5e1;">
                <div style="font-size:12px;color:var(--text-muted);font-weight:700;">WEAKEST AREA / COMMAND</div>
                <div style="font-size:13.5px;font-weight:700;margin-top:4px;">${escapeHtml(inspectedPupil.weakestSubtopic || "—")} (${escapeHtml(inspectedPupil.weakestCommand || "—")})</div>
              </div>
            </div>

            <div class="two-col-layout">
              <!-- Pupil's Homework Marks -->
              <div style="background:#fff;padding:14px;border-radius:10px;border:1px solid #cbd5e1;">
                <h4 style="margin:0 0 10px 0;font-size:15px;">📅 Homework Marks &amp; Submissions (${inspectedHw.length})</h4>
                ${inspectedHw.length === 0 ? `
                  <p style="margin:0;font-size:13px;color:var(--text-muted);">No homework submissions recorded for ${escapeHtml(inspectedPupil.name)} yet.</p>
                ` : `
                  <div class="data-table-wrap" style="max-height:260px;overflow-y:auto;">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Month / Task</th>
                          <th>Marks</th>
                          <th>%</th>
                          <th>Answer / Feedback</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${inspectedHw.map(h => `
                          <tr>
                            <td><strong>${escapeHtml(h.month || "Homework")}</strong><br/><small style="color:var(--text-muted);">${escapeHtml(h.topic || h.questionId || "")}</small></td>
                            <td><strong>${h.marks ?? "—"}/${h.marksAvailable ?? "—"}</strong></td>
                            <td><span class="badge ${(h.percentage || 0) >= 70 ? "badge-success" : (h.percentage || 0) >= 50 ? "badge-warning" : "badge-danger"}">${h.percentage ?? 0}%</span></td>
                            <td style="font-size:12.5px;">${escapeHtml(h.answer || h.feedback || "")}</td>
                            <td style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(h.submittedAt || "—")}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>

              <!-- Pupil's Practice & Drill Results -->
              <div style="background:#fff;padding:14px;border-radius:10px;border:1px solid #cbd5e1;">
                <h4 style="margin:0 0 10px 0;font-size:15px;">📝 Past-Paper &amp; Command Drill Attempts (${inspectedAtt.length})</h4>
                ${inspectedAtt.length === 0 ? `
                  <p style="margin:0;font-size:13px;color:var(--text-muted);">No practice attempts recorded for ${escapeHtml(inspectedPupil.name)} yet.</p>
                ` : `
                  <div class="data-table-wrap" style="max-height:260px;overflow-y:auto;">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Topic / Subtopic</th>
                          <th>Command</th>
                          <th>Marks</th>
                          <th>Answer &amp; Feedback</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${inspectedAtt.map(a => `
                          <tr>
                            <td><strong>${escapeHtml(a.subtopic || a.topic)}</strong><br/><small style="color:var(--text-muted);">${escapeHtml(a.topic || "")}</small></td>
                            <td><span class="badge badge-primary">${escapeHtml((a.primaryCommand || "describe").toUpperCase())}</span></td>
                            <td><strong>${a.marks}/${a.marksAvailable}</strong> (${a.percentage}%)</td>
                            <td style="font-size:12.5px;">
                              <div>${escapeHtml(a.answer || "")}</div>
                              ${a.improvements?.length ? `<div style="color:#d97706;font-size:11.5px;margin-top:2px;">Target: ${escapeHtml(a.improvements[0])}</div>` : ""}
                            </td>
                            <td style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(a.createdAt || "—")}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>
            </div>
          </div>
        ` : ""}

        <!-- Pupil Roster Table Filter & Search -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
          <h3 style="font-size:17px;margin:0;">Individual Pupils, Practice Results &amp; Homework Marks (${filteredPupils.length} pupils)</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <input
              type="text"
              id="teacher-pupil-search"
              placeholder="🔍 Search pupil name..."
              value="${escapeHtml(state.teacherSearchQuery || "")}"
              style="width:200px;padding:8px 11px;font-size:13.5px;"
            />
            <select id="teacher-class-filter" style="width:auto;padding:8px 11px;">
              <option value="ALL" ${state.teacherClassFilter === "ALL" ? "selected" : ""}>All Classes (${state.pupils.length})</option>
              ${state.classes.map(c => `<option value="${escapeHtml(c.code)}" ${state.teacherClassFilter === c.code ? "selected" : ""}>${escapeHtml(c.name)} (${escapeHtml(c.code)})</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="data-table-wrap" style="margin-bottom:24px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Pupil Name</th>
                <th>Class</th>
                <th>Practice Attempts</th>
                <th>Practice Avg %</th>
                <th>Homework Submitted</th>
                <th>Homework Avg %</th>
                <th>Weakest Subtopic</th>
                <th>Weakest Command Word</th>
                <th>Last Activity</th>
                <th>Individual Breakdown</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPupils.length === 0 ? `
                <tr><td colspan="10" style="text-align:center;color:var(--text-muted);">No pupils match this filter.</td></tr>
              ` : filteredPupils.map(p => {
                const pAtt = state.attempts.filter(a => a.userId === p.userId || (a.userName?.toLowerCase() === p.name.toLowerCase() && a.classCode?.toUpperCase() === p.classCode.toUpperCase()));
                const pHw = state.homeworkSubmissions.filter(s => s.userId === p.userId || (s.userName?.toLowerCase() === p.name.toLowerCase() && s.classCode?.toUpperCase() === p.classCode.toUpperCase()));
                const avg = pAtt.length ? Math.round(pAtt.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / pAtt.length) : (p.practiceAverage ?? null);
                const hwAvg = pHw.length ? Math.round(pHw.reduce((x, y) => x + (Number(y.percentage) || 0), 0) / pHw.length) : (p.homeworkAverage ?? null);
                const weakest = [...pAtt].sort((a, b) => a.percentage - b.percentage)[0];
                const weakSub = weakest ? (weakest.subtopic || weakest.topic) : (p.weakestSubtopic || "—");
                const weakCmd = weakest ? (weakest.primaryCommand || "describe") : (p.weakestCommand || "—");
                const lastAct = p.lastActiveAt || p.lastActivity || (pAtt[0]?.createdAt ? pAtt[0].createdAt : "—");
                const isSelected = state.selectedPupilInspect === p.userId;
                return `
                  <tr style="${isSelected ? "background:#ccfbf1;" : ""}">
                    <td>
                      <button type="button" data-inspect-pupil="${escapeHtml(p.userId)}" style="background:none;border:none;padding:0;color:#0f766e;font-weight:800;font-size:14px;cursor:pointer;text-decoration:underline;">
                        ${escapeHtml(p.name)}
                      </button>
                    </td>
                    <td><span class="badge badge-primary">${escapeHtml(p.classCode)}</span></td>
                    <td><strong>${pAtt.length}</strong></td>
                    <td>${avg !== null ? `<span class="badge ${avg >= 70 ? "badge-success" : avg >= 50 ? "badge-warning" : "badge-danger"}">${avg}%</span>` : "—"}</td>
                    <td><strong>${pHw.length}</strong></td>
                    <td>${hwAvg !== null ? `<span class="badge ${hwAvg >= 70 ? "badge-success" : hwAvg >= 50 ? "badge-warning" : "badge-danger"}">${hwAvg}%</span>` : "—"}</td>
                    <td>${escapeHtml(weakSub)}</td>
                    <td>${weakCmd !== "—" ? `<span class="badge">${escapeHtml(weakCmd)}</span>` : "—"}</td>
                    <td style="font-size:12px;color:var(--text-muted);">${escapeHtml(lastAct)}</td>
                    <td>
                      <button type="button" class="btn btn-soft btn-sm" data-inspect-pupil="${escapeHtml(p.userId)}" style="white-space:nowrap;">
                        📋 View Results &amp; Homework
                      </button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>

        <div class="two-col-layout">
          <!-- Create / Add Existing Class Code -->
          <div class="side-card">
            <h3 style="font-size:16px;margin-bottom:6px;">Add or Register Class Codes</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin:0 0 10px 0;">
              Active class codes: <code>4GBM1</code>, <code>4FBM2</code>, <code>4CBM3</code>, and <code>ABCD</code>. Add another class code anytime:
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <input type="text" id="new-class-name" placeholder="Class name, e.g. 4B1" value="${escapeHtml(state.newClassName)}" style="flex:1;" />
              <input type="text" id="new-class-code" placeholder="Class code, e.g. BM4B1" value="${escapeHtml(state.newClassCode)}" style="flex:1;" />
              <button type="button" class="btn btn-primary btn-sm" id="btn-save-class">Save Class Code</button>
            </div>
            <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">
              ${state.classes.map(c => `<span class="badge badge-primary">${escapeHtml(c.name)}: <strong>${escapeHtml(c.code)}</strong></span>`).join("")}
            </div>
          </div>

          <!-- Import Floot CSV or Bulk Pupil Roster -->
          <div class="side-card">
            <h3 style="font-size:16px;margin-bottom:6px;">Import Additional Pupils &amp; Class Codes</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin:0 0 8px 0;">
              Paste lines of <code>Pupil Name, Class Code</code> to add more pupils to your roster:
            </p>
            <textarea
              id="import-csv-box"
              rows="2"
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
      </section>
    `;
  }

  function renderMainHub() {
    const analytics = computeAnalytics();
    const isTeacher = state.user?.role === "admin";

    return `
      <div class="app-shell">
        <header class="top-bar">
          <div class="brand-row">
            <span class="brand-badge">N5 BUSINESS</span>
            <div>
              <strong style="font-size:16px;display:block;">National 5 Business Management Revision Hub</strong>
              <span style="font-size:12.5px;color:var(--text-muted);">Qualifications Scotland (SQA) Course & Marking Guidance</span>
            </div>
          </div>
          <div class="user-pill-row">
            ${!isStandaloneApp ? `
              <button type="button" class="btn btn-primary btn-sm" id="btn-top-install-app" style="background:#0d9488;">
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
          <div style="margin:12px auto 0;max-width:1180px;padding:12px 16px;background:#f0fdfa;border:1.5px solid #0d9488;border-radius:12px;font-size:13.5px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
              <strong>📲 Add the Green "N5 Business" App Icon to Your Phone Screen:</strong><br/>
              🍎 <strong>iPhone (Safari):</strong> Tap <strong>Share (↑)</strong> at the bottom &rarr; tap <strong>"Add to Home Screen" (➕)</strong> &rarr; <strong>Add</strong>.<br/>
              🤖 <strong>Android (Chrome):</strong> Tap the <strong>3 dots (⋮)</strong> top-right &rarr; tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
            </div>
            <button type="button" class="btn btn-outline btn-sm" id="btn-close-top-install">Got it</button>
          </div>
        ` : ""}

        ${!isTeacher ? `
        <!-- OVERVIEW DASHBOARD & COURSE CARDS (Pupil View) -->
        <section class="dashboard-overview">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
              <p class="kicker">WELCOME BACK, ${escapeHtml(state.user.name.toUpperCase())}</p>
              <h1 style="font-size:22px;margin:0;">Learn · Drill Command Words · Practise Past Papers · Track Progress</h1>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span class="badge badge-success">Overall Average: ${analytics.avgPct}%</span>
              <span class="badge">Challenge: ${Math.min(5, analytics.uniqueQuestionsCount)}/5 Questions</span>
            </div>
          </div>

          <div class="course-grid">
            ${Object.entries(DATA.courseAreas).map(([topic, subtopics], idx) => `
              <div class="course-card">
                <div>
                  <span class="course-num">0${idx + 1}</span>
                  <h3 style="font-size:16px;margin:0 0 4px 0;">${escapeHtml(topic)}</h3>
                  <p style="margin:0;font-size:12.5px;color:var(--text-muted);">
                    ${subtopics.length} video lessons · flashcards · SQA drills
                  </p>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button type="button" class="btn btn-outline btn-sm" data-card-lessons="${escapeHtml(topic)}">
                    ▶ Video & Notes
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

        <!-- NAVIGATION TABS -->
        <nav class="nav-tabs" id="hub-workspace" style="margin-top:${isTeacher ? "16px" : "0"};">
          ${isTeacher ? `
            <button type="button" class="nav-tab ${state.activeTab === "teacher" ? "active" : ""}" data-tab="teacher" style="font-weight:800;">
              🎓 Teacher Dashboard (41 Pupils · Results &amp; Homework)
            </button>
          ` : ""}
          <button type="button" class="nav-tab ${state.activeTab === "drills" ? "active" : ""}" data-tab="drills">
            ⚡ Command Word Drills (Identify · Describe · Explain)
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "lessons" ? "active" : ""}" data-tab="lessons">
            ▶ Lessons, Videos & Flashcards
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "practice" ? "active" : ""}" data-tab="practice">
            📝 Past-Paper Practice
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "cases" ? "active" : ""}" data-tab="cases">
            🏢 Case Studies
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "homework" ? "active" : ""}" data-tab="homework">
            📅 Homework (7 Months)
          </button>
          <button type="button" class="nav-tab ${state.activeTab === "progress" ? "active" : ""}" data-tab="progress">
            📊 My Progress & Weak Areas
          </button>
        </nav>

        ${state.activeTab === "drills" ? renderDrillsTab(analytics) : ""}
        ${state.activeTab === "lessons" ? renderLessonsTab() : ""}
        ${state.activeTab === "practice" ? renderPracticeTab() : ""}
        ${state.activeTab === "cases" ? renderCasesTab() : ""}
        ${state.activeTab === "homework" ? renderHomeworkTab() : ""}
        ${state.activeTab === "progress" ? renderProgressTab(analytics) : ""}
        ${state.activeTab === "teacher" ? renderTeacherTab() : ""}

        <!-- MOBILE BOTTOM NAVIGATION DOCK -->
        <nav class="mobile-dock">
          ${isTeacher ? `<button type="button" class="${state.activeTab === "teacher" ? "active" : ""}" data-tab="teacher">🎓<span>Teacher</span></button>` : ""}
          <button type="button" class="${state.activeTab === "drills" ? "active" : ""}" data-tab="drills">⚡<span>Drills</span></button>
          <button type="button" class="${state.activeTab === "lessons" ? "active" : ""}" data-tab="lessons">▶<span>Videos</span></button>
          <button type="button" class="${state.activeTab === "practice" ? "active" : ""}" data-tab="practice">📝<span>Practice</span></button>
          <button type="button" class="${state.activeTab === "cases" ? "active" : ""}" data-tab="cases">🏢<span>Cases</span></button>
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
        state.activeTab = "drills";
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
      const pin = (state.teacherPinInput || "").trim().toUpperCase();
      const validPins = ["2026", "STRAUB", "N5BM", "TEACHER2026"];
      if (!validPins.includes(pin)) {
        state.teacherPinError = "Incorrect Teacher PIN. Please enter your Teacher PIN to access the Teacher Dashboard.";
        render();
        return;
      }
      state.teacherPinError = "";
      state.teacherUnlocked = true;
      state.user = {
        userId: "teacher-owner",
        name: state.teacherNameInput.trim() || "Mrs Straub (Business Teacher)",
        role: "admin",
        teacher: true,
        owner: true,
        pinVerified: true
      };
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
        state.activeTab = "drills";
        render();
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
        render();
      });
    });

    document.getElementById("drill-topic-select")?.addEventListener("change", e => {
      state.drillTopic = e.target.value;
      state.drillIndex = 0;
      state.drillAnswer = "";
      state.drillResult = null;
      render();
    });

    document.getElementById("drill-level-select")?.addEventListener("change", e => {
      state.drillLevel = e.target.value;
      state.drillIndex = 0;
      state.drillAnswer = "";
      state.drillResult = null;
      render();
    });

    document.getElementById("btn-toggle-drill-video")?.addEventListener("click", () => {
      state.drillShowVideo = !state.drillShowVideo;
      render();
    });

    const drillBox = document.getElementById("drill-answer-box");
    if (drillBox) {
      drillBox.addEventListener("input", e => { state.drillAnswer = e.target.value; });
    }

    document.getElementById("btn-mark-drill")?.addEventListener("click", () => {
      const questions = getDrillQuestions();
      const q = questions[Math.min(state.drillIndex, questions.length - 1)];
      if (!q || !state.drillAnswer.trim()) return;
      const res = markSqaClient(q, state.drillAnswer);
      state.drillResult = res;
      recordAttempt(q, state.drillAnswer, res, "drill");
      render();
    });

    document.getElementById("btn-drill-hint")?.addEventListener("click", () => {
      state.drillShowHint = !state.drillShowHint;
      render();
    });

    document.getElementById("btn-prev-drill")?.addEventListener("click", () => {
      state.drillIndex = Math.max(0, state.drillIndex - 1);
      state.drillAnswer = "";
      state.drillResult = null;
      state.drillShowHint = false;
      render();
    });

    document.getElementById("btn-next-drill")?.addEventListener("click", () => {
      const questions = getDrillQuestions();
      state.drillIndex = questions.length ? (state.drillIndex + 1) % questions.length : 0;
      state.drillAnswer = "";
      state.drillResult = null;
      state.drillShowHint = false;
      render();
    });

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
      state.practiceIdx = 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      render();
    });

    document.getElementById("prac-subtopic-select")?.addEventListener("change", e => {
      state.practiceSubtopic = e.target.value;
      state.practiceIdx = 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      render();
    });

    document.getElementById("prac-level-select")?.addEventListener("change", e => {
      state.practiceLevel = e.target.value;
      state.practiceIdx = 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      render();
    });

    document.getElementById("prac-answer-box")?.addEventListener("input", e => {
      state.practiceAnswer = e.target.value;
    });

    document.getElementById("btn-mark-prac")?.addEventListener("click", () => {
      const questions = getPracticeQuestions();
      const q = questions[Math.min(state.practiceIdx, questions.length - 1)];
      if (!q || !state.practiceAnswer.trim()) return;
      const res = markSqaClient(q, state.practiceAnswer);
      state.practiceResult = res;
      recordAttempt(q, state.practiceAnswer, res, "practice");
      render();
    });

    document.getElementById("btn-prac-hint")?.addEventListener("click", () => {
      state.practiceHint = !state.practiceHint;
      render();
    });

    document.getElementById("btn-prev-prac")?.addEventListener("click", () => {
      state.practiceIdx = Math.max(0, state.practiceIdx - 1);
      state.practiceAnswer = "";
      state.practiceResult = null;
      render();
    });

    document.getElementById("btn-next-prac")?.addEventListener("click", () => {
      const questions = getPracticeQuestions();
      state.practiceIdx = questions.length ? (state.practiceIdx + 1) % questions.length : 0;
      state.practiceAnswer = "";
      state.practiceResult = null;
      render();
    });

    // CASE STUDIES EVENTS
    document.querySelectorAll("[data-select-case]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.activeCaseId = btn.getAttribute("data-select-case");
        render();
      });
    });

    document.querySelectorAll("[data-case-input]").forEach(box => {
      box.addEventListener("input", e => {
        state.caseAnswers[box.getAttribute("data-case-input")] = e.target.value;
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
        if (!qObj || !ans.trim()) return;
        const res = markSqaClient({
          marks: qObj.marks,
          acceptedPoints: qObj.points || [],
          primaryCommand: (qObj.q || "").trim().split(/\s+/)[0].toLowerCase(),
          solution: qObj.solution
        }, ans);
        state.caseResults[key] = res;
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
        state.hwAnswers[box.getAttribute("data-hw-input")] = e.target.value;
      });
    });

    document.querySelectorAll("[data-submit-hw]").forEach(btn => {
      btn.addEventListener("click", () => {
        const hwId = btn.getAttribute("data-submit-hw");
        const hw = DATA.homework.find(h => h.id === hwId);
        const ans = state.hwAnswers[hwId] || "";
        if (!hw || !ans.trim()) return;
        const res = markSqaClient({
          marks: hw.marks,
          acceptedPoints: hw.points || [],
          primaryCommand: (hw.question || "").trim().split(/\s+/)[0].toLowerCase(),
          solution: hw.solution
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
          submittedAt: new Date().toISOString()
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
  }

  // Support 1-tap launch from Google Classroom / Phone Quick-Login button (?pupil=Name&code=4GBM1) or Private Teacher Link (?teacher=1)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("teacher")) {
      state.showTeacherLogin = true;
      state.user = null;
      saveLocalState();
    } else if (state.user?.role === "admin") {
      state.user = null;
      saveLocalState();
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
