# Modern Design Best Practices

## Philosophy

Create unique, memorable experiences while maintaining consistency through modern design principles. Every project should feel distinct yet professional, innovative yet intuitive.

---

## Landing Pages & Marketing Sites

### Hero Sections
**Go beyond static backgrounds:**
- Animated gradients with subtle movement
- Particle systems or geometric shapes floating
- Interactive canvas backgrounds (Three.js, WebGL)
- Video backgrounds with proper fallbacks
- Parallax scrolling effects
- Gradient mesh animations
- Morphing blob animations


### Layout Patterns
**Use modern grid systems:**
- Bento grids (asymmetric card layouts)
- Masonry layouts for varied content
- Feature sections with diagonal cuts or curves
- Overlapping elements with proper z-index
- Split-screen designs with scroll-triggered reveals

**Avoid:** Traditional 3-column equal grids

### Scroll Animations
**Engage users as they scroll:**
- Fade-in and slide-up animations for sections
- Scroll-triggered parallax effects
- Progress indicators for long pages
- Sticky elements that transform on scroll
- Horizontal scroll sections for portfolios
- Text reveal animations (word by word, letter by letter)
- Number counters animating into view

**Avoid:** Static pages with no scroll interaction

### Call-to-Action Areas
**Make CTAs impossible to miss:**
- Gradient buttons with hover effects
- Floating action buttons with micro-interactions
- Animated borders or glowing effects
- Scale/lift on hover
- Interactive elements that respond to mouse position
- Pulsing indicators for primary actions

---

## Dashboard Applications

### Layout Structure
**Always use collapsible side navigation:**
- Sidebar that can collapse to icons only
- Smooth transition animations between states
- Persistent navigation state (remember user preference)
- Mobile: drawer that slides in/out
- Desktop: sidebar with expand/collapse toggle
- Icons visible even when collapsed

**Structure:**
```
/dashboard (layout wrapper with sidebar)
  /dashboard/overview
  /dashboard/analytics
  /dashboard/settings
  /dashboard/users
  /dashboard/projects
```

All dashboard pages should be nested inside the dashboard layout, not separate routes.

### Data Tables
**Modern table design:**
- Sticky headers on scroll
- Row hover states with subtle elevation
- Sortable columns with clear indicators
- Pagination with items-per-page control
- Search/filter with instant feedback
- Selection checkboxes with bulk actions
- Responsive: cards on mobile, table on desktop
- Loading skeletons, not spinners
- Empty states with illustrations or helpful text

**Use modern table libraries:**
- TanStack Table (React Table v8)
- AG Grid for complex data
- Data Grid from MUI (if using MUI)

### Charts & Visualizations
**Use the latest charting libraries:**
- Recharts (for React, simple charts)
- Chart.js v4 (versatile, well-maintained)
- Apache ECharts (advanced, interactive)
- D3.js (custom, complex visualizations)
- Tremor (for dashboards, built on Recharts)

**Chart best practices:**
- Animated transitions when data changes
- Interactive tooltips with detailed info
- Responsive sizing
- Color scheme matching design system
- Legend placement that doesn't obstruct data
- Loading states while fetching data

### Dashboard Cards
**Metric cards should stand out:**
- Gradient backgrounds or colored accents
- Trend indicators (↑ ↓ with color coding)
- Sparkline charts for historical data
- Hover effects revealing more detail
- Icon representing the metric
- Comparison to previous period

---

## Color & Visual Design

### Color Palettes
**Create depth with gradients:**
- Primary gradient (not just solid primary color)
- Subtle background gradients
- Gradient text for headings
- Gradient borders on cards
- Elevated surfaces for depth

**Color usage:**
- 60-30-10 rule (dominant, secondary, accent)
- Consistent semantic colors (success, warning, error)
- Accessible contrast ratios (WCAG AA minimum)

### Typography
**Create hierarchy through contrast:**
- Large, bold headings (48-72px for heroes)
- Clear size differences between levels
- Variable font weights (300, 400, 600, 700)
- Letter spacing for small caps
- Line height 1.5-1.7 for body text
- Inter, Poppins, or DM Sans for modern feel

