import * as auth from '$lib/server/auth'; 
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index'; 
import { fail, redirect } from '@sveltejs/kit';
import { customLocalModel, customCloudModel, user } from '$lib/server/db/schema'; 
import crypto from 'crypto';
import { eq } from 'drizzle-orm';

function parseModelfileContent(modelfileString) {
    const directives = {}; 
    const parameters = {}; 
    let messagesList = []; 

    let currentBlockType = null;
    let currentBlockLines = [];
    let inMessagesBlock = false;

    if (!modelfileString || typeof modelfileString !== 'string') {
        return {};
    }

    const lines = modelfileString.split('\n');
    const knownArrayParams = ['stop'];
    const validMessageRoles = ['SYSTEM', 'USER', 'ASSISTANT'];

    for (const line of lines) {
        const originalTrimmedLine = line.trim();
        const upperTrimmedLine = originalTrimmedLine.toUpperCase();

        if (currentBlockType) {
            if (originalTrimmedLine === '"""') {
                directives[currentBlockType.toLowerCase()] = currentBlockLines.join('\n');
                currentBlockType = null;
                currentBlockLines = [];
            } else {
                currentBlockLines.push(line); // Add the raw line
            }
            continue; // Line processed as part of a """ block
        }

        // 2. Handle MESSAGES block content or termination
        if (inMessagesBlock) {
            // Check if the current line terminates the MESSAGES block by being a new top-level directive
            if (upperTrimmedLine.startsWith('PARAMETER ') ||
                upperTrimmedLine.startsWith('TEMPLATE """') ||
                upperTrimmedLine.startsWith('SYSTEM """') || // This is the SYSTEM """ directive, not a message role
                upperTrimmedLine.startsWith('LICENSE ') ||
                upperTrimmedLine.startsWith('FROM ') ||
                upperTrimmedLine.startsWith('ADAPTER ')) { // ADAPTER also terminates MESSAGES
                
                if (messagesList.length > 0) {
                    directives.messages = messagesList;
                }
                inMessagesBlock = false;
                messagesList = []; // Reset for safety, though a new MESSAGES block would also reset
                // Fall through to process this line as a new directive
            } else {
                // Try to parse as a "ROLE content" line
                const firstWord = originalTrimmedLine.split(/\s+/)[0];
                if (firstWord && validMessageRoles.includes(firstWord.toUpperCase())) {
                    const role = firstWord.toLowerCase();
                    const content = originalTrimmedLine.substring(firstWord.length).trim();
                    messagesList.push({ role, content });
                } else if (originalTrimmedLine !== '' && !originalTrimmedLine.startsWith('#')) {
                    // Non-empty, not a comment, and not a valid role line within MESSAGES block
                    console.warn(`Modelfile parsing: Ignoring line in MESSAGES block (expected ROLE Content): "${originalTrimmedLine}"`);
                }
                continue; // Line processed (or ignored) within MESSAGES block
            }
        }

        // 3. Handle start of new directives (if not in """ block and not in MESSAGES content)
        if (upperTrimmedLine.startsWith('TEMPLATE """')) {
            currentBlockType = 'TEMPLATE';
            const contentAfterDirective = line.substring(upperTrimmedLine.indexOf('TEMPLATE """') + 'TEMPLATE """'.length);
            if (contentAfterDirective.trim().endsWith('"""') && contentAfterDirective.trim() !== '"""') {
                directives.template = contentAfterDirective.substring(0, contentAfterDirective.lastIndexOf('"""')).trim();
                currentBlockType = null;
            } else if (contentAfterDirective.trim() === '"""') {
                directives.template = "";
                currentBlockType = null;
            } else if (contentAfterDirective.trim() !== '') {
                currentBlockLines.push(contentAfterDirective);
            }
        } else if (upperTrimmedLine.startsWith('SYSTEM """')) { // SYSTEM directive with """
            currentBlockType = 'SYSTEM';
            const contentAfterDirective = line.substring(upperTrimmedLine.indexOf('SYSTEM """') + 'SYSTEM """'.length);
            if (contentAfterDirective.trim().endsWith('"""') && contentAfterDirective.trim() !== '"""') {
                directives.system = contentAfterDirective.substring(0, contentAfterDirective.lastIndexOf('"""')).trim();
                currentBlockType = null;
            } else if (contentAfterDirective.trim() === '"""') {
                directives.system = "";
                currentBlockType = null;
            } else if (contentAfterDirective.trim() !== '') {
                currentBlockLines.push(contentAfterDirective);
            }
        } else if (upperTrimmedLine === 'MESSAGES') { // Exactly "MESSAGES"
            inMessagesBlock = true;
            // If there was a previous unterminated messages block, finalize it (though not standard)
            if (messagesList.length > 0 && !directives.messages) {
                 console.warn("Modelfile parsing: New MESSAGES block started before previous one was assigned. Assigning previous messages.");
                 directives.messages = messagesList;
            }
            messagesList = []; // Reset for the new block
        } else if (upperTrimmedLine.startsWith('PARAMETER ')) {
            const paramString = originalTrimmedLine.substring('PARAMETER '.length).trim();
            const firstSpaceIndex = paramString.indexOf(' ');
            if (firstSpaceIndex > 0) {
                const key = paramString.substring(0, firstSpaceIndex);
                const valueStr = paramString.substring(firstSpaceIndex + 1).trim();
                let parsedValue;
                const paramKeyNormalized = key.toLowerCase();

                if (paramKeyNormalized === 'logit_bias' && valueStr.startsWith('{') && valueStr.endsWith('}')) {
                    try { parsedValue = JSON.parse(valueStr); } catch (e) {
                        console.warn(`Modelfile parsing: Failed to parse logit_bias JSON: ${valueStr}`, e);
                        parsedValue = valueStr;
                    }
                } else if (valueStr.toLowerCase() === 'true' || valueStr.toLowerCase() === 'false') {
                     parsedValue = valueStr.toLowerCase() === 'true';
                } else if (!isNaN(parseFloat(valueStr)) && isFinite(valueStr) && valueStr.trim().match(/^-?\d+(\.\d+)?$/) && !valueStr.toLowerCase().includes('e')) {
                     parsedValue = parseFloat(valueStr);
                } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
                    try { parsedValue = JSON.parse(valueStr); } catch (e) { parsedValue = valueStr; }
                } else {
                    parsedValue = valueStr;
                }

                const effectiveKey = paramKeyNormalized;
                if (knownArrayParams.includes(effectiveKey)) {
                    if (!parameters[effectiveKey]) parameters[effectiveKey] = [];
                    if (!Array.isArray(parameters[effectiveKey])) parameters[effectiveKey] = [parameters[effectiveKey]];
                    parameters[effectiveKey].push(parsedValue);
                } else {
                    parameters[effectiveKey] = parsedValue;
                }
            }
        } else if (upperTrimmedLine.startsWith('LICENSE ')) {
            directives.license = originalTrimmedLine.substring('LICENSE '.length).trim();
        } else if (upperTrimmedLine.startsWith('FROM ')) {
        } else if (upperTrimmedLine.startsWith('ADAPTER ')) {
        } else if (originalTrimmedLine !== '' && !originalTrimmedLine.startsWith('#')) {
            console.warn(`Modelfile parsing: Unknown or malformed directive: "${originalTrimmedLine}"`);
        }
    } 

    if (currentBlockType) {
        console.warn(`Modelfile parsing: Unterminated ${currentBlockType} block at EOF.`);
        directives[currentBlockType.toLowerCase()] = currentBlockLines.join('\n');
    }
    if (inMessagesBlock && messagesList.length > 0) {
        directives.messages = messagesList;
    }

    if (Object.keys(parameters).length > 0) {
        directives.parameters = parameters;
    }

    Object.keys(directives).forEach(key => {
        if (directives[key] == null) {
            delete directives[key];
        }
    });
    return directives;
}

