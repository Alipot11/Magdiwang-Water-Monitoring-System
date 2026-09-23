const bill_form = document.getElementById('bill_form');

bill_form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = {
        meter_id: document.getElementById('meter_id').value,
        curr_reading: document.getElementById('curr_reading').value,
        pre_reading: document.getElementById('pre_reading').value,
        tcmeter: document.getElementById('tcmeter').value,
        amount: document.getElementById('amount').value,
        surcharge: document.getElementById('surcharge').value,
        bill_amount: document.getElementById('bill_amount').value,
        duedate: document.getElementById('duedate').value
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

        const response = await fetch('/api/bills', {
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
            throw new Error(result.message || 'Bill not posted');
        }

        alert('Bill posted');

        bill_form.reset();

        window.location.href = 'search.html';

    } catch (error) {
        alert(error.message || 'Bill not posted');
    }
});