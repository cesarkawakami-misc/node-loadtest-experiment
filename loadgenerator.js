const http = require('http');
const process = require('process');
const {fork} = require('child_process');
const common = require('./common.js');

const targetHost = '127.0.0.1';
const targetPort = 8010;
const targetPath = '/test';
const concurrency = 32;

const stats = new common.ReqStats();
const latStats = new common.LatStats();
const agent = new http.Agent({keepAlive: true, maxFreeSockets: 30000, scheduling: 'fifo'});

const worker = async () => {
    // Stagger workers starting up over 10s to avoid thundering herd
    await common.sleep(Math.random() * 10);

    while (true) {
        try {
            const reqStart = common.monoTime();
            const responseData = await common.makeRequest({
                hostname: targetHost,
                port: targetPort,
                path: targetPath,
                method: 'GET',
                agent
            });
            const latency = common.monoTime() - reqStart;
            if (responseData !== 'hello world 2!') {
                throw new Error(`unexpected response: ${responseData}`);
            }
            stats.tick();
            latStats.addSample(latency);
        } catch (e) {
            console.log(`worker error: ${e}`);
        }
    }
};

const main = async () => {
    const workerPromises = Array(concurrency).fill().map(worker);

    latStats.loggerWorker();
    await stats.loggerWorker();
};

main();
