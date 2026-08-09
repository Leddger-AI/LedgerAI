require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const verifyToken = require('./middleware/auth');
const User = require('./models/User');
const FormDraft = require('./models/FormDraft');
const FormSubmission = require('./models/FormSubmission');
const { sendFormSubmissionEmail } = require('./utils/emailService');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB via Mongoose'))
.catch(err => console.error('❌ Failed to connect to MongoDB', err));

// ==========================================
// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * POST /api/meet/instant
 * Generates an instant Google Meet link.
 */
app.post('/api/meet/instant', async (req, res) => {
  try {
    // In a full implementation, you would use googleapis and the Calendar API here.
    // Example: google.calendar('v3').events.insert({ conferenceDataVersion: 1, ... })
    // For this implementation, we simulate a successful Google Meet generation:
    const randomId = Math.random().toString(36).substring(2, 11).match(/.{1,3}/g).join('-');
    res.json({ hangoutLink: `https://meet.google.com/${randomId}` });
  } catch (error) {
    console.error('Error generating instant meet:', error);
    res.status(500).json({ error: 'Failed to generate meeting link' });
  }
});

/**
 * POST /api/meet/schedule
 * Schedules a Google Meet event.
 */
app.post('/api/meet/schedule', async (req, res) => {
  try {
    const { title, teamId, startTime, endTime } = req.body;
    // Simulate scheduling a Google Calendar Event and returning the generated Meet link
    const randomId = Math.random().toString(36).substring(2, 11).match(/.{1,3}/g).join('-');
    res.json({
      message: 'Meeting scheduled successfully',
      hangoutLink: `https://meet.google.com/${randomId}`,
      eventDetails: { title, teamId, startTime, endTime }
    });
  } catch (error) {
    console.error('Error scheduling meet:', error);
    res.status(500).json({ error: 'Failed to schedule meeting' });
  }
});

// Helper: Ensure user exists in DB
const getOrCreateUser = async (firebaseUid) => {
  let user = await User.findOne({ firebaseUid });
  if (!user) {
    user = await User.create({ firebaseUid, departments: [] });
  }
  return user;
};

/**
 * GET /api/user/departments
 * Fetch saved departments for the logged-in user
 */
app.get('/api/user/departments', verifyToken, async (req, res) => {
  try {
    const user = await getOrCreateUser(req.user.uid);
    res.json({ departments: user.departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

/**
 * POST /api/user/departments
 * Save or update the list of departments for the logged-in user
 */
app.post('/api/user/departments', verifyToken, async (req, res) => {
  try {
    const { departments } = req.body;
    
    if (!Array.isArray(departments)) {
      return res.status(400).json({ error: 'Departments must be an array of strings.' });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { departments, updatedAt: Date.now() },
      { new: true, upsert: true }
    );

    res.json({ message: 'Departments saved successfully', departments: user.departments });
  } catch (error) {
    console.error('Error saving departments:', error);
    res.status(500).json({ error: 'Failed to save departments' });
  }
});

/**
 * POST /api/drafts
 * Create a new form draft (requires auth)
 */
app.post('/api/drafts', verifyToken, async (req, res) => {
  try {
    const { title, config } = req.body;
    
    const draftId = uuidv4();

    const newDraft = await FormDraft.create({
      draftId,
      recruiterId: req.user.uid,
      title,
      config,
      status: 'draft',
      expiresAt: null
    });

    res.json({ message: 'Draft created', draftId: newDraft.draftId });
  } catch (error) {
    console.error('Error creating draft:', error);
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

/**
 * GET /api/drafts
 * Fetch all form drafts for the logged in recruiter
 */
app.get('/api/drafts', verifyToken, async (req, res) => {
  try {
    const drafts = await FormDraft.find({ recruiterId: req.user.uid }).sort({ createdAt: -1 });
    res.json({ drafts });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

/**
 * PUT /api/drafts/:draftId/activate
 * Activate a form draft by setting its expiration date
 */
app.put('/api/drafts/:draftId/activate', verifyToken, async (req, res) => {
  try {
    const { expiresAt } = req.body;
    
    if (!expiresAt) {
      return res.status(400).json({ error: 'expiresAt is required' });
    }

    const draft = await FormDraft.findOne({ draftId: req.params.draftId, recruiterId: req.user.uid });
    
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    draft.expiresAt = new Date(expiresAt);
    draft.status = 'active';
    await draft.save();

    res.json({ message: 'Draft activated', draft });
  } catch (error) {
    console.error('Error activating draft:', error);
    res.status(500).json({ error: 'Failed to activate draft' });
  }
});

/**
 * GET /api/forms/:draftId
 * Fetch public form config (no auth required)
 */
app.get('/api/forms/:draftId', async (req, res) => {
  try {
    const draft = await FormDraft.findOne({ draftId: req.params.draftId });
    
    if (!draft) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (draft.status === 'draft' || !draft.expiresAt) {
      return res.status(403).json({ error: 'This form link is not yet active.' });
    }

    if (new Date() > draft.expiresAt || draft.status === 'expired') {
      // Mark as expired in DB if not already
      if (draft.status !== 'expired') {
        draft.status = 'expired';
        await draft.save();
      }
      return res.status(410).json({ error: 'This form link has expired.' });
    }

    res.json({ title: draft.title, config: draft.config });
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

/**
 * POST /api/forms/:draftId/submit
 * Submit a public form (no auth required)
 */
app.post('/api/forms/:draftId/submit', async (req, res) => {
  try {
    const draft = await FormDraft.findOne({ draftId: req.params.draftId });
    
    if (!draft) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (new Date() > draft.expiresAt || draft.status === 'expired') {
      return res.status(410).json({ error: 'This form link has expired.' });
    }

    const submissionId = uuidv4();
    const { submittedData } = req.body;

    await FormSubmission.create({
      submissionId,
      draftId: draft.draftId,
      title: draft.title,
      submittedData
    });

    // Fire and forget email (don't await so user gets fast response)
    sendFormSubmissionEmail(draft.title, submittedData, null);

    res.json({ message: 'Form submitted successfully!' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

const { google } = require('googleapis');

/**
 * GET /api/calendar/events
 * Fetch Google Calendar events using the provided Google access token
 */
app.get('/api/calendar/events', verifyToken, async (req, res) => {
  try {
    const googleToken = req.query.google_token;
    if (!googleToken) {
      return res.status(400).json({ error: 'Missing google_token query parameter.' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: googleToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Calculate time bounds: start of yesterday to end of 7 days from now
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 1);
    timeMin.setHours(0, 0, 0, 0);

    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 7);
    timeMax.setHours(23, 59, 59, 999);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items.map(evt => {
      const start = new Date(evt.start.dateTime || evt.start.date);
      const end = new Date(evt.end.dateTime || evt.end.date);
      const durationMinutes = Math.round((end - start) / 60000);
      
      return {
        eventId: evt.id,
        title: evt.summary || 'Untitled Event',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes: durationMinutes > 0 ? durationMinutes : 60, // Default to 60 if invalid
        attendees: evt.attendees || [],
        aiProject: null, // Let frontend assign mock projects/confidence if needed, or implement actual AI here
        aiConfidence: null,
        requiresHumanReview: Math.random() > 0.7 // Mock review requirement
      };
    });

    res.json({ status: 'success', events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events from Google API' });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} (bound to 0.0.0.0)`);
});
