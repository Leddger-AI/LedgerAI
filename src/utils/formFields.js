// Shared field registry — one definition drives the builder toggles,
// the live preview, the future Studio page, and the public form.
// Drafts saved BEFORE fields existed still work: fieldsFromToggles()
// derives the same list from the legacy boolean toggles.

export const FIELD_TYPES = {
  text: 'text',
  email: 'email',
  compoundEmail: 'compoundEmail',
  phone: 'phone',
  textarea: 'textarea',
  radio: 'radio',
  checkbox: 'checkbox',
  dropdown: 'dropdown',
  date: 'date',
  file: 'file',
  url: 'url',
  rating: 'rating',
  paragraph: 'paragraph',
  photo: 'photo',
};

// id, toggle key, section, visual type — mirrors the live builders
const STUDENT_DEFS = [
  { id: 'profilePhoto', toggle: 'profilePhoto', section: 'basic', type: 'photo', label: 'Profile Photo' },
  { id: 'fullName', toggle: 'fullName', section: 'basic', type: 'text', label: 'Full Name', placeholder: 'e.g. John Doe' },
  { id: 'rollNo', toggle: 'rollNo', section: 'basic', type: 'text', label: 'Roll Number', placeholder: 'e.g. CS2024-001' },
  { id: 'collegeEmail', toggle: 'collegeEmail', section: 'basic', type: 'compoundEmail', label: 'College Email' },
  { id: 'github', toggle: 'github', section: 'basic', type: 'url', label: 'GitHub URL', placeholder: 'https://github.com/...' },
  { id: 'linkedin', toggle: 'linkedin', section: 'basic', type: 'url', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/...' },
  { id: 'portfolio', toggle: 'portfolio', section: 'basic', type: 'url', label: 'Portfolio', placeholder: 'Link to portfolio...' },
  { id: 'projects', toggle: 'projects', section: 'basic', type: 'url', label: 'Projects', placeholder: 'Link to projects...' },
  { id: 'resume', toggle: 'resume', section: 'basic', type: 'file', label: 'Resume / CV Upload' },
  { id: 'programPhase', toggle: 'programPhase', section: 'mentorship', type: 'text', label: 'Program Phase', placeholder: 'e.g. Mid-term evaluation' },
  { id: 'meetingFreq', toggle: 'meetingFreq', section: 'mentorship', type: 'text', label: 'Meeting Frequency', placeholder: 'e.g. Weekly, Bi-weekly' },
  { id: 'techSkills', toggle: 'techSkills', section: 'ratings', type: 'rating', label: 'Technical Skill Progress' },
  { id: 'softSkills', toggle: 'softSkills', section: 'ratings', type: 'rating', label: 'Soft Skills & Communication' },
  { id: 'goals', toggle: 'goals', section: 'ratings', type: 'rating', label: 'Goal Achievement' },
  { id: 'learningDiff', toggle: 'learningDiff', section: 'feedback', type: 'textarea', label: 'Identify any learning difficulties or challenges:' },
  { id: 'keyStrengths', toggle: 'keyStrengths', section: 'feedback', type: 'textarea', label: "Highlight the student's key strengths:" },
  { id: 'actionItems', toggle: 'actionItems', section: 'feedback', type: 'textarea', label: 'Action Items / Next Steps:' },
];

export const SECTION_TITLES = {
  basic: 'Basic Details',
  mentorship: 'Mentorship Details',
  ratings: 'Performance Ratings',
  feedback: 'Qualitative Feedback',
};

const DEFS_BY_TYPE = { student: STUDENT_DEFS };

export function fieldDefs(templateType) {
  return DEFS_BY_TYPE[templateType] || STUDENT_DEFS;
}

// New drafts (Studio) store config.fields explicitly; legacy drafts only
// have config.toggles — both resolve to the same ordered field list.
export function fieldsFromToggles(templateType, config) {
  const defs = fieldDefs(templateType);
  if (config && Array.isArray(config.fields) && config.fields.length > 0) {
    const byId = new Map(defs.map((d) => [d.id, d]));
    return config.fields
      .map((f) => ({ ...(byId.get(f.id) || {}), ...f }))
      .filter((f) => f.id && f.type);
  }
  const toggles = (config && config.toggles) || {};
  return defs.filter((d) => toggles[d.toggle]);
}

export function groupBySection(fields) {
  const groups = [];
  const seen = new Map();
  for (const f of fields) {
    if (!seen.has(f.section)) {
      seen.set(f.section, []);
      groups.push([f.section, seen.get(f.section)]);
    }
    seen.get(f.section).push(f);
  }
  return groups;
}
