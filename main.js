var bert = require('./bert.js'),
    Duplex = require('stream').Duplex,
    util = require('util'),
    stdin = process.stdin, stdout = process.stdout,
    term_len = undefined;

util.inherits(Port, Duplex);

function Port() { Duplex.call(this,{objectMode: true}); }
var port = new Port();

Port.prototype._read = read_term
stdin.on('readable', read_term);
stdin.on('end', process.exit);

function read_term() {
  var term;
  if (term_len === undefined && null !== (term_bin = stdin.read(4))) {
    term_len = bert.bytes_to_int(term_bin,4,true);
  }
  if (term_len !== undefined && null !== (term = stdin.read(term_len))) {
    term_len = undefined;
    port.push(bert.decode(term));
  }
}

Port.prototype._write = function(obj, encoding, callback){
  var term = bert.encode(obj);
  var len = new Buffer(4); len.writeUInt32BE(term.length,0);
  stdout.write(len);
  stdout.write(term,callback);
}

function log(mes){
  if (typeof(mes) != 'string') mes = JSON.stringify(mes); 
  process.stderr.write((new Date()).toString().substring(4,24) + " " + mes + "\n");
}

function server(handler){
  var state = null, lock = false, mailbo;
  port.on('in',function(term){
    if(state === null){
      state = term;
    }else{
      handler(term,function(type,arg1,arg2){
        if (type === "reply") port.emit('out',arg1);
        if ((type === "reply" && arg2) || (type === "noreply" && arg1)) {
          state = (arg2 || arg1)(state)
        }
      });
    }
  });
}
module.exports.port = port;
module.exports.server = server;
module.exports.log = log;
