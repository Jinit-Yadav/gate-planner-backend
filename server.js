const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// MONGODB CONNECTION
// ============================================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://yadavjinit8_db_user:YOUR_PASSWORD@cluster0.b2yei7o.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, '❌ Connection error:'));
db.once('open', () => console.log('✅ Connected to MongoDB Atlas!'));

// ============================================================
// SCHEMAS
// ============================================================

// 1. Planner Schema
const plannerSchema = new mongoose.Schema({
    userId: { type: String, default: 'default_user' },
    ticks: { type: Object, required: true },
    history: { type: Object, default: {} },
    snapshots: { type: Array, default: [] },
    lastUpdated: { type: Date, default: Date.now }
});

// 2. Mistake Schema
const mistakeSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correct: { type: String, required: true },
    userAnswer: { type: String, required: true },
    subject: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    reason: { type: String, enum: ['Concept Error', 'Calculation Error', 'Guess', 'Silly Mistake', 'Time Pressure'], required: true },
    aiFeedback: { type: String, default: '' },
    memoryTrick: { type: String, default: '' },
    isRevised: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    revisedAt: { type: Date },
    revisionCount: { type: Number, default: 0 }
});

// 3. Tracker Schema
const trackerSchema = new mongoose.Schema({
    progress: { type: Object, default: {} },
    today: { type: Object, default: {} },
    streak: { type: Object, default: { lastDate: null, streak: 0 } },
    lastUpdated: { type: Date, default: Date.now }
});

const Planner = mongoose.model('Planner', plannerSchema);
const Mistake = mongoose.model('Mistake', mistakeSchema);
const Tracker = mongoose.model('Tracker', trackerSchema);

