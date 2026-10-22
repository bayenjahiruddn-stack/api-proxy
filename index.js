import https from 'https';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    // Body parse nischit korar jonno
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            body = {};
        }
    }

    const { action, key } = body || {};

    try {
        if (action === 'verifyKey') {
            if (!key) {
                return res.status(400).json({ status: 'error', message: 'Please enter a key!' });
            }

            const firebaseURL = "https://dripwire-f541e-default-rtdb.asia-southeast1.firebasedatabase.app/random_keys.json";

            const firebaseData = await new Promise((resolve, reject) => {
                https.get(firebaseURL, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(e);
                        }
                    });
                }).on('error', err => reject(err));
            });

            if (!firebaseData) {
                return res.status(200).json({ status: 'error', message: 'Invalid or Expired Key!' });
            }

            let keyFound = false;
            let matchedUser = null;

            for (const [dbId, userObj] of Object.entries(firebaseData)) {
                if (userObj.accessKey === key || userObj.username === key) {
                    keyFound = true;
                    matchedUser = userObj;
                    break;
                }
            }

            if (keyFound) {
                if (matchedUser.active === false) {
                    return res.status(200).json({ status: 'error', message: 'This key has been disabled!' });
                }

                return res.status(200).json({ 
                    status: 'success', 
                    durationMs: matchedUser.durationMs || (24 * 60 * 60 * 1000), 
                    message: 'Login Successful' 
                });
            } else {
                return res.status(200).json({ status: 'error', message: 'Invalid or Expired Key!' });
            }
        } 
        
        else if (action === 'checkMaintenance') {
            const maintURL = "https://dripwire-f541e-default-rtdb.asia-southeast1.firebasedatabase.app/maintenance_settings.json";

            const maintData = await new Promise((resolve, reject) => {
                https.get(maintURL, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(e);
                        }
                    });
                }).on('error', err => reject(err));
            });

            return res.status(200).json({ 
                isMaintenance: maintData ? !!maintData.isMaintenance : false, 
                message: maintData ? (maintData.message || "System is currently under maintenance.") : "", 
                link: maintData ? (maintData.link || "") : "" 
            });
        } 
        
        else {
            return res.status(400).json({ status: 'error', message: 'Invalid action: ' + (action || 'undefined') });
        }

    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
