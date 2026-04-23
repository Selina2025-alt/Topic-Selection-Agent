# Workbench Repair Design

## Scope

This round repairs the content monitoring workbench in four areas:

1. Replace the static create-category draft with a real interactive form.
2. Standardize the WeChat keyword-search integration behind a server route.
3. Simplify homepage structure so system actions, category overview, and content areas have clearer hierarchy.
4. Tighten typography and spacing to reduce visual noise.

## Design

### Create Category Flow

- Keep category data in page-level React state rather than reading directly from static mock exports.
- Add a dedicated create-category draft component with controlled fields:
  - category name
  - platforms
  - keywords
  - accounts
- Draft stays collapsed by default and opens only when the global or sidebar create button is clicked.
- Saving creates a new front-end mock category, inserts it into the sidebar, switches focus to it, and opens its content tab.
- Cancel hides the form without saving.
- Delete draft clears all input state and closes the form.

### WeChat Keyword Search

- Rename the route to `/api/wechat/keyword-search`.
- Keep the Authorization token server-side in environment variables only.
- Expose a service function `searchWechatArticlesByKeyword(keyword, page, period)`.
- Map upstream results into a normalized workbench article model that preserves:
  - id
  - platform
  - title
  - summary
  - authorName
  - authorId
  - publishTime
  - readCount
  - likeCount
  - articleUrl
  - avatar
  - isOriginal
  - keyword
- When a category becomes active, its first keyword is used to request page 1 of recent WeChat articles.
- Content tab shows loading, empty, and error states explicitly.

### Homepage Structure

- Global toolbar contains only system-level title, scan state, and actions.
- Create-category form is rendered as a collapsible secondary panel under the toolbar.
- Main header keeps category overview only:
  - title
  - description
  - last update
  - today collection count
  - platform coverage
  - report status
  - tabs
- Main body continues to emphasize:
  - action deck
  - report with evidence bridge
  - content pool with WeChat article results

### Visual Tightening

- Reduce page title, module title, and body text sizes slightly.
- Reduce card padding and inter-section spacing.
- Make helper text lighter so the primary reading path is clearer.

## File Boundaries

- `src/components/workbench/global-toolbar.tsx`
  - system toolbar only
- `src/components/workbench/create-category-draft.tsx`
  - controlled create-category form
- `src/components/workbench/monitoring-workbench.tsx`
  - page-level category state and save/cancel/delete wiring
- `src/components/workbench/content-tab.tsx`
  - WeChat keyword content lifecycle and UI states
- `src/components/workbench/content-filter-bar.tsx`
  - keyword quick-switch plus manual search input
- `src/app/api/wechat/keyword-search/route.ts`
  - server proxy route
- `src/lib/wechat-monitor.ts`
  - upstream request and result mapping
- `src/lib/types.ts`
  - normalized category draft and article typing
- `src/app/globals.css`
  - spacing and typography adjustments

## Risks

- Existing report/content bridge tests depend on several current labels and content states, so the text changes must stay compatible with the current interaction contract.
- Creating a new category requires generating enough mock structure to avoid empty-state crashes in header, report, settings, and sidebar components.
