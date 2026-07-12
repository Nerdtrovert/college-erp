import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as path from 'path';
import routes from './routes';

const app = express();

// Trust proxy headers (required for dev tunnels and cloud hosting rate limiters)
app.set('trust proxy', 1);

// Standard Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow static media assets to be loaded by frontend
}));

// CORS settings to allow communication with frontend
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173']; // Default to frontend dev port

app.use(cors({
  origin: (origin, callback) => {
    // In development mode, allow all origins (such as VS Code dev tunnels, ngrok, Gitpod)
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tunnel-Skip-Anti-Phishing-Page'],
  credentials: true,
}));

// Parse incoming request bodies
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve file uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Map consolidated routing index under /api path prefix
app.use('/api', routes);

// Basic health check route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'College ERP Backend API is online' });
});

// Fallback 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'API Route not found' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || err.statusCode || 500;

  // In production, don't leak error details
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
  });
});

export default app;
