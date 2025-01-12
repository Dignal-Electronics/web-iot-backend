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
		origin: process.env.URL_ORIGIN
	}
});
const db = require('./models');
const mqtt = require('mqtt');

const Device = db.Device;
const DeviceData = db.DeviceData;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(routes);

app.listen(process.env.API_PORT, () => {
	console.log(`Puerto API ${process.env.API_PORT}`);
});

/**
 * Implementación del websocket
 */
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

			// El nombre de la "room" para poder enviar los "mensajes" o datos
			//  hacia un dispositivo especifico
			ioSocket.join(`dispositivo-${connectedDevice.id}`);
		} else {
			// Se ejecuta cuando connectedDevice es igual a null.
			console.log('No se encontró el dispositivo.');
		}
	});

	ioSocket.on('disconnect', () => {
		console.log('Se ha desconectado del socket.');
	});
});

// Expone el websocket por el puerto indicado
serverHttp.listen(process.env.WEBSOCKET_PORT);


/**
 * Implementación del broker
 */
const mqttClient = mqtt.connect(process.env.URL_HOST_EQMX, {
	username: ' ',
	password: process.env.EMQX_JWT_TOKEN
});

mqttClient.on('connect', () => {
	console.log('Se conecto a mqtt.');
});

// topic: /dispositivos/abcdfe
// El signo + es un comodín
mqttClient.subscribe('/dispositivos/+');

// topic = /dispositivos/w21qCFJujv
// message = "{"temperatura": 35}"
mqttClient.on('message', async (topic, message) => {
	// Obtenemos la key de la variable topic
	const deviceKey = topic.split('/')[2];

	console.log(`Dispositivo ${deviceKey} publicando.`);
	
	// Se verifica que el dispositivo exista en base de datos
	const connectedDevice = await Device.findOne({
		where: {
			key: deviceKey
		}
	});

	if (connectedDevice) {
		// Se transforman los datos a un objeto JSON valido.
		const data = JSON.parse(message.toString());

		// "Query" para guardar los datos recibidos en nuestra tabla devices_data.
		await DeviceData.create({
			device_id: connectedDevice.id,
			topic: topic,
			data: message.toString()
		});

		// Emite el dato en los canales correspondientes bajo la room identificada
		socket.in(`dispositivo-${connectedDevice.id}`).emit('temperatura', { date: Date(), value: data.temperatura });
		socket.in(`dispositivo-${connectedDevice.id}`).emit('luminosidad', { value: data.luminosidad });
	} else {
		// Se ejecuta cuando connectedDevice es igual a null.
		console.log('No se encontró el dispositivo.');
	}
});