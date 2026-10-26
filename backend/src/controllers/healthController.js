const mongoose = require('mongoose');

const getHealth = (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    status: databaseConnected ? 'ok' : 'degraded',
    service: 'livestock-management-api',
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
};

module.exports = { getHealth };
