const express = require ('express');
const router = express.Router();
const db = require('../../database.js');
const {require_payment_access} = require('../middleware/auth.js')


// Post payment
router.post('/', require_payment_access, async (req, res) => {

    const {
        bill_id,
        meter_id,
        payment_date,
        amount_paid
    } = req.body;


    // --------------------------------
    // 1. VALIDATE BILL ID
    // --------------------------------

    if (
        bill_id === undefined ||
        bill_id === null ||
        !/^\d+$/.test(String(bill_id))
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid bill ID'
        });
    }

    const billId = Number(bill_id);

    if (
        !Number.isSafeInteger(billId) ||
        billId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid bill ID'
        });
    }


    // --------------------------------
    // 2. VALIDATE METER NUMBER
    // --------------------------------

    if (
        meter_id === undefined ||
        meter_id === null ||
        !/^\d+$/.test(String(meter_id))
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid meter number'
        });
    }

    const meterNumber = Number(meter_id);

    if (
        !Number.isSafeInteger(meterNumber) ||
        meterNumber <= 0 ||
        meterNumber > 2147483647
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid meter number'
        });
    }


    // --------------------------------
    // 3. VALIDATE PAYMENT DATE
    // --------------------------------

    if (
        typeof payment_date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(payment_date)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment date'
        });
    }


    // --------------------------------
    // 4. VALIDATE PAYMENT AMOUNT
    // --------------------------------

    if (
        amount_paid === undefined ||
        amount_paid === null ||
        amount_paid === ''
    ) {
        return res.status(400).json({
            success: false,
            message: 'Payment amount is required'
        });
    }

    const paymentAmount = Number(amount_paid);

    if (
        !Number.isFinite(paymentAmount) ||
        !Number.isInteger(paymentAmount)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Payment amount must be a whole number'
        });
    }

    if (paymentAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Payment amount must be greater than zero'
        });
    }


    // --------------------------------
    // 5. GET DATABASE CONNECTION
    // --------------------------------

    let connection;

    try {

        connection = await db.promise().getConnection();

        // --------------------------------
        // 6. START TRANSACTION
        // --------------------------------

        await connection.beginTransaction();


        // --------------------------------
        // 7. LOCK THE BILL
        // --------------------------------

        const [billResults] = await connection.query(
            `
                SELECT
                    bill_id,
                    meter_id,
                    bill_amount
                FROM bills
                WHERE bill_id = ?
                LIMIT 1
                FOR UPDATE
            `,
            [billId]
        );


        // Bill doesn't exist
        if (billResults.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }


        const bill = billResults[0];


        // --------------------------------
        // 8. VERIFY METER BELONGS TO BILL
        // --------------------------------

        if (Number(bill.meter_id) !== meterNumber) {

            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Bill does not belong to this meter'
            });
        }


        // --------------------------------
        // 9. GET TOTAL PAID WHILE BILL IS LOCKED
        // --------------------------------

        const [paymentResults] = await connection.query(
            `
                SELECT
                    COALESCE(SUM(amount_paid), 0) AS total_paid
                FROM payments
                WHERE bill_id = ?
            `,
            [billId]
        );


        const billAmount = Number(bill.bill_amount);
        const totalPaid = Number(paymentResults[0].total_paid);

        const currentBalance = Math.max(
            billAmount - totalPaid,
            0
        );


        // --------------------------------
        // 10. CHECK OVERPAYMENT
        // --------------------------------

        if (paymentAmount > currentBalance) {

            await connection.rollback();

            return res.status(400).json({
                success: false,
                message:
                    `Payment exceeds remaining balance of ₱${currentBalance.toFixed(2)}`
            });
        }


        // --------------------------------
        // 11. INSERT PAYMENT
        // --------------------------------

        const [insertResult] = await connection.query(
            `
                INSERT INTO payments
                (
                    bill_id,
                    meter_id,
                    payment_date,
                    amount_paid
                )
                VALUES (?, ?, ?, ?)
            `,
            [
                billId,
                meterNumber,
                payment_date,
                paymentAmount
            ]
        );


        // --------------------------------
        // 12. COMMIT
        // --------------------------------

        await connection.commit();


        return res.status(201).json({
            success: true,
            message: 'Payment successful',
            payment_id: insertResult.insertId
        });


    } catch (err) {

        // --------------------------------
        // 13. ROLLBACK ON ERROR
        // --------------------------------

        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    'Payment rollback error:',
                    rollbackError
                );
            }
        }

        console.error('Payment transaction error:', err);

        return res.status(500).json({
            success: false,
            message: 'Payment failed'
        });

    } finally {

        // --------------------------------
        // 14. RELEASE CONNECTION
        // --------------------------------

        if (connection) {
            connection.release();
        }
    }
});

// get payment records for printing
// Get payment records for printing
router.get('/print', require_payment_access, (req, res) => {

    const { meter_id, payment_id } = req.query;

    let sql = `
        SELECT
            payment_id,
            payment_date,
            amount_paid,
            bill_id,
            meter_id,
            first_name,
            last_name,
            barangay,
            sitio,
            pre_reading,
            curr_reading,
            tcmeter,
            amount,
            surcharge,
            bill_amount,
            duedate
        FROM print_payments
    `;

    let value;

    // --------------------------------
    // 1. SEARCH BY PAYMENT ID
    // --------------------------------

    if (payment_id !== undefined) {

        if (
            !/^\d+$/.test(String(payment_id))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment ID'
            });
        }

        const paymentId = Number(payment_id);

        if (
            !Number.isSafeInteger(paymentId) ||
            paymentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment ID'
            });
        }

        sql += `
            WHERE payment_id = ?
            ORDER BY payment_id DESC
        `;

        value = paymentId;

    // --------------------------------
    // 2. SEARCH BY METER NUMBER
    // --------------------------------

    } else if (meter_id !== undefined) {

        if (
            !/^\d+$/.test(String(meter_id))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meter number'
            });
        }

        const meterNumber = Number(meter_id);

        if (
            !Number.isSafeInteger(meterNumber) ||
            meterNumber <= 0 ||
            meterNumber > 2147483647
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meter number'
            });
        }

        sql += `
            WHERE meter_id = ?
            ORDER BY payment_date DESC, payment_id DESC
        `;

        value = meterNumber;

    } else {

        return res.status(400).json({
            success: false,
            message: 'Meter ID or Payment ID is required'
        });
    }


    // --------------------------------
    // 3. QUERY DATABASE
    // --------------------------------

    db.query(sql, [value], (err, results) => {

        if (err) {

            console.error('Print payment error:', err);

            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve payment records'
            });
        }

        return res.json({
            success: true,
            payments: results
        });
    });
});

module.exports = router