/**
 * Load Test — Baseline (100 users, 60s) with Excel Report
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const URL = 'http://localhost:3000/login';
const CONCURRENCY = 100;
const DURATION_SECONDS = 60;
const REPORT_PATH = path.join(__dirname, 'reports', 'load-test-report.xlsx');

console.log(`Starting Baseline Load Test on ${URL}`);
console.log(`- Virtual Users: ${CONCURRENCY}`);
console.log(`- Duration:      ${DURATION_SECONDS} seconds\n`);

let totalRequests = 0;
let successRequests = 0;
let failedRequests = 0;
const responseTimes = [];
const startTime = Date.now();

async function makeRequest() {
  const reqStart = performance.now();
  try {
    const res = await fetch(URL);
    if (res.ok || res.status === 200 || res.status === 307) {
      successRequests++;
    } else {
      failedRequests++;
    }
  } catch (e) {
    failedRequests++;
  }
  responseTimes.push(performance.now() - reqStart);
}

async function worker() {
  while (Date.now() - startTime < DURATION_SECONDS * 1000) {
    await makeRequest();
    totalRequests++;
  }
}

async function runTest() {
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
  await Promise.all(workers);

  const durationMs = Date.now() - startTime;
  const rps = (totalRequests / (durationMs / 1000)).toFixed(2);

  let minTime = Infinity, maxTime = 0, sumTime = 0;
  for (const t of responseTimes) {
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
    sumTime += t;
  }
  const avgTime = responseTimes.length > 0 ? (sumTime / responseTimes.length).toFixed(2) : 0;
  minTime = (minTime === Infinity ? 0 : minTime).toFixed(2);
  maxTime = maxTime.toFixed(2);

  console.log('________________________________________');
  console.log(`RPS:     ${rps} req/sec`);
  console.log(`Average: ${avgTime}ms`);
  console.log(`Min:     ${minTime}ms`);
  console.log(`Max:     ${maxTime}ms`);
  console.log(`Total:   ${totalRequests} | ✅ ${successRequests} | ❌ ${failedRequests}`);
  console.log('________________________________________');

  // Write Excel Report
  const wb = new ExcelJS.Workbook();

  // Summary sheet
  const ws = wb.addWorksheet('Load Test Summary');
  ws.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 25 },
  ];
  ws.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; });
  [
    { metric: 'Target URL', value: URL },
    { metric: 'Concurrent Users', value: CONCURRENCY },
    { metric: 'Test Duration (s)', value: DURATION_SECONDS },
    { metric: 'Total Requests Sent', value: totalRequests },
    { metric: 'Successful Requests', value: successRequests },
    { metric: 'Failed Requests', value: failedRequests },
    { metric: 'Requests Per Second (RPS)', value: rps },
    { metric: 'Avg Response Time (ms)', value: avgTime },
    { metric: 'Min Response Time (ms)', value: minTime },
    { metric: 'Max Response Time (ms)', value: maxTime },
    { metric: 'Pass / Fail', value: failedRequests === 0 ? 'PASS ✅' : 'FAIL ❌' },
  ].forEach(row => {
    const r = ws.addRow(row);
    if (row.metric === 'Pass / Fail') {
      r.getCell('value').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: failedRequests === 0 ? 'FF00AA00' : 'FFCC0000' } };
      r.getCell('value').font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }
  });

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  await wb.xlsx.writeFile(REPORT_PATH);
  console.log(`\n📊 Report saved: ${REPORT_PATH}`);
}

runTest().catch(e => { console.error(e); process.exit(1); });
