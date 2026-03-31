const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const { search = '', max_calories, min_protein, limit = 200, offset = 0 } = req.query;

        let sql = `SELECT id, food_code, food_name, energy_kcal, protein_g, carb_g,
                          fat_g, fibre_g, sodium_mg, serving_unit,
                          unit_kcal, unit_protein, unit_carb, unit_fat, image_url
                   FROM food_items WHERE 1=1`;
        const params = [];

        if (search) {
            sql += ' AND food_name LIKE ?';
            params.push(`%${search}%`);
        }
        if (max_calories) {
            sql += ' AND energy_kcal <= ?';
            params.push(parseFloat(max_calories));
        }
        if (min_protein) {
            sql += ' AND protein_g >= ?';
            params.push(parseFloat(min_protein));
        }

        sql += ' ORDER BY food_name ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.query(sql, params);

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM food_items WHERE food_name LIKE ?`,
            [`%${search}%`]
        );

        res.json({ total, foods: rows });
    } catch (err) {
        console.error('Get foods error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM food_items WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Food not found.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
