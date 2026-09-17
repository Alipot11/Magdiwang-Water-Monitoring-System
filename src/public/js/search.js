// ======================================================
// SEARCH & PAY
// ======================================================


// ======================================================
// CURRENT USER ROLE
// HIDES EDIT AND DELETE ON THE SEARCH PAGE BY ROLE
// ======================================================

let currentUserRole = null;
let userLoaded = false;


// ======================================================
// LOAD CURRENT USER
// ======================================================

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


// ======================================================
// SEARCH ACCOUNT
// ======================================================

document
    .getElementById('search_button')
    .addEventListener('click', search_account);


async function search_account() {

    if (!userLoaded) {
        await loadCurrentUser();
    }


    const search =
        document.getElementById('search_input')
        .value
        .trim();


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

        alert(
            error.message || 'Search failed'
        );
    }
}


// ======================================================
// DISPLAY ACCOUNT RESULTS
// ======================================================

function display_account(accounts) {

    const table =
        document.getElementById('account_table');

    const selectedAccount =
        document.getElementById('selected_account');

    const payButton =
        document.getElementById('pay');


    // Clear old results
    table.innerHTML = '';


    // Reset selected account
    selectedAccount.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">○</span>

            <h3>No Account Selected</h3>

            <p>
                Select an account from the search results.
            </p>
        </div>
    `;


    // Disable payment button
    payButton.disabled = true;

    payButton.removeAttribute('data-meter-id');


    // ==================================================
    // NO RESULTS
    // ==================================================

    if (!accounts || accounts.length === 0) {

        table.innerHTML = `
            <div class="empty-state">

                <span class="empty-icon">⌕</span>

                <h3>No Account Found</h3>

                <p>
                    No customer account matched your search.
                </p>

            </div>
        `;

        return;
    }


    // ==================================================
    // RESULTS CONTAINER
    // ==================================================

    const results =
        document.createElement('div');

    results.className = 'account-results';


    // ==================================================
    // CREATE ACCOUNT CARDS
    // ==================================================

    accounts.forEach(account => {

        const accountDiv =
            document.createElement('article');

        accountDiv.className =
            'account-result';


        // ==================================================
        // ACCOUNT INFORMATION
        // ==================================================

        const accountInfo =
            document.createElement('div');

        accountInfo.className =
            'account-result-info';


        // ==================================================
        // HEADER
        // ==================================================

        const header =
            document.createElement('div');

        header.className =
            'account-result-header';


        // Meter
        const meterContainer =
            document.createElement('div');

        const meterLabel =
            document.createElement('span');

        meterLabel.className =
            'account-result-label';

        meterLabel.textContent =
            'Meter Number';


        const meter =
            document.createElement('strong');

        meter.className =
            'account-meter';

        meter.textContent =
            `#${account.meter_id}`;


        meterContainer.appendChild(meterLabel);
        meterContainer.appendChild(meter);


        // Balance
        const balanceContainer =
            document.createElement('div');

        balanceContainer.className =
            'account-balance';


        const balanceLabel =
            document.createElement('span');

        balanceLabel.textContent =
            'Balance';


        const balance =
            document.createElement('strong');

        balance.textContent =
            `₱${Number(account.balance || 0).toFixed(2)}`;


        balanceContainer.appendChild(balanceLabel);
        balanceContainer.appendChild(balance);


        header.appendChild(meterContainer);
        header.appendChild(balanceContainer);


        // ==================================================
        // DETAILS
        // ==================================================

        const details =
            document.createElement('div');

        details.className =
            'account-result-details';


        // Name
        const nameContainer =
            document.createElement('div');


        const nameLabel =
            document.createElement('span');

        nameLabel.textContent =
            'Name';


        const name =
            document.createElement('strong');

        name.textContent =
            `${account.first_name ?? ''} ${account.last_name ?? ''}`
                .trim();


        nameContainer.appendChild(nameLabel);
        nameContainer.appendChild(name);


        // Address
        const addressContainer =
            document.createElement('div');


        const addressLabel =
            document.createElement('span');

        addressLabel.textContent =
            'Address';


        const address =
            document.createElement('strong');

        address.textContent =
            `${account.barangay ?? 'N/A'}${
                account.sitio
                    ? ` • ${account.sitio}`
                    : ''
            }`;


        addressContainer.appendChild(addressLabel);
        addressContainer.appendChild(address);


        details.appendChild(nameContainer);
        details.appendChild(addressContainer);


        accountInfo.appendChild(header);
        accountInfo.appendChild(details);


        // ==================================================
        // BUTTON CONTAINER
        // ==================================================

        const actions =
            document.createElement('div');

        actions.className =
            'account-actions';


        // ==================================================
        // SELECT ACCOUNT
        // ==================================================

        const selectButton =
            document.createElement('button');

        selectButton.textContent =
            'Select Account';

        selectButton.type =
            'button';

        selectButton.className =
            'primary-button';


        selectButton.addEventListener('click', () => {

            display_selected_account(
                account,
                selectedAccount,
                payButton
            );

        });


        actions.appendChild(selectButton);


        // ==================================================
        // ADMIN ACTIONS
        // ==================================================

        if (currentUserRole === 'admin') {


            // ----------------------------------------------
            // EDIT
            // ----------------------------------------------

            const editButton =
                document.createElement('button');

            editButton.textContent =
                'Edit Account';

            editButton.type =
                'button';

            editButton.className =
                'secondary-button';


            editButton.addEventListener('click', () => {

                window.location.href =
                    `edit_client.html?meter_id=${account.meter_id}`;

            });


            // ----------------------------------------------
            // DELETE
            // ----------------------------------------------

            const deleteButton =
                document.createElement('button');

            deleteButton.textContent =
                'Delete Account';

            deleteButton.type =
                'button';

            deleteButton.className =
                'danger-button';


            deleteButton.addEventListener(
                'click',
                async () => {

                    // Confirm deletion
                    const confirmed =
                        confirm(
                            `Are you sure you want to delete account ${account.meter_id}?`
                        );


                    if (!confirmed) {
                        return;
                    }


                    try {

                        // ==================================
                        // GET CSRF TOKEN
                        // ==================================

                        const tokenResponse =
                            await fetch(
                                '/api/admin/csrf-token',
                                {
                                    method: 'GET',
                                    credentials: 'include'
                                }
                            );


                        const tokenResult =
                            await tokenResponse.json();


                        if (
                            !tokenResponse.ok ||
                            !tokenResult.success
                        ) {

                            throw new Error(
                                tokenResult.message ||
                                'Failed to obtain CSRF token'
                            );
                        }


                        // ==================================
                        // DELETE ACCOUNT
                        // ==================================

                        const response =
                            await fetch(
                                `/api/view-account/delete/${account.meter_id}`,
                                {
                                    method: 'DELETE',

                                    credentials: 'include',

                                    headers: {
                                        'X-CSRF-Token':
                                            tokenResult.csrfToken
                                    }
                                }
                            );


                        const result =
                            await response.json();


                        if (
                            !response.ok ||
                            !result.success
                        ) {

                            throw new Error(
                                result.message ||
                                'Failed to delete account'
                            );
                        }


                        alert(
                            'Account deleted successfully.'
                        );


                        // Refresh search results
                        search_account();


                    } catch (error) {

                        alert(
                            error.message ||
                            'Failed to delete account.'
                        );

                    }

                }
            );


            actions.appendChild(editButton);
            actions.appendChild(deleteButton);
        }


        // ==================================================
        // BUILD CARD
        // ==================================================

        accountDiv.appendChild(accountInfo);
        accountDiv.appendChild(actions);


        results.appendChild(accountDiv);

    });


    table.appendChild(results);
}


