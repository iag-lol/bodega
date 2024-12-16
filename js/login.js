// --- Configuración inicial ---
const CLIENT_ID = '185859829591-q0g3sceqj3lav0i7j72f2446lcdsbrdr.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAhPRG0GCJoDG9Q0P3dn6j0eVMw6OsNhPo';
const SPREADSHEET_ID = '1XDUE-usV_SOiPwlBPRB3RxDbQDRWJau4QBUsQSlVKJA';
const RANGE = 'credenciales!A2:E';

// --- Mostrar alertas ---
function showAlert(message, type = "info") {
    const alertContainer = document.getElementById("alert-container");
    if (!alertContainer) {
        console.error("Contenedor de alertas no encontrado.");
        return;
    }

    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    alertContainer.innerHTML = ""; // Limpia alertas previas
    alertContainer.appendChild(alert);

    // Eliminar la alerta después de 4 segundos
    setTimeout(() => {
        alert.remove();
    }, 4000);
}

// --- Cargar biblioteca GAPI ---
function loadGapiLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof gapi === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                gapi.load('client:auth2', resolve);
                console.log("Google API cargada correctamente.");
            };
            script.onerror = () => reject(new Error("Error al cargar Google API."));
            document.head.appendChild(script);
        } else {
            gapi.load('client:auth2', resolve);
        }
    });
}

// --- Inicializar Google API ---
async function initializeGoogleAPI() {
    try {
        console.log("Inicializando Google Sheets API...");
        await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
            scope: SCOPES,
        });
        console.log("Google Sheets API inicializada correctamente.");
    } catch (error) {
        console.error("Error inicializando Google Sheets API:", error.message);
        showAlert("Error inicializando Google Sheets API.", "error");
        throw error;
    }
}


async function validateAuth() {
    const token = localStorage.getItem("googleAuthToken");
    if (!token) {
        console.log("Solicitando autenticación...");
        tokenClient.requestAccessToken({ prompt: "consent" });
        return;
    }

    try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
        if (!response.ok) {
            console.warn("Token expirado. Solicitando nuevo...");
            tokenClient.requestAccessToken({ prompt: "consent" });
        } else {
            console.log("Token válido.");
        }
    } catch (error) {
        console.error("Error validando el token:", error.message);
        tokenClient.requestAccessToken({ prompt: "consent" });
    }
}

// --- Obtener credenciales desde Google Sheets ---
async function fetchCredentials() {
    try {
        await validateAuth(); // Verificar autenticación antes de llamar a la API

        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID, // Asegúrate de que el ID es correcto
            range: "credenciales!A2:B", // Rango correcto donde están usuario y contraseña
        });

        if (!response.result.values) {
            console.warn("No se encontraron credenciales en el rango especificado.");
            showAlert("No hay credenciales disponibles en la hoja.", "warning");
            return null;
        }

        console.log("Credenciales cargadas correctamente:", response.result.values);
        return response.result.values; // Devolver los datos
    } catch (error) {
        console.error("Error al obtener credenciales:", error.message);
        showAlert("Error al cargar las credenciales. Verifica los permisos OAuth.", "error");
        return null;
    }
}
// --- Validar usuario y redirigir ---
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
        const userData = {
            username: user[0],
            role: user[2], // Cargo del usuario
            terminal: user[3], // Terminal asignada
        };

        // Guardar datos del usuario en localStorage
        localStorage.setItem("user", JSON.stringify(userData));
        showAlert(`Inicio de sesión exitoso. Bienvenido, ${userData.username}!`, "success");

        // Redirigir según el rol del usuario
        redirectToPage(userData.role);
    } else {
        showAlert("Usuario o contraseña incorrectos.", "error");
    }
});

// --- Redirigir según el cargo ---
function redirectToPage(role) {
    const rolePages = {
        "bodega": "role/bodega.html",
        "administrador": "role/admin.html",
        "empleado": "role/empleado.html",
    };

    const destination = rolePages[role.toLowerCase()] || "role/default.html";
    setTimeout(() => {
        window.location.href = destination;
    }, 2000); // Espera para mostrar la alerta
}

// --- Inicializar aplicación ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadGapiLibrary();       // Cargar Google API Library
        initializeOAuthClient();       // Configurar cliente OAuth
        await validateAuth();          // Validar autenticación OAuth
        await initializeGoogleAPI();   // Inicializar Google Sheets API

        const credentials = await fetchCredentials(); // Obtener credenciales
        if (credentials) {
            console.log("Credenciales cargadas correctamente.");
        }
    } catch (error) {
        console.error("Error durante la inicialización:", error.message);
        showAlert("Error al inicializar la aplicación.", "error");
    }
});

// --- Configuración de Alertas Mejoradas ---
function showAlert(message, type = "info") {
    // Verificar si ya existe una alerta visible
    if (document.querySelector(".alert-container")) {
        console.log("Ya hay una alerta activa. No se mostrará otra.");
        return;
    }

    // Crear contenedor de la alerta
    const alertContainer = document.createElement("div");
    alertContainer.className = `alert-container alert-${type}`;
    alertContainer.textContent = message;

    // Agregar al cuerpo del documento
    document.body.appendChild(alertContainer);

    // Reproducir sonido según el tipo
    playAlertSound(type);

    // Animación y remoción de la alerta después de 4 segundos
    setTimeout(() => {
        alertContainer.classList.add("fade-out");
        setTimeout(() => alertContainer.remove(), 1000); // Espera animación antes de eliminar
    }, 4000);
}

// --- Reproducir sonido de alerta ---
function playAlertSound(type) {
    const audio = new Audio();
    switch (type) {
        case "success":
            audio.src = "sounds/success.mp3"; // Ruta al sonido de éxito
            break;
        case "error":
            audio.src = "sounds/error.mp3"; // Ruta al sonido de error
            break;
        case "warning":
            audio.src = "sounds/warning.mp3"; // Ruta al sonido de advertencia
            break;
        default:
            audio.src = "sounds/info.mp3"; // Ruta al sonido de información
            break;
    }

    // Reproducir el sonido solo si hay interacción del usuario
    audio.play().catch((err) => {
        console.warn("Sonido bloqueado por falta de interacción previa del usuario.");
    });
}

// --- CSS Dinámico para Ajustar los Colores Pastel ---
const styles = `
    .alert-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 15px 20px;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: bold;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
        color: #fff;
        animation: fade-in 0.5s ease-in-out;
        opacity: 1;
        transition: opacity 1s ease-in-out;
    }
    .alert-success {
        background-color: #d4edda; /* Verde pastel */
        color: #155724; /* Texto verde oscuro */
        border: 1px solid #c3e6cb;
    }
    .alert-error {
        background-color: #f8d7da; /* Rojo pastel */
        color: #721c24; /* Texto rojo oscuro */
        border: 1px solid #f5c6cb;
    }
    .alert-warning {
        background-color: #fff3cd; /* Amarillo pastel */
        color: #856404; /* Texto amarillo oscuro */
        border: 1px solid #ffeeba;
    }
    .alert-info {
        background-color: #d1ecf1; /* Azul pastel */
        color: #0c5460; /* Texto azul oscuro */
        border: 1px solid #bee5eb;
    }
    .fade-out {
        opacity: 0;
    }
    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

// --- Insertar estilos dinámicamente ---
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
