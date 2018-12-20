import "./sresults.html";
import csv from "to-csv";

const allF = [
  {name: "Personal Pronouns", feature: "p1"},
  {name: "Demonstrative Pronouns", feature: "p2"},
  {name: "Quidam", feature: "p3"},
  {name: "Reflexive Pronouns", feature: "p4"},
  {name: "Iste", feature: "p5"},
  {name: "Alius", feature: "n1"},
  {name: "Ipse", feature: "n2"},
  {name: "Idem", feature: "n3"},
  {name: "Priusquam", feature: "s6"},
  {name: "Antequam", feature: "s5"},
  {name: "Quominus", feature: "s4"},
  {name: "Dum", feature: "s7"},
  {name: "Quin", feature: "s3"},
  {name: "Ut", feature: "m4"},
  {name: "Conditionals", feature: "s1"},
  {name: "Prepositions", feature: "m7"},
  {name: "Conjunctions", feature: "c1"},
  {name: "Atque + consonant", feature: "c2"},
  {name: "Cum", feature: "s2"},
  {name: "Relative Clauses", feature: "s8"},
  {name: "Mean Length Relative Clauses", feature: "s9"},
  {name: "Interrogative Sentences", feature: "m1"},
  {name: "Vocatives", feature: "m2"},
  {name: "Superlatives", feature: "m3"},
  {name: "Gerunds and Gerundives", feature: "m5"},
  {name: "Mean Sentence Length", feature: "m6"}
];

const nameObject = {
  name: "Corpus Name",
  sentences: "Sentences",
  words: "Words",
  characters: "Characters",
  p1: "Personal Pronouns",
  p2: "Demonstrative Pronouns",
  p3: "Quidam",
  p4: "Reflexive Pronouns",
  p5: "Iste",
  n1: "Alius",
  n2: "Ipse",
  n3: "Idem",
  s6: "Priusquam",
  s5: "Antequam",
  s4: "Quominus",
  s7: "Dum",
  s3: "Quin",
  m4: "Ut",
  s1: "Conditionals",
  m7: "Prepositions",
  c1: "Conjunctions",
  c2: "Atque + consonant",
  s2: "Cum",
  s8: "Relative Clauses",
  s9: "Mean Length Relative Clauses",
  m1: "Interrogative Sentences",
  m2: "Vocatives",
  m3: "Superlatives",
  m5: "Gerunds and Gerundives",
  m6: "Mean Sentence Length",
  type: "Type"
};

const renameObject = (o) => Object.assign(...Object.keys(o).map((k) => ({[nameObject[k] || k]: o[k]})));

const hexToRGB = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  } else {
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }
};

const htmlLabels = () => {
  let dy = [];
  const featureLength = allF.length;
  const featureArray = Session.get("features");
  for (let i = 0; i < fl; i++) {
    let col = {};
    if (farray.includes(allF[i].feature)) {
      col.header = allF[i].name;
      col.description = allF[i].name;
      col.feature = allF[i].feature;
      dy.push(col);
    }
  }
  return dy;
};

const scatterColors = ["#702c39", "#b7c1c3", "#702c39", "#868e96", "#6610f2"];

const generateCompareData = (data) => {
  const results = Session.get("styloresult");
  const feature1 = data[0];
  const feature2 = data[1];
  let sData = [];
  for (let i = 0; i < results.length; i++) {
    let col = {};
    col.label = results[i].name;
    col.backgroundColor = hexToRGB(scatterColors[i], 0.85);
    col.data = [
      {
        x: results[i][feature1],
        y: results[i][feature2],
        r: 10
      }
    ];
    col.hoverBackgroundColor = "#007bff";
    sData.push(col);
  }
  return sData;
};

const generateScatterChart = (element, data) => {
  let mychart = document.getElementById("scatterChart").getContext("2d");

  const bbdata = {
    datasets: data
  };
  import("chart.js").then(({default: Chart}) => {
    new Chart(mychart, {
      type: "bubble",
      data: bbdata,
      options: {
        maintainAspectRatio: false,
        scales: {
          xAxes: [
            {
              display: true,
              scaleLabel: {
                labelString: Session.get("compareLabels")[1],
                display: true
              },

              ticks: {
                beginAtZero: true
              }
            }
          ],
          yAxes: [
            {
              display: true,
              scaleLabel: {
                labelString: Session.get("compareLabels")[0],
                display: true
              },
              ticks: {
                beginAtZero: true,
                steps: 0.1,
                stepValue: 0.05
              }
            }
          ]
        }
      }
    });
  });
};

Template.sresults.events({
  "click #graphs"(event) {
    event.preventDefault();
    const controller = Iron.controller();
    controller.render("stylometrygraph", {to: "stylooption"});
    $("#graphs").hide();
    $("#table").show();
  },
  "click .saveResult"(event) {
    $("#exportModal").modal("show");
  },
  "click #closeExportModal"(event) {
    document.getElementById("saveResultForm").reset();
    $("#exportModal").modal("hide");
  },
  "click #exportResult"(event, template) {
    event.preventDefault();
    const target = event.target;
    const fileName = $("#fileName").val();
    const analysisResults = Session.get("styloresult");
    const data = analysisResults.map(renameObject);
    const csvString = csv(data);
    if (window.navigator.msSaveOrOpenBlob) {
      const blob = new Blob([csvString]);
      window.navigator.msSaveOrOpenBlob(blob, fileName + ".csv");
    } else {
      let a = document.createElement("a");
      a.href = "data:attachment/csv," + encodeURIComponent(csvString);
      a.target = "_blank";
      a.download = fileName + ".csv";
      document.body.appendChild(a);
      a.click();
    }
    document.getElementById("saveResultForm").reset();
    $("#exportModal").modal("hide");
  },
  "click #table"(event) {
    event.preventDefault();
    const controller = Iron.controller();
    controller.render("stylometrytable", {to: "stylooption"});
    $("#table").hide();
    $("#graphs").show();
  },
  "click #compare"(event) {
    event.preventDefault();
    const controller = Iron.controller();
    controller.render("compareFeatures", {to: "stylooption"});
    $("#table").show();
  },
  "click .newsearch"(event, template) {
    Session.set("styloresult", null);
    $("#stable").empty();
    Router.go("/stylometry");
  }
});

