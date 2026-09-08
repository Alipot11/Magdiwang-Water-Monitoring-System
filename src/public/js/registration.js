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
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }
        alert('Account registered')

        registration_form.reset();

        window.location.href = "view_client.html"

    }   catch (error) {
        console.Error(error);
        alert('Error registering account')
    }
});