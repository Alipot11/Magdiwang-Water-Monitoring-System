const express = require('express');
const app = express();
const cors = require('cors');
const db = require('./database.js');
const view_api = require('./src/routes/view-api.js');
const bills_api = require('./src/routes/bill-api.js');
const registration_api = require('./src/routes/registration-api.js');
const payments_api = require('./src/routes/payment-api.js')


app.use(cors({
    origin: 'http://127.0.0.1:5500'
}));

app.use(express.json());

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