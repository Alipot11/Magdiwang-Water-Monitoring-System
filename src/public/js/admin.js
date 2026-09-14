
document.getElementById('logout_btn').addEventListener('click', async () => {
    try {
        const tokenResponse = await fetch(
            '/api/admin/csrf-token',
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        const tokenResult = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenResult.success) {
            throw new Error(
                tokenResult.message || 'Failed to obtain CSRF token'
            );
        }

        const response = await fetch(
            '/api/admin/logout',
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRF-Token': tokenResult.csrfToken
                }
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || 'Logout failed'
            );
        }

        window.location.href = 'admin-login.html';
    } catch (error) {
        alert(
            error.message ||
            'Failed to logout.'
        );
    }
});