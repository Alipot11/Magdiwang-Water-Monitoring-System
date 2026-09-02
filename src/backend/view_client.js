async function loadClient() {
    try {
        const response = await fetch('http://localhost:3000/api/view_account')

        if (!response.ok) {
            throw new Error('Failed to get account');
        }

        const accounts = await response.json();

        const table = document.getElementById('account_table');

        table.innerHTML = "";

        accounts.forEach(account => {
            const row = `
            <tr>
                <td>${account.meter_id}</td>
                <td>${account.first_name}</td>
                <td>${account.last_name}</td>
                <td>${account.barangay}</td>
                <td>${account.sitio}</td>
            </tr>`;

            table.innerHTML += row
        });
    } catch (error) {
        console.error(error);
    }
}

loadClient();