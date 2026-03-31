const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const db = require('../db');
const auth = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
        else cb(new Error('Only .xlsx, .xls, and .csv files are allowed.'));
    }
});

const REQUIRED_COLS = ['food_name', 'energy_kcal', 'protein_g', 'carb_g', 'fat_g'];

const COLUMN_ALIASES = {
    name: 'food_name', food: 'food_name', item: 'food_name',
    calories: 'energy_kcal', kcal: 'energy_kcal', cal: 'energy_kcal',
    energy: 'energy_kcal',
    protein: 'protein_g', proteins: 'protein_g',
    carbs: 'carb_g', carbohydrates: 'carb_g', carbohydrate: 'carb_g',
    fat: 'fat_g', fats: 'fat_g', total_fat: 'fat_g',
    fibre: 'fibre_g', fiber: 'fibre_g', dietary_fiber: 'fibre_g',
    sodium: 'sodium_mg',
    serving: 'serving_unit', unit: 'serving_unit',
    image: 'image_url', img: 'image_url', photo: 'image_url',
    code: 'food_code'
};

function normalizeHeaders(rawHeaders) {
    return rawHeaders.map(h => {
        if (!h) return null;
        const lower = String(h).toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
        return COLUMN_ALIASES[lower] || lower;
    });
}

function makeImageUrl(foodName) {
    const seed = Math.abs(foodName.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000;
    return `https://picsum.photos/seed/${seed}/300/200`;
}

function parseRow(rawRow, headers) {
    const row = {};
    headers.forEach((h, i) => { if (h) row[h] = rawRow[i]; });

    const food = {
        food_code:    String(row.food_code || '').trim() || null,
        food_name:    String(row.food_name || '').trim(),
        energy_kcal:  parseFloat(row.energy_kcal) || 0,
        protein_g:    parseFloat(row.protein_g)   || 0,
        carb_g:       parseFloat(row.carb_g)      || 0,
        fat_g:        parseFloat(row.fat_g)        || 0,
        fibre_g:      parseFloat(row.fibre_g)      || 0,
        sodium_mg:    parseFloat(row.sodium_mg)    || 0,
        serving_unit: String(row.serving_unit || 'serving').trim(),
        unit_kcal:    parseFloat(row.unit_kcal)   || 0,
        unit_protein: parseFloat(row.unit_protein) || 0,
        unit_carb:    parseFloat(row.unit_carb)    || 0,
        unit_fat:     parseFloat(row.unit_fat)     || 0,
        image_url:    String(row.image_url || '').trim() || makeImageUrl(row.food_name || 'food')
    };

    return food;
}

router.post('/', auth, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        if (raw.length < 2) {
            return res.status(400).json({ error: 'File is empty or has only headers.' });
        }

        const headers = normalizeHeaders(raw[0]);

        const missing = REQUIRED_COLS.filter(c => !headers.includes(c));
        if (missing.length > 0) {
            return res.status(400).json({
                error: `Missing required columns: ${missing.join(', ')}`,
                hint: 'Your file must have: food_name, energy_kcal, protein_g, carb_g, fat_g',
                found_columns: headers.filter(Boolean)
            });
        }

        const foods = [];
        const skipped = [];

        for (let i = 1; i < raw.length; i++) {
            const row = raw[i];
            if (!row || row.every(v => v === null || v === '')) continue;

            const food = parseRow(row, headers);

            if (!food.food_name || food.food_name === 'null') {
                skipped.push({ row: i + 1, reason: 'Empty food name' });
                continue;
            }

            foods.push(food);
        }

        if (foods.length === 0) {
            return res.status(400).json({ error: 'No valid food rows found in file.', skipped });
        }

        let inserted = 0, duplicates = 0, errors = 0;

        for (const food of foods) {
            try {
                await db.query(
                    `INSERT INTO food_items
                        (food_code, food_name, energy_kcal, protein_g, carb_g, fat_g,
                         fibre_g, sodium_mg, serving_unit, unit_kcal, unit_protein,
                         unit_carb, unit_fat, image_url)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        energy_kcal  = VALUES(energy_kcal),
                        protein_g    = VALUES(protein_g),
                        carb_g       = VALUES(carb_g),
                        fat_g        = VALUES(fat_g),
                        fibre_g      = VALUES(fibre_g),
                        sodium_mg    = VALUES(sodium_mg),
                        serving_unit = VALUES(serving_unit),
                        unit_kcal    = VALUES(unit_kcal),
                        unit_protein = VALUES(unit_protein),
                        unit_carb    = VALUES(unit_carb),
                        unit_fat     = VALUES(unit_fat),
                        image_url    = VALUES(image_url)`,
                    [
                        food.food_code, food.food_name, food.energy_kcal,
                        food.protein_g, food.carb_g, food.fat_g,
                        food.fibre_g, food.sodium_mg, food.serving_unit,
                        food.unit_kcal, food.unit_protein, food.unit_carb,
                        food.unit_fat, food.image_url
                    ]
                );
                inserted++;
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') duplicates++;
                else { errors++; skipped.push({ name: food.food_name, reason: e.message }); }
            }
        }

        res.json({
            message: `Import complete.`,
            inserted,
            duplicates_updated: duplicates,
            errors,
            skipped: skipped.length > 0 ? skipped : undefined
        });
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ error: 'Failed to parse file: ' + err.message });
    }
});

router.get('/template', auth, (req, res) => {
    const wb = XLSX.utils.book_new();
    const templateData = [
        ['food_name', 'energy_kcal', 'protein_g', 'carb_g', 'fat_g', 'fibre_g', 'sodium_mg', 'serving_unit', 'unit_kcal', 'unit_protein', 'unit_carb', 'unit_fat', 'image_url', 'food_code'],
        ['Dal Makhani', 180, 8, 22, 6, 4, 320, 'bowl', 360, 16, 44, 12, '', 'MY001'],
        ['Paneer Tikka', 230, 15, 8, 16, 1, 280, 'piece', 115, 7.5, 4, 8, '', 'MY002'],
        ['Masala Chai', 50, 2, 8, 1.5, 0, 30, 'cup', 50, 2, 8, 1.5, '', 'MY003']
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = templateData[0].map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Foods');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="nutritrack_food_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
});

module.exports = router;
