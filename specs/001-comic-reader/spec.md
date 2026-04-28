# Feature Specification: Modern Comic Reader

**Feature Branch**: `[001-build-comic-reader]`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: User description: "Build a modern web-based comic book reader for CBR, CBZ, and CBT files with library management and reading progress tracking. The product has two entry modes. Library Mode is the recommended mode for supported desktop browsers: the user can select multiple local comics folders once, grant permission, browse a combined library with cover thumbnails and progress indicators, and reopen comics later with progress restored. Quick Read Mode allows the user to upload a single CBR, CBZ, or CBT file and read it immediately without library setup. Quick Read should keep temporary resume only for the current tab session and should not create a permanent library record. The reader must support both continuous scroll and page-flip modes with a user setting to switch between them. The app must be client-side only, must not upload comic content to a server, and should work offline after the initial successful load. The UI should show generated cover thumbnails, recently read items for the last five library comics, clear fallback messaging when Library Mode is unavailable, and graceful handling for corrupt archives, permission loss, and missing folders. v1 is desktop-first, supports multiple folders, and does not include manga or right-to-left reading."

## Clarifications

### Session 2026-04-28

- Q: How should duplicate comics found in multiple granted folders be represented? → A: Treat duplicates as separate library entries, one per file path/source folder.
- Q: How should reading progress be stored across continuous scroll and page-flip modes? → A: Save progress by page number only and reopen at that page in either mode.
- Q: Which browsers should Library Mode support in v1? → A: Library Mode is supported only on desktop Chromium-based browsers in v1.
- Q: Can users remove library sources (granted folders) or individual comics from the library? → A: Remove entire folder source only (all its comics removed with it).
- Q: What is the default sort order for comics displayed in the library view? → A: File name, alphabetically A→Z by default.
- Q: How should the library be refreshed when a granted folder's contents change? → A: Manual: user triggers rescan on demand; no automatic scanning.
- Q: What happens to a library comic's progress record when a rescan finds the file is no longer present? → A: Keep the record, mark the comic as unavailable (missing), preserve progress data.
- Q: What page-navigation and viewing controls must the page-flip reading mode support? → A: Previous/next page buttons; left/right and up/down arrow keys for page navigation; clockwise and anticlockwise page rotation controls.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a persistent local library (Priority: P1)

As a desktop user with a local comics collection, I want to grant access to one or more folders once and browse all supported comics in one place so I can reopen titles later without rebuilding my library or losing reading progress.

**Why this priority**: Library Mode is the core long-term value of the product and the primary reason to use it over a generic file viewer.

**Independent Test**: Can be fully tested by granting access to multiple folders, confirming the combined library shows supported comics with covers and progress, opening a comic, closing the app, reopening offline, and verifying progress is restored.

**Acceptance Scenarios**:

1. **Given** a supported desktop browser with local folder access available, **When** the user selects multiple folders containing supported comics, **Then** the app adds all supported items to one combined library view.
2. **Given** a library comic that has been opened before, **When** the user reopens it in a later session, **Then** the reader restores the saved reading position and shows the prior progress in the library view.
3. **Given** a library comic that has been read recently, **When** the user returns to the home view, **Then** the comic appears in the recently read section if it is among the five most recent library items.

---

### User Story 2 - Read a single comic immediately (Priority: P2)

As a user who wants to open one comic quickly, I want to upload a single archive and start reading right away so I can use the reader without setting up a library.

**Why this priority**: Quick Read broadens access when users only need an immediate read or when Library Mode is not available.

**Independent Test**: Can be fully tested by uploading a single supported comic, reading part of it, navigating within the same tab, and confirming the session resumes temporarily without creating a permanent library entry.

**Acceptance Scenarios**:

1. **Given** a supported CBR, CBZ, or CBT file, **When** the user uploads it through Quick Read, **Then** the reader opens that comic without requiring folder permission or library setup.
2. **Given** a Quick Read session in the current tab, **When** the user leaves and returns to the reader within that tab session, **Then** the comic resumes at the temporary saved position.
3. **Given** a Quick Read comic has been opened, **When** the tab session ends, **Then** the comic does not remain in the library, does not appear in recently read library items, and has no permanent resume record.

---

### User Story 3 - Read reliably across modes and failures (Priority: P3)

As a reader, I want flexible reading controls and clear recovery guidance when something goes wrong so I can keep reading without confusion.

**Why this priority**: The product only feels complete if the reading experience is consistent and error handling is understandable.