### Shadows & Depth
**Layer UI elements:**
- Multi-layer shadows for realistic depth
- Colored shadows matching element color
- Elevated states on hover
- Neumorphism for special elements (sparingly)

---

## Interactions & Micro-animations

### Button Interactions
**Every button should react:**
- Scale slightly on hover (1.02-1.05)
- Lift with shadow on hover
- Ripple effect on click
- Loading state with spinner or progress
- Disabled state clearly visible
- Success state with checkmark animation

### Card Interactions
**Make cards feel alive:**
- Lift on hover with increased shadow
- Subtle border glow on hover
- Tilt effect following mouse (3D transform)
- Smooth transitions (200-300ms)
- Click feedback for interactive cards

### Form Interactions
**Guide users through forms:**
- Input focus states with border color change
- Floating labels that animate up
- Real-time validation with inline messages
- Success checkmarks for valid inputs
- Error states with shake animation
- Password strength indicators
- Character count for text areas

### Page Transitions
**Smooth between views:**
- Fade + slide for page changes
- Skeleton loaders during data fetch
- Optimistic UI updates
- Stagger animations for lists
- Route transition animations

---

## Mobile Responsiveness

### Mobile-First Approach
**Design for mobile, enhance for desktop:**
- Touch targets minimum 44x44px
- Generous padding and spacing
- Sticky bottom navigation on mobile
- Collapsible sections for long content
- Swipeable cards and galleries
- Pull-to-refresh where appropriate

### Responsive Patterns
**Adapt layouts intelligently:**
- Hamburger menu → full nav bar
- Card grid → stack on mobile
- Sidebar → drawer
- Multi-column → single column
- Data tables → card list
- Hide/show elements based on viewport

---

## Loading & Empty States

### Loading States
**Never leave users wondering:**
- Skeleton screens matching content layout
- Progress bars for known durations
- Animated placeholders
- Spinners only for short waits (<3s)
- Stagger loading for multiple elements
- Shimmer effects on skeletons

### Empty States
**Make empty states helpful:**
- Illustrations or icons
- Helpful copy explaining why it's empty
- Clear CTA to add first item
- Examples or suggestions
- No "no data" text alone

---

## Unique Elements to Stand Out

### Distinctive Features
**Add personality:**
- Custom cursor effects on landing pages
- Animated page numbers or section indicators
- Unusual hover effects (magnification, distortion)
- Custom scrollbars
- Glassmorphism for overlays
- Animated SVG icons
- Typewriter effects for hero text
- Confetti or celebration animations for actions

### Interactive Elements
**Engage users:**
- Drag-and-drop interfaces
- Sliders and range controls
- Toggle switches with animations
- Progress steps with animations
- Expandable/collapsible sections
- Tabs with slide indicators
- Image comparison sliders
- Interactive demos or playgrounds

---

## Consistency Rules

### Maintain Consistency
**What should stay consistent:**
- Spacing scale (4px, 8px, 16px, 24px, 32px, 48px, 64px)
- Border radius values
- Animation timing (200ms, 300ms, 500ms)
- Color system (primary, secondary, accent, neutrals)
- Typography scale
- Icon style (outline vs filled)
- Button styles across the app
- Form element styles

### What Can Vary
**Project-specific customization:**
- Color palette (different colors, same system)
- Layout creativity (grids, asymmetry)
- Illustration style
- Animation personality
- Feature-specific interactions
- Hero section design
- Card styling variations
- Background patterns or textures

---

## Technical Excellence

### Performance
- Optimize images (WebP, lazy loading)
- Code splitting for faster loads
- Debounce search inputs
- Virtualize long lists
- Minimize re-renders
- Use proper memoization

### Accessibility
- Keyboard navigation throughout
- ARIA labels where needed
- Focus indicators visible
- Screen reader friendly
- Sufficient color contrast
- Respect reduced motion preferences

---

## Key Principles

