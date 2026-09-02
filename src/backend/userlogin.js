document.getElementById('search_button').addEventListener('click', account);

async function account() {
    const search = document.getElementById('search_input').value;

    try {
        const response = await fetch(`http://localhost:3000/api/account?q=${encodeURIComponent(search)}`);

        const accounts = await response.json();

    }

    catch (error){
        console.Error(error);
        alert('Search failed');

    }
}

function display_account(accounts) {
    
}