// ============================================================
// ROUTES - PLANNER
// ============================================================
// GET planner data
app.get('/api/planner', async (req, res) => {
    try {
        let data = await Planner.findOne({ userId: 'default_user' });
        if (!data) {
            data = new Planner({ 
                userId: 'default_user',
                ticks: {},
                history: {},
                snapshots: []
            });
            await data.save();
        }
        res.json(data);
    } catch (error) {
        console.error('GET Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST/UPDATE planner data
app.post('/api/planner', async (req, res) => {
    try {
        const { ticks, history, snapshots } = req.body;
        const updated = await Planner.findOneAndUpdate(
            { userId: 'default_user' },
            { 
                ticks, 
                history, 
                snapshots, 
                lastUpdated: new Date() 
            },
            { upsert: true, new: true }
        );
        res.json(updated);
    } catch (error) {
        console.error('POST Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Reset all ticks
app.delete('/api/planner', async (req, res) => {
    try {
        const updated = await Planner.findOneAndUpdate(
            { userId: 'default_user' },
            { 
                ticks: {},
                history: {},
                snapshots: [],
                lastUpdated: new Date() 
            },
            { new: true }
        );
        res.json(updated);
    } catch (error) {
        console.error('DELETE Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// ROUTES - MISTAKES
// ============================================================

// GET all mistakes
app.get('/api/mistakes', async (req, res) => {
    try {
        const mistakes = await Mistake.find().sort({ createdAt: -1 });
        res.json(mistakes);
    } catch (error) {
        console.error('GET Mistakes Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET a single mistake
app.get('/api/mistakes/:id', async (req, res) => {
    try {
        const mistake = await Mistake.findById(req.params.id);
        if (!mistake) {
            return res.status(404).json({ error: 'Mistake not found' });
        }
        res.json(mistake);
    } catch (error) {
        console.error('GET Mistake Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ADD a new mistake
app.post('/api/mistakes', async (req, res) => {
    try {
        const mistake = new Mistake(req.body);
        await mistake.save();
        res.status(201).json(mistake);
    } catch (error) {
        console.error('POST Mistake Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE a mistake
app.put('/api/mistakes/:id', async (req, res) => {
    try {
        const mistake = await Mistake.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!mistake) {
            return res.status(404).json({ error: 'Mistake not found' });
        }
        res.json(mistake);
    } catch (error) {
        console.error('PUT Mistake Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE a mistake
app.delete('/api/mistakes/:id', async (req, res) => {
    try {
        const mistake = await Mistake.findByIdAndDelete(req.params.id);
        if (!mistake) {
            return res.status(404).json({ error: 'Mistake not found' });
        }
        res.json({ message: 'Mistake deleted successfully' });
    } catch (error) {
        console.error('DELETE Mistake Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// MARK as revised
app.patch('/api/mistakes/:id/revision', async (req, res) => {
    try {
        const mistake = await Mistake.findByIdAndUpdate(
            req.params.id,
            { 
                isRevised: true, 
                revisedAt: new Date(),
                $inc: { revisionCount: 1 }
            },
            { new: true }
        );
        if (!mistake) {
            return res.status(404).json({ error: 'Mistake not found' });
        }
        res.json(mistake);
    } catch (error) {
        console.error('PATCH Mistake Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET analytics for mistakes
app.get('/api/mistakes/analytics', async (req, res) => {
    try {
        const mistakes = await Mistake.find();
        
        const analytics = {
            total: mistakes.length,
            bySubject: {},
            byReason: {},
            byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
            revised: mistakes.filter(m => m.isRevised).length,
            pending: mistakes.filter(m => !m.isRevised).length
        };
        
        mistakes.forEach(m => {
            analytics.bySubject[m.subject] = (analytics.bySubject[m.subject] || 0) + 1;
            analytics.byReason[m.reason] = (analytics.byReason[m.reason] || 0) + 1;
            analytics.byDifficulty[m.difficulty] = (analytics.byDifficulty[m.difficulty] || 0) + 1;
        });
        
        res.json(analytics);
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// ROUTES - TRACKER (NO USERID)
// ============================================================

// GET tracker data
app.get('/api/tracker', async (req, res) => {
    try {
        let data = await Tracker.findOne();
        if (!data) {
            data = new Tracker({
                progress: {},
                today: {},
                streak: { lastDate: null, streak: 0 }
            });
            await data.save();
        }
        res.json(data);
    } catch (error) {
        console.error('GET Tracker Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST/UPDATE tracker data
app.post('/api/tracker', async (req, res) => {
    try {
        const { progress, today, streak } = req.body;
        
        // Find existing or create new
        let tracker = await Tracker.findOne();
        if (!tracker) {
            tracker = new Tracker({ progress, today, streak });
        } else {
            tracker.progress = progress || tracker.progress;
            tracker.today = today || tracker.today;
            tracker.streak = streak || tracker.streak;
            tracker.lastUpdated = new Date();
        }
        
        await tracker.save();
        res.json(tracker);
    } catch (error) {
        console.error('POST Tracker Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Reset all tracker progress
app.delete('/api/tracker', async (req, res) => {
    try {
        let tracker = await Tracker.findOne();
        if (!tracker) {
            tracker = new Tracker({
                progress: {},
                today: {},
                streak: { lastDate: null, streak: 0 }
            });
        } else {
            tracker.progress = {};
            tracker.today = {};
            tracker.streak = { lastDate: null, streak: 0 };
            tracker.lastUpdated = new Date();
        }
        await tracker.save();
        res.json(tracker);
    } catch (error) {
        console.error('DELETE Tracker Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 GATE Planner API is running!',
        endpoints: {
            health: '/api/health',
            planner: {
                get: '/api/planner',
                post: '/api/planner',
                delete: '/api/planner'
            },
            mistakes: {
                get: '/api/mistakes',
                post: '/api/mistakes',
                delete: '/api/mistakes/:id',
                revision: '/api/mistakes/:id/revision',
                analytics: '/api/mistakes/analytics'
            },
            tracker: {
                get: '/api/tracker',
                post: '/api/tracker',
                delete: '/api/tracker'
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
