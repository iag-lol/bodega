// --- Configuración de la API ---
const CLIENT_ID = '185859829591-q0g3sceqj3lav0i7j72f2446lcdsbrdr.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAhPRG0GCJoDG9Q0P3dn6j0eVMw6OsNhPo';
const SPREADSHEET_ID = '1XDUE-usV_SOiPwlBPRB3RxDbQDRWJau4QBUsQSlVKJA';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// --- Variables Globales ---
let tokenClient;
let isAlertVisible = false;

// --- Inicialización de OAuth2 ---
function initializeOAuthClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        prompt: "consent",
        callback: (response) => {
            if (response.error) {
                console.error("Error en la autenticación OAuth:", response.error);
                showAlert("Error durante la autenticación. Intenta nuevamente.", "error");
                return;
            }
            if (response.access_token) {
                localStorage.setItem("googleAuthToken", response.access_token);
                console.log("Autenticación exitosa. Token almacenado.");
            }
        },
    });
    tokenClient.requestAccessToken();
}

// --- Validar y Refrescar Token OAuth ---
async function validateAuth() {
    const token = localStorage.getItem("googleAuthToken");
    if (!token) {
        console.log("Token no encontrado. Solicitando un nuevo token...");
        tokenClient.requestAccessToken({ prompt: "consent" });
        return;
    }

    try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
        if (!response.ok) {
            console.warn("Token expirado. Solicitando un nuevo token...");
            tokenClient.requestAccessToken({ prompt: "consent" });
        } else {
            console.log("Token válido.");
        }
    } catch (error) {
        console.error("Error validando el token:", error.message);
        tokenClient.requestAccessToken({ prompt: "consent" });
    }
}

// --- Mostrar Alertas Avanzadas ---
function showAlert(message, type = "info") {
    if (isAlertVisible) return;
    isAlertVisible = true;

    const alertContainer = document.createElement("div");
    alertContainer.className = `alert alert-${type}`;
    alertContainer.textContent = message;

    alertContainer.style.position = "fixed";
    alertContainer.style.top = "20px";
    alertContainer.style.right = "20px";
    alertContainer.style.padding = "15px 20px";
    alertContainer.style.borderRadius = "8px";
    alertContainer.style.zIndex = "1000";
    alertContainer.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
    alertContainer.style.color = "#333";

    switch (type) {
        case "success":
            alertContainer.style.backgroundColor = "#d4edda";
            alertContainer.style.border = "1px solid #c3e6cb";
            break;
        case "error":
            alertContainer.style.backgroundColor = "#f8d7da";
            alertContainer.style.border = "1px solid #f5c6cb";
            break;
        case "warning":
            alertContainer.style.backgroundColor = "#fff3cd";
            alertContainer.style.border = "1px solid #ffeeba";
            break;
        default:
            alertContainer.style.backgroundColor = "#d1ecf1";
            alertContainer.style.border = "1px solid #bee5eb";
    }

    document.body.appendChild(alertContainer);
    setTimeout(() => {
        alertContainer.remove();
        isAlertVisible = false;
    }, 5000);
}

// --- Cargar Google API ---
function loadGapiLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof gapi === "undefined") {
            const script = document.createElement("script");
            script.src = "https://apis.google.com/js/api.js";
            script.onload = () => {
                console.log("Google API cargada correctamente.");
                gapi.load("client", resolve);
            };
            script.onerror = () => reject(new Error("Error al cargar Google API."));
            document.head.appendChild(script);
        } else {
            gapi.load("client", resolve);
        }
    });
}

// --- Inicializar Google API ---
async function initializeGoogleAPI() {
    try {
        console.log("Inicializando Google API...");
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        });
        console.log("Google API inicializada correctamente.");
    } catch (error) {
        console.error("Error inicializando Google API:", error);
        showAlert("Error al inicializar Google API.", "error");
        throw error;
    }
}

