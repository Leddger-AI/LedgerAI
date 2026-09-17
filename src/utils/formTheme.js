// Shared form-theming helpers (kept outside FormRenderer.jsx so the
// react-refresh rule stays happy — that file may only export components).

// Strip anything that could break out of a <style> tag or pull remote
// resources. The server strips <script> blocks at save time as well.
export function sanitizeCss(css) {
  if (typeof css !== 'string') return '';
  return css
    .replace(/<[^>]*>/g, '')
    .replace(/@import[^;]+;/gi, '')
    .slice(0, 20000);
}

// settings.styles shape -> CSS custom properties for .form-paper
export function themeVars(theme = {}) {
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};
  const spacing = theme.spacing || {};
  const border = theme.border || {};
  const vars = {};
  if (colors.accent) vars['--form-accent'] = colors.accent;
  if (colors.background) vars['--form-bg'] = colors.background;
  if (colors.text) vars['--form-text'] = colors.text;
  if (colors.error) vars['--form-error'] = colors.error;
  if (fonts.family) vars['--form-font'] = fonts.family;
  if (spacing.fieldGap) vars['--form-gap'] = spacing.fieldGap;
  if (border.radius) vars['--form-radius'] = border.radius;
  return vars;
}
