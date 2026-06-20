const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const movementRoutes = require('./routes/movements');
const historyRoutes = require('./routes/history');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/dashboard', dashboardRoutes);

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // maximum 5 tentatives par IP
  message: { error: 'Trop de tentatives, veuillez réessayer dans 15 minutes' }
});
// Appliquer uniquement à la route de login
app.use('/api/auth/login', limiter);

app.get('/', (req, res) => {
    res.json({ message: 'API Marché du Terroir' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});