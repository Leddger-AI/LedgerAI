const { canonicalizeTemplate, substituteTemplateVars } = require('../utils/emailTemplate');

describe('email template variables', () => {
  test('canonicalizes imported headers and fills older raw placeholders', () => {
    expect(canonicalizeTemplate('Hello {{First Name}} from {{E-mail}}'))
      .toBe('Hello {{first_name}} from {{email}}');
    expect(substituteTemplateVars('Hello {{First Name}} from {{E-mail}}', {
      first_name: 'Ada', email: 'ada@example.invalid',
    })).toBe('Hello Ada from ada@example.invalid');
  });

  test('does not replace a value that merely contains a matching key', () => {
    expect(substituteTemplateVars('{{name}} {{name_long}}', { name: 'A', name_long: 'B' }))
      .toBe('A B');
  });
});
