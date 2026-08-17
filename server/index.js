require('dotenv').config();

const initBorder = '='.repeat(55);
console.log('\n' + initBorder);
console.log('  MODULE INITIALIZATION');
console.log(initBorder);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const verifyToken = require('./middleware/auth');
const supabase = require('./supabaseClient');
const Spreadsheet = require('./models/Spreadsheet');
const EmailDraft = require('./models/EmailDraft');
const EmailConfig = require('./models/EmailConfig');
const EmailCampaign = require('./models/EmailCampaign');
const EmailAccount = require('./models/EmailAccount');
const TemplateData = require('./models/TemplateData');
const TemplateSubmission = require('./models/TemplateSubmission');
const {
  getOverviewStats,
  getTemplatesWithStats,
  getTemplateDetail,
  getTemplateSubmissions,
  getSubmissionTrends,
  getTemplateTypeDistribution,
} = require('./utils/analyticsUtils');
const { analyzeTemplateGitHub } = require('./utils/githubAnalyzer');
const {
  getAuthUrl,
  exchangeCodeForTokens,
  storeTokens,
  getValidAccessToken,
  revokeTokens,
  getDriveStatus,
} = require('./utils/googleDriveOAuth');
const { uploadCSVToDrive, uploadJSONToDrive } = require('./utils/googleDriveUpload');
const { encrypt } = require('./utils/crypto');
const { buildTransporterFromAccount, resolveEmailAccount } = require('./utils/emailAccount');
const { sendFormSubmissionEmail, buildSubmissionEmailHtml, sendOtpEmail } = require('./utils/emailService');
const { createOtpChallenge, verifyOtpChallenge } = require('./utils/otp');
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
.then(() => console.log('✅ MongoDB connection established via Mongoose'))
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

    // Sync to MongoDB TemplateData (only created templates, not imported)
    await TemplateData.findOneAndUpdate(
      { draftId: newDraft.draft_id },
      {
        ownerUid: req.user.uid,
        title,
        templateType: templateType || 'unknown',
        config,
        status: 'draft',
        source: 'created',
        expiresAt: null,
      },
      { upsert: true, new: true }
    ).catch(err => console.error('MongoDB sync error (TemplateData):', err));

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

    // Sync deletion to MongoDB
    await TemplateData.deleteOne({ draftId: req.params.draftId })
      .catch(err => console.error('MongoDB sync error (delete):', err));
    await TemplateSubmission.deleteMany({ draftId: req.params.draftId })
      .catch(err => console.error('MongoDB sync error (delete submissions):', err));

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

    // Sync status to MongoDB TemplateData
    await TemplateData.findOneAndUpdate(
      { draftId: req.params.draftId },
      { status: 'active', expiresAt: new Date(expiresAt) }
    ).catch(err => console.error('MongoDB sync error (activate):', err));

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

    // Sync to MongoDB TemplateSubmission for analytics
    await TemplateSubmission.create({
      submissionId,
      draftId: draft.draft_id,
      ownerUid: draft.user_id,
      templateType: draft.template_type || 'unknown',
      title: draft.title,
      submittedData,
    }).catch(err => console.error('MongoDB sync error (TemplateSubmission):', err));

    // Fire and forget email (don't await so user gets fast response)
    const ownerAccount = await resolveEmailAccount(EmailAccount, draft.user_id, null).catch(() => null);
    if (ownerAccount) {
      buildTransporterFromAccount(ownerAccount)
        .then(transporter => transporter.sendMail({
          from: ownerAccount.email,
          to: ownerAccount.email,
          subject: `New Form Submission: ${draft.title}`,
          html: buildSubmissionEmailHtml(draft.title, submittedData),
        }))
        .then(() => console.log('✅ Submission email sent!'))
        .catch(err => console.error('❌ Error sending submission email', err));
    } else {
      sendFormSubmissionEmail(draft.title, submittedData);
    }

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

// --- Email Accounts (Multi-Account, Encrypted) ---

