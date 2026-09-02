// searching accounts
document.getElementById('search_button').addEventListener('click', search_account);

async function search_account() {
    const search = document.getElementById('search_input').value;

    try {
        const response = await fetch(`http://localhost:3000/api/view_account/search?q=${encodeURIComponent(search)}`);

        const accounts = await response.json();

        display_account(accounts);

    } catch (error) {
        console.error(error);
        alert('Search failed');
    }
}

function display_account(accounts) {
    const table = document.getElementById('account_table');

    table.innerHTML = '';
    
    if (accounts.length === 0) {
        table.innerHTML = `
        <p>No account yet</p>`;

        return;
    }
    accounts.forEach(account => {
        const row = `
                <p>Meter No: ${account.meter_id}</p>
                <p>Name: ${account.first_name} ${account.last_name}</p>
                <p>Address: ${account.barangay} (${account.sitio})</p>
                <p>Balance: ${account.balance}</p>
                <br>
                <h4>Payments</h4>
                <p>${account.payments}</p>
                <h4>Bills</h4>
                <p>${account.bills}</p>
           `;
        table.innerHTML += row;
    });
}

// payment
document.getElementById('pay').addEventListener('click', pay)

async function pay() {
    const search = document.getElementById('search_input').value;

    try {
        const response = await fetch(`http://localhost:3000/api/view_account/search?q=${encodeURIComponent(search)}`);

        const accounts = await response.json();

        console.log(accounts)


    } catch (error) {
        console.error(error);
        alert('Search failed');
    }
    
}

// submit payment
const payment_form = document.getElementById('payment_form');

payment_form.addEventListener('submit', async(event) => {
    event.preventDefault();

    const data = {
        bill_id: document.getElementById('bill_id').value,
        meter_id: document.getElementById('meter_id').value,
        payment_date: document.getElementById('payment_date').value,
        amount_paid: document.getElementById('amount_paid').value
    };

    try {
        const response = await fetch('http://localhost:3000/api/payments', {
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

        alert('Payment successful')

        payment_form.reset();

        window.location.href = "search.html"

    }   catch (error) {
        console.error(error);
        alert('Payment not successful')
    }
});

