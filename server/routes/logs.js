const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

async function rebuildSummary(userId, date, conn) {
    const [[totals]] = await conn.query(
        `SELECT
            COALESCE(SUM(total_calories), 0) AS tc,
            COALESCE(SUM(total_protein),  0) AS tp,
            COALESCE(SUM(total_carbs),    0) AS tca,
            COALESCE(SUM(total_fats),     0) AS tf
         FROM daily_logs WHERE user_id = ? AND log_date = ?`,
        [userId, date]
    );
    const [[user]] = await conn.query(
        `SELECT recommended_calories, recommended_protein, recommended_carbs, recommended_fats
         FROM users WHERE id = ?`, [userId]
    );
    await conn.query(
        `INSERT INTO daily_summary
            (user_id, log_date, total_calories, total_protein, total_carbs, total_fats,
             calorie_goal, protein_goal, carbs_goal, fats_goal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
             total_calories=VALUES(total_calories), total_protein=VALUES(total_protein),
             total_carbs=VALUES(total_carbs),       total_fats=VALUES(total_fats),
             updated_at=CURRENT_TIMESTAMP`,
        [userId, date, totals.tc, totals.tp, totals.tca, totals.tf,
         user?.recommended_calories||2000, user?.recommended_protein||150,
         user?.recommended_carbs||250,     user?.recommended_fats||65]
    );
}

router.get('/weekly/:date', auth, async (req, res) => {
    const end = req.params.date;
    try {
        const [rows] = await db.query(
            `SELECT log_date, total_calories, total_protein, total_carbs, total_fats,
                    calorie_goal, protein_goal, carbs_goal, fats_goal
             FROM daily_summary
             WHERE user_id = ? AND log_date BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND ?
             ORDER BY log_date ASC`,
            [req.user.id, end, end]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/:date', auth, async (req, res) => {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Date must be YYYY-MM-DD.' });
    try {
        const [entries] = await db.query(
            `SELECT dl.id, dl.food_item_id, dl.food_name, dl.quantity, dl.serving_unit,
                    dl.total_calories, dl.total_protein, dl.total_carbs, dl.total_fats,
                    dl.logged_at, fi.image_url, fi.unit_kcal, fi.unit_protein, fi.unit_carb, fi.unit_fat
             FROM daily_logs dl
             JOIN food_items fi ON dl.food_item_id = fi.id
             WHERE dl.user_id = ? AND dl.log_date = ?
             ORDER BY dl.logged_at ASC`,
            [req.user.id, date]
        );
        const [[summary]] = await db.query(
            `SELECT total_calories, total_protein, total_carbs, total_fats,
                    calorie_goal, protein_goal, carbs_goal, fats_goal
             FROM daily_summary WHERE user_id = ? AND log_date = ?`,
            [req.user.id, date]
        );
        res.json({
            date, entries,
            totals: {
                total_calories: summary?.total_calories || 0,
                total_protein:  summary?.total_protein  || 0,
                total_carbs:    summary?.total_carbs    || 0,
                total_fats:     summary?.total_fats     || 0
            }
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/batch', auth, async (req, res) => {
    const { items, log_date } = req.body;
    const date = log_date || new Date().toISOString().split('T')[0];
    if (!items || !Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: 'items[] required.' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        for (const item of items) {
            const [food] = await conn.query(
                'SELECT id, food_name, energy_kcal, protein_g, carb_g, fat_g, serving_unit FROM food_items WHERE id = ?',
                [item.food_item_id]
            );
            if (!food.length) continue;
            const f = food[0], qty = parseFloat(item.quantity) || 1;
            await conn.query(
                `INSERT INTO daily_logs
                    (user_id, food_item_id, food_name, quantity, serving_unit,
                     total_calories, total_protein, total_carbs, total_fats, log_date)
                 VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [req.user.id, f.id, f.food_name, qty, f.serving_unit||'serving',
                 +(f.energy_kcal*qty).toFixed(2), +(f.protein_g*qty).toFixed(3),
                 +(f.carb_g*qty).toFixed(3),      +(f.fat_g*qty).toFixed(3), date]
            );
        }
        await rebuildSummary(req.user.id, date, conn);
        await conn.commit();
        res.status(201).json({ message: `${items.length} item(s) logged.` });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    } finally { conn.release(); }
});

router.post('/', auth, async (req, res) => {
    const { food_item_id, quantity = 1, log_date } = req.body;
    if (!food_item_id) return res.status(400).json({ error: 'food_item_id required.' });
    const date = log_date || new Date().toISOString().split('T')[0];
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [food] = await conn.query(
            'SELECT id, food_name, energy_kcal, protein_g, carb_g, fat_g, serving_unit FROM food_items WHERE id = ?',
            [food_item_id]
        );
        if (!food.length) { await conn.rollback(); return res.status(404).json({ error: 'Food not found.' }); }
        const f = food[0], qty = parseFloat(quantity);
        const [result] = await conn.query(
            `INSERT INTO daily_logs
                (user_id, food_item_id, food_name, quantity, serving_unit,
                 total_calories, total_protein, total_carbs, total_fats, log_date)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [req.user.id, f.id, f.food_name, qty, f.serving_unit||'serving',
             +(f.energy_kcal*qty).toFixed(2), +(f.protein_g*qty).toFixed(3),
             +(f.carb_g*qty).toFixed(3),      +(f.fat_g*qty).toFixed(3), date]
        );
        await rebuildSummary(req.user.id, date, conn);
        await conn.commit();
        res.status(201).json({ id: result.insertId, message: 'Logged.' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Server error.' });
    } finally { conn.release(); }
});

router.delete('/:id', auth, async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query(
            'SELECT log_date FROM daily_logs WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: 'Not found.' }); }
        const logDate = rows[0].log_date instanceof Date
            ? rows[0].log_date.toISOString().split('T')[0] : rows[0].log_date;
        await conn.query('DELETE FROM daily_logs WHERE id = ?', [req.params.id]);
        await rebuildSummary(req.user.id, logDate, conn);
        await conn.commit();
        res.json({ message: 'Deleted.' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Server error.' });
    } finally { conn.release(); }
});

module.exports = router;
