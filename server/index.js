require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const verifyToken = require('./middleware/auth');
const supabase = require('./supabaseClient');
const Spreadsheet = require('./models/Spreadsheet');
const EmailDraft = require('./models/EmailDraft');
const EmailConfig = require('./models/EmailConfig');
const EmailCampaign = require('./models/EmailCampaign');
const { sendFormSubmissionEmail } = require('./utils/emailService');
const { scheduleCampaign, cancelScheduledCampaign, stopAgenda, scheduleDraftActivation, cancelDraftActivation } = require('./scheduler');
const { v4: uuidv4 } = require('uuid');
const { runStartupChecks } = require('./startupCheck');

const app = express();
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : null;
app.use(cors({
  origin: (origin, callback) => {
    if (!allowedOrigins || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

const mongoConnectPromise = mongoose.connect(MONGODB_URI)
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
        config: updated.config,
        templateType: updated.template_type,
        status: updated.status,
        expiresAt: updated.expires_at,
        createdAt: updated.created_at
      }
    });
  } catch (error) {
    console.error('Error activating draft:', error);
    res.status(500).json({ error: 'Failed to activate draft' });
  }
});

/**
 * GET /api/drafts/scheduled
 * Fetch all scheduled form drafts for the current user
 */
app.get('/api/drafts/scheduled', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('form_drafts')
      .select('*')
      .eq('user_id', req.user.uid)
      .eq('status', 'scheduled')
      .order('goes_live_at', { ascending: true });

    if (error) throw error;

    const drafts = (data || []).map(d => ({
      draftId: d.draft_id,
      title: d.title,
      config: d.config,
      templateType: d.template_type,
      status: d.status,
      goesLiveAt: d.goes_live_at,
      expiresAt: d.expires_at,
      createdAt: d.created_at
    }));

    res.json({ drafts });
  } catch (error) {
    console.error('Error fetching scheduled drafts:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled drafts' });
  }
});

/**
 * PUT /api/drafts/:draftId/schedule
 * Schedule a draft to go live at a future date/time
 */
