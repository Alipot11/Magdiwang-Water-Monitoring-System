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
        const response = await fetch('http://localhost:3000/api/bills', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }
        alert('Bill posted')

        bill_form.reset();

        window.location.href = "view_client.html"

    }   catch (error) {
        console.Error(error);
        alert('Bill not posted')
    }
});