export const load = async ({ locals }) => {
    if (!locals?.user?.id) throw redirect(302, '/login');

    const userId = locals.session.userId;
    const [userData] = await db.select().from(user).where(eq(user.id, userId));

    return {
        canUploadToCloud: userData?.cloudKey ? true : false
    }
}

export const actions = {
    logout: async (event) => {
        if (!event.locals.session) {
            return fail(401);
        }
        await auth.invalidateSession(event.locals.session.id);
        auth.deleteSessionTokenCookie(event);

        throw redirect(302, '/');
    },
    upload: async ({ request }) => {
        console.log('=== STARTING OLLAMA UPLOAD PROCESS ===');
        let ggufHash;
        let modelNameForOllama;
        let inputModelName;
        let inputGgufFileName;
        let parsedModelfileDirectives = {}; 

        try {
            const formData = await request.formData();
            const username = formData.get('username');
            inputModelName = formData.get('name');
            const ggufFile = formData.get('gguf');
            const modelfileFile = formData.get('modelfile');

            if (ggufFile instanceof File) {
                inputGgufFileName = ggufFile.name;
            }

            console.log(`Received upload request. Username: ${username}, Input Model Name: ${inputModelName}, GGUF: ${inputGgufFileName}, Modelfile: ${modelfileFile instanceof File ? modelfileFile.name : 'N/A'}`);

            if (!inputModelName || typeof inputModelName !== 'string' || inputModelName.trim() === '') {
                console.error('Validation Error: Model name is missing or empty.');
                return fail(400, { message: 'Model name is required.' });
            }
            if (!(ggufFile instanceof File) || ggufFile.size === 0) {
                console.error('Validation Error: GGUF file is missing or empty.');
                return fail(400, { message: 'GGUF file is required and cannot be empty.' });
            }

            console.log(`Processing GGUF file: ${inputGgufFileName}...`);
            const ggufBuffer = await ggufFile.arrayBuffer();
            ggufHash = crypto.createHash('sha256').update(Buffer.from(ggufBuffer)).digest('hex');
            console.log(`Calculated GGUF SHA256 Digest: ${ggufHash}`);

            const sanitizedGgufName = inputGgufFileName.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\.[^/.]+$/, '');
            console.log(`Sanitized GGUF name (for files mapping): ${sanitizedGgufName}`);

            const blobCheckUrl = `${env.OLLAMA_URL}/api/blobs/sha256:${ggufHash}`;
            console.log(`Checking if GGUF blob exists (HEAD request): ${blobCheckUrl}`);
            let blobExists = false;
            try {
                const headResponse = await fetch(blobCheckUrl, { method: 'HEAD' });
                console.log(`Blob existence check response status: ${headResponse.status}`);
                if (headResponse.ok) {
                    blobExists = true;
                    console.log(`GGUF Blob sha256:${ggufHash} already exists on the server. Skipping upload.`);
                } else if (headResponse.status === 404) {
                    console.log(`GGUF Blob sha256:${ggufHash} does not exist on the server.`);
                } else {
                    const errorText = await headResponse.text().catch(() => "Could not read error response body");
                    console.error(`Unexpected HTTP status ${headResponse.status} when checking for GGUF blob. Response: ${errorText}`);
                    throw new Error(`Unexpected HTTP status ${headResponse.status} from Ollama when checking blob existence.`);
                }
            } catch (e) {
                console.error(`Error during GGUF blob existence check: ${e.message}`);
                throw new Error(`Failed to verify GGUF blob existence on Ollama server: ${e.message}`);
            }

            if (!blobExists) {
                const blobUploadUrl = `${env.OLLAMA_URL}/api/blobs/sha256:${ggufHash}`;
                console.log(`Uploading GGUF blob to ${blobUploadUrl} (POST request)`);
                const uploadResponse = await fetch(blobUploadUrl, {
                    method: 'POST',
                    body: Buffer.from(ggufBuffer),
                });
                const uploadResponseText = await uploadResponse.text().catch(() => "Could not read upload response body");
                console.log(`GGUF Blob upload response status: ${uploadResponse.status}, Body: ${uploadResponseText}`);
                if (!uploadResponse.ok) {
                    throw new Error(`GGUF Blob upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. Server response: ${uploadResponseText}`);
                }
                console.log('GGUF Blob uploaded successfully to Ollama.');
            }

            // --- Parse Modelfile Directives ---
            let userModelfileContent = '';
            if (modelfileFile instanceof File && modelfileFile.size > 0) {
                console.log(`Processing user-provided Modelfile: ${modelfileFile.name}`);
                userModelfileContent = await modelfileFile.text();
                parsedModelfileDirectives = parseModelfileContent(userModelfileContent);
                console.log('Parsed Modelfile directives:', JSON.stringify(parsedModelfileDirectives, null, 2));
            } else {
                console.log('No user-provided Modelfile or it is empty. No additional directives will be parsed.');
            }

            modelNameForOllama = inputModelName.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/--+/g, '-')
                .slice(0, 64);
            if (!modelNameForOllama) {
                console.error("Error: Sanitized model name is empty.");
                throw new Error("Invalid model name: after sanitization, the name became empty.");
            }
            console.log(`Sanitized model name for Ollama API: ${modelNameForOllama}`);

            const ollamaPayload = {
                name: modelNameForOllama,
                files: { 
                    [sanitizedGgufName]: `sha256:${ggufHash}`
                },
                stream: false,
                ...parsedModelfileDirectives 
            };
            
            console.log(`Sending request to create model in Ollama (POST): ${env.OLLAMA_URL}/api/create`);
            console.log('Ollama /api/create payload:', JSON.stringify(ollamaPayload, null, 2));

            const createResponse = await fetch(`${env.OLLAMA_URL}/api/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ollamaPayload)
            });

            let createResponseJson;
            const createResponseTextForLog = await createResponse.text();
            try {
                createResponseJson = JSON.parse(createResponseTextForLog);
            } catch (e) {
                createResponseJson = { error: "Failed to parse JSON response from /api/create", details: createResponseTextForLog };
            }
            console.log(`Ollama /api/create response status: ${createResponse.status}`);
            console.log('Ollama /api/create response body:', JSON.stringify(createResponseJson, null, 2));

            if (!createResponse.ok) {
                const errorMessage = createResponseJson.error || `Model creation failed with status ${createResponse.status}`;
                const errorDetails = createResponseJson.details || (typeof createResponseJson === 'string' ? createResponseJson : '');
                throw new Error(`Ollama model creation failed: ${errorMessage} ${errorDetails}`);
            }

            console.log(`Model '${modelNameForOllama}' creation process in Ollama initiated successfully.`);

            await db.insert(customLocalModel).values({
                userId: username,
                modelName: modelNameForOllama
            });

            console.log('=== OLLAMA UPLOAD PROCESS COMPLETED SUCCESSFULLY ===');

            return { success: 'Model succesfully uploaded', modelName: modelNameForOllama, ggufHash: ggufHash };

        } catch (error) {
            console.error('=== OLLAMA UPLOAD PROCESS FAILED ===');
            console.error('Full Error Object:', error);
            const errorMessage = error.message || "An unknown error occurred.";
            const errorStack = error.stack || "No stack trace available.";
            console.error('Error Message:', errorMessage);
            console.error('Error Stack:', errorStack);
            
            return fail(error.status || 500, {
                message: errorMessage,
                debugInfo: {
                    inputName: inputModelName,
                    ggufFileName: inputGgufFileName,
                    calculatedGgufHash: ggufHash,
                    ollamaModelName: modelNameForOllama,
                    parsedDirectives: parsedModelfileDirectives
                }
            });
        }
    }
};
