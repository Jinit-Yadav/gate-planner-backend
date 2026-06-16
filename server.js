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
// SCHEMA
// ============================================================
const plannerSchema = new mongoose.Schema({
    userId: { type: String, unique: true, default: 'gate_planner_user' },
    ticks: { type: Object, required: true },
    history: { type: Object, default: {} },
    snapshots: { type: Array, default: [] },
    lastUpdated: { type: Date, default: Date.now }
});

const Planner = mongoose.model('Planner', plannerSchema);

// ============================================================
// ROUTES
// ============================================================
// GET planner data
app.get('/api/planner/:userId', async (req, res) => {
    try {
        let data = await Planner.findOne({ userId: req.params.userId });
        if (!data) {
            data = new Planner({ 
                userId: req.params.userId, 
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
        const { userId, ticks, history, snapshots } = req.body;
        const updated = await Planner.findOneAndUpdate(
            { userId },
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
app.delete('/api/planner/:userId', async (req, res) => {
    try {
        const updated = await Planner.findOneAndUpdate(
            { userId: req.params.userId },
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Add this root route
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 GATE Planner API is running!',
        endpoints: {
            health: '/api/health',
            planner: '/api/planner/:userId',
            update: 'POST /api/planner'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));