async function migrateLegacyEmailConfig(userId) {
  const existing = await EmailAccount.findOne({ ownerUid: userId });
  if (existing) return;
  const legacy = await EmailConfig.findOne({ ownerUid: userId });
  if (!legacy) return;
  await EmailAccount.create({
    ownerUid: userId,
    email: legacy.email,
    label: 'Migrated',
    authMethod: legacy.authMethod,
    smtpHost: legacy.smtpHost,
    smtpPort: legacy.smtpPort,
    appPassword: legacy.appPassword ? encrypt(legacy.appPassword) : null,
    refreshToken: legacy.refreshToken ? encrypt(legacy.refreshToken) : null,
    clientId: legacy.clientId || null,
    clientSecret: legacy.clientSecret ? encrypt(legacy.clientSecret) : null,
    isDefault: true,
    isActive: legacy.isActive,
  });
}

function formatAccountResponse(account) {
  return {
    id: account._id,
    email: account.email,
    label: account.label || '',
    authMethod: account.authMethod,
    smtpHost: account.smtpHost,
    smtpPort: account.smtpPort,
    clientId: account.clientId || '',
    isDefault: account.isDefault,
    isActive: account.isActive,
    hasAppPassword: !!account.appPassword,
    hasRefreshToken: !!account.refreshToken,
    hasClientSecret: !!account.clientSecret,
  };
}

app.get('/api/email/accounts', verifyToken, async (req, res) => {
  try {
    await migrateLegacyEmailConfig(req.user.uid);
    const accounts = await EmailAccount.find({ ownerUid: req.user.uid }).sort({ isDefault: -1, createdAt: 1 });
    res.json({ accounts: accounts.map(formatAccountResponse) });
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    res.status(500).json({ error: 'Failed to fetch email accounts' });
  }
});

