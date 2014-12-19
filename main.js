var bert = require('./bert.js'),
    events = require('events'),
    port = new events.EventEmitter();
    stdin = process.stdin, 
    stdout = process.stdout,
    term_len = undefined;

stdin.on('readable', function() {
  var term;
  if (term_len === undefined && null !== (term_bin = stdin.read(4))) {
    term_len = bert.bytes_to_int(term_bin,4,true);
  }
  if (null !== (term = stdin.read(term_len))) {
    port.emit('in',bert.decode(term));
    term_len = undefined;
  }
});
stdin.on('end', process.exit);

port.on('out', function(obj) {
  var term = bert.encode(obj);
  var len = new Buffer(4); len.writeUInt32BE(term.length,0);
  stdout.write(len);
  stdout.write(term);
});

module.exports.port = port;