// --- Actualización Dinámica de la Página ---
function startAutoRefresh(interval = 5000) {
    setInterval(async () => {
        try {
            console.log("Actualizando parámetros de la página...");

            // Validar autenticación OAuth antes de continuar
            await validateAuth();

            // Actualizar contadores
            await updateCounters();

            // Recargar la tabla de entregas
            await loadDeliveryTable();

            console.log("Actualización completa.");
        } catch (error) {
            console.error("Error durante la actualización automática:", error.message);
            showAlert("Error durante la actualización automática. Verifica tus permisos OAuth.", "error");
        }
    }, interval);
}


// --- Llenar la tarjeta de usuario con datos almacenados ---
function fillUserCard() {
    try {
        // Obtener los datos almacenados en localStorage
        const userData = JSON.parse(localStorage.getItem("user"));

        if (!userData) {
            console.warn("No se encontraron datos del usuario en localStorage.");
            document.getElementById("user-name").textContent = "Nombre: No disponible";
            document.getElementById("user-role").textContent = "Cargo: No disponible";
            document.getElementById("connection-status").textContent = "Estado: Desconectado";
            document.getElementById("connection-status").classList.remove("connected");
            document.getElementById("connection-status").classList.add("disconnected");
            return;
        }

        // Llenar los campos con los datos del usuario
        document.getElementById("user-name").textContent = `Nombre: ${userData.username || "No disponible"}`;
        document.getElementById("user-role").textContent = `Cargo: ${userData.role || "No disponible"}`;
        document.getElementById("connection-status").textContent = "Estado: Conectado";
        document.getElementById("connection-status").classList.add("connected");
        document.getElementById("connection-status").classList.remove("disconnected");

        console.log("Tarjeta de usuario actualizada correctamente.");
    } catch (error) {
        console.error("Error llenando la tarjeta de usuario:", error.message);
        document.getElementById("user-name").textContent = "Nombre: Error";
        document.getElementById("user-role").textContent = "Cargo: Error";
        document.getElementById("connection-status").textContent = "Estado: Desconectado";
        document.getElementById("connection-status").classList.remove("connected");
        document.getElementById("connection-status").classList.add("disconnected");
    }
}

// --- Llamar a la función cuando el DOM esté cargado ---
document.addEventListener("DOMContentLoaded", () => {
    fillUserCard();

    // Configurar el botón de cerrar sesión
    document.getElementById("logout-button").addEventListener("click", () => {
        localStorage.removeItem("user");
        localStorage.removeItem("googleAuthToken");
        document.getElementById("user-name").textContent = "Nombre: Cargando...";
        document.getElementById("user-role").textContent = "Cargo: Cargando...";
        document.getElementById("connection-status").textContent = "Estado: Desconectado";
        document.getElementById("connection-status").classList.remove("connected");
        document.getElementById("connection-status").classList.add("disconnected");
        alert("Sesión cerrada correctamente.");
        setTimeout(() => {
            window.location.href = "../index.html";
        }, 1000);
    });
});

// --- Actualizar Estado de Conexión ---
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById("connection-status");

    if (isConnected) {
        // Estado conectado
        statusElement.textContent = "Estado: Conectado";
        statusElement.className = "connected"; // Cambiar clase a 'connected'
    } else {
        // Estado desconectado
        statusElement.textContent = "Estado: Desconectado";
        statusElement.className = "disconnected"; // Cambiar clase a 'disconnected'
    }
}

// --- Simulación del Estado de Conexión ---
document.addEventListener("DOMContentLoaded", () => {
    let isConnected = false; // Cambia el valor para probar diferentes estados

    // Llama a la función con el estado inicial
    updateConnectionStatus(isConnected);

    // Simula un cambio de estado después de 5 segundos
    setTimeout(() => {
        isConnected = !isConnected; // Cambiar el estado dinámicamente
        updateConnectionStatus(isConnected);
    }, 5000);
});