app.post('/api/email/accounts', verifyToken, async (req, res) => {
  try {
    const { email, label, authMethod, smtpHost, smtpPort, appPassword, refreshToken, clientId, clientSecret } = req.body;

    if (!email || !authMethod) {
      return res.status(400).json({ error: 'email and authMethod are required' });
    }

    const existing = await EmailAccount.findOne({ ownerUid: req.user.uid, email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const count = await EmailAccount.countDocuments({ ownerUid: req.user.uid });

    const accountData = {
      ownerUid: req.user.uid,
      email,
      label: label || '',
      authMethod,
      smtpHost: smtpHost || 'smtp.gmail.com',
      smtpPort: smtpPort || 587,
      isDefault: count === 0,
    };

    if (authMethod === 'app_password') {
      if (!appPassword) return res.status(400).json({ error: 'appPassword is required for app_password auth' });
      accountData.appPassword = encrypt(appPassword);
    } else if (authMethod === 'oauth2') {
      if (!refreshToken || !clientId || !clientSecret) {
        return res.status(400).json({ error: 'refreshToken, clientId, and clientSecret are required for oauth2 auth' });
      }
      accountData.refreshToken = encrypt(refreshToken);
      accountData.clientId = clientId;
      accountData.clientSecret = encrypt(clientSecret);
    }

    const account = await EmailAccount.create(accountData);
    res.status(201).json({ account: formatAccountResponse(account) });
  } catch (error) {
    console.error('Error creating email account:', error);
    res.status(500).json({ error: 'Failed to create email account' });
  }
});

app.put('/api/email/accounts/:id', verifyToken, async (req, res) => {
  try {
    const { label, smtpHost, smtpPort, appPassword, refreshToken, clientId, clientSecret } = req.body;

    const account = await EmailAccount.findOne({ _id: req.params.id, ownerUid: req.user.uid });
    if (!account) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    if (label !== undefined) account.label = label;
    if (smtpHost) account.smtpHost = smtpHost;
    if (smtpPort) account.smtpPort = smtpPort;
    if (appPassword) account.appPassword = encrypt(appPassword);
    if (refreshToken) account.refreshToken = encrypt(refreshToken);
    if (clientId) account.clientId = clientId;
    if (clientSecret) account.clientSecret = encrypt(clientSecret);
    account.updatedAt = new Date();

    await account.save();
    res.json({ account: formatAccountResponse(account) });
  } catch (error) {
    console.error('Error updating email account:', error);
    res.status(500).json({ error: 'Failed to update email account' });
  }
});

app.delete('/api/email/accounts/:id', verifyToken, async (req, res) => {
  try {
    const account = await EmailAccount.findOneAndDelete({ _id: req.params.id, ownerUid: req.user.uid });
    if (!account) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    if (account.isDefault) {
      const next = await EmailAccount.findOne({ ownerUid: req.user.uid }).sort({ createdAt: 1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    res.json({ message: 'Email account deleted' });
  } catch (error) {
    console.error('Error deleting email account:', error);
    res.status(500).json({ error: 'Failed to delete email account' });
  }
});

app.put('/api/email/accounts/:id/default', verifyToken, async (req, res) => {
  try {
    await EmailAccount.updateMany({ ownerUid: req.user.uid }, { isDefault: false });
    const account = await EmailAccount.findOneAndUpdate(
      { _id: req.params.id, ownerUid: req.user.uid },
      { isDefault: true, updatedAt: new Date() },
      { new: true }
    );
    if (!account) {
      return res.status(404).json({ error: 'Email account not found' });
    }
    res.json({ account: formatAccountResponse(account) });
  } catch (error) {
    console.error('Error setting default email account:', error);
    res.status(500).json({ error: 'Failed to set default account' });
  }
});

app.post('/api/email/accounts/:id/test', verifyToken, async (req, res) => {
  try {
    const account = await EmailAccount.findOne({ _id: req.params.id, ownerUid: req.user.uid });
    if (!account) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    const transporter = await buildTransporterFromAccount(account);
    await transporter.sendMail({
      from: account.email,
      to: account.email,
      subject: 'LedgerAI — Test Email',
      html: '<p>This is a test email from LedgerAI. Your email account configuration is working correctly!</p>',
    });

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email: ' + error.message });
  }
});

// --- Email Test Send (legacy, uses default account) ---

app.post('/api/email/test', verifyToken, async (req, res) => {
  try {
    await migrateLegacyEmailConfig(req.user.uid);
    const { accountId } = req.body || {};
    const account = await resolveEmailAccount(EmailAccount, req.user.uid, accountId);
    if (!account) {
      return res.status(400).json({ error: 'No email account configured. Please add an email account first.' });
    }

    const transporter = await buildTransporterFromAccount(account);
    await transporter.sendMail({
      from: account.email,
      to: account.email,
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
    const { draftId, recipients, campaignName, accountId } = req.body;

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

    await migrateLegacyEmailConfig(req.user.uid);
    const account = await resolveEmailAccount(EmailAccount, req.user.uid, accountId);
    if (!account) {
      return res.status(400).json({ error: 'No email account configured. Please add an email account first.' });
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

    // Build transporter from selected account
    const transporter = await buildTransporterFromAccount(account);

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
          from: account.email,
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
      sender_email: account.email,
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
    const { draftId, recipients, campaignName, scheduledAt, accountId } = req.body;

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

    await migrateLegacyEmailConfig(req.user.uid);
    const account = await resolveEmailAccount(EmailAccount, req.user.uid, accountId);
    if (!account) {
      return res.status(400).json({ error: 'No email account configured. Please add an email account first.' });
    }

    const campaign = await EmailCampaign.create({
      ownerUid: req.user.uid,
      name: campaignName || `Scheduled Campaign ${sendDate.toLocaleDateString()}`,
      draftId,
      accountId: account._id,
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

// ==========================================
// CLOUDINARY + IMAGE PROCESSING ENDPOINTS
// ==========================================

let _upload = null;
function getUpload() {
  if (!_upload) {
    const multer = require('multer');
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    _upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'), false);
        }
      },
    });
  }
  return _upload;
}

function getCloudinary() {
  try {
    return require('cloudinary').v2;
  } catch (_) {
    return null;
  }
}

function configureCloudinary() {
  const cloudinary = getCloudinary();
  if (!cloudinary) return null;

  const cloudName = process.env.CLOUDINARY_CLOUDNAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECREAT || process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  return cloudinary;
}

/**
 * Compress image buffer to WebP format under target file size.
 * Uses iterative quality reduction (brute-force) since Sharp has no
 * built-in target-size option. Starts at quality 80, steps down by 10.
 *
 * @param {Buffer} buffer - Raw image buffer from Multer
 * @param {number} maxBytes - Target max file size in bytes (default: 50KB)
 * @param {number} dimension - Square output dimension (default: 256px)
 * @returns {Promise<Buffer>} Compressed WebP image buffer
 */
async function compressToTargetSize(buffer, maxBytes = 50 * 1024, dimension = 256) {
  const sharp = require('sharp');
  let quality = 80;
  let output = buffer;

  while (quality >= 20) {
    output = await sharp(buffer)
      .resize(dimension, dimension, { fit: 'cover', position: 'center' })
      .webp({ quality, effort: 4 })
      .toBuffer();

    if (output.length <= maxBytes) break;
    quality -= 10;
  }

  return output;
}

// GET /api/cloudinary/status — check if Cloudinary is configured
app.get('/api/cloudinary/status', verifyToken, async (req, res) => {
  try {
    const cloudinary = configureCloudinary();
    if (!cloudinary) {
      return res.json({ configured: false, message: 'Cloudinary not installed or env vars not set' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUDNAME || process.env.CLOUDINARY_CLOUD_NAME;
    const result = await cloudinary.api.ping();
    res.json({ configured: true, cloudName, status: result.status });
  } catch (error) {
    res.json({ configured: false, message: error.message });
  }
});

// POST /api/cloudinary/avatar — upload user avatar with Sharp + WebP compression
app.post('/api/cloudinary/avatar', verifyToken, (req, res, next) => { getUpload().single('file')(req, res, next); }, async (req, res) => {
  try {
    const cloudinary = configureCloudinary();
    if (!cloudinary) {
      return res.status(500).json({ error: 'Cloudinary not configured. Set CLOUDINARY_CLOUDNAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECREAT env vars.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const userId = req.user.uid;
    const publicId = `avatars/${userId}`;

    // Compress image to WebP, 256x256, under 50KB
    const compressedBuffer = await compressToTargetSize(req.file.buffer, 50 * 1024, 256);
    const sizeKb = Math.ceil(compressedBuffer.length / 1024);

    // Upload to Cloudinary with user-scoped public_id (overwrite: true replaces old avatar)
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          resource_type: 'image',
          format: 'webp',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(compressedBuffer);
    });

    // Update Supabase profiles table with new avatar_url
    try {
      await supabase
        .from('profiles')
        .update({ avatar_url: uploadResult.secure_url, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (supabaseErr) {
      console.warn('Failed to update profile avatar_url in Supabase:', supabaseErr.message);
    }

    res.json({
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: 'webp',
      size_kb: sizeKb,
      width: 256,
      height: 256,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar: ' + error.message });
  }
});

// DELETE /api/cloudinary/avatar — remove user avatar from Cloudinary + Supabase
app.delete('/api/cloudinary/avatar', verifyToken, async (req, res) => {
  try {
    const cloudinary = configureCloudinary();
    if (!cloudinary) {
      return res.status(500).json({ error: 'Cloudinary not configured' });
    }

    const userId = req.user.uid;
    const publicId = `avatars/${userId}`;

    const destroyResult = await cloudinary.uploader.destroy(publicId);

    // Clear avatar_url in Supabase
    try {
      await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (supabaseErr) {
      console.warn('Failed to clear profile avatar_url in Supabase:', supabaseErr.message);
    }

    res.json({ result: destroyResult.result, publicId });
  } catch (error) {
    console.error('Avatar delete error:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

// POST /api/cloudinary/upload — generic file upload (non-avatar)
app.post('/api/cloudinary/upload', verifyToken, (req, res, next) => { getUpload().single('file')(req, res, next); }, async (req, res) => {
  try {
    const cloudinary = configureCloudinary();
    if (!cloudinary) {
      return res.status(500).json({ error: 'Cloudinary not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const folder = req.body.folder || 'leddger-ai';
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// DELETE /api/cloudinary/:publicId — generic asset delete
app.delete('/api/cloudinary/:publicId', verifyToken, async (req, res) => {
  try {
    const cloudinary = configureCloudinary();
    if (!cloudinary) {
      return res.status(500).json({ error: 'Cloudinary not configured' });
    }

    const publicId = decodeURIComponent(req.params.publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    res.json({ result: result.result, publicId });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ==========================================
// USER PROFILE ENDPOINTS
// ==========================================

// GET /api/user/profile — fetch current user's profile from Supabase
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const profile = await getOrCreateUser(userId, req.user.email);

    res.json({
      id: profile?.id || userId,
      email: profile?.email || req.user.email || '',
      display_name: profile?.display_name || '',
      avatar_url: profile?.avatar_url || null,
      timezone: profile?.timezone || null,
      departments: profile?.departments || [],
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/user/profile — update display name, avatar_url, and/or timezone
app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { display_name, avatar_url, timezone } = req.body || {};

    const updates = { updated_at: new Date().toISOString() };
    if (display_name !== undefined) updates.display_name = display_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (timezone !== undefined) updates.timezone = timezone;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: 'Failed to update profile: ' + error.message });
    }

    res.json({
      id: data.id,
      email: data.email,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      timezone: data.timezone || null,
      departments: data.departments || [],
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

const OTP_ACTION_LABELS = {
  delete_data: 'Delete All Data',
  delete_account: 'Delete Account',
};

// POST /api/user/send-otp — issues a one-time verification code, required
// before DELETE /api/user/data or DELETE /api/user/account will proceed.
app.post('/api/user/send-otp', verifyToken, async (req, res) => {
  try {
    const { action } = req.body || {};
    const actionLabel = OTP_ACTION_LABELS[action];
    if (!actionLabel) {
      return res.status(400).json({ error: 'Invalid action. Must be "delete_data" or "delete_account".' });
    }

    const result = await createOtpChallenge(req.user.uid, action);

    if (result.locked || result.rateLimited) {
      return res.status(429).json({
        error: result.locked
          ? 'Too many failed attempts. Please try again later.'
          : 'Please wait before requesting another code.',
        retryAfterSeconds: Math.ceil(result.retryAfterMs / 1000),
      });
    }

    await sendOtpEmail(req.user.email, result.otp, actionLabel);

    res.json({ success: true, message: `OTP sent to ${req.user.email}` });
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

// DELETE /api/user/data — wipe all user data from Supabase + MongoDB + Cloudinary (keeps auth account)
app.delete('/api/user/data', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { confirmEmail, otp } = req.body || {};

    if (!confirmEmail || confirmEmail !== req.user.email) {
      return res.status(400).json({ error: 'Email confirmation does not match your account email.' });
    }

    const otpResult = await verifyOtpChallenge(userId, 'delete_data', otp);
    if (!otpResult.valid) {
      const status = otpResult.reason === 'locked' ? 429 : 400;
      const error = otpResult.reason === 'locked'
        ? 'Too many failed verification attempts. Please try again later.'
        : 'Invalid or expired OTP. Please request a new one.';
      return res.status(status).json({ error });
    }

    const deleted = { supabase: [], mongodb: [], cloudinary: [] };

    // --- Supabase deletions ---
    const supabaseTables = ['form_drafts', 'form_submissions', 'meetings', 'alerts', 'candidates', 'email_send_log'];
    for (const table of supabaseTables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (!error) deleted.supabase.push(table);
    }

    // Reset profile (keep row, clear data)
    await supabase.from('profiles').update({
      display_name: null,
      avatar_url: null,
      departments: [],
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    deleted.supabase.push('profiles (reset)');

    // --- MongoDB deletions ---
    const mongoModels = [
      { name: 'EmailAccount', model: EmailAccount },
      { name: 'EmailConfig', model: EmailConfig },
      { name: 'EmailDraft', model: EmailDraft },
      { name: 'EmailCampaign', model: EmailCampaign },
      { name: 'Spreadsheet', model: Spreadsheet },
    ];
    for (const { name, model } of mongoModels) {
      const result = await model.deleteMany({ ownerUid: userId });
      deleted.mongodb.push(`${name} (${result.deletedCount})`);
    }

    // User model uses firebaseUid
    const User = require('./models/User');
    const userResult = await User.deleteMany({ firebaseUid: userId });
    deleted.mongodb.push(`User (${userResult.deletedCount})`);

    // --- Google Drive token cleanup ---
    try { await revokeTokens(userId); deleted.mongodb.push('GoogleDriveToken'); } catch (e) { /* non-fatal */ }

    // --- Cloudinary avatar deletion ---
    try {
      const cloudinary = configureCloudinary();
      if (cloudinary) {
        await cloudinary.uploader.destroy(`avatars/${userId}`);
        deleted.cloudinary.push('avatars/' + userId);
      }
    } catch (cloudinaryErr) {
      // Non-fatal if Cloudinary fails
    }

    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: 'Failed to delete user data: ' + error.message });
  }
});

// DELETE /api/user/account — permanently delete user account + all data
app.delete('/api/user/account', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { confirmEmail, otp } = req.body || {};

    if (!confirmEmail || confirmEmail !== req.user.email) {
      return res.status(400).json({ error: 'Email confirmation does not match your account email.' });
    }

    const otpResult = await verifyOtpChallenge(userId, 'delete_account', otp);
    if (!otpResult.valid) {
      const status = otpResult.reason === 'locked' ? 429 : 400;
      const error = otpResult.reason === 'locked'
        ? 'Too many failed verification attempts. Please try again later.'
        : 'Invalid or expired OTP. Please request a new one.';
      return res.status(status).json({ error });
    }

    // First, wipe all user data (same as DELETE /api/user/data)
    const deleted = { supabase: [], mongodb: [], cloudinary: [] };

    const supabaseTables = ['form_drafts', 'form_submissions', 'meetings', 'alerts', 'candidates', 'email_send_log'];
    for (const table of supabaseTables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (!error) deleted.supabase.push(table);
    }

    await supabase.from('profiles').delete().eq('id', userId);
    deleted.supabase.push('profiles (deleted)');

    const mongoModels = [
      { name: 'EmailAccount', model: EmailAccount },
      { name: 'EmailConfig', model: EmailConfig },
      { name: 'EmailDraft', model: EmailDraft },
      { name: 'EmailCampaign', model: EmailCampaign },
      { name: 'Spreadsheet', model: Spreadsheet },
    ];
    for (const { name, model } of mongoModels) {
      const result = await model.deleteMany({ ownerUid: userId });
      deleted.mongodb.push(`${name} (${result.deletedCount})`);
    }

    const User = require('./models/User');
    const userResult = await User.deleteMany({ firebaseUid: userId });
    deleted.mongodb.push(`User (${userResult.deletedCount})`);

    // --- Google Drive token cleanup ---
    try { await revokeTokens(userId); deleted.mongodb.push('GoogleDriveToken'); } catch (e) { /* non-fatal */ }

    try {
      const cloudinary = configureCloudinary();
      if (cloudinary) {
        await cloudinary.uploader.destroy(`avatars/${userId}`);
        deleted.cloudinary.push('avatars/' + userId);
      }
    } catch (cloudinaryErr) {
      // Non-fatal
    }

    // Delete the auth account from Supabase
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('Failed to delete auth account:', authDeleteError);
      return res.status(500).json({
        error: 'User data was deleted but failed to delete auth account: ' + authDeleteError.message,
        deleted,
      });
    }

    res.json({ success: true, accountDeleted: true, deleted });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ error: 'Failed to delete account: ' + error.message });
  }
});

// ==========================================
// ANALYTICS API ENDPOINTS
// ==========================================

// Supabase/PostgREST caps a single select at 1000 rows by default, so a
// straight `.select('*')` silently truncates any user with more than that
// many drafts or submissions. Page through with `.range()` instead.
const SYNC_PAGE_SIZE = 1000;

async function fetchAllSyncRows(table, userId) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, from + SYNC_PAGE_SIZE - 1);

    if (error) throw error;

    rows.push(...(data || []));
    if (!data || data.length < SYNC_PAGE_SIZE) break;
    from += SYNC_PAGE_SIZE;
  }
  return rows;
}

/**
 * POST /api/analytics/sync
 * Backfill existing Supabase templates and submissions to MongoDB
 * Called once by the user to migrate historical data
 */
app.post('/api/analytics/sync', verifyToken, async (req, res) => {
  try {
    const drafts = await fetchAllSyncRows('form_drafts', req.user.uid);

    let templatesSynced = 0;
    for (const draft of drafts) {
      await TemplateData.findOneAndUpdate(
        { draftId: draft.draft_id },
        {
          ownerUid: req.user.uid,
          title: draft.title,
          templateType: draft.template_type || 'unknown',
          config: draft.config,
          status: draft.status || 'draft',
          source: 'created',
          expiresAt: draft.expires_at,
          createdAt: draft.created_at,
        },
        { upsert: true, new: true }
      );
      templatesSynced++;
    }

    const submissions = await fetchAllSyncRows('form_submissions', req.user.uid);

    let submissionsSynced = 0;
    if (submissions.length > 0) {
      // A single bulk upsert instead of a findOne+create round trip per
      // submission — halves the DB calls and stays idempotent (existing
      // submissions are matched and left untouched via $setOnInsert).
      const result = await TemplateSubmission.bulkWrite(
        submissions.map((sub) => ({
          updateOne: {
            filter: { submissionId: sub.submission_id },
            update: {
              $setOnInsert: {
                submissionId: sub.submission_id,
                draftId: sub.draft_id,
                ownerUid: req.user.uid,
                templateType: sub.template_type || 'unknown',
                title: sub.title,
                submittedData: sub.submitted_data,
                submittedAt: sub.submitted_at,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      );
      submissionsSynced = result.upsertedCount || 0;
    }

    res.json({
      message: 'Sync complete',
      templatesSynced,
      submissionsSynced,
    });
  } catch (error) {
    console.error('Error during analytics sync:', error);
    res.status(500).json({ error: 'Failed to sync analytics data' });
  }
});

/**
 * GET /api/analytics/overview
 * Get KPI summary across all user templates
 */
app.get('/api/analytics/overview', verifyToken, async (req, res) => {
  try {
    const stats = await getOverviewStats(req.user.uid);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

/**
 * GET /api/analytics/templates
 * List all user templates with submission counts
 */
app.get('/api/analytics/templates', verifyToken, async (req, res) => {
  try {
    const templates = await getTemplatesWithStats(req.user.uid);
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching analytics templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/analytics/templates/:draftId
 * Get detailed analytics for a specific template
 */
app.get('/api/analytics/templates/:draftId', verifyToken, async (req, res) => {
  try {
    const detail = await getTemplateDetail(req.user.uid, req.params.draftId);
    if (!detail) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(detail);
  } catch (error) {
    console.error('Error fetching template detail:', error);
    res.status(500).json({ error: 'Failed to fetch template detail' });
  }
});

/**
 * GET /api/analytics/templates/:draftId/submissions
 * Get paginated raw submissions for a template
 */
app.get('/api/analytics/templates/:draftId/submissions', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await getTemplateSubmissions(req.user.uid, req.params.draftId, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching template submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/analytics/templates/:draftId/field-analysis
 * Get per-field analysis for a template (rating distributions, completion rates)
 */
app.get('/api/analytics/templates/:draftId/field-analysis', verifyToken, async (req, res) => {
  try {
    const detail = await getTemplateDetail(req.user.uid, req.params.draftId);
    if (!detail) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ fieldStats: detail.fieldStats, enabledFields: detail.enabledFields });
  } catch (error) {
    console.error('Error fetching field analysis:', error);
    res.status(500).json({ error: 'Failed to fetch field analysis' });
  }
});

/**
 * GET /api/analytics/templates/:draftId/github
 * Get GitHub role & tech stack analysis for a template
 * Analyzes GitHub profiles from form submissions
 */
app.get('/api/analytics/templates/:draftId/github', verifyToken, async (req, res) => {
  try {
    const result = await analyzeTemplateGitHub(req.user.uid, req.params.draftId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching GitHub analytics:', error);
    res.status(500).json({ error: 'Failed to fetch GitHub analytics' });
  }
});

/**
 * GET /api/analytics/trends
 * Get submission trends over time (default: last 30 days)
 */
app.get('/api/analytics/trends', verifyToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = await getSubmissionTrends(req.user.uid, days);
    const typeDistribution = await getTemplateTypeDistribution(req.user.uid);
    res.json({ trends, typeDistribution });
  } catch (error) {
    console.error('Error fetching analytics trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// ==========================================
// GOOGLE DRIVE INTEGRATION ENDPOINTS
// ==========================================

/**
 * GET /api/google-drive/auth
 * Returns Google OAuth URL for Drive connection
 */
app.get('/api/google-drive/auth', verifyToken, (req, res) => {
  try {
    const state = req.user.uid;
    const authUrl = getAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google Drive auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

/**
 * GET /api/google-drive/callback
 * OAuth callback — exchanges code for tokens, stores them, redirects to frontend
 */
app.get('/api/google-drive/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send('Missing code or state parameter');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await storeTokens(state, tokens);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?drive=connected`);
  } catch (error) {
    console.error('Error in Google Drive callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?drive=error`);
  }
});

/**
 * GET /api/google-drive/status
 * Check if user has Google Drive connected
 */
app.get('/api/google-drive/status', verifyToken, async (req, res) => {
  try {
    const status = await getDriveStatus(req.user.uid);
    res.json(status);
  } catch (error) {
    console.error('Error checking Google Drive status:', error);
    res.status(500).json({ error: 'Failed to check Drive status' });
  }
});

/**
 * DELETE /api/google-drive/disconnect
 * Revoke tokens and delete from database
 */
app.delete('/api/google-drive/disconnect', verifyToken, async (req, res) => {
  try {
    await revokeTokens(req.user.uid);
    res.json({ success: true, message: 'Google Drive disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Google Drive:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Drive' });
  }
});

/**
 * POST /api/analytics/export/overview/drive
 * Export overview analytics to Google Drive as CSV or JSON
 */
app.post('/api/analytics/export/overview/drive', verifyToken, async (req, res) => {
  try {
    const { format = 'csv', convertToSheet = true } = req.body;

    const [overview, templates, trendsData] = await Promise.all([
      getOverviewStats(req.user.uid),
      getTemplatesWithStats(req.user.uid),
      getSubmissionTrends(req.user.uid, 30),
    ]);

    const typeDist = await getTemplateTypeDistribution(req.user.uid);
    const exportData = { overview, templates, trends: trendsData, typeDistribution: typeDist };

    if (format === 'json') {
      const jsonContent = JSON.stringify(exportData, null, 2);
      const result = await uploadJSONToDrive(req.user.uid, jsonContent, `analytics-overview-${Date.now()}.json`);
      res.json({ success: true, ...result });
    } else {
      const rows = [
        ['Metric', 'Value'],
        ['Total Templates', overview.totalTemplates],
        ['Active Links', overview.activeLinks],
        ['Total Submissions', overview.totalSubmissions],
        ['Avg Fields/Template', overview.avgFieldsPerTemplate],
        [],
        ['Draft ID', 'Title', 'Type', 'Status', 'Submissions', 'Last Submission'],
        ...templates.map(t => [
          t.draftId, t.title, t.templateType, t.status,
          t.submissionCount, t.lastSubmissionAt ? new Date(t.lastSubmissionAt).toISOString() : 'N/A',
        ]),
      ];
      const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const result = await uploadCSVToDrive(req.user.uid, csvContent, `analytics-overview-${Date.now()}.csv`, convertToSheet);
      res.json({ success: true, ...result });
    }
  } catch (error) {
    console.error('Error exporting overview to Drive:', error);
    if (error.message?.includes('not connected')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export to Google Drive' });
  }
});

/**
 * POST /api/analytics/templates/:draftId/export/drive
 * Export template detail analytics to Google Drive
 */
app.post('/api/analytics/templates/:draftId/export/drive', verifyToken, async (req, res) => {
  try {
    const { format = 'csv', convertToSheet = true } = req.body;

    const detail = await getTemplateDetail(req.user.uid, req.params.draftId);
    if (!detail) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const subResult = await getTemplateSubmissions(req.user.uid, req.params.draftId, 1, 10000);
    const submissions = subResult.submissions;

    if (format === 'json') {
      const jsonContent = JSON.stringify({ detail, submissions }, null, 2);
      const result = await uploadJSONToDrive(req.user.uid, jsonContent, `template-${req.params.draftId}-${Date.now()}.json`);
      res.json({ success: true, ...result });
    } else {
      const allKeys = [...new Set(submissions.flatMap(s => Object.keys(s.submittedData || {})))];
      const headerRow = ['Submission ID', 'Submitted At', ...allKeys];
      const dataRows = submissions.map(s => [
        s.submissionId,
        new Date(s.submittedAt).toISOString(),
        ...allKeys.map(k => s.submittedData?.[k] ?? ''),
      ]);
      const csvContent = [headerRow, ...dataRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const result = await uploadCSVToDrive(req.user.uid, csvContent, `template-${detail.title.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.csv`, convertToSheet);
      res.json({ success: true, ...result });
    }
  } catch (error) {
    console.error('Error exporting template to Drive:', error);
    if (error.message?.includes('not connected')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to export to Google Drive' });
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

