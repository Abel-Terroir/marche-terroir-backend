const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    const { search, startDate, endDate } = req.query;
    let query = `SELECT * FROM history WHERE 1=1`;
    const params = [];
    if (search) {
        params.push(`%${search}%`);
        query += ` AND (action ILIKE $${params.length} OR product ILIKE $${params.length} OR details ILIKE $${params.length} OR operator ILIKE $${params.length})`;
    }
    if (startDate) {
        params.push(startDate);
        query += ` AND date >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        query += ` AND date <= $${params.length}::date + interval '1 day'`;
    }
    query += ` ORDER BY date DESC`;
    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
