// --- Configuración Inicial ---
const CLIENT_ID = '185859829591-q0g3sceqj3lav0i7j72f2446lcdsbrdr.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAhPRG0GCJoDG9Q0P3dn6j0eVMw6OsNhPo';
const SPREADSHEET_ID = '1XDUE-usV_SOiPwlBPRB3RxDbQDRWJau4QBUsQSlVKJA';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// --- Variables Globales ---
let tokenClient;

// --- Mostrar Alertas ---
function showAlert(message, type = "info") {
    const existingAlert = document.querySelector(".alert-container");
    if (existingAlert) return; // Evita mostrar múltiples alertas

    const alertContainer = document.createElement("div");
    alertContainer.className = `alert-container alert-${type}`;
    alertContainer.textContent = message;

    document.body.appendChild(alertContainer);
    setTimeout(() => {
        alertContainer.classList.add("fade-out");
        setTimeout(() => alertContainer.remove(), 500);
    }, 4000);
}

// --- Inicializar OAuth Client ---
function initializeOAuthClient() {
    return new Promise((resolve) => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                if (response.error) {
                    console.error("Error en la autenticación:", response.error);
                    showAlert("Error en la autenticación. Inténtalo de nuevo.", "error");
                    return;
                }
                localStorage.setItem("googleAuthToken", response.access_token);
                console.log("Autenticación exitosa.");
                resolve();
            },
        });
        requestAuthToken();
    });
}

function requestAuthToken() {
    const token = localStorage.getItem("googleAuthToken");
    if (!token) {
        tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
        console.log("Token OAuth encontrado en localStorage.");
    }
}

// --- Validar Token OAuth ---
async function validateAuth() {
    const token = localStorage.getItem("googleAuthToken");
    if (!token) {
        console.log("Solicitando autenticación...");
        tokenClient.requestAccessToken({ prompt: "consent" });
        return;
    }
    console.log("Token válido.");
}

// --- Cargar Biblioteca GAPI ---
function loadGapiLibrary() {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        script.onload = () => gapi.load("client:auth2", resolve);
        script.onerror = () => reject("Error al cargar la Google API.");
        document.head.appendChild(script);
    });
}

// --- Inicializar Google Sheets API ---
async function initializeGoogleAPI() {
    try {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        });
        console.log("Google Sheets API inicializada.");
    } catch (error) {
        console.error("Error inicializando Google Sheets API:", error.message);
        showAlert("Error inicializando Google API.", "error");
    }
}

// --- Obtener Credenciales desde Sheets ---
async function fetchCredentials() {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "credenciales!A2:B",
        });
        return response.result.values || [];
    } catch (error) {
        console.error("Error al obtener credenciales:", error.message);
        showAlert("Error al cargar las credenciales.", "error");
        return [];
    }
}

// --- Manejar Inicio de Sesión ---
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const credentials = await fetchCredentials();
    const user = credentials.find((row) => row[0] === username && row[1] === password);

    if (user) {
        const userData = { username: user[0], role: user[2] };
        localStorage.setItem("user", JSON.stringify(userData));
        showAlert(`Bienvenido, ${userData.username}!`, "success");
        redirectToPage(userData.role);
    } else {
        showAlert("Usuario o contraseña incorrectos.", "error");
    }
});

function redirectToPage(role) {
    const pages = { bodega: "role/bodega.html", admin: "role/admin.html" };
    window.location.href = pages[role.toLowerCase()] || "role/default.html";
}

// --- Cargar Datos del Usuario ---
function loadUserData() {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData) {
        document.getElementById("user-name").textContent = `Nombre: ${userData.username}`;
        document.getElementById("connection-status").textContent = "Estado: Conectado";
    }
}

// --- Configurar Aplicación ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadGapiLibrary();
        await initializeOAuthClient();
        await validateAuth();
        await initializeGoogleAPI();
        loadUserData();
    } catch (error) {
        console.error("Error inicializando la aplicación:", error.message);
        showAlert("Error al inicializar la aplicación.", "error");
    }
});

// --- Estilos Dinámicos ---
const styles = `
.alert-container {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    font-weight: bold;
    border-radius: 8px;
    box-shadow: 0px 4px 6px rgba(0,0,0,0.1);
    z-index: 1000;
}
.alert-success { background-color: #d4edda; color: #155724; }
.alert-error { background-color: #f8d7da; color: #721c24; }
.fade-out { opacity: 0; transition: opacity 0.5s ease-in-out; }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
