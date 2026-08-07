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
// API ENDPOINTS
// ==========================================

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
