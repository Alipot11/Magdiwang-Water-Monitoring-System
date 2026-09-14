
const registration_form = document.getElementById('registration_form');

registration_form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = {
        meter_id: document.getElementById('meter_id').value,
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        barangay: document.getElementById('barangay').value,
        sitio: document.getElementById('sitio').value
    };

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

        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': tokenResult.csrfToken
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Registration failed');
        }

        alert('Account registered');

        registration_form.reset();

        window.location.href = 'admin.html';
    } catch (error) {
        alert(error.message || 'Error registering account');
    }
});