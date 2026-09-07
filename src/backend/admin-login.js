document.getElementById('login_form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            username,
            password
        })
    });

    const data = await response.json();

    if (!data.success) {
        document.getElementById('login_message').textContent = data.message;
        return;
    }

    if (data.user.role === 'admin') {
        window.location.href = 'admin.html';
    } else if (data.user.role === 'cashier') {
        window.location.href = 'cashier.html';
    }
});