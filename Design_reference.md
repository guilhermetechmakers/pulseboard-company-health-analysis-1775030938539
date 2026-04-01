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

# PulseBoard — Development Blueprint

## Project Concept
PulseBoard is a web application that provides fast, objective company health analyses for founders, small business owners, consultants, agencies, and early-stage investors. It collects structured company data across profile, financials, market, and social/brand channels, augments inputs with optional integrations (QuickBooks, Google Analytics, LinkedIn, Stripe), and uses an AI Analysis Engine (LLM) to produce an executive report containing SWOT, financial/market/social analysis, top risks, opportunities, prioritized action plans, and a multi-dimensional health score. The vision is a lightweight, guided tool that reduces manual, subjective analysis into repeatable, actionable insights, exportable as branded PDFs for client deliverables or internal decision making.

AI app description: an LLM-driven analysis engine that transforms structured user inputs and integrated data into human-readable sections (executive summary, SWOT, risks/opportunities, action plan) and structured JSON outputs for scoring, reporting, and downstream UI rendering.

## Problem Statement
- Core problems:
  - Company health data is fragmented across spreadsheets, accounting platforms, analytics, and social channels.
  - Analysis is manual, slow, subjective, and inconsistent.
  - Non-expert users lack frameworks to prioritize actions and detect risks early.
- Who experiences these problems:
  - Founders, small business owners, consultants/agencies, early-stage investors, and SMB finance/strategy managers.
- Why these problems matter:
  - Slow or poor analysis leads to missed opportunities, unmanaged risks, inefficient prioritization, and poor investment decisions.
- Current state / gaps:
  - No simple tool that aggregates structured inputs + optional integrations and produces an objective, actionable health report optimized for SMB contexts.
  - Existing BI/consulting workflows are heavy, expensive, or require specialized skills.

## Solution
PulseBoard solves these problems by:
- Capturing essential structured inputs via guided forms: company profile, financials, market, and social data.
- Optionally connecting to integrations (QuickBooks, GA4, LinkedIn, Stripe) or importing CSVs to reduce manual entry.
- Running an AI Analysis Engine that returns a report (text + structured JSON) with executive summary, SWOT, financial/market/social analyses, risks, opportunities, prioritized actions, and health scores.
- Presenting results in an editable Report Viewer and enabling PDF export with branding/white-label options for consultants.
Approach and methodology:
- Structured inputs to constrain AI prompts and improve signal quality.
- Tiered analysis depth (brief, standard, deep) with optional benchmarks.
- Health Scoring Engine combining rule-based weights and optional industry benchmarks.
Key differentiators:
- SMB-optimized templates and guidance to reduce friction.
- Single-company-first UX for quick onboarding and focus.
- Editable AI outputs so users can refine results and retain final reports.
Value creation:
- Faster, repeatable company health evaluations, accessible to non-experts, and exportable for client-facing deliverables.

## Requirements

### 1. Pages (UI Screens)
- Landing Page
  - Purpose: Marketing and conversion.
  - Key sections: Hero, feature cards, how-it-works, pricing teaser, testimonials, CTA.
  - Contribution: Drives sign-ups and explains value.

- Signup / Create Account
  - Purpose: Account creation with optional social SSO.
  - Key sections: Email/password, role, optional company name, plan toggle, consent.
  - Contribution: Onboard users into product.

- Email Verification
  - Purpose: Verify user email.
  - Key sections: Status banner, resend, continue CTA.
  - Contribution: Secure onboarding and compliance.

- Login / Password Reset
  - Purpose: Authentication and recovery.
  - Key sections: Email/password, social login, forgot password flow.
  - Contribution: Secure access and account recovery.

- Dashboard
  - Purpose: Primary workspace (single-company focus).
  - Key sections: Company header, overall health score, health breakdown cards, latest analysis, data completeness meter, integrations tile, quick actions.
  - Contribution: At-a-glance health, prompt to generate analysis.

