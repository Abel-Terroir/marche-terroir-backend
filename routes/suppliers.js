const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

function validateSupplier(data) {
    const errors = [];
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Le nom du fournisseur doit contenir au moins 2 caractères');
    }
    if (data.phone && !/^[+]?[0-9\s\-]{8,20}$/.test(data.phone)) {
        errors.push('Numéro de téléphone invalide');
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Email invalide');
    }
    return errors;
}

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM suppliers ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/:id', auth, async (req, res) => {
    const { id } = req.params;
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'ID invalide' });
    try {
        const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/', auth, async (req, res) => {
    const { name, sector, contact, phone, email, city, address, status } = req.body;
    const errors = validateSupplier({ name, phone, email });
    if (errors.length) return res.status(400).json({ errors });
    if (sector && !['Agro-alimentaire', 'Vestimentaire', 'Cosmétique', 'Multi-secteur'].includes(sector)) {
        return res.status(400).json({ error: 'Secteur invalide' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO suppliers (name, sector, contact, phone, email, city, address, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name.trim(), sector, contact, phone, email, city, address, status || 'Actif']
        );
        await pool.query(
            `INSERT INTO history (action, product, details, operator) VALUES ($1, $2, $3, $4)`,
            ['Ajout fournisseur', name, `Nouveau fournisseur enregistré (${sector})`, req.user.username]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/:id', auth, async (req, res) => {
    const { id } = req.params;
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'ID invalide' });
    const { name, sector, contact, phone, email, city, address, status } = req.body;
    const errors = validateSupplier({ name, phone, email });
    if (errors.length) return res.status(400).json({ errors });
    try {
        const result = await pool.query(
            `UPDATE suppliers SET name=$1, sector=$2, contact=$3, phone=$4, email=$5, city=$6, address=$7, status=$8
             WHERE id=$9 RETURNING *`,
            [name.trim(), sector, contact, phone, email, city, address, status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });
        await pool.query(
            `INSERT INTO history (action, product, details, operator) VALUES ($1, $2, $3, $4)`,
            ['Modification fournisseur', name, 'Fournisseur mis à jour', req.user.username]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'ID invalide' });
    try {
        const supplier = await pool.query('SELECT name FROM suppliers WHERE id = $1', [id]);
        if (supplier.rows.length === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });
        await pool.query('DELETE FROM suppliers WHERE id = $1', [id]);
        await pool.query(
            `INSERT INTO history (action, product, details, operator) VALUES ($1, $2, $3, $4)`,
            ['Suppression fournisseur', supplier.rows[0].name, 'Fournisseur retiré du système', req.user.username]
        );
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;