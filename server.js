const express = require('express');
const app = express();
const helmet = require('helmet');
const path = require('path')
const session = require('express-session');
const MySQLSessionStore = require('./src/session-store.js');

// api routes
const view_api = require('./src/routes/view-api.js');
const bills_api = require('./src/routes/bill-api.js');
const registration_api = require('./src/routes/registration-api.js');
const payments_api = require('./src/routes/payment-api.js')
const admin_login = require('./src/routes/admin-api.js')


const sessionStore = new MySQLSessionStore();

setInterval(() => {
    sessionStore.cleanupExpired();
}, 60 * 60 * 1000);

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

app.use(express.json({limit: "100kb"}));

app.use(express.static(path.join(__dirname, 'src', 'public')));


// ROUTES

// route for admin authorization
app.use('/api/admin', admin_login);

// route api for client accounts
app.use('/api/view-account', view_api);

// route api for client bills
app.use('/api/bills', bills_api);

// route api for registering client
app.use('/api/register', registration_api)

// route api for payments
app.use('/api/payments', payments_api)

// server
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'user.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'admin-login.html'));
});

app.listen(3000,() => {
    console.log(`server is listening at port 3000`);
});