**Independent Test**: Can be fully tested by switching between continuous scroll and page-flip modes, opening comics from both entry modes, and exercising corrupt archive, missing folder, permission loss, and unsupported-library-browser cases.

**Acceptance Scenarios**:

1. **Given** an open comic, **When** the user switches between continuous scroll and page-flip modes, **Then** the reader changes presentation without losing the current reading position.
2. **Given** Library Mode is unavailable in the current browser, **When** the user lands in the app, **Then** the UI explains why Library Mode is unavailable and directs the user to Quick Read.
3. **Given** a corrupt archive, missing folder, or revoked folder permission, **When** the app tries to open or refresh the affected comic, **Then** the UI shows clear recovery messaging and the app remains usable.

---

### Edge Cases

- A selected folder contains a mix of supported and unsupported file types.
- The same comic appears in more than one granted folder and must appear as separate library entries because each source path is tracked independently.
- A previously indexed folder is renamed, moved, deleted, or disconnected.
- A previously granted folder permission is revoked between sessions.
- A comic archive opens successfully once but later becomes corrupt or incomplete.
- Cover thumbnail generation fails even though the comic itself can still be read.
- The user changes reading mode in the middle of a session and expects progress to remain accurate.
- Offline launch occurs after the app was previously loaded successfully, but one or more library folders are no longer reachable.

## Constitution Alignment *(mandatory)*

### Privacy and Processing

- All comic discovery, archive inspection, thumbnail generation, and reading must occur entirely on the user device.
- The feature must not upload comic files, extracted pages, reading progress, or folder contents to any remote service.
- Optional network usage is limited to loading the application shell or later app updates; once the app has loaded successfully at least once, the core reading and library experience must remain available offline.

### Persistence and Resume

- IndexedDB must persist library source records, discovered library comics, generated cover thumbnails, reader preference, last-opened metadata, progress state, and the last five recently read library items.
- Quick Read state remains session-scoped only for the active tab session and must never create a permanent library item, a permanent thumbnail cache entry tied to the uploaded file, or a long-term recent-history record.
- Library Mode resume must survive browser restarts and offline launches when the related folder permission remains valid.
- Reading progress must be stored as the current page number so resume remains consistent when switching between continuous scroll and page-flip modes.

### Progressive Enhancement and Fallbacks

- Library Mode is the recommended experience only on desktop Chromium-based browsers in v1 because they provide the required local folder access capabilities.
- When those capabilities are missing, the app must present a clear explanation, avoid broken controls, and route the user toward Quick Read as the working fallback.
- Both entry modes must use the same reader behavior for supported formats and reading modes so that feature parity remains consistent regardless of how a comic is opened.

### Performance and Validation

