const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../../database.js');
const bcrypt = require('bcryptjs');
const {
    csrf_token,
    require_csrf
} = require('../middleware/csrf.js');
const { require_login, require_admin } = require('../middleware/auth.js');


// --------------------------------
// LOGIN RATE LIMITER
// --------------------------------
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                  // maximum 10 login attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again later.'
    }
});


// --------------------------------
// ADMIN / STAFF LOGIN
// --------------------------------
router.post('/login', loginLimiter, (req, res) => {

    let { username, password } = req.body;

    // Make sure values are strings before processing them
    if (
        typeof username !== 'string' ||
        typeof password !== 'string' ||
        !username.trim() ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required.'
        });
    }

    username = username.trim();


    const sql = `
        SELECT
            user_id,
            username,
            password_hash,
            full_name,
            role,
            is_active
        FROM admin_users
        WHERE username = ?
        LIMIT 1
    `;

    db.query(sql, [username], async (err, results) => {

        if (err) {
            console.error('Login error:', err);

            return res.status(500).json({
                success: false,
                message: 'Login failed.'
            });
        }


        // --------------------------------
        // USER NOT FOUND
        // --------------------------------

        if (results.length === 0) {

            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }


        const user = results[0];


        // --------------------------------
        // ACCOUNT DISABLED
        // --------------------------------

        if (!user.is_active) {

            return res.status(403).json({
                success: false,
                message: 'This account has been disabled.'
            });
        }


        // --------------------------------
        // CHECK PASSWORD
        // --------------------------------

        let passwordMatch;

        try {
            passwordMatch = await bcrypt.compare(
                password,
                user.password_hash
            );
        } catch (error) {
            console.error('Password verification error:', error);

            return res.status(500).json({
                success: false,
                message: 'Login failed.'
            });
        }


        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }


        // ================================
        // REGENERATE SESSION ID
        // ================================
        // This prevents session fixation after login.

        req.session.regenerate((err) => {

            if (err) {
                console.error('Session regeneration error:', err);

                return res.status(500).json({
                    success: false,
                    message: 'Login failed.'
                });
            }


            // ================================
            // CREATE AUTHENTICATED SESSION
            // ================================

            req.session.user = {
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            };


            return res.json({
                success: true,
                message: 'Login successful.',
                user: req.session.user
            });
        });
    });
});


// ================================
// SESSION CHECK
// ================================

router.get('/me', require_login, (req, res) => {

    res.json({
        success: true,
        user: req.session.user
    });
});


router.get('/csrf-token', require_login, csrf_token);


// ================================
// LOGOUT
// ================================
router.post('/logout', require_login, require_csrf, (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            console.error('Logout error:', err);

            return res.status(500).json({
                success: false,
                message: 'Failed to logout.'
            });
        }


        res.json({
            success: true,
            message: 'Logged out successfully.'
        });
    });
});


