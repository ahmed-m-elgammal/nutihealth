const pino = require('pino');
const pinoHttp = require('pino-http');

const NODE_ENV = process.env.NODE_ENV || 'development';
const defaultLogLevel = NODE_ENV === 'production' ? 'info' : NODE_ENV === 'test' ? 'silent' : 'debug';
const level = process.env.LOG_LEVEL || defaultLogLevel;

const logger = pino({
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
});

const httpLogger = pinoHttp({
    logger,
    customAttributeKeys: {
        responseTime: 'durationMs',
    },
    serializers: {
        req: (req) => ({
            method: req.method,
            path: req.url,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
    customProps: (req, res) => ({
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
    }),
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',
});

module.exports = {
    logger,
    httpLogger,
};
