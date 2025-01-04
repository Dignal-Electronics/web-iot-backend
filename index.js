require('dotenv').config();
global.functions = require('./functions');
const express = require("express");
const app = express();
const routes = require("./routes");
const cors = require('cors');

// Mis importaciones
const serverHttp = require('http').createServer();
const io = require('socket.io')(serverHttp, {
	cors: {
		origin: "*"
	}
});
const db = require('./models');
const Device = db.Device;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(routes);

app.listen(process.env.API_PORT, () => {
	console.log(`Puerto API ${process.env.API_PORT}`);
});

// Implementación del websocket
const socket = io.on('connection', (ioSocket) => {
	console.log(`Se estableció conexión con el websocket, puerto: ${process.env.WEBSOCKET_PORT}`);

	// Creación de un socket
	ioSocket.on('devices', async (data) => {
		console.log('Se recibe la key: ', data);

		// Se busca el registro del dispositivo en la base de datos mediante el campo key
		/**
		 * 1- Si encuentra el registro = objeto (contenido del registro)
		 * 2- Si no encuentra un registro = null
		 */
		const connectedDevice = await Device.findOne({
			where: {
				key: data
			}
		});

		if (connectedDevice) {
			// Se ejecuta cuando connectedDevice tiene datos de un dispositivo.
			console.log(`Conectado al dispositivo: ${connectedDevice.key}.`);
		} else {
			// Se ejecuta cuando connectedDevice es igual a null.
			console.log('No se encontró el dispositivo.');
		}

	});
});

// Expone el websocket por el puerto indicado
serverHttp.listen(process.env.WEBSOCKET_PORT);
