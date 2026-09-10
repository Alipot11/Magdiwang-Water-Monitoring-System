const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../../database.js');
const bcrypt = require('bcryptjs');
const { require_login } = require('../middleware/auth.js');


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


        // --------------------------------
        // REGENERATE SESSION ID
        // --------------------------------
        // This prevents session fixation after login.

        req.session.regenerate((err) => {

            if (err) {
                console.error('Session regeneration error:', err);

                return res.status(500).json({
                    success: false,
                    message: 'Login failed.'
                });
            }


            // --------------------------------
            // CREATE AUTHENTICATED SESSION
            // --------------------------------

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


// --------------------------------
// SESSION CHECK
// --------------------------------

router.get('/me', require_login, (req, res) => {

    res.json({
        success: true,
        user: req.session.user
    });
});


// --------------------------------
// LOGOUT
// --------------------------------

router.post('/logout', require_login, (req, res) => {

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


module.exports = router;