/**
 * @file 
 * Implementation for gateway state (RES_OUT)
 * 
 * Log response output
 */
var env = require('../settings').ENV,
    serviceVars = require('service-metadata'),
    headers = require('header-metadata').current,
    GatewayState = require('./apigw-util').GatewayState,
    GatewayConsole = require('./apigw-util').GatewayConsole;

const _console = new GatewayConsole(env['api.log.category']);
const _state = GatewayState.states.RES_OUT;
var gwState = new GatewayState(_state, _console, 'apimgr', 'gatewayState');
var _ctx = gwState.context();

/** on enter */
gwState.onEnter();

let analyticsCtx = session.createContext('response_out_analytics_full');
let analyticsData = {
    "state": "response_out",
    "tid": serviceVars.transactionId,
    "gtid": _ctx.getVar('gtid'),
    "datetime": new Date().toISOString(),
    "latency" : serviceVars.timeElapsed,

    "httpResponseCode": headers.statusCode + ' ' + headers.reasonPhrase,

    "message": {
        "headers": headers.get()
        //"size": 
        //"body":
    }
};

// ANALYTICS LOG

if (env['gateway.log.payload'] === true) {
    // log for analytics (to remote Splunk)
    gwState.notice(JSON.stringify(analyticsData), false);

    // log for full analytics
    new Promise(function(resolve, reject) {
        session.input.readAsBuffer(function (error, buffer) {
            
            if (error) {
                reject("Failed to read payload for analytics log.");
            } else {
                resolve(buffer);
            }
            return;
        });
    })
    .then(function(payloadBuffer) {
        analyticsData.message.body = payloadBuffer.toString();
        analyticsData.message.size = payloadBuffer.length;
        analyticsCtx.write(analyticsData);

        setResponseContentType();
        gwState.onExit(true);
    })
    .catch(function(errorMessage) {
        gwState.warn(errorMessage);

        setResponseContentType();
        gwState.onExit(true);
    });

} else {
    // log for analytics (to remote Splunk)
    gwState.notice(JSON.stringify(analyticsData), false);

    setResponseContentType();

    gwState.onExit(true);
}




// RESPONSE CONTENT-TYPE


function setResponseContentType() {
    let produceContentType = function () {
        if (_ctx.getVar('producesType')) {
            return _ctx.getVar('producesType');
        } else if (gwUtil.isXML(require('header-metadata').original.get('Content-Type'))) {
            return 'application/xml';
        } else {
            return 'application/json';
        }
    };
    let outputContentType = produceContentType();
    gwState.debug('Set response Content-Type: ' + outputContentType)
    headers.set('Content-Type', outputContentType);
}

gwState.onExit();
