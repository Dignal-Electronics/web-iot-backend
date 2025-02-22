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
let deviceConnectedKey = null;
const socket = io.on('connection', (ioSocket) => {
	console.log(`Se estableció conexión con el websocket, puerto: ${process.env.WEBSOCKET_PORT}`);

	// Creación de un socket
	ioSocket.on('devices', async (data) => {
		console.log('Se recibe la key: ', data);
		deviceConnectedKey = data;
		// mqttClient.publish(`/dispositivos/${deviceConnectedKey}/led`, `{"led": false}`);

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

	ioSocket.on('led', async (data) => {
		mqttClient.publish(`/dispositivos/${deviceConnectedKey}/led`, `{"led": ${data}}`);
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
		socket.in(`dispositivo-${connectedDevice.id}`).emit('led', { value: data.led });
	} else {
		// Se ejecuta cuando connectedDevice es igual a null.
		console.log('No se encontró el dispositivo.');
	}
});


// Implementación OpenAi
const openAiService = require('./services/openai.js');
const openAiLib = require('openai');

async function generateText() {
	// Inicializamos nuestra clase con una instancia de openai a la cual
	// le pasamos nuestras credenciales como parametros
	const openAi = new openAiService(
		new openAiLib({
			organization: process.env.OPENAI_ORGANIZATION_ID,
			project: process.env.OPENAI_PROJECT_ID,
			apiKey: process.env.OPENAR_API_KEY
		})
	);

	// Cargar el archivo -> FileId: file-1H9MMSXw4aoK8FrkEm9SNN
	await openAi.uploadFile('file-1H9MMSXw4aoK8FrkEm9SNN');

	// Crear el vector store -> VectorStoreId: 
	await openAi.createVectorStore('flutterIotVS', 'vs_67ba03b06ec481919f22643fdd85dc53');

	// Adjuntar el archivo al vector store
	await openAi.addFileToVectorStore();

	// Crear el asistente -> AssistantId
	await openAi.createAssitant({
		instructions: 'Analizarás la información con base en el archivo pdf, devuelve el tiempo de vida util restante, la reducción de la vida util, la diferencia de elevación de temperatura, toma en cuenta la temperatura más alta proporcionada como el punto más caliente, asume que el aislamiento es de tipo A',
		name: 'flutterIotAssistant'
	}, 'asst_1hFrAOQb6MJGPDlw6k1lbtmu');

	// Crear el hilo y a pasar los datos obtenidos mediante una consulta a la BD
	await openAi.createThread('set de datos (temperaturas)');
}

generateText();