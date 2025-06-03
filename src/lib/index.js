import { GoogleAuth } from 'google-auth-library';

export async function callCloudRun({
    cloudUrl,
    cloudKeyJsonString,
    path,
    method,
    body = null
}) {
    try {
        const credentials = JSON.parse(cloudKeyJsonString);
        const auth = new GoogleAuth({
            credentials,
        });
        const client = await auth.getIdTokenClient(cloudUrl);
        const headers = await client.getRequestHeaders(); 

        const fullUrl = `${cloudUrl}${path}`;

        const response = await fetch(fullUrl, {
            method: method,
            headers: {
                ...headers, 
                'Content-Type': 'application/json', 
            },
            body: body ? JSON.stringify(body) : undefined, 
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Cloud Run request failed (non-OK status): ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Cloud Run request failed: ${response.status} ${response.statusText}`);
        }
        return response;

    } catch (error) {
        console.error('Error during callCloudRun execution:', error);
        throw error;
    }
}