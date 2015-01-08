node_erlastic
=============

Node library to make nodejs gen_server in Erlang/Elixir through Port connection.

This module allows you to :
- decode and encode between Binary Erlang Term and javascript types
- create a simple Erlang port interface through a nodeJS *Readable* and *Writable* (Duplex)
- create a "`gen_server` style" handler to manage your port

## Example Usage

Before going through details, lets take an example, write an account
manager server, where you can add or remove an amount in the
account and get it :

```javascript
require('node_erlastic').server(function(term,from,current_amount,done){
  if (term == "get") return done("reply",current_amount);
  if (term[0] == "add") return done("noreply",current_amount+term[1]);
  if (term[0] == "rem") return done("noreply",current_amount-term[1]);
  throw new Error("unexpected request")
});
```

```elixir
GenServer.start_link(Exos.Proc,{"node calculator.js",0,cd: "/path/to/proj"}, name: Calculator)
GenServer.cast Calculator, {:add, 2}
GenServer.cast Calculator, {:add, 3}
GenServer.cast Calculator, {:rem, 1}
4 = GenServer.get Calculator, :get

defmodule Exos.Proc do
  use GenServer
  @moduledoc """
    Generic port as gen_server wrapper :
    send a message at init, first message is remote initial state
    cast and call encode and decode erlang binary format
  """
  def init({cmd,init,opts}) do
    port = Port.open({:spawn,'#{cmd}'}, [:binary,:exit_status, packet: 4] ++ opts)
    send(port,{self,{:command,:erlang.term_to_binary(init)}})
    {:ok,port}
  end
  def handle_info({port,{:exit_status,0}},port), do: {:stop,:normal,port}
  def handle_info({port,{:exit_status,_}},port), do: {:stop,:port_terminated,port}
  def handle_info(_,port), do: {:noreply,port}
  def handle_cast(term,port) do
    send(port,{self,{:command,:erlang.term_to_binary(term)}})
    {:noreply,port}
  end
  def handle_call(term,_reply_to,port) do
    send(port,{self,{:command,:erlang.term_to_binary(term)}})
    res = receive do {^port,{:data,b}}->:erlang.binary_to_term(b) end
    {:reply,res,port}
  end
end
```

## External Term Format codec (BERT)

```javascript
var Bert = require('node_erlastic/bert');
// you can configure `convention`, `all_binaries_as_string` , `map_key_as_atom`, see below
Bert.convention = Bert.ELIXIR;
Bert.all_binaries_as_string = true;

Bert.encode({foo: "bar", k2: 4});
Bert.encode({foo: "bar", k2: 4},true);
// with ",true", the result is not copied, the return buffer point always to
// the same allocated memory
Bert.decode(mybuffer);
```

`Bert.decode` and `Bert.encode` use a nodejs `Buffer` object
containing the binary erlang term, converted using the following rules :

- erlang atom `foobar` is js `{type: "Atom",value: "foobar", toString->value}` create it with `Bert.atom("foobar")`
  - the `toString()` method allows you to match with string `myatom == 'foobar'`
- erlang list is js list
- erlang tuple `{a,b}` is js `{type: "Tuple",value: [a,b],length: 2, 0: a, 1: b}`
  - the js object allows you to access elements by index
- erlang integer is js integer
- erlang float is js float
- other js objects are erlang maps
  - erlang keys are converted to string during decoding (js behavior)
  - js keys are converted to erlang atom if `Bert.map_key_as_atom == true`
- erlang binary is nodejs "Buffer"
  - but converted into string if `Bert.convention == Bert.ELIXIR && Bert.all_binaries_as_string`
- js string is
  - UTF8 erlang binary if `Bert.convention == Bert.ELIXIR`
  - erlang character list if `Bert.convention == Bert.ERLANG`
- js boolean are `true` and `false` atoms
- js null and undefined are
  - `nil` atom if `Bert.convention == Bert.ELIXIR`
  - `undefined` atom if `Bert.convention == Bert.ERLANG`
  - if `Bert.decode_undefined_values == false`, then `nil` and `undefined` are
    decoded into atom instead of null

## The Port Duplex

Port provides you a Node Duplex stream in object mode which is both Readable
and Writable : http://nodejs.org/api/stream.html#stream_class_stream_duplex_1
Through this duplex, you can communicate javascript objects with an erlang node
through stdin/out with `port.read()` and `port.write(obj)`.  These objects are
converted to erlang external binary format using the Bert encoder described
above.

**Need `{packet,4}` `openport` option on the erlang side**

Below a simple "echo" server using this abstraction, read nodejs
"readable" documentation to understand it :

```javascript
var port = require('node_erlastic').port;
port.on('readable', function echo(){
  if(null !== (term = port.read())){
    port.write(term);
    echo();
  }
});
```

```elixir
port = Port.open({:spawn,'node calculator.js'}, [:binary, packet: 4])
send(port,{self,{:command,:erlang.term_to_binary( {:hello, 007} )}})
{:hello, 007} = receive do {^port,{:data,b}}->:erlang.binary_to_term(b) end
send(port,{self,{:command,:erlang.term_to_binary( [:foo, :bar]} )}})
[:foo, :bar] = receive do {^port,{:data,b}}->:erlang.binary_to_term(b) end
```

## The Erlang style handler interface to the port event handler

For convenience, you can use the `server` function to react to the
port events in the same fashion as the erlang gen server handler.

It takes as parameter a handler function taking `(req_term,from,state,done)` parameters.
To "unlock" state and continue to read request mailbox (equivalent of the
return of the erlang `gen_server handle_*` function), you need to call `done`.

```javascript
done("noreply",newstate); 
done("noreply");
done("reply",reply_term,newstate);
done("reply",reply_term);
```

Like in erlang, your handler can unlock the state before it replies
to the call:

```javascript
done("noreply",newstate);
// then in some callback
from(myreply);
```

Before sending request, the first message from the port will be
used to define the initial state.

Please see the beginning of this README to find a complete example.

## Log function

The port stderr is directly output into the erlang stdout, this library
provides a convenient `log` function allowing you to log something from your
node server.

```javascript
  var log = require("node_erlastic").log;
  log("your log");
```
