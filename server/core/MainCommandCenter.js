const { v4: uuidv4 } = require('uuid');

/**
 * Main Command Center (Parent Orchestrator).
 * Owns all Sub-Command Centers, intercepts every incoming request to assign
 * a tracked task ID, routes telemetry to the matching Sub-Command Center,
 * and coordinates parallel multi-domain research.
 */
class MainCommandCenter {
  constructor() {
    this.subCenters = new Map();
    this.recentTasks = [];
    this.maxRecentTasks = 100;
  }

  /**
   * Registers a child SubCommandCenter instance.
   * @param {import('./SubCommandCenter')} subCenter
   */
  register(subCenter) {
    this.subCenters.set(subCenter.name, subCenter);
    return this;
  }

  /**
   * Resolves which SubCommandCenter owns a given request path.
   * @param {string} reqPath
   */
  resolveOwner(reqPath) {
    for (const sub of this.subCenters.values()) {
      if (sub.ownsPath(reqPath)) return sub;
    }
    return null;
  }

  /**
   * Express middleware that routes every API request through the Main Command Center,
   * tracking task ID, owner Sub-Command Center, status code, and latency.
   */
  dispatchMiddleware() {
    return (req, res, next) => {
      if (!req.path.startsWith('/api/')) return next();

      const taskId = `cmd_${uuidv4().slice(0, 10)}`;
      const owner = this.resolveOwner(req.path);
      const domainName = owner ? owner.name : 'MainGateway';
      const start = Date.now();

      req.commandTask = { taskId, domain: domainName, startedAt: new Date(start).toISOString() };
      res.setHeader('X-Command-Center', domainName);
      res.setHeader('X-Task-Id', taskId);

      if (owner) owner.recordStart();

      const taskEntry = {
        taskId,
        domain: domainName,
        method: req.method,
        path: req.path,
        status: 'in_progress',
        statusCode: null,
        durationMs: null,
        startedAt: req.commandTask.startedAt,
      };
      this.recentTasks.unshift(taskEntry);
      if (this.recentTasks.length > this.maxRecentTasks) {
        this.recentTasks.length = this.maxRecentTasks;
      }

      res.on('finish', () => {
        const durationMs = Date.now() - start;
        if (owner) owner.recordEnd(res.statusCode, durationMs);
        taskEntry.statusCode = res.statusCode;
        taskEntry.durationMs = durationMs;
        taskEntry.status = res.statusCode >= 500 ? 'failed' : 'completed';
      });

      next();
    };
  }

  /**
   * Mounts all SubCommandCenter Express routers onto the main Express app
   * and registers the Main Command Center's own orchestration endpoints.
   */
  mountAll(app, verifyToken) {
    for (const sub of this.subCenters.values()) {
      app.use(sub.router);
    }

    app.get('/api/command-center/overview', verifyToken, (req, res) => {
      res.json(this.getOverview());
    });

    app.get('/api/command-center/tasks', verifyToken, (req, res) => {
      const { domain, status, limit = 30 } = req.query;
      let tasks = this.recentTasks;
      if (domain) tasks = tasks.filter((t) => t.domain === domain);
      if (status) tasks = tasks.filter((t) => t.status === status);
      res.json({ tasks: tasks.slice(0, Math.min(100, Number(limit) || 30)) });
    });

    app.post('/api/command-center/research', verifyToken, async (req, res) => {
      try {
        const results = await this.runMultiDomainResearch(req.user.uid);
        res.json({
          orchestrator: 'MainCommandCenter',
          executedAt: new Date().toISOString(),
          domains: results,
        });
      } catch (error) {
        console.error('Multi-domain research error:', error);
        res.status(500).json({ error: 'Failed to execute multi-domain research' });
      }
    });
  }

  /**
   * Dispatches parallel research/diagnostics across all registered Sub-Command Centers.
   */
  async runMultiDomainResearch(ownerUid) {
    const entries = [...this.subCenters.values()];
    const settled = await Promise.allSettled(
      entries.map((sub) => sub.runResearch(ownerUid))
    );
    return entries.map((sub, idx) => {
      const r = settled[idx];
      if (r.status === 'fulfilled') return r.value;
      return { domain: sub.name, status: 'error', error: r.reason?.message || 'Research failed' };
    });
  }

  getOverview() {
    const subCenters = [...this.subCenters.values()].map((s) => s.toJSON());
    const totals = subCenters.reduce(
      (acc, s) => {
        acc.totalRequests += s.stats.totalRequests;
        acc.completed += s.stats.completed;
        acc.failed += s.stats.failed;
        acc.inFlight += s.stats.inFlight;
        return acc;
      },
      { totalRequests: 0, completed: 0, failed: 0, inFlight: 0 }
    );
    return {
      mainCommandCenter: 'LedgerAI-MainCommandCenter',
      subCentersCount: subCenters.length,
      totals,
      subCenters,
      recentTasks: this.recentTasks.slice(0, 15),
    };
  }
}

module.exports = MainCommandCenter;