1. **Be Bold** - Don't be afraid to try unique layouts and interactions
2. **Be Consistent** - Use the same patterns for similar functions
3. **Be Responsive** - Design works beautifully on all devices
4. **Be Fast** - Animations are smooth, loading is quick
5. **Be Accessible** - Everyone can use what you build
6. **Be Modern** - Use current design trends and technologies
7. **Be Unique** - Each project should have its own personality
8. **Be Intuitive** - Users shouldn't need instructions


---

# Project-Specific Customizations

**IMPORTANT: This section contains the specific design requirements for THIS project. The guidelines above are universal best practices - these customizations below take precedence for project-specific decisions.**

## User Design Requirements

typography, spacing, color tokens, and component styling to match PulseBoard

API integrations:
- No external APIs beyond internal app endpoints for data, analysis status, and notifications. Local simulation or mock as needed for dev. The page must be able to operate with real-time progress updates when the AI engine runs.

PROJECT CONTEXT: Target Page and Connected Features
- Target Page: Generate Analysis
- Project: PulseBoard — Company Health Analysis
- Core components: AI Analysis Engine, Notifications & Emails, Company Detail workspace
- Data flows: User fills data -> Start Analysis -> AI engine runs -> Progress/logs -> Results -> Notify user -> Option to export/view report

---

## Components to Build

- GenerateAnalysisPage (UI + logic)
  - Props/state: user, company, data completeness, depth, benchmarks, consent, sendToEmail, email, isLoading, progress, logs, results
  - Subcomponents:
    - DataCompletenessChecklist
    - AnalysisOptionsPanel (DepthSelector, BenchmarksToggle, SendToEmailToggle, EmailInput)
    - ConsentSection
    - StartAnalysisButton (with validation)
    - ProgressPanel (progress bar, live logs)
    - ResultsSummaryCard (summary snippet + CTA to Report Viewer)
    - NotificationsPanel/Toast placeholder (integrates with Notifications)
- AIAnalysisEngineOrchestrator
  - Orchestrates steps:
    - Build prompts based on depth and benchmarks
    - Execute prompts to generate: Executive Summary, SWOT, Financial/Market/Social analyses, Risks, Opportunities, Action Plan
  - State machine: Idle -> Validating -> Running -> Completed -> Failed
  - Emits progress updates and final results payload
  - Ensures results are stored in a structured format for Report Viewer
- NotificationsIntegrator
  - Triggers transactional and in-app notifications for:
    - Analysis Completed
    - Export Ready
    - Analysis Failed
    - Billing events
    - Admin alerts
  - Integrates with email provider for SendToEmail flow
- ReportViewerLink
  - Link/button to open the full Report Viewer, passing analysisId
- DataValidators
  - Consistent validation utilities for API responses and UI inputs
- Placeholder/Mock Services (for dev)
  - If no backend yet, implement mock services with deterministic progress sequences

---

## Implementation Requirements

### Frontend
- Components must be built with React (or framework in stack) using TypeScript.
- Ensure runtime safety:
  - All arrays use proper defaults: useState<T[]>([]) and guards for null data
  - Use data ?? [] for any Supabase-like results
  - Guard every array operation: (items ?? []).map(...) or Array.isArray(items) ? items.map(...) : []
  - Access nested API responses with optional chaining and default fallbacks
  - Provide destructuring with defaults: const { items = [], count = 0 } = response ?? {}
- UI/UX:
  - All elements styled via the project design system
  - Accessible controls (labels, ARIA attributes)
  - Form validations and clear error messages
- State management:
  - Local component state for GenerateAnalysisPage
  - Global state or context (if available) for current user, company, and ongoing analyses
  - Persist analysis progress in a stable store or backend record (analysisId)
- Real-time progress:
  - Implement progress updates via polling or WebSocket-like mechanism (simulate in dev)
  - Logs should stream progressively with timestamps
- Data safety:
  - Ensure consent is required before enabling Start Analysis
  - Ensure user cannot generate without complete data and consent
- Accessibility:
  - Keyboard navigable, screen-reader friendly

