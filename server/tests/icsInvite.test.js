const { generateJitsiRoomUrl, buildInterviewIcs } = require('../utils/icsInvite');

describe('Jitsi Meet & ICS Invite Generator', () => {
  test('generateJitsiRoomUrl returns valid meet.jit.si room URL', () => {
    const url = generateJitsiRoomUrl('Ava Thompson', 1732550000123);
    expect(url).toMatch(/^https:\/\/meet\.jit\.si\/leddger-ava-thompson-/);
  });

  test('buildInterviewIcs generates valid RFC 5545 VCALENDAR invite', () => {
    const icsText = buildInterviewIcs({
      title: 'Technical Interview: Ava Thompson',
      description: 'Join room: https://meet.jit.si/leddger-ava',
      location: 'https://meet.jit.si/leddger-ava',
      startDate: '2026-12-01T15:00:00Z',
      durationMinutes: 45,
      organizerEmail: 'hr@ledgerai.co',
      attendeeEmail: 'ava@example.com',
      attendeeName: 'Ava Thompson',
    });

    expect(icsText).toContain('BEGIN:VCALENDAR');
    expect(icsText).toContain('BEGIN:VEVENT');
    expect(icsText).toContain('SUMMARY:Technical Interview: Ava Thompson');
    expect(icsText).toContain('ava@example.com');
    expect(icsText).toContain('END:VCALENDAR');
  });
});
