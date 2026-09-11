const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../../database.js');
const { require_admin, require_staff } = require('../middleware/auth.js');


const VALID_BARANGAYS = new Set([
    'agutay',
    'agsao',
    'ipil',
    'ambulong',
    'poblacion',
    'jao-asan',
    'dulangan',
    'tampayan',
    'silum'
]);


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
           OR first_name LIKE ?
           OR last_name LIKE ?
           OR CONCAT(first_name, ' ', last_name) LIKE ?
        ORDER BY first_name, last_name, meter_id
    `;

    const nameSearch = `%${search}%`;

    db.query(
        sql,
        [search, nameSearch, nameSearch, nameSearch],
        (err, results) => {

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
        }
    );
});


// GETS THE ACCOUNT TO BE EDITED
router.get('/edit/:meter_id', require_admin, (req, res) => {

    const meterId = req.params.meter_id;

    if (!/^\d+$/.test(meterId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid meter ID'
        });
    }

    const sql = `
        SELECT meter_id, first_name, last_name, barangay, sitio
        FROM customers
        WHERE meter_id = ?
    `;

    db.query(sql, [meterId], (err, results) => {

        if (err) {
            console.error('Get account for edit error:', err);

            return res.status(500).json({
                success: false,
                message: 'Failed to load account'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Account not found'
            });
        }

        res.json({
            success: true,
            account: results[0]
        });
    });
});


// EDIT CLIENT INFORMATIONS
router.put('/edit/:meter_id', require_admin, async (req, res) => {
    const meterId = req.params.meter_id;

    if (!/^\d+$/.test(meterId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid meter ID'
        });
    }

    const meterNumber = Number(meterId);

    if (!Number.isSafeInteger(meterNumber) || meterNumber < 1 || meterNumber > 2147483647) {
        return res.status(400).json({
            success: false,
            message: 'Invalid meter ID'
        });
    }

    let { first_name, last_name, barangay, sitio } = req.body;

    if (
        typeof first_name !== 'string' ||
        typeof last_name !== 'string' ||
        typeof barangay !== 'string' ||
        typeof sitio !== 'string'
    ) {
        return res.status(400).json({
            success: false,
            message: 'All customer fields are required'
        });
    }

    first_name = first_name.trim();
    last_name = last_name.trim();
    barangay = barangay.trim().toLowerCase();
    sitio = sitio.trim();

    if (!first_name || !last_name || !barangay || !sitio) {
        return res.status(400).json({
            success: false,
            message: 'All customer fields are required'
        });
    }

    if (first_name.length > 100 || last_name.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Name is too long'
        });
    }

    if (!VALID_BARANGAYS.has(barangay)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid barangay'
        });
    }

    if (sitio.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Sitio is too long'
        });
    }

    let connection;

    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        const [customers] = await connection.query(
            `SELECT meter_id, first_name, last_name, barangay, sitio
             FROM customers
             WHERE meter_id = ?
             LIMIT 1
             FOR UPDATE`,
            [meterNumber]
        );

        if (customers.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Customer account not found'
            });
        }

        const customer = customers[0];

        const changes = [];

        if (customer.first_name !== first_name) {
            changes.push('first name');
        }

        if (customer.last_name !== last_name) {
            changes.push('last name');
        }

        if (customer.barangay !== barangay) {
            changes.push('barangay');
        }

        if (customer.sitio !== sitio) {
            changes.push('sitio');
        }

        if (changes.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'No changes to update'
            });
        }

        await connection.query(
            `UPDATE customers
             SET first_name = ?,
                 last_name = ?,
                 barangay = ?,
                 sitio = ?
             WHERE meter_id = ?`,
            [first_name, last_name, barangay, sitio, meterNumber]
        );

        const description =
            `Customer account updated for meter ${meterNumber}; ` +
            `owner: "${customer.first_name} ${customer.last_name}" -> ` +
            `"${first_name} ${last_name}"; ` +
            `changed: ${changes.join(', ')}`;

        await connection.query(
            `INSERT INTO audit_logs
             (user_id, meter_id, owner_first_name, owner_last_name,
              action, table_name, record_id, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.user.user_id,
                meterNumber,
                first_name,
                last_name,
                'UPDATE',
                'customers',
                meterNumber,
                description
            ]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Customer account updated successfully'
        });
    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Edit rollback error:', rollbackError);
            }
        }

        console.error('Edit customer error:', err);

        return res.status(500).json({
            success: false,
            message: 'Failed to update customer account'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// DELETE A CLIENT
router.delete('/delete/:meter_id', require_admin, async (req, res) => {
    const meterId = req.params.meter_id;

    if (!/^\d+$/.test(meterId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid meter ID'
        });
    }

    const meterNumber = Number(meterId);

    if (!Number.isSafeInteger(meterNumber) || meterNumber < 1 || meterNumber > 2147483647) {
        return res.status(400).json({
            success: false,
            message: 'Invalid meter ID'
        });
    }

    let connection;

    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        const [customers] = await connection.query(
            `SELECT meter_id, first_name, last_name
             FROM customers
             WHERE meter_id = ?
             LIMIT 1
             FOR UPDATE`,
            [meterNumber]
        );

        if (customers.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Customer account not found'
            });
        }

        const customer = customers[0];

        const [bills] = await connection.query(
            `SELECT COUNT(*) AS count
             FROM bills
             WHERE meter_id = ?`,
            [meterNumber]
        );

        if (Number(bills[0].count) > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'Customer cannot be deleted because billing records exist'
            });
        }

        const [payments] = await connection.query(
            `SELECT COUNT(*) AS count
             FROM payments
             WHERE meter_id = ?`,
            [meterNumber]
        );

        if (Number(payments[0].count) > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'Customer cannot be deleted because payment records exist'
            });
        }

        await connection.query(
            `DELETE FROM customers
             WHERE meter_id = ?`,
            [meterNumber]
        );

        await connection.query(
            `INSERT INTO audit_logs
             (user_id, meter_id, owner_first_name, owner_last_name,
              action, table_name, record_id, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.user.user_id,
                meterNumber,
                customer.first_name,
                customer.last_name,
                'DELETE',
                'customers',
                meterNumber,
                `Customer account deleted for meter ${meterNumber}`
            ]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Customer account deleted successfully'
        });
    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Delete rollback error:', rollbackError);
            }
        }

        console.error('Delete customer error:', err);

        return res.status(500).json({
            success: false,
            message: 'Failed to delete customer account'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// STAFF AUDIT LOG 
router.get('/audit-logs', require_admin, async (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 50);

    if (!Number.isInteger(page) || page < 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid page'
        });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
            success: false,
            message: 'Invalid limit'
        });
    }

    const offset = (page - 1) * limit;

    try {
        const [logs] = await db.promise().query(
            `SELECT
                a.audit_id,
                a.user_id,
                u.username,
                u.full_name,
                a.meter_id,
                a.owner_first_name,
                a.owner_last_name,
                a.action,
                a.table_name,
                a.record_id,
                a.description,
                a.created_at
            FROM audit_logs a
            INNER JOIN admin_users u ON a.user_id = u.user_id
            ORDER BY a.created_at DESC, a.audit_id DESC
            LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[countResult]] = await db.promise().query(
            `SELECT COUNT(*) AS total
             FROM audit_logs`
        );

        res.set('Cache-Control', 'no-store');

        return res.status(200).json({
            success: true,
            logs,
            pagination: {
                page,
                limit,
                total: Number(countResult.total),
                totalPages: Math.ceil(Number(countResult.total) / limit)
            }
        });
    } catch (err) {
        console.error('Audit log error:', err);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve audit logs'
        });
    }
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