// login.js - No necesita cambios
// import api from "../api/api.js";
// import showAlert from "../components/alerts.js";


// document.getElementById("loginForm").addEventListener("submit", async function (e) {

//   e.preventDefault();



//   const username = document.getElementById("username").value.trim();

//   const password = document.getElementById("password").value.trim();



//   if (!username || !password) {

//     showAlert({

//       title: "Campos vacíos",

//       message: "Por favor ingrese usuario y contraseña.",

//       type: "info",

//     });

//     return;

//   }



//   try {

//     const response = await api.post(`/auth/login`, { username, password }, {

//       headers: { "Content-Type": "application/json" }

//     });



//     const data = response.data;



//     // Guardar token, rol y nombre del usuario ingresado

//     localStorage.setItem("token", data.access_token);

//     localStorage.setItem("role", data.role_name);

//     localStorage.setItem("username", username); // GUARDAR USERNAME



//     // Redirigir al dashboard o página principal

//     window.location.href = "../pedidos/pedidos.html";



//   } catch (error) {

//     if (error.response) {

//       console.error("Error en respuesta:", error.response.data);

//       showAlert({

//         title: "Error de autenticación",

//         message: "Credenciales incorrectas o usuario no válido.",

//         type: "error",

//       });

//     } else {

//       console.error("Error de conexión:", error.message);

//       showAlert({

//         title: "Error de conexión",

//         message: "No se pudo conectar con el servidor. Verifica tu conexión o inténtalo más tarde.",

//         type: "error",

//       });

//     }

//   }

// });

function login() {
  var usernameInput = document.getElementById("username").value;
var passwordInput = document.getElementById("password").value;
  axios.post('http://localhost:8000/api/auth/login', {
    username : usernameInput,
    password : passwordInput
  })
  .then(function (response) {
    console.log('Success:', response.data);
  })
  .catch(function (error) {
    console.error('Error:', error);
  });
}