Template.compareFeatures.events({
  "submit #compareFeaturesForm"(event, template) {
    event.preventDefault();
    const target = event.target;
    let selectedFeatures = [];
    let frequencyLength = allF.length;
    selectedFeatures.push(target.feature1.value);
    selectedFeatures.push(target.feature2.value);
    $("#compareSelect").hide();
    $("#compareView").show();
    let compareNames = [];
    for (let b = 0; b < frequencyLength; b++) {
      if (selectedFeatures.includes(allF[b].feature)) {
        compareNames.push(allF[b].name);
      }
    }
    Session.set("compareLabels", compareNames);
    let compareData = generateCompareData(selectedFeatures);
    generateScatterChart("#scatterChart", compareData);
  }
});

Template.compareFeatures.onRendered(function() {
  $(".select2").select2({
    minimumResultsForSearch: 2,
    width: "100%",
    placeholder: "Select Feature",
    matcher: function(term, text) {
      return text.toUpperCase().indexOf(term.toUpperCase()) == 0;
    }
  });

  $(".select2[name=feature1]").on("change", function(e) {
    const thisVal = $(this).val();
    $(".select2[name=feature2] option").each(function() {
      if (thisVal == $(this).attr("value")) {
        $(this).attr("disabled", "disabled");
      } else {
        $(this).removeAttr("disabled");
      }
    });
  });

  $(".select2[name=feature2]").on("change", function(e) {
    const thisVal = $(this).val();
    $(".select2[name=feature1] option").each(function() {
      if (thisVal == $(this).attr("value")) {
        $(this).attr("disabled", "disabled");
      } else {
        $(this).removeAttr("disabled");
      }
    });
  });
});

Template.stylometrygraph.onRendered(function() {
  $(".toplevel").fadeIn("slow");
  const featureArray = Session.get("features");
  const data = Session.get("styloresult");
  const cdata = data;
  const f1label = cdata.map(function(x) {
    return x.name;
  });
  const fl = allF.length;

  const generateData = (feature) => {
    const dydata = cdata.map(function(x) {
      return x[feature];
    });
    let bdata = [];
    for (let i = 0; i < cdata.length; i++) {
      let col = {};
      col.label = cdata[i].name;
      col.data = [dydata[i]];
      col.fill = true;
      col.borderWidth = 2;
      col.backgroundColor = "rgba(112,44,57,0.4)";
      col.borderColor = "#702c39";
      bdata.push(col);
    }
    return bdata;
  };

  let dynamicCharts = [];
  for (let b = 0; b < fl; b++) {
    let ch = {};
    if (farray.includes(allF[b].feature)) {
      ch.data = allF[b].feature;
      ch.title = allF[b].name;
      dynamicCharts.push(ch);
    }
  }

  farray.forEach(function(x) {
    generateBarChart("#" + x, f1label, generateData(x));
  });

  function generateBarChart(element, labels, data) {
    const mychart = $(element);

    const bbdata = {
      labels: labels,
      datasets: data
    };
    import("chart.js").then(({default: Chart}) => {
      new Chart(mychart, {
        type: "bar",
        data: bbdata,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [
              {
                barPercentage: 0.4,
                categoryPercentage: 1
              }
            ],
            yAxes: [
              {
                ticks: {
                  beginAtZero: true
                }
              }
            ]
          },
          legend: {
            display: false
          },
          tooltips: {
            callbacks: {
              title: function() {}
            }
          }
        }
      });
    });
  }
});

Template.stylometrytable.onRendered(function() {
  $(".toplevel").fadeIn("slow");
  const farray = Session.get("features");
  let dynamicColumns = [
    {
      data: "name",
      title: "Corpus"
    },
    {data: "words", title: "Words"},
    {data: "characters", title: "Characters"},
    {data: "type", title: "Type"}
  ];
  const fl = allF.length;
  for (let i = 0; i < fl; i++) {
    let col = {};
    if (farray.includes(allF[i].feature)) {
      col.data = allF[i].feature;
      col.title = allF[i].name;
      dynamicColumns.push(col);
    }
  }
  const data = Session.get("styloresult");
  const cdata = data;
  let container = document.getElementById("stable");
  import("../hands.js").then(({default: Handsontable}) => {
    let hot_init = new Handsontable(container, {
      data: data,
      columns: dynamicColumns,
      rowHeaders: true,
      fixedColumnsLeft: 2,
      columnSorting: {
        column: 0,
        sortOrder: "desc"
      },
      stretchH: "all"
    });
  });
});

Template.stylometrygraph.helpers({
  nocharts() {
    return htmlLabels();
  }
});

Template.compareFeatures.helpers({
  comparefeatures() {
    let col = [];
    let frequencyLength = allF.length;
    let carray = Session.get("features");
    for (let i = 0; i < frequencyLength; i++) {
      let select = {};
      if (carray.includes(allF[i].feature)) {
        select.value = allF[i].feature;
        select.name = allF[i].name;
        col.push(select);
      }
    }
    return col;
  }
});
