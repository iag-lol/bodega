// --- Configuración inicial ---
const CLIENT_ID = "185859829591-q0g3sceqj3lav0i7j72f2446lcdsbrdr.apps.googleusercontent.com";
const API_KEY = "AIzaSyAhPRG0GCJoDG9Q0P3dn6j0eVMw6OsNhPo";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";
const SPREADSHEET_ID = "1XDUE-usV_SOiPwlBPRB3RxDbQDRWJau4QBUsQSlVKJA";

let tokenClient;

// --- Esperar a que gapi cargue completamente ---
function loadGapi() {
    return new Promise((resolve) => {
        gapi.load("client", () => {
            console.log("Google API cargada correctamente.");
            resolve();
        });
    });
}

// --- Inicializar Google API ---
async function initializeGoogleAPI() {
    try {
        console.log("Inicializando Google Sheets API...");
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        });
        console.log("Google Sheets API inicializada correctamente.");
    } catch (error) {
        console.error("Error inicializando Google Sheets API:", error.message);
        showAlert("Error inicializando la API de Google Sheets.", "error");
        throw error;
    }
}

// --- Inicializar Cliente OAuth ---
function initializeOAuthClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
            if (response.error) {
                showAlert("Error de autenticación.", "error");
                return;
            }
            localStorage.setItem("googleAuthToken", response.access_token);
            console.log("Token OAuth almacenado correctamente.");
        },
    });
    validateAuth();
}

// --- Validar Autenticación ---
async function validateAuth() {
    const token = localStorage.getItem("googleAuthToken");
    if (!token) {
        console.log("Solicitando autenticación...");
        tokenClient.requestAccessToken({ prompt: "consent" });
        return;
    }
    console.log("Token existente, validando...");
    try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
        if (!response.ok) throw new Error("Token inválido.");
        console.log("Token válido.");
    } catch {
        console.warn("Token inválido. Solicitando nuevo...");
        tokenClient.requestAccessToken({ prompt: "consent" });
    }
}

// --- Mostrar Alertas ---
function showAlert(message, type = "info") {
    const alert = document.createElement("div");
    alert.textContent = message;
    alert.style = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px;
        background-color: ${type === "error" ? "#f8d7da" : "#d4edda"};
        color: ${type === "error" ? "#721c24" : "#155724"};
        border-radius: 8px;
        z-index: 1000;
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

// --- Inicialización Principal ---
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Iniciando aplicación...");
    try {
        await initializeGoogleAPI();
        console.log("Google API inicializada y lista.");
    } catch (error) {
        console.error("Error al iniciar la aplicación:", error.message);
        showAlert("Error al iniciar la aplicación.", "error");
    }
});



// --- Obtener credenciales desde Google Sheets ---
async function fetchCredentials() {
    try {
        await validateAuth(); // Asegura que el token es válido

        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "credenciales!A2:B", // Rango de la hoja
        });

        if (!response.result.values) {
            console.warn("No se encontraron credenciales en la hoja.");
            showAlert("No hay credenciales disponibles.", "warning");
            return null;
        }

        console.log("Credenciales obtenidas correctamente:", response.result.values);
        return response.result.values;
    } catch (error) {
        console.error("Error obteniendo credenciales:", error);

        if (error.status === 403) {
            showAlert("Error: Acceso prohibido. Verifica los permisos de la hoja.", "error");
        } else {
            showAlert("Error al obtener las credenciales.", "error");
        }
        return null;
    }
}



document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const credentials = await fetchCredentials();
    if (!credentials) {
        showAlert("Error al cargar las credenciales. Inténtalo más tarde.", "error");
        return;
    }

    // Validar credenciales
    const user = credentials.find((row) => row[0] === username && row[1] === password);

    if (user) {
        console.log("Datos del usuario:", user);
        const userData = {
            username: user[0],
            role: user[2] || "bodega", // Valor por defecto si falta el rol
            terminal: user[3] || "default",
        };

        // Guardar en localStorage
        localStorage.setItem("user", JSON.stringify(userData));
        showAlert(`Inicio de sesión exitoso. Bienvenido, ${userData.username}!`, "success");

        // Redirigir a la página correcta
        redirectToPage(userData.role);
    } else {
        showAlert("Usuario o contraseña incorrectos.", "error");
    }
});

// --- Redirigir según el cargo ---
function redirectToPage(role) {
    if (!role) {
        console.warn("Rol no definido. Redirigiendo a página por defecto.");
        window.location.href = "role/default.html";
        return;
    }

    const rolePages = {
        "bodega": "role/bodega.html",
        "administrador": "role/admin.html",
        "empleado": "role/empleado.html",
    };

    const destination = rolePages[role.toLowerCase()] || "role/default.html";
    console.log(`Redirigiendo a: ${destination}`);
    window.location.href = destination;
}
