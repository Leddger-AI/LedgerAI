const { createEvent } = require('ics');

/**
 * Generates an instant open-source Jitsi Meet room URL for an interview.
 */
function generateJitsiRoomUrl(candidateName = 'candidate', id = Date.now()) {
  const slug = String(candidateName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'interview';
  const suffix = String(id).slice(-6);
  return `https://meet.jit.si/leddger-${slug}-${suffix}`;
}

/**
 * Builds an RFC 5545 .ics calendar invite string using the open-source `ics` package.
 */
function buildInterviewIcs({
  title,
  description,
  location,
  startDate,
  durationMinutes = 45,
  organizerEmail,
  attendeeEmail,
  attendeeName,
}) {
  const d = new Date(startDate);
  const start = [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];

  const event = {
    start,
    startInputType: 'utc',
    duration: { minutes: Number(durationMinutes) || 45 },
    title: title || 'Leddger AI Interview',
    description: description || '',
    location: location || '',
    url: location || undefined,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    organizer: organizerEmail ? { name: 'Leddger AI', email: organizerEmail } : undefined,
    attendees: attendeeEmail
      ? [{ name: attendeeName || attendeeEmail, email: attendeeEmail, rsvp: true, partstat: 'NEEDS-ACTION', role: 'REQ-PARTICIPANT' }]
      : [],
  };

  const { error, value } = createEvent(event);
  if (error) throw error;
  return value;
}

module.exports = {
  generateJitsiRoomUrl,
  buildInterviewIcs,
};
