require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/profile',   require('./routes/profile'));
app.use('/api/foods',     require('./routes/foods'));
app.use('/api/logs',      require('./routes/logs'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/import',    require('./routes/import'));

app.get('/import', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/import.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🍎 NutriTrack running at http://localhost:${PORT}`);
    console.log(`   Import foods at  http://localhost:${PORT}/import\n`);
});
