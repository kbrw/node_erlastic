var port = require('./../main.js').port;
port.on('in',function(term){
    port.emit('out',term);
});
