const express = require('express');
const app = express();
const cors = require('cors')
const db = require('./database.js')

app.use(cors({
    origin: 'http://127.0.0.1:5500'
}));

app.use(express.json());

// user login
app.get('/api/login_account',(req,res)=>{
    const search = req.query.q;

    const sql = `
    SELECT * FROM client_history
    WHERE meter_id = ?`;

    const search_value = `${search}`

    db.query(
        sql, 
        [
            search_value
        ],     
        (err, results)=>{
        if (err) {
            console.Error(err);
            return res.status(500).json({
                message: 'Failed to retrieve date'
            })
        }
        res.json(results)
    })
})

// get accounts from the database
app.get('/api/view_account', (req, res) => {
    const sql = `
    SELECT * FROM customers`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Failed to retrieve data'
            });
        }
        res.json(results);
    });
});

// search client account
app.get('/api/view_account/search', (req, res) => {
    const search = req.query.q;

    const sql = `
    SELECT * FROM client_history
    WHERE meter_id = ?`;

    const search_value = `${search}`;

    db.query (
        sql,
        [
            search_value
        ],
        (err, results) => {
            if (err) {
                console.error(err)

                return res.status(500).json({
                    message: `Search failed`
                });
            }

            res.json(results);
        }

    )
});

// post account to database
app.post('/api/register',(req,res) => {
    const {
        meter_id,
        first_name,
        last_name,
        barangay,
        sitio
    } = req.body

    const sql = `
    INSERT INTO customers
    (meter_id, first_name, last_name, barangay, sitio)
    VALUE (?,?,?,?,?)`;

    db.query(
        sql,
        [meter_id, first_name, last_name, barangay, sitio],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500)
            }
            
            res.status(201).json({
                message: 'Account registered successfully'
            })
        }
    );
})

// post bills to database
app.post('/api/bills',(req,res)=>{
    const {
        meter_id,
        curr_reading,
        pre_reading,
        tcmeter,
        amount,
        surcharge,
        bill_amount,
        duedate
    } = req.body

    const sql =`
    INSERT INTO bills
    (meter_id, curr_reading, pre_reading, tcmeter, amount, surcharge, bill_amount, duedate)
    VALUE(?,?,?,?,?,?,?,?)`;

    db.query(
        sql,
        [meter_id, curr_reading, pre_reading, tcmeter, amount, surcharge, bill_amount, duedate],
        (err)=>{
            if (err) {
                console.error(err);
                return res.status(500);
            }

            res.status(200).json({
                message: 'Bill posted'
            });
        }
    );
});

// post payment to database
app.post('/api/payments',(req, res) => {
    const {
        bill_id,
        meter_id,
        payment_date,
        amount_paid
    } = req.body

    const sql =`
    INSERT INTO payments
    (bill_id,meter_id, payment_date, amount_paid)
    VALUE(?,?,?,?)`;

    db.query(
        sql,
        [bill_id,meter_id, payment_date, amount_paid],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500);
            }

            res.status(201).json({
                message: 'Payment successful'
            })
        }
    );
});

// print payments
app.get('/api/print_payments',(req,res) =>{
    const search = req.query.q;

    const sql = `
    SELECT * FROM print_payments
    WHERE payment_id = ?`;

    const search_value = `${search}`

    db.query(
        sql,
        [
            search_value
        ],
        (err, results)=>{
        if (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Failed to retrive data'
            });
        }
        res.json(results);
    });
});

// server
app.get('/', (req,res) => {
    res.send(`server is running`);
});

app.listen(3000,() => {
    console.log(`server is listening at port 3000`);
});