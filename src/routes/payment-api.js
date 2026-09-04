const express = require ('express');
const router = express.Router();
const db = require('../../database.js');
const {require_payment_access} = require('../middleware/auth.js')

// post payment to database
router.post('/',require_payment_access,(req, res) => {
    const {
        bill_id,
        meter_id,
        payment_date,
        amount_paid
    } = req.body;


    // Basic validation
    if (!bill_id || !meter_id || !payment_date || amount_paid === undefined) {
        return res.status(400).json({
            success: false,
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
                    success: true,
                    message: 'Failed to verify bill'
                });
            }


            // Bill doesn't exist or doesn't belong to meter
            if (results.length === 0) {

                return res.status(404).json({
                    success: false,
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
                    success: false,
                    message: 'Payment amount must be greater than zero'
                });
            }


            // Don't allow overpayment
            if (paymentAmount > currentBalance) {

                return res.status(400).json({
                    success: false,
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
                            success: false,
                            message: 'Payment failed'
                        });
                    }


                    res.status(201).json({
                        success: true,
                        message: 'Payment successful'
                    });

                }
            );

        }
    );
});
// print payments
router.get('/print', require_payment_access,(req,res) =>{
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
                success: false,
                message: 'Failed to retrive data'
            });
        }
        res.json(results);
    });
});

module.exports = router