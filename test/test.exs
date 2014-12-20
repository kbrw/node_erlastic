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
    GenServer.start_link(Exos.Proc,{"node test.js",[],cd: __DIR__}, name: Echo)
    GenServer.start_link(Exos.Proc,{"node calculator.js",0,cd: __DIR__}, name: Calculator)
    :ok
  end
  
  test "echo server return same term" do
    test = [:foo,"bar",%{hello: "world"},123,3.2,9007199254740992,{:a,:b}]
    assert  test ==  GenServer.call Echo, test
  end
  
  test "calculator must return the good result" do
    GenServer.cast Calculator, {:add, 1}
    GenServer.cast Calculator, {:add, 2}
    GenServer.cast Calculator, {:rem, 3}
    GenServer.cast Calculator, {:add, 4}
    GenServer.cast Calculator, {:add, 5}
    GenServer.cast Calculator, {:rem, 6}
    assert 3 = GenServer.call(Calculator,:get)
  end
end
