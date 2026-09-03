const express = require ('express');
const router = express.Router();
const db = require('../../database.js');


// post account to database
router.post('/',(req,res) => {
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

module.exports = router