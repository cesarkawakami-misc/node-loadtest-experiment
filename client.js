const { stat } = require('fs');
const http = require('http');
const common = require('./common.js');

const port = 8010;
const fanout = 1000;
const targetHost = '127.0.0.1';
const targetPort = 8000;
const targetPath = '/test';

const stats = new common.ReqStats();
const latStats = new common.LatStats();
const agent = new http.Agent({keepAlive: true, maxFreeSockets: 30000, scheduling: 'fifo'});

const server = http.createServer(async (req, res) => {
    const promises = Array(fanout).fill().map(async () => {
        const reqStart = common.monoTime();
        const resp = await common.makeRequest({
            host: targetHost,
            port: targetPort,
            path: targetPath,
            method: 'GET',
            agent
        });
        const reqEnd = common.monoTime();
        const latency = reqEnd - reqStart;
        if (resp !== 'hello world!') {
            throw new Error(`unexpected response: ${resp}`);
        }
        stats.tick();
        latStats.addSample(latency);
    });
    await Promise.all(promises);
    res.end('hello world 2!');
});

stats.loggerWorker();
latStats.loggerWorker();

console.log(`Worker ${process.pid} listening on ${port}...`);
server.listen(port);
