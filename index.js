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
const mqttClient = mqtt.connect(process.env.EMQX_HOST, {
	username: ' ',
	password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJpYXQiOjE3MjQyMTEzMDZ9.rQ2ISBLxzkfCAl0HibIo7s0S-Y_ZEmjMI7ROiYoxJlo'
});

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

		const humedad = datos.humedad;
		const presion = datos.presion;

		await dispositivoDato.create({
			device_id: dispositivoConectado.id,
			topic: topic,
			data: message.toString(),
		});

		socket.in(`dispositivo-${dispositivoConectado.id}`).emit('temperatura', {date: Date(), value: temperatura});
		socket.in(`dispositivo-${dispositivoConectado.id}`).emit('luminosidad', { data: luminosidad });

		socket.in(`dispositivo-${dispositivoConectado.id}`).emit('humedad', {date: Date(), value: humedad});
		socket.in(`dispositivo-${dispositivoConectado.id}`).emit('presion', {date: Date(), value: presion});
	}
});



/**
 * Implementación de la clase OpenAiService
 */
const openAiService = require('./services/openai.js');
const openAiLib = require('openai');

(async function () {
	const openAi = new openAiService(
		new openAiLib({
			organization: process.env.OPENAI_ORGANIZATION_ID,
			project: process.env.OPENAI_PROJECT_ID
		})
	);

	// Carga el archivo / Genera el fileId
	await openAi.uploadFile();
	// Crea el vector / Genera el vectorStoreId
	await openAi.createVectorStore('webIotVector');
	// Relaciona el archivo con el vector 
	await openAi.addFileToVectorStore();
	// Crea el asistente / Genera el assistantId
	await openAi.createAssistant({
		instructions: 'Analizarás la información con base en el archivo, devuelve el tiempo de vida util restante, la reducción de la vida util, la diferencia de elevación de temperatura, toma en cuenta la temperatura, asume que el parametro temperatura es el punto más caliente.',
		name: 'web-iot',
	});
	// Crea el hilo / Genera el threadId
	await openAi.createThread('temperatura: 50');
	// Crea la ejecución / Genera el runId
	await openAi.createRun();

	let isRunCompleted = false;
	while (!isRunCompleted) {
		const response = await openAi.retrieveRun();

		if (response.status === "completed" || response.status === "failed") {
			isRunCompleted = true;
		}

		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	// Obtiene el listado de mensajes / Genera el lastMessage
	await openAi.retrieveMessages();
	let openAiMessage = await openAi.retrieveMessage();
	console.log(`openAi: ${openAiMessage['content'][0]['text']['value']}`);
})()
