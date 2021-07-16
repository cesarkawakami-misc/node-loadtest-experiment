const http = require('http');
const process = require('process');
const {fork} = require('child_process');

const monoTime = () => {
    const [secs, nanos] = process.hrtime();
    return secs + nanos / 1000000000;
};

const sleep = seconds => new Promise((resolve, reject) => setTimeout(resolve, seconds * 1000));

const makeRequest = async (options) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        const req = http.request(options, res => {
            res.on('data', (data) => {
                chunks.push(data);
            });
            res.on('end', () => {
                const responseData = Buffer.concat(chunks).toString();
                resolve(responseData);
            });
        });
        req.on('error', err => {
            reject(err);
        });
        req.end();
    });

const mainCoordinator = async () => {
    const concurrency = 8;

    let requestCount = 0;
    let periodStart = monoTime();
    const launchWorker = () => {
        const child = fork(__filename, [], {
            env: {
                ...process.env,
                IS_WORKER: 'true'
            }
        });
        child.on('message', childRequestCount => {
            requestCount += childRequestCount;
        });
    };

    const workerProcesses = Array(concurrency).fill().map(launchWorker);

    while (true) {
        await sleep(1);
        const requestsInPeriod = requestCount;
        requestCount = 0;
        const now = monoTime();
        const periodLength = now - periodStart;
        periodStart = now;
        console.log(`RPS: ${requestsInPeriod / periodLength}`);
    }
};

const mainWorker = async () => {
    const notifyEvery = 100;
    const agent = new http.Agent({keepAlive: true});
    let requestCount = 0;
    while (true) {
        const responseData = await makeRequest({
            hostname: '127.0.0.1',
            port: 8000,
            path: '/test',
            method: 'GET',
            agent
        });
        if (responseData !== 'hello world!') {
            throw new Error(`unexpected response: ${responseData}`);
        }
        ++requestCount;
        if (requestCount >= notifyEvery) {
            process.send(requestCount);
            requestCount = 0;
        }
    }
};

const main = async () => {
    if (process.env['IS_WORKER']) {
        await mainWorker();
    } else {
        await mainCoordinator();
    }
};

main();
