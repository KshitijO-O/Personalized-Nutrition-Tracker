const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

router.get('/weekly', auth, async (req, res) => {
    try {
        // Pull from daily_summary — always accurate, pre-computed
        const [rows] = await db.query(
            `SELECT log_date, total_calories, total_protein, total_carbs, total_fats,
                    calorie_goal, protein_goal, carbs_goal, fats_goal
             FROM daily_summary
             WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
             ORDER BY log_date ASC`,
            [req.user.id]
        );

        const dateMap = {};
        rows.forEach(r => {
            const key = r.log_date instanceof Date
                ? r.log_date.toISOString().split('T')[0]
                : r.log_date;
            dateMap[key] = r;
        });

        const weekly = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const day = dateMap[dateStr];
            weekly.push({
                date:           dateStr,
                label:          d.toLocaleDateString('en-US', { weekday: 'short' }),
                total_calories: day ? parseFloat(day.total_calories) : 0,
                total_protein:  day ? parseFloat(day.total_protein)  : 0,
                total_carbs:    day ? parseFloat(day.total_carbs)    : 0,
                total_fats:     day ? parseFloat(day.total_fats)     : 0,
                calorie_goal:   day?.calorie_goal || 2000
            });
        }

        const activeDays = weekly.filter(d => d.total_calories > 0);
        const n   = activeDays.length || 1;
        const avg = {
            calories:    Math.round(activeDays.reduce((s,d) => s + d.total_calories, 0) / n),
            protein:     Math.round(activeDays.reduce((s,d) => s + d.total_protein,  0) / n),
            carbs:       Math.round(activeDays.reduce((s,d) => s + d.total_carbs,    0) / n),
            fats:        Math.round(activeDays.reduce((s,d) => s + d.total_fats,     0) / n),
            days_logged: activeDays.length
        };

        res.json({ weekly, averages: avg });
    } catch (err) {
        console.error('Analytics weekly error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.get('/streak', auth, async (req, res) => {
    try {
        // Use daily_summary — a row existing means the user logged that day
        const [rows] = await db.query(
            `SELECT log_date FROM daily_summary
             WHERE user_id = ? AND total_calories > 0 AND log_date <= CURDATE()
             ORDER BY log_date DESC LIMIT 365`,
            [req.user.id]
        );

        let streak = 0;
        const dates = rows.map(r =>
            r.log_date instanceof Date ? r.log_date.toISOString().split('T')[0] : r.log_date
        );

        for (let i = 0; i < dates.length; i++) {
            const expected = new Date();
            expected.setDate(expected.getDate() - i);
            const exp = expected.toISOString().split('T')[0];
            if (dates[i] === exp) streak++;
            else break;
        }

        res.json({ streak });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
