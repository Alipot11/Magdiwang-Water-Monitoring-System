const express = require('express');
const router = express.Router();
const db = require('../../database.js');
const { require_admin } = require('../middleware/auth.js');


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


router.post('/', require_admin, async (req, res) => {

    let {
        meter_id,
        first_name,
        last_name,
        barangay,
        sitio
    } = req.body;


    // --------------------------------
    // 1. CHECK REQUIRED VALUES
    // --------------------------------

    if (
        meter_id === undefined ||
        first_name === undefined ||
        last_name === undefined ||
        barangay === undefined ||
        sitio === undefined
    ) {
        return res.status(400).json({
            success: false,
            message: 'All registration fields are required'
        });
    }


    // --------------------------------
    // 2. VALIDATE METER ID
    // --------------------------------

    meter_id = String(meter_id).trim();

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


    // --------------------------------
    // 3. CLEAN TEXT VALUES
    // --------------------------------

    first_name = String(first_name).trim();
    last_name = String(last_name).trim();
    barangay = String(barangay).trim().toLowerCase();
    sitio = String(sitio).trim();


    // --------------------------------
    // 4. VALIDATE FIRST NAME
    // --------------------------------

    if (!first_name) {
        return res.status(400).json({
            success: false,
            message: 'First name is required'
        });
    }

    if (first_name.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'First name is too long'
        });
    }


    // --------------------------------
    // 5. VALIDATE LAST NAME
    // --------------------------------

    if (!last_name) {
        return res.status(400).json({
            success: false,
            message: 'Last name is required'
        });
    }

    if (last_name.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Last name is too long'
        });
    }


    // --------------------------------
    // 6. VALIDATE BARANGAY
    // --------------------------------

    if (!VALID_BARANGAYS.has(barangay)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid barangay'
        });
    }


    // --------------------------------
    // 7. VALIDATE SITIO
    // --------------------------------

    if (!sitio) {
        return res.status(400).json({
            success: false,
            message: 'Sitio is required'
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


        // --------------------------------
        // 8. INSERT CUSTOMER
        // --------------------------------

        await connection.query(
            `
                INSERT INTO customers
                (
                    meter_id,
                    first_name,
                    last_name,
                    barangay,
                    sitio
                )
                VALUES (?, ?, ?, ?, ?)
            `,
            [
                meterNumber,
                first_name,
                last_name,
                barangay,
                sitio
            ]
        );


        // --------------------------------
        // 9. INSERT AUDIT LOG
        // --------------------------------

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
                meterNumber,
                first_name,
                last_name,
                'CREATE',
                'customers',
                meterNumber,
                `Customer account created for meter ${meterNumber}`
            ]
        );


        // --------------------------------
        // 10. COMMIT
        // --------------------------------

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Account registered successfully'
        });

    } catch (err) {

        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Registration rollback error:', rollbackError);
            }
        }

        console.error('Registration error:', err);


        // Duplicate meter ID
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'A customer with this meter number already exists'
            });
        }


        return res.status(500).json({
            success: false,
            message: 'Failed to register account'
        });

    } finally {

        if (connection) {
            connection.release();
        }
    }
});


module.exports = router;