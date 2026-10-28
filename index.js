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

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const { action, key } = body || {};

    try {
        if (action === 'verifyKey') {
            if (!key) {
                return res.status(400).json({ status: 'error', message: 'Please enter a key!' });
            }

            const firebaseBaseUrl = "https://dripwire-f541e-default-rtdb.asia-southeast1.firebasedatabase.app/random_keys.json";
            
            // ১. ডেটাবেস থেকে ডেটা আনা
            const firebaseData = await new Promise((resolve, reject) => {
                https.get(firebaseBaseUrl, (response) => {
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
            let matchedDbId = null; // ডেটাবেস আইডি সেভ করার জন্য

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

                // ২. যদি প্রথমবার লগইন হয়, তবে Firebase-এ firstLoginAt সেভ করা
                if (!matchedUser.firstLoginAt) {
                    const now = Date.now();
                    const updateUrl = `https://dripwire-f541e-default-rtdb.asia-southeast1.firebasedatabase.app/random_keys/${matchedDbId}.json`;
                    const patchData = JSON.stringify({ firstLoginAt: now });

                    await new Promise((resolve, reject) => {
                        const req = https.request(updateUrl, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': Buffer.byteLength(patchData)
                            }
                        }, (res) => {
                            res.on('data', () => {});
                            res.on('end', resolve);
                        });
                        req.on('error', reject);
                        req.write(patchData);
                        req.end();
                    });
                    
                    // আপডেট হওয়া টাইমারটি রেসপন্সে পাঠানো
                    matchedUser.firstLoginAt = now; 
                }

                // ৩. বাকি থাকা টাইম ক্যালকুলেট করা
                const expirationTime = matchedUser.firstLoginAt + (matchedUser.durationMs || 86400000);
                const remainingMs = expirationTime - Date.now();

                if (remainingMs <= 0) {
                    return res.status(200).json({ status: 'error', message: 'This key has expired!' });
                }

                return res.status(200).json({ 
                    status: 'success', 
                    durationMs: remainingMs, 
                    message: 'Login Successful' 
                });
            } else {
                return res.status(200).json({ status: 'error', message: 'Invalid or Expired Key!' });
            }
        } 
        
        else if (action === 'checkMaintenance') {
            // ... (আপনার আগের checkMaintenance কোডটি এখানে থাকবে, সেটি ঠিকই আছে)
        } 
        
        else {
            return res.status(400).json({ status: 'error', message: 'Invalid action: ' + (action || 'undefined') });
        }

    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