app.put('/api/drafts/:draftId/schedule', verifyToken, async (req, res) => {
  try {
    const { goesLiveAt, expiresAt } = req.body;
    if (!goesLiveAt) return res.status(400).json({ error: 'goesLiveAt is required' });
    if (!expiresAt) return res.status(400).json({ error: 'expiresAt is required' });

    const liveDate = new Date(goesLiveAt);
    const expiryDate = new Date(expiresAt);

    if (isNaN(liveDate.getTime())) return res.status(400).json({ error: 'Invalid goesLiveAt' });
    if (isNaN(expiryDate.getTime())) return res.status(400).json({ error: 'Invalid expiresAt' });
    if (liveDate <= new Date()) return res.status(400).json({ error: 'goesLiveAt must be in the future' });
    if (expiryDate <= liveDate) return res.status(400).json({ error: 'expiresAt must be after goesLiveAt' });

    const { data: draft, error: findError } = await supabase
      .from('form_drafts')
      .select('*')
      .eq('draft_id', req.params.draftId)
      .eq('user_id', req.user.uid)
      .single();

    if (findError || !draft) return res.status(404).json({ error: 'Draft not found' });

    const { data: updated, error: updateError } = await supabase
      .from('form_drafts')
      .update({
        status: 'scheduled',
        goes_live_at: liveDate.toISOString(),
        expires_at: expiryDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('draft_id', req.params.draftId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // Schedule Agenda job to activate at goesLiveAt
    await scheduleDraftActivation(req.params.draftId, liveDate);

    res.json({
      message: 'Draft scheduled',
      draft: {
        draftId: updated.draft_id,
        title: updated.title,
        config: updated.config,
        templateType: updated.template_type,
        status: updated.status,
        goesLiveAt: updated.goes_live_at,
        expiresAt: updated.expires_at,
        createdAt: updated.created_at
      }
    });
  } catch (error) {
    console.error('Error scheduling draft:', error);
    res.status(500).json({ error: 'Failed to schedule draft: ' + error.message });
  }
});

/**
 * DELETE /api/drafts/:draftId/schedule
 * Cancel a scheduled draft activation
 */
app.delete('/api/drafts/:draftId/schedule', verifyToken, async (req, res) => {
  try {
    const { data: draft, error: findError } = await supabase
      .from('form_drafts')
      .select('*')
      .eq('draft_id', req.params.draftId)
      .eq('user_id', req.user.uid)
      .single();

    if (findError || !draft) return res.status(404).json({ error: 'Draft not found' });
    if (draft.status !== 'scheduled') return res.status(400).json({ error: 'Draft is not scheduled' });

    // Cancel Agenda job
    await cancelDraftActivation(req.params.draftId);

    const { data: updated, error: updateError } = await supabase
      .from('form_drafts')
      .update({
        status: 'draft',
        goes_live_at: null,
        expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('draft_id', req.params.draftId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.json({
      message: 'Schedule cancelled',
      draft: {
        draftId: updated.draft_id,
        title: updated.title,
        config: updated.config,
        templateType: updated.template_type,
        status: updated.status,
        expiresAt: updated.expires_at,
        createdAt: updated.created_at
      }
    });
  } catch (error) {
    console.error('Error cancelling draft schedule:', error);
    res.status(500).json({ error: 'Failed to cancel schedule' });
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

    // Scheduled but not yet time to go live
    if (draft.status === 'scheduled' && draft.goes_live_at && new Date() < new Date(draft.goes_live_at)) {
      return res.status(403).json({ error: `This form link goes live at ${new Date(draft.goes_live_at).toLocaleString()}.` });
    }

    // Fallback: scheduled and time has arrived but Agenda hasn't fired yet — auto-activate
    if (draft.status === 'scheduled' && draft.goes_live_at && new Date() >= new Date(draft.goes_live_at)) {
      await supabase
        .from('form_drafts')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('draft_id', req.params.draftId);
      draft.status = 'active';
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
        user_id: draft.user_id,
        title: draft.title,
        submitted_data: submittedData
      });

    if (submitError) throw submitError;

    // Fire and forget email (don't await so user gets fast response)
    const ownerConfig = await EmailConfig.findOne({ ownerUid: draft.user_id }).catch(() => null);
    sendFormSubmissionEmail(draft.title, submittedData, ownerConfig?.email || null, ownerConfig);

    res.json({ message: 'Form submitted successfully!' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

/**
 * GET /api/submissions
 * Fetch all form submissions for the logged-in user
 */
app.get('/api/submissions', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('user_id', req.user.uid)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map(s => ({
      submissionId: s.submission_id,
      draftId: s.draft_id,
      title: s.title,
      submittedData: s.submitted_data,
      submittedAt: s.submitted_at
    }));

    res.json({ submissions: mapped });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/submissions/:draftId
 * Fetch all submissions for a specific draft
 */
app.get('/api/submissions/:draftId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('draft_id', req.params.draftId)
      .eq('user_id', req.user.uid)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map(s => ({
      submissionId: s.submission_id,
      draftId: s.draft_id,
      title: s.title,
      submittedData: s.submitted_data,
      submittedAt: s.submitted_at
    }));

    res.json({ submissions: mapped });
  } catch (error) {
    console.error('Error fetching submissions for draft:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
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
 * GET /api/spreadsheets/count
 * Get count of saved spreadsheets for the user
 * NOTE: Must be defined before /api/spreadsheets/:id to avoid route shadowing
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

/**
 * GET /api/spreadsheets/metadata
 * List all spreadsheets with computed metadata (rows, columns, sheet count, size)
 * Does NOT return the full sheets data blob
 * NOTE: Must be defined before /api/spreadsheets/:id to avoid route shadowing
 */
app.get('/api/spreadsheets/metadata', verifyToken, async (req, res) => {
  try {
    const docs = await Spreadsheet.find({ ownerUid: req.user.uid })
      .select('name sheets createdAt updatedAt')
      .sort({ updatedAt: -1 });

    const metadata = docs.map((doc) => {
      const sheets = doc.sheets || [];
      let maxRows = 0;
      let maxCols = 0;

      for (const sheet of sheets) {
        let rows = 0;
        let cols = 0;

        if (sheet.data && Array.isArray(sheet.data)) {
          rows = sheet.data.length;
          cols = sheet.data[0] ? sheet.data[0].length : 0;
        } else if (sheet.celldata && Array.isArray(sheet.celldata)) {
          rows = Math.max(...sheet.celldata.map((cd) => cd.r)) + 1;
          cols = Math.max(...sheet.celldata.map((cd) => cd.c)) + 1;
        }

        if (sheet.row && sheet.row > rows) rows = sheet.row;
        if (sheet.column && sheet.column > cols) cols = sheet.column;

        if (rows > maxRows) maxRows = rows;
        if (cols > maxCols) maxCols = cols;
      }

      const sizeBytes = JSON.stringify(sheets).length;

      return {
        _id: doc._id,
        name: doc.name,
        sheetCount: sheets.length,
        maxRows,
        maxCols,
        sizeBytes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    res.json({ spreadsheets: metadata, count: metadata.length, limit: SPREADSHEET_LIMIT });
  } catch (error) {
    console.error('Error fetching spreadsheet metadata:', error);
    res.status(500).json({ error: 'Failed to fetch spreadsheet metadata' });
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
 * GET /api/spreadsheets/:id/headers
 * Extract first-row column headers from a saved spreadsheet
 * Used by Email Body Editor to import variables from Roster Studio files
 */
app.get('/api/spreadsheets/:id/headers', verifyToken, async (req, res) => {
  try {
    const doc = await Spreadsheet.findOne({ _id: req.params.id, ownerUid: req.user.uid });
    if (!doc) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }

    const sheets = doc.sheets || [];
    if (sheets.length === 0) {
      return res.json({ headers: [] });
    }

    const firstSheet = sheets[0];
    const headers = [];

    // Try dense data matrix first: sheet.data[row][col]
    if (firstSheet.data && Array.isArray(firstSheet.data)) {
      const firstRow = firstSheet.data[0];
      if (firstRow) {
        for (const cell of firstRow) {
          if (cell) {
            const val = cell.m ?? cell.v ?? '';
            if (String(val).trim()) headers.push(String(val).trim());
          }
        }
      }
    }

    // Fallback to sparse celldata: find all cells with r === 0
    if (headers.length === 0 && firstSheet.celldata && Array.isArray(firstSheet.celldata)) {
      const firstRowCells = firstSheet.celldata
        .filter((cd) => cd.r === 0)
        .sort((a, b) => a.c - b.c);
      for (const cd of firstRowCells) {
        const val = cd.v?.m ?? cd.v?.v ?? '';
        if (String(val).trim()) headers.push(String(val).trim());
      }
    }

    res.json({ headers });
  } catch (error) {
    console.error('Error fetching spreadsheet headers:', error);
    res.status(500).json({ error: 'Failed to fetch spreadsheet headers' });
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

// ==========================================
// EMAIL AUTOMATION ENDPOINTS
// ==========================================

// --- Email Drafts CRUD ---

app.post('/api/email/drafts', verifyToken, async (req, res) => {
  try {
    const { subject, bodyHtml, variables, dataSourceType, dataSourceFile, dataSourceSheetId } = req.body;

    if (bodyHtml === undefined) {
      return res.status(400).json({ error: 'bodyHtml is required' });
    }

    const draft = await EmailDraft.create({
      ownerUid: req.user.uid,
      subject: subject || '',
      bodyHtml,
      variables: variables || [],
      dataSourceType: dataSourceType || 'none',
      dataSourceFile: dataSourceFile || null,
      dataSourceSheetId: dataSourceSheetId || null,
    });

    res.json({ message: 'Draft saved', draft });
  } catch (error) {
    console.error('Error saving email draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

app.get('/api/email/drafts', verifyToken, async (req, res) => {
  try {
    const drafts = await EmailDraft.find({ ownerUid: req.user.uid })
      .select('-bodyHtml')
      .sort({ updatedAt: -1 });
    res.json({ drafts });
  } catch (error) {
    console.error('Error fetching email drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

app.get('/api/email/drafts/:id', verifyToken, async (req, res) => {
  try {
    const draft = await EmailDraft.findOne({ _id: req.params.id, ownerUid: req.user.uid });
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    res.json({ draft });
  } catch (error) {
    console.error('Error fetching email draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

app.put('/api/email/drafts/:id', verifyToken, async (req, res) => {
  try {
    const { subject, bodyHtml, variables, dataSourceType, dataSourceFile, dataSourceSheetId } = req.body;
    const draft = await EmailDraft.findOne({ _id: req.params.id, ownerUid: req.user.uid });
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (subject !== undefined) draft.subject = subject;
    if (bodyHtml !== undefined) draft.bodyHtml = bodyHtml;
    if (variables !== undefined) draft.variables = variables;
    if (dataSourceType !== undefined) draft.dataSourceType = dataSourceType;
    if (dataSourceFile !== undefined) draft.dataSourceFile = dataSourceFile;
    if (dataSourceSheetId !== undefined) draft.dataSourceSheetId = dataSourceSheetId;
    draft.updatedAt = new Date();
    await draft.save();

    res.json({ message: 'Draft updated', draft });
  } catch (error) {
    console.error('Error updating email draft:', error);
    res.status(500).json({ error: 'Failed to update draft' });
  }
});

app.delete('/api/email/drafts/:id', verifyToken, async (req, res) => {
  try {
    const result = await EmailDraft.deleteOne({ _id: req.params.id, ownerUid: req.user.uid });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Draft not found or unauthorized' });
    }
    res.json({ message: 'Draft deleted' });
  } catch (error) {
    console.error('Error deleting email draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// --- Email Config (SMTP / OAuth2) ---

app.get('/api/email/config', verifyToken, async (req, res) => {
  try {
    const config = await EmailConfig.findOne({ ownerUid: req.user.uid });
    if (!config) {
      return res.json({ config: null });
    }
    res.json({
      config: {
        email: config.email,
        authMethod: config.authMethod,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        clientId: config.clientId || '',
        isActive: config.isActive,
        hasAppPassword: !!config.appPassword,
        hasRefreshToken: !!config.refreshToken,
        hasClientSecret: !!config.clientSecret,
      },
    });
  } catch (error) {
    console.error('Error fetching email config:', error);
    res.status(500).json({ error: 'Failed to fetch email config' });
  }
});

app.put('/api/email/config', verifyToken, async (req, res) => {
  try {
    const { email, authMethod, smtpHost, smtpPort, appPassword, refreshToken, clientId, clientSecret } = req.body;

    if (!email || !authMethod) {
      return res.status(400).json({ error: 'email and authMethod are required' });
    }

    const updateData = {
      email,
      authMethod,
      updatedAt: new Date(),
    };

    if (authMethod === 'app_password') {
      if (smtpHost) updateData.smtpHost = smtpHost;
      if (smtpPort) updateData.smtpPort = smtpPort;
      if (appPassword) updateData.appPassword = appPassword;
    } else if (authMethod === 'oauth2') {
      if (refreshToken) updateData.refreshToken = refreshToken;
      if (clientId) updateData.clientId = clientId;
      if (clientSecret) updateData.clientSecret = clientSecret;
    }

    const config = await EmailConfig.findOneAndUpdate(
      { ownerUid: req.user.uid },
      { $set: updateData },
      { upsert: true, new: true }
    );

    res.json({
      message: 'Email config saved',
      config: {
        email: config.email,
        authMethod: config.authMethod,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        clientId: config.clientId || '',
        isActive: config.isActive,
        hasAppPassword: !!config.appPassword,
        hasRefreshToken: !!config.refreshToken,
        hasClientSecret: !!config.clientSecret,
      },
    });
  } catch (error) {
    console.error('Error saving email config:', error);
    res.status(500).json({ error: 'Failed to save email config' });
  }
});

app.delete('/api/email/config', verifyToken, async (req, res) => {
  try {
    await EmailConfig.deleteOne({ ownerUid: req.user.uid });
    res.json({ message: 'Email config deleted' });
  } catch (error) {
    console.error('Error deleting email config:', error);
    res.status(500).json({ error: 'Failed to delete email config' });
  }
});

// --- Email Test Send ---

app.post('/api/email/test', verifyToken, async (req, res) => {
  try {
    const config = await EmailConfig.findOne({ ownerUid: req.user.uid });
    if (!config) {
      return res.status(400).json({ error: 'No email config found. Please configure your email settings first.' });
    }

    const nodemailer = require('nodemailer');
    let transporter;

    if (config.authMethod === 'oauth2') {
      const { google } = require('googleapis');
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        config.clientId,
        config.clientSecret,
        'https://developers.google.com/oauthplayground'
      );
      oauth2Client.setCredentials({ refresh_token: config.refreshToken });

      const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
          if (err) reject(err);
          resolve(token);
        });
      });

      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: config.email,
          accessToken,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: config.refreshToken,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.email,
          pass: config.appPassword,
        },
      });
    }

    await transporter.sendMail({
      from: config.email,
      to: config.email,
      subject: 'LedgerAI — Test Email',
      html: '<p>This is a test email from LedgerAI Email Automation. Your email configuration is working correctly!</p>',
    });

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email: ' + error.message });
  }
});

// --- Email Send (Campaign) ---

app.post('/api/email/send', verifyToken, async (req, res) => {
  try {
    const { draftId, recipients, campaignName } = req.body;

    if (!draftId) {
      return res.status(400).json({ error: 'draftId is required' });
    }
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients array is required' });
    }

    const draft = await EmailDraft.findOne({ _id: draftId, ownerUid: req.user.uid });
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const config = await EmailConfig.findOne({ ownerUid: req.user.uid });
    if (!config) {
      return res.status(400).json({ error: 'No email config found. Please configure your email settings first.' });
    }

    // Create campaign
    const campaign = await EmailCampaign.create({
      ownerUid: req.user.uid,
      name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
      draftId,
      status: 'sending',
      recipients: recipients.map(r => ({
        email: r.email,
        name: r.name || '',
        variables: r.variables || {},
        status: 'pending',
      })),
    });

    // Build transporter
    const nodemailer = require('nodemailer');
    let transporter;

    if (config.authMethod === 'oauth2') {
      const { google } = require('googleapis');
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        config.clientId,
        config.clientSecret,
        'https://developers.google.com/oauthplayground'
      );
      oauth2Client.setCredentials({ refresh_token: config.refreshToken });

      const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
          if (err) reject(err);
          resolve(token);
        });
      });

      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: config.email,
          accessToken,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: config.refreshToken,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.email,
          pass: config.appPassword,
        },
      });
    }

    // Send emails
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of campaign.recipients) {
      try {
        // Substitute variables in subject and body
        let subject = draft.subject || '';
        let bodyHtml = draft.bodyHtml || '';

        for (const [key, value] of Object.entries(recipient.variables)) {
          const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          subject = subject.replace(placeholder, value || '');
          bodyHtml = bodyHtml.replace(placeholder, value || '');
        }

        await transporter.sendMail({
          from: config.email,
          to: recipient.email,
          subject,
          html: bodyHtml,
        });

        recipient.status = 'sent';
        recipient.sentAt = new Date();
        sentCount++;
      } catch (err) {
        recipient.status = 'failed';
        recipient.error = err.message;
        failedCount++;
      }
    }

    campaign.sentCount = sentCount;
    campaign.failedCount = failedCount;
    campaign.status = sentCount > 0 ? 'sent' : 'failed';
    campaign.sentAt = new Date();
    await campaign.save();

    // Insert into Supabase email_send_log
    await supabase.from('email_send_log').insert({
      user_id: req.user.uid,
      campaign_id: campaign._id.toString(),
      draft_id: draftId,
      draft_title: draft.subject || 'Untitled',
      sender_email: config.email,
      recipient_count: recipients.length,
      sent_count: sentCount,
      failed_count: failedCount,
      status: campaign.status,
      sent_at: new Date().toISOString()
    });

    res.json({
      message: `Campaign ${campaign.status}`,
      campaignId: campaign._id,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
    });
  } catch (error) {
    console.error('Error sending email campaign:', error);
    res.status(500).json({ error: 'Failed to send campaign: ' + error.message });
  }
});

// --- Campaigns List ---

app.get('/api/email/send-log', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_send_log')
      .select('*')
      .eq('user_id', req.user.uid)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ sendLog: data || [] });
  } catch (error) {
    console.error('Error fetching email send log:', error);
    res.status(500).json({ error: 'Failed to fetch send log' });
  }
});

app.get('/api/email/send-log/:campaignId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_send_log')
      .select('*')
      .eq('user_id', req.user.uid)
      .eq('campaign_id', req.params.campaignId)
      .single();

    if (error) throw error;
    res.json({ entry: data });
  } catch (error) {
    console.error('Error fetching send log entry:', error);
    res.status(500).json({ error: 'Failed to fetch send log entry' });
  }
});

app.get('/api/email/campaigns', verifyToken, async (req, res) => {
  try {
    const campaigns = await EmailCampaign.find({ ownerUid: req.user.uid })
      .populate('draftId', 'subject dataSourceFile')
      .sort({ createdAt: -1 });
    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.get('/api/email/campaigns/:id', verifyToken, async (req, res) => {
  try {
    const campaign = await EmailCampaign.findOne({ _id: req.params.id, ownerUid: req.user.uid })
      .populate('draftId');
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// --- Scheduled Campaigns ---

app.post('/api/email/schedule', verifyToken, async (req, res) => {
  try {
    const { draftId, recipients, campaignName, scheduledAt } = req.body;

    if (!draftId) return res.status(400).json({ error: 'draftId is required' });
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients array is required' });
    }
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });

    const sendDate = new Date(scheduledAt);
    if (isNaN(sendDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledAt date' });
    }
    if (sendDate <= new Date()) {
      return res.status(400).json({ error: 'scheduledAt must be in the future' });
    }

    const draft = await EmailDraft.findOne({ _id: draftId, ownerUid: req.user.uid });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const config = await EmailConfig.findOne({ ownerUid: req.user.uid });
    if (!config) {
      return res.status(400).json({ error: 'No email config found. Please configure your email settings first.' });
    }

    const campaign = await EmailCampaign.create({
      ownerUid: req.user.uid,
      name: campaignName || `Scheduled Campaign ${sendDate.toLocaleDateString()}`,
      draftId,
      status: 'scheduled',
      scheduledAt: sendDate,
      recipients: recipients.map(r => ({
        email: r.email,
        name: r.name || '',
        variables: r.variables || {},
        status: 'pending',
      })),
    });

    await scheduleCampaign(campaign._id.toString(), sendDate);

    res.json({
      message: 'Campaign scheduled successfully',
      campaignId: campaign._id,
      scheduledAt: sendDate.toISOString(),
    });
  } catch (error) {
    console.error('Error scheduling campaign:', error);
    res.status(500).json({ error: 'Failed to schedule campaign: ' + error.message });
  }
});

app.get('/api/email/scheduled', verifyToken, async (req, res) => {
  try {
    const campaigns = await EmailCampaign.find({
      ownerUid: req.user.uid,
      status: 'scheduled',
    })
      .populate('draftId', 'subject')
      .sort({ scheduledAt: 1 });
    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching scheduled campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled campaigns' });
  }
});

app.delete('/api/email/schedule/:campaignId', verifyToken, async (req, res) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.campaignId,
      ownerUid: req.user.uid,
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'scheduled') {
      return res.status(400).json({ error: 'Campaign is not scheduled' });
    }

    await cancelScheduledCampaign(campaign._id.toString());

    campaign.status = 'cancelled';
    await campaign.save();

    res.json({ message: 'Scheduled campaign cancelled' });
  } catch (error) {
    console.error('Error cancelling scheduled campaign:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled campaign' });
  }
});

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", async () => {
    await mongoConnectPromise;
    await runStartupChecks();
    console.log(`🚀 Server running on port ${PORT} (bound to 0.0.0.0)`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await stopAgenda();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await stopAgenda();
  process.exit(0);
});

module.exports = app;

