document.getElementById('login_form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/admin/login', {
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

        if (!response.ok || !data.success) {
            document.getElementById('login_message').textContent =
                data.message || 'Login failed.';
            return;
        }

        if (data.user.role === 'admin') {
            window.location.href = 'admin.html';
        } else if (data.user.role === 'treasurer') {
            window.location.href = 'cashier.html';
        }
    } catch (error) {
        document.getElementById('login_message').textContent =
            'Unable to connect to the server.';
    }
});


// LETS YOU SEE THE PASSWORD YOU TYPED
function setupPasswordToggle(inputId, buttonId) {
    const passwordInput = document.getElementById(inputId);
    const toggleButton = document.getElementById(buttonId);

    toggleButton.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';

        passwordInput.type = isHidden ? 'text' : 'password';
        toggleButton.textContent = isHidden ? 'Hide' : 'Show';
    });
}

setupPasswordToggle('password', 'toggle_password');