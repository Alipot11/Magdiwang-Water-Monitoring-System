const express = require ('express');
const router = express.Router();
const db = require('../../database.js');



// get accounts from the database
router.get('/', (req, res) => {
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
router.get('/search', (req, res) => {
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

// search account by the user
router.get('/search/:meter_id', (req, res) => {

    const meterId = req.params.meter_id;


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
    `;


    db.query(clientSql, [meterId], (err, clients) => {

        if (err) {
            console.error('Client search error:', err);

            return res.status(500).json({
                success: false,
                message: 'Failed to find client'
            });
        }


        // Client doesn't exist
        if (clients.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'Client not found.'
            });
        }


        const client = clients[0];


        // --------------------------------
        // 2. GET UNPAID BILLS
        // --------------------------------

        const unpaidBillsSql = `
            SELECT *
            FROM client_bills
            WHERE meter_id = ?
            ORDER BY duedate ASC, bill_id ASC
        `;


        db.query(
            unpaidBillsSql,
            [meterId],
            (err, unpaidBills) => {

                if (err) {
                    console.error('Unpaid bills error:', err);

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to retrieve unpaid bills'
                    });
                }


                // --------------------------------
                // 3. GET PAYMENT HISTORY
                // --------------------------------

                const historySql = `
                    SELECT *
                    FROM client_payment_history
                    WHERE meter_id = ?
                    ORDER BY payment_date DESC, payment_id DESC
                `;


                db.query(
                    historySql,
                    [meterId],
                    (err, paymentHistory) => {

                        if (err) {
                            console.error(
                                'Payment history error:',
                                err
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    'Failed to retrieve payment history'
                            });
                        }


                        // --------------------------------
                        // 4. SEND EVERYTHING TO CLIENT
                        // --------------------------------

                        res.json({
                            success: true,

                            client: client,

                            unpaidBills: unpaidBills,

                            paymentHistory: paymentHistory
                        });

                    }
                );

            }
        );

    });

});

module.exports = router