### Backend
- APIs and data models (to be implemented or wired):
  - Create Analysis Record
    - POST /api/analyses
    - Body: { companyId, depth: 'brief'|'standard'|'deep', includeBenchmarks: boolean, sendToEmail: boolean, email?: string, consentGiven: boolean }
    - Response: { analysisId, status: 'queued'|'running'|'completed'|'failed', startedAt, progress: number }
  - Get Analysis Status
    - GET /api/analyses/{analysisId}
    - Response: { analysisId, status, progress, logs: string[], results?: { executiveSummary, swot, financial, market, social, risks, opportunities, actionPlan } }
  - Notification trigger endpoints (internal usage)
    - POST /api/notifications/trigger
- Data models:
  - CompanyProfile
  - AnalysisRecord
    - id, companyId, userId, depth, includeBenchmarks, consentGiven, sendToEmail, email, status, progress, startedAt, completedAt, resultPayload (structured JSON)
  - HealthMetrics (for potential Health Score usage)
- Validation:
  - Server should validate input shapes and guard against missing fields
  - Ensure analysis results are stored with non-null shapes
- Security:
  - Auth required for creating and fetching analyses
  - Access control: user is allowed to access analyses for their company
- Storage:
  - Persist analysis results to a JSON payload that's consumable by Report Viewer
  - Maintain history/logs for each analysis

### Integration
- Frontend -> Backend
  - Start Analysis triggers creation of AnalysisRecord and starts engine
  - Polling or real-time feed to update progress and logs
  - On completion, load results into Report Viewer
  - Trigger NotificationsIntegrator for status changes
- Data flow safeguards:
  - All API responses validated; if response shape is unexpected, fallback to safe defaults
  - Use nullish checks for optional fields
  - Ensure arrays from API calls are guarded and mapped safely

---

## User Experience Flow

1. User authenticates and lands on Company Detail workspace (primary, persistent).
2. User fills or reviews Profile, Financials, Market, and Social data. Data completeness is computed in real-time.
3. User navigates to Generate Analysis section within the same page or a dedicated sub-view.
4. User selects analysis depth (brief/standard/deep), toggles benchmarks, optionally enables “send to email” with an email address.
5. User reviews consent for AI processing; user checks consent box.
6. Start Analysis button becomes enabled only when required data is complete and consent is given.
7. User clicks Start Analysis.
8. UI shows a progress bar, live logs, and status indicators (queued/running).
9. AI Analysis Engine orchestrates prompts based on chosen depth and benchmarks; progress is updated in real-time.
10. Upon completion, results payload is stored; UI shows a Results Summary with a CTA to open the full Report Viewer.
11. Notifications & Inbox receive an entry for analysis completed; if email is configured, a transactional email is sent.
12. User can export the report or view the full report in Report Viewer; success or failure states are reflected in UI and notifications.

---

## Build Order & Dependencies (Mandatory)

- Prerequisites:
  - User authentication system in place
  - Core Company Detail workspace scaffolding and data models (Profile, Financials, Market, Social)
  - Notification system (in-app and email) scaffold
  - Design system and UI components for forms, checklists, and progress indicators
- Blocks:
  - Core AI Analysis Engine (orchestrator) with data contracts and prompt templates
  - Backend APIs for analyses (create, status, results) and notification triggers
  - Frontend components for Generate Analysis page and integration with Report Viewer
- Sequencing Rule:
  - Auth/access control and core data setup must be completed before dashboard/workspace/analytics pages when both exist

---

## Technical Specifications

- Data Models:
  - AnalysisRecord
    - id: string
    - companyId: string
    - userId: string
    - depth: 'brief'|'standard'|'deep'
    - includeBenchmarks: boolean
    - consentGiven: boolean
    - sendToEmail: boolean
    - email?: string
    - status: 'queued'|'running'|'completed'|'failed'
    - progress: number (0-100)
    - startedAt: string (ISO)
    - completedAt?: string (ISO)
    - resultPayload?: {
        executiveSummary: string
        swot: any
        financial: any
        market: any
        social: any
        risks: string[]
        opportunities: string[]
        actionPlan: any
      }
    - logs?: string[]
- API Endpoints:
  - POST /api/analyses
  - GET /api/analyses/{analysisId}
  - POST /api/notifications/trigger
