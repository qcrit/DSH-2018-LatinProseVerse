import "../../ui/layouts/main.js";

Router.route("/", {
  name: "stylometry",
  onBeforeAction: function() {
    import "../../ui/pages/stylometry.js";
    this.render("stylometrytable", {to: "stylooption"});
    this.next();
  }
});

Router.route("/sresults", {
  name: "sresults",
  onBeforeAction: function() {
    import "../../ui/pages/sresults.js";
    this.render("stylometrytable", {to: "stylooption"});
    this.next();
  }
});

Router.route("/(.*)", {
  onBeforeAction: function() {
    Router.go("/"), this.next();
  }
});

Router.configure({
  layoutTemplate: "mainlayout"
});
