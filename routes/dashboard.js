const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/stats', auth, async (req, res) => {
    try {
        const totalProducts = await pool.query('SELECT COUNT(*) FROM products');
        const lowStock = await pool.query('SELECT COUNT(*) FROM products WHERE stock <= min_stock');
        const outOfStock = await pool.query('SELECT COUNT(*) FROM products WHERE stock = 0');
        const totalValue = await pool.query('SELECT COALESCE(SUM(stock * price_buy), 0) FROM products');
        const movementsCount = await pool.query('SELECT COUNT(*) FROM movements');
        const entriesCount = await pool.query(`SELECT COUNT(*) FROM movements WHERE type='Entrée'`);
        res.json({
            totalProducts: parseInt(totalProducts.rows[0].count),
            lowStock: parseInt(lowStock.rows[0].count),
            outOfStock: parseInt(outOfStock.rows[0].count),
            totalValue: parseInt(totalValue.rows[0].coalesce),
            movementsCount: parseInt(movementsCount.rows[0].count),
            entriesCount: parseInt(entriesCount.rows[0].count)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/alerts', auth, async (req, res) => {
    try {
        const alerts = await pool.query('SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC');
        res.json(alerts.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/last-movements', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, p.name as product_name FROM movements m
            JOIN products p ON m.product_id = p.id
            ORDER BY m.date DESC LIMIT 5
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