// ======================================================
// DISPLAY SELECTED ACCOUNT
// ======================================================

function display_selected_account(
    account,
    selectedAccount,
    payButton
) {

    selectedAccount.innerHTML = '';


    const card =
        document.createElement('div');

    card.className =
        'selected-account-card';


    // ==================================================
    // HEADER
    // ==================================================

    const header =
        document.createElement('div');

    header.className =
        'selected-account-header';


    const titleContainer =
        document.createElement('div');


    const label =
        document.createElement('span');

    label.className =
        'selected-account-label';

    label.textContent =
        'Selected Account';


    const meter =
        document.createElement('h3');

    meter.textContent =
        `Meter #${account.meter_id}`;


    titleContainer.appendChild(label);
    titleContainer.appendChild(meter);


    const balance =
        document.createElement('div');

    balance.className =
        'selected-balance';


    const balanceLabel =
        document.createElement('span');

    balanceLabel.textContent =
        'Current Balance';


    const balanceAmount =
        document.createElement('strong');

    balanceAmount.textContent =
        `₱${Number(account.balance || 0).toFixed(2)}`;


    balance.appendChild(balanceLabel);
    balance.appendChild(balanceAmount);


    header.appendChild(titleContainer);
    header.appendChild(balance);


    // ==================================================
    // DETAILS
    // ==================================================

    const details =
        document.createElement('div');

    details.className =
        'selected-account-details';


    addSelectedDetail(
        details,
        'Name',
        `${account.first_name ?? ''} ${account.last_name ?? ''}`.trim()
    );


    addSelectedDetail(
        details,
        'Barangay',
        account.barangay || 'N/A'
    );


    addSelectedDetail(
        details,
        'Sitio',
        account.sitio || 'N/A'
    );


    card.appendChild(header);
    card.appendChild(details);


    selectedAccount.appendChild(card);


    // ==================================================
    // ENABLE PAYMENT
    // ==================================================

    payButton.disabled = false;

    payButton.dataset.meterId =
        account.meter_id;

}


