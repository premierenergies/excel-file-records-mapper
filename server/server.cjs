// server.cjs
const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const sql = require("mssql");
const cors = require("cors");
const path = require("path");
const { Buffer } = require("buffer");

// Database configuration
const dbConfig = {
  user: "SPOT_USER",
  password: "Marvik#72@",
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
app.use(cors("*")); // Allow all origins for CORS
app.use(express.json());

// Multer for parsing multipart/form-data (file uploads)
const upload = multer({ storage: multer.memoryStorage() });

// Establish a global connection pool
let pool;
(async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log("✅ Connected to SQL Server");
  } catch (err) {
    console.error("❌ SQL Connection Error:", err);
    process.exit(1);
  }
})();

// Helper: infer column types from the data
function inferSchema(rows, headers) {
  const schema = [];
  headers.forEach((col) => {
    const vals = rows.map((r) => r[col]).filter((v) => v != null);
    let type;
    if (vals.length && vals.every((v) => v instanceof Date)) {
      type = { mssql: sql.Date, definition: "DATE" };
    } else if (vals.length && vals.every((v) => typeof v === "number")) {
      const hasFloat = vals.some((n) => !Number.isInteger(n));
      type = hasFloat
        ? { mssql: sql.Decimal(18, 4), definition: "DECIMAL(18,4)" }
        : { mssql: sql.BigInt, definition: "BIGINT" };
    } else {
      type = { mssql: sql.NVarChar(sql.MAX), definition: "NVARCHAR(MAX)" };
    }
    schema.push({ name: col, ...type });
  });
  return schema;
}

// Endpoint for uploading Excel and inserting data
app.post("/upload/:report", upload.single("file"), async (req, res) => {
  const report = req.params.report;
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    // Read workbook
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true,
      dateNF: "yyyy-MM-dd",
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON array-of-arrays
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      cellDates: true,
    });
    if (data.length < 2) {
      return res.status(400).json({
        error: "Excel file must have a header row and at least one data row.",
      });
    }

    // new: normalize spaces → underscores before deduping
    const rawHeaders = data[0].map((h) => String(h).trim());
    const underscored = rawHeaders.map(
      (h) => h.replace(/\s+/g, "_") || "Column"
    );
    const headerCounts = {};
    const headers = underscored.map((h) => {
      headerCounts[h] = (headerCounts[h] || 0) + 1;
      return headerCounts[h] === 1 ? h : `${h}_${headerCounts[h]}`;
    });

    // Map rows into objects using the unique headers
    const rawRows = data.slice(1);
    const dateCols = new Set(headers.filter((h) => /Date$/i.test(h)));
    const rows = rawRows.map((arr) => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = arr[i];
        if (dateCols.has(h) && typeof val === "number") {
          const dc = XLSX.SSF.parse_date_code(val);
          if (dc) {
            // Anchor at 12:00 local time to avoid UTC rollback to previous day
            val = new Date(dc.y, dc.m - 1, dc.d, 12, 0, 0);
          }
        }

        obj[h] = val;
      });
      return obj;
    });

    // Infer schema and ensure table is dropped & recreated
    const schema = inferSchema(rows, headers);
    const tableName = `${report.toUpperCase()}_DATA`;
    const createAndClearSql = `
      IF OBJECT_ID('dbo.${tableName}', 'U') IS NOT NULL
        DROP TABLE dbo.${tableName};
      CREATE TABLE dbo.${tableName} (
        ${schema
          .map((c) => `[${c.name}] ${c.definition} NULL`)
          .join(",\n        ")}
      );
    `;
    await pool.request().query(createAndClearSql);

    // Bulk insert
    const table = new sql.Table(tableName);
    table.create = false;
    schema.forEach((c) => {
      table.columns.add(c.name, c.mssql, { nullable: true });
    });

    rows.forEach((rawRow) => {
      const rowValues = schema.map((c) => {
        let v = rawRow[c.name];
        if (v != null && c.definition.startsWith("NVARCHAR")) {
          v = String(v);
        }
        return v;
      });
      table.rows.add(...rowValues);
    });

    await pool.request().bulk(table);

    res.json({ message: `Inserted ${rows.length} rows into ${tableName}` });
  } catch (err) {
    console.error("Upload Error:", err);
    // Return full stack for debugging
    res.status(500).json({ error: err.stack || err.message });
  }
});

// Serve built frontend from Express without using route patterns
const PORT = process.env.PORT || 30443;
const frontendRoot = path.resolve(__dirname, "..");
app.use(express.static(path.join(frontendRoot, "dist")));
app.use((req, res, next) => {
  if (
    req.method === "GET" &&
    req.headers.accept &&
    req.headers.accept.includes("text/html")
  ) {
    return res.sendFile(path.join(frontendRoot, "dist", "index.html"));
  }
  next();
});

app.listen(PORT, () => {
  console.log(`🚀 Server (API + SPA) running on port ${PORT}`);
});
