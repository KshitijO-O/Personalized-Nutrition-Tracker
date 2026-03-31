const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, name, email, age, gender, height_cm, weight_kg,
                    activity_level, goal,
                    recommended_calories, recommended_protein,
                    recommended_carbs, recommended_fats,
                    bmi, created_at, updated_at
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.put('/', auth, async (req, res) => {
    const { name, age, gender, height_cm, weight_kg, activity_level, goal } = req.body;

    if (!height_cm || !weight_kg || !age || !gender) {
        return res.status(400).json({ error: 'Height, weight, age and gender are required.' });
    }

    const hm = height_cm / 100;
    const bmi = parseFloat((weight_kg / (hm * hm)).toFixed(1));

    let bmr = gender === 'male'
        ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
        : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;

    const multipliers = {
        sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, 'very-active': 1.9
    };
    let tdee = bmr * (multipliers[activity_level] || 1.2);
    if (goal === 'lose') tdee -= 500;
    else if (goal === 'gain') tdee += 500;

    const calories = Math.round(tdee);
    const protein  = Math.round(calories * 0.30 / 4);
    const carbs    = Math.round(calories * 0.50 / 4);
    const fats     = Math.round(calories * 0.20 / 9);

    try {
        await db.query(
            `UPDATE users SET
                name = ?, age = ?, gender = ?, height_cm = ?, weight_kg = ?,
                activity_level = ?, goal = ?, bmi = ?,
                recommended_calories = ?, recommended_protein = ?,
                recommended_carbs = ?, recommended_fats = ?,
                updated_at = NOW()
             WHERE id = ?`,
            [name, age, gender, height_cm, weight_kg, activity_level, goal, bmi,
             calories, protein, carbs, fats, req.user.id]
        );

        res.json({
            message: 'Profile saved.',
            bmi,
            recommended_calories: calories,
            recommended_protein: protein,
            recommended_carbs: carbs,
            recommended_fats: fats
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
