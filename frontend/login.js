const BASE_URL = window.location.origin;
document
    .getElementById("loginBtn")
    .addEventListener("click", login);

async function login(){

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    const res = await fetch(
        `${BASE_URL}/auth/login`,
        {

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({
                email,
                password
            })

        }
    );

    const data = await res.json();

    if(res.ok){

        localStorage.setItem(
            "token",
            data.token
        );

        window.location.href =
            "projects.html";

    }

    else{

        alert(data.message);

    }

}