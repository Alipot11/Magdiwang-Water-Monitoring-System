async function load_receipt() {

    // Get payment_id from the URL
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id');

    if (!paymentId) {
        alert('No payment selected.');
        return;
    }

    try {

        // Get the selected payment and its complete bill information
        const response = await fetch(
            `/api/payments/print?payment_id=${encodeURIComponent(paymentId)}`,
            {
                credentials: 'include'
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Failed to load receipt'
            );
        }

        if (data.payments.length === 0) {
            throw new Error('Payment record not found.');
        }

        // The print_payments view returns one row for this payment
        const payment = data.payments[0];

        // Payment information
        document.getElementById('payment_id').textContent =
            payment.payment_id;

        document.getElementById('payment_date').textContent =
            payment.payment_date.split('T')[0];

        document.getElementById('amount_paid').textContent =
            Number(payment.amount_paid).toFixed(2);

        // Customer information
        document.getElementById('customer_name').textContent =
            `${payment.first_name.toUpperCase()} ${payment.last_name.toUpperCase()}`;

        document.getElementById('meter_id').textContent =
            payment.meter_id;

        function capitalize_words(text) {
            return text.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
        }

        document.getElementById('address').textContent =
            `${capitalize_words(payment.barangay)} (${capitalize_words(payment.sitio)})`;

        // Bill information
        document.getElementById('bill_id').textContent =
            payment.bill_id;

        document.getElementById('pre_reading').textContent =
            payment.pre_reading;

        document.getElementById('curr_reading').textContent =
            payment.curr_reading;

        document.getElementById('tcmeter').textContent =
            payment.tcmeter;

        document.getElementById('amount').textContent =
            Number(payment.amount).toFixed(2);

        document.getElementById('surcharge').textContent =
            Number(payment.surcharge).toFixed(2);

        document.getElementById('bill_amount').textContent =
            Number(payment.bill_amount).toFixed(2);

        document.getElementById('duedate').textContent =
            payment.duedate.split('T')[0];

    } catch (error) {

        console.error('Receipt loading error:', error);

        alert(error.message || 'Failed to load receipt.');
    }
}


// Load receipt automatically when the page opens
load_receipt();