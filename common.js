const http = require('http');

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

class ReqStats {
    constructor() {
        this.reset();
    }

    tick(delta) {
        if (delta === undefined) {
            delta = 1;
        }
        this.count += delta;
    }

    fetch() {
        return {
            count: this.count,
            period: monoTime() - this.start,
        };
    }

    reset() {
        this.count = 0;
        this.start = monoTime();
    }

    fetchAndReset() {
        const rv = this.fetch();
        this.reset();
        return rv;
    }

    async loggerWorker() {
        while (true) {
            await sleep(1);
            const {count, period} = this.fetchAndReset();
            console.log(`RPS: ${count / period}`);
        }
    }
}

const LAT_SAMPLE_LIMIT = 1000;
class LatStats {
    constructor() {
        this.reset();
    }

    reset() {
        this.samples = [];
        this.totalCount = 0;
    }

    addSample(sample) {
        ++this.totalCount;
        const index = Math.floor(Math.random() * this.totalCount);
        if (index < LAT_SAMPLE_LIMIT) {
            if (this.samples.length < LAT_SAMPLE_LIMIT) {
                this.samples.push(sample);
            } else {
                this.samples[index] = sample;
            }
        }
    }

    fetch() {
        if (!this.samples.length) {
            return {};
        }
        this.samples.sort((a, b) => a - b);
        return {
            p50: this.samples[Math.floor(.5 * this.samples.length)],
            p90: this.samples[Math.floor(.9 * this.samples.length)],
            p99: this.samples[Math.floor(.99 * this.samples.length)],
        };
    }

    fetchAndReset() {
        const rv = this.fetch();
        this.reset();
        return rv;
    }

    async loggerWorker() {
        while (true) {
            await sleep(1);
            const {p50, p90, p99} = this.fetchAndReset();
            console.log(`latencies:  p50: ${p50}  p90: ${p90}  p99: ${p99}`);
        }
    }
}

module.exports = {
    monoTime,
    sleep,
    makeRequest,
    ReqStats,
    LatStats,
};
