const http = require('http');
const https = require('https');
const url = require('url');

const firebaseURL = "https://dripwire-f541e-default-rtdb.asia-southeast1.firebasedatabase.app/random_keys";

const server = http.createServer((req, res) => {
    const queryObject = url.parse(req.url, true).query;
    res.setHeader('Content-Type', 'application/json');

    if (queryObject.action === 'verify') {
        const userKey = queryObject.key;

        if (!userKey) {
            res.end(JSON.stringify({ status: "error", message: "Key is missing" }));
            return;
        }

        https.get(`${firebaseURL}/${userKey}.json`, (firebaseRes) => {
            let data = '';
            firebaseRes.on('data', (chunk) => { data += chunk; });
            firebaseRes.on('end', () => {
                const parsedData = JSON.parse(data);
                if (parsedData) {
                    res.end(JSON.stringify({ status: "success", data: parsedData }));
                } else {
                    res.end(JSON.stringify({ status: "error", message: "Invalid Key" }));
                }
            });
        }).on('error', () => {
            res.end(JSON.stringify({ status: "error", message: "Server Error" }));
        });

    } else {
        res.end(JSON.stringify({ status: "error", message: "Invalid Action" }));
    }
});

server.listen(process.env.PORT || 3000);
