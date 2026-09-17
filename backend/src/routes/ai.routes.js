import { Router } from 'express';
import { askAssistant } from '../services/ai.service.js';

const router = Router();

// POST /api/ai/ask
router.post('/ask', async (req, res) => {
    try {
        const { query, context } = req.body;
        if (!query || typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({ error: 'Query text is required.' });
        }

        const answer = await askAssistant({ query: query.trim(), context: context || {} });
        res.json({
            ok: true,
            response: answer.text,
            source: answer.source,
            note: answer.note || null
        });
    } catch (err) {
        console.error('AI assistant route error:', err);
        res.status(500).json({ error: 'Internal assistant error: ' + err.message });
    }
});

export default router;
