const { db } = require('../db/database');

// k-Anonymity threshold (Groups with < 5 cases are masked)
const K_ANONYMITY_THRESHOLD = 5;

function applyKAnonymity(groupedData) {
  return groupedData.map(group => {
    if (group.count < K_ANONYMITY_THRESHOLD) {
      return {
        ...group,
        count: '< 5',
        masked: true,
        note: 'Hidden for k-anonymity privacy protection'
      };
    }
    return {
      ...group,
      masked: false
    };
  });
}

function calculateSeverityLevels(diseaseCounts) {
  if (!diseaseCounts || diseaseCounts.length === 0) return [];
  
  const counts = diseaseCounts.map(d => Number(d.count) || 0);
  const n = counts.length;
  const mean = counts.reduce((a, b) => a + b, 0) / (n || 1);

  const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n || 1);
  const sd = Math.sqrt(variance);

  return diseaseCounts.map(item => {
    const c = Number(item.count) || 0;
    let severity = 'Low';
    if (c > mean + 2 * sd) {
      severity = 'Critical';
    } else if (c > mean + sd) {
      severity = 'High';
    } else if (c > mean) {
      severity = 'Medium';
    }

    return {
      ...item,
      mean: Math.round(mean * 10) / 10,
      sd: Math.round(sd * 10) / 10,
      severity
    };
  });
}

function calculate7DayForecast(historicalSeries) {
  // historicalSeries: array of numbers [day1, day2, ..., dayN]
  if (!historicalSeries || historicalSeries.length === 0) {
    return Array(7).fill(0);
  }

  const n = historicalSeries.length;
  // Simple moving average over last 3 days
  const movingAvg = historicalSeries.slice(-3).reduce((a, b) => a + b, 0) / Math.min(n, 3);

  // Simple Linear Regression slope: y = mx + c
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += historicalSeries[i];
    sumXY += i * historicalSeries[i];
    sumXX += i * i;
  }

  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
  const intercept = (sumY - slope * sumX) / n;

  const forecast = [];
  for (let day = 1; day <= 7; day++) {
    const nextVal = Math.max(0, Math.round(intercept + slope * (n + day - 1)));
    // Blended forecast of linear regression and moving average
    const blended = Math.round((nextVal + movingAvg) / 2);
    forecast.push(blended);
  }

  return forecast;
}

function getAggregatedAnalytics() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT disease, city, AVG(lat) as lat, AVG(lng) as lng, COUNT(*) as count 
       FROM patients 
       GROUP BY disease, city`,
      [],
      (err, rows) => {
        if (err) return reject(err);

        const safeRows = applyKAnonymity(rows);
        const ratedRows = calculateSeverityLevels(rows);

        // Group by disease for total counts
        const diseaseTotalsMap = {};
        rows.forEach(r => {
          diseaseTotalsMap[r.disease] = (diseaseTotalsMap[r.disease] || 0) + r.count;
        });

        const topDiseases = Object.entries(diseaseTotalsMap)
          .map(([disease, count]) => ({ disease, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        resolve({
          cityDiseaseBreakdown: safeRows,
          severityAnalytics: ratedRows,
          topRisingDiseases: topDiseases
        });
      }
    );
  });
}

module.exports = {
  applyKAnonymity,
  calculateSeverityLevels,
  calculate7DayForecast,
  getAggregatedAnalytics,
  K_ANONYMITY_THRESHOLD
};
