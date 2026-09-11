document.getElementById('logout_btn').addEventListener('click', async () => {

    try {

        const response = await fetch(
            '/api/admin/logout',
            {
                method: 'POST',
                credentials: 'include'
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || 'Logout failed'
            );
        }

        // Return to the login page
        window.location.href = 'admin-login.html';

    } catch (error) {
        alert(
            error.message ||
            'Failed to logout.'
        );
    }
});