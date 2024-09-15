const openAi = require("openai");
const fs = require('fs');
const path = require('path');

class OpenAiService {
    #openAI;
    #fileId;
    #vectorStoreId;
    #assistantId;
    #threadId;
    #runId;
    #lastMessage;

    constructor(openAi = new openAi()) {
        this.#openAI = openAi;
    }

    async uploadFile() {
        const file = await this.#openAI.files.create({
            file: fs.createReadStream(path.join(__dirname, '../', 'assets', 'openai-documento.pdf')),
            purpose: "assistants",
        });

        console.log(`FileId: ${file.id}`);
        this.#fileId = file.id
    }

    async createVectorStore(vectorName){
        const vectorStore = await this.#openAI.beta.vectorStores.create({
            name: vectorName
        });

        console.log(`VectorStoreId: ${vectorStore.id}`);
        this.#vectorStoreId = vectorStore.id;
    }

    async addFileToVectorStore() {
        await this.#openAI.beta.vectorStores.files.create(this.#vectorStoreId, {
            file_id: this.#fileId,
        });
    }

    async createAssistant(parameters) {
        const assistant = await this.#openAI.beta.assistants.create({
            instructions: parameters.instructions,
            name: parameters.name,
            tools: [{ type: "file_search" }],
            tool_resources: {
                file_search: {
                    vector_store_ids: [this.#vectorStoreId]
                },
            },
            model: 'gpt-4o-mini',
            /**
             * Este parametro le permite al model "ser más creativo" con
             * las respuestas proporcionadas.
             * Valores permitidos de: 0 a 2
             * Menores a 0.2: tendencia a respuestas más concisas.
             * Entre 1 y 2: tendencia a respuesta incoherentes.
             */
            temperature: 0.01,
        });

        console.log(`AssistantId: ${assistant.id}`);
        this.#assistantId = assistant.id;
    }

    async createThread(userRequest) {
        const thread = await this.#openAI.beta.threads.create({
            messages: [
                {
                    role: 'user',
                    // userRequest: Será la pregunta del usuario
                    // ej.: Dime que día se registro la temperatura mas alta de la semana
                    content: userRequest
                },
            ]
        });

        console.log(`ThreadId: ${thread.id}`);
        this.#threadId = thread.id;
    }

    async createRun() {
        const run = await this.#openAI.beta.threads.runs.create(this.#threadId, {
            assistant_id: this.#assistantId,
        });

        console.log(`runId: ${run.id}`);
        this.#runId = run.id;
    }

    /**
     * status: queue
     * status: in_progress
     * status: in_progress
     * status: in_progress
     * status: in_progress
     * status: in_progress
     * status: in_progress
     * status: in_progress
     * status: completed
     */
    async retrieveRun() {
        return this.#openAI.beta.threads.runs.retrieve(this.#threadId, this.#runId);
    }

    async retrieveMessages() {
        const messages = await this.#openAI.beta.threads.messages.list(this.#threadId);

        this.#lastMessage = messages.last_id;
    }

    async retrieveMessage() {
        return this.#openAI.beta.threads.messages.retrieve(
            this.#threadId,
            this.#lastMessage
        );
    }
}

module.exports = OpenAiService;
