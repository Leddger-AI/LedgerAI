const express = require('express');

/**
 * Base class for all Domain Sub-Command Centers in LedgerAI.
 * Each child class owns a set of route prefixes, an Express Router,
 * live execution counters, and an optional `runResearch()` health/insight hook.
 */
class SubCommandCenter {
  /**
   * @param {object} config
   * @param {string} config.name - Human-readable name (e.g. 'CostIntelligence')
   * @param {string} config.description
   * @param {string[]} config.prefixes - URL prefixes owned by this sub-command center
   */
  constructor({ name, description = '', prefixes = [] }) {
    if (!name) throw new Error('SubCommandCenter requires a name');
    this.name = name;
    this.description = description;
    this.prefixes = prefixes;
    this.router = express.Router();
    this.stats = {
      totalRequests: 0,
      completed: 0,
      failed: 0,
      inFlight: 0,
      avgLatencyMs: 0,
      lastActivityAt: null,
    };
  }

  /**
   * Checks whether an incoming request path belongs to this Sub-Command Center.
   * @param {string} reqPath
   * @returns {boolean}
   */
  ownsPath(reqPath) {
    return this.prefixes.some((prefix) => reqPath === prefix || reqPath.startsWith(prefix + '/') || reqPath.startsWith(prefix + '?'));
  }

  recordStart() {
    this.stats.totalRequests += 1;
    this.stats.inFlight += 1;
    this.stats.lastActivityAt = new Date().toISOString();
  }

  recordEnd(statusCode, durationMs) {
    this.stats.inFlight = Math.max(0, this.stats.inFlight - 1);
    if (statusCode >= 500) {
      this.stats.failed += 1;
    } else {
      this.stats.completed += 1;
    }
    const doneCount = this.stats.completed + this.stats.failed;
    if (doneCount > 0) {
      this.stats.avgLatencyMs = Math.round(
        ((this.stats.avgLatencyMs * (doneCount - 1)) + durationMs) / doneCount
      );
    }
  }

  /**
   * Override in child Sub-Command Centers to run domain-specific diagnostics/research.
   * @param {string} _ownerUid
   * @returns {Promise<object>}
   */
  async runResearch(_ownerUid) {
    return { domain: this.name, status: 'healthy', summary: 'Active' };
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      prefixes: this.prefixes,
      stats: { ...this.stats },
    };
  }
}

module.exports = SubCommandCenter;
