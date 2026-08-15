# Phase 3: GitHub Role & Tech Stack Analysis

## PR
[#28](https://github.com/Leddger-AI/LedgerAI/pull/28) — `feature/analytics-phase3` — **Open**

## Overview

Phase 3 adds GitHub profile analysis to the template analytics. When form submissions contain GitHub usernames, the system fetches public repositories from the GitHub API, classifies each user into a developer role (Frontend, Backend, Fullstack, DevOps, Data, Mobile), and aggregates tech stack data (languages, topics) across all submissions for a template.

This enables recruiters to understand the technical profile of their candidate pool at a glance — what roles their candidates fit, what languages they use, and what technologies they work with.

## Backend

### githubAnalyzer.js (`server/utils/githubAnalyzer.js`)

The core analysis utility. Exports `analyzeTemplateGitHub`, `classifyRole`, `extractTechStack`, and `fetchGitHubRepos`.

#### `fetchGitHubRepos(username)`

Fetches up to 30 most recently updated public repositories for a GitHub user.

```js
const response = await fetch(
  `https://api.github.com/users/${username}/repos?per_page=30&sort=updated`,
  {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'LeddgerAI-Analytics',
    },
  }
);
```

**Caching:**
- In-memory `Map` cache with 1-hour TTL per username
- Cache key: `repos:${username}`
- Avoids redundant API calls within the same session

**Error handling:**
- 404 → returns `{ error: 'User not found', repos: [] }`
- 403 → returns `{ error: 'Rate limited', repos: [] }`
- Other errors → throws

**Response format (simplified):**
```js
repos.map(r => ({
  name: r.name,
  description: r.description,
  language: r.language,
  topics: r.topics || [],
  stars: r.stargazers_count,
  forks: r.forks_count,
  updatedAt: r.updated_at,
}));
```

#### `classifyRole(repos)`

Classifies a user into a developer role based on their repositories.

**Role categories and keywords:**

| Role | Keywords |
|---|---|
| Frontend | react, vue, angular, svelte, css, html, tailwind, frontend, nextjs, next.js, redux, webpack, vite |
| Backend | node, express, django, flask, spring, laravel, api, backend, rest, graphql, postgres, mysql, mongodb, redis |
| Fullstack | fullstack, full-stack, mern, mean, jamstack |
| DevOps | docker, kubernetes, terraform, ci, cd, pipeline, aws, gcp, azure, ansible, jenkins, helm |
| Data | python, pandas, numpy, jupyter, ml, ai, tensorflow, pytorch, scikit, spark, etl, airflow |
| Mobile | flutter, react-native, swift, kotlin, android, ios, xcode |

**Language-to-role mapping:**
Each programming language maps to one or more roles with a +2 score bonus:
- JavaScript/TypeScript → Frontend, Backend, Fullstack
- Python → Data, Backend
- Java → Backend, Mobile
- Kotlin/Swift/Dart → Mobile
- Go → Backend, DevOps
- Shell/Dockerfile → DevOps
- HTML/CSS/SCSS/Vue → Frontend
- etc.

**Scoring algorithm:**
1. For each repo, combine `name + description + language + topics` into a text blob
2. For each role, check if any keywords appear in the text → +1 per match
3. If the repo's primary language maps to a role → +2 per role
4. Sum scores across all repos
5. Return the highest-scoring role as `primaryRole`, plus full sorted list

**Output:**
```js
{
  primaryRole: 'Frontend',
  allRoles: [
    { role: 'Frontend', score: 15 },
    { role: 'Fullstack', score: 8 },
    { role: 'Backend', score: 6 },
  ],
}
```

If no roles match (empty repos or no recognized languages), returns `primaryRole: 'Unknown'`.

#### `extractTechStack(repos)`

Aggregates languages and topics across all repos.

**Languages:**
- Counts occurrences of each `repo.language` across repos
- Calculates percentage of total
- Sorted by count descending, top 10

**Topics:**
- Counts occurrences of each topic across repos
- Sorted by count descending, top 10

**Output:**
```js
{
  languages: [
    { name: 'JavaScript', count: 8, percentage: 40 },
    { name: 'Python', count: 6, percentage: 30 },
  ],
  topTopics: [
    { name: 'react', count: 5 },
    { name: 'docker', count: 3 },
  ],
}
```

#### `analyzeTemplateGitHub(ownerUid, draftId)`

The main function called by the API endpoint. Orchestrates the full analysis.

**Steps:**
1. Fetch all `TemplateSubmission` documents for the given `draftId` and `ownerUid`
2. Extract GitHub usernames from `submittedData`:
   - Checks `githubUsername`, `github`, and `githubUrl` fields
   - Parses full URLs (`github.com/username`) to extract just the username
   - Deduplicates usernames
3. For each unique username:
   - Call `fetchGitHubRepos(username)`
   - If repos found: `classifyRole()` + `extractTechStack()`
   - Aggregate role counts, language counts, topic counts
   - Build profile summary: `{ username, role, repoCount, topLanguage, stars }`
4. Return aggregated results

**Username extraction logic:**
```js
const githubUsernames = submissions
  .map(s => {
    const data = s.submittedData || {};
    return data.githubUsername || data.github || data.githubUrl || null;
  })
  .filter(Boolean)
  .map(username => {
    if (username.includes('github.com/')) {
      return username.split('github.com/')[1].replace(/\/$/, '').trim();
    }
    return username.trim();
  })
  .filter(u => u.length > 0);
