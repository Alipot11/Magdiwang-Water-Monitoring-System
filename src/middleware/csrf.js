
const crypto = require('crypto');

function csrf_token(req, res) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }

    res.json({
        success: true,
        csrfToken: req.session.csrfToken
    });
}

function require_csrf(req, res, next) {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

    if (safeMethods.includes(req.method)) {
        return next();
    }

    const submittedToken = req.get('X-CSRF-Token');
    const sessionToken = req.session.csrfToken;

    if (
        !submittedToken ||
        !sessionToken ||
        submittedToken !== sessionToken
    ) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token.'
        });
    }

    next();
}

module.exports = {
    csrf_token,
    require_csrf
};