- Create Company (Wizard)
  - Purpose: Guided single-company setup.
  - Key sections: Multi-step Profile → Financials → Market → Social → Review, data completeness, autosave.
  - Contribution: Capture structured data with minimal friction.

- Company Detail
  - Purpose: Persistent company workspace.
  - Key sections: Header with key stats, tabs (Overview, Financials, Market, Social, Reports, Activity), latest analysis card, data completeness and quick edits.
  - Contribution: Central place to manage data and run analyses.

- Financials Form
  - Purpose: Collect financial metrics.
  - Key sections: Numeric inputs (revenue, expenses, profit margin, cash, debt, CAC/LTV, customer concentration), file upload, calculators, help tips.
  - Contribution: Feed scoring & AI analysis.

- Market Data Form
  - Purpose: Capture competitors and market context.
  - Key sections: Competitor list (structured rows), pricing matrix, trends tags/snippets, opportunities/threats with priorities, autocomplete suggestions.
  - Contribution: Informs market analysis and SWOT.

- Social & Brand Form
  - Purpose: Capture social presence & website metrics.
  - Key sections: Channel rows, followers, engagement, posting frequency, GA integration tile or traffic input, reviews/ratings, CSV import.
  - Contribution: Inputs for brand/social analysis and scoring.

- Generate Analysis
  - Purpose: Launch and monitor AI analysis job.
  - Key sections: Data completeness checklist, analysis depth options, benchmarking toggle, consent for AI processing, progress indicator, logs, result card.
  - Contribution: Run AI Analysis Engine and surface progress/results.

- Report Viewer
  - Purpose: View editable AI-generated report.
  - Key sections: Header (company, date, share/export), sections (executive summary, SWOT, Financial, Market, Social, Risks, Opportunities, Action Plan), inline edit, feedback widget, download/share.
  - Contribution: Final report review, edit, and export.

- Export / PDF Settings
  - Purpose: Configure and generate branded PDF.
  - Key sections: Section includes/excludes, branding/logo options, orientation, export progress and download link.
  - Contribution: Produce client-ready deliverables.

- User Profile
  - Purpose: Account management and preferences.
  - Key sections: Profile, security (2FA), subscription summary, recent activity.
  - Contribution: Security and account configuration.

- Settings & Preferences
  - Purpose: Integrations, notifications, team management, data import/export.
  - Key sections: Integrations center, notification preferences, team invite, danger zone.
  - Contribution: Manage integrations and account-level settings.

- Admin - User Management
  - Purpose: Administer users and migrations.
  - Key sections: User table with filters, user detail modal, suspend/reactivate, impersonate (audit logged), export.
  - Contribution: Support and admin control.

- Admin Dashboard
  - Purpose: Monitor product usage and health.
  - Key sections: Metrics (companies created, reports generated), graphs, system queue, error rates.
  - Contribution: Operational insights and monitoring.

- Password Reset
  - Purpose: Secure password reset flow.
  - Key sections: Request, email confirmation, tokenized new password page.
  - Contribution: Account recovery.

### 2. Features
- AI Analysis Engine
  - Technical details: Server-side orchestration of LLM prompts to produce text and structured JSON outputs; depth options (brief/standard/deep); support for benchmarking; store raw LLM payload in Report record.
  - Implementation notes: Use OpenAI (or chosen provider) with prompt templates; rate-limit and queue jobs; include retry and guardrails; consent capture before processing.
  - Contribution: Core value — generates the report.

- Health Scoring Engine
  - Technical details: Rule-based weighted scoring combining normalized financial, market, and brand metrics; ability to ingest benchmarks for scaling.
  - Implementation notes: Compute and store HealthScore entries for history; expose breakdown for UI and charts.
  - Contribution: Quantifies company health.

- User Authentication
  - Technical details: Email/password, OAuth (Google, Microsoft, LinkedIn), email verification, password reset, optional 2FA.
  - Implementation notes: Secure password hashing (bcrypt/argon2), session tokens (JWT or server sessions), Resend for emails via Resend provider.
  - Contribution: Secure access control.