// --- Configurar Fecha y Hora Automáticamente ---
function setDateTimeFields() {
    const dateInput = document.getElementById("delivery-date");
    const timeInput = document.getElementById("delivery-time");

    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${now.getFullYear()}`;
    const formattedTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

    if (dateInput) dateInput.value = formattedDate;
    if (timeInput) timeInput.value = formattedTime;
}

// --- Llenar Selector de Productos ---
async function loadProductOptions() {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "bodega!C7:C",
        });

        const productSelect = document.getElementById("product-select");
        productSelect.innerHTML = '<option value="">Seleccione un producto</option>';

        const products = response.result.values || [];
        products.forEach((product, index) => {
            const option = document.createElement("option");
            option.value = index + 7;
            option.textContent = product[0];
            productSelect.appendChild(option);
        });

        console.log("Productos cargados.");
    } catch (error) {
        console.error("Error cargando productos:", error.message);
        showAlert("Error cargando productos.", "error");
    }
}

// --- Actualizar Contadores ---
async function updateCounters() {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "bodega!E2:I2",
        });

        const values = response.result.values[0];
        if (!values || values.length < 3) {
            console.warn("Datos insuficientes en los contadores.");
            return;
        }

        document.getElementById("counter-stock").textContent = values[0] || "0";
        document.getElementById("counter-truck").textContent = values[1] || "0";
        document.getElementById("counter-low-stock").textContent = values[2] || "0";
    } catch (error) {
        console.error("Error al actualizar los contadores:", error.message);
        showAlert("Error al cargar los contadores.", "error");
    }
}

// --- Manejar Envío del Formulario ---
async function handleDeliveryForm(event) {
    event.preventDefault();

    const productSelect = document.getElementById("product-select");
    const quantityInput = document.getElementById("delivery-quantity");
    const personInput = document.getElementById("delivery-person");
    const dateInput = document.getElementById("delivery-date").value;
    const timeInput = document.getElementById("delivery-time").value;

    const selectedProductRow = productSelect.value; // Fila del producto seleccionado
    const quantity = parseInt(quantityInput.value);
    const personName = personInput.value.trim();

    if (!selectedProductRow || quantity <= 0 || !personName) {
        showAlert("Completa todos los campos correctamente.", "error");
        return;
    }

    try {
        await validateAuth(); // Verificar autenticación

        // Obtener el stock actual del producto
        const stockResponse = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `bodega!F${selectedProductRow}`, // Columna F contiene el stock
        });

        const currentStock = parseInt(stockResponse.result.values[0][0]);

        if (currentStock === 0) {
            // Mostrar alerta flotante si el stock es 0
            showStockAlert(
                "El producto que deseas entregar está en stock 0. ¿Estás seguro que deseas continuar?",
                async () => {
                    // Si el usuario confirma, registrar la entrega
                    await gapi.client.sheets.spreadsheets.values.append({
                        spreadsheetId: SPREADSHEET_ID,
                        range: "bodega!N7:S",
                        valueInputOption: "USER_ENTERED",
                        resource: {
                            values: [
                                ["", productSelect.options[productSelect.selectedIndex].text, quantity, dateInput, timeInput, personName],
                            ],
                        },
                    });
                    showAlert("Entrega registrada correctamente.", "success");
                    quantityInput.value = "";
                    personInput.value = "";
                },
                () => {
                    // Si el usuario cancela, limpiar el formulario
                    productSelect.value = "";
                    quantityInput.value = "";
                    personInput.value = "";
                    showAlert("Entrega cancelada.", "warning");
                }
            );
        } else {
            // Si hay stock, registrar la entrega directamente
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: "bodega!N7:S",
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: [
                        ["", productSelect.options[productSelect.selectedIndex].text, quantity, dateInput, timeInput, personName],
                    ],
                },
            });
            showAlert("Entrega registrada correctamente.", "success");
            quantityInput.value = "";
            personInput.value = "";
        }
    } catch (error) {
        console.error("Error al procesar la entrega:", error.message);
        showAlert("Error al registrar la entrega. Verifica los permisos OAuth.", "error");
    }
}
// --- Cargar Tabla de Entregas ---
async function loadDeliveryTable() {
    try {
        console.log("Cargando la tabla de entregas...");

        // Solicitar datos desde Google Sheets
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "bodega!N7:S", // Rango donde están los datos
        });

        const rows = response.result.values || [];
        const tableBody = document.querySelector("#deliveries-table tbody");

        // Limpiar cualquier contenido previo en la tabla
        tableBody.innerHTML = "";

        // Verificar si hay datos
        if (rows.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='4'>No hay registros disponibles.</td></tr>";
            console.log("No hay datos para mostrar en la tabla.");
            return;
        }

        // Insertar las filas en la tabla
        rows.reverse().forEach(row => {
            const tr = document.createElement("tr");

            // Mapear las columnas específicas de la hoja de cálculo
            const [productName, quantity, deliveryDate, personName] = [
                row[1] || "N/A", // Columna O: Nombre del producto
                row[2] || "N/A", // Columna P: Cantidad
                row[3] || "N/A", // Columna Q: Fecha
                row[5] || "N/A", // Columna S: Nombre del personal
            ];

            // Crear las celdas de la fila
            [productName, quantity, deliveryDate, personName].forEach(cellData => {
                const td = document.createElement("td");
                td.textContent = cellData;
                tr.appendChild(td);
            });

            // Añadir la fila a la tabla
            tableBody.appendChild(tr);
        });

        console.log("Tabla de entregas cargada correctamente.");
    } catch (error) {
        console.error("Error al cargar la tabla de entregas:", error.message);
        showAlert("Error al cargar los datos de la tabla. Verifica tus permisos OAuth.", "error");
    }
}

// --- Inicializar Aplicación ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Cargar y configurar Google API
        await loadGapiLibrary();
        initializeOAuthClient();
        await validateAuth();
        await initializeGoogleAPI();

        // Configurar los elementos iniciales
        setDateTimeFields();
        await loadProductOptions();
        await updateCounters();
        await loadDeliveryTable();

        // Vincular el evento del formulario
        document.getElementById("delivery-form").addEventListener("submit", handleDeliveryForm);

        // Iniciar la actualización automática
        startAutoRefresh();

        console.log("Aplicación inicializada correctamente.");
    } catch (error) {
        console.error("Error inicializando la aplicación:", error.message);
        showAlert("Error inicializando la aplicación. Verifica los permisos OAuth.", "error");
    }
});



// --- Mostrar Alerta Flotante para Confirmación ---
function showStockAlert(message, onConfirm, onCancel) {
    // Crear el contenedor de la alerta
    const alertContainer = document.createElement("div");
    alertContainer.style.position = "fixed";
    alertContainer.style.top = "50%";
    alertContainer.style.left = "50%";
    alertContainer.style.transform = "translate(-50%, -50%)";
    alertContainer.style.zIndex = "2000";
    alertContainer.style.backgroundColor = "#fff";
    alertContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    alertContainer.style.padding = "20px";
    alertContainer.style.borderRadius = "10px";
    alertContainer.style.textAlign = "center";
    alertContainer.style.width = "300px";
    alertContainer.style.fontFamily = "Arial, sans-serif";

    // Crear el mensaje
    const alertMessage = document.createElement("p");
    alertMessage.textContent = message;
    alertMessage.style.marginBottom = "20px";
    alertMessage.style.fontSize = "16px";
    alertContainer.appendChild(alertMessage);

    // Botón de "Sí"
    const yesButton = document.createElement("button");
    yesButton.textContent = "Sí";
    yesButton.style.marginRight = "10px";
    yesButton.style.padding = "10px 20px";
    yesButton.style.backgroundColor = "#28a745";
    yesButton.style.color = "#fff";
    yesButton.style.border = "none";
    yesButton.style.borderRadius = "5px";
    yesButton.style.cursor = "pointer";
    yesButton.addEventListener("click", () => {
        document.body.removeChild(alertContainer);
        if (onConfirm) onConfirm();
    });
    alertContainer.appendChild(yesButton);

    // Botón de "No"
    const noButton = document.createElement("button");
    noButton.textContent = "No";
    noButton.style.padding = "10px 20px";
    noButton.style.backgroundColor = "#dc3545";
    noButton.style.color = "#fff";
    noButton.style.border = "none";
    noButton.style.borderRadius = "5px";
    noButton.style.cursor = "pointer";
    noButton.addEventListener("click", () => {
        document.body.removeChild(alertContainer);
        if (onCancel) onCancel();
    });
    alertContainer.appendChild(noButton);

    // Añadir la alerta al cuerpo del documento
    document.body.appendChild(alertContainer);
}