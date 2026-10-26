const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const animalRoutes = require('./routes/animalRoutes');
const milkRoutes = require('./routes/milkRoutes');
const vaccinationRoutes = require('./routes/vaccinationRoutes');
const weightRoutes = require('./routes/weightRoutes');
const breedingRoutes = require('./routes/breedingRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/milk-records', milkRoutes);
app.use('/api/vaccinations', vaccinationRoutes);
app.use('/api/weight-records', weightRoutes);
app.use('/api/breeding-records', breedingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
