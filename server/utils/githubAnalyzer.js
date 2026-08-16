const TemplateSubmission = require('../models/TemplateSubmission');

const ROLE_KEYWORDS = {
  Frontend: ['react', 'vue', 'angular', 'svelte', 'css', 'html', 'tailwind', 'frontend', 'nextjs', 'next.js', 'redux', 'webpack', 'vite'],
  Backend: ['node', 'express', 'django', 'flask', 'spring', 'laravel', 'api', 'backend', 'rest', 'graphql', 'postgres', 'mysql', 'mongodb', 'redis'],
  Fullstack: ['fullstack', 'full-stack', 'mern', 'mean', 'jamstack'],
  DevOps: ['docker', 'kubernetes', 'terraform', 'ci', 'cd', 'pipeline', 'aws', 'gcp', 'azure', 'ansible', 'jenkins', 'helm'],
  Data: ['python', 'pandas', 'numpy', 'jupyter', 'ml', 'ai', 'tensorflow', 'pytorch', 'scikit', 'spark', 'etl', 'airflow'],
  Mobile: ['flutter', 'react-native', 'swift', 'kotlin', 'android', 'ios', 'xcode'],
};

const LANGUAGE_TO_ROLE = {
  JavaScript: ['Frontend', 'Backend', 'Fullstack'],
  TypeScript: ['Frontend', 'Backend', 'Fullstack'],
  Python: ['Data', 'Backend'],
  Java: ['Backend', 'Mobile'],
  Kotlin: ['Mobile'],
  Swift: ['Mobile'],
  Go: ['Backend', 'DevOps'],
  Rust: ['Backend'],
  C: ['Backend'],
  'C++': ['Backend', 'Data'],
  'C#': ['Backend'],
  Ruby: ['Backend'],
  PHP: ['Backend'],
  Shell: ['DevOps'],
  Dockerfile: ['DevOps'],
  HTML: ['Frontend'],
  CSS: ['Frontend'],
  SCSS: ['Frontend'],
  Vue: ['Frontend'],
  Dart: ['Mobile'],
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const githubCache = new Map();

function getCached(key) {
  const entry = githubCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    githubCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  githubCache.set(key, { data, timestamp: Date.now() });
}

function classifyRole(repos) {
  const roleScores = {};
  Object.keys(ROLE_KEYWORDS).forEach(r => { roleScores[r] = 0; });

  repos.forEach(repo => {
    const text = `${repo.name || ''} ${repo.description || ''} ${repo.language || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();

    Object.entries(ROLE_KEYWORDS).forEach(([role, keywords]) => {
      keywords.forEach(kw => {
        if (text.includes(kw)) roleScores[role] += 1;
      });
    });

    if (repo.language && LANGUAGE_TO_ROLE[repo.language]) {
      LANGUAGE_TO_ROLE[repo.language].forEach(role => {
        roleScores[role] += 2;
      });
    }
  });

  const sorted = Object.entries(roleScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return { primaryRole: 'Unknown', allRoles: [] };

  return {
    primaryRole: sorted[0][0],
    allRoles: sorted.map(([role, score]) => ({ role, score })),
  };
}

function extractTechStack(repos) {
  const langCounts = {};
  let totalLangs = 0;

  repos.forEach(repo => {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
      totalLangs++;
    }
  });

  const languages = Object.entries(langCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalLangs > 0 ? Math.round((count / totalLangs) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topicCounts = {};
  repos.forEach(repo => {
    (repo.topics || []).forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });
  const topTopics = Object.entries(topicCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { languages, topTopics };
}

async function fetchGitHubRepos(username) {
  const cached = getCached(`repos:${username}`);
  if (cached) return cached;

  const response = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=30&sort=updated`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'LeddgerAI-Analytics',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return { error: 'User not found', repos: [] };
    if (response.status === 403) return { error: 'Rate limited', repos: [] };
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const repos = await response.json();
  const simplified = repos.map(r => ({
    name: r.name,
    description: r.description,
    language: r.language,
    topics: r.topics || [],
    stars: r.stargazers_count,
    forks: r.forks_count,
    updatedAt: r.updated_at,
  }));

  const result = { repos: simplified };
  setCached(`repos:${username}`, result);
  return result;
}

async function analyzeTemplateGitHub(ownerUid, draftId) {
  const submissions = await TemplateSubmission.find({ draftId, ownerUid }).lean();

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

  const uniqueUsernames = [...new Set(githubUsernames)];

  if (uniqueUsernames.length === 0) {
    return {
      hasGithubData: false,
      totalProfiles: 0,
      roleDistribution: [],
      topLanguages: [],
      topTopics: [],
      profiles: [],
    };
  }

  const profileResults = [];
  const roleAggregation = {};
  const langAggregation = {};
  const topicAggregation = {};

  for (const username of uniqueUsernames) {
    try {
      const { repos, error } = await fetchGitHubRepos(username);
      if (error || !repos || repos.length === 0) {
        profileResults.push({ username, error: error || 'No repos', role: 'Unknown' });
        continue;
      }

      const { primaryRole, allRoles } = classifyRole(repos);
      const { languages, topTopics } = extractTechStack(repos);

      roleAggregation[primaryRole] = (roleAggregation[primaryRole] || 0) + 1;
      languages.forEach(lang => {
        langAggregation[lang.name] = (langAggregation[lang.name] || 0) + lang.count;
      });
      topTopics.forEach(topic => {
        topicAggregation[topic.name] = (topicAggregation[topic.name] || 0) + topic.count;
      });

      profileResults.push({
        username,
        role: primaryRole,
        repoCount: repos.length,
        topLanguage: languages[0]?.name || 'N/A',
        stars: repos.reduce((sum, r) => sum + (r.stars || 0), 0),
      });
    } catch (err) {
      profileResults.push({ username, error: err.message, role: 'Unknown' });
    }
  }

  const roleDistribution = Object.entries(roleAggregation)
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);

  const topLanguages = Object.entries(langAggregation)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topTopics = Object.entries(topicAggregation)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    hasGithubData: true,
    totalProfiles: uniqueUsernames.length,
    roleDistribution,
    topLanguages,
    topTopics,
    profiles: profileResults,
  };
}

module.exports = {
  analyzeTemplateGitHub,
  classifyRole,
  extractTechStack,
  fetchGitHubRepos,
};
