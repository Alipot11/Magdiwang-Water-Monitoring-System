let currentPage = 1;
const limit = 10;

// DISPLAYS THE AUDIT LOGS FROM THE DATABASE
async function loadAuditLogs() {
    try {
        const response = await fetch(
            `/api/view-account/audit-logs?page=${currentPage}&limit=${limit}`,
            {
                credentials: 'include'
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get audit logs');
        }

        const data = await response.json();

        const table = document.getElementById('audit_table');

        table.innerHTML = '';

        data.logs.forEach(log => {
            const row = document.createElement('tr');

            const values = [
                new Date(log.created_at).toLocaleString(),
                log.full_name || log.username || '-',
                log.action || '-',
                log.table_name || '-',
                log.meter_id ?? '-',
                `${log.owner_first_name || ''} ${log.owner_last_name || ''}`.trim() || '-',
                log.description || '-'
            ];

            values.forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            });

            table.appendChild(row);
        });

        document.getElementById('page_info').textContent =
            `Page ${data.pagination.page} of ${data.pagination.totalPages || 1}`;

        document.getElementById('previous_button').disabled =
            currentPage <= 1;

        document.getElementById('next_button').disabled =
            currentPage >= data.pagination.totalPages;

    } catch (error) {
        alert('Failed to load audit logs')
    }
}

document.getElementById('previous_button').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadAuditLogs();
    }
});

document.getElementById('next_button').addEventListener('click', () => {
    currentPage++;
    loadAuditLogs();
});

loadAuditLogs();