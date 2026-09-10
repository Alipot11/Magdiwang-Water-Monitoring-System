const express = require ('express');
const router = express.Router();
const db = require('../../database.js');
const {require_admin, require_staff} = require('../middleware/auth.js')


// Post a bill
router.post('/', require_admin, (req, res) => {

    const {
        meter_id,
        curr_reading,
        pre_reading,
        tcmeter,
        amount,
        surcharge,
        bill_amount,
        duedate
    } = req.body;


    // --------------------------------
    // 1. VALIDATE METER NUMBER
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
    // 2. CONVERT NUMERIC VALUES
    // --------------------------------

    const currentReading = Number(curr_reading);
    const previousReading = Number(pre_reading);
    const totalCubicMeter = Number(tcmeter);
    const billAmount = Number(amount);
    const surchargeAmount = Number(surcharge);
    const finalBillAmount = Number(bill_amount);


    // --------------------------------
    // 3. VALIDATE NUMBERS
    // --------------------------------

    if (
        !Number.isFinite(currentReading) ||
        !Number.isFinite(previousReading) ||
        !Number.isFinite(totalCubicMeter) ||
        !Number.isFinite(billAmount) ||
        !Number.isFinite(surchargeAmount) ||
        !Number.isFinite(finalBillAmount)
    ) {
        return res.status(400).json({
            success: false,
            message: 'All bill amounts and readings must be valid numbers'
        });
    }


    // --------------------------------
    // 4. VALIDATE NON-NEGATIVE VALUES
    // --------------------------------

    if (
        currentReading < 0 ||
        previousReading < 0 ||
        totalCubicMeter < 0 ||
        billAmount < 0 ||
        surchargeAmount < 0 ||
        finalBillAmount < 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Bill values cannot be negative'
        });
    }


    // --------------------------------
    // 5. VALIDATE METER READINGS
    // --------------------------------

    if (currentReading < previousReading) {
        return res.status(400).json({
            success: false,
            message: 'Current reading cannot be less than previous reading'
        });
    }


    // --------------------------------
    // 6. VALIDATE DUE DATE
    // --------------------------------

    if (
        typeof duedate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(duedate)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid due date'
        });
    }


    // --------------------------------
    // 7. CHECK THAT ACCOUNT EXISTS
    // --------------------------------

    const customerSql = `
        SELECT meter_id
        FROM customers
        WHERE meter_id = ?
        LIMIT 1
    `;

    db.query(customerSql, [meterNumber], (err, customers) => {

        if (err) {
            console.error('Customer validation error:', err);

            return res.status(500).json({
                success: false,
                message: 'Unable to validate account'
            });
        }

        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Meter account not found'
            });
        }


        // --------------------------------
        // 8. INSERT BILL
        // --------------------------------

        const sql = `
            INSERT INTO bills
            (
                meter_id,
                curr_reading,
                pre_reading,
                tcmeter,
                amount,
                surcharge,
                bill_amount,
                duedate
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [
                meterNumber,
                currentReading,
                previousReading,
                totalCubicMeter,
                billAmount,
                surchargeAmount,
                finalBillAmount,
                duedate
            ],
            (err, result) => {

                if (err) {
                    console.error('Post bill error:', err);

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to post bill'
                    });
                }

                return res.status(201).json({
                    success: true,
                    message: 'Bill posted',
                    bill_id: result.insertId
                });
            }
        );
    });
});


// Staff: get bills for an account
router.get('/account/:meter_id', require_staff, (req, res) => {

    const meter_id = req.params.meter_id;

    // Validate meter number
    if (!/^\d+$/.test(meter_id)) {
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
        [meterNumber],
        (err, results) => {

            if (err) {
                console.error('Retrieve account bills error:', err);

                return res.status(500).json({
                    success: false,
                    message: 'Failed to load bills'
                });
            }

            return res.json({
                success: true,
                bills: results
            });
        }
    );
});


module.exports = router