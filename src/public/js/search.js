// searching accounts
document.getElementById('search_button').addEventListener('click', search_account);

async function search_account() {
    const search = document.getElementById('search_input').value;

    try {
        const response = await fetch(`http://localhost:3000/api/view-account/search?q=${encodeURIComponent(search)}`,
        {
            credentials: 'include'
        }
    );

        const accounts = await response.json();

        display_account(accounts);

    } catch (error) {
        console.error(error);
        alert('Search failed');
    }
}


// function for displaying account
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
        const response = await fetch(
            `http://localhost:3000/api/view-account/search?q=${encodeURIComponent(search)}`,
            {
                credentials: 'include'
            }
        );

        const accounts = await response.json();

        if (!response.ok || accounts.length === 0) {
            alert('Account not found.');
            return;
        }

        const account = accounts[0];

        // Automatically fill meter number
        document.getElementById('payment_meter_id').value =
            account.meter_id;


        // ==========================================
        // Get bills
        // ==========================================

        const billResponse = await fetch(
            `http://localhost:3000/api/bills/account/${account.meter_id}`,
            {
                credentials: 'include'
            }
        );

        const bills = await billResponse.json();

        if (!billResponse.ok) {
            throw new Error(
                bills.message || 'Failed to load bills'
            );
        }

        const billSelect =
            document.getElementById('bill_id');

        billSelect.innerHTML = `
            <option value="">
                Select a bill
            </option>
        `;

        // Only show bills that still have a balance
        bills.forEach(bill => {

            if (Number(bill.balance) > 0) {

                const option =
                    document.createElement('option');

                option.value = bill.bill_id;

                option.textContent =
                    `Bill #${bill.bill_id} — ₱${Number(bill.balance).toFixed(2)} — Due ${bill.duedate.split('T')[0]}`;

                option.dataset.balance =
                    bill.balance;

                billSelect.appendChild(option);
            }
        });


        // ==========================================
        // Get payment history for receipt
        // ==========================================

        const paymentResponse = await fetch(
            `http://localhost:3000/api/payments/print?meter_id=${account.meter_id}`,
            {
                credentials: 'include'
            }
        );

        const paymentData =
            await paymentResponse.json();

        if (!paymentResponse.ok || !paymentData.success) {
            throw new Error(
                paymentData.message ||
                'Failed to load payment history'
            );
        }


        // ==========================================
        // Populate payment select
        // ==========================================

        const paymentSelect =
            document.getElementById('payment_select');

        paymentSelect.innerHTML = `
            <option value="">
                Select a payment
            </option>
        `;

        paymentData.payments.forEach(payment => {

            const option =
                document.createElement('option');

            option.value =
                payment.payment_id;

            option.textContent =
                `Payment #${payment.payment_id} — ₱${Number(payment.amount_paid).toFixed(2)} — ${payment.payment_date.split('T')[0]}`;

            paymentSelect.appendChild(option);
        });


        // ==========================================
        // Check for outstanding bills
        // ==========================================

        if (billSelect.options.length === 1) {

            alert('This customer has no outstanding bills.');

        }

        // Scroll to payment section
        document.getElementById('payment_form')
            .scrollIntoView({
                behavior: 'smooth'
            });


    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            'Failed to load payment information.'
        );
    }
}


// Automatically fill payment amount when a bill is selected
document.getElementById('bill_id').addEventListener('change', function () {

    const selectedOption = this.options[this.selectedIndex];
    const amountInput = document.getElementById('amount_paid');

    // If no bill is selected
    if (!selectedOption.value) {
        amountInput.value = '';
        return;
    }

    // Get the balance stored in the selected option
    const balance = Number(selectedOption.dataset.balance);

    if (isNaN(balance)) {
        amountInput.value = '';
        return;
    }

    // Automatically fill the amount
    amountInput.value = balance.toFixed(2);
});



// SUBMIT PAYMENT
const payment_form = document.getElementById('payment_form');

payment_form.addEventListener('submit', async (event) => {

    event.preventDefault();

    const data = {
        bill_id: Number(document.getElementById('bill_id').value),
        meter_id: Number(document.getElementById('payment_meter_id').value),
        payment_date: document.getElementById('payment_date').value,
        amount_paid: Number(document.getElementById('amount_paid').value)
    };

    try {

        const response = await fetch(
            'http://localhost:3000/api/payments',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Payment failed'
            );
        }

        alert('Payment successful');

        payment_form.reset();

        window.location.href = 'search.html';

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            'Payment not successful'
        );
    }
});


// GENERATE RECEIPT
document.getElementById('generate_receipt').addEventListener('click', () => {

    const paymentId = document.getElementById('payment_select').value;

    if (!paymentId) {
        alert('Please select a payment first.');
        return;
    }

    window.location.href = `receipt.html?payment_id=${paymentId}`;
});