// ======================================================
// SELECTED ACCOUNT DETAIL HELPER
// ======================================================

function addSelectedDetail(
    container,
    labelText,
    valueText
) {

    const item =
        document.createElement('div');

    const label =
        document.createElement('span');

    label.textContent =
        labelText;


    const value =
        document.createElement('strong');

    value.textContent =
        valueText;


    item.appendChild(label);
    item.appendChild(value);

    container.appendChild(item);
}


// ======================================================
// PAYMENT BUTTON
// ======================================================

document
    .getElementById('pay')
    .addEventListener('click', pay);


// ======================================================
// PAYMENT
// ======================================================

async function pay() {

    const meterId =
        document.getElementById('pay')
        .dataset
        .meterId;


    if (!meterId) {

        alert(
            'Please select an account first.'
        );

        return;
    }


    try {

        // ==================================================
        // SET METER ID
        // ==================================================

        document.getElementById(
            'payment_meter_id'
        ).value = meterId;


        // ==================================================
        // GET BILLS
        // ==================================================

        const billResponse =
            await fetch(
                `/api/bills/account/${meterId}`,
                {
                    credentials: 'include'
                }
            );


        const billData =
            await billResponse.json();


        if (
            !billResponse.ok ||
            !billData.success
        ) {

            throw new Error(
                billData.message ||
                'Failed to load bills'
            );
        }


        const bills =
            billData.bills;


        const billSelect =
            document.getElementById('bill_id');


        billSelect.innerHTML = `
            <option value="">
                Select a bill
            </option>
        `;


        // ==================================================
        // ONLY SHOW BILLS WITH BALANCE
        // ==================================================

        bills.forEach(bill => {

            if (Number(bill.balance) > 0) {

                const option =
                    document.createElement('option');


                option.value =
                    bill.bill_id;


                option.textContent =
                    `Bill #${bill.bill_id} — ₱${Number(
                        bill.balance
                    ).toFixed(2)} — Due ${
                        bill.duedate.split('T')[0]
                    }`;


                option.dataset.balance =
                    bill.balance;


                billSelect.appendChild(option);

            }

        });


        // ==================================================
        // GET PAYMENT HISTORY
        // ==================================================

        const paymentResponse =
            await fetch(
                `/api/payments/print?meter_id=${meterId}`,
                {
                    credentials: 'include'
                }
            );


        const paymentData =
            await paymentResponse.json();


        if (
            !paymentResponse.ok ||
            !paymentData.success
        ) {

            throw new Error(
                paymentData.message ||
                'Failed to load payment history'
            );
        }


        // ==================================================
        // POPULATE PAYMENT SELECT
        // ==================================================

        const paymentSelect =
            document.getElementById(
                'payment_select'
            );


        paymentSelect.innerHTML = `
            <option value="">
                Select a payment
            </option>
        `;


        paymentData.payments.forEach(
            payment => {

                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    payment.payment_id;


                option.textContent =
                    `Payment #${payment.payment_id} — ₱${Number(
                        payment.amount_paid
                    ).toFixed(2)} — ${
                        payment.payment_date.split('T')[0]
                    }`;


                paymentSelect.appendChild(
                    option
                );

            }
        );


        // ==================================================
        // CHECK OUTSTANDING BILLS
        // ==================================================

        if (billSelect.options.length === 1) {

            alert(
                'This customer has no outstanding bills.'
            );

        }


        // ==================================================
        // SCROLL TO PAYMENT
        // ==================================================

        document
            .getElementById('payment_form')
            .scrollIntoView({
                behavior: 'smooth'
            });


    } catch (error) {

        alert(
            error.message ||
            'Failed to load payment information.'
        );

    }
}


