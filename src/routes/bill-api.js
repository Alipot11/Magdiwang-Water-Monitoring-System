const express = require ('express');
const router = express.Router();
const db = require('../../database.js');


// post bills to database
router.post('/',(req,res)=>{
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

// get bills from the database
router.get('/account/:meter_id',(req, res)=>{
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
});

module.exports = router