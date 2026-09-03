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
document.getElementById('pay').addEventListener('click', pay);


async function pay() {

    const search =
        document.getElementById('search_input').value.trim();

    if (!search) {
        alert('Please search for an account first.');
        return;
    }

    try {
        // Find account
        const response = await fetch(`http://localhost:3000/api/view_account/search?q=${encodeURIComponent(search)}`);

        const accounts = await response.json();

        if (!response.ok || accounts.length === 0) {
            alert('Account not found.');
            return;
        }

        const account = accounts[0];

        // Automatically fill meter number
        document.getElementById('payment_meter_id').value = account.meter_id;

        // Get bills
        const billResponse = await fetch(`http://localhost:3000/api/bills/account/${account.meter_id}`);

        const bills = await billResponse.json();

        if (!billResponse.ok) {
            throw new Error(bills.message || 'Failed to load bills');
        }

        const billSelect = document.getElementById('bill_id');

        billSelect.innerHTML = `
            <option value="">
                Select a bill
            </option>
        `;

        // Only show bills that still have a balance
        bills.forEach(bill => {

            if (Number(bill.balance) > 0) {

                const option = document.createElement('option');

                option.value = bill.bill_id;

                option.textContent = `Bill #${bill.bill_id} — ₱${Number(bill.balance).toFixed(2)} — Due ${bill.duedate.split('T')[0]}`;

                option.dataset.balance = bill.balance;

                billSelect.appendChild(option);
            }

        });


        if (billSelect.options.length === 1) {

            alert('This customer has no outstanding bills.');
            return;
        }

        document.getElementById('payment_form').scrollIntoView({behavior: 'smooth'});

    } catch (error) {

        console.error(error);

        alert(error.message ||'Failed to load payment information.');
    }
}

// automatically fill bill options
document.getElementById('bill_id').addEventListener('change', function () {

    const selectedOption = this.options[this.selectedIndex];

    if (!selectedOption.value) {
        document.getElementById('amount_paid').value = '';
        return;
    }

    const balance = selectedOption.dataset.balance;

    document.getElementById('amount_paid').value =
        Number(balance).toFixed(2);
});

// submit payment
const payment_form = document.getElementById('payment_form');

payment_form.addEventListener('submit', async(event) => {
    event.preventDefault();

    const data = {
        bill_id: Number(document.getElementById('bill_id').value),
        meter_id: Number(document.getElementById('payment_meter_id').value),
        payment_date: document.getElementById('payment_date').value,
        amount_paid: Number(document.getElementById('amount_paid').value)
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