// ======================================================
// AUTOMATICALLY FILL PAYMENT AMOUNT
// ======================================================

document
    .getElementById('bill_id')
    .addEventListener(
        'change',
        function () {

            const selectedOption =
                this.options[
                    this.selectedIndex
                ];


            const amountInput =
                document.getElementById(
                    'amount_paid'
                );


            // No bill selected
            if (!selectedOption.value) {

                amountInput.value = '';

                return;
            }


            // Get balance
            const balance =
                Number(
                    selectedOption.dataset.balance
                );


            if (isNaN(balance)) {

                amountInput.value = '';

                return;
            }


            // Fill amount
            amountInput.value =
                balance.toFixed(2);

        }
    );


// ======================================================
// SUBMIT PAYMENT
// ======================================================

const payment_form =
    document.getElementById(
        'payment_form'
    );


payment_form.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();


        const data = {

            bill_id:
                Number(
                    document.getElementById(
                        'bill_id'
                    ).value
                ),

            meter_id:
                Number(
                    document.getElementById(
                        'payment_meter_id'
                    ).value
                ),

            payment_date:
                document.getElementById(
                    'payment_date'
                ).value,

            amount_paid:
                Number(
                    document.getElementById(
                        'amount_paid'
                    ).value
                )

        };


        try {

            // ==================================================
            // GET CSRF TOKEN
            // ==================================================

            const tokenResponse =
                await fetch(
                    '/api/admin/csrf-token',
                    {
                        method: 'GET',
                        credentials: 'include'
                    }
                );


            const tokenResult =
                await tokenResponse.json();


            if (
                !tokenResponse.ok ||
                !tokenResult.success
            ) {

                throw new Error(
                    tokenResult.message ||
                    'Failed to obtain CSRF token'
                );

            }


            // ==================================================
            // SUBMIT PAYMENT
            // ==================================================

            const response =
                await fetch(
                    '/api/payments',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json',

                            'X-CSRF-Token':
                                tokenResult.csrfToken
                        },

                        credentials: 'include',

                        body:
                            JSON.stringify(data)
                    }
                );


            const result =
                await response.json();


            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.message ||
                    'Payment failed'
                );

            }


            alert(
                'Payment successful'
            );


            payment_form.reset();


            window.location.href =
                'search.html';


        } catch (error) {

            alert(
                error.message ||
                'Payment not successful'
            );

        }

    }
);


// ======================================================
// GENERATE RECEIPT
// ======================================================

document
    .getElementById('generate_receipt')
    .addEventListener(
        'click',
        () => {

            const paymentId =
                document.getElementById(
                    'payment_select'
                ).value;


            if (!paymentId) {

                alert(
                    'Please select a payment first.'
                );

                return;
            }


            window.location.href =
                `receipt.html?payment_id=${paymentId}`;

        }
    );