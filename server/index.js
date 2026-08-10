require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const verifyToken = require('./middleware/auth');
const supabase = require('./supabaseClient');
const Spreadsheet = require('./models/Spreadsheet');
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
// API ENDPOINTS
// ==========================================

// Helper: Ensure user profile exists in Supabase
const getOrCreateUser = async (userId, email) => {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (existing) return existing;
  
  const { data: created, error } = await supabase
    .from('profiles')
    .insert({ id: userId, email: email || null, departments: [] })
    .select('*')
    .single();
  
  if (error) console.error('Error creating profile:', error);
  return created;
};

/**
 * GET /api/user/departments
 * Fetch saved departments for the logged-in user
 */
app.get('/api/user/departments', verifyToken, async (req, res) => {
  try {
    const user = await getOrCreateUser(req.user.uid, req.user.email);
    res.json({ departments: user?.departments || [] });
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

    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert({ 
        id: req.user.uid, 
        email: req.user.email,
        departments, 
        updated_at: new Date().toISOString() 
      })
      .select('*')
      .single();

    if (upsertError) throw upsertError;

    res.json({ message: 'Departments saved successfully', departments: profile.departments });
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
    const { title, config, templateType } = req.body;
    
    const draftId = uuidv4();

    const { data: newDraft, error: draftError } = await supabase
      .from('form_drafts')
      .insert({
        draft_id: draftId,
        user_id: req.user.uid,
        title,
        config,
        template_type: templateType || 'unknown',
        status: 'draft',
        expires_at: null
      })
      .select('*')
      .single();

    if (draftError) throw draftError;

    res.json({ message: 'Draft created', draftId: newDraft.draft_id });
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
    const { data: drafts, error: draftsError } = await supabase
      .from('form_drafts')
      .select('*')
      .eq('user_id', req.user.uid)
      .order('created_at', { ascending: false });
    
    if (draftsError) throw draftsError;
    
    const mapped = (drafts || []).map(d => ({
      draftId: d.draft_id,
      title: d.title,
      config: d.config,
      templateType: d.template_type,
      status: d.status,
      expiresAt: d.expires_at,
      createdAt: d.created_at
    }));
    res.json({ drafts: mapped });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

/**
 * DELETE /api/drafts/:draftId
 * Delete a draft
 */
app.delete('/api/drafts/:draftId', verifyToken, async (req, res) => {
  try {
    const { error: deleteError, count } = await supabase
      .from('form_drafts')
      .delete({ count: 'exact' })
      .eq('draft_id', req.params.draftId)
      .eq('user_id', req.user.uid);
    
    if (deleteError) throw deleteError;
    
    if (count === 0) {
      return res.status(404).json({ error: 'Draft not found or unauthorized' });
    }

    res.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
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

    const { data: draft, error: findError } = await supabase
      .from('form_drafts')
      .select('*')
      .eq('draft_id', req.params.draftId)
      .eq('user_id', req.user.uid)
      .single();
    
    if (findError || !draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('form_drafts')
      .update({ 
        expires_at: new Date(expiresAt).toISOString(), 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('draft_id', req.params.draftId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.json({ 
      message: 'Draft activated', 
      draft: {
        draftId: updated.draft_id,
        title: updated.title,
        status: updated.status,
        expiresAt: updated.expires_at
      }
    });
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
    const { data: draft, error: findError } = await supabase
      .from('form_drafts')
      .select('*')
      .eq('draft_id', req.params.draftId)
      .single();
    
    if (findError || !draft) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (draft.status === 'draft' || !draft.expires_at) {
      return res.status(403).json({ error: 'This form link is not yet active.' });
    }

    if (new Date() > new Date(draft.expires_at) || draft.status === 'expired') {
      if (draft.status !== 'expired') {
        await supabase
          .from('form_drafts')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('draft_id', req.params.draftId);
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
    const { data: draft, error: findError } = await supabase
      .from('form_drafts')
      .select('*')
      .eq('draft_id', req.params.draftId)
      .single();
    
    if (findError || !draft) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (new Date() > new Date(draft.expires_at) || draft.status === 'expired') {
      return res.status(410).json({ error: 'This form link has expired.' });
    }

    const submissionId = uuidv4();
    const { submittedData } = req.body;

    const { error: submitError } = await supabase
      .from('form_submissions')
      .insert({
        submission_id: submissionId,
        draft_id: draft.draft_id,
        title: draft.title,
        submitted_data: submittedData
      });

    if (submitError) throw submitError;

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
    res.status(200).json({ status: 'error', error: 'Failed to fetch calendar events from Google API' });
  }
});

// ==========================================
// SPREADSHEET ENDPOINTS (MongoDB)
// ==========================================

const SPREADSHEET_LIMIT = 20;

/**
 * GET /api/spreadsheets
 * List all spreadsheets for the logged-in user
 */
app.get('/api/spreadsheets', verifyToken, async (req, res) => {
  try {
    const spreadsheets = await Spreadsheet.find({ ownerUid: req.user.uid })
      .select('-sheets')
      .sort({ updatedAt: -1 });
    res.json({ spreadsheets });
  } catch (error) {
    console.error('Error fetching spreadsheets:', error);
    res.status(500).json({ error: 'Failed to fetch spreadsheets' });
  }
});

/**
 * GET /api/spreadsheets/:id
 * Load a specific spreadsheet with full sheet data
 */
app.get('/api/spreadsheets/:id', verifyToken, async (req, res) => {
  try {
    const doc = await Spreadsheet.findOne({ _id: req.params.id, ownerUid: req.user.uid });
    if (!doc) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }
    res.json({ spreadsheet: doc });
  } catch (error) {
    console.error('Error loading spreadsheet:', error);
    res.status(500).json({ error: 'Failed to load spreadsheet' });
  }
});

/**
 * POST /api/spreadsheets
 * Save a new spreadsheet (enforces 20-file limit)
 */
app.post('/api/spreadsheets', verifyToken, async (req, res) => {
  try {
    const { name, sheets } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Spreadsheet name is required' });
    }

    const count = await Spreadsheet.countDocuments({ ownerUid: req.user.uid });
    if (count >= SPREADSHEET_LIMIT) {
      return res.status(409).json({
        error: 'Spreadsheet limit reached',
        limit: SPREADSHEET_LIMIT,
        message: `You have reached the maximum of ${SPREADSHEET_LIMIT} saved spreadsheets. Please export and delete existing ones before saving new files.`,
      });
    }

    const existing = await Spreadsheet.findOne({ ownerUid: req.user.uid, name });
    if (existing) {
      existing.sheets = sheets;
      existing.updatedAt = new Date();
      await existing.save();
      return res.json({ message: 'Spreadsheet updated', spreadsheet: existing });
    }

    const newDoc = await Spreadsheet.create({
      ownerUid: req.user.uid,
      name,
      sheets,
    });

    res.json({ message: 'Spreadsheet saved', spreadsheet: newDoc });
  } catch (error) {
    console.error('Error saving spreadsheet:', error);
    res.status(500).json({ error: 'Failed to save spreadsheet' });
  }
});

/**
 * PUT /api/spreadsheets/:id
 * Update an existing spreadsheet
 */
app.put('/api/spreadsheets/:id', verifyToken, async (req, res) => {
  try {
    const { name, sheets } = req.body;

    const doc = await Spreadsheet.findOne({ _id: req.params.id, ownerUid: req.user.uid });
    if (!doc) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }

    if (name) doc.name = name;
    if (sheets) doc.sheets = sheets;
    doc.updatedAt = new Date();
    await doc.save();

    res.json({ message: 'Spreadsheet updated', spreadsheet: doc });
  } catch (error) {
    console.error('Error updating spreadsheet:', error);
    res.status(500).json({ error: 'Failed to update spreadsheet' });
  }
});

/**
 * DELETE /api/spreadsheets/:id
 * Delete a spreadsheet from MongoDB
 */
app.delete('/api/spreadsheets/:id', verifyToken, async (req, res) => {
  try {
    const result = await Spreadsheet.deleteOne({ _id: req.params.id, ownerUid: req.user.uid });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Spreadsheet not found or unauthorized' });
    }
    res.json({ message: 'Spreadsheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting spreadsheet:', error);
    res.status(500).json({ error: 'Failed to delete spreadsheet' });
  }
});

/**
 * GET /api/spreadsheets/count
 * Get count of saved spreadsheets for the user
 */
app.get('/api/spreadsheets/count', verifyToken, async (req, res) => {
  try {
    const count = await Spreadsheet.countDocuments({ ownerUid: req.user.uid });
    res.json({ count, limit: SPREADSHEET_LIMIT });
  } catch (error) {
    console.error('Error counting spreadsheets:', error);
    res.status(500).json({ error: 'Failed to count spreadsheets' });
  }
});

// ==========================================
// MEETINGS ENDPOINTS (Supabase)
// ==========================================

app.get('/api/meetings', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', req.user.uid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ meetings: data || [] });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

app.post('/api/meetings', verifyToken, async (req, res) => {
  try {
    const { title, startTime, endTime, durationMinutes, attendees, aiProject, aiConfidence, requiresHumanReview } = req.body;
    const { data, error } = await supabase
      .from('meetings')
      .insert({
        user_id: req.user.uid,
        title,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        attendees: attendees || [],
        ai_project: aiProject,
        ai_confidence: aiConfidence,
        requires_human_review: requiresHumanReview || false,
      })
      .select('*')
      .single();
    if (error) throw error;
    res.json({ meeting: data });
  } catch (error) {
    console.error('Error saving meeting:', error);
    res.status(500).json({ error: 'Failed to save meeting' });
  }
});

app.delete('/api/meetings/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.uid);
    if (error) throw error;
    res.json({ message: 'Meeting deleted' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// ==========================================
// ALERTS ENDPOINTS (Supabase)
// ==========================================

app.get('/api/alerts', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', req.user.uid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ alerts: data || [] });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.post('/api/alerts', verifyToken, async (req, res) => {
  try {
    const { type, title, description } = req.body;
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: req.user.uid,
        type: type || 'info',
        title,
        description,
        resolved: false,
      })
      .select('*')
      .single();
    if (error) throw error;
    res.json({ alert: data });
  } catch (error) {
    console.error('Error saving alert:', error);
    res.status(500).json({ error: 'Failed to save alert' });
  }
});

app.put('/api/alerts/:id/resolve', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({ resolved: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.uid)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ alert: data });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

app.delete('/api/alerts/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.uid);
    if (error) throw error;
    res.json({ message: 'Alert deleted' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} (bound to 0.0.0.0)`);
});

