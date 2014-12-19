defmodule Exos.Proc do
  use GenServer

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

ExUnit.start
defmodule PortTest do
  use ExUnit.Case, async: true

  setup_all do
    GenServer.start_link(Exos.Proc,{"node ./test.js",[],cd: __DIR__}, name: Echo)
    :ok
  end
  
  test "echo server return same term" do
    test = [:foo,"bar",%{hello: "world"},123,3.2,9007199254740992,{:a,:b}]
    assert  test ==  GenServer.call Echo, test
  end
end
