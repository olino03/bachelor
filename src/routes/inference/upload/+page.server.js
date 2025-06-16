import * as auth from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index';
import { fail, redirect } from '@sveltejs/kit';
import { customLocalModel, customCloudModel, user } from '$lib/server/db/schema';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { GoogleAuth } from 'google-auth-library';
import { blob } from 'stream/consumers';

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
                currentBlockLines.push(line);
            }
            continue;
        }

        if (inMessagesBlock) {
            if (upperTrimmedLine.startsWith('PARAMETER ') ||
                upperTrimmedLine.startsWith('TEMPLATE """') ||
                upperTrimmedLine.startsWith('SYSTEM """') ||
                upperTrimmedLine.startsWith('LICENSE ') ||
                upperTrimmedLine.startsWith('FROM ') ||
                upperTrimmedLine.startsWith('ADAPTER ')) {

                if (messagesList.length > 0) {
                    directives.messages = messagesList;
                }
                inMessagesBlock = false;
                messagesList = [];
            } else {
                const firstWord = originalTrimmedLine.split(/\s+/)[0];
                if (firstWord && validMessageRoles.includes(firstWord.toUpperCase())) {
                    const role = firstWord.toLowerCase();
                    const content = originalTrimmedLine.substring(firstWord.length).trim();
                    messagesList.push({ role, content });
                } else if (originalTrimmedLine !== '' && !originalTrimmedLine.startsWith('#')) {
                    console.warn(`Modelfile parsing: Ignoring line in MESSAGES block (expected ROLE Content): "${originalTrimmedLine}"`);
                }
                continue;
            }
        }

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
        } else if (upperTrimmedLine.startsWith('SYSTEM """')) {
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
        } else if (upperTrimmedLine === 'MESSAGES') {
            inMessagesBlock = true;
            if (messagesList.length > 0 && !directives.messages) {
                 console.warn("Modelfile parsing: New MESSAGES block started before previous one was assigned. Assigning previous messages.");
                 directives.messages = messagesList;
            }
            messagesList = [];
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
    upload: async ({ request, locals: loc }) => {
        let ggufHash;
        let modelNameForOllama;
        let inputModelName;
        let inputGgufFileName;
        let parsedModelfileDirectives = {};
        let headers = {};
        let cloudUrl;

        try {
            const authUser = loc.user;
            if (!authUser || !authUser.id) {
                return fail(401, { message: 'User not authenticated.' });
            }
            
            const formData = await request.formData();
            
            inputModelName = formData.get('name');
            const ggufFile = formData.get('gguf');
            const modelfileFile = formData.get('modelfile');

            if (formData.has('useCloud')) {
                const useCloud = formData.get('useCloud') === 'true';
                if (useCloud) {
                    const [userData] = await db.select().from(user).where(eq(user.id, authUser.id));
                    if (!userData || !userData.cloudKey || !userData.cloudUrl) {
                        return fail(400, { message: 'Cloud configuration incomplete for this user.' });
                    }
                    try {
                        const credentials = JSON.parse(userData.cloudKey);
                        cloudUrl = userData.cloudUrl;
                        const googleAuth = new GoogleAuth({
                            credentials,
                        });
                        const client = await googleAuth.getIdTokenClient(cloudUrl);
                        headers = await client.getRequestHeaders();
                    } catch (e) {
                        return fail(500, { message: 'Failed to prepare cloud authentication.' });
                    }
                }
            }


            if (ggufFile instanceof File) {
                inputGgufFileName = ggufFile.name;
            }

            if (!inputModelName || typeof inputModelName !== 'string' || inputModelName.trim() === '') {
                return fail(400, { message: 'Model name is required.' });
            }
            if (!(ggufFile instanceof File) || ggufFile.size === 0) {
                return fail(400, { message: 'GGUF file is required and cannot be empty.' });
            }

            const ggufBuffer = await ggufFile.arrayBuffer();
            ggufHash = crypto.createHash('sha256').update(Buffer.from(ggufBuffer)).digest('hex');

            const sanitizedGgufName = inputGgufFileName.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\.[^/.]+$/, '');

            let blobCheckUrl = `${env.OLLAMA_URL}/api/blobs/sha256:${ggufHash}`;
            if (cloudUrl) {
                blobCheckUrl = `${cloudUrl}/api/blobs/sha256:${ggufHash}`;
            }


            let blobExists = false;
            try {
                let headResponse;
                if (!cloudUrl) {
                    headResponse = await fetch(blobCheckUrl, { method: 'HEAD' });
                } else {
                    headResponse = await fetch(blobCheckUrl, { method: 'HEAD', headers: { ...headers } });
                }
                if (headResponse.ok) {
                    blobExists = true;
                } else if (headResponse.status === 404) {
                    blobExists = false;
                } else {
                    const errorText = await headResponse.text().catch(() => "Could not read error response body for blob check");
                    console.error(`[upload] Unexpected HTTP status ${headResponse.status} from Ollama when checking blob existence. Response: ${errorText}`); 
                    throw new Error(`Unexpected HTTP status ${headResponse.status} from Ollama when checking blob existence.`);
                }
            } catch (e) {
                console.error(`[upload] Failed to verify GGUF blob existence on Ollama server: ${e.message}`, e); 
                throw new Error(`Failed to verify GGUF blob existence on Ollama server: ${e.message}`);
            }

            if (!blobExists) {
                let blobUploadUrl = `${env.OLLAMA_URL}/api/blobs/sha256:${ggufHash}`;
                if(cloudUrl) blobUploadUrl = `${cloudUrl}/api/blobs/sha256:${ggufHash}`;

                let uploadResponse;

                if(!cloudUrl) {
                    uploadResponse = await fetch(blobUploadUrl, {
                        method: 'POST',
                        body: Buffer.from(ggufBuffer),
                    });
                } else {
                    uploadResponse = await fetch(blobUploadUrl, {
                        method: 'POST',
                        body: Buffer.from(ggufBuffer),
                        headers: { ...headers }
                    });
                }
                const uploadResponseText = await uploadResponse.text().catch(() => "Could not read upload response body");
                console.log(`[upload] Blob upload response status: ${uploadResponse.status}, Text: ${uploadResponseText.substring(0, 200)}...`); 

                if (!uploadResponse.ok) {
                    console.error(`[upload] GGUF Blob upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. Server response: ${uploadResponseText}`);
                    throw new Error(`GGUF Blob upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. Server response: ${uploadResponseText}`);
                }
                console.log('[upload] GGUF Blob uploaded successfully.'); 
            }

            let userModelfileContent = ''; 
            if (modelfileFile instanceof File && modelfileFile.size > 0) {
                userModelfileContent = await modelfileFile.text(); 
                parsedModelfileDirectives = parseModelfileContent(userModelfileContent);
           }

            modelNameForOllama = inputModelName.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/--+/g, '-')
                .slice(0, 64);
            if (!modelNameForOllama) {
                modelNameForOllama = `model-${crypto.randomBytes(4).toString('hex')}`;
            }
          const ollamaPayload = {
                name: modelNameForOllama,
                files: {
                    [sanitizedGgufName]: `sha256:${ggufHash}`
                },
                stream: false,
                ...parsedModelfileDirectives
            };
            let createResponse;
            const createUrl = cloudUrl ? `${cloudUrl}/api/create` : `${env.OLLAMA_URL}/api/create`;
           
            if (!cloudUrl) {
                createResponse = await fetch(createUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ollamaPayload)
                });
            } else {
                createResponse = await fetch(createUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    body: JSON.stringify(ollamaPayload)
                });
            }

            const createResponseTextForLog = await createResponse.text();
          
            let createResponseJson;
            try {
                createResponseJson = JSON.parse(createResponseTextForLog);
            } catch (e) {
                createResponseJson = { error: "Failed to parse JSON response from /api/create", details: createResponseTextForLog.substring(0, 500) };
            }

            if (!createResponse.ok) {
                const errorMessage = createResponseJson?.error || `Model creation failed with status ${createResponse.status}`;
                const errorDetails = createResponseJson?.details || (typeof createResponseJson === 'string' ? createResponseJson : createResponseTextForLog);
                 throw new Error(`Ollama model creation failed: ${errorMessage} ${errorDetails}`);
            }

            if (!cloudUrl) {
                await db.insert(customLocalModel).values({
                    userId: authUser.id,
                    modelName: modelNameForOllama
                });
            } else {
                await db.insert(customCloudModel).values({
                    userId: authUser.id,
                    modelName: modelNameForOllama
                });
            }
  return { success: true, message: 'Model successfully uploaded', modelName: modelNameForOllama, ggufHash: ggufHash };

        } catch (error) {
            const errorMessage = error.message || "An unknown error occurred during upload.";

            return fail(error.status || 500, {
                message: errorMessage,
                debugInfo: {
                    inputName: inputModelName,
                    ggufFileName: inputGgufFileName,
                    calculatedGgufHash: ggufHash,
                    ollamaModelName: modelNameForOllama,
                    parsedDirectivesBrief: Object.keys(parsedModelfileDirectives).join(', ') || "None",
                    cloudUploadAttempted: !!cloudUrl,
                    errorDetails: error.toString()
                }
            });
        }
    }
};