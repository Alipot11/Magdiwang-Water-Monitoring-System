document.getElementById('search_button').addEventListener('click', search_payment);

async function search_payment() {
    const search = document.getElementById('search_input').value;

    try {
        const response = await fetch(`http://localhost:3000/api/payments/print?q=${encodeURIComponent(search)}`,
        {
            credentials: 'include'
        }
    );

        const receipts = await response.json();

        display_account(receipts);

    } catch (error) {
        console.Error(error);
        alert('Search failed');
    }
}

function display_account(receipts) {
    const printable = document.getElementById('print_receipt');

    printable.innerHTML = '';
    
    if (receipts.length === 0) {
        printable.innerHTML = `
        <p>No Payment id</p>`;

        return;
    }
    receipts.forEach(receipt => {
        const row = `
            <h3>Magdiwang Water Supply System</h3>
            <p>Magdiwang, Romblon</p>
            <br>
            <p>Receipt No: ${receipt.payment_id}</p>
            <p>Customer: ${receipt.first_name.toUpperCase()} ${receipt.last_name.toUpperCase()}</p>
            <p>Meter / Account No: ${receipt.meter_id}</p>
            <p>Address: ${receipt.barangay.charAt(0).toUpperCase() + receipt.barangay.slice(1)} (${receipt.sitio.charAt(0).toUpperCase() + receipt.sitio.slice(1)})</p>
            <p>Payment Date: ${receipt.payment_date.split('T')[0]}</p>
            <p>Amount paid: ${receipt.amount_paid}</p>
        `;
        printable.innerHTML += row;
    });
}
