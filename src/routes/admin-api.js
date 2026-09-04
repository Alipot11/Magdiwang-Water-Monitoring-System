const express = require('express');
const router = express.Router();
const db = require('../../database.js');
const bcrypt = require('bcryptjs');
const {require_login} = require('../middleware/auth.js')


// for admin login
router.post('/login', (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required.'
        });
    }

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

        if (results.length === 0) {

            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const user = results[0];

        if (!user.is_active) {

            return res.status(403).json({
                success: false,
                message: 'This account has been disabled.'
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        req.session.user = {
            user_id: user.user_id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
        };

        res.json({
            success: true,
            message: 'Login successful.',
            user: req.session.user
        });
    });
});

// session-check
router.get('/me',require_login,(req, res,) => {

    res.json({
        success: true,
        user: req.session.user
    })
})

// for admin logout
router.post('/logout', require_login, (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            
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

module.exports = router