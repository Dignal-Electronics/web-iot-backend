require('dotenv').config();
global.functions = require('./functions');
const express = require("express");
const app = express();
const routes = require("./routes");
const cors = require('cors');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(routes);

app.listen(process.env.API_PORT, () => {
	console.log(`Puerto API ${process.env.API_PORT}`);
});

const httpServer = require('http').createServer();
const io = require('socket.io')(httpServer, {
	cors: {
		origin: process.env.URL_ORIGIN
	}
});

httpServer.listen(process.env.WEBSOCKET_PORT);

const mqtt = require('mqtt');
const mqttClient = mqtt.connect('http://emqx');
mqttClient.on('connect', () => {
	console.log('Conectado a mqtt');
});
mqttClient.subscribe('/dispositivos/+');

const db = require('./models');
const dispositivo = db.Device;
const dispositivoDato = db.devices_data;

const socket = io.on('connection', (socket) => {
	socket.on('inicio', async (data) => {
		console.log(`Dispositivo ${data} conectado`);

		const key = data;
		// Guardo en la constatnte "dispositivoConectado", lo que encuentra en mi base de datos
		// en la tabla dispositivos.
		const dispositivoConectado = await dispositivo.findOne({ where: { key: data } });

		if (dispositivoConectado) {
			console.log('Dispositivo encontrado');
			//socket.join('dispositivo-1'); -> este dato debe de ser único para la creación del "room".
			socket.join(`dispositivo-${dispositivoConectado.id}`);

			socket.on('led', async (led) => {
				mqttClient.publish(`/dispositivos/${key}/led`, `{"led": ${led}}`);
			});
		} else {
			socket.emit('dispositivo', false);
		}
	});
});

// topic = /dispositivos/boxLBpyzd3
mqttClient.on('message', async (topic, message) => {
	// Obteniendo la clave del dispositivo
	const claveDispositivo = topic.split('/')[2];
	console.log(`message: ${claveDispositivo}`);

	const dispositivoConectado = await dispositivo.findOne({ where: { key: claveDispositivo} });
	if (dispositivoConectado) {
		/** 
		 * El contenido de message
		 * {
		 * 	   "temperatura": 35
		 * }
		 **/

		const datos = JSON.parse(message.toString());

		const temperatura = datos.temperatura;
		const luminosidad = datos.luminosidad;

		await dispositivoDato.create({
			device_id: dispositivoConectado.id,
			topic: topic,
			data: message.toString(),
		});
		
		socket.in(`dispositivo-${dispositivoConectado.id}`).emit('temperatura', {date: Date(), value: temperatura});
		socket.in(`dispositivo-${dispositivoConectado.id}`).emit('luminosidad', { data: luminosidad });
	}
});