- Security:
  - JWT-based authentication
  - Authorization checks to ensure user can access companyId
  - Input validation on all endpoints
- Validation:
  - Use robust type guards and runtime checks
  - Normalize API responses: const payload = Array.isArray(res?.data) ? res.data : []
- Optional Data Handling:
  - All optional fields guarded with nullish coalescing and optional chaining
  - Default to empty arrays/objects where applicable

---

## Acceptance Criteria

- [ ] Generate Analysis page renders with:
  - Data completeness indicators and consent required
  - Depth selection, benchmarks toggle, and email option
  - Start button disabled until required data present and consent given
  - Real-time progress display with logs
  - Final Results Summary and link to Report Viewer
- [ ] AI Analysis Engine:
  - Creates analyses with correct metadata
  - Executes prompts based on depth and benchmarks
  - Produces structured resultPayload consumable by Report Viewer
  - Emits progress updates and handles errors gracefully
- [ ] Notifications & Emails integration:
  - On completion: in-app notification and transactional email if enabled
  - On failure: in-app notification
  - Admin/billing alerts triggered appropriately
- [ ] Company Detail workspace:
  - Primary, persistent workspace with profile, health score breakdown, and analysis history
  - Editable forms for profile, financials, market, and social data
  - Health score recalculation after analysis results

---

## UI/UX Guidelines

- Align with PulseBoard design system: typography, color tokens, spacing, and component styling
- Clear affordances for actions, states, and success/failure feedback
- Responsive layout: adapt to desktop and tablet widths
- Ensure consistent micro-interactions (button hover states, progress updates, toast durations)

---

## Mandatory Coding Standards — Runtime Safety

CRITICAL: Follow these rules in ALL generated code to prevent runtime crashes.

1. Supabase query results: Always use nullish coalescing — const items = data ?? []. Supabase returns null when there are no rows.
2. Array methods: Never call on a value that could be null/undefined/non-array. Guard with (items ?? []).map(...) or Array.isArray(items) ? items.map(...) : [].
3. React useState for arrays/objects: Initialize with correct type — useState<Type[]>([]) for arrays; avoid useState() or useState(null).
4. API response shapes: Validate — const list = Array.isArray(response?.data) ? response.data : [].
5. Optional chaining: Use obj?.property?.nested when traversing API responses or DB results.
6. Destructuring with defaults: const { items = [], count = 0 } = response ?? {}.

---

This prompt ensures a cohesive, production-ready implementation plan for the Generate Analysis page, the AI Analysis Engine, the Notifications & Emails subsystem, and the Company Detail workspace, with strict runtime safety, dependency-first sequencing, and a unified acceptance checklist. Use this as a blueprint for the AI development tool to generate concrete code, schemas, APIs, and UI components.

## Implementation Notes

When implementing this project:

1. **Follow Universal Guidelines**: Use the design best practices documented above as your foundation
2. **Apply Project Customizations**: Implement the specific design requirements stated in the "User Design Requirements" section
3. **Priority Order**: Project-specific requirements override universal guidelines when there's a conflict
4. **Color System**: Extract and implement color values as CSS custom properties in RGB format
5. **Typography**: Define font families, sizes, and weights based on specifications
6. **Spacing**: Establish consistent spacing scale following the design system
7. **Components**: Style all Shadcn components to match the design aesthetic
8. **Animations**: Use Motion library for transitions matching the design personality
9. **Responsive Design**: Ensure mobile-first responsive implementation

## Implementation Checklist

- [ ] Review universal design guidelines above
- [ ] Extract project-specific color palette and define CSS variables
- [ ] Configure Tailwind theme with custom colors
- [ ] Set up typography system (fonts, sizes, weights)
- [ ] Define spacing and sizing scales
- [ ] Create component variants matching design
- [ ] Implement responsive breakpoints
- [ ] Add animations and transitions
- [ ] Ensure accessibility standards
- [ ] Validate against user design requirements

---

**Remember: Always reference this file for design decisions. Do not use generic or placeholder designs.**
