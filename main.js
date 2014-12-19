var bert = require('./bert.js'),
    events = require('events'),
    port = new events.EventEmitter();
    stdin = process.stdin, 
    stdout = process.stdout,
    term_len = undefined;

stdin.on('readable', function onreadable() {
  var term;
  if (term_len === undefined && null !== (term_bin = stdin.read(4))) {
    term_len = bert.bytes_to_int(term_bin,4,true);
  }
  if (null !== (term = stdin.read(term_len))) {
    port.emit('in',bert.decode(term));
    term_len = undefined;
    onreadable();
  }
});
stdin.on('end', process.exit);

port.on('out', function(obj) {
  var term = bert.encode(obj);
  var len = new Buffer(4); len.writeUInt32BE(term.length,0);
  stdout.write(len);
  stdout.write(term);
});

function log(mes){
  if (typeof(mes) != 'string') mes = JSON.stringify(mes); 
  process.stderr.write((new Date()).toString().substring(4,24) + " " + mes + "\n");
}

function server(handler){
  state = null;
  port.on('in',function(term){
    if(state === null){
      state = term; 
    }else{
      var res = handler(term,state);
      if (res[0] === "reply") {
        port.emit('out',res[1]);
        state = res[2];
      }else{
        state = res[1];
      }
    }
  });
}
module.exports.port = port;
module.exports.server = server;
module.exports.log = log;
