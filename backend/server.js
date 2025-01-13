require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors'); // Import the cors package
const promClient = require('prom-client'); // Import prom-client for Prometheus metrics
const app = express();

// Enable CORS for requests from 'http://192.168.56.1:3000'
app.use(cors({
  origin: '*', // Change this to your frontend's origin
}));

// Middleware for parsing JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create MySQL connection using environment variables from .env
const pool = mysql.createPool({
    host: process.env.DB_HOST,        // Using DB_HOST from .env
    user: process.env.DB_USER,        // Using DB_USER from .env
    password: process.env.DB_PASSWORD, // Using DB_PASSWORD from .env
    database: process.env.DB_NAME,    // Using DB_NAME from .env
    port: process.env.DB_PORT,        // Using DB_PORT from .env
    connectionLimit: 10,
    connectTimeout: 10000,
});
  
// Test database connection
pool.getConnection((err) => {
  if (err) {
    console.error('MySQL connection failed:', err);  // Log the connection error
  } else {
    console.log('MySQL connected successfully');
  }
});

// Prometheus metrics setup
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics(); // Collect default metrics like memory, cpu, etc.

const requestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
});

const responseDuration = new promClient.Histogram({
  name: 'http_response_duration_seconds',
  help: 'Histogram of HTTP response durations',
  buckets: [0.1, 0.5, 1, 2, 5, 10], // Response time in seconds
});

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to your Node.js server!');
});

// Get all todos
app.get('/api/todos', (req, res) => {
  const start = Date.now();
  pool.query('SELECT * FROM tasks', (err, results) => {
    const duration = Date.now() - start;
    responseDuration.observe(duration / 1000); // Record response duration in seconds

    if (err) {
      requestCounter.labels(req.method, req.originalUrl, 500).inc(); // Increment error counter
      return res.status(500).json({ error: err.message });
    }
    requestCounter.labels(req.method, req.originalUrl, 200).inc(); // Increment success counter
    res.json(results);
  });
});

// Add a new todo
app.post('/api/todos', (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  pool.query('INSERT INTO tasks (title) VALUES (?)', [title], (err, results) => {
    if (err) {
      requestCounter.labels(req.method, req.originalUrl, 500).inc(); // Increment error counter
      return res.status(500).json({ error: err.message });
    }
    requestCounter.labels(req.method, req.originalUrl, 201).inc(); // Increment success counter
    res.status(201).json({ id: results.insertId, title });
  });
});

// Delete a todo
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  pool.query('DELETE FROM tasks WHERE id = ?', [id], (err, results) => {
    if (err) {
      requestCounter.labels(req.method, req.originalUrl, 500).inc(); // Increment error counter
      return res.status(500).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    requestCounter.labels(req.method, req.originalUrl, 204).inc(); // Increment success counter
    res.status(204).send(); // No content
  });
});

// Expose /metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics()); // Expose metrics
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 3001; // Use the environment variable PORT or default to 3001
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
