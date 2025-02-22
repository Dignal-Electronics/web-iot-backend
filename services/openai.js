const openai = require('openai');
const fs = require('fs');
const path = require('path');

class OpenAiService {
    #openAI;
    #fileId;
    #vectorStoreId;
    #assistantId;
    #threadId;
    
    constructor(openai = new openai()) {
        this.#openAI = openai;
    }

    async uploadFile(fileId = null) {

        if (fileId !== null) {
            this.#fileId = fileId

            console.log(`---- He recibido el fileId: ${fileId}`);
            
            return;
        }

        const file = await this.#openAI.files.create({
            file: fs.createReadStream(
                path.join(__dirname, '../', 'assets', 'openai-documento.pdf')
            ),
            purpose: 'assistants',
        });

        console.log(`---- FileId: ${file.id}`);
        this.#fileId = file.id;
    }

    async createVectorStore(vectorName, vectorId = null) {
       if (vectorId !== null) {
            this.#vectorStoreId = vectorId;
            
            return;
       }

       const vectorStore = await this.#openAI.beta.vectorStores.create({
            name: vectorName,
       });

       console.log(`---- vectorStoreId: ${vectorStore.id}`);
       this.#vectorStoreId = vectorStore.id;
    }

    async addFileToVectorStore() {
        await this.#openAI.beta.vectorStores.files.create(
            this.#vectorStoreId,
            {
                file_id: this.#fileId,
            }
        );
    }

    async createAssitant(parameters, assistantId = null) {

        if (assistantId !== null) {
            this.#assistantId = assistantId

            return;
        }

        const assistant = await this.#openAI.beta.assistants.create({
            instructions: parameters.instructions,
            name: parameters.name,
            tools: [
                { type: 'file_search' }
            ],
            tool_resources: {
                file_search: {
                    vector_store_ids: [this.#vectorStoreId]
                }
            },
            model: 'gpt-4o-mini',
            /**
             * Este parametro le permite al modelo "ser más creativo" con
             * las respuestas proporcionadas.
             * Valores permitidos de: 0 a 2
             * Menores a 0.2: tendencia a respuestas "más concisas".
             * Entre 1 y 2: tendencia a "respuesta incoherentes".
             */
            temperature: 0.01
        });

       console.log(`---- assistantId: ${assistant.id}`);
       this.#assistantId = assistant.id;
    }

    async createThread(userRequest, threadId = null) {
        if (threadId !== null) {
            this.#threadId = threadId;

            return;
        }

        const thread = await this.#openAI.beta.threads.create({
            messages: [
                {
                    role: 'user',
                    content: userRequest,
                }
            ]
        });

        console.log(`---- threadId: ${thread.id}`);
        this.#threadId = thread.id;
    }
}

module.exports = OpenAiService;
