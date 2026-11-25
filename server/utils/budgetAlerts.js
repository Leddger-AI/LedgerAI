const supabase = require('../supabaseClient');
const ProjectBudget = require('../models/ProjectBudget');
const MeetingRate = require('../models/MeetingRate');

/**
 * Checks whether current-month meeting spend for `project` has crossed
 * 80% (warning) or 100% (exceeded) of its monthlyCap. Inserts a deduplicated
 * alert in Supabase `alerts` and optionally dispatches an email notification.
 */
async function checkBudgetAlerts(ownerUid, project, userEmail = null) {
  if (!ownerUid || !project || !supabase) return { triggered: false };

  try {
    const budget = await ProjectBudget.findOne({ ownerUid, project }).lean();
    if (!budget || !budget.monthlyCap || budget.monthlyCap <= 0) {
      return { triggered: false };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('duration_minutes,attendees')
      .eq('user_id', ownerUid)
      .eq('ai_project', project)
      .gte('start_time', monthStart);

    if (error) return { triggered: false };

    const defRate = await MeetingRate.findOne({
      ownerUid, dept: 'default', level: 'default', region: 'default',
    }).lean();
    const hourly = defRate ? defRate.hourlyRate : 75;

    let spent = 0;
    for (const m of meetings || []) {
      const mins = Number(m.duration_minutes) || 0;
      const n = Array.isArray(m.attendees) ? m.attendees.length : 0;
      spent += (mins / 60) * hourly * Math.max(n, 1);
    }
    spent = Math.round(spent * 100) / 100;
    const pct = Math.round((spent / budget.monthlyCap) * 100);

    if (pct < 80) return { triggered: false, spent, pct };

    const level = pct >= 100 ? '100%' : '80%';
    const monthTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const alertTitle = `Budget ${level} Alert: ${project} (${monthTag})`;

    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('user_id', ownerUid)
      .eq('title', alertTitle)
      .limit(1);

    if (existing && existing.length > 0) {
      return { triggered: false, duplicate: true, spent, pct };
    }

    const description = `Monthly meeting spend for ${project} has reached $${spent} (${pct}% of $${budget.monthlyCap} cap).`;
    await supabase.from('alerts').insert({
      user_id: ownerUid,
      type: pct >= 100 ? 'budget_exceeded' : 'budget_warning',
      title: alertTitle,
      description,
      resolved: false,
    });

    if (userEmail) {
      try {
        const EmailAccount = require('../models/EmailAccount');
        const { resolveEmailAccount, buildTransporterFromAccount } = require('./emailAccount');
        const account = await resolveEmailAccount(EmailAccount, ownerUid, null);
        if (account) {
          const transporter = await buildTransporterFromAccount(account);
          await transporter.sendMail({
            from: account.email,
            to: userEmail,
            subject: `[Leddger AI] ${alertTitle}`,
            text: description,
          });
        }
      } catch (_) {
        // Email notification is best-effort; alert is already persisted in Supabase.
      }
    }

    return { triggered: true, level, spent, pct };
  } catch {
    return { triggered: false };
  }
}

module.exports = { checkBudgetAlerts };
