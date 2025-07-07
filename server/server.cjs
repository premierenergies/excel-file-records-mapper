const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const sql = require('mssql');
const cors = require('cors');

// Database configuration
const dbConfig = {
  user: "SPOT_USER",
  password: "Premier#3801",
  server: "10.0.40.10",
  port: 1433,
  database: "SART",
  options: {
    trustServerCertificate: true,
    encrypt: false,
    connectionTimeout: 60000,
  },
};

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Multer for parsing multipart/form-data (file uploads)
const upload = multer({ storage: multer.memoryStorage() });

// Establish a global connection pool
let pool;
(async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to SQL Server');
  } catch (err) {
    console.error('❌ SQL Connection Error:', err);
    process.exit(1);
  }
})();

// Helper: infer column types from the data
function inferSchema(rows, headers) {
  const schema = [];

  headers.forEach((col) => {
    const vals = rows.map(r => r[col]).filter(v => v !== null && v !== undefined);
    let type;

    if (vals.every(v => v instanceof Date)) {
      type = { mssql: sql.DateTime2, definition: 'DATETIME2' };
    } else if (vals.every(v => typeof v === 'number')) {
      const hasFloat = vals.some(n => !Number.isInteger(n));
      if (hasFloat) {
        type = { mssql: sql.Decimal(18, 4), definition: 'DECIMAL(18,4)' };
      } else {
        type = { mssql: sql.BigInt, definition: 'BIGINT' };
      }
    } else {
      type = { mssql: sql.NVarChar(sql.MAX), definition: 'NVARCHAR(MAX)' };
    }

    schema.push({ name: col, ...type });
  });

  return schema;
}

// Endpoint for uploading Excel and inserting data
app.post('/upload/:report', upload.single('file'), async (req, res) => {
  const report = req.params.report; // 'p2p', 'purchase', or 'sales'
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    // Parse workbook from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true, dateNF: 'yyyy-MM-dd' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to array of arrays (header + rows)
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: null, cellDates: true });
    if (data.length < 2) {
      return res.status(400).json({ error: 'Excel file must have a header row and at least one data row.' });
    }

    const headers = data[0].map(h => String(h).trim());
    const rawRows = data.slice(1);

    // Build row objects
    const rows = rawRows.map(rowArr => {
      const obj = {};
      headers.forEach((h, idx) => {
        let val = rowArr[idx];
        // Convert date-like strings back to Date
        if (val && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
          const d = new Date(val);
          if (!isNaN(d)) val = d;
        }
        obj[h] = val;
      });
      return obj;
    });

    // Infer schema
    const schema = inferSchema(rows, headers);

    // Prepare table for bulk insert
    const tableName = `${report.toUpperCase()}_DATA`;
    const table = new sql.Table(tableName);
    table.create = true;
    table.columns.manual = false;

    // Add columns to table definition
    schema.forEach(col => {
      table.columns.add(col.name, col.mssql, { nullable: true });
    });

    // Add rows
    rows.forEach(r => {
      const rowValues = schema.map(col => r[col.name]);
      table.rows.add(...rowValues);
    });

    // Bulk insert
    await pool.request().bulk(table);

    res.json({ message: `Inserted ${rows.length} rows into ${tableName}` });

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Failed to process and insert data.' });
  }
});

// Start server
const PORT = process.env.PORT || 5577;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