```

**Full output:**
```json
{
  "hasGithubData": true,
  "totalProfiles": 5,
  "roleDistribution": [
    { "role": "Frontend", "count": 3 },
    { "role": "Backend", "count": 2 }
  ],
  "topLanguages": [
    { "name": "JavaScript", "count": 8 },
    { "name": "Python", "count": 6 }
  ],
  "topTopics": [
    { "name": "react", "count": 4 },
    { "name": "docker", "count": 3 }
  ],
  "profiles": [
    {
      "username": "johndoe",
      "role": "Frontend",
      "repoCount": 15,
      "topLanguage": "JavaScript",
      "stars": 42
    }
  ]
}
```

If no GitHub usernames found in submissions:
```json
{
  "hasGithubData": false,
  "totalProfiles": 0,
  "roleDistribution": [],
  "topLanguages": [],
  "topTopics": [],
  "profiles": []
}
```

---

### API Endpoint (`server/index.js`)

#### `GET /api/analytics/templates/:draftId/github`

```js
app.get('/api/analytics/templates/:draftId/github', verifyToken, async (req, res) => {
  try {
    const result = await analyzeTemplateGitHub(req.user.uid, req.params.draftId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching GitHub analytics:', error);
    res.status(500).json({ error: 'Failed to fetch GitHub analytics' });
  }
});
```

- Behind `verifyToken` middleware
- Scoped to `req.user.uid` (user can only analyze their own templates)
- Placed before `/api/analytics/trends` to avoid route shadowing

---

## Frontend

### GitHub Analysis Section in TemplateDetailAnalytics.jsx

Added to `src/pages/TemplateDetailAnalytics.jsx` between the rating distribution charts and the raw submissions table.

**New state:**
```js
const [githubData, setGithubData] = useState(null);
const [githubLoading, setGithubLoading] = useState(false);
const [githubError, setGithubError] = useState(null);
```

**New fetch function:**
```js
const fetchGithubAnalytics = useCallback(async () => {
  setGithubLoading(true);
  setGithubError(null);
  try {
    const token = await getAuthToken();
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/api/analytics/templates/${draftId}/github`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch GitHub analytics');
    const data = await res.json();
    setGithubData(data);
  } catch (err) {
    setGithubError(err.message);
  } finally {
    setGithubLoading(false);
  }
}, [draftId]);
```

**Lazy loading:** The GitHub analysis is **not** fetched on page load. The user must click the "Load Analysis" button. This is intentional to:
- Avoid consuming GitHub API rate limits unnecessarily
- Keep the detail page fast when GitHub data isn't needed
- Give the user control over when the analysis runs

**UI sections:**

1. **Header with Load button** — GitBranch icon, title, and "Load Analysis" button (hidden after data loads)
2. **Loading state** — Spinner with "Analyzing GitHub profiles..." text
3. **Error state** — Red error banner
4. **Empty state** — When `hasGithubData === false`, shows "No GitHub usernames found"
5. **Role Distribution** — For each role:
   - Role badge (colored by role type)
   - Count number
   - Progress bar (count / totalProfiles * 100%)
6. **Top Languages** — Ranked list of language pills:
   - Rank number (#1, #2, ...)
   - Language name
   - Repo count
7. **Top Topics & Technologies** — Tag chips with topic name and count
8. **Profile Breakdown Table** — Per-candidate table:
   - Username (with GitBranch icon)
   - Role (badge or error status)
   - Repo count
   - Top language
   - Stars (with Star icon)

---

### CSS (`src/pages/AnalyticsPage.css`)

New styles added for the GitHub analysis section:

| Class | Description |
|---|---|
| `.analytics-github-panel` | Main panel container with 20px padding |
| `.analytics-github-header` | Flex space-between for title and load button |
| `.analytics-github-load-btn` | Outlined button with hover state |
| `.analytics-github-section` | Section spacing (24px bottom margin) |
| `.analytics-github-subtitle` | Uppercase, bold section headers |
| `.analytics-github-roles` | Vertical flex for role items |
| `.analytics-github-role-item` | Flex row with badge, count, progress bar |
| `.analytics-github-role-bar` | 6px track for progress bar |
| `.analytics-github-role-bar-fill` | Blue fill with transition animation |
| `.analytics-github-languages` | Flex wrap for language pills |
| `.analytics-github-lang-item` | Pill card with rank, name, count |
| `.analytics-github-topics` | Flex wrap for topic tags |
| `.analytics-github-topic-tag` | Blue rounded tag chip |
| `.analytics-github-username` | Flex row with icon for table cells |

**Role-specific badge colors:**

| Role | Background | Color |
|---|---|---|
| Frontend | `rgba(59, 130, 246, 0.15)` | `#3B82F6` (blue) |
| Backend | `rgba(139, 92, 246, 0.15)` | `#8B5CF6` (purple) |
| Fullstack | `rgba(236, 72, 153, 0.15)` | `#EC4899` (pink) |
| DevOps | `rgba(245, 158, 11, 0.15)` | `#F59E0B` (amber) |
| Data | `rgba(34, 197, 94, 0.15)` | `#22C55E` (green) |
| Mobile | `rgba(99, 102, 241, 0.15)` | `#6366F1` (indigo) |
| Unknown | `rgba(128, 128, 128, 0.15)` | `#888` (gray) |

---

## GitHub API Rate Limiting

The GitHub REST API has the following rate limits:

| Auth Method | Limit | Notes |
|---|---|---|
| Unauthenticated | 60 requests/hour per IP | Current implementation |
| Personal Access Token | 5,000 requests/hour | Future enhancement |
| GitHub App (installation token) | 5,000 requests/hour per installation | Future enhancement |

**Current mitigations:**
- In-memory cache with 1-hour TTL per username
- Analysis is lazy-loaded (user clicks button, not on page load)
- Graceful error handling for 403 (rate limited) responses

**Future enhancement:** Use the existing GitHub App integration (`GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY` env vars) to authenticate API calls for 5,000 req/hour limit.

---

## Commits

| # | Message |
|---|---|
| 1 | `feat(github): add githubAnalyzer.js utility for role & tech stack analysis` |
| 2 | `feat(api): add GET /api/analytics/templates/:draftId/github endpoint` |
| 3 | `feat(frontend): add GitHub role & tech stack analysis section to TemplateDetailAnalytics` |
| 4 | `style(github): add CSS for GitHub analysis section in analytics page` |
| 5 | `fix: replace invalid Github icon with GitBranch from lucide-react` |

---

## Build Verification

- Vite production build passes (1.89s)
- Server module loads successfully with `githubAnalyzer` import
- MongoDB connection established via Mongoose
