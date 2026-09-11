const express = require('express');
const router = express.Router();
const db = require('../../database.js');
const { require_payment_access } = require('../middleware/auth.js');

router.post('/', require_payment_access, async (req, res) => {

    const {
        bill_id,
        meter_id,
        payment_date,
        amount_paid
    } = req.body;

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

    if (!Number.isSafeInteger(billId) || billId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid bill ID'
        });
    }

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

    if (
        typeof payment_date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(payment_date)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment date'
        });
    }

    const [year, month, day] = payment_date.split('-').map(Number);
    const paymentDate = new Date(year, month - 1, day);

    if (
        paymentDate.getFullYear() !== year ||
        paymentDate.getMonth() !== month - 1 ||
        paymentDate.getDate() !== day
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment date'
        });
    }

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

    let connection;

    try {

        connection = await db.promise().getConnection();

        await connection.beginTransaction();

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

        if (billResults.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }

        const bill = billResults[0];

        if (Number(bill.meter_id) !== meterNumber) {

            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Bill does not belong to this meter'
            });
        }

        const [customerResults] = await connection.query(
            `
                SELECT
                    meter_id,
                    first_name,
                    last_name
                FROM customers
                WHERE meter_id = ?
                LIMIT 1
            `,
            [meterNumber]
        );

        if (customerResults.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Meter account not found'
            });
        }

        const customer = customerResults[0];

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

        if (paymentAmount > currentBalance) {

            await connection.rollback();

            return res.status(400).json({
                success: false,
                message:
                    `Payment exceeds remaining balance of ₱${currentBalance.toFixed(2)}`
            });
        }

        const [insertResult] = await connection.query(
            `
                INSERT INTO payments
                (
                    bill_id,
                    payment_date,
                    amount_paid
                )
                VALUES (?, ?, ?)
            `,
            [
                billId,
                payment_date,
                paymentAmount
            ]
        );

        await connection.query(
            `
                INSERT INTO audit_logs
                (
                    user_id,
                    meter_id,
                    owner_first_name,
                    owner_last_name,
                    action,
                    table_name,
                    record_id,
                    description
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                req.session.user.user_id,
                customer.meter_id,
                customer.first_name,
                customer.last_name,
                'CREATE',
                'payments',
                insertResult.insertId,
                `Payment #${insertResult.insertId} recorded for meter ${customer.meter_id}`
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Payment successful',
            payment_id: insertResult.insertId
        });

    } catch (err) {

        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Payment rollback error:', rollbackError);
            }
        }

        console.error('Payment transaction error:', err);

        return res.status(500).json({
            success: false,
            message: 'Payment failed'
        });

    } finally {

        if (connection) {
            connection.release();
        }
    }
});

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

    if (payment_id !== undefined) {

        if (!/^\d+$/.test(String(payment_id))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment ID'
            });
        }

        const paymentId = Number(payment_id);

        if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
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

    } else if (meter_id !== undefined) {

        if (!/^\d+$/.test(String(meter_id))) {
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

module.exports = router;