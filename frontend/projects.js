const BASE_URL = window.location.origin;
const token = localStorage.getItem("token");

const projectsContainer = document.getElementById("projects");
const modal = document.getElementById("modal");
const projectNameInput = document.getElementById("projectName");

// ------------------------------
// Event Listeners
// ------------------------------

document
    .getElementById("createBtn")
    .addEventListener("click", () => {
        modal.classList.remove("hidden");
    });

document
    .getElementById("cancelBtn")
    .addEventListener("click", () => {
        modal.classList.add("hidden");
        projectNameInput.value = "";
    });

document
    .getElementById("saveBtn")
    .addEventListener("click", createProject);

// ------------------------------
// Load Projects
// ------------------------------
async function loadProjects() {

    try {

        const res = await fetch(
            `${BASE_URL}/projects`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const projects = await res.json();

        projectsContainer.innerHTML = "";

        projects.forEach(project => {

            projectsContainer.innerHTML += `
                <div class="project-card">

                    <h2>${project.name}</h2>

                    <p class="created">
                        Created:
                        ${new Date(project.created_at).toLocaleDateString()}
                    </p>

                    <div class="api-section">

                        <span
                            id="key-${project.id}"
                            class="api-key">
                            ••••••••••••••••••••••••••••••••••
                        </span>

                        <div class="actions">

                            <button onclick="copyKey('${project.api_key}')">
                                Copy
                            </button>

                            <button onclick="revealKey(${project.id}, '${project.api_key}')">
                                Reveal
                            </button>
                            <button onclick="deleteProject(${project.id})">
                                Delete
                            </button>


                            <button onclick="openProject(${project.id})">
                                Dashboard →
                            </button>

                        </div>

                    </div>

                </div>
            `;

        });

    } catch (err) {

        console.log(err);

        alert("Failed to load projects.");

    }

}
async function copyKey(key) {

    await navigator.clipboard.writeText(key);

    alert("API Key copied!");

}

function revealKey(id, key) {

    document.getElementById(
        `key-${id}`
    ).textContent = key;

}

loadProjects();

// ------------------------------
// Create Project
// ------------------------------

async function createProject() {

    const name = projectNameInput.value.trim();

    if (!name) {
        alert("Enter a project name");
        return;
    }

    try {

        const res = await fetch(
            `${BASE_URL}/projects`,
            {
                method: "POST",

                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name
                })
            }
        );

        if (!res.ok) {
            throw new Error("Couldn't create project");
        }

        modal.classList.add("hidden");
        projectNameInput.value = "";

        await loadProjects();

    } catch (err) {

        console.log(err);

        alert("Couldn't create project.");

    }

}

//delete project
async function deleteProject(id){
    const ok = confirm(
        "Delete this project?"
    );

    if(!ok) return;

    await fetch(
        `${BASE_URL}/projects/${id}`,
        {
            method:"DELETE",

            headers:{
                Authorization:`Bearer ${token}`
            }
        }
    );

    loadProjects();

}

// ------------------------------
// Open Dashboard
// ------------------------------

function openProject(id){
    window.location.href = `dashboard.html?project=${id}`;
}