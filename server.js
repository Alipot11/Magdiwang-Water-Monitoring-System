const express = require('express');
const app = express();
const helmet = require('helmet');
const path = require('path');
const session = require('express-session');
const MySQLSessionStore = require('./src/session-store.js');
const db = require('./database.js');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const view_api = require('./src/routes/view-api.js');
const bills_api = require('./src/routes/bill-api.js');
const registration_api = require('./src/routes/registration-api.js');
const payments_api = require('./src/routes/payment-api.js');
const admin_login = require('./src/routes/admin-api.js');

const sessionStore = new MySQLSessionStore();

const cleanupInterval = setInterval(() => {
    sessionStore.cleanupExpired();
}, 60 * 60 * 1000);

if (process.env.NODE_ENV === 'test') {
    clearInterval(cleanupInterval);
}

app.disable('x-powered-by');

app.use(helmet({
    strictTransportSecurity: process.env.NODE_ENV === 'production'
        ? undefined
        : false,
    contentSecurityPolicy: {
        directives: {
            'upgrade-insecure-requests':
                process.env.NODE_ENV === 'production' ? [] : null
        }
    }
}));

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 8
    }
}));

app.use(express.json({ limit: '100kb' }));

app.use(express.static(path.join(__dirname, 'src', 'public')));


// ROUTES
app.use('/api/admin', admin_login);
app.use('/api/view-account', view_api);
app.use('/api/bills', bills_api);
app.use('/api/register', registration_api);
app.use('/api/payments', payments_api);


// SERVING THE FRONTEND
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'user.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'admin-login.html'));
});


// SEVER
let server;
let shuttingDown = false;

if (require.main === module) {
    server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;

// SERVER GRACEFUL SHUTDOWN
function shutdown(signal) {
    if (shuttingDown) return;

    shuttingDown = true;
    console.log(`${signal} received. Shutting down...`);

    clearInterval(cleanupInterval);

    const finishShutdown = () => {
        db.end((error) => {
            if (error) {
                console.error('Failed to close database pool:', error);
                process.exitCode = 1;
            }

            process.exit();
        });
    };

    if (server) {
        server.close(finishShutdown);
    } else {
        finishShutdown();
    }
}


process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));