require('./../main.js').server(function(term,from,current_amount,done){
  if (term == "get") return done("reply",current_amount);
  if (term[0] == "add") return done("noreply",current_amount+term[1]);
  if (term[0] == "rem") return done("noreply",current_amount-term[1]);
  throw new Error("unexpected request")
});

