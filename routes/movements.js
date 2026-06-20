const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, p.name as product_name, p.cat, p.unit
            FROM movements m
            JOIN products p ON m.product_id = p.id
            ORDER BY m.date DESC, m.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/', auth, async (req, res) => {
    const { productId, type, qty, date, reason, operator, notes } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
        if (prodRes.rows.length === 0) throw new Error('Produit inexistant');
        const product = prodRes.rows[0];
        let newStock;
        if (type === 'Entrée') {
            newStock = product.stock + qty;
        } else {
            if (qty > product.stock) throw new Error('Stock insuffisant');
            newStock = product.stock - qty;
        }
        await client.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, productId]);
        const mvtRes = await client.query(
            `INSERT INTO movements (product_id, type, quantity, date, reason, operator, notes, stock_before, stock_after)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [productId, type, qty, date, reason, operator, notes, product.stock, newStock]
        );
        await client.query(
            `INSERT INTO history (action, product, details, operator, date) VALUES ($1, $2, $3, $4, $5)`,
            [`Mouvement ${type}`, product.name, `${type} de ${qty} ${product.unit}. Motif: ${reason}. Stock: ${product.stock}→${newStock}`, operator, date || new Date()]
        );
        await client.query('COMMIT');
        res.status(201).json(mvtRes.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
