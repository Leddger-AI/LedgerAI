import { getAuthToken, refreshAuthToken } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Frontend Sub-Command Client (Child class of MainCommandCenter).
 * All requests route through the parent MainCommandCenter for unified
 * JWT attachment, 401 retry-after-refresh, and client-side task tracking.
 */
class SubCommandClient {
  constructor(parent, domain) {
    this.parent = parent;
    this.domain = domain;
  }

  request(path, options = {}) {
    return this.parent.dispatch(this.domain, path, options);
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  post(path, body, options = {}) {
    return this.request(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch(path, body, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  put(path, body, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' });
  }
}

class FrontendMainCommandCenter {
  constructor() {
    this.tasks = [];
    this.listeners = new Set();

    // 6 Domain Sub-Command Clients
    this.auth = new SubCommandClient(this, 'AuthGovernance');
    this.cost = new SubCommandClient(this, 'CostIntelligence');
    this.forms = new SubCommandClient(this, 'FormsSourcing');
    this.email = new SubCommandClient(this, 'EmailCampaigns');
    this.analytics = new SubCommandClient(this, 'AnalyticsExport');
    this.knowledge = new SubCommandClient(this, 'KnowledgeResearch');
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    const snapshot = [...this.tasks];
    this.listeners.forEach((fn) => fn(snapshot));
  }

  async dispatch(domain, path, options = {}) {
    const taskId = `fe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startedAt = Date.now();
    const task = {
      taskId,
      domain,
      method: options.method || 'GET',
      path,
      status: 'in_progress',
      durationMs: null,
    };
    this.tasks = [task, ...this.tasks].slice(0, 40);
    this.notify();

    try {
      let token = await getAuthToken();
      const buildHeaders = (t) => {
        const headers = { ...(options.headers || {}) };
        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
        if (t) headers.Authorization = `Bearer ${t}`;
        return headers;
      };

      const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
      let res = await fetch(url, { ...options, headers: buildHeaders(token) });

      if (res.status === 401 && token) {
        const fresh = await refreshAuthToken();
        if (fresh && fresh !== token) {
          token = fresh;
          res = await fetch(url, { ...options, headers: buildHeaders(token) });
        }
      }

      task.status = res.ok ? 'completed' : 'error';
      task.statusCode = res.status;
      task.durationMs = Date.now() - startedAt;
      this.notify();
      return res;
    } catch (err) {
      task.status = 'failed';
      task.durationMs = Date.now() - startedAt;
      this.notify();
      throw err;
    }
  }

  getOverview() {
    return this.dispatch('MainGateway', '/api/command-center/overview', { method: 'GET' });
  }

  runMultiDomainResearch() {
    return this.dispatch('MainGateway', '/api/command-center/research', { method: 'POST' });
  }
}

export const commandCenter = new FrontendMainCommandCenter();
export default commandCenter;