//======================================================
// ASK FOR AN ADMIN WHEN CREATING A NEW ADMIN/TREASURER
//======================================================
router.get('/users', require_admin, async (req, res) => {
    try {
        const [users] = await db.promise().query(`
            SELECT
                user_id,
                username,
                full_name,
                role,
                is_active,
                created_at
            FROM admin_users
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Failed to retrieve admin users:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve users.'
        });
    }
});


//=====================================
// ADMIN/TREASURER ACCOUNT CREATION
//=====================================
router.post('/users', require_admin, require_csrf, async (req, res) => {
    const {
        username,
        password,
        full_name,
        role
    } = req.body;

    if (
        typeof username !== 'string' ||
        typeof password !== 'string' ||
        typeof full_name !== 'string' ||
        typeof role !== 'string'
    ) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required.'
        });
    }

    const cleanUsername = username.trim();
    const cleanFullName = full_name.trim();

    if (
        /[\u0000-\u001F\u007F]/.test(cleanUsername) ||
        /[\u0000-\u001F\u007F]/.test(cleanFullName)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid account information.'
        });
    }

    if (
        cleanUsername.length < 3 ||
        cleanUsername.length > 255 ||
        cleanFullName.length < 2 ||
        cleanFullName.length > 100
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid account information.'
        });
    }

    if (!['admin', 'treasurer'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role.'
        });
    }

    if (
        password.length < 12 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Password does not meet the required strength.'
        });
    }

    let connection;

    try {
        const passwordHash = await bcrypt.hash(password, 12);

        connection = await db.promise().getConnection();

        await connection.beginTransaction();

        const [result] = await connection.query(
            `
            INSERT INTO admin_users
                (username, password_hash, full_name, role, is_active)
            VALUES (?, ?, ?, ?, 1)
            `,
            [
                cleanUsername,
                passwordHash,
                cleanFullName,
                role
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
            VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?)
            `,
            [
                req.session.user.user_id,
                'CREATE',
                'admin_users',
                result.insertId,
                `Created ${role} account: ${cleanUsername}`
            ]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'User created successfully.',
            user_id: result.insertId
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Username is already in use.'
            });
        }

        console.error('Failed to create admin user:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create user.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


//=============================
// ADMIN/TREASURER DEACTIVATION
//=============================
router.patch('/users/:user_id/deactivate', require_admin, require_csrf, async (req, res) => {
    const userId = Number(req.params.user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID.'
        });
    }

    if (userId === req.session.user.user_id) {
        return res.status(400).json({
            success: false,
            message: 'You cannot deactivate your own account.'
        });
    }

    let connection;

    try {
        connection = await db.promise().getConnection();

        await connection.beginTransaction();

        //PREVENTS THE LAST ACTIVE ADMIN ACCOUNT TO BE DEACTIVATED
        const [activeAdmins] = await connection.query(
            `
            SELECT COUNT(*) AS total
            FROM admin_users
            WHERE role = 'admin' AND is_active = 1
            `
        );

        if (
            activeAdmins[0].total <= 1
        ) {
            const [targetUser] = await connection.query(
                `
                SELECT role, is_active
                FROM admin_users
                WHERE user_id = ?
                `,
                [userId]
            );

            if (
                targetUser.length > 0 &&
                targetUser[0].role === 'admin' &&
                targetUser[0].is_active === 1
            ) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: 'You cannot deactivate the last active admin account.'
                });
            }
        }

        const [result] = await connection.query(
            `
            UPDATE admin_users
            SET is_active = 0
            WHERE user_id = ? AND is_active = 1
            `,
            [userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Active user not found.'
            });
        }

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
            VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?)
            `,
            [
                req.session.user.user_id,
                'DEACTIVATE',
                'admin_users',
                userId,
                `Deactivated admin account ID: ${userId}`
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'User deactivated successfully.'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Failed to deactivate admin user:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to deactivate user.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


//=============================
// ADMIN/TREASURER REACTIVATION
//=============================
router.patch('/users/:user_id/activate', require_admin, require_csrf, async (req, res) => {
    const userId = Number(req.params.user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID.'
        });
    }

    let connection;

    try {
        connection = await db.promise().getConnection();

        await connection.beginTransaction();

        const [result] = await connection.query(
            `
            UPDATE admin_users
            SET is_active = 1
            WHERE user_id = ? AND is_active = 0
            `,
            [userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Inactive user not found.'
            });
        }

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
            VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?)
            `,
            [
                req.session.user.user_id,
                'ACTIVATE',
                'admin_users',
                userId,
                `Reactivated admin account ID: ${userId}`
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'User reactivated successfully.'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Failed to reactivate admin user:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to reactivate user.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


//==============================
// EDIT ADMIN/TREASURER ACCOUNTS
//==============================
router.patch('/users/:user_id', require_admin, require_csrf, async (req, res) => {
    const userId = Number(req.params.user_id);
    const {
        username,
        full_name,
        role,
        password
    } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID.'
        });
    }

    if (
        typeof username !== 'string' ||
        typeof full_name !== 'string' ||
        typeof role !== 'string'
    ) {
        return res.status(400).json({
            success: false,
            message: 'Username, full name, and role are required.'
        });
    }

    const cleanUsername = username.trim();
    const cleanFullName = full_name.trim();

    if (
        cleanUsername.length < 3 ||
        cleanUsername.length > 255 ||
        cleanFullName.length < 2 ||
        cleanFullName.length > 100 ||
        /[\u0000-\u001F\u007F]/.test(cleanUsername) ||
        /[\u0000-\u001F\u007F]/.test(cleanFullName)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid account information.'
        });
    }

    if (!['admin', 'treasurer'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role.'
        });
    }

    if (password !== undefined && password !== '') {
        if (
            typeof password !== 'string' ||
            password.length < 12 ||
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password) ||
            !/[^A-Za-z0-9]/.test(password)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Password does not meet the required strength.'
            });
        }
    }

    let connection;

    try {
        connection = await db.promise().getConnection();

        await connection.beginTransaction();

        const [existingUsers] = await connection.query(
            `
            SELECT username, full_name, role
            FROM admin_users
            WHERE user_id = ?
            `,
            [userId]
        );

        if (existingUsers.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        let query;
        let values;

        if (password !== undefined && password !== '') {
            const passwordHash = await bcrypt.hash(password, 12);

            query = `
                UPDATE admin_users
                SET username = ?, full_name = ?, role = ?, password_hash = ?
                WHERE user_id = ?
            `;

            values = [
                cleanUsername,
                cleanFullName,
                role,
                passwordHash,
                userId
            ];
        } else {
            query = `
                UPDATE admin_users
                SET username = ?, full_name = ?, role = ?
                WHERE user_id = ?
            `;

            values = [
                cleanUsername,
                cleanFullName,
                role,
                userId
            ];
        }

        await connection.query(query, values);

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
            VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?)
            `,
            [
                req.session.user.user_id,
                'UPDATE',
                'admin_users',
                userId,
                `Updated admin account ID: ${userId}`
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'User updated successfully.'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Username is already in use.'
            });
        }

        console.error('Failed to update admin user:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update user.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


module.exports = router;