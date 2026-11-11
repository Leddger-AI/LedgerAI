const { publicFields, unsupportedRequiredField, validateSubmission, candidateIdentity } = require('../utils/publicFormFields');

describe('published form fields', () => {
  test('legacy student, employee and team toggles resolve to their own field sets', () => {
    expect(publicFields('student', { toggles: { fullName: true, collegeEmail: true } }).map(f => f.id))
      .toEqual(['fullName', 'collegeEmail']);
    expect(publicFields('employee', { toggles: { employeeId: true, companyEmail: true } }).map(f => f.id))
      .toEqual(['employeeId', 'companyEmail']);
    expect(publicFields('team', { toggles: { teamTitle: true, teamMembers: true } }).map(f => f.id))
      .toEqual(['teamTitle', 'teamMembers']);
  });

  test('block order and required rules are validated', () => {
    const config = { blocks: [
      { uuid: 'fld-fullName', type: 'text', payload: { label: 'Full Name', isRequired: true } },
      { uuid: 'fld-collegeEmail', type: 'compoundEmail', payload: { label: 'Email', isRequired: true } },
    ] };
    expect(publicFields('student', config).map(f => f.id)).toEqual(['fullName', 'collegeEmail']);
    expect(validateSubmission('student', config, { fullName: 'A' })).toMatch(/Email is required/);
    expect(validateSubmission('student', config, { fullName: 'A', collegeEmail: 'wrong' })).toMatch(/Invalid email/);
    expect(validateSubmission('student', config, { fullName: 'A', collegeEmail: 'a@example.com', extra: 'x' })).toMatch(/Unexpected field/);
    expect(validateSubmission('student', config, { fullName: 42, collegeEmail: 'a@example.com' })).toMatch(/Invalid value/);
    expect(validateSubmission('student', config, { fullName: 'A', collegeEmail: 'a@example.com' })).toBeNull();
    expect(candidateIdentity({ fullName: ' Ava ', collegeEmail: ' Ava@Example.COM ' }, config))
      .toEqual({ name: 'Ava', email: 'ava@example.com' });
  });

  test('required upload fields block publishing; optional uploads cannot receive fake values', () => {
    const config = { fields: [{ id: 'resume', type: 'file', label: 'Resume', required: true }] };
    expect(unsupportedRequiredField('student', config).id).toBe('resume');
    expect(validateSubmission('student', config, {})).toMatch(/upload is not available/);
    config.fields[0].required = false;
    expect(unsupportedRequiredField('student', config)).toBeUndefined();
    expect(validateSubmission('student', config, {})).toBeNull();
    expect(validateSubmission('student', config, { resume: 'fake.pdf' })).toMatch(/upload is not available/);
  });

  test('team department dropdown accepts only configured departments', () => {
    const config = { toggles: { department: true }, deptInputMode: 'dropdown', selectedDepartments: ['Design'] };
    expect(validateSubmission('team', config, { department: 'Finance' })).toBe('Invalid department');
    expect(validateSubmission('team', config, { department: 'Design' })).toBeNull();
  });
});