- On reference desktop hardware, 95% of valid supported comics up to 500 MB should open to the first readable page within 5 seconds after file or library selection.
- On reference desktop hardware, a previously scanned library of up to 1,000 comics should render a browsable library view with visible covers and progress indicators within 2 seconds of opening the app when permissions remain valid.
- Validation must include executable coverage for multi-folder library persistence, offline reopening, Quick Read session-only resume, reading-mode switching, corrupt archive handling, permission loss, and missing-folder recovery messaging.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide two entry modes named Library Mode and Quick Read Mode.
- **FR-002**: The system MUST detect whether the current browser supports the capabilities required for Library Mode and present fallback messaging when those capabilities are unavailable.
- **FR-002a**: In v1, the system MUST expose Library Mode only on desktop Chromium-based browsers and MUST direct other browsers to Quick Read with clear fallback messaging.
- **FR-003**: In Library Mode, the system MUST allow the user to grant access to multiple local folders and treat supported comics from those folders as a single combined library.
- **FR-004**: The system MUST recognize CBR, CBZ, and CBT files in granted folders and uploaded files.
- **FR-005**: The system MUST exclude unsupported files from the readable library and explain that only supported comic archive formats are available for reading.
- **FR-006**: The system MUST generate and display a cover thumbnail for each library comic once the comic has been successfully processed.
- **FR-007**: The system MUST display reading progress indicators for library comics wherever those comics appear in the library or recently read views.
- **FR-008**: The system MUST persist library comics so users can reopen them in later sessions without repeating library setup for unchanged, permitted folders.
- **FR-008a**: The system MUST treat each discovered supported comic file as a distinct library item based on its source folder and file path, even if another granted folder contains a duplicate copy of the same comic.
- **FR-009**: The system MUST restore saved reading progress for library comics across later sessions, including offline launches after a prior successful load.
- **FR-010**: The system MUST maintain a recently read view containing the five most recently opened library comics.
- **FR-011**: Quick Read Mode MUST allow the user to upload one CBR, CBZ, or CBT file and begin reading it immediately without creating a library.
- **FR-012**: Quick Read Mode MUST retain resume state only for the current tab session.
- **FR-013**: Quick Read Mode MUST NOT create a permanent library record, MUST NOT add the uploaded comic to the library recent-history list, and MUST NOT retain permanent resume after the tab session ends.
- **FR-014**: The reader MUST support both continuous scroll and page-flip presentation modes.
- **FR-015**: The user MUST be able to switch between continuous scroll and page-flip modes from within the reading experience.
- **FR-016**: The system MUST remember the user’s selected reading mode preference for future reading sessions.
- **FR-017**: The system MUST preserve the current reading position when the user switches between reading modes.
- **FR-017a**: The system MUST persist reading progress as a page-number-based location and resume at that page regardless of the selected reading mode.
- **FR-018**: The system MUST operate client-side only and MUST NOT require comic content to be sent to a server in order to browse or read comics.
- **FR-019**: After the initial successful app load, the system MUST allow previously available reading and library functions to work offline when the required local permissions and files remain available.
- **FR-020**: The system MUST handle corrupt or unreadable comic archives gracefully by showing a clear error message and returning the user to a stable state.
- **FR-021**: The system MUST handle revoked permissions or missing library folders gracefully by identifying affected items, explaining the issue, and giving the user a clear recovery action.
- **FR-022**: The system MUST be desktop-first for v1 and MUST NOT include manga or other right-to-left reading behavior in v1.
- **FR-023**: The system MUST allow users to remove a library source (granted folder) from the library; removing a source MUST also remove all library comics and reading progress records associated with that source.
- **FR-024**: The library view MUST display comics sorted alphabetically by file name (A→Z) as the default sort order.
- **FR-025**: The system MUST provide an on-demand rescan action that re-examines all granted folder sources for new, removed, or changed comics; the system MUST NOT perform automatic background scanning of granted folders.
- **FR-026**: When a rescan determines that a previously discovered comic file is no longer present in its source folder, the system MUST retain the library comic record and its reading progress data, MUST mark the comic with a visible unavailable (missing) indicator, and MUST NOT delete the record automatically.
- **FR-027**: The page-flip reading mode MUST provide previous-page and next-page button controls and MUST support keyboard navigation via the left, right, up, and down arrow keys to move between pages.
- **FR-028**: The reader MUST provide clockwise and anticlockwise page rotation controls that apply a 90-degree rotation per activation; rotation state MUST be applied per-session and MUST NOT persist between reading sessions.

### Key Entities *(include if feature involves data)*

- **Library Source**: A user-approved local folder that may contain supported comic archives and whose availability or permission state can change over time.
- **Library Comic**: A supported comic archive discovered from a granted folder, keyed by its source folder and file path, including its display metadata, cover thumbnail, progress, and last-read state.
- **Quick Read Session**: A temporary reading context for one uploaded comic that exists only for the current tab session and never becomes part of the persistent library.
- **Reading Progress Record**: The saved position and last-read timestamp associated with a comic, with persistent behavior for library comics and session-only behavior for Quick Read.
- **Reader Preference**: A user-level setting that defines whether comics open in continuous scroll or page-flip mode by default.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In moderated acceptance testing, 90% of users on a supported desktop browser can add two local folders and reopen a previously read library comic at its saved position within 3 minutes without assistance.
- **SC-002**: On reference desktop hardware, 95% of valid supported comics up to 500 MB open to the first readable page within 5 seconds of user selection.
- **SC-003**: In release validation, 100% of tested Quick Read sessions leave no permanent library entry or persistent resume record after the tab session ends.
- **SC-004**: In release validation, 100% of tested offline relaunches after a prior successful load allow users to access saved library metadata and reopen previously scanned comics when permissions remain valid.
- **SC-005**: In release validation, 100% of tested corrupt archive, permission loss, and missing-folder scenarios show recovery messaging without crashing the app or trapping the user in a broken state.

## Assumptions

- v1 targets desktop browsers first; mobile and tablet optimization are deferred.
- Library Mode depends on desktop Chromium-based browser support for persistent local folder access; when unsupported, Quick Read remains available.
- Reading progress is restored to the saved page number in the comic for each supported reading mode.
- Cover thumbnails are derived from comic content locally and may fall back to a generic placeholder when thumbnail generation fails.
- No user account, cloud sync, or cross-device synchronization is included in v1.