const message = document.getElementById('message');
const usersTableBody = document.getElementById('users_table_body');

async function loadUsers() {
    const response = await fetch('/api/admin/users', {
        credentials: 'same-origin'
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load users.');
    }

    usersTableBody.innerHTML = '';

    data.users.forEach(user => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${user.user_id}</td>
            <td>${user.username}</td>
            <td>${user.full_name}</td>
            <td>${user.role}</td>
            <td>${user.is_active ? 'Active' : 'Inactive'}</td>
            <td></td>
        `;

        const actionCell = row.lastElementChild;

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Edit';

        editButton.addEventListener('click', () => {
            document.getElementById('edit_user_id').value = user.user_id;
            document.getElementById('edit_username').value = user.username;
            document.getElementById('edit_full_name').value = user.full_name;
            document.getElementById('edit_role').value = user.role;
            document.getElementById('edit_password').value = '';
        });

        const actionButton = document.createElement('button');

        actionButton.type = 'button';
        actionButton.textContent = user.is_active ? 'Deactivate' : 'Activate';

        actionButton.addEventListener('click', () => {
            const action = user.is_active ? 'deactivate' : 'activate';

            const confirmed = window.confirm(
                `Are you sure you want to ${action} ${user.username}?`
            );

            if (!confirmed) {
                return;
            }

            updateUserStatus(user.user_id, user.is_active).catch(error => {
                console.error(error);
                message.textContent = error.message;
            });
        });

        actionCell.appendChild(editButton);
        actionCell.appendChild(actionButton);
        usersTableBody.appendChild(row);
    });
}


async function updateUserStatus(userId, isActive) {
    message.textContent = '';

    const csrfResponse = await fetch('/api/admin/csrf-token', {
        credentials: 'same-origin'
    });

    const csrfData = await csrfResponse.json();

    const endpoint = isActive
        ? `/api/admin/users/${userId}/deactivate`
        : `/api/admin/users/${userId}/activate`;

    const response = await fetch(endpoint, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
            'X-CSRF-Token': csrfData.csrfToken
        }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update account status.');
    }

    message.textContent = data.message;

    await loadUsers();
}

document.getElementById('create_user_form').addEventListener('submit', async event => {
    event.preventDefault();

    message.textContent = '';

    try {
        const csrfResponse = await fetch('/api/admin/csrf-token', {
            credentials: 'same-origin'
        });

        const csrfData = await csrfResponse.json();

        const response = await fetch('/api/admin/users', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfData.csrfToken
            },
            body: JSON.stringify({
                username: document.getElementById('new_username').value,
                full_name: document.getElementById('new_full_name').value,
                password: document.getElementById('new_password').value,
                role: document.getElementById('new_role').value
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to create account.');
        }

        message.textContent = data.message;

        event.target.reset();

        await loadUsers();
    } catch (error) {
        console.error(error);
        message.textContent = error.message;
    }
});

loadUsers().catch(error => {
    console.error(error);
    message.textContent = error.message;
});

document.getElementById('edit_user_form').addEventListener('submit', async event => {
    event.preventDefault();

    message.textContent = '';

    try {
        const userId = document.getElementById('edit_user_id').value;

        const csrfResponse = await fetch('/api/admin/csrf-token', {
            credentials: 'same-origin'
        });

        const csrfData = await csrfResponse.json();

        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfData.csrfToken
            },
            body: JSON.stringify({
                username: document.getElementById('edit_username').value,
                full_name: document.getElementById('edit_full_name').value,
                password: document.getElementById('edit_password').value,
                role: document.getElementById('edit_role').value
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to update account.');
        }

        message.textContent = data.message;

        event.target.reset();

        await loadUsers();
    } catch (error) {
        console.error(error);
        message.textContent = error.message;
    }
});

document.getElementById('cancel_edit').addEventListener('click', () => {
    document.getElementById('edit_user_form').reset();

    const passwordInput = document.getElementById('edit_password');
    const toggleButton = document.getElementById('toggle_edit_password');

    passwordInput.type = 'password';
    toggleButton.textContent = 'Show';
});


//LETS YOU SHOW THE PASSWORD YOU TYPED
function setupPasswordToggle(inputId, buttonId) {
    const passwordInput = document.getElementById(inputId);
    const toggleButton = document.getElementById(buttonId);

    toggleButton.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';

        passwordInput.type = isHidden ? 'text' : 'password';
        toggleButton.textContent = isHidden ? 'Hide' : 'Show';
    });
}

setupPasswordToggle('new_password', 'toggle_new_password');
setupPasswordToggle('edit_password', 'toggle_edit_password');