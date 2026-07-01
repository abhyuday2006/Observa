const BASE_URL = window.location.origin;
document
    .getElementById("signupBtn")
    .addEventListener("click", signup);

async function signup() {

    const name =
        document.getElementById("name").value;

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    const res = await fetch(
        `${BASE_URL}/auth/register`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                email,
                password
            })
        }
    );

    const data = await res.json();

    if (res.ok) {

        alert("Account created!");

        window.location.href = "login.html";

    } else {

        alert(data.message);

    }

}