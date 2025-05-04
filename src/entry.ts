import { fileURLToPath } from 'url';
import path from 'path';

// Set up Couchbase SDK environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set global CN_ROOT for Couchbase SDK
global.CN_ROOT = path.resolve(__dirname, '..', 'node_modules', 'couchbase');

// Set other required environment variables
process.env.CB_SSL_MODE = 'none';
process.env.CB_SSL_CERT = '';
process.env.CB_SSL_KEY = '';

// Initialize Couchbase globals
import './set-global';

// Import and run the main application
import('./index.js').catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
}); 