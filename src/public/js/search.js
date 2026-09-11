// HIDES THE EDIT AND DELETE IN THE SEARCH PAGE BY ROLE
let currentUserRole = null;
let userLoaded = false;

async function loadCurrentUser() {
    try {
        const response = await fetch('/api/admin/me', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to get user information');
        }

        const data = await response.json();
        currentUserRole = data.user.role;
        userLoaded = true;
    } catch (error) {
        console.error('User role error:', error);
        userLoaded = true;
    }
}

loadCurrentUser();


// searching accounts
document.getElementById('search_button').addEventListener('click', search_account);

async function search_account() {

    if (!userLoaded) {
        await loadCurrentUser();
    }

    const search = document.getElementById('search_input').value.trim();

    if (!search) {
        alert('Please enter a meter number or name.');
        return;
    }

    try {
        const response = await fetch(
            `/api/view-account/search?q=${encodeURIComponent(search)}`,
            {
                credentials: 'include'
            }
        );

        const accountData = await response.json();

        if (!response.ok || !accountData.success) {
            throw new Error(
                accountData.message || 'Search failed'
            );
        }

        display_account(accountData.accounts);

    } catch (error) {
        console.error(error);
        alert(error.message || 'Search failed');
    }
}


//==================================
// DISPLAYS THE ACCOUNT FOR THE USER
//==================================
function display_account(accounts) {
    const table = document.getElementById('account_table');
    const selectedAccount = document.getElementById('selected_account');
    const payButton = document.getElementById('pay');

    table.innerHTML = '';
    selectedAccount.innerHTML = '<p>No account selected.</p>';
    payButton.disabled = true;

    if (accounts.length === 0) {
        const message = document.createElement('p');
        message.textContent = 'No account found';
        table.appendChild(message);
        return;
    }

    accounts.forEach(account => {

        const accountDiv = document.createElement('div');

        function addParagraph(label, value) {
            const p = document.createElement('p');
            p.textContent = `${label}${value ?? ''}`;
            accountDiv.appendChild(p);
        }

        addParagraph('Meter No: ', account.meter_id);
        addParagraph(
            'Name: ',
            `${account.first_name ?? ''} ${account.last_name ?? ''}`
        );
        addParagraph(
            'Address: ',
            `${account.barangay ?? ''} (${account.sitio ?? ''})`
        );
        addParagraph('Balance: ', account.balance);

        const selectButton = document.createElement('button');
        selectButton.textContent = 'Select Account';
        selectButton.type = 'button';

        selectButton.addEventListener('click', () => {
            selectedAccount.innerHTML = '';

            const meter = document.createElement('p');
            meter.textContent = `Meter No: ${account.meter_id}`;

            const name = document.createElement('p');
            name.textContent =
                `Name: ${account.first_name ?? ''} ${account.last_name ?? ''}`;

            const address = document.createElement('p');
            address.textContent =
                `Address: ${account.barangay ?? ''} (${account.sitio ?? ''})`;

            const balance = document.createElement('p');
            balance.textContent = `Balance: ${account.balance}`;

            selectedAccount.appendChild(meter);
            selectedAccount.appendChild(name);
            selectedAccount.appendChild(address);
            selectedAccount.appendChild(balance);

            payButton.disabled = false;
            payButton.dataset.meterId = account.meter_id;
        });

        accountDiv.appendChild(selectButton);

        if (currentUserRole === 'admin') {
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit Account';
            editButton.type = 'button';
            editButton.addEventListener('click', () => {
                window.location.href =
                    `edit_client.html?meter_id=${account.meter_id}`;
            });

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete Account';
            deleteButton.type = 'button';
            deleteButton.addEventListener('click', async () => {
            
            // CONFIRMS THE DELETION OF AN ACCOUNT
            const confirmed = confirm(
                `Are you sure you want to delete account ${account.meter_id}?`
            );

            if (!confirmed) {
                return;
            }

            try {

                const response = await fetch(
                    `/api/view-account/delete/${account.meter_id}`,
                    {
                        method: 'DELETE',
                        credentials: 'include'
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || 'Failed to delete account'
                    );
                }

                alert('Account deleted successfully.');

                search_account();

            } catch (error) {

                console.error(error);

                alert(
                    error.message ||
                    'Failed to delete account.'
                );
            }
        });

            accountDiv.appendChild(editButton);
            accountDiv.appendChild(deleteButton);
        }

        table.appendChild(accountDiv);
        table.appendChild(document.createElement('hr'));
    });
}


//=================
// PAYMENT
//=================
document.getElementById('pay').addEventListener('click', pay);

async function pay() {

    const meterId = document.getElementById('pay').dataset.meterId;

    if (!meterId) {
        alert('Please select an account first.');
        return;
    }

    try {

        document.getElementById('payment_meter_id').value = meterId;


        // ==========================================
        // Get bills
        // ==========================================

        const billResponse = await fetch(
            `/api/bills/account/${meterId}`,
            {
                credentials: 'include'
            }
        );

        const billData = await billResponse.json();

        if (
            !billResponse.ok ||
            !billData.success
        ) {
            throw new Error(
                billData.message || 'Failed to load bills'
            );
        }

        const bills = billData.bills;

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
            `/api/payments/print?meter_id=${meterId}`,
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
            '/api/payments',
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