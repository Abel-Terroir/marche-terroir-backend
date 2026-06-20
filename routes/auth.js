const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const router = express.Router();

async function initUsers() {
    try {
        const hashedAdmin = await bcrypt.hash('terroir2025', 10);
        const hashedResp = await bcrypt.hash('stock@benin', 10);
        await pool.query(
            `INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
            ['admin', hashedAdmin]
        );
        await pool.query(
            `INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
            ['responsable', hashedResp]
        );
        console.log('✅ Utilisateurs initialisés');
    } catch (err) {
        console.error('❌ Erreur init users:', err.message);
    }
}
initUsers();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Identifiant incorrect' });
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