- Integrations & Connectors
  - Technical details: OAuth flows for QuickBooks, Google Analytics (GA4), LinkedIn Pages, Stripe; IntegrationCredential storage with encryptedPayload.
  - Implementation notes: Token refresh, scope management, periodic sync jobs, mapping to single company entity.
  - Contribution: Reduce manual entry and enrich analysis.

- CSV Import Utility
  - Technical details: Server-side parsing of uploaded CSVs (financials, social metrics, competitor lists); validation and mapping UI.
  - Implementation notes: Use S3 presigned uploads; background parsing jobs; show import preview and mapping rules.
  - Contribution: Flexible data ingestion path.

- Report Export / PDF Generation
  - Technical details: HTML/CSS PDF template rendering server-side (headless Chromium or PDF generator) with queued processing and S3 storage of PDFs.
  - Implementation notes: Support white-label options, include company logo, produce shareable presigned URLs.
  - Contribution: Deliverable output for users and clients.

- Notifications & Emails
  - Technical details: Transactional emails (verify, reset, analysis complete, export ready) via Resend; in-app notifications for job statuses.
  - Implementation notes: Templates, retry policies, user notification preferences.
  - Contribution: Keeps users informed.

- Data Import & Export
  - Technical details: CSV export/import, integrations export, user data export for compliance.
  - Implementation notes: Provide audit logs for exports, rate limits.
  - Contribution: Portability & compliance.

- Audit Logs & Error Monitoring
  - Technical details: AuditLog entries for critical actions; integrate with Sentry for exceptions/perf.
  - Implementation notes: Ensure admin access, retention policy.
  - Contribution: Security, troubleshooting, compliance.

- Caching & Performance
  - Technical details: Cache health scores, last analysis outputs, integration responses (TTL), and autosave drafts in Redis.
  - Implementation notes: Invalidate caches on data updates or re-analysis.
  - Contribution: Reduce latency and costs.

- Search & Filter
  - Technical details: Full-text search for reports and content; autosuggest for competitors and tags.
  - Implementation notes: Use Elastic/Algolia for performance.
  - Contribution: Quick access to content.

- Admin Analytics
  - Technical details: Metrics collection and dashboards for product decisions.
  - Implementation notes: Capture key events (company_created, report_generated, analysis_time).
  - Contribution: Track success metrics.

- Company CRUD & Single-Company Mode Enforcement
  - Technical details: Database unique constraint for companies per user/account; API middleware to enforce single-company behavior; replace/overwrite flows; migration job to detect users with >1 companies.
  - Implementation notes: Return 403/409 when create attempted while a company exists; offer admin migration tool for multi-company cases; UI hides multi-company features.
  - Contribution: Keeps product simple and focused.

### 3. User Journeys
- New User / Founder (Self-assessment)
  1. Signup → verify email.
  2. Redirect to Create Company wizard (Profile → Financials → Market → Social).
  3. Fill required minimal fields; see data completeness meter.
  4. Click Generate Analysis (choose depth standard).
  5. System queues AI Analysis Engine; user sees progress.
  6. Receive notification/email when ready.
  7. Open Report Viewer, review, edit text, and download PDF.
  8. Optionally connect QuickBooks/GA for future auto-syncs.

- Consultant / Agency (Client analysis)
  1. Signup and select Pro/Agency plan (billing flow).
  2. Create or replace company (for client) via wizard or CSV import.
  3. Import financials via QuickBooks/CSV; import web/social via GA/LinkedIn if available.
  4. Generate deep analysis with benchmarking and white-label enabled.
  5. Edit and finalize report; export branded PDF and share link with client.
  6. Schedule recurring analyses (future feature) or run per engagement.

- Investor (Pre-screen)
  1. Signup → create company or import prospective target’s data via CSV.
  2. Run brief analysis to get quick health score and risk/opportunity overview.
  3. Use report to decide whether to proceed to deeper diligence.
  4. Export or bookmark report for portfolio tracking.

- Admin / Support
  1. Login to Admin Dashboard.
  2. Monitor metrics (reports generated, errors).
  3. Use User Management to inspect accounts, suspend/reactivate, run migrations for users with multiple companies.
  4. Respond to support requests and impersonate user if required (audit logged).

