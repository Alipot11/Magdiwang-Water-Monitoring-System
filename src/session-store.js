const session = require('express-session');

// Use the same MySQL connection pool that the rest of the
// application already uses.
const db = require('../database.js');


/*
 * MySQLSessionStore
 *
 * This class provides the storage methods that express-session
 * expects from a session store.
 *
 * Instead of keeping sessions in the Node.js process memory,
 * sessions are saved in the MySQL "sessions" table.
 *
 * Benefits:
 * - Sessions survive a Node.js server restart.
 * - Multiple Node.js processes can share the same sessions.
 * - We avoid express-session's default MemoryStore.
 * - We reuse the application's existing mysql2 connection pool.
 */
class MySQLSessionStore extends session.Store {

    /*
     * Get an existing session.
     *
     * Express calls this when a request contains a session cookie.
     *
     * If the session does not exist or has expired, we return null.
     */
    get(sessionId, callback) {

        const sql = `
            SELECT data
            FROM sessions
            WHERE session_id = ?
              AND expires > NOW()
            LIMIT 1
        `;

        db.promise()
            .query(sql, [sessionId])
            .then(([rows]) => {

                // No matching session was found.
                if (rows.length === 0) {
                    return callback(null, null);
                }

                try {
                    // Session data is stored as JSON text in MySQL.
                    const sessionData = JSON.parse(rows[0].data);

                    callback(null, sessionData);

                } catch (error) {

                    // The database contained invalid session JSON.
                    console.error('Failed to parse session data:', error);

                    callback(error);
                }
            })
            .catch((error) => {

                console.error('Failed to retrieve session:', error);

                callback(error);
            });
    }


    /*
     * Save or replace a session.
     *
     * Express calls this when a session needs to be persisted.
     */
    set(sessionId, sessionData, callback) {

        /*
         * express-session normally provides cookie.expires because
         * our server configuration specifies a maxAge.
         *
         * If expires is unavailable, calculate it from maxAge.
         */
        let expires;

        if (sessionData.cookie && sessionData.cookie.expires) {

            expires = new Date(sessionData.cookie.expires);

        } else if (
            sessionData.cookie &&
            sessionData.cookie.maxAge
        ) {

            expires = new Date(
                Date.now() + sessionData.cookie.maxAge
            );

        } else {

            // Fallback. This should normally not be reached because
            // server.js defines an 8-hour maxAge.
            expires = new Date(
                Date.now() + (1000 * 60 * 60 * 8)
            );
        }


        /*
         * Convert the complete Express session object into JSON
         * before storing it in the MEDIUMTEXT column.
         */
        const data = JSON.stringify(sessionData);


        /*
         * INSERT ... ON DUPLICATE KEY UPDATE means:
         *
         * - If this session ID does not exist, create it.
         * - If it already exists, update its expiration and data.
         *
         * session_id is the PRIMARY KEY, so MySQL can detect
         * duplicate sessions automatically.
         */
        const sql = `
            INSERT INTO sessions (
                session_id,
                expires,
                data
            )
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                expires = VALUES(expires),
                data = VALUES(data)
        `;


        db.promise()
            .query(sql, [sessionId, expires, data])
            .then(() => {

                callback(null);

            })
            .catch((error) => {

                console.error('Failed to save session:', error);

                callback(error);
            });
    }


    /*
     * Delete a session.
     *
     * Express calls this when the user logs out and
     * req.session.destroy() is used.
     */
    destroy(sessionId, callback) {

        const sql = `
            DELETE FROM sessions
            WHERE session_id = ?
        `;

        db.promise()
            .query(sql, [sessionId])
            .then(() => {

                callback(null);

            })
            .catch((error) => {

                console.error('Failed to destroy session:', error);

                callback(error);
            });
    }


    /*
     * Update the expiration time of an existing session.
     *
     * Express can call touch() when a session is being used.
     *
     * This allows an active session's expiration value in MySQL
     * to stay synchronized with the session cookie.
     */
    touch(sessionId, sessionData, callback) {

        let expires;

        if (sessionData.cookie && sessionData.cookie.expires) {

            expires = new Date(sessionData.cookie.expires);

        } else if (
            sessionData.cookie &&
            sessionData.cookie.maxAge
        ) {

            expires = new Date(
                Date.now() + sessionData.cookie.maxAge
            );

        } else {

            expires = new Date(
                Date.now() + (1000 * 60 * 60 * 8)
            );
        }


        const sql = `
            UPDATE sessions
            SET expires = ?
            WHERE session_id = ?
        `;


        db.promise()
            .query(sql, [expires, sessionId])
            .then(() => {

                callback(null);

            })
            .catch((error) => {

                console.error('Failed to update session expiration:', error);

                callback(error);
            });
    }


    cleanupExpired() {
    const sql = `
        DELETE FROM sessions
        WHERE expires <= NOW()
    `;

    db.promise()
        .query(sql)
        .then(([result]) => {
            if (result.affectedRows > 0) {
                console.log(`Removed ${result.affectedRows} expired sessions`);
            }
        })
        .catch((error) => {
            console.error('Failed to clean expired sessions:', error);
        });
    }
}


// Export the store so server.js can create an instance of it.
module.exports = MySQLSessionStore;