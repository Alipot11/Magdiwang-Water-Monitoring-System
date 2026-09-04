const express = require('express');
const app = express();
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');

// api routes
const view_api = require('./src/routes/view-api.js');
const bills_api = require('./src/routes/bill-api.js');
const registration_api = require('./src/routes/registration-api.js');
const payments_api = require('./src/routes/payment-api.js')
const admin_login = require('./src/routes/admin-api.js')


app.use(session({
    secret: 'CHANGE_THIS_TO_A_VERY_LONG_SECRET',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 8
    }
}));

app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));

app.use(express.json());


// ROUTES

// route for admin authorization
app.use('/api/admin', admin_login);

// route api for client accounts
app.use('/api/view-account', view_api);

// route api for client bills
app.use('/api/bills', bills_api);

// route api for registering client
app.use('/api/register', registration_api)


app.use('/api/payments', payments_api)

// server
app.get('/', (req,res) => {
    res.send(`server is running`);
});

app.listen(3000,() => {
    console.log(`server is listening at port 3000`);
});