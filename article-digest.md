# Article Digest — Proof Points

Compact proof points from real projects on cv.md. Read by career-ops at evaluation time.
Replaces the generic example file (FraudShield / LLM Eval Toolkit) that shipped as a template —
those were sample placeholders, not Ashish's projects.

Note: several projects below don't have a quantified hero metric on cv.md yet. Rather than
invent one, the metric line is left as "not yet quantified" — add a real number here if you
have one (users, latency, cost saved, adoption), since a fabricated figure would violate the
project's own "never invent metrics" rule and could surface in a generated CV or cover letter.

---

## Claude Code Agentic Delivery Orchestration — Altudo

**Hero metric:** 95% on-time delivery (via refined Agile processes); reduced manual review cycles through permission-based guardrails and pre-execution hooks (cycle-time reduction not yet quantified)

**Architecture:** Claude Code + MCP (Model Context Protocol) orchestrating multi-agent review pipelines — separate agents for security, performance, and style review — wired into an automated GitHub issue-to-PR delivery flow, gated by permission-based guardrails and pre-execution hooks.

**Key decisions:**
- Split review responsibility across specialized sub-agents (security/performance/style) rather than one generalist reviewer, so each pass stays focused and auditable
- Used pre-execution hooks and permission-based guardrails to keep agentic automation safe inside a client-delivery environment, not just a personal sandbox
- Automated the full issue-to-PR path rather than automating review only, closing the loop end-to-end

**Proof points:**
- Achieved 95% on-time delivery across Agile Scrum ceremonies and full SDLC ownership, for features that reached hundreds of users
- Reduced manual review cycles (exact percentage not yet quantified — add if available)

---

## Agentic AI Healthcare Platform — Altudo (BSWHealth / Moda Health engagements)

**Hero metric:** RAG-based patient-support chat system with multistep validation (adoption/accuracy metrics not yet quantified)

**Architecture:** Agentic AI-based healthcare platform generating physician-ready patient summaries and supporting patients with health-condition queries, built on RAG workflows with a multistep validation layer before output reaches a patient or clinician.

**Key decisions:**
- Added a multistep validation stage specifically because healthcare outputs need a higher accuracy bar than a typical RAG chatbot
- Designed around physician-ready summaries as the deliverable, not raw model output, to keep the system usable in a clinical workflow

**Proof points:**
- Led AI implementation for BSWHealth and Moda Health, enhancing analytics capabilities and identifying KPIs
- Directly relevant to any healthcare-vertical AI transformation role (Innovaccer, healthtech scale-ups, healthcare BFSI-adjacent consulting)

---

## Agentic-AI Content Migration Platform — Altudo

**Hero metric:** Automated content and metadata extraction/transformation across a CMS modernization program (volume/time-saved not yet quantified)

**Architecture:** Agentic workflow automating content and metadata extraction and transformation, with workflow orchestration driving a broader CMS modernization initiative.

**Key decisions:**
- Automated extraction/transformation as a distinct agentic stage rather than a one-off migration script, so the same pipeline could be reused across future CMS migrations
- Tied directly into the Sitecore/AEM modernization work already running for these clients, rather than being a standalone tool

**Proof points:**
- Directly reusable proof point for Sitecore/AEM Delivery Manager roles (Valtech, EPAM) — shows agentic automation applied inside a CMS migration context, not just a generic AI demo

---

## Log Analytics AI Workflow

**Hero metric:** AI-powered log analytics workflow built on FastAPI, DuckDB, and OpenAI LLMs (query volume/latency not yet quantified)

**Architecture:** FastAPI service layer, DuckDB for fast local/embedded analytical queries over log data, OpenAI LLMs for natural-language interrogation of logs.

**Key decisions:**
- Chose DuckDB for the analytics layer to keep log queries fast without standing up a full data-warehouse stack
- Kept the LLM layer as a query/interpretation interface on top of structured log data, rather than feeding raw logs directly to the model

**Proof points:**
- Precursor to the in-development `Logsdontlie.ai` personal project (LLM-based log investigator) — shows a working pattern already validated in a client engagement

---

## SAP Quality Assurance & Predictive Models — Accenture

**Hero metric:** Reduced defect closure rates 40% through comprehensive QA protocols and predictive models

**Architecture:** Predictive QA models layered on top of SAP system monitoring, feeding into standard defect-closure and release-validation workflows across Banking, Insurance, and Technology programs.

**Key decisions:**
- Applied predictive modeling to defect closure specifically (not just detection), which is what drove the 40% reduction rather than a generic QA process change
- Embedded the predictive layer into existing release-validation and requirement-analysis workflows so it didn't require a parallel process

**Proof points:**
- 40% reduction in defect closure rates, verified metric from 12 years managing enterprise application delivery and quality governance across Banking/Insurance/Technology
- Strongest single proof point for BFSI-vertical transformation roles (Cognizant Global Head of Transformation - BFSI, EPAM Insurance Delivery Management)

---

## Watchsnap.in — Personal Project

**Hero metric:** Web-based, scalable computer vision platform (user/traffic numbers not yet quantified)

**Architecture:** YOLO object detection + CLIP embeddings for similarity matching, vector search over a watch-image database.

**Key decisions:**
- Used CLIP embeddings specifically to support similarity search (find visually similar watches), not just classification
- Built as a scalable web platform rather than a notebook demo, showing production-oriented thinking outside of client work

**Proof points:**
- Best proof point for roles that want to see independent, self-directed technical depth (AI Solutions Architect-adjacent conversations), separate from client delivery work
