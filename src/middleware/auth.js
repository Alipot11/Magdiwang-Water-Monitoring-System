function require_login(req, res, next) {
    
    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: 'You must be logged in'
        });
    }

    next();
}


function require_admin(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: 'You must be logged in'
        });
    }

    if (req.session.user.role !== 'admin') {

        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    next();

}


function require_payment_access(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: 'You must be logged in'
        });
    }

    if (
        req.session.user.role !== 'admin' &&
        req.session.user.role !== 'cashier'
    )
    {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission'
        });
    }

    next();
}

module.exports = {
    require_login,
    require_admin,
    require_payment_access
}