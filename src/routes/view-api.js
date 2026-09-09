const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../../database.js');
const { require_staff } = require('../middleware/auth.js');


const publicAccountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,                  // maximum 30 lookups
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many account lookups. Please try again later.'
    }
});


// Staff: get accounts
router.get('/', require_staff, (req, res) => {

    const sql = `
        SELECT
            meter_id,
            first_name,
            last_name,
            barangay,
            sitio
        FROM customers
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error('Retrieve accounts error:', err);

            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve data'
            });
        }

        res.json({
            success: true,
            accounts: results
        });
    });
});


// Staff: search account
router.get('/search', require_staff, (req, res) => {

    const search = req.query.q?.trim();

    if (!search) {
        return res.status(400).json({
            success: false,
            message: 'Search value is required'
        });
    }

    const sql = `
        SELECT *
        FROM client_history
        WHERE meter_id = ?
    `;

    db.query(sql, [search], (err, results) => {

        if (err) {
            console.error('Search account error:', err);

            return res.status(500).json({
                success: false,
                message: 'Search failed'
            });
        }

        res.json({
            success: true,
            accounts: results
        });
    });
});

// Public resident account lookup (read-only)
router.get('/search/account/:meter_id',publicAccountLimiter, (req, res) => {

    // Do not cache personal account information
    res.set('Cache-Control', 'no-store');

    const meterId = req.params.meter_id;

    // Meter IDs are integers in the database.
    // Reject malformed values before querying the database.
    if (!/^\d+$/.test(meterId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid meter number'
        });
    }

    const meterNumber = Number(meterId);

    // MySQL INT range + reject zero/negative values
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
    // 1. FIND CLIENT
    // --------------------------------

    const clientSql = `
        SELECT
            meter_id,
            first_name,
            last_name,
            barangay,
            sitio
        FROM customers
        WHERE meter_id = ?
        LIMIT 1
    `;

    db.query(clientSql, [meterNumber], (err, clients) => {

        if (err) {
            console.error('Public client lookup error:', err);

            return res.status(500).json({
                success: false,
                message: 'Unable to retrieve account'
            });
        }

        if (clients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Account not found'
            });
        }

        const client = clients[0];


        // --------------------------------
        // 2. GET UNPAID BILLS
        // --------------------------------

        const unpaidBillsSql = `
            SELECT
                bill_id,
                meter_id,
                pre_reading,
                curr_reading,
                tcmeter,
                amount,
                surcharge,
                bill_amount,
                duedate,
                total_paid,
                balance,
                status
            FROM client_bills
            WHERE meter_id = ?
            ORDER BY duedate ASC, bill_id ASC
        `;

        db.query(
            unpaidBillsSql,
            [meterNumber],
            (err, unpaidBills) => {

                if (err) {
                    console.error(
                        'Public unpaid bills error:',
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: 'Unable to retrieve bills'
                    });
                }


                // --------------------------------
                // 3. GET PAYMENT HISTORY
                // --------------------------------

                const historySql = `
                    SELECT
                        payment_id,
                        bill_id,
                        meter_id,
                        payment_date,
                        amount_paid
                    FROM client_payment_history
                    WHERE meter_id = ?
                    ORDER BY payment_date DESC, payment_id DESC
                `;

                db.query(
                    historySql,
                    [meterNumber],
                    (err, paymentHistory) => {

                        if (err) {
                            console.error(
                                'Public payment history error:',
                                err
                            );

                            return res.status(500).json({
                                success: false,
                                message: 'Unable to retrieve payment history'
                            });
                        }


                        // --------------------------------
                        // 4. RETURN ONLY REQUIRED DATA
                        // --------------------------------

                        return res.json({
                            success: true,
                            client,
                            unpaidBills,
                            paymentHistory
                        });
                    }
                );
            }
        );
    });
});


module.exports = router