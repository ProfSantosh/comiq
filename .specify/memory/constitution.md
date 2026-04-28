<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Template Principle 1 -> I. Privacy-First Client Processing
- Template Principle 2 -> II. Durable Library and Reading Continuity
- Template Principle 3 -> III. Progressive Enhancement Across Reading Modes
- Template Principle 4 -> IV. Large-Archive Performance by Default
- Template Principle 5 -> V. Spec-Driven, Testable Delivery
Added sections:
- Technical Standards
- Delivery Workflow and Quality Gates
Removed sections:
- None
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ⚠ pending .specify/templates/commands/*.md (directory not present in this repository)
Follow-up TODOs:
- None
-->

# Comiq Constitution

## Core Principles

### I. Privacy-First Client Processing
Comiq MUST process comic files entirely on the client device. CBR, CBZ, and CBT ingestion,
metadata extraction, page rendering, resume tracking, and library indexing MUST run in-browser
with no server uploads, no remote content dependency for core reading flows, and no feature design
that requires account-backed synchronization for v1. Any future networked capability MUST remain
strictly optional, disabled by default, and isolated from the local-only reading path.

Rationale: The product promise is local-only reading. Violating that promise would break the core
trust model of a desktop-first comic reader.

### II. Durable Library and Reading Continuity
Library state MUST survive browser restarts, app reloads, and offline use through a durable
persistent store. IndexedDB is the primary store for library folders, archive-derived metadata,
cover caches, preferences, and per-title reading progress. Library Mode MUST restore reading resume
reliably, and Quick Read MUST preserve temporary same-tab resume state for the active session even
when the file is not added to the library. Changes that weaken persistence guarantees, corrupt
progress, or create divergent resume behavior across entry points are not acceptable.

Rationale: A comic reader fails its core job if users cannot trust the library catalog and reading
position to remain intact across normal usage.

### III. Progressive Enhancement Across Reading Modes
The application MUST deliver a capable baseline everywhere and the best experience where platform
support allows it. Chromium-first Library Mode MAY use richer file system capabilities, but the app
MUST provide a functional Quick Read fallback on other supported browsers without blocking reading.
Library Mode and Quick Read MUST use the same reader engine and behavioral contracts so that scroll
mode, page-flip mode, navigation, and resume semantics do not drift by platform or entry path.

Rationale: Progressive enhancement preserves reach without fragmenting the product into separate,
inconsistent readers.

### IV. Large-Archive Performance by Default
Features MUST be designed for responsive reading of large image archives on desktop-class hardware.
Archive parsing, image decode scheduling, page navigation, and library scans MUST avoid unnecessary
main-thread blocking, redundant decompression, and unbounded memory growth. Plans and implementations
MUST define measurable budgets or acceptance checks for the touched flow, such as reader interaction
responsiveness, incremental loading behavior, or bounded cache usage. Regressions in perceived
reader smoothness or archive open latency require explicit justification and mitigation.

Rationale: Comic archives are image-heavy, and poor responsiveness is a direct product failure.

### V. Spec-Driven, Testable Delivery
Every feature MUST be defined through a spec with independently testable user stories, explicit edge
cases, and measurable success criteria before implementation. Plans MUST state how the work satisfies
this constitution, and tasks MUST include the validation needed to prove reader behavior, persistence,
fallback behavior, and performance expectations for the affected slice. Shared engine behavior and
archive adapter contracts MUST be verified with automated tests whenever their interfaces or behavior
change.

Rationale: The product combines storage, browser capability differences, offline behavior, and heavy
media handling; spec-driven delivery reduces drift and keeps changes verifiable.

## Technical Standards

- TypeScript MUST be used for application code, shared domain models, reader logic, and browser
	integration points.
- A single shared reader engine MUST power both Library Mode and Quick Read. Mode-specific shells MAY
	differ, but rendering, navigation, progress computation, and reader preferences MUST live behind a
	common engine API.
- IndexedDB MUST be the primary persistent store. In-memory state and transient browser storage MAY
	be used only for session-scoped or performance-oriented caches that can be safely reconstructed.
- Service worker support MUST provide offline app-shell behavior for installed and repeat visits.
	Offline support MUST not depend on network access after the app shell has been cached.
- Archive handling MUST use format-specific adapters for CBR, CBZ, and CBT behind a common archive
	interface so reader flows are format-agnostic and testable.
- V1 scope MUST support multiple library folders, switchable scroll and page-flip reading modes,
	temporary same-tab resume for Quick Read, and offline app-shell support.

## Delivery Workflow and Quality Gates

- Every plan MUST include a Constitution Check that confirms: client-only processing remains intact;
	persistence and resume semantics are defined; progressive enhancement and fallback behavior are
	specified; performance checks exist for the touched workflow; and automated validation is identified.
- Every spec MUST describe the user-visible difference between Library Mode and Quick Read when a
	capability is unavailable, plus any persistence or offline assumptions.
- Every task breakdown MUST surface shared-engine work before mode-specific wiring and MUST include
	tests or executable checks for any changed adapter contract, persistence path, reader mode, or
	offline behavior.
- Reviews MUST reject designs that duplicate reader logic across modes, bypass IndexedDB for durable
	state without written justification, or introduce format-specific behavior above the common archive
	interface.
- Complexity may be added only when the simpler option cannot preserve privacy, continuity,
	progressive enhancement, and performance simultaneously.

## Governance

This constitution overrides conflicting local process notes for product planning and delivery.
Amendments require: a written rationale, the exact principle or section being changed, an impact note
for affected templates or workflows, and approval by repository maintainers. Constitution changes MUST
use semantic versioning: MAJOR for removing or redefining a principle in a backward-incompatible way,
MINOR for adding a principle or materially expanding governance or quality gates, and PATCH for
clarifications that do not change the intended behavior. Every `/speckit.plan` output MUST perform a
plan-time Constitution Check before research proceeds and again after design decisions are captured.
Compliance reviews for specs, plans, tasks, and implementation PRs MUST explicitly verify alignment
with the five core principles and the Technical Standards section.

**Version**: 1.0.0 | **Ratified**: 2026-04-28 | **Last Amended**: 2026-04-28
