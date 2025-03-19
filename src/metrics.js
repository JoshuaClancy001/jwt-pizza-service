const config = require('./config');
const os = require('os');

let totalRequests = 0;


function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage

}

const requests = {};
let successfulAuths = 0
let failedAuths = 0
let numPizzasSold = 0
let createPizzaFailures = 0
let totalRevenue = 0
let latencyNumber = 0.0
let pizzaLatency = 0.0
const activeUsers = {};

function requestTracker(req, res, next) {
    totalRequests++;
    const method = req.method;  // Extract only the method (GET, POST, etc.)
    requests[method] = (requests[method] || 0) + 1;
    next();
}

async function trackLatency(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const end = Date.now();
        const duration = end - start;
        latencyNumber += duration;
    });

    next();

}

function trackPizzaLatency(start, end){
    const duration = end - start;
    pizzaLatency += duration;
}

function addSuccessAuth(){
    successfulAuths++;
}
function addFailedAuth(){
    failedAuths++;
}

function addPizzaSold(){
    numPizzasSold++;
}

function addPizzaFailure(){
    createPizzaFailures++;
}

function addRevenue(amount){
    totalRevenue += amount;
}

function addActiveUser(user){
    activeUsers[user] = Date.now() * 3 * 1000 * 60;
}

function clearUpInactiveUsers(){
    const now = Date.now();
    Object.keys(activeUsers).forEach((user) => {
        if (activeUsers[user] < now) {
            console.log('cleared up inactive user', user);
            delete activeUsers[user];
        }
    });
}

function removeActiveUser(user){
    delete activeUsers[user];
}

function sendMetricToGrafana(metricName, metricValue, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: '1',
                sum: {
                  dataPoints: [
                    {
                      asDouble: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                      attributes: [],
                    },
                  ],
                  aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                  isMonotonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  Object.keys(attributes).forEach((key) => {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        console.error('Failed to push metrics data to Grafana');
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}


function sendGaugeMetricToGrafana(metricName, metricValue, attributes) {
    attributes = { ...attributes, source: config.metrics.source };
  
    const metric = {
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics: [
                {
                  name: metricName,
                  unit: '1',
                  gauge: {
                    dataPoints: [
                      {
                        asDouble: metricValue,  // Use asDouble for gauge
                        timeUnixNano: Date.now() * 1000000,
                        attributes: [],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  
    Object.keys(attributes).forEach((key) => {
      metric.resourceMetrics[0].scopeMetrics[0].metrics[0].gauge.dataPoints[0].attributes.push({
        key: key,
        value: { stringValue: attributes[key] },
      });
    });
  
    fetch(`${config.metrics.url}`, {
      method: 'POST',
      body: JSON.stringify(metric),
      headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push gauge metric to Grafana');
        } else {
          console.log(`Pushed gauge ${metricName}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing gauge metrics:', error);
      });
  }

  

  

setInterval(() => {

    sendGaugeMetricToGrafana('cpu_usage', getCpuUsagePercentage());
    sendGaugeMetricToGrafana('memory_usage', getMemoryUsagePercentage());

    clearUpInactiveUsers();
    sendMetricToGrafana('activeUsers', Object.keys(activeUsers).length);

    console.log(numPizzasSold)
    sendMetricToGrafana('numPizzasSold', numPizzasSold);
    console.log(createPizzaFailures)
    sendMetricToGrafana('createPizzaFailures', createPizzaFailures);
    console.log(totalRevenue)
    sendGaugeMetricToGrafana('totalRevenue', totalRevenue);


    console.log(successfulAuths)
    sendMetricToGrafana('successfulAuths', successfulAuths);
    console.log(failedAuths)
    sendMetricToGrafana('failedAuths', failedAuths);

    sendMetricToGrafana('numRequests', totalRequests);
    Object.keys(requests).forEach((method) => {
        sendMetricToGrafana('requests_per_method', requests[method], { method: method });
    });

    sendGaugeMetricToGrafana('latency', latencyNumber / totalRequests);
    latencyNumber = 0.0;
    console.log(pizzaLatency)
    sendGaugeMetricToGrafana('pizzaLatency', pizzaLatency / numPizzasSold);
    pizzaLatency = 0.0;



}, 10000);

module.exports = { requestTracker, addActiveUser, removeActiveUser, addSuccessAuth, addFailedAuth, addPizzaSold, addPizzaFailure, addRevenue, trackLatency, trackPizzaLatency };
