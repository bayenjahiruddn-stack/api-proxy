import https from 'https';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 🚨 UptimeRobot-এর জন্য GET রিকোয়েস্ট
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', message: 'Server is running perfectly' });
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    // ডেটা রিসিভ করা
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            const params = new URLSearchParams(body);
            body = Object.fromEntries(params);
        }
    }

    const { action, key } = body || {};

    try {
        // ১. মেইনটেন্যান্স চেক
        if (action === 'checkMaintenance') {
            const maintURL = "https://dripwire-f541e-default-rtdb.asia-southeast1.firebasedatabase.app/maintenance_settings.json";
            const maintData = await new Promise((resolve, reject) => {
                https.get(maintURL, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                    });
                }).on('error', err => reject(err));
            });

            return res.status(200).json({ 
                isMaintenance: maintData ? !!maintData.isMaintenance : false, 
                message: maintData ? (maintData.message || "System is under maintenance.") : "", 
                link: maintData ? (maintData.link || "") : "" 
            });
        } 
        
        // ২. লাইসেন্স কি ভেরিফাই
        else if (action === 'verifyKey') {
            if (!key) {
                return res.status(400).json({ status: 'error', message: 'Please enter a key!' });
            }

            const firebaseURL = "https://dripwire-f541e-default-rtdb.asia-southeast1.firebasedatabase.app/random_keys.json";
            const firebaseData = await new Promise((resolve, reject) => {
                https.get(firebaseURL, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                    });
                }).on('error', err => reject(err));
            });

            if (!firebaseData) {
                return res.status(200).json({ status: 'error', message: 'Invalid or Expired Key!' });
            }

            let keyFound = false;
            let matchedUser = null;
            let matchedDbId = null;

            for (const [dbId, userObj] of Object.entries(firebaseData)) {
                if (userObj.accessKey === key || userObj.username === key) {
                    keyFound = true;
                    matchedUser = userObj;
                    matchedDbId = dbId;
                    break;
                }
            }

            if (keyFound) {
                if (matchedUser.active === false) {
                    return res.status(200).json({ status: 'error', message: 'This key has been disabled!' });
                }

                if (!matchedUser.firstLoginAt) {
                    const now = Date.now();
                    const updateUrl = `https://dripwire-f541e-default-rtdb.asia-southeast1.firebasedatabase.app/random_keys/${matchedDbId}.json`;
                    const patchData = JSON.stringify({ firstLoginAt: now });

                    await new Promise((resolve, reject) => {
                        const req = https.request(updateUrl, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(patchData) }
                        }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
                        req.on('error', reject);
                        req.write(patchData);
                        req.end();
                    });
                    matchedUser.firstLoginAt = now; 
                }

                const expirationTime = matchedUser.firstLoginAt + (matchedUser.durationMs || 86400000);
                const remainingMs = expirationTime - Date.now();

                if (remainingMs <= 0) {
                    return res.status(200).json({ status: 'error', message: 'This key has expired!' });
                }

                return res.status(200).json({ status: 'success', durationMs: remainingMs, message: 'Login Successful' });
            } else {
                return res.status(200).json({ status: 'error', message: 'Invalid or Expired Key!' });
            }
        } 
        else {
            return res.status(400).json({ status: 'error', message: 'Invalid action: ' + (action || 'undefined') });
        }
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
