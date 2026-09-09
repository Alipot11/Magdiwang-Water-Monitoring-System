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
            `http://localhost:3000/api/view-account/search/account/${meterId}`
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
        `${client.first_name.toUpperCase()} ${client.last_name.toUpperCase()}`;

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

        const billCard =
            document.createElement('div');

        billCard.className = 'bill-card';

        const heading =
            document.createElement('h3');

        heading.textContent =
            '✓ No Outstanding Bills';

        const paragraph =
            document.createElement('p');

        paragraph.textContent =
            'You have no unpaid bills at this time.';

        billCard.appendChild(heading);
        billCard.appendChild(paragraph);

        container.appendChild(billCard);

        return;
    }


    // ========================================
    // BILL LIST
    // ========================================

    const billsList =
        document.createElement('div');

    billsList.className = 'bills-list';


    // ========================================
    // DISPLAY EACH BILL
    // ========================================

    bills.forEach(bill => {

        const billElement =
            document.createElement('div');

        billElement.className = 'bill-card';


        // ========================================
        // CALCULATE AMOUNTS
        // ========================================

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


        // ========================================
        // BILL HEADER
        // ========================================

        const billHeader =
            document.createElement('div');

        billHeader.className = 'bill-header';


        const billNumber =
            document.createElement('div');

        billNumber.className = 'bill-number';


        const billLabel =
            document.createElement('span');

        billLabel.textContent = 'Bill';


        const billHeading =
            document.createElement('h3');

        billHeading.textContent =
            `#${bill.bill_id}`;


        billNumber.appendChild(billLabel);
        billNumber.appendChild(billHeading);


        const status =
            document.createElement('span');

        status.className = 'status';

        status.textContent =
            bill.status || 'UNKNOWN';


        billHeader.appendChild(billNumber);
        billHeader.appendChild(status);


        // ========================================
        // METER INFORMATION
        // ========================================

        const meterSection =
            document.createElement('div');

        meterSection.className = 'bill-section';


        const meterHeading =
            document.createElement('h4');

        meterHeading.textContent =
            'Meter Reading';


        const meterDetails =
            document.createElement('div');

        meterDetails.className = 'bill-details';


        function addDetail(container, labelText, valueText) {

            const detail =
                document.createElement('div');

            const label =
                document.createElement('label');

            label.textContent =
                labelText;

            const value =
                document.createElement('span');

            value.textContent =
                valueText;

            detail.appendChild(label);
            detail.appendChild(value);

            container.appendChild(detail);
        }


        addDetail(
            meterDetails,
            'Previous Reading:',
            bill.pre_reading
        );

        addDetail(
            meterDetails,
            'Current Reading:',
            bill.curr_reading
        );

        addDetail(
            meterDetails,
            'Consumption:',
            bill.tcmeter
        );


        meterSection.appendChild(meterHeading);
        meterSection.appendChild(meterDetails);


        // ========================================
        // BILL SUMMARY
        // ========================================

        const separator =
            document.createElement('hr');


        const summarySection =
            document.createElement('div');

        summarySection.className =
            'bill-section';


        const summaryHeading =
            document.createElement('h4');

        summaryHeading.textContent =
            'Bill Summary';


        const summaryDetails =
            document.createElement('div');

        summaryDetails.className =
            'bill-details';


        addDetail(
            summaryDetails,
            'Amount:',
            `₱${amount.toFixed(2)}`
        );

        addDetail(
            summaryDetails,
            'Surcharge:',
            `₱${surcharge.toFixed(2)}`
        );

        addDetail(
            summaryDetails,
            'Total Bill:',
            `₱${billAmount.toFixed(2)}`
        );


        // Balance row
        const balanceRow =
            document.createElement('div');

        balanceRow.className =
            'balance-row';


        const balanceLabel =
            document.createElement('label');

        balanceLabel.textContent =
            'Balance:';


        const balanceValue =
            document.createElement('span');

        balanceValue.className =
            'balance';

        balanceValue.textContent =
            `₱${balance.toFixed(2)}`;


        balanceRow.appendChild(balanceLabel);
        balanceRow.appendChild(balanceValue);


        // Due date
        const dueDate =
            document.createElement('div');

        dueDate.className =
            'due-date';


        const dueDateLabel =
            document.createElement('label');

        dueDateLabel.textContent =
            'Due Date:';


        const dueDateValue =
            document.createElement('span');

        dueDateValue.textContent =
            formatDate(bill.duedate);


        dueDate.appendChild(dueDateLabel);
        dueDate.appendChild(dueDateValue);


        summaryDetails.appendChild(balanceRow);
        summaryDetails.appendChild(dueDate);


        summarySection.appendChild(summaryHeading);
        summarySection.appendChild(summaryDetails);


        // ========================================
        // ADD EVERYTHING TO BILL CARD
        // ========================================

        billElement.appendChild(billHeader);
        billElement.appendChild(meterSection);
        billElement.appendChild(separator);
        billElement.appendChild(summarySection);

        billsList.appendChild(billElement);
    });


    container.appendChild(billsList);
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

        const noHistory =
            document.createElement('div');

        noHistory.className =
            'no-history';


        const paragraph =
            document.createElement('p');

        paragraph.textContent =
            'No payment history available.';


        noHistory.appendChild(paragraph);

        container.appendChild(noHistory);

        return;
    }


    // ========================================
    // CREATE PAYMENT HISTORY CONTAINER
    // ========================================

    const paymentHistory =
        document.createElement('div');

    paymentHistory.className =
        'payment-history';


    // ========================================
    // ADD PAYMENTS
    // ========================================

    history.forEach(payment => {

        const billAmount =
            Number(payment.bill_amount || 0);

        const amountPaid =
            Number(payment.amount_paid || 0);


        const paymentCard =
            document.createElement('div');

        paymentCard.className =
            'payment';


        function addPaymentDetail(
            container,
            labelText,
            valueText
        ) {

            const wrapper =
                document.createElement('div');


            const label =
                document.createElement('span');

            label.className =
                'payment-label';

            label.textContent =
                labelText;


            const value =
                document.createElement('strong');

            value.textContent =
                valueText;


            wrapper.appendChild(label);
            wrapper.appendChild(value);

            container.appendChild(wrapper);
        }


        addPaymentDetail(
            paymentCard,
            'Bill #',
            `#${payment.bill_id}`
        );

        addPaymentDetail(
            paymentCard,
            'Bill Amount',
            `₱${billAmount.toFixed(2)}`
        );

        addPaymentDetail(
            paymentCard,
            'Amount Paid',
            `₱${amountPaid.toFixed(2)}`
        );

        addPaymentDetail(
            paymentCard,
            'Payment Date',
            formatDate(payment.payment_date)
        );


        paymentHistory.appendChild(paymentCard);
    });


    // ========================================
    // ADD TO PAGE
    // ========================================

    container.appendChild(paymentHistory);
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