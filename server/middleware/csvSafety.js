const { parse } = require('csv-parse/sync');

// Formula injection triggers: =, +, -, @, tab, carriage return
function neutralizeFormula(val) {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`; // Prepend single quote to prevent execution in Excel/Spreadsheets
  }
  return trimmed;
}

function processCsvBuffer(buffer) {
  try {
    const rawRecords = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const safeRecords = rawRecords.map(row => {
      const safeRow = {};
      for (const [key, value] of Object.entries(row)) {
        const safeKey = neutralizeFormula(key);
        safeRow[safeKey] = neutralizeFormula(value);
      }
      return safeRow;
    });

    return { success: true, records: safeRecords };
  } catch (err) {
    return { success: false, error: 'Invalid CSV format: ' + err.message };
  }
}

function validateCsvSchema(records, requiredColumns = []) {
  if (!records || records.length === 0) {
    return { valid: false, error: 'CSV file is empty.' };
  }

  const fileColumns = Object.keys(records[0]);
  const missing = requiredColumns.filter(col => !fileColumns.includes(col));

  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `Missing required columns: ${missing.join(', ')}. Available: ${fileColumns.join(', ')}` 
    };
  }

  return { valid: true };
}

module.exports = {
  neutralizeFormula,
  processCsvBuffer,
  validateCsvSchema
};
