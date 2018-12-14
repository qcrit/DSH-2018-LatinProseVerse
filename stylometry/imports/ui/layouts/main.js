import "./main.html";

Meteor.startup(function() {
  Meteor.call("authors", function(error, result) {
    Session.set("authors", result);
  });
});
