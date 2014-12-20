var port = require('./../main.js').port,
    state = null;
port.on('readable', function echo(){
  if(null !== (term = port.read())){
    if (state === null) state = term;
    else port.write(term);
    echo();
  }
});
