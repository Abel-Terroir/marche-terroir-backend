const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// Fonction de validation
function validateProductData(data) {
    const errors = [];
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Le nom du produit doit contenir au moins 2 caractères');
    }
    if (data.price_buy !== undefined && (isNaN(data.price_buy) || data.price_buy < 0)) {
        errors.push('Le prix d\'achat doit être un nombre positif ou nul');
    }
    if (data.price_sell !== undefined && (isNaN(data.price_sell) || data.price_sell < 0)) {
        errors.push('Le prix de vente doit être un nombre positif ou nul');
    }
    if (data.stock !== undefined && (isNaN(data.stock) || data.stock < 0)) {
        errors.push('Le stock doit être un nombre positif ou nul');
    }
    if (data.min_stock !== undefined && (isNaN(data.min_stock) || data.min_stock < 0)) {
        errors.push('Le seuil minimum doit être un nombre positif ou nul');
    }
    return errors;
}

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/:id', auth, async (req, res) => {
    const { id } = req.params;
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'ID invalide' });
    }
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Produit non trouvé' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/', auth, async (req, res) => {
    const { name, ref, cat, supplier_id, price_buy, price_sell, stock, min_stock, unit, description } = req.body;

    const errors = validateProductData({ name, price_buy, price_sell, stock, min_stock });
    if (errors.length) {
        return res.status(400).json({ errors });
    }
    if (!cat || !['Agro-alimentaire', 'Vestimentaire', 'Cosmétique'].includes(cat)) {
        return res.status(400).json({ error: 'Catégorie invalide' });
    }
    if (supplier_id !== undefined && supplier_id !== null && (isNaN(supplier_id) || supplier_id <= 0)) {
        return res.status(400).json({ error: 'Fournisseur invalide' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO products (name, ref, cat, supplier_id, price_buy, price_sell, stock, min_stock, unit, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [name.trim(), ref, cat, supplier_id, price_buy, price_sell, stock, min_stock, unit, description]
        );
        await pool.query(
            `INSERT INTO history (action, product, details, operator) VALUES ($1, $2, $3, $4)`,
            ['Ajout produit', name, `Nouveau produit créé avec stock initial ${stock} ${unit}`, req.user.username]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/:id', auth, async (req, res) => {
    const { id } = req.params;
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'ID invalide' });
    }
    const { name, ref, cat, supplier_id, price_buy, price_sell, stock, min_stock, unit, description } = req.body;

    const errors = validateProductData({ name, price_buy, price_sell, stock, min_stock });
    if (errors.length) {
        return res.status(400).json({ errors });
    }
    if (!cat || !['Agro-alimentaire', 'Vestimentaire', 'Cosmétique'].includes(cat)) {
        return res.status(400).json({ error: 'Catégorie invalide' });
    }

    try {
        const result = await pool.query(
            `UPDATE products SET name=$1, ref=$2, cat=$3, supplier_id=$4, price_buy=$5, price_sell=$6, stock=$7, min_stock=$8, unit=$9, description=$10
             WHERE id=$11 RETURNING *`,
            [name.trim(), ref, cat, supplier_id, price_buy, price_sell, stock, min_stock, unit, description, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Produit non trouvé' });
        await pool.query(
            `INSERT INTO history (action, product, details, operator) VALUES ($1, $2, $3, $4)`,
            ['Modification produit', name, 'Produit mis à jour', req.user.username]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'ID invalide' });
    }
    try {
        const product = await pool.query('SELECT name FROM products WHERE id = $1', [id]);
        if (product.rows.length === 0) return res.status(404).json({ error: 'Produit non trouvé' });
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        await pool.query(
            `INSERT INTO history (action, product, details, operator) VALUES ($1, $2, $3, $4)`,
            ['Suppression produit', product.rows[0].name, 'Produit supprimé du catalogue', req.user.username]
        );
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;