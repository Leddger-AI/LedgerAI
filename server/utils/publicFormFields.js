const STUDENT = {
  fullName: ['text', 'Full Name'], rollNo: ['text', 'Roll Number'],
  collegeEmail: ['compoundEmail', 'College Email'], github: ['url', 'GitHub URL'],
  linkedin: ['url', 'LinkedIn URL'], portfolio: ['url', 'Portfolio'],
  projects: ['url', 'Projects'], programPhase: ['text', 'Program Phase'],
  meetingFreq: ['text', 'Meeting Frequency'], techSkills: ['rating', 'Technical Skill Progress'],
  softSkills: ['rating', 'Soft Skills & Communication'], goals: ['rating', 'Goal Achievement'],
  learningDiff: ['textarea', 'Learning Difficulties'], keyStrengths: ['textarea', 'Key Strengths'],
  actionItems: ['textarea', 'Action Items'], profilePhoto: ['photo', 'Profile Photo'],
  resume: ['file', 'Resume / CV'],
};
const EMPLOYEE = {
  fullName: ['text', 'Full Name'], employeeId: ['text', 'Employee ID'],
  companyEmail: ['compoundEmail', 'Company Email'], linkedin: ['url', 'LinkedIn'],
  portfolio: ['url', 'Portfolio'], projects: ['url', 'Projects'],
  jobTitle: ['text', 'Job Title'], department: ['text', 'Department'],
  reviewPeriod: ['text', 'Review Period'], jobKnowledge: ['rating', 'Job Knowledge'],
  qualityWork: ['rating', 'Quality of Work'], leadership: ['rating', 'Leadership'],
  accomplishments: ['textarea', 'Accomplishments'], improvements: ['textarea', 'Improvements'],
  smartGoals: ['textarea', 'SMART Goals'], profilePhoto: ['photo', 'Profile Photo'],
  resume: ['file', 'Resume / CV'],
};
const TEAM = {
  teamTitle: ['text', 'Team Name'], teamLead: ['text', 'Team Lead'],
  teamMembers: ['textarea', 'Team Members'], department: ['text', 'Department'],
  teamObjective: ['textarea', 'Team Objective / Charter'], budgetCode: ['text', 'Budget Code'],
};
const REGISTRIES = { student: STUDENT, employee: EMPLOYEE, team: TEAM };
const DISPLAY = new Set(['heading', 'divider', 'paragraph']);
const UNSUPPORTED = new Set(['file', 'photo']);

function publicFields(templateType, config = {}) {
  const registry = REGISTRIES[templateType] || {};
  if (Array.isArray(config.blocks)) return config.blocks.map(b => ({
    id: b.uuid?.startsWith('fld-') ? b.uuid.slice(4) : b.uuid,
    type: b.type, label: b.payload?.label, required: !!b.payload?.isRequired,
    hidden: !!b.style?.hidden, options: b.payload?.options,
    maxRating: b.payload?.maxRating, minLength: b.payload?.minLength,
    maxLength: b.payload?.maxLength, pattern: b.payload?.pattern,
  })).filter(f => f.id && f.type);
  if (Array.isArray(config.fields) && config.fields.length) return config.fields
    .filter(f => f && f.id && f.type)
    .map(f => ({ ...f, required: !!f.required }));
  return Object.entries(registry).filter(([id]) => config.toggles?.[id]).map(([id, [type, label]]) => ({
    id, type, label, required: templateType === 'team' && ['teamTitle', 'teamLead', 'department', 'teamObjective'].includes(id),
  }));
}

function unsupportedRequiredField(templateType, config) {
  return publicFields(templateType, config).find(f => !f.hidden && f.required && UNSUPPORTED.has(f.type));
}

function validateSubmission(templateType, config, data) {
  const fields = publicFields(templateType, config).filter(f => !f.hidden);
  // Old forms with no recognized configuration keep their existing permissive behavior.
  if (!fields.length) return null;
  const allowed = new Map(fields.filter(f => !DISPLAY.has(f.type)).map(f => [f.id, f]));
  for (const key of Object.keys(data)) if (!allowed.has(key)) return `Unexpected field: ${key}`;
  for (const f of allowed.values()) {
    const value = data[f.id];
    if (UNSUPPORTED.has(f.type)) {
      if (f.required || value !== undefined) return `${f.label || f.id} upload is not available yet`;
      continue;
    }
    if (f.required && (value === undefined || value === null || String(value).trim() === '')) return `${f.label || f.id} is required`;
    if (value === undefined || value === null || value === '') continue;
    if (f.type === 'checkbox' && f.required && value !== true) return `${f.label || f.id} is required`;
    if (f.type === 'checkbox' ? typeof value !== 'boolean'
      : f.type === 'rating' ? !['string', 'number'].includes(typeof value)
        : typeof value !== 'string') return `Invalid value for ${f.label || f.id}`;
    const s = String(value).trim();
    if ((f.type === 'email' || f.type === 'compoundEmail') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return `Invalid email for ${f.label || f.id}`;
    if (f.type === 'url' && s && !/^https?:\/\/[^\s.]+(?:\.[^\s]+)+/i.test(s)) return `Invalid URL for ${f.label || f.id}`;
    if (f.type === 'rating' && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > (f.maxRating || 5))) return `Invalid rating for ${f.label || f.id}`;
    if (f.type === 'date' && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))) return `Invalid date for ${f.label || f.id}`;
    if (f.minLength && s.length < f.minLength || f.maxLength && s.length > f.maxLength) return `Invalid length for ${f.label || f.id}`;
    if (['radio', 'dropdown'].includes(f.type) && Array.isArray(f.options)) {
      const options = f.options.map(o => typeof o === 'string' ? o : o.value);
      const values = Array.isArray(value) ? value : [value];
      if (values.some(v => !options.includes(v))) return `Invalid option for ${f.label || f.id}`;
    }
    if (templateType === 'team' && f.id === 'department' && config.deptInputMode === 'dropdown'
      && Array.isArray(config.selectedDepartments) && !config.selectedDepartments.includes(value)) return 'Invalid department';
  }
  return null;
}

function candidateIdentity(data, config = {}) {
  const fields = publicFields('student', config);
  const emailField = fields.find(f => ['email', 'compoundEmail'].includes(f.type) && data[f.id]);
  const nameField = fields.find(f => f.id === 'fullName') || fields.find(f => /full name/i.test(f.label || ''));
  const email = emailField ? data[emailField.id] : data.collegeEmail || data.email;
  const name = nameField ? data[nameField.id] : data.fullName || data.name;
  return {
    email: typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? email.trim().toLowerCase() : null,
    name: typeof name === 'string' ? name.trim().slice(0, 200) : null,
  };
}

module.exports = { publicFields, unsupportedRequiredField, validateSubmission, candidateIdentity };
