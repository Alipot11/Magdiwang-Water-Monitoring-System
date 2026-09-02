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

    db.query (
        sql,
        [
            search
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

// get bills from the database
app.get('/api/bills/account/:meter_id',(req, res)=>{
    const meter_id = req.params.meter_id;

    const sql = `
        SELECT
            b.bill_id,
            b.meter_id,
            b.bill_amount,
            b.duedate,

            COALESCE(SUM(p.amount_paid), 0) AS total_paid,

            GREATEST(
                b.bill_amount - COALESCE(SUM(p.amount_paid), 0),
                0
            ) AS balance,

            CASE
                WHEN COALESCE(SUM(p.amount_paid), 0) >= b.bill_amount
                    THEN 'PAID'

                WHEN COALESCE(SUM(p.amount_paid), 0) > 0
                    THEN 'PARTIAL'

                ELSE 'UNPAID'
            END AS status

        FROM bills AS b

        LEFT JOIN payments AS p
            ON b.bill_id = p.bill_id

        WHERE b.meter_id = ?

        GROUP BY
            b.bill_id,
            b.meter_id,
            b.bill_amount,
            b.duedate

        ORDER BY b.duedate ASC
    `;

    db.query(
        sql,
        [meter_id],
        (err, results) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: 'Failed to load bills'
                });
            }

            res.json(results);
        }
    );
})

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
app.post('/api/payments', (req, res) => {

    const {
        bill_id,
        meter_id,
        payment_date,
        amount_paid
    } = req.body;


    // Basic validation
    if (!bill_id || !meter_id || !payment_date || !amount_paid) {
        return res.status(400).json({
            message: 'All payment fields are required'
        });
    }


    const billSql = `
        SELECT
            b.bill_id,
            b.meter_id,
            b.bill_amount,

            COALESCE(
                SUM(p.amount_paid),
                0
            ) AS total_paid

        FROM bills AS b

        LEFT JOIN payments AS p
            ON b.bill_id = p.bill_id

        WHERE b.bill_id = ?
          AND b.meter_id = ?

        GROUP BY
            b.bill_id,
            b.meter_id,
            b.bill_amount
    `;


    db.query(
        billSql,
        [bill_id, meter_id],
        (err, results) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: 'Failed to verify bill'
                });
            }


            // Bill doesn't exist or doesn't belong to meter
            if (results.length === 0) {

                return res.status(404).json({
                    message: 'Bill not found for this meter'
                });
            }


            const bill = results[0];

            const billAmount =
                Number(bill.bill_amount);

            const totalPaid =
                Number(bill.total_paid);

            const currentBalance =
                Math.max(
                    billAmount - totalPaid,
                    0
                );

            const paymentAmount =
                Number(amount_paid);


            // Don't allow payment of zero/negative amount
            if (paymentAmount <= 0) {

                return res.status(400).json({
                    message: 'Payment amount must be greater than zero'
                });
            }


            // Don't allow overpayment
            if (paymentAmount > currentBalance) {

                return res.status(400).json({
                    message:
                        `Payment exceeds remaining balance of ₱${currentBalance.toFixed(2)}`
                });
            }


            // Insert payment
            const insertSql = `
                INSERT INTO payments
                    (bill_id, meter_id, payment_date, amount_paid)
                VALUES
                    (?, ?, ?, ?)
            `;


            db.query(
                insertSql,
                [
                    bill_id,
                    meter_id,
                    payment_date,
                    paymentAmount
                ],
                (err) => {

                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            message: 'Payment failed'
                        });
                    }


                    res.status(201).json({
                        message: 'Payment successful'
                    });

                }
            );

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