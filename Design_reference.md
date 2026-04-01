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

# Admin - User Management

## Overview
Build an Admin page to manage users with capabilities to view user roles, suspend/reactivate accounts, impersonate for support/auditing, and export user lists for support. This feature tightly integrates with core data setup and access control, and surfaces admin analytics metrics to inform product decisions and customer management. All data is stored and retrieved securely, with robust runtime safety guards to prevent crashes when data is missing or null.

## Page Description (Full Detail)
What this page is:
- The Admin - User Management page provides administrators a centralized view of all users, including their roles, statuses (active vs suspended), last activity, linked organizations/companies, and audit-friendly actions. It also includes an export function to generate CSVs for support teams.

Goals:
- Provide a fast, searchable, filterable table of users.
- Show roles and status clearly; allow suspending/reactivating accounts.
- Support impersonation for debugging and support (with audit trail).
- Enable exporting user data to CSV for downstream support workflows.
- Tie into Admin Analytics to surface usage metrics about user activity, role distribution, and suspension trends (as a foundation for product decisions and customer management).

Connected features:
- Admin Analytics: Collect and surface usage metrics to inform product decisions and to help support/manage customers.
- Authentication/Authorization: Ensure only admins can view/manage users; impersonation should be auditable and restricted.
- Core Data Setup: Users table, roles/permissions, and user activity events must exist.

UI elements and visual guidance:
- Top bar: page title, global search, and quick actions.
- Filters: by role, status (active/suspended), registration date range, and company/organization.
- User table: columns for User ID, Name, Email, Role(s), Status, Last Active, Created At, Linked Companies, and Actions.
- Inline or modal details: Expandable row or “Details” modal showing recent activity, last login, and companies linked.
- Actions:
  - Suspend / Reactivate toggle with confirmation modal.
  - Impersonate button with a safe audit trail (requires admin confirmation).
  - View Activity button to inspect recent actions.
- Export: CSV export button with options to export current filters or full dataset; show export progress/notification.
- Visual style: align with the project design system, consistent typography, spacing, colors, and accessible contrast.

API integrations:
- No external APIs are required for this task; all data interactions use the app’s backend (Supabase or equivalent) with guarded responses.
- Ensure API responses are validated and guarded against nulls; use data ?? [] patterns.

## Components to Build
- AdminUserManagementPage
  - Layout with header, filters, actions, and user table.
  - Connects to data layer to fetch users with applied filters and pagination.
- UserTable
  - Renders user rows with proper guards for missing data.
  - Includes actions column with suspend/reactivate and impersonate buttons.
- UserDetailModal
  - Shows user activity, linked companies, and recent events.
  - Read-only or with limited admin actions.
- ExportButton
  - Triggers CSV generation on the backend; shows progress and results.
- ImpersonationGuard
  - Handles UI/UX for initiating impersonation and ensuring audit trail.
- AdminAnalyticsPanel (optional integration surface)
  - Display usage metrics related to user management (admin-focused metrics).

## Implementation Requirements

### Frontend
- Routing
  - Protect the Admin/User Management route so only users with admin role can access.
- State management
  - Use React with proper useState/useEffect hooks.
  - Arrays and objects must be initialized with correct defaults: useState<User[]>([]), etc.
- Components
  - Ensure all components guard against null/undefined data before calling array methods:
    - Example: (users ?? []).map(...) or Array.isArray(users) ? users.map(...) : []
  - Debounced search input for performance.
  - Accessible controls with aria-labels.
- Data fetching
  - Use a safe fetch pattern with validation: const list = Array.isArray(response?.data) ? response.data : [].
  - Null-safe pagination and total counts.
- Actions
  - Suspend/Reactivate flows: confirmation dialogs; optimistic UI updates with rollback on error.
  - Impersonation: prompt confirmation; record audit in frontend; pass audit flag to backend.
- Export
  - Trigger backend CSV generation; poll/subscribe for completion; provide a downloadable link when ready.

### Backend
- Data models
  - Users table with fields: id, name, email, roles (array), status, created_at, last_active_at, linked_companies (array), etc.
  - Roles/permissions mapping for admin checks.
  - Audit logs for impersonation and suspend/reactivate actions.
- APIs
  - GET /admin/users with query params for search, role, status, date ranges, pagination.
  - POST /admin/users/{id}/suspend to suspend (and /reactivate to reactivate).
  - POST /admin/users/{id}/impersonate to initiate impersonation, with audit token generation.
  - GET /admin/users/{id} for user detail in the modal.
  - GET /admin/users/export to generate CSV; or POST /admin/users/export with filters; endpoint returns a job id.
  - GET /admin/users/export/{jobId} to fetch export status and download URL when ready.
- Validation
  - Validate input payloads; ensure required fields exist; guard against malformed IDs.
- Security
  - Role-based access control; every admin endpoint requires proper authorization.
  - Audit trail for impersonation and suspend actions.

### Integration
- Data flow
  - Frontend queries /admin/users with applied filters; table renders with safe guards.
  - Suspend/Reactivate actions trigger backend mutations; frontend reflects state with optimistic updates and error fallbacks.
  - Impersonation action communicates securely; audit event recorded.
  - CSV export is orchestrated server-side; once ready, a download link is presented.
