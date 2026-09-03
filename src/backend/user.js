const searchForm = document.getElementById('searchForm');

const meterInput = document.getElementById('meterId');

const message = document.getElementById('message');


// ========================================
// SEARCH ACCOUNT
// ========================================

searchForm.addEventListener('submit', async function (event) {

    event.preventDefault();

    const meterId = meterInput.value.trim();

    if (!meterId) {
        message.textContent = 'Please enter your meter ID.';
        return;
    }


    // Hide old results while searching

    document.getElementById('clientSection').style.display = 'none';
    document.getElementById('billsSection').style.display = 'none';
    document.getElementById('historySection').style.display = 'none';

    message.textContent = 'Searching...';


    try {

        const response = await fetch(
            `http://localhost:3000/api/view-account/search/${meterId}`
        );


        const data = await response.json();


        // ========================================
        // CLIENT NOT FOUND
        // ========================================

        if (!response.ok) {

            message.textContent =
                data.message || 'Account not found.';

            return;
        }


        message.textContent = '';


        // ========================================
        // DISPLAY ACCOUNT
        // ========================================

        displayClient(data.client);


        // ========================================
        // DISPLAY BILLS
        // ========================================

        displayBills(data.unpaidBills);


        // ========================================
        // DISPLAY PAYMENT HISTORY
        // ========================================

        displayPaymentHistory(data.paymentHistory);


    } catch (error) {

        console.error('Search error:', error);

        message.textContent =
            'Unable to connect to the server.';

    }

});


// ========================================
// DISPLAY CLIENT
// ========================================

function displayClient(client) {

    document.getElementById('clientSection')
        .style.display = 'block';


    document.getElementById('clientMeter')
        .textContent = client.meter_id;


    document.getElementById('clientName')
        .textContent =
        `${client.first_name} ${client.last_name}`;


    document.getElementById('clientBarangay')
        .textContent = client.barangay || 'N/A';


    document.getElementById('clientSitio')
        .textContent = client.sitio || 'N/A';

}


// ========================================
// DISPLAY BILLS
// ========================================

function displayBills(bills) {

    const section =
        document.getElementById('billsSection');

    const container =
        document.getElementById('billsContainer');


    section.style.display = 'block';

    container.innerHTML = '';


    // ========================================
    // NO OUTSTANDING BILLS
    // ========================================

    if (!bills || bills.length === 0) {

        container.innerHTML = `
            <div class="no-bills">

                <h3>✓ No Outstanding Bills</h3>

                <p>
                    You have no unpaid bills at this time.
                </p>

            </div>
        `;

        return;
    }


    // ========================================
    // DISPLAY EACH BILL
    // ========================================

    bills.forEach(bill => {

        const billElement =
            document.createElement('div');

        billElement.className = 'bill-card';


        const amount =
            Number(bill.amount || 0);

        const surcharge =
            Number(bill.surcharge || 0);

        const billAmount =
            Number(bill.bill_amount || 0);

        const totalPaid =
            Number(bill.total_paid || 0);

        const balance =
            Number(bill.balance || 0);


        billElement.innerHTML = `

            <div class="bill-header">

                <h3>
                    Bill #${bill.bill_id}
                </h3>

                <span class="status">
                    ${bill.status}
                </span>

            </div>


            <div class="bill-details">

                <div>
                    <label>Previous Reading: </label>
                    <span>${bill.pre_reading}</span>
                </div>

                <div>
                    <label>Current Reading: </label>
                    <span>${bill.curr_reading}</span>
                </div>

                <div>
                    <label>Consumption: </label>
                    <span>${bill.tcmeter}</span>
                </div>

                <div>
                    <label>Amount: </label>
                    <span>
                        ₱${amount.toFixed(2)}
                    </span>
                </div>

                <div>
                    <label>Surcharge: </label>
                    <span>
                        ₱${surcharge.toFixed(2)}
                    </span>
                </div>

                <div>
                    <label>Total Bill: </label>
                    <span>
                        ₱${billAmount.toFixed(2)}
                    </span>
                </div>

                <div>
                    <label>Total Paid: </label>
                    <span>
                        ₱${totalPaid.toFixed(2)}
                    </span>
                </div>

                <div>
                    <label>Remaining Balance: </label>
                    <span class="balance">
                        ₱${balance.toFixed(2)}
                    </span>
                </div>

                <div>
                    <label>Due Date: </label>
                    <span>
                        ${formatDate(bill.duedate)}
                    </span>
                </div>

            </div>

        `;


        container.appendChild(billElement);

    });

}


// ========================================
// DISPLAY PAYMENT HISTORY
// ========================================

function displayPaymentHistory(history) {

    const section =
        document.getElementById('historySection');

    const container =
        document.getElementById('historyContainer');


    section.style.display = 'block';

    container.innerHTML = '';


    // ========================================
    // NO PAYMENT HISTORY
    // ========================================

    if (!history || history.length === 0) {

        container.innerHTML = `
            <div class="no-history">

                <p>
                    No payment history available.
                </p>

            </div>
        `;

        return;
    }


    // ========================================
    // CREATE TABLE
    // ========================================

    const table =
        document.createElement('table');

    table.className = 'payment-table';


    table.innerHTML = `

        <thead>

            <tr>

                <th>Bill #</th>

                <th>Bill Amount</th>

                <th>Amount Paid</th>

                <th>Payment Date</th>

            </tr>

        </thead>

        <tbody></tbody>

    `;


    const tbody =
        table.querySelector('tbody');


    // ========================================
    // ADD PAYMENTS
    // ========================================

    history.forEach(payment => {

        const row =
            document.createElement('tr');


        const billAmount =
            Number(payment.bill_amount || 0);

        const amountPaid =
            Number(payment.amount_paid || 0);


        row.innerHTML = `

            <td>
                #${payment.bill_id}
            </td>

            <td>
                ₱${billAmount.toFixed(2)}
            </td>

            <td>
                ₱${amountPaid.toFixed(2)}
            </td>

            <td>
                ${formatDate(payment.payment_date)}
            </td>

        `;


        tbody.appendChild(row);

    });


    container.appendChild(table);

}


// ========================================
// FORMAT DATE
// ========================================

function formatDate(date) {

    if (!date) {
        return 'N/A';
    }


    const d = new Date(date);


    return d.toLocaleDateString(
        'en-US',
        {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }
    );

}