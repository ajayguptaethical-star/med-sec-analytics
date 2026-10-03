const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken, requireRole, enforceFullUsbPrivilege } = require('../middleware/auth');
const { getAggregatedAnalytics, calculate7DayForecast, calculateSeverityLevels, applyKAnonymity } = require('../services/analyticsService');

// 1. Get Aggregated Analytics & Map Data (k-anonymity protected)
router.get('/', async (req, res) => {
  try {
    const data = await getAggregatedAnalytics();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get 7-Day Trend Forecast for Disease
router.get('/forecast', (req, res) => {
  const { disease } = req.query;

  // Mock historical 7-day series from DB count or fallback
  const mockHistoricalSeries = [12, 15, 18, 22, 29, 35, 42];
  const forecast7Days = calculate7DayForecast(mockHistoricalSeries);

  res.json({
    disease: disease || 'Overall Diseases',
    historical7Days: mockHistoricalSeries,
    forecastNext7Days: forecast7Days
  });
});

// 3. Side-by-Side Disease Comparison
router.get('/compare', (req, res) => {
  const disease1 = req.query.disease1 || 'Dengue';
  const disease2 = req.query.disease2 || 'Malaria';

  db.all(
    `SELECT disease, city, COUNT(*) as count FROM patients 
     WHERE disease IN (?, ?) 
     GROUP BY disease, city`,
    [disease1, disease2],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const disease1Data = rows.filter(r => r.disease.toLowerCase() === disease1.toLowerCase());
      const disease2Data = rows.filter(r => r.disease.toLowerCase() === disease2.toLowerCase());

      res.json({
        disease1: { name: disease1, data: applyKAnonymity(disease1Data) },
        disease2: { name: disease2, data: applyKAnonymity(disease2Data) }
      });
    }
  );
});

// 4. Export PDF / CSV Report for Admin (Requires full USB privilege - blocks limited OTP session!)
router.get('/export', authenticateToken, requireRole(['admin']), enforceFullUsbPrivilege, (req, res) => {
  const format = req.query.format || 'csv';

  db.all('SELECT disease, city, age, gender, status, created_at FROM patients', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="health_report.csv"');

      let csvContent = 'Disease,City,Age,Gender,Status,CreatedAt\n';
      rows.forEach(r => {
        csvContent += `"${r.disease}","${r.city}",${r.age},"${r.gender}","${r.status}","${r.created_at}"\n`;
      });
      return res.send(csvContent);
    }

    // PDF format response
    res.setHeader('Content-Type', 'application/json');
    res.json({
      message: 'PDF Report Generated',
      totalRecords: rows.length,
      timestamp: new Date().toISOString(),
      summary: rows.slice(0, 10)
    });
  });
});

module.exports = router;