- Analytics integration
  - Emit events or metrics for user management activity (admin actions, suspension counts, impersonation events) to Admin Analytics pipeline.

## User Experience Flow
1. Admin lands on Admin - User Management.
2. Page loads: fetch users, show loading skeletons; if no data, show empty state with guidance.
3. Admin uses search box and filters to refine user list.
4. Admin expands a user row or opens a Details modal to view recent activity and linked companies.
5. Admin clicks Suspend to suspend an active user or Reactivate to restore an suspended account; confirm; observe optimistic UI update; on error, revert.
6. Admin clicks Impersonate on a user; confirms; system logs impersonation and redirects/admin session switch occurs with audit trail.
7. Admin clicks Export to generate a CSV; show progress; provide a download link when ready; optionally allow exporting only filtered results.
8. Admin Analytics panel (if visible) surfaces metrics such as number of users, active vs suspended ratio, role distribution, and recent suspension trends.

## Build Order & Dependencies (Mandatory)
- Prerequisites:
  - Core authentication/authorization system with admin role enforcement.
  - Users table and roles/permissions data model in the database.
  - Admin Analytics infrastructure for metrics collection (can be optional for initial MVP but must be planned).
- Blocks:
  - Block 1: User data model and admin authorization scaffolding.
  - Block 2: Backend CRUD endpoints for user suspension/reactivation and impersonation.
  - Block 3: CSV export workflow and status polling.
  - Block 4: Admin UI components and page wiring.
  - Block 5: Integration with Admin Analytics (event emission).
- Sequencing Rule:
  - Authentication/access control and core data setup must be completed before dashboard/workspace/analytics pages when both exist.

## Technical Specifications
- Data Models
  - User: id, name, email, roles (string[]), status ('active'|'suspended'), created_at, last_active_at, linked_companies (string[]), impersonation_token (nullable string), etc.
  - AuditLog: id, action, performed_by, target_user_id, timestamp, details.
- API Endpoints
  - GET /admin/users?search=&role=&status=&from=&to&page=&perPage=
  - POST /admin/users/{id}/suspend
  - POST /admin/users/{id}/reactivate
  - POST /admin/users/{id}/impersonate
  - GET /admin/users/{id}
  - POST /admin/users/export
  - GET /admin/users/export/{jobId}
- Security
  - Require admin role for all endpoints.
  - Use CSRF/tokeneering as per existing auth system.
  - Audit logs for impersonation and suspend actions; sensitive actions require confirmation.
- Validation
  - Validate inputs for filters, IDs, and payloads; use Array.isArray checks; guard against null data.
- Runtime Safety Rules
  - Supabase-like results: use data ?? [].
  - Guard array methods: (items ?? []).map(...) or Array.isArray(items) ? items.map(...) : [].
  - useState defaults: useState<User[]>([]), useState<Company[]>([]) where appropriate.
  - Optional chaining for nested API data: obj?.property?.nested.
  - Destructuring with defaults: const { items = [], count = 0 } = response ?? {}.

## Acceptance Criteria
- [ ] Admin route is accessible only to users with admin role; unauthorized attempts are rejected with proper status.
- [ ] User table renders with correct data; null-safe rendering using the runtime safety rules.
- [ ] Suspend and Reactivate actions perform, with optimistic UI updates and rollback on failure.
- [ ] Impersonation action creates an audit trail and initiates session switch; only admin can perform.
- [ ] Export functionality generates a CSV; download becomes available; export respects current filters if chosen.
- [ ] Details modal shows accurate last activity and linked companies; data loads safely with guards.
- [ ] Admin Analytics metrics reflect admin actions (suspend counts, impersonations) when integrated.
- [ ] All inputs validated; API responses normalized to safe arrays/objects.

## UI/UX Guidelines
- Align with the project design system for typography, spacing, and components.
- Ensure responsive behavior for tablet/mobile admin view.
- Use clear status indicators (badges) for active vs suspended.
- Provide accessible controls (keyboard navigable, aria labels, focus rings).
- Consistent error states and success notifications.

## Mandatory Coding Standards — Runtime Safety

CRITICAL: Follow these rules in ALL generated code to prevent runtime crashes.

1. Supabase query results: Always use nullish coalescing — const items = data ?? []. Supabase returns null when there are no rows.
2. Array methods: Never call on a value that could be null/undefined/non-array. Guard:
   - (items ?? []).map(...) or Array.isArray(items) ? items.map(...) : []
3. React useState for arrays/objects: Initialize properly — useState<Type[]>([]).
4. API response shapes: Validate — const list = Array.isArray(response?.data) ? response.data : [].
5. Optional chaining: Use obj?.property?.nested when accessing nested API responses.
6. Destructuring with defaults: const { items = [], count = 0 } = response ?? {}.

---

If clustered scope items exist in PROJECT CONTEXT, implement them in one cohesive batch with clear subsections per clustered item (page/feature/schema) and provide one combined acceptance checklist to minimize duplication. This prompt is designed to be directly consumable by an AI development tool to scaffold, implement, test, and verify Admin - User Management with a strong emphasis on runtime safety and dependency-first implementation order.

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
