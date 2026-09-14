const params = new URLSearchParams(window.location.search);
const meterId = params.get('meter_id');

const form = document.getElementById('edit_form');
const cancelButton = document.getElementById('cancel_button');

async function loadAccount() {

    if (!/^\d+$/.test(meterId || '')) {
        alert('Invalid meter number.');
        window.location.href = '/search.html';
        return;
    }

    try {
        const response = await fetch(`/api/view-account/edit/${meterId}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(data.message || 'Failed to load account.');
            window.location.href = '/search.html';
            return;
        }

        document.getElementById('meter_id').value = data.account.meter_id;
        document.getElementById('first_name').value = data.account.first_name;
        document.getElementById('last_name').value = data.account.last_name;
        document.getElementById('barangay').value = data.account.barangay;
        document.getElementById('sitio').value = data.account.sitio;

    } catch (error) {
        alert('Failed to load account.');
        window.location.href = '/search.html';
    }
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const barangay = document.getElementById('barangay').value;
    const sitio = document.getElementById('sitio').value.trim();

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
            `/api/view-account/edit/${meterId}`,
            {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': tokenResult.csrfToken
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    barangay: barangay,
                    sitio: sitio
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(data.message || 'Failed to update account.');
            return;
        }

        alert('Account updated successfully.');
        window.location.href = '/search.html';

    } catch (error) {
        alert(error.message || 'Failed to update account.');
    }
});


loadAccount();