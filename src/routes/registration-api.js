const express = require ('express');
const router = express.Router();
const db = require('../../database.js');
const {require_admin} = require('../middleware/auth.js')


// post account to database
router.post('/',require_admin,(req,res) => {
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
    VALUES (?,?,?,?,?)`;

    db.query(
        sql,
        [meter_id, first_name, last_name, barangay, sitio],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to register account'
                })
            }
            
            res.status(201).json({
                success: true,
                message: 'Account registered successfully'
            })
        }
    );
})


module.exports = router