import "./stylometry.html";
import {naturalSort} from "./helpers.js";
import "../select2.min.js";

const addclass = "stylo_sel";

let count = 0;
let aarray = [];
let tarray = [];
let barray = [];
let featureArray = [];
let selectAll = false;

const tempArray = [
  "p1",
  "p2",
  "p3",
  "p4",
  "p5",
  "n1",
  "n2",
  "n3",
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
  "s9",
  "m1",
  "m2",
  "m3",
  "m4",
  "m5",
  "m6",
  "m7",
  "c1",
  "c2"
];

Template.stylometry.events({
  "click .stylo_sec"(e) {
    const id = e.currentTarget.id;
    $("#" + id).toggleClass("stylo_sel");
  },
  "change #selectAll"(event) {
    event.preventDefault();
    if (document.getElementById("fauthor").disabled) {
      $("#fauthor").prop("disabled", false);
      $(".fauthor").removeClass("disabled");
      $(".addmore").show();
      selectAll = false;
    } else {
      $("#fauthor").prop("disabled", true);
      $(".fauthor").addClass("disabled");
      $(".addmore").hide();
      selectAll = true;
      tarray.push("All");
      aarray.push("All");
      barray.push("All");
    }
  },
  "click #graphs"(event) {
    event.preventDefault();
    const controller = Iron.controller();
    controller.render("stylometrygraph", {to: "stylooption"});
    $("#graphs").hide();
    $("#table").show();
  },
  "click #table"(event) {
    event.preventDefault();
    const controller = Iron.controller();
    controller.render("stylometrytable", {to: "stylooption"});
    $("#table").hide();
    $("#graphs").show();
  },
  "click .newsearch"(event, template) {
    Session.set("styloresult", null);
    $("#stable").empty();
    $(".sresult").hide();
    $(".ssearch").show();
  },
  "click .addmore"(event, template) {
    var ul = document.getElementById("dynamic-list");
    const candidate = document.getElementById("fauthor");
    const candidate2 = document.getElementById("ftext");
    const candidate3 = document.getElementById("fbook");
    count += 1;
    tarray.push(candidate2.value);
    aarray.push(candidate.value);
    barray.push(candidate3.value);
    $("#stylocorpus").append(
      '<tr class="list"><td data-name=' +
        candidate.value +
        ">" +
        candidate.value +
        "</td><td data-name=" +
        candidate2.value +
        ">" +
        candidate2.value +
        "</td><td data-name=" +
        candidate3.value +
        ">" +
        candidate3.value +
        '</td><td class="text-center"><button type="button" class="btn btn-info remove" id="delete"><i class="fa fa-trash"></i> Remove</button></td></tr>'
    );
    $("#fauthor").select2("data", null);
    $("#fbook").select2("data", null);
    $("#ftext").select2("data", null);
    $(".ftext").addClass("disabled");
    $("#ftext").prop("disabled", true);
    $(".fbook").addClass("disabled");
    $("#fbook").prop("disabled", true);
  },
  "submit #fsearch"(event, template) {
    event.preventDefault();
    const target = event.target;
    const author = $("#fauthor :selected").val();
    const book = $("#fbook :selected").val();
    const text = $("#ftext :selected").val();
    let farrays = tempArray;
    farrays.push($("#pronouns").val());
    farrays.push($("#adjectives").val());
    farrays.push($("#conjunctions").val());
    farrays.push($("#subordinate").val());
    farrays.push($("#miscellaneous").val());
    let farray = [].concat.apply([], farrays);
    Session.set("features", farray);
    const data = {
      author: aarray,
      text: tarray,
      book: barray
    };
    const features = {
      feature: farray,
      selectAll: selectAll
    };
    $(".ssearch").hide();
    $(".sloading").show();
    Meteor.call("stylometryf", data, features, function(error, result) {
      if (error) {
        Bert.alert("Error, please re-try!", "danger", "growl-top-right");
        console.log(error);
        $(".sloading").hide();
        $(".ssearch").show();
      } else {
        Session.set("styloresult", result);
        Router.go("/sresults");
      }
    });
  },
  "click .remove"(event, template) {
    event.preventDefault();
    const target = event.target;
    const rname = $(target).data("name");
    const sname = $(target).data("sub");
    const a = narray.indexOf(rname);
    const t = narray.indexOf(sname);
    $(target)
      .closest("tr")
      .remove(this.id);
    aarray.splice(a, 1);
    tarray.splice(t, 1);
    barray.splice(b, 1);
    count -= 1;
  }
});

Template.stylometry.onRendered(function() {
  $(".select2").select2({
    minimumResultsForSearch: 2,
    width: "100%",
    matcher: function(term, text) {
      return text.toUpperCase().indexOf(term.toUpperCase()) == 0;
    }
  });

  aarray = [];
  tarray = [];
  barray = [];
  $("#arows").on("click", ".delete", function() {
    $(this)
      .closest("tr")
      .remove();
  });

  $("#fauthor").on("change", function(e) {
    const target = e.target;
    const author = $("#fauthor :selected").val();
    Meteor.call("texts", author, function(error, result) {
      Session.set("texts", result);
      $("#ftext").prop("disabled", false);
      $(".ftext").removeClass("disabled");
    });
  });

  $("#ftext").on("change", function(e) {
    const target = e.target;
    const author = $("#fauthor :selected").val();
    const text = $("#ftext :selected").val();
    Meteor.call("books", author, text, function(error, result) {
      sort = result.sort(naturalSort);
      Session.set("books", sort);
      $("#fbook").prop("disabled", false);
      $(".fbook").removeClass("disabled");
    });
  });
});

Template.stylometry.helpers({
  authors() {
    return Session.get("authors");
  },
  texts() {
    return Session.get("texts");
  },
  books() {
    return Session.get("books");
  },
  removepart(a1) {
    if (a1) return a1.replace("Part ", "");
  },
  sigfig(a1) {
    if (a1) return a1.toFixed(3);
  }
});
