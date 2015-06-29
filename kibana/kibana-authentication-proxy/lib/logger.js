var fs = require('fs');
var path = require('path');
var util = require('util');
var winston = require('winston');

var ParentProcessLogger = winston.transports.ParentProcessLogger = function ParentProcessLogger (options) {
    options = options || {};
    this.name = 'parent_process_logger';
    this.level = options.level || 'info';
};
util.inherits(ParentProcessLogger, winston.Transport);
ParentProcessLogger.prototype.log = function (level, msg, meta, callback) {
    process.send({level:level, msg:msg});
    callback(null, true);
};
exports.ParentProcessLogger = ParentProcessLogger;

exports.reopenTransportOnSighup = function reopenTransport(transport) {
    process.on('SIGHUP', function() {
        if (transport instanceof winston.Transport) {
            var filename = path.join(transport.dirname, transport._getFile(false));
            function reopen() {
                if (transport._stream) {
                    transport._stream.end();
                    transport._stream.destroySoon();
                }
                var stream = fs.createWriteStream(filename, transport.options);
                stream.setMaxListeners(Infinity);
                transport._size = 0;
                transport._stream = stream;
                transport.once('flush', function() {
                    transport.opening = false;
                    transport.emit('open', filename);
                });
                transport.flush();
            }
            reopen();
        }
    });
}