## UI Guide
- Color palette (design tokens):
  - Primary: #0B6AF7 (Blue)
  - Primary 700 (Dark): #064FD6
  - Accent / Success: #16A34A (Green)
  - Warning: #F59E0B (Amber)
  - Danger: #DC2626 (Red)
  - Neutral 900: #0F172A (Dark text)
  - Neutral 700: #374151 (Secondary text)
  - Neutral 100: #F3F4F6 (Background)
  - White: #FFFFFF
- Typography:
  - UI font: Inter (variable) for headings and body.
  - Heading scale: H1 28-32px semibold, H2 22-24px semibold, H3 16-18px medium.
  - Body: 14-16px regular. Line-height 1.4-1.6.
- Component specs:
  - Buttons: Primary (filled primary), Secondary (outline neutral), Ghost (text). Corner radius 8px, padding 10–14px.
  - Inputs: Single-line with 1px neutral border, 8px radius, inline help text, numeric inputs with unit suffixes.
  - Cards: Elevation level 1, 16px padding, 12px border radius, clear header and body separation.
  - Tabs: Horizontal, clear active underline, accessible keyboard focus.
  - Modal: Centered, max-width 720px for wizards, overlay 40% opacity dark.
  - Forms: Two-column layout for wide screens, single column on mobile; progressive disclosure for advanced fields.
- Layout principles:
  - Responsive grid: 12-column system, gutters 16px.
  - Spacing scale: 4,8,12,16,24,32,40.
  - Prioritize clarity: concise labels, inline examples, tooltips for complex fields.
- Visual style & mood:
  - Professional, optimistic, and actionable. Use data visualizations sparingly and prioritize clear, readable content.
  - Illustrations: light, flat onboarding illustrations; report visuals should be clean and data-focused.
- Component patterns:
  - Data completeness meter: circular or linear with percent and click-to-jump anchors.
  - Report sections: collapsible panels with edit mode toggles and save snapshot controls.
  - Analysis progress: stepper + live log + estimated time.

## Instructions to AI Development Tool
This blueprint provides the complete context needed to build this application. When implementing any part of this project:
1. Refer back to the Project Concept, Problem Statement, and Solution sections to understand the "why" behind each requirement
2. Ensure all features and pages align with solving the identified problems
3. Verify all features and pages are built according to specifications before completing the project
4. Pay special attention to the UI Guide section and ensure all visual elements follow the design system exactly
5. Maintain consistency with the overall solution approach throughout implementation

1. Prioritize single-company mode flows: hide multi-company UI, enforce DB unique constraints, and route users to onboarding or company detail as described.
2. Implement AI Analysis Engine as queued background jobs; capture raw outputs in Report.payload, store status, and surface progress to the user.
3. Use structured prompts and JSON schema responses from the LLM to populate Report (executiveSummary, swot, financialAnalysis, marketAnalysis, socialAnalysis, risks[], opportunities[], actionPlan[], healthScores).
4. Integrations must follow OAuth best practices, store encrypted tokens in IntegrationCredential, and map credentials to the active company.
5. PDF generation must use server-side rendering with a queued worker and store final PDFs in S3 with presigned URLs.
6. Add robust validation and inline guidance in forms to improve AI output quality; show data completeness and require minimal fields before enabling standard analysis.
7. Capture telemetry events for all key actions: company_created, analysis_started, analysis_completed, report_exported, integration_connected, user_signup.
8. Implement audit logging for admin actions and sensitive operations; integrate Sentry for error monitoring and alerting.
9. Provide admin migration tooling to handle users with >1 companies (dry-run, merge/select primary with audit logs).
10. Include unit/integration tests for single-company enforcement, AI job retry logic, PDF export pipeline, and integration token refresh flows.

Designers / Developers should rely on the provided data model, assets, and UX flows. Validate AI outputs for safety and relevance, and surface editable text for user refinement to avoid generic or inaccurate recommendations.

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
