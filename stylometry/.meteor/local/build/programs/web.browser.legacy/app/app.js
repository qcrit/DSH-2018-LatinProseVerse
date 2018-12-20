var require = meteorInstall({"imports":{"ui":{"pages":{"sresults.html":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/pages/sresults.html                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./template.sresults.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.sresults.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/pages/template.sresults.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("sresults");
Template["sresults"] = new Template("Template.sresults", (function() {
  var view = this;
  return [ HTML.Raw('<div class="page_heading_bg">\n      <div class="container">\n          <h1 style="text-transform: none;">Stylometry</h1>\n      </div>\n  </div>\n  '), HTML.DIV({
    class: "section section_main_body",
    id: "wrapper"
  }, "\n    ", HTML.DIV({
    class: "container2"
  }, "\n        ", HTML.DIV({
    class: "row"
  }, "\n    ", HTML.DIV({
    class: "fcontainer col-lg-12 col-md-12 col-sm-12 col-xs-12"
  }, "\n      ", HTML.DIV({
    class: "panel panel-transparent sresult"
  }, "\n        ", HTML.Raw('<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 p-b-5 p-l-0 p-r-0 pull_right">\n          <button type="submit" class="btn btn-primary btn-sm newsearch"><i class="fa fa-search m-r-5"></i> New Search</button>\n          <button type="submit" class="btn btn-primary btn-sm saveResult"><i class="fa fa-file-text-o"></i> Export Results</button>\n        </div>'), "\n        ", HTML.DIV({
    class: "row"
  }, "\n          ", HTML.DIV({
    class: "col-lg-12 col-md-12 col-sm-12 col-xs-12"
  }, "\n                ", Blaze._TemplateWith(function() {
    return "stylooption";
  }, function() {
    return Spacebars.include(view.lookupTemplate("yield"));
  }), "\n          "), "\n        "), "\n      "), "\n    "), "\n  "), "\n"), "\n"), HTML.Raw('\n\n<div class="modal fade slide-up disable-scroll" id="exportModal" tabindex="-1" role="dialog" aria-labelledby="modalSlideUpLabel" aria-hidden="false">\n  <div class="modal-dialog">\n    <div class="modal-content">\n      <div class="modal-body">\n        <div class="panel panel-transparent">\n        <div class="panel-body no-padding">\n        <div id="portlet-advance" class="panel panel-default">\n        <div class="panel-heading">\n\n                      </div>\n        <div class="panel-body">\n                  <div class="row row-same-height">\n                  <div class="m-l-20 m-r-20 sm-p-l-15 sm-p-r-15 sm-p-t-40">\n        <p class="p-t-35">Choose a file name to export in csv format.</p>\n        <form id="saveResultForm" class="p-t-15" role="form">\n        <div class="form-group form-group-default">\n        <label>File Name</label>\n        <div class="controls">\n        <input type="text" id="fileName" name="email" class="form-control input-sm" required="">\n        </div>\n        </div>\n        <div class="pull-right">\n          <button class="btn btn-success btn-cons m-t-10" id="closeExportModal" type="button">Cancel</button>\n          <button class="btn btn-primary btn-cons m-t-10" id="exportResult" type="submit">Submit</button>\n        </div>\n        </form>\n                  </div>\n        </div>\n        </div>\n        <div class="panel-footer"></div>\n        </div>\n        </div>\n\n        </div>\n      </div>\n    </div>\n  </div>\n</div>') ];
}));

Template.__checkName("stylometrytable");
Template["stylometrytable"] = new Template("Template.stylometrytable", (function() {
  var view = this;
  return HTML.Raw('<div class="row toplevel" style="display:none">\n  <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 m-t-15 stable">\n    <div class="swrapper">\n      <div id="stable"></div>\n    </div>\n  </div>\n</div>');
}));

Template.__checkName("stylometrycompare");
Template["stylometrycompare"] = new Template("Template.stylometrycompare", (function() {
  var view = this;
  return HTML.Raw('<div class="fcontainer col-lg-12 col-md-12 col-sm-12 col-xs-12 p-l-0">\n    <div class="panel panel-transparent fsearch">\n      <div class="panel-body no-padding">\n        <div id="portlet-advance" class="panel panel-default panelBorder">\n          <div class="panel-heading">\n          </div>\n          <div class="panel-body">\n            <div class="row">\n              <div class="finterface col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                <div class="m-t-15">\n                  <div class="col-md-8 offset-md-4">\n                    <div class="row">\n                      <div id="comparegraph"></div>\n                    </div>\n                  </div>\n             </div>\n           </div>\n         </div>\n       </div>\n     </div>\n   </div>\n  </div>\n  </div>');
}));

Template.__checkName("stylometrygraph");
Template["stylometrygraph"] = new Template("Template.stylometrygraph", (function() {
  var view = this;
  return HTML.DIV({
    class: "row toplevel",
    style: "display:none"
  }, "\n  ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("nocharts"));
  }, function() {
    return [ "\n        ", HTML.DIV({
      class: "col-lg-6 col-sm-12 col-xs-12 col-md-12 p-l-0 p-r-0"
    }, "\n          ", HTML.DIV({
      class: "panel panel-transparent fsearch"
    }, "\n            ", HTML.DIV({
      class: "panel-body no-padding"
    }, "\n              ", HTML.DIV({
      id: "portlet-advance",
      class: "panel panel-default panelBorder"
    }, "\n                ", HTML.DIV({
      class: "panel-heading"
    }, "\n                "), "\n                ", HTML.DIV({
      class: "panel-body"
    }, "\n                  ", HTML.DIV({
      class: "row"
    }, "\n              ", HTML.H2(Blaze.View("lookup:header", function() {
      return Spacebars.mustache(view.lookup("header"));
    })), "\n            "), "\n            ", HTML.DIV({
      class: "box-divider m-0"
    }), "\n            ", HTML.DIV({
      class: "box-body"
    }, "\n              ", HTML.CANVAS({
      id: function() {
        return Spacebars.mustache(view.lookup("feature"));
      },
      height: "300"
    }), "\n            "), "\n          "), "\n        "), "\n      "), "\n     "), "\n   "), "\n  " ];
  }), "\n");
}));

Template.__checkName("compareFeatures");
Template["compareFeatures"] = new Template("Template.compareFeatures", (function() {
  var view = this;
  return [ HTML.DIV({
    class: "col-sm-6 col-xs-12 col-lg-6 col-md-6 col-md-offset-3 col-lg-offset-3 col-sm-offset-3 p-l-0 p-r-0",
    id: "compareSelect"
  }, "\n    ", HTML.DIV({
    class: "panel panel-transparent fsearch"
  }, "\n      ", HTML.DIV({
    class: "panel-body no-padding"
  }, "\n        ", HTML.DIV({
    id: "portlet-advance",
    class: "panel panel-default panelBorder"
  }, "\n          ", HTML.Raw('<div class="panel-heading">\n          </div>'), "\n          ", HTML.DIV({
    class: "panel-body"
  }, "\n            ", HTML.Raw('<div class="row">\n        <h2>Compare Features</h2><br>\n        <small>Select two features you would like to compare in a scatterplot.</small>\n      </div>'), "\n        ", HTML.FORM({
    id: "compareFeaturesForm"
  }, "\n          ", HTML.DIV({
    class: "form-group"
  }, "\n          ", HTML.DIV({
    class: "row"
  }, "\n          ", HTML.DIV({
    class: "col-lg-12 col-md-12 col-sm-12 col-xs-12"
  }, "\n          ", HTML.DIV({
    class: "form-group form-group-default form-group-default-select2"
  }, "\n            ", HTML.Raw('<label for="name">Feature 1</label>'), "\n            ", HTML.SELECT({
    name: "feature1",
    class: "full-width input-sm select2"
  }, "\n              ", HTML.Raw("<option></option>"), "\n              ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("comparefeatures"));
  }, function() {
    return [ "\n              ", HTML.OPTION({
      value: function() {
        return Spacebars.mustache(Spacebars.dot(view.lookup("."), "value"));
      }
    }, Blaze.View("lookup:..name", function() {
      return Spacebars.mustache(Spacebars.dot(view.lookup("."), "name"));
    })), "\n              " ];
  }), "\n            "), "\n          "), "\n        "), "\n      "), "\n      ", HTML.DIV({
    class: "row"
  }, "\n        ", HTML.DIV({
    class: "col-lg-12 col-md-12 col-sm-12 col-xs-12"
  }, "\n          ", HTML.DIV({
    class: "form-group form-group-default form-group-default-select2"
  }, "\n            ", HTML.Raw('<label for="corpusSubName">Feature 2</label>'), "\n            ", HTML.SELECT({
    name: "feature2",
    class: "full-width input-sm select2"
  }, "\n              ", HTML.Raw("<option></option>"), "\n              ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("comparefeatures"));
  }, function() {
    return [ "\n              ", HTML.OPTION({
      value: function() {
        return Spacebars.mustache(Spacebars.dot(view.lookup("."), "value"));
      }
    }, Blaze.View("lookup:..name", function() {
      return Spacebars.mustache(Spacebars.dot(view.lookup("."), "name"));
    })), "\n              " ];
  }), "\n            "), "\n          "), "\n        "), "\n      "), "\n      ", HTML.Raw('<div class="row">\n        <div class="pull-right">\n          <button class="btn btn-success btn-cons m-b-10 reset" type="button"><i class="fa fa-refresh"></i> Reset</button>\n          <button type="submit" class="btn btn-primary btn-cons m-b-10"><i class="fa fa-search"></i> Submit</button><br><br>\n        </div>\n      </div>'), "\n      "), "\n      "), "\n    "), "\n  "), "\n"), "\n"), "\n"), HTML.Raw('\n\n<div class="col-sm-6 col-xs-12 col-lg-6 col-md-6 col-md-offset-3 col-lg-offset-3 col-sm-offset-3 p-l-0 p-r-0" id="compareView" style="display:none">\n  <div class="panel panel-transparent">\n    <div class="panel-body no-padding">\n      <div id="portlet-advance" class="panel panel-default panelBorder">\n        <div class="panel-heading">\n        </div>\n        <div class="panel-body">\n          <div class="row">\n    <canvas id="scatterChart" height="400"></canvas>\n  </div>\n</div>\n  </div>\n</div>\n</div>\n</div>') ];
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"stylometry.html":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/pages/stylometry.html                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./template.stylometry.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.stylometry.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/pages/template.stylometry.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("stylometry");
Template["stylometry"] = new Template("Template.stylometry", (function() {
  var view = this;
  return [ HTML.Raw('<div class="page_heading_bg">\n      <div class="container">\n          <h1 style="text-transform: none;">Stylometry</h1>\n      </div>\n  </div>\n  '), HTML.DIV({
    class: "section_dark section_main_body"
  }, "\n      ", HTML.DIV({
    class: "container2"
  }, "\n          ", HTML.DIV({
    class: "row"
  }, "\n  \t\t", HTML.DIV({
    class: "fcontainer col-md-12 col-xs-12"
  }, "\n  \t\t", HTML.DIV({
    class: "panel panel-transparent ssearch"
  }, "\n  ", HTML.DIV({
    class: "panel-body no-padding"
  }, "\n  ", HTML.DIV({
    id: "portlet-advance",
    class: "panel panel-default"
  }, "\n  ", HTML.Raw('<div class="panel-heading">\n\n  \t\t\t\t\t\t\t</div>'), "\n  ", HTML.DIV({
    class: "panel-body"
  }, "\n                    ", HTML.DIV({
    class: "row"
  }, "\n                      ", HTML.DIV({
    class: "finterface col-lg-12 col-md-12 col-sm-12 col-xs-12"
  }, "\n                        ", HTML.DIV({
    class: "m-t-15"
  }, "\n                          ", HTML.FORM({
    id: "fsearch"
  }, "\n                            ", HTML.DIV({
    class: "col-lg-6 col-md-6 col-xs-12 col-sm-12 b-r b-dashed b-grey"
  }, "\n  \t\t\t\t\t\t              ", HTML.DIV({
    class: "form-group"
  }, "\n                            ", HTML.Raw('<h3 class="text-primary">Text Selection</h3>'), HTML.Raw("<hr>"), "\n                            ", HTML.Raw("<p>Select an author/text pair or a more specific work with author/text/book from the dropdown menus.  Once you have made a selection, click add.  You can select one work or many.</p>"), "\n                            ", HTML.DIV({
    class: "form-group m-t-20"
  }, "\n  \t\t\t\t\t\t\t              ", HTML.DIV({
    class: "row clearfix"
  }, "\n                                ", HTML.DIV({
    class: "col-lg-12 col-xs-12"
  }, "\n                                  ", HTML.DIV({
    class: "form-group fauthor form-group-default form-group-default-select2"
  }, "\n                                    ", HTML.Raw("<label>Author</label>"), "\n                                    ", HTML.SELECT({
    id: "fauthor",
    name: "fauthor",
    class: "full-width input-sm fauthor select2"
  }, "\n                    \t\t\t\t\t\t\t\t\t", HTML.Raw("<option></option>"), "\n                    \t\t\t\t\t\t\t\t\t", Blaze.Each(function() {
    return Spacebars.call(view.lookup("authors"));
  }, function() {
    return [ "\n                    \t\t\t\t\t\t\t\t\t  ", HTML.OPTION({
      value: function() {
        return Spacebars.mustache(view.lookup("."));
      }
    }, Blaze.View("lookup:.", function() {
      return Spacebars.mustache(view.lookup("."));
    })), "\n                    \t\t\t\t\t\t\t\t\t" ];
  }), "\n                  \t\t\t\t\t\t\t\t\t"), "\n                                  "), "\n                                "), "\n                              "), "\n                              ", HTML.DIV({
    class: "row clearfix"
  }, "\n                                ", HTML.DIV({
    class: "col-md-12 col-xs-12"
  }, "\n                                  ", HTML.DIV({
    class: "ftext form-group form-group-default form-group-default-select2 disabled"
  }, "\n                                    ", HTML.Raw("<label>Text</label>"), "\n                                    ", HTML.SELECT({
    id: "ftext",
    name: "ftext",
    class: "ftext full-width input-sm select2",
    disabled: ""
  }, "\n                  \t\t\t\t\t\t\t\t\t   ", HTML.Raw("<option></option>"), "\n                  \t\t\t\t\t\t\t\t\t   ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("texts"));
  }, function() {
    return [ "\n                  \t\t\t\t\t\t\t\t\t   ", HTML.OPTION({
      value: function() {
        return Spacebars.mustache(view.lookup("."));
      }
    }, Blaze.View("lookup:.", function() {
      return Spacebars.mustache(view.lookup("."));
    })), "\n                  \t\t\t\t\t\t\t\t\t   " ];
  }), "\n                  \t\t\t\t\t\t\t\t  "), "\n                                  "), "\n                                "), "\n  \t\t\t\t\t\t\t              "), "\n                              ", HTML.DIV({
    class: "row clearfix"
  }, "\n                                ", HTML.DIV({
    class: "col-lg-12 col-md-12 col-sm-12 col-xs-12"
  }, "\n                                  ", HTML.DIV({
    class: "fbook form-group form-group-default form-group-default-select2 disabled"
  }, "\n                                    ", HTML.Raw("<label>Book</label>"), "\n                                    ", HTML.SELECT({
    id: "fbook",
    name: "fbook",
    class: "fbook full-width input-sm select2",
    disabled: ""
  }, "\n                  \t\t\t\t\t\t\t\t\t   ", HTML.Raw("<option></option>"), "\n                  \t\t\t\t\t\t\t\t\t   ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("books"));
  }, function() {
    return [ "\n                  \t\t\t\t\t\t\t\t\t   ", HTML.OPTION({
      value: function() {
        return Spacebars.mustache(view.lookup("."));
      }
    }, Blaze.View("lookup:removepart", function() {
      return Spacebars.mustache(view.lookup("removepart"), view.lookup("."));
    })), "\n                  \t\t\t\t\t\t\t\t\t   " ];
  }), "\n                  \t\t\t\t\t\t\t\t  "), "\n                                  "), "\n                                "), "\n  \t\t\t\t\t\t\t              "), "\n                ", HTML.Raw('<div class="row clearfix">\n                <div class="col-lg-6 col-md-6 col-sm-6 col-xs-6">\n                <span class="corpus">\n                  <div class="checkbox">\n    \t\t\t\t\t\t\t\t<input type="checkbox" id="selectAll">\n    \t\t\t\t\t\t\t\t<label for="selectAll">Select All</label>\n  \t\t\t\t\t\t\t\t</div>\n                </span>\n              </div>\n                <div class="col-lg-6 col-md-6 col-sm-6 col-xs-6">\n                <span class="pull-right addmore"><i class="fa fa-plus"></i> Add</span>\n              </div>\n            </div>'), "\n  \t\t\t\t\t\t\t"), "\n  \t\t\t\t\t\t\t"), "\n              "), "\n              ", HTML.DIV({
    class: "col-lg-6 col-md-6 col-sm-6 col-xs-6"
  }, "\n                ", HTML.Raw('<h3 class="text-primary">Selected Texts</h3>'), HTML.Raw("<hr>"), "\n                ", HTML.Raw("<p>This table shows the works selected from the text selection menu.  If you would like to remove a selection, just click the remove button.</p>"), "\n                ", HTML.DIV({
    class: "table-responsive m-t-20"
  }, "\n                    ", HTML.TABLE({
    class: "table-responsive table table-striped",
    id: "stylocorpus"
  }, "\n                        ", HTML.THEAD("\n                            ", HTML.TR("\n                                ", HTML.TH({
    class: "col-md-3 col-lg-3 col-sm-3"
  }, "Author"), "\n                                ", HTML.TH({
    class: "col-md-3 col-lg-3 col-sm-3"
  }, "Text"), "\n                                ", HTML.TH({
    class: "col-md-3 col-lg-3 col-sm-3"
  }, "Book"), "\n                                ", HTML.TH({
    class: "text-center"
  }, "Action"), "\n                            "), "\n                        "), "\n                        ", HTML.TBODY({
    id: "stylorows"
  }, "\n\n                        "), "\n                    "), "\n                "), "\n\n                ", HTML.Raw('<ul id="dynamic-list" class="p-l-0"></ul>'), "\n              "), "\n                ", HTML.Raw('<div class="row clearfix hidden-xs">\n\n              </div>'), "\n              ", HTML.Raw('<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                <h3 class="text-primary">Feature Selection</h3><hr>\n                <p>Select the stylometric features you would like computed below.  You have the option of selecting multiple features per category.</p>\n              </div>'), "\n              ", HTML.Raw('<div class="col-lg-6">\n              <h5 class="m-t-20">Pronouns</h5><hr>\n              <div class="row clearfix">\n                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                  <div class="pronouns form-group form-group-default form-group-default-select2">\n                    <label>Select</label>\n                    <select id="pronouns" multiple="multiple" name="pronouns" class="pronouns full-width input-sm select2">\n                      <option value="p1">Personal Pronouns</option>\n                      <option value="p2">Demonstrative Pronouns</option>\n                      <option value="p3"><i>Quidam</i></option>\n                      <option value="p4">Third-Person Pronouns</option>\n                      <option value="p5"><i>Iste</i></option>\n                    </select>\n                  </div>\n                </div>\n              </div>\n\n              <h5 class="m-t-20">Non-Content Adjectives</h5><hr>\n              <div class="row clearfix">\n                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                  <div class="adjectives form-group form-group-default form-group-default-select2">\n                    <label>Select</label>\n                    <select id="adjectives" multiple="multiple" name="adjectives" class="adjectives full-width input-sm select2">\n                      <option value="n1">Alius</option>\n                      <option value="n2">Ipse</option>\n                      <option value="n3">Idem</option>\n                    </select>\n                  </div>\n                </div>\n              </div>\n\n              <h5 class="m-t-20">Conjunctions</h5><hr>\n              <div class="row clearfix">\n                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                  <div class="conjunctions form-group form-group-default form-group-default-select2">\n                    <label>Select</label>\n                    <select id="conjunctions" multiple="multiple" name="conjunctions" class="conjunctions full-width input-sm select2">\n                      <option value="c1">Aggregate Frequency of Conjunctions</option>\n                      <option value="c2">Frequency of <i>Atque</i> followed by Consonant</option>\n                    </select>\n                  </div>\n                </div>\n              </div>\n              </div>'), "\n\n              ", HTML.Raw('<div class="col-lg-6">\n                <h5 class="m-t-20">Subordinate Clauses</h5><hr>\n                <div class="row clearfix">\n                  <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                    <div class="subordinate form-group form-group-default form-group-default-select2">\n                      <label>Select</label>\n                      <select id="subordinate" multiple="multiple" name="subordinate" class="subordinate full-width input-sm select2">\n                        <option value="s1">Conditional Clauses</option>\n                        <option value="s2"><i>Cum</i> Clauses</option>\n                        <option value="s3"><i>Quin</i> Clauses</option>\n                        <option value="s4"><i>Quominus</i> Clauses</option>\n                        <option value="s5"><i>Antequam</i> Clauses</option>\n                        <option value="s6"><i>Priusquam</i> Clauses</option>\n                        <option value="s7"><i>Dum</i> Clauses</option>\n                        <option value="s8">Fraction of Sentences (Relative Clauses)</option>\n                        <option value="s9">Mean (Relative Clauses)</option>\n                      </select>\n                    </div>\n                  </div>\n                </div>\n\n                <h5 class="m-t-20">Miscellaneous</h5><hr>\n                <div class="row clearfix">\n                  <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                    <div class="miscellaneous form-group form-group-default form-group-default-select2">\n                      <label>Select</label>\n                      <select id="miscellaneous" multiple="multiple" name="miscellaneous" class="miscellaneous full-width input-sm select2">\n                        <option value="m1">Interrogative Sentences</option>\n                        <option value="m2">Selected Vocatives</option>\n                        <option value="m3">Regular Superlative Adjectives &amp; Adverbs</option>\n                        <option value="m4">ut Clauses</option>\n                        <option value="m5">Selected Gerunds &amp; Gerundives</option>\n                        <option value="m6">Mean (Sentence Length)</option>\n                        <option value="m7">Aggregate Frequency of Prepositions</option>\n                        <option value="m8">Top 5 N-Grams</option>\n                      </select>\n                    </div>\n                  </div>\n                </div>\n              </div>'), "\n              ", HTML.Raw('<div class="row clearfix">\n                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                  <button type="submit" class="btn btn-primary btn-cons m-l-5 m-b-10 m-r-15 pull-right"><i class="fa fa-search"></i> Submit</button>\n                  <button class="btn btn-success btn-cons m-b-10 reset pull-right" type="button"><i class="fa fa-refresh"></i> Reset</button>\n                </div>\n  \t\t\t\t\t\t</div>'), "\n\n                          "), "\n\n                      "), "\n                    ")), "\n  "), "\n  ", HTML.Raw('<div class="panel-footer">\n\n  \t\t\t\t\t\t\t</div>'), "\n\n  \t\t"), "\n  \t\t"), "\n  \t"), "\n\n    ", HTML.Raw('<div class="panel panel-transparent sloading" style="display:none">\n  \t\t<div class="panel-body no-padding">\n  \t\t\t<div id="portlet-advance" class="panel panel-default">\n  \t\t\t\t<div class="panel-heading">\n\n  \t\t\t\t</div>\n  \t\t\t\t<div class="panel-body p-b-0 p-l-0 p-r-0">\n  \t\t\t\t\t<div class="no-result loader-height">\n  \t\t\t\t\t<center><h2>Analyzing Text</h2></center>\n  \t\t\t\t\t<div class="loader-wrapper p-t-50">\n  \t\t\t\t\t\t<div class="loader-container">\n  \t\t\t\t\t\t\t<div class="line-scale-pulse-out loader-deep-orange">\n  \t\t\t\t\t\t\t\t<div></div>\n  \t\t\t\t\t\t\t\t<div></div>\n  \t\t\t\t\t\t\t\t<div></div>\n  \t\t\t\t\t\t\t\t<div></div>\n  \t\t\t\t\t\t\t\t<div></div>\n  \t\t\t\t\t\t\t</div>\n  \t\t\t\t\t\t</div>\n  \t\t\t\t\t</div>\n  \t\t\t\t\t</div>\n  \t\t\t\t</div>\n  \t\t\t\t<div class="panel-footer">\n\n  \t\t\t\t</div>\n\n  \t\t</div>\n  \t\t</div>\n  \t</div>'), "\n\n\n"), "\n"), "\n"), "\n"), HTML.Raw('\n\n<div class="modal fade slide-up disable-scroll" id="modal-compare" tabindex="-1" role="dialog" aria-labelledby="modalSlideUpLabel" aria-hidden="false">\n  <div class="modal-dialog modal-lg">\n    <div class="modal-content">\n      <div class="modal-body">\n        <div class="container2">\n          <div class="row">\n            <div class="fcontainer col-lg-12 col-md-12 col-sm-12 col-xs-12">\n              <p>Select two features you would like to compare in a scatterplot.</p>\n              <form id="comparef">\n              <div class="form-group m-t-20">\n                <div class="row clearfix">\n                  <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                    <div class="form-group form-group-default form-group-default-select2">\n                      <label>Feature 1</label>\n                      <select id="feature1" name="feature1" class="full-width input-sm feature1 select2">\n                        <option>Select Feature</option>\n                        <option value="p1">Frequency of Personal Pronouns</option>\n                        <option value="p2">Frequency of Demonstrative Pronouns</option>\n                        <option value="p3"><i>Frequency of Quidam</i></option>\n                        <option value="p4">Frequency of Third-Person Pronouns</option>\n                        <option value="p5"><i>Frequency of Iste</i></option>\n                        <option value="n1">Frequency of Alius</option>\n                        <option value="n2">Frequency of Ipse</option>\n                        <option value="n3">Frequency of Idem</option>\n                        <option value="c1">Aggregate Frequency of Conjunctions</option>\n                        <option value="c2">Frequency of <i>Atque</i> followed by Consonant</option>\n                        <option value="s1">Frequency of Conditional Clauses</option>\n                        <option value="s2">Frequency of <i>Cum</i> Clauses</option>\n                        <option value="s3">Frequency of <i>Quin</i> Clauses</option>\n                        <option value="s4">Frequency of <i>Quominus</i> Clauses</option>\n                        <option value="s5">Frequency of <i>Antequam</i> Clauses</option>\n                        <option value="s6">Frequency of <i>Priusquam</i> Clauses</option>\n                        <option value="s7">Frequency of <i>Dum</i> Clauses</option>\n                        <option value="s8">Fraction of Sentences (Relative Clauses)</option>\n                        <option value="s9">Mean (Relative Clauses)</option>\n                        <option value="m1">Frequency of Interrogative Sentences</option>\n                        <option value="m2">Frequency of Selected Vocatives</option>\n                        <option value="m3">Frequency of Regular Superlative Adjectives &amp; Adverbs</option>\n                        <option value="m4">Frequency of ut Clauses</option>\n                        <option value="m5">Frequency of Selected Gerunds &amp; Gerundives</option>\n                        <option value="m6">Mean (Sentence Length)</option>\n                        <option value="m7">Aggregate Frequency of Prepositions</option>\n                      </select>\n                    </div>\n                  </div>\n                </div>\n                <div class="row clearfix">\n                  <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                    <div class="ftext form-group form-group-default form-group-default-select2">\n                      <label>Feature 2</label>\n                      <select id="feature2" name="feature2" class="feature2 full-width input-sm select2">\n                        <option>Select Feature</option>\n                        <option value="p1">Frequency of Personal Pronouns</option>\n                        <option value="p2">Frequency of Demonstrative Pronouns</option>\n                        <option value="p3"><i>Frequency of Quidam</i></option>\n                        <option value="p4">Frequency of Third-Person Pronouns</option>\n                        <option value="p5"><i>Frequency of Iste</i></option>\n                        <option value="n1">Frequency of Alius</option>\n                        <option value="n2">Frequency of Ipse</option>\n                        <option value="n3">Frequency of Idem</option>\n                        <option value="c1">Aggregate Frequency of Conjunctions</option>\n                        <option value="c2">Frequency of <i>Atque</i> followed by Consonant</option>\n                        <option value="s1">Frequency of Conditional Clauses</option>\n                        <option value="s2">Frequency of <i>Cum</i> Clauses</option>\n                        <option value="s3">Frequency of <i>Quin</i> Clauses</option>\n                        <option value="s4">Frequency of <i>Quominus</i> Clauses</option>\n                        <option value="s5">Frequency of <i>Antequam</i> Clauses</option>\n                        <option value="s6">Frequency of <i>Priusquam</i> Clauses</option>\n                        <option value="s7">Frequency of <i>Dum</i> Clauses</option>\n                        <option value="s8">Fraction of Sentences (Relative Clauses)</option>\n                        <option value="s9">Mean (Relative Clauses)</option>\n                        <option value="m1">Frequency of Interrogative Sentences</option>\n                        <option value="m2">Frequency of Selected Vocatives</option>\n                        <option value="m3">Frequency of Regular Superlative Adjectives &amp; Adverbs</option>\n                        <option value="m4">Frequency of ut Clauses</option>\n                        <option value="m5">Frequency of Selected Gerunds &amp; Gerundives</option>\n                        <option value="m6">Mean (Sentence Length)</option>\n                        <option value="m7">Aggregate Frequency of Prepositions</option>\n                      </select>\n                    </div>\n                  </div>\n                </div>\n                <div class="row clearfix">\n                  <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">\n                    <button type="submit" class="btn btn-primary btn-cons m-l-5 m-b-10 m-r-15 pull-right"><i class="fa fa-search"></i> Submit</button>\n                    <button class="btn btn-success btn-cons m-b-10 reset pull-right" type="button"><i class="fa fa-refresh"></i> Reset</button>\n                  </div>\n    \t\t\t\t\t\t</div>\n           </div>\n         </form>\n         </div>\n       </div>\n     </div>\n   </div>\n </div>\n</div>\n</div>') ];
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"helpers.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/pages/helpers.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  naturalSort: function () {
    return naturalSort;
  }
});

var naturalSort = function (a, b) {
  var re = /(^([+\-]?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?(?=\D|\s|$))|^0x[\da-fA-F]+$|\d+)/g,
      sre = /^\s+|\s+$/g,
      // trim pre-post whitespace
  snre = /\s+/g,
      // normalize all whitespace to single ' ' character
  dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
      hre = /^0x[0-9a-f]+$/i,
      ore = /^0/,
      i = function (s) {
    return (naturalSort.insensitive && ('' + s).toLowerCase() || '' + s).replace(sre, '');
  },
      // convert all to strings strip whitespace
  x = i(a),
      y = i(b),
      // chunk/tokenize
  xN = x.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0'),
      yN = y.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0'),
      // numeric, hex or date detection
  xD = parseInt(x.match(hre), 16) || xN.length !== 1 && Date.parse(x),
      yD = parseInt(y.match(hre), 16) || xD && y.match(dre) && Date.parse(y) || null,
      normChunk = function (s, l) {
    // normalize spaces; find floats not starting with '0', string or 0 if not defined (Clint Priest)
    return (!s.match(ore) || l == 1) && parseFloat(s) || s.replace(snre, ' ').replace(sre, '') || 0;
  },
      oFxNcL,
      oFyNcL; // first try and sort Hex codes or Dates


  if (yD) {
    if (xD < yD) {
      return -1;
    } else if (xD > yD) {
      return 1;
    }
  } // natural sorting through split numeric strings and default strings


  for (var cLoc = 0, xNl = xN.length, yNl = yN.length, numS = Math.max(xNl, yNl); cLoc < numS; cLoc++) {
    oFxNcL = normChunk(xN[cLoc] || '', xNl);
    oFyNcL = normChunk(yN[cLoc] || '', yNl); // handle numeric vs string comparison - number < string - (Kyle Adams)

    if (isNaN(oFxNcL) !== isNaN(oFyNcL)) {
      return isNaN(oFxNcL) ? 1 : -1;
    } // if unicode use locale comparison


    if (/[^\x00-\x80]/.test(oFxNcL + oFyNcL) && oFxNcL.localeCompare) {
      var comp = oFxNcL.localeCompare(oFyNcL);
      return comp / Math.abs(comp);
    }

    if (oFxNcL < oFyNcL) {
      return -1;
    } else if (oFxNcL > oFyNcL) {
      return 1;
    }
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sresults.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/pages/sresults.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

module.watch(require("./sresults.html"));
var csv;
module.watch(require("to-csv"), {
  "default": function (v) {
    csv = v;
  }
}, 0);
var allF = [{
  name: "Personal Pronouns",
  feature: "p1"
}, {
  name: "Demonstrative Pronouns",
  feature: "p2"
}, {
  name: "Quidam",
  feature: "p3"
}, {
  name: "Reflexive Pronouns",
  feature: "p4"
}, {
  name: "Iste",
  feature: "p5"
}, {
  name: "Alius",
  feature: "n1"
}, {
  name: "Ipse",
  feature: "n2"
}, {
  name: "Idem",
  feature: "n3"
}, {
  name: "Priusquam",
  feature: "s6"
}, {
  name: "Antequam",
  feature: "s5"
}, {
  name: "Quominus",
  feature: "s4"
}, {
  name: "Dum",
  feature: "s7"
}, {
  name: "Quin",
  feature: "s3"
}, {
  name: "Ut",
  feature: "m4"
}, {
  name: "Conditionals",
  feature: "s1"
}, {
  name: "Prepositions",
  feature: "m7"
}, {
  name: "Conjunctions",
  feature: "c1"
}, {
  name: "Atque + consonant",
  feature: "c2"
}, {
  name: "Cum",
  feature: "s2"
}, {
  name: "Relative Clauses",
  feature: "s8"
}, {
  name: "Mean Length Relative Clauses",
  feature: "s9"
}, {
  name: "Interrogative Sentences",
  feature: "m1"
}, {
  name: "Vocatives",
  feature: "m2"
}, {
  name: "Superlatives",
  feature: "m3"
}, {
  name: "Gerunds and Gerundives",
  feature: "m5"
}, {
  name: "Mean Sentence Length",
  feature: "m6"
}];
var nameObject = {
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

var renameObject = function (o) {
  return Object.assign.apply(Object, (0, _toConsumableArray2.default)(Object.keys(o).map(function (k) {
    var _ref;

    return _ref = {}, _ref[nameObject[k] || k] = o[k], _ref;
  })));
};

var hexToRGB = function (hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  } else {
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }
};

var htmlLabels = function () {
  var dy = [];
  var featureLength = allF.length;
  var featureArray = Session.get("features");

  for (var i = 0; i < fl; i++) {
    var _col = {};

    if (farray.includes(allF[i].feature)) {
      _col.header = allF[i].name;
      _col.description = allF[i].name;
      _col.feature = allF[i].feature;
      dy.push(_col);
    }
  }

  return dy;
};

var scatterColors = ["#702c39", "#b7c1c3", "#702c39", "#868e96", "#6610f2"];

var generateCompareData = function (data) {
  var results = Session.get("styloresult");
  var feature1 = data[0];
  var feature2 = data[1];
  var sData = [];

  for (var i = 0; i < results.length; i++) {
    var _col2 = {};
    _col2.label = results[i].name;
    _col2.backgroundColor = hexToRGB(scatterColors[i], 0.85);
    _col2.data = [{
      x: results[i][feature1],
      y: results[i][feature2],
      r: 10
    }];
    _col2.hoverBackgroundColor = "#007bff";
    sData.push(_col2);
  }

  return sData;
};

var generateScatterChart = function (element, data) {
  var mychart = document.getElementById("scatterChart").getContext("2d");
  var bbdata = {
    datasets: data
  };
  module.dynamicImport("chart.js").then(function (_ref2) {
    var Chart = _ref2.default;
    new Chart(mychart, {
      type: "bubble",
      data: bbdata,
      options: {
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            display: true,
            scaleLabel: {
              labelString: Session.get("compareLabels")[1],
              display: true
            },
            ticks: {
              beginAtZero: true
            }
          }],
          yAxes: [{
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
          }]
        }
      }
    });
  });
};

Template.sresults.events({
  "click #graphs": function (event) {
    event.preventDefault();
    var controller = Iron.controller();
    controller.render("stylometrygraph", {
      to: "stylooption"
    });
    $("#graphs").hide();
    $("#table").show();
  },
  "click .saveResult": function (event) {
    $("#exportModal").modal("show");
  },
  "click #closeExportModal": function (event) {
    document.getElementById("saveResultForm").reset();
    $("#exportModal").modal("hide");
  },
  "click #exportResult": function (event, template) {
    event.preventDefault();
    var target = event.target;
    var fileName = $("#fileName").val();
    var analysisResults = Session.get("styloresult");
    var data = analysisResults.map(renameObject);
    var csvString = csv(data);

    if (window.navigator.msSaveOrOpenBlob) {
      var blob = new Blob([csvString]);
      window.navigator.msSaveOrOpenBlob(blob, fileName + ".csv");
    } else {
      var a = document.createElement("a");
      a.href = "data:attachment/csv," + encodeURIComponent(csvString);
      a.target = "_blank";
      a.download = fileName + ".csv";
      document.body.appendChild(a);
      a.click();
    }

    document.getElementById("saveResultForm").reset();
    $("#exportModal").modal("hide");
  },
  "click #table": function (event) {
    event.preventDefault();
    var controller = Iron.controller();
    controller.render("stylometrytable", {
      to: "stylooption"
    });
    $("#table").hide();
    $("#graphs").show();
  },
  "click #compare": function (event) {
    event.preventDefault();
    var controller = Iron.controller();
    controller.render("compareFeatures", {
      to: "stylooption"
    });
    $("#table").show();
  },
  "click .newsearch": function (event, template) {
    Session.set("styloresult", null);
    $("#stable").empty();
    Router.go("/stylometry");
  }
});
Template.compareFeatures.events({
  "submit #compareFeaturesForm": function (event, template) {
    event.preventDefault();
    var target = event.target;
    var selectedFeatures = [];
    var frequencyLength = allF.length;
    selectedFeatures.push(target.feature1.value);
    selectedFeatures.push(target.feature2.value);
    $("#compareSelect").hide();
    $("#compareView").show();
    var compareNames = [];

    for (var b = 0; b < frequencyLength; b++) {
      if (selectedFeatures.includes(allF[b].feature)) {
        compareNames.push(allF[b].name);
      }
    }

    Session.set("compareLabels", compareNames);
    var compareData = generateCompareData(selectedFeatures);
    generateScatterChart("#scatterChart", compareData);
  }
});
Template.compareFeatures.onRendered(function () {
  $(".select2").select2({
    minimumResultsForSearch: 2,
    width: "100%",
    placeholder: "Select Feature",
    matcher: function (term, text) {
      return text.toUpperCase().indexOf(term.toUpperCase()) == 0;
    }
  });
  $(".select2[name=feature1]").on("change", function (e) {
    var thisVal = $(this).val();
    $(".select2[name=feature2] option").each(function () {
      if (thisVal == $(this).attr("value")) {
        $(this).attr("disabled", "disabled");
      } else {
        $(this).removeAttr("disabled");
      }
    });
  });
  $(".select2[name=feature2]").on("change", function (e) {
    var thisVal = $(this).val();
    $(".select2[name=feature1] option").each(function () {
      if (thisVal == $(this).attr("value")) {
        $(this).attr("disabled", "disabled");
      } else {
        $(this).removeAttr("disabled");
      }
    });
  });
});
Template.stylometrygraph.onRendered(function () {
  $(".toplevel").fadeIn("slow");
  var featureArray = Session.get("features");
  var data = Session.get("styloresult");
  var cdata = data;
  var f1label = cdata.map(function (x) {
    return x.name;
  });
  var fl = allF.length;

  var generateData = function (feature) {
    var dydata = cdata.map(function (x) {
      return x[feature];
    });
    var bdata = [];

    for (var i = 0; i < cdata.length; i++) {
      var _col3 = {};
      _col3.label = cdata[i].name;
      _col3.data = [dydata[i]];
      _col3.fill = true;
      _col3.borderWidth = 2;
      _col3.backgroundColor = "rgba(112,44,57,0.4)";
      _col3.borderColor = "#702c39";
      bdata.push(_col3);
    }

    return bdata;
  };

  var dynamicCharts = [];

  for (var b = 0; b < fl; b++) {
    var ch = {};

    if (farray.includes(allF[b].feature)) {
      ch.data = allF[b].feature;
      ch.title = allF[b].name;
      dynamicCharts.push(ch);
    }
  }

  farray.forEach(function (x) {
    generateBarChart("#" + x, f1label, generateData(x));
  });

  function generateBarChart(element, labels, data) {
    var mychart = $(element);
    var bbdata = {
      labels: labels,
      datasets: data
    };
    module.dynamicImport("chart.js").then(function (_ref3) {
      var Chart = _ref3.default;
      new Chart(mychart, {
        type: "bar",
        data: bbdata,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [{
              barPercentage: 0.4,
              categoryPercentage: 1
            }],
            yAxes: [{
              ticks: {
                beginAtZero: true
              }
            }]
          },
          legend: {
            display: false
          },
          tooltips: {
            callbacks: {
              title: function () {}
            }
          }
        }
      });
    });
  }
});
Template.stylometrytable.onRendered(function () {
  $(".toplevel").fadeIn("slow");
  var farray = Session.get("features");
  var dynamicColumns = [{
    data: "name",
    title: "Corpus"
  }, {
    data: "words",
    title: "Words"
  }, {
    data: "characters",
    title: "Characters"
  }, {
    data: "type",
    title: "Type"
  }];
  var fl = allF.length;

  for (var i = 0; i < fl; i++) {
    var _col4 = {};

    if (farray.includes(allF[i].feature)) {
      _col4.data = allF[i].feature;
      _col4.title = allF[i].name;
      dynamicColumns.push(_col4);
    }
  }

  var data = Session.get("styloresult");
  var cdata = data;
  var container = document.getElementById("stable");
  module.dynamicImport("../hands.js").then(function (_ref4) {
    var Handsontable = _ref4.default;
    var hot_init = new Handsontable(container, {
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
  nocharts: function () {
    return htmlLabels();
  }
});
Template.compareFeatures.helpers({
  comparefeatures: function () {
    var col = [];
    var frequencyLength = allF.length;
    var carray = Session.get("features");

    for (var i = 0; i < frequencyLength; i++) {
      var select = {};

      if (carray.includes(allF[i].feature)) {
        select.value = allF[i].feature;
        select.name = allF[i].name;
        col.push(select);
      }
    }

    return col;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"stylometry.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/pages/stylometry.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./stylometry.html"));
var naturalSort;
module.watch(require("./helpers.js"), {
  naturalSort: function (v) {
    naturalSort = v;
  }
}, 0);
module.watch(require("../select2.min.js"));
var addclass = "stylo_sel";
var count = 0;
var aarray = [];
var tarray = [];
var barray = [];
var featureArray = [];
var selectAll = false;
var tempArray = ["p1", "p2", "p3", "p4", "p5", "n1", "n2", "n3", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "c1", "c2"];
Template.stylometry.events({
  "click .stylo_sec": function (e) {
    var id = e.currentTarget.id;
    $("#" + id).toggleClass("stylo_sel");
  },
  "change #selectAll": function (event) {
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
  "click #graphs": function (event) {
    event.preventDefault();
    var controller = Iron.controller();
    controller.render("stylometrygraph", {
      to: "stylooption"
    });
    $("#graphs").hide();
    $("#table").show();
  },
  "click #table": function (event) {
    event.preventDefault();
    var controller = Iron.controller();
    controller.render("stylometrytable", {
      to: "stylooption"
    });
    $("#table").hide();
    $("#graphs").show();
  },
  "click .newsearch": function (event, template) {
    Session.set("styloresult", null);
    $("#stable").empty();
    $(".sresult").hide();
    $(".ssearch").show();
  },
  "click .addmore": function (event, template) {
    var ul = document.getElementById("dynamic-list");
    var candidate = document.getElementById("fauthor");
    var candidate2 = document.getElementById("ftext");
    var candidate3 = document.getElementById("fbook");
    count += 1;
    tarray.push(candidate2.value);
    aarray.push(candidate.value);
    barray.push(candidate3.value);
    $("#stylocorpus").append('<tr class="list"><td data-name=' + candidate.value + ">" + candidate.value + "</td><td data-name=" + candidate2.value + ">" + candidate2.value + "</td><td data-name=" + candidate3.value + ">" + candidate3.value + '</td><td class="text-center"><button type="button" class="btn btn-info remove" id="delete"><i class="fa fa-trash"></i> Remove</button></td></tr>');
    $("#fauthor").select2("data", null);
    $("#fbook").select2("data", null);
    $("#ftext").select2("data", null);
    $(".ftext").addClass("disabled");
    $("#ftext").prop("disabled", true);
    $(".fbook").addClass("disabled");
    $("#fbook").prop("disabled", true);
  },
  "submit #fsearch": function (event, template) {
    event.preventDefault();
    var target = event.target;
    var author = $("#fauthor :selected").val();
    var book = $("#fbook :selected").val();
    var text = $("#ftext :selected").val();
    var farrays = tempArray;
    farrays.push($("#pronouns").val());
    farrays.push($("#adjectives").val());
    farrays.push($("#conjunctions").val());
    farrays.push($("#subordinate").val());
    farrays.push($("#miscellaneous").val());
    var farray = [].concat.apply([], farrays);
    Session.set("features", farray);
    var data = {
      author: aarray,
      text: tarray,
      book: barray
    };
    var features = {
      feature: farray,
      selectAll: selectAll
    };
    $(".ssearch").hide();
    $(".sloading").show();
    Meteor.call("stylometryf", data, features, function (error, result) {
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
  "click .remove": function (event, template) {
    event.preventDefault();
    var target = event.target;
    var rname = $(target).data("name");
    var sname = $(target).data("sub");
    var a = narray.indexOf(rname);
    var t = narray.indexOf(sname);
    $(target).closest("tr").remove(this.id);
    aarray.splice(a, 1);
    tarray.splice(t, 1);
    barray.splice(b, 1);
    count -= 1;
  }
});
Template.stylometry.onRendered(function () {
  $(".select2").select2({
    minimumResultsForSearch: 2,
    width: "100%",
    matcher: function (term, text) {
      return text.toUpperCase().indexOf(term.toUpperCase()) == 0;
    }
  });
  aarray = [];
  tarray = [];
  barray = [];
  $("#arows").on("click", ".delete", function () {
    $(this).closest("tr").remove();
  });
  $("#fauthor").on("change", function (e) {
    var target = e.target;
    var author = $("#fauthor :selected").val();
    Meteor.call("texts", author, function (error, result) {
      Session.set("texts", result);
      $("#ftext").prop("disabled", false);
      $(".ftext").removeClass("disabled");
    });
  });
  $("#ftext").on("change", function (e) {
    var target = e.target;
    var author = $("#fauthor :selected").val();
    var text = $("#ftext :selected").val();
    Meteor.call("books", author, text, function (error, result) {
      sort = result.sort(naturalSort);
      Session.set("books", sort);
      $("#fbook").prop("disabled", false);
      $(".fbook").removeClass("disabled");
    });
  });
});
Template.stylometry.helpers({
  authors: function () {
    return Session.get("authors");
  },
  texts: function () {
    return Session.get("texts");
  },
  books: function () {
    return Session.get("books");
  },
  removepart: function (a1) {
    if (a1) return a1.replace("Part ", "");
  },
  sigfig: function (a1) {
    if (a1) return a1.toFixed(3);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"layouts":{"main.html":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/layouts/main.html                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./template.main.js"), {
  "*": module.makeNsSetter(true)
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.main.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/layouts/template.main.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("mainlayout");
Template["mainlayout"] = new Template("Template.mainlayout", (function() {
  var view = this;
  return [ Spacebars.include(view.lookupTemplate("yield")), "\n", HTML.STYLE("\n        header {\n            margin-bottom: 0 !important;\n        }\n\n        .selected {\n            border: 1px solid #888;\n            background-color: #0ff;\n        }\n    ") ];
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"main.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/layouts/main.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./main.html"));
Meteor.startup(function () {
  Meteor.call("authors", function (error, result) {
    Session.set("authors", result);
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"2.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/2.js                                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

/*!
 * Bootstrap v3.3.7 (http://getbootstrap.com)
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under the MIT license
 */
if (typeof jQuery === 'undefined') {
  throw new Error('Bootstrap\'s JavaScript requires jQuery');
}

+function ($) {
  'use strict';

  var version = $.fn.jquery.split(' ')[0].split('.');

  if (version[0] < 2 && version[1] < 9 || version[0] == 1 && version[1] == 9 && version[2] < 1 || version[0] > 3) {
    throw new Error('Bootstrap\'s JavaScript requires jQuery version 1.9.1 or higher, but lower than version 4');
  }
}(jQuery);
/* ========================================================================
 * Bootstrap: transition.js v3.3.7
 * http://getbootstrap.com/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
  // ============================================================

  function transitionEnd() {
    var el = document.createElement('bootstrap');
    var transEndEventNames = {
      WebkitTransition: 'webkitTransitionEnd',
      MozTransition: 'transitionend',
      OTransition: 'oTransitionEnd otransitionend',
      transition: 'transitionend'
    };

    for (var name in meteorBabelHelpers.sanitizeForInObject(transEndEventNames)) {
      if (el.style[name] !== undefined) {
        return {
          end: transEndEventNames[name]
        };
      }
    }

    return false; // explicit for ie8 (  ._.)
  } // http://blog.alexmaccaw.com/css-transitions


  $.fn.emulateTransitionEnd = function (duration) {
    var called = false;
    var $el = this;
    $(this).one('bsTransitionEnd', function () {
      called = true;
    });

    var callback = function () {
      if (!called) $($el).trigger($.support.transition.end);
    };

    setTimeout(callback, duration);
    return this;
  };

  $(function () {
    $.support.transition = transitionEnd();
    if (!$.support.transition) return;
    $.event.special.bsTransitionEnd = {
      bindType: $.support.transition.end,
      delegateType: $.support.transition.end,
      handle: function (e) {
        if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments);
      }
    };
  });
}(jQuery);
/* ========================================================================
 * Bootstrap: alert.js v3.3.7
 * http://getbootstrap.com/javascript/#alerts
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // ALERT CLASS DEFINITION
  // ======================

  var dismiss = '[data-dismiss="alert"]';

  var Alert = function (el) {
    $(el).on('click', dismiss, this.close);
  };

  Alert.VERSION = '3.3.7';
  Alert.TRANSITION_DURATION = 150;

  Alert.prototype.close = function (e) {
    var $this = $(this);
    var selector = $this.attr('data-target');

    if (!selector) {
      selector = $this.attr('href');
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, ''); // strip for ie7
    }

    var $parent = $(selector === '#' ? [] : selector);
    if (e) e.preventDefault();

    if (!$parent.length) {
      $parent = $this.closest('.alert');
    }

    $parent.trigger(e = $.Event('close.bs.alert'));
    if (e.isDefaultPrevented()) return;
    $parent.removeClass('in');

    function removeElement() {
      // detach from parent, fire event then clean up data
      $parent.detach().trigger('closed.bs.alert').remove();
    }

    $.support.transition && $parent.hasClass('fade') ? $parent.one('bsTransitionEnd', removeElement).emulateTransitionEnd(Alert.TRANSITION_DURATION) : removeElement();
  }; // ALERT PLUGIN DEFINITION
  // =======================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.alert');
      if (!data) $this.data('bs.alert', data = new Alert(this));
      if (typeof option == 'string') data[option].call($this);
    });
  }

  var old = $.fn.alert;
  $.fn.alert = Plugin;
  $.fn.alert.Constructor = Alert; // ALERT NO CONFLICT
  // =================

  $.fn.alert.noConflict = function () {
    $.fn.alert = old;
    return this;
  }; // ALERT DATA-API
  // ==============


  $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close);
}(jQuery);
/* ========================================================================
 * Bootstrap: button.js v3.3.7
 * http://getbootstrap.com/javascript/#buttons
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // BUTTON PUBLIC CLASS DEFINITION
  // ==============================

  var Button = function (element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Button.DEFAULTS, options);
    this.isLoading = false;
  };

  Button.VERSION = '3.3.7';
  Button.DEFAULTS = {
    loadingText: 'loading...'
  };

  Button.prototype.setState = function (state) {
    var d = 'disabled';
    var $el = this.$element;
    var val = $el.is('input') ? 'val' : 'html';
    var data = $el.data();
    state += 'Text';
    if (data.resetText == null) $el.data('resetText', $el[val]()); // push to event loop to allow forms to submit

    setTimeout($.proxy(function () {
      $el[val](data[state] == null ? this.options[state] : data[state]);

      if (state == 'loadingText') {
        this.isLoading = true;
        $el.addClass(d).attr(d, d).prop(d, true);
      } else if (this.isLoading) {
        this.isLoading = false;
        $el.removeClass(d).removeAttr(d).prop(d, false);
      }
    }, this), 0);
  };

  Button.prototype.toggle = function () {
    var changed = true;
    var $parent = this.$element.closest('[data-toggle="buttons"]');

    if ($parent.length) {
      var $input = this.$element.find('input');

      if ($input.prop('type') == 'radio') {
        if ($input.prop('checked')) changed = false;
        $parent.find('.active').removeClass('active');
        this.$element.addClass('active');
      } else if ($input.prop('type') == 'checkbox') {
        if ($input.prop('checked') !== this.$element.hasClass('active')) changed = false;
        this.$element.toggleClass('active');
      }

      $input.prop('checked', this.$element.hasClass('active'));
      if (changed) $input.trigger('change');
    } else {
      this.$element.attr('aria-pressed', !this.$element.hasClass('active'));
      this.$element.toggleClass('active');
    }
  }; // BUTTON PLUGIN DEFINITION
  // ========================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.button');
      var options = (0, _typeof2.default)(option) == 'object' && option;
      if (!data) $this.data('bs.button', data = new Button(this, options));
      if (option == 'toggle') data.toggle();else if (option) data.setState(option);
    });
  }

  var old = $.fn.button;
  $.fn.button = Plugin;
  $.fn.button.Constructor = Button; // BUTTON NO CONFLICT
  // ==================

  $.fn.button.noConflict = function () {
    $.fn.button = old;
    return this;
  }; // BUTTON DATA-API
  // ===============


  $(document).on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
    var $btn = $(e.target).closest('.btn');
    Plugin.call($btn, 'toggle');

    if (!$(e.target).is('input[type="radio"], input[type="checkbox"]')) {
      // Prevent double click on radios, and the double selections (so cancellation) on checkboxes
      e.preventDefault(); // The target component still receive the focus

      if ($btn.is('input,button')) $btn.trigger('focus');else $btn.find('input:visible,button:visible').first().trigger('focus');
    }
  }).on('focus.bs.button.data-api blur.bs.button.data-api', '[data-toggle^="button"]', function (e) {
    $(e.target).closest('.btn').toggleClass('focus', /^focus(in)?$/.test(e.type));
  });
}(jQuery);
/* ========================================================================
 * Bootstrap: carousel.js v3.3.7
 * http://getbootstrap.com/javascript/#carousel
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // CAROUSEL CLASS DEFINITION
  // =========================

  var Carousel = function (element, options) {
    this.$element = $(element);
    this.$indicators = this.$element.find('.carousel-indicators');
    this.options = options;
    this.paused = null;
    this.sliding = null;
    this.interval = null;
    this.$active = null;
    this.$items = null;
    this.options.keyboard && this.$element.on('keydown.bs.carousel', $.proxy(this.keydown, this));
    this.options.pause == 'hover' && !('ontouchstart' in document.documentElement) && this.$element.on('mouseenter.bs.carousel', $.proxy(this.pause, this)).on('mouseleave.bs.carousel', $.proxy(this.cycle, this));
  };

  Carousel.VERSION = '3.3.7';
  Carousel.TRANSITION_DURATION = 600;
  Carousel.DEFAULTS = {
    interval: 5000,
    pause: 'hover',
    wrap: true,
    keyboard: true
  };

  Carousel.prototype.keydown = function (e) {
    if (/input|textarea/i.test(e.target.tagName)) return;

    switch (e.which) {
      case 37:
        this.prev();
        break;

      case 39:
        this.next();
        break;

      default:
        return;
    }

    e.preventDefault();
  };

  Carousel.prototype.cycle = function (e) {
    e || (this.paused = false);
    this.interval && clearInterval(this.interval);
    this.options.interval && !this.paused && (this.interval = setInterval($.proxy(this.next, this), this.options.interval));
    return this;
  };

  Carousel.prototype.getItemIndex = function (item) {
    this.$items = item.parent().children('.item');
    return this.$items.index(item || this.$active);
  };

  Carousel.prototype.getItemForDirection = function (direction, active) {
    var activeIndex = this.getItemIndex(active);
    var willWrap = direction == 'prev' && activeIndex === 0 || direction == 'next' && activeIndex == this.$items.length - 1;
    if (willWrap && !this.options.wrap) return active;
    var delta = direction == 'prev' ? -1 : 1;
    var itemIndex = (activeIndex + delta) % this.$items.length;
    return this.$items.eq(itemIndex);
  };

  Carousel.prototype.to = function (pos) {
    var that = this;
    var activeIndex = this.getItemIndex(this.$active = this.$element.find('.item.active'));
    if (pos > this.$items.length - 1 || pos < 0) return;
    if (this.sliding) return this.$element.one('slid.bs.carousel', function () {
      that.to(pos);
    }); // yes, "slid"

    if (activeIndex == pos) return this.pause().cycle();
    return this.slide(pos > activeIndex ? 'next' : 'prev', this.$items.eq(pos));
  };

  Carousel.prototype.pause = function (e) {
    e || (this.paused = true);

    if (this.$element.find('.next, .prev').length && $.support.transition) {
      this.$element.trigger($.support.transition.end);
      this.cycle(true);
    }

    this.interval = clearInterval(this.interval);
    return this;
  };

  Carousel.prototype.next = function () {
    if (this.sliding) return;
    return this.slide('next');
  };

  Carousel.prototype.prev = function () {
    if (this.sliding) return;
    return this.slide('prev');
  };

  Carousel.prototype.slide = function (type, next) {
    var $active = this.$element.find('.item.active');
    var $next = next || this.getItemForDirection(type, $active);
    var isCycling = this.interval;
    var direction = type == 'next' ? 'left' : 'right';
    var that = this;
    if ($next.hasClass('active')) return this.sliding = false;
    var relatedTarget = $next[0];
    var slideEvent = $.Event('slide.bs.carousel', {
      relatedTarget: relatedTarget,
      direction: direction
    });
    this.$element.trigger(slideEvent);
    if (slideEvent.isDefaultPrevented()) return;
    this.sliding = true;
    isCycling && this.pause();

    if (this.$indicators.length) {
      this.$indicators.find('.active').removeClass('active');
      var $nextIndicator = $(this.$indicators.children()[this.getItemIndex($next)]);
      $nextIndicator && $nextIndicator.addClass('active');
    }

    var slidEvent = $.Event('slid.bs.carousel', {
      relatedTarget: relatedTarget,
      direction: direction
    }); // yes, "slid"

    if ($.support.transition && this.$element.hasClass('slide')) {
      $next.addClass(type);
      $next[0].offsetWidth; // force reflow

      $active.addClass(direction);
      $next.addClass(direction);
      $active.one('bsTransitionEnd', function () {
        $next.removeClass([type, direction].join(' ')).addClass('active');
        $active.removeClass(['active', direction].join(' '));
        that.sliding = false;
        setTimeout(function () {
          that.$element.trigger(slidEvent);
        }, 0);
      }).emulateTransitionEnd(Carousel.TRANSITION_DURATION);
    } else {
      $active.removeClass('active');
      $next.addClass('active');
      this.sliding = false;
      this.$element.trigger(slidEvent);
    }

    isCycling && this.cycle();
    return this;
  }; // CAROUSEL PLUGIN DEFINITION
  // ==========================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.carousel');
      var options = $.extend({}, Carousel.DEFAULTS, $this.data(), (0, _typeof2.default)(option) == 'object' && option);
      var action = typeof option == 'string' ? option : options.slide;
      if (!data) $this.data('bs.carousel', data = new Carousel(this, options));
      if (typeof option == 'number') data.to(option);else if (action) data[action]();else if (options.interval) data.pause().cycle();
    });
  }

  var old = $.fn.carousel;
  $.fn.carousel = Plugin;
  $.fn.carousel.Constructor = Carousel; // CAROUSEL NO CONFLICT
  // ====================

  $.fn.carousel.noConflict = function () {
    $.fn.carousel = old;
    return this;
  }; // CAROUSEL DATA-API
  // =================


  var clickHandler = function (e) {
    var href;
    var $this = $(this);
    var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')); // strip for ie7

    if (!$target.hasClass('carousel')) return;
    var options = $.extend({}, $target.data(), $this.data());
    var slideIndex = $this.attr('data-slide-to');
    if (slideIndex) options.interval = false;
    Plugin.call($target, options);

    if (slideIndex) {
      $target.data('bs.carousel').to(slideIndex);
    }

    e.preventDefault();
  };

  $(document).on('click.bs.carousel.data-api', '[data-slide]', clickHandler).on('click.bs.carousel.data-api', '[data-slide-to]', clickHandler);
  $(window).on('load', function () {
    $('[data-ride="carousel"]').each(function () {
      var $carousel = $(this);
      Plugin.call($carousel, $carousel.data());
    });
  });
}(jQuery);
/* ========================================================================
 * Bootstrap: collapse.js v3.3.7
 * http://getbootstrap.com/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

/* jshint latedef: false */

+function ($) {
  'use strict'; // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================

  var Collapse = function (element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Collapse.DEFAULTS, options);
    this.$trigger = $('[data-toggle="collapse"][href="#' + element.id + '"],' + '[data-toggle="collapse"][data-target="#' + element.id + '"]');
    this.transitioning = null;

    if (this.options.parent) {
      this.$parent = this.getParent();
    } else {
      this.addAriaAndCollapsedClass(this.$element, this.$trigger);
    }

    if (this.options.toggle) this.toggle();
  };

  Collapse.VERSION = '3.3.7';
  Collapse.TRANSITION_DURATION = 350;
  Collapse.DEFAULTS = {
    toggle: true
  };

  Collapse.prototype.dimension = function () {
    var hasWidth = this.$element.hasClass('width');
    return hasWidth ? 'width' : 'height';
  };

  Collapse.prototype.show = function () {
    if (this.transitioning || this.$element.hasClass('in')) return;
    var activesData;
    var actives = this.$parent && this.$parent.children('.panel').children('.in, .collapsing');

    if (actives && actives.length) {
      activesData = actives.data('bs.collapse');
      if (activesData && activesData.transitioning) return;
    }

    var startEvent = $.Event('show.bs.collapse');
    this.$element.trigger(startEvent);
    if (startEvent.isDefaultPrevented()) return;

    if (actives && actives.length) {
      Plugin.call(actives, 'hide');
      activesData || actives.data('bs.collapse', null);
    }

    var dimension = this.dimension();
    this.$element.removeClass('collapse').addClass('collapsing')[dimension](0).attr('aria-expanded', true);
    this.$trigger.removeClass('collapsed').attr('aria-expanded', true);
    this.transitioning = 1;

    var complete = function () {
      this.$element.removeClass('collapsing').addClass('collapse in')[dimension]('');
      this.transitioning = 0;
      this.$element.trigger('shown.bs.collapse');
    };

    if (!$.support.transition) return complete.call(this);
    var scrollSize = $.camelCase(['scroll', dimension].join('-'));
    this.$element.one('bsTransitionEnd', $.proxy(complete, this)).emulateTransitionEnd(Collapse.TRANSITION_DURATION)[dimension](this.$element[0][scrollSize]);
  };

  Collapse.prototype.hide = function () {
    if (this.transitioning || !this.$element.hasClass('in')) return;
    var startEvent = $.Event('hide.bs.collapse');
    this.$element.trigger(startEvent);
    if (startEvent.isDefaultPrevented()) return;
    var dimension = this.dimension();
    this.$element[dimension](this.$element[dimension]())[0].offsetHeight;
    this.$element.addClass('collapsing').removeClass('collapse in').attr('aria-expanded', false);
    this.$trigger.addClass('collapsed').attr('aria-expanded', false);
    this.transitioning = 1;

    var complete = function () {
      this.transitioning = 0;
      this.$element.removeClass('collapsing').addClass('collapse').trigger('hidden.bs.collapse');
    };

    if (!$.support.transition) return complete.call(this);
    this.$element[dimension](0).one('bsTransitionEnd', $.proxy(complete, this)).emulateTransitionEnd(Collapse.TRANSITION_DURATION);
  };

  Collapse.prototype.toggle = function () {
    this[this.$element.hasClass('in') ? 'hide' : 'show']();
  };

  Collapse.prototype.getParent = function () {
    return $(this.options.parent).find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]').each($.proxy(function (i, element) {
      var $element = $(element);
      this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element);
    }, this)).end();
  };

  Collapse.prototype.addAriaAndCollapsedClass = function ($element, $trigger) {
    var isOpen = $element.hasClass('in');
    $element.attr('aria-expanded', isOpen);
    $trigger.toggleClass('collapsed', !isOpen).attr('aria-expanded', isOpen);
  };

  function getTargetFromTrigger($trigger) {
    var href;
    var target = $trigger.attr('data-target') || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, ''); // strip for ie7

    return $(target);
  } // COLLAPSE PLUGIN DEFINITION
  // ==========================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.collapse');
      var options = $.extend({}, Collapse.DEFAULTS, $this.data(), (0, _typeof2.default)(option) == 'object' && option);
      if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false;
      if (!data) $this.data('bs.collapse', data = new Collapse(this, options));
      if (typeof option == 'string') data[option]();
    });
  }

  var old = $.fn.collapse;
  $.fn.collapse = Plugin;
  $.fn.collapse.Constructor = Collapse; // COLLAPSE NO CONFLICT
  // ====================

  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old;
    return this;
  }; // COLLAPSE DATA-API
  // =================


  $(document).on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
    var $this = $(this);
    if (!$this.attr('data-target')) e.preventDefault();
    var $target = getTargetFromTrigger($this);
    var data = $target.data('bs.collapse');
    var option = data ? 'toggle' : $this.data();
    Plugin.call($target, option);
  });
}(jQuery);
/* ========================================================================
 * Bootstrap: dropdown.js v3.3.7
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // DROPDOWN CLASS DEFINITION
  // =========================

  var backdrop = '.dropdown-backdrop';
  var toggle = '[data-toggle="dropdown"]';

  var Dropdown = function (element) {
    $(element).on('click.bs.dropdown', this.toggle);
  };

  Dropdown.VERSION = '3.3.7';

  function getParent($this) {
    var selector = $this.attr('data-target');

    if (!selector) {
      selector = $this.attr('href');
      selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, ''); // strip for ie7
    }

    var $parent = selector && $(selector);
    return $parent && $parent.length ? $parent : $this.parent();
  }

  function clearMenus(e) {
    if (e && e.which === 3) return;
    $(backdrop).remove();
    $(toggle).each(function () {
      var $this = $(this);
      var $parent = getParent($this);
      var relatedTarget = {
        relatedTarget: this
      };
      if (!$parent.hasClass('open')) return;
      if (e && e.type == 'click' && /input|textarea/i.test(e.target.tagName) && $.contains($parent[0], e.target)) return;
      $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget));
      if (e.isDefaultPrevented()) return;
      $this.attr('aria-expanded', 'false');
      $parent.removeClass('open').trigger($.Event('hidden.bs.dropdown', relatedTarget));
    });
  }

  Dropdown.prototype.toggle = function (e) {
    var $this = $(this);
    if ($this.is('.disabled, :disabled')) return;
    var $parent = getParent($this);
    var isActive = $parent.hasClass('open');
    clearMenus();

    if (!isActive) {
      if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
        // if mobile we use a backdrop because click events don't delegate
        $(document.createElement('div')).addClass('dropdown-backdrop').insertAfter($(this)).on('click', clearMenus);
      }

      var relatedTarget = {
        relatedTarget: this
      };
      $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget));
      if (e.isDefaultPrevented()) return;
      $this.trigger('focus').attr('aria-expanded', 'true');
      $parent.toggleClass('open').trigger($.Event('shown.bs.dropdown', relatedTarget));
    }

    return false;
  };

  Dropdown.prototype.keydown = function (e) {
    if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return;
    var $this = $(this);
    e.preventDefault();
    e.stopPropagation();
    if ($this.is('.disabled, :disabled')) return;
    var $parent = getParent($this);
    var isActive = $parent.hasClass('open');

    if (!isActive && e.which != 27 || isActive && e.which == 27) {
      if (e.which == 27) $parent.find(toggle).trigger('focus');
      return $this.trigger('click');
    }

    var desc = ' li:not(.disabled):visible a';
    var $items = $parent.find('.dropdown-menu' + desc);
    if (!$items.length) return;
    var index = $items.index(e.target);
    if (e.which == 38 && index > 0) index--; // up

    if (e.which == 40 && index < $items.length - 1) index++; // down

    if (!~index) index = 0;
    $items.eq(index).trigger('focus');
  }; // DROPDOWN PLUGIN DEFINITION
  // ==========================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.dropdown');
      if (!data) $this.data('bs.dropdown', data = new Dropdown(this));
      if (typeof option == 'string') data[option].call($this);
    });
  }

  var old = $.fn.dropdown;
  $.fn.dropdown = Plugin;
  $.fn.dropdown.Constructor = Dropdown; // DROPDOWN NO CONFLICT
  // ====================

  $.fn.dropdown.noConflict = function () {
    $.fn.dropdown = old;
    return this;
  }; // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================


  $(document).on('click.bs.dropdown.data-api', clearMenus).on('click.bs.dropdown.data-api', '.dropdown form', function (e) {
    e.stopPropagation();
  }).on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle).on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown).on('keydown.bs.dropdown.data-api', '.dropdown-menu', Dropdown.prototype.keydown);
}(jQuery);
/* ========================================================================
 * Bootstrap: modal.js v3.3.7
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options = options;
    this.$body = $(document.body);
    this.$element = $(element);
    this.$dialog = this.$element.find('.modal-dialog');
    this.$backdrop = null;
    this.isShown = null;
    this.originalBodyPad = null;
    this.scrollbarWidth = 0;
    this.ignoreBackdropClick = false;

    if (this.options.remote) {
      this.$element.find('.modal-content').load(this.options.remote, $.proxy(function () {
        this.$element.trigger('loaded.bs.modal');
      }, this));
    }
  };

  Modal.VERSION = '3.3.7';
  Modal.TRANSITION_DURATION = 300;
  Modal.BACKDROP_TRANSITION_DURATION = 150;
  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  };

  Modal.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget);
  };

  Modal.prototype.show = function (_relatedTarget) {
    var that = this;
    var e = $.Event('show.bs.modal', {
      relatedTarget: _relatedTarget
    });
    this.$element.trigger(e);
    if (this.isShown || e.isDefaultPrevented()) return;
    this.isShown = true;
    this.checkScrollbar();
    this.setScrollbar();
    this.$body.addClass('modal-open');
    this.escape();
    this.resize();
    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this));
    this.$dialog.on('mousedown.dismiss.bs.modal', function () {
      that.$element.one('mouseup.dismiss.bs.modal', function (e) {
        if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true;
      });
    });
    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade');

      if (!that.$element.parent().length) {
        that.$element.appendTo(that.$body); // don't move modals dom position
      }

      that.$element.show().scrollTop(0);
      that.adjustDialog();

      if (transition) {
        that.$element[0].offsetWidth; // force reflow
      }

      that.$element.addClass('in');
      that.enforceFocus();
      var e = $.Event('shown.bs.modal', {
        relatedTarget: _relatedTarget
      });
      transition ? that.$dialog // wait for modal to slide in
      .one('bsTransitionEnd', function () {
        that.$element.trigger('focus').trigger(e);
      }).emulateTransitionEnd(Modal.TRANSITION_DURATION) : that.$element.trigger('focus').trigger(e);
    });
  };

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault();
    e = $.Event('hide.bs.modal');
    this.$element.trigger(e);
    if (!this.isShown || e.isDefaultPrevented()) return;
    this.isShown = false;
    this.escape();
    this.resize();
    $(document).off('focusin.bs.modal');
    this.$element.removeClass('in').off('click.dismiss.bs.modal').off('mouseup.dismiss.bs.modal');
    this.$dialog.off('mousedown.dismiss.bs.modal');
    $.support.transition && this.$element.hasClass('fade') ? this.$element.one('bsTransitionEnd', $.proxy(this.hideModal, this)).emulateTransitionEnd(Modal.TRANSITION_DURATION) : this.hideModal();
  };

  Modal.prototype.enforceFocus = function () {
    $(document).off('focusin.bs.modal') // guard against infinite focus loop
    .on('focusin.bs.modal', $.proxy(function (e) {
      if (document !== e.target && this.$element[0] !== e.target && !this.$element.has(e.target).length) {
        this.$element.trigger('focus');
      }
    }, this));
  };

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide();
      }, this));
    } else if (!this.isShown) {
      this.$element.off('keydown.dismiss.bs.modal');
    }
  };

  Modal.prototype.resize = function () {
    if (this.isShown) {
      $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this));
    } else {
      $(window).off('resize.bs.modal');
    }
  };

  Modal.prototype.hideModal = function () {
    var that = this;
    this.$element.hide();
    this.backdrop(function () {
      that.$body.removeClass('modal-open');
      that.resetAdjustments();
      that.resetScrollbar();
      that.$element.trigger('hidden.bs.modal');
    });
  };

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove();
    this.$backdrop = null;
  };

  Modal.prototype.backdrop = function (callback) {
    var that = this;
    var animate = this.$element.hasClass('fade') ? 'fade' : '';

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate;
      this.$backdrop = $(document.createElement('div')).addClass('modal-backdrop ' + animate).appendTo(this.$body);
      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (this.ignoreBackdropClick) {
          this.ignoreBackdropClick = false;
          return;
        }

        if (e.target !== e.currentTarget) return;
        this.options.backdrop == 'static' ? this.$element[0].focus() : this.hide();
      }, this));
      if (doAnimate) this.$backdrop[0].offsetWidth; // force reflow

      this.$backdrop.addClass('in');
      if (!callback) return;
      doAnimate ? this.$backdrop.one('bsTransitionEnd', callback).emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) : callback();
    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in');

      var callbackRemove = function () {
        that.removeBackdrop();
        callback && callback();
      };

      $.support.transition && this.$element.hasClass('fade') ? this.$backdrop.one('bsTransitionEnd', callbackRemove).emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) : callbackRemove();
    } else if (callback) {
      callback();
    }
  }; // these following methods are used to handle overflowing modals


  Modal.prototype.handleUpdate = function () {
    this.adjustDialog();
  };

  Modal.prototype.adjustDialog = function () {
    var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight;
    this.$element.css({
      paddingLeft: !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
      paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
    });
  };

  Modal.prototype.resetAdjustments = function () {
    this.$element.css({
      paddingLeft: '',
      paddingRight: ''
    });
  };

  Modal.prototype.checkScrollbar = function () {
    var fullWindowWidth = window.innerWidth;

    if (!fullWindowWidth) {
      // workaround for missing window.innerWidth in IE8
      var documentElementRect = document.documentElement.getBoundingClientRect();
      fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left);
    }

    this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth;
    this.scrollbarWidth = this.measureScrollbar();
  };

  Modal.prototype.setScrollbar = function () {
    var bodyPad = parseInt(this.$body.css('padding-right') || 0, 10);
    this.originalBodyPad = document.body.style.paddingRight || '';
    if (this.bodyIsOverflowing) this.$body.css('padding-right', bodyPad + this.scrollbarWidth);
  };

  Modal.prototype.resetScrollbar = function () {
    this.$body.css('padding-right', this.originalBodyPad);
  };

  Modal.prototype.measureScrollbar = function () {
    // thx walsh
    var scrollDiv = document.createElement('div');
    scrollDiv.className = 'modal-scrollbar-measure';
    this.$body.append(scrollDiv);
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    this.$body[0].removeChild(scrollDiv);
    return scrollbarWidth;
  }; // MODAL PLUGIN DEFINITION
  // =======================


  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.modal');
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), (0, _typeof2.default)(option) == 'object' && option);
      if (!data) $this.data('bs.modal', data = new Modal(this, options));
      if (typeof option == 'string') data[option](_relatedTarget);else if (options.show) data.show(_relatedTarget);
    });
  }

  var old = $.fn.modal;
  $.fn.modal = Plugin;
  $.fn.modal.Constructor = Modal; // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old;
    return this;
  }; // MODAL DATA-API
  // ==============


  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this = $(this);
    var href = $this.attr('href');
    var $target = $($this.attr('data-target') || href && href.replace(/.*(?=#[^\s]+$)/, '')); // strip for ie7

    var option = $target.data('bs.modal') ? 'toggle' : $.extend({
      remote: !/#/.test(href) && href
    }, $target.data(), $this.data());
    if ($this.is('a')) e.preventDefault();
    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) return; // only register focus restorer if modal will actually get shown

      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus');
      });
    });
    Plugin.call($target, option, this);
  });
}(jQuery);
/* ========================================================================
 * Bootstrap: tooltip.js v3.3.7
 * http://getbootstrap.com/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================

  var Tooltip = function (element, options) {
    this.type = null;
    this.options = null;
    this.enabled = null;
    this.timeout = null;
    this.hoverState = null;
    this.$element = null;
    this.inState = null;
    this.init('tooltip', element, options);
  };

  Tooltip.VERSION = '3.3.7';
  Tooltip.TRANSITION_DURATION = 150;
  Tooltip.DEFAULTS = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false,
    viewport: {
      selector: 'body',
      padding: 0
    }
  };

  Tooltip.prototype.init = function (type, element, options) {
    this.enabled = true;
    this.type = type;
    this.$element = $(element);
    this.options = this.getOptions(options);
    this.$viewport = this.options.viewport && $($.isFunction(this.options.viewport) ? this.options.viewport.call(this, this.$element) : this.options.viewport.selector || this.options.viewport);
    this.inState = {
      click: false,
      hover: false,
      focus: false
    };

    if (this.$element[0] instanceof document.constructor && !this.options.selector) {
      throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!');
    }

    var triggers = this.options.trigger.split(' ');

    for (var i = triggers.length; i--;) {
      var trigger = triggers[i];

      if (trigger == 'click') {
        this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this));
      } else if (trigger != 'manual') {
        var eventIn = trigger == 'hover' ? 'mouseenter' : 'focusin';
        var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout';
        this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this));
        this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this));
      }
    }

    this.options.selector ? this._options = $.extend({}, this.options, {
      trigger: 'manual',
      selector: ''
    }) : this.fixTitle();
  };

  Tooltip.prototype.getDefaults = function () {
    return Tooltip.DEFAULTS;
  };

  Tooltip.prototype.getOptions = function (options) {
    options = $.extend({}, this.getDefaults(), this.$element.data(), options);

    if (options.delay && typeof options.delay == 'number') {
      options.delay = {
        show: options.delay,
        hide: options.delay
      };
    }

    return options;
  };

  Tooltip.prototype.getDelegateOptions = function () {
    var options = {};
    var defaults = this.getDefaults();
    this._options && $.each(this._options, function (key, value) {
      if (defaults[key] != value) options[key] = value;
    });
    return options;
  };

  Tooltip.prototype.enter = function (obj) {
    var self = obj instanceof this.constructor ? obj : $(obj.currentTarget).data('bs.' + this.type);

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions());
      $(obj.currentTarget).data('bs.' + this.type, self);
    }

    if (obj instanceof $.Event) {
      self.inState[obj.type == 'focusin' ? 'focus' : 'hover'] = true;
    }

    if (self.tip().hasClass('in') || self.hoverState == 'in') {
      self.hoverState = 'in';
      return;
    }

    clearTimeout(self.timeout);
    self.hoverState = 'in';
    if (!self.options.delay || !self.options.delay.show) return self.show();
    self.timeout = setTimeout(function () {
      if (self.hoverState == 'in') self.show();
    }, self.options.delay.show);
  };

  Tooltip.prototype.isInStateTrue = function () {
    for (var key in meteorBabelHelpers.sanitizeForInObject(this.inState)) {
      if (this.inState[key]) return true;
    }

    return false;
  };

  Tooltip.prototype.leave = function (obj) {
    var self = obj instanceof this.constructor ? obj : $(obj.currentTarget).data('bs.' + this.type);

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions());
      $(obj.currentTarget).data('bs.' + this.type, self);
    }

    if (obj instanceof $.Event) {
      self.inState[obj.type == 'focusout' ? 'focus' : 'hover'] = false;
    }

    if (self.isInStateTrue()) return;
    clearTimeout(self.timeout);
    self.hoverState = 'out';
    if (!self.options.delay || !self.options.delay.hide) return self.hide();
    self.timeout = setTimeout(function () {
      if (self.hoverState == 'out') self.hide();
    }, self.options.delay.hide);
  };

  Tooltip.prototype.show = function () {
    var e = $.Event('show.bs.' + this.type);

    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e);
      var inDom = $.contains(this.$element[0].ownerDocument.documentElement, this.$element[0]);
      if (e.isDefaultPrevented() || !inDom) return;
      var that = this;
      var $tip = this.tip();
      var tipId = this.getUID(this.type);
      this.setContent();
      $tip.attr('id', tipId);
      this.$element.attr('aria-describedby', tipId);
      if (this.options.animation) $tip.addClass('fade');
      var placement = typeof this.options.placement == 'function' ? this.options.placement.call(this, $tip[0], this.$element[0]) : this.options.placement;
      var autoToken = /\s?auto?\s?/i;
      var autoPlace = autoToken.test(placement);
      if (autoPlace) placement = placement.replace(autoToken, '') || 'top';
      $tip.detach().css({
        top: 0,
        left: 0,
        display: 'block'
      }).addClass(placement).data('bs.' + this.type, this);
      this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element);
      this.$element.trigger('inserted.bs.' + this.type);
      var pos = this.getPosition();
      var actualWidth = $tip[0].offsetWidth;
      var actualHeight = $tip[0].offsetHeight;

      if (autoPlace) {
        var orgPlacement = placement;
        var viewportDim = this.getPosition(this.$viewport);
        placement = placement == 'bottom' && pos.bottom + actualHeight > viewportDim.bottom ? 'top' : placement == 'top' && pos.top - actualHeight < viewportDim.top ? 'bottom' : placement == 'right' && pos.right + actualWidth > viewportDim.width ? 'left' : placement == 'left' && pos.left - actualWidth < viewportDim.left ? 'right' : placement;
        $tip.removeClass(orgPlacement).addClass(placement);
      }

      var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight);
      this.applyPlacement(calculatedOffset, placement);

      var complete = function () {
        var prevHoverState = that.hoverState;
        that.$element.trigger('shown.bs.' + that.type);
        that.hoverState = null;
        if (prevHoverState == 'out') that.leave(that);
      };

      $.support.transition && this.$tip.hasClass('fade') ? $tip.one('bsTransitionEnd', complete).emulateTransitionEnd(Tooltip.TRANSITION_DURATION) : complete();
    }
  };

  Tooltip.prototype.applyPlacement = function (offset, placement) {
    var $tip = this.tip();
    var width = $tip[0].offsetWidth;
    var height = $tip[0].offsetHeight; // manually read margins because getBoundingClientRect includes difference

    var marginTop = parseInt($tip.css('margin-top'), 10);
    var marginLeft = parseInt($tip.css('margin-left'), 10); // we must check for NaN for ie 8/9

    if (isNaN(marginTop)) marginTop = 0;
    if (isNaN(marginLeft)) marginLeft = 0;
    offset.top += marginTop;
    offset.left += marginLeft; // $.fn.offset doesn't round pixel values
    // so we use setOffset directly with our own function B-0

    $.offset.setOffset($tip[0], $.extend({
      using: function (props) {
        $tip.css({
          top: Math.round(props.top),
          left: Math.round(props.left)
        });
      }
    }, offset), 0);
    $tip.addClass('in'); // check to see if placing tip in new offset caused the tip to resize itself

    var actualWidth = $tip[0].offsetWidth;
    var actualHeight = $tip[0].offsetHeight;

    if (placement == 'top' && actualHeight != height) {
      offset.top = offset.top + height - actualHeight;
    }

    var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight);
    if (delta.left) offset.left += delta.left;else offset.top += delta.top;
    var isVertical = /top|bottom/.test(placement);
    var arrowDelta = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight;
    var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight';
    $tip.offset(offset);
    this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical);
  };

  Tooltip.prototype.replaceArrow = function (delta, dimension, isVertical) {
    this.arrow().css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%').css(isVertical ? 'top' : 'left', '');
  };

  Tooltip.prototype.setContent = function () {
    var $tip = this.tip();
    var title = this.getTitle();
    $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title);
    $tip.removeClass('fade in top bottom left right');
  };

  Tooltip.prototype.hide = function (callback) {
    var that = this;
    var $tip = $(this.$tip);
    var e = $.Event('hide.bs.' + this.type);

    function complete() {
      if (that.hoverState != 'in') $tip.detach();

      if (that.$element) {
        // TODO: Check whether guarding this code with this `if` is really necessary.
        that.$element.removeAttr('aria-describedby').trigger('hidden.bs.' + that.type);
      }

      callback && callback();
    }

    this.$element.trigger(e);
    if (e.isDefaultPrevented()) return;
    $tip.removeClass('in');
    $.support.transition && $tip.hasClass('fade') ? $tip.one('bsTransitionEnd', complete).emulateTransitionEnd(Tooltip.TRANSITION_DURATION) : complete();
    this.hoverState = null;
    return this;
  };

  Tooltip.prototype.fixTitle = function () {
    var $e = this.$element;

    if ($e.attr('title') || typeof $e.attr('data-original-title') != 'string') {
      $e.attr('data-original-title', $e.attr('title') || '').attr('title', '');
    }
  };

  Tooltip.prototype.hasContent = function () {
    return this.getTitle();
  };

  Tooltip.prototype.getPosition = function ($element) {
    $element = $element || this.$element;
    var el = $element[0];
    var isBody = el.tagName == 'BODY';
    var elRect = el.getBoundingClientRect();

    if (elRect.width == null) {
      // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
      elRect = $.extend({}, elRect, {
        width: elRect.right - elRect.left,
        height: elRect.bottom - elRect.top
      });
    }

    var isSvg = window.SVGElement && el instanceof window.SVGElement; // Avoid using $.offset() on SVGs since it gives incorrect results in jQuery 3.
    // See https://github.com/twbs/bootstrap/issues/20280

    var elOffset = isBody ? {
      top: 0,
      left: 0
    } : isSvg ? null : $element.offset();
    var scroll = {
      scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop()
    };
    var outerDims = isBody ? {
      width: $(window).width(),
      height: $(window).height()
    } : null;
    return $.extend({}, elRect, scroll, outerDims, elOffset);
  };

  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
    return placement == 'bottom' ? {
      top: pos.top + pos.height,
      left: pos.left + pos.width / 2 - actualWidth / 2
    } : placement == 'top' ? {
      top: pos.top - actualHeight,
      left: pos.left + pos.width / 2 - actualWidth / 2
    } : placement == 'left' ? {
      top: pos.top + pos.height / 2 - actualHeight / 2,
      left: pos.left - actualWidth
    } :
    /* placement == 'right' */
    {
      top: pos.top + pos.height / 2 - actualHeight / 2,
      left: pos.left + pos.width
    };
  };

  Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
    var delta = {
      top: 0,
      left: 0
    };
    if (!this.$viewport) return delta;
    var viewportPadding = this.options.viewport && this.options.viewport.padding || 0;
    var viewportDimensions = this.getPosition(this.$viewport);

    if (/right|left/.test(placement)) {
      var topEdgeOffset = pos.top - viewportPadding - viewportDimensions.scroll;
      var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight;

      if (topEdgeOffset < viewportDimensions.top) {
        // top overflow
        delta.top = viewportDimensions.top - topEdgeOffset;
      } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) {
        // bottom overflow
        delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset;
      }
    } else {
      var leftEdgeOffset = pos.left - viewportPadding;
      var rightEdgeOffset = pos.left + viewportPadding + actualWidth;

      if (leftEdgeOffset < viewportDimensions.left) {
        // left overflow
        delta.left = viewportDimensions.left - leftEdgeOffset;
      } else if (rightEdgeOffset > viewportDimensions.right) {
        // right overflow
        delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset;
      }
    }

    return delta;
  };

  Tooltip.prototype.getTitle = function () {
    var title;
    var $e = this.$element;
    var o = this.options;
    title = $e.attr('data-original-title') || (typeof o.title == 'function' ? o.title.call($e[0]) : o.title);
    return title;
  };

  Tooltip.prototype.getUID = function (prefix) {
    do {
      prefix += ~~(Math.random() * 1000000);
    } while (document.getElementById(prefix));

    return prefix;
  };

  Tooltip.prototype.tip = function () {
    if (!this.$tip) {
      this.$tip = $(this.options.template);

      if (this.$tip.length != 1) {
        throw new Error(this.type + ' `template` option must consist of exactly 1 top-level element!');
      }
    }

    return this.$tip;
  };

  Tooltip.prototype.arrow = function () {
    return this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow');
  };

  Tooltip.prototype.enable = function () {
    this.enabled = true;
  };

  Tooltip.prototype.disable = function () {
    this.enabled = false;
  };

  Tooltip.prototype.toggleEnabled = function () {
    this.enabled = !this.enabled;
  };

  Tooltip.prototype.toggle = function (e) {
    var self = this;

    if (e) {
      self = $(e.currentTarget).data('bs.' + this.type);

      if (!self) {
        self = new this.constructor(e.currentTarget, this.getDelegateOptions());
        $(e.currentTarget).data('bs.' + this.type, self);
      }
    }

    if (e) {
      self.inState.click = !self.inState.click;
      if (self.isInStateTrue()) self.enter(self);else self.leave(self);
    } else {
      self.tip().hasClass('in') ? self.leave(self) : self.enter(self);
    }
  };

  Tooltip.prototype.destroy = function () {
    var that = this;
    clearTimeout(this.timeout);
    this.hide(function () {
      that.$element.off('.' + that.type).removeData('bs.' + that.type);

      if (that.$tip) {
        that.$tip.detach();
      }

      that.$tip = null;
      that.$arrow = null;
      that.$viewport = null;
      that.$element = null;
    });
  }; // TOOLTIP PLUGIN DEFINITION
  // =========================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.tooltip');
      var options = (0, _typeof2.default)(option) == 'object' && option;
      if (!data && /destroy|hide/.test(option)) return;
      if (!data) $this.data('bs.tooltip', data = new Tooltip(this, options));
      if (typeof option == 'string') data[option]();
    });
  }

  var old = $.fn.tooltip;
  $.fn.tooltip = Plugin;
  $.fn.tooltip.Constructor = Tooltip; // TOOLTIP NO CONFLICT
  // ===================

  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old;
    return this;
  };
}(jQuery);
/* ========================================================================
 * Bootstrap: popover.js v3.3.7
 * http://getbootstrap.com/javascript/#popovers
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // POPOVER PUBLIC CLASS DEFINITION
  // ===============================

  var Popover = function (element, options) {
    this.init('popover', element, options);
  };

  if (!$.fn.tooltip) throw new Error('Popover requires tooltip.js');
  Popover.VERSION = '3.3.7';
  Popover.DEFAULTS = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  }); // NOTE: POPOVER EXTENDS tooltip.js
  // ================================

  Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype);
  Popover.prototype.constructor = Popover;

  Popover.prototype.getDefaults = function () {
    return Popover.DEFAULTS;
  };

  Popover.prototype.setContent = function () {
    var $tip = this.tip();
    var title = this.getTitle();
    var content = this.getContent();
    $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title);
    $tip.find('.popover-content').children().detach().end()[// we use append for html objects to maintain js events
    this.options.html ? typeof content == 'string' ? 'html' : 'append' : 'text'](content);
    $tip.removeClass('fade top bottom left right in'); // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
    // this manually by checking the contents.

    if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide();
  };

  Popover.prototype.hasContent = function () {
    return this.getTitle() || this.getContent();
  };

  Popover.prototype.getContent = function () {
    var $e = this.$element;
    var o = this.options;
    return $e.attr('data-content') || (typeof o.content == 'function' ? o.content.call($e[0]) : o.content);
  };

  Popover.prototype.arrow = function () {
    return this.$arrow = this.$arrow || this.tip().find('.arrow');
  }; // POPOVER PLUGIN DEFINITION
  // =========================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.popover');
      var options = (0, _typeof2.default)(option) == 'object' && option;
      if (!data && /destroy|hide/.test(option)) return;
      if (!data) $this.data('bs.popover', data = new Popover(this, options));
      if (typeof option == 'string') data[option]();
    });
  }

  var old = $.fn.popover;
  $.fn.popover = Plugin;
  $.fn.popover.Constructor = Popover; // POPOVER NO CONFLICT
  // ===================

  $.fn.popover.noConflict = function () {
    $.fn.popover = old;
    return this;
  };
}(jQuery);
/* ========================================================================
 * Bootstrap: scrollspy.js v3.3.7
 * http://getbootstrap.com/javascript/#scrollspy
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // SCROLLSPY CLASS DEFINITION
  // ==========================

  function ScrollSpy(element, options) {
    this.$body = $(document.body);
    this.$scrollElement = $(element).is(document.body) ? $(window) : $(element);
    this.options = $.extend({}, ScrollSpy.DEFAULTS, options);
    this.selector = (this.options.target || '') + ' .nav li > a';
    this.offsets = [];
    this.targets = [];
    this.activeTarget = null;
    this.scrollHeight = 0;
    this.$scrollElement.on('scroll.bs.scrollspy', $.proxy(this.process, this));
    this.refresh();
    this.process();
  }

  ScrollSpy.VERSION = '3.3.7';
  ScrollSpy.DEFAULTS = {
    offset: 10
  };

  ScrollSpy.prototype.getScrollHeight = function () {
    return this.$scrollElement[0].scrollHeight || Math.max(this.$body[0].scrollHeight, document.documentElement.scrollHeight);
  };

  ScrollSpy.prototype.refresh = function () {
    var that = this;
    var offsetMethod = 'offset';
    var offsetBase = 0;
    this.offsets = [];
    this.targets = [];
    this.scrollHeight = this.getScrollHeight();

    if (!$.isWindow(this.$scrollElement[0])) {
      offsetMethod = 'position';
      offsetBase = this.$scrollElement.scrollTop();
    }

    this.$body.find(this.selector).map(function () {
      var $el = $(this);
      var href = $el.data('target') || $el.attr('href');
      var $href = /^#./.test(href) && $(href);
      return $href && $href.length && $href.is(':visible') && [[$href[offsetMethod]().top + offsetBase, href]] || null;
    }).sort(function (a, b) {
      return a[0] - b[0];
    }).each(function () {
      that.offsets.push(this[0]);
      that.targets.push(this[1]);
    });
  };

  ScrollSpy.prototype.process = function () {
    var scrollTop = this.$scrollElement.scrollTop() + this.options.offset;
    var scrollHeight = this.getScrollHeight();
    var maxScroll = this.options.offset + scrollHeight - this.$scrollElement.height();
    var offsets = this.offsets;
    var targets = this.targets;
    var activeTarget = this.activeTarget;
    var i;

    if (this.scrollHeight != scrollHeight) {
      this.refresh();
    }

    if (scrollTop >= maxScroll) {
      return activeTarget != (i = targets[targets.length - 1]) && this.activate(i);
    }

    if (activeTarget && scrollTop < offsets[0]) {
      this.activeTarget = null;
      return this.clear();
    }

    for (i = offsets.length; i--;) {
      activeTarget != targets[i] && scrollTop >= offsets[i] && (offsets[i + 1] === undefined || scrollTop < offsets[i + 1]) && this.activate(targets[i]);
    }
  };

  ScrollSpy.prototype.activate = function (target) {
    this.activeTarget = target;
    this.clear();
    var selector = this.selector + '[data-target="' + target + '"],' + this.selector + '[href="' + target + '"]';
    var active = $(selector).parents('li').addClass('active');

    if (active.parent('.dropdown-menu').length) {
      active = active.closest('li.dropdown').addClass('active');
    }

    active.trigger('activate.bs.scrollspy');
  };

  ScrollSpy.prototype.clear = function () {
    $(this.selector).parentsUntil(this.options.target, '.active').removeClass('active');
  }; // SCROLLSPY PLUGIN DEFINITION
  // ===========================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.scrollspy');
      var options = (0, _typeof2.default)(option) == 'object' && option;
      if (!data) $this.data('bs.scrollspy', data = new ScrollSpy(this, options));
      if (typeof option == 'string') data[option]();
    });
  }

  var old = $.fn.scrollspy;
  $.fn.scrollspy = Plugin;
  $.fn.scrollspy.Constructor = ScrollSpy; // SCROLLSPY NO CONFLICT
  // =====================

  $.fn.scrollspy.noConflict = function () {
    $.fn.scrollspy = old;
    return this;
  }; // SCROLLSPY DATA-API
  // ==================


  $(window).on('load.bs.scrollspy.data-api', function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this);
      Plugin.call($spy, $spy.data());
    });
  });
}(jQuery);
/* ========================================================================
 * Bootstrap: tab.js v3.3.7
 * http://getbootstrap.com/javascript/#tabs
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // TAB CLASS DEFINITION
  // ====================

  var Tab = function (element) {
    // jscs:disable requireDollarBeforejQueryAssignment
    this.element = $(element); // jscs:enable requireDollarBeforejQueryAssignment
  };

  Tab.VERSION = '3.3.7';
  Tab.TRANSITION_DURATION = 150;

  Tab.prototype.show = function () {
    var $this = this.element;
    var $ul = $this.closest('ul:not(.dropdown-menu)');
    var selector = $this.data('target');

    if (!selector) {
      selector = $this.attr('href');
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, ''); // strip for ie7
    }

    if ($this.parent('li').hasClass('active')) return;
    var $previous = $ul.find('.active:last a');
    var hideEvent = $.Event('hide.bs.tab', {
      relatedTarget: $this[0]
    });
    var showEvent = $.Event('show.bs.tab', {
      relatedTarget: $previous[0]
    });
    $previous.trigger(hideEvent);
    $this.trigger(showEvent);
    if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) return;
    var $target = $(selector);
    this.activate($this.closest('li'), $ul);
    this.activate($target, $target.parent(), function () {
      $previous.trigger({
        type: 'hidden.bs.tab',
        relatedTarget: $this[0]
      });
      $this.trigger({
        type: 'shown.bs.tab',
        relatedTarget: $previous[0]
      });
    });
  };

  Tab.prototype.activate = function (element, container, callback) {
    var $active = container.find('> .active');
    var transition = callback && $.support.transition && ($active.length && $active.hasClass('fade') || !!container.find('> .fade').length);

    function next() {
      $active.removeClass('active').find('> .dropdown-menu > .active').removeClass('active').end().find('[data-toggle="tab"]').attr('aria-expanded', false);
      element.addClass('active').find('[data-toggle="tab"]').attr('aria-expanded', true);

      if (transition) {
        element[0].offsetWidth; // reflow for transition

        element.addClass('in');
      } else {
        element.removeClass('fade');
      }

      if (element.parent('.dropdown-menu').length) {
        element.closest('li.dropdown').addClass('active').end().find('[data-toggle="tab"]').attr('aria-expanded', true);
      }

      callback && callback();
    }

    $active.length && transition ? $active.one('bsTransitionEnd', next).emulateTransitionEnd(Tab.TRANSITION_DURATION) : next();
    $active.removeClass('in');
  }; // TAB PLUGIN DEFINITION
  // =====================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.tab');
      if (!data) $this.data('bs.tab', data = new Tab(this));
      if (typeof option == 'string') data[option]();
    });
  }

  var old = $.fn.tab;
  $.fn.tab = Plugin;
  $.fn.tab.Constructor = Tab; // TAB NO CONFLICT
  // ===============

  $.fn.tab.noConflict = function () {
    $.fn.tab = old;
    return this;
  }; // TAB DATA-API
  // ============


  var clickHandler = function (e) {
    e.preventDefault();
    Plugin.call($(this), 'show');
  };

  $(document).on('click.bs.tab.data-api', '[data-toggle="tab"]', clickHandler).on('click.bs.tab.data-api', '[data-toggle="pill"]', clickHandler);
}(jQuery);
/* ========================================================================
 * Bootstrap: affix.js v3.3.7
 * http://getbootstrap.com/javascript/#affix
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict'; // AFFIX CLASS DEFINITION
  // ======================

  var Affix = function (element, options) {
    this.options = $.extend({}, Affix.DEFAULTS, options);
    this.$target = $(this.options.target).on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this)).on('click.bs.affix.data-api', $.proxy(this.checkPositionWithEventLoop, this));
    this.$element = $(element);
    this.affixed = null;
    this.unpin = null;
    this.pinnedOffset = null;
    this.checkPosition();
  };

  Affix.VERSION = '3.3.7';
  Affix.RESET = 'affix affix-top affix-bottom';
  Affix.DEFAULTS = {
    offset: 0,
    target: window
  };

  Affix.prototype.getState = function (scrollHeight, height, offsetTop, offsetBottom) {
    var scrollTop = this.$target.scrollTop();
    var position = this.$element.offset();
    var targetHeight = this.$target.height();
    if (offsetTop != null && this.affixed == 'top') return scrollTop < offsetTop ? 'top' : false;

    if (this.affixed == 'bottom') {
      if (offsetTop != null) return scrollTop + this.unpin <= position.top ? false : 'bottom';
      return scrollTop + targetHeight <= scrollHeight - offsetBottom ? false : 'bottom';
    }

    var initializing = this.affixed == null;
    var colliderTop = initializing ? scrollTop : position.top;
    var colliderHeight = initializing ? targetHeight : height;
    if (offsetTop != null && scrollTop <= offsetTop) return 'top';
    if (offsetBottom != null && colliderTop + colliderHeight >= scrollHeight - offsetBottom) return 'bottom';
    return false;
  };

  Affix.prototype.getPinnedOffset = function () {
    if (this.pinnedOffset) return this.pinnedOffset;
    this.$element.removeClass(Affix.RESET).addClass('affix');
    var scrollTop = this.$target.scrollTop();
    var position = this.$element.offset();
    return this.pinnedOffset = position.top - scrollTop;
  };

  Affix.prototype.checkPositionWithEventLoop = function () {
    setTimeout($.proxy(this.checkPosition, this), 1);
  };

  Affix.prototype.checkPosition = function () {
    if (!this.$element.is(':visible')) return;
    var height = this.$element.height();
    var offset = this.options.offset;
    var offsetTop = offset.top;
    var offsetBottom = offset.bottom;
    var scrollHeight = Math.max($(document).height(), $(document.body).height());
    if ((0, _typeof2.default)(offset) != 'object') offsetBottom = offsetTop = offset;
    if (typeof offsetTop == 'function') offsetTop = offset.top(this.$element);
    if (typeof offsetBottom == 'function') offsetBottom = offset.bottom(this.$element);
    var affix = this.getState(scrollHeight, height, offsetTop, offsetBottom);

    if (this.affixed != affix) {
      if (this.unpin != null) this.$element.css('top', '');
      var affixType = 'affix' + (affix ? '-' + affix : '');
      var e = $.Event(affixType + '.bs.affix');
      this.$element.trigger(e);
      if (e.isDefaultPrevented()) return;
      this.affixed = affix;
      this.unpin = affix == 'bottom' ? this.getPinnedOffset() : null;
      this.$element.removeClass(Affix.RESET).addClass(affixType).trigger(affixType.replace('affix', 'affixed') + '.bs.affix');
    }

    if (affix == 'bottom') {
      this.$element.offset({
        top: scrollHeight - height - offsetBottom
      });
    }
  }; // AFFIX PLUGIN DEFINITION
  // =======================


  function Plugin(option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.affix');
      var options = (0, _typeof2.default)(option) == 'object' && option;
      if (!data) $this.data('bs.affix', data = new Affix(this, options));
      if (typeof option == 'string') data[option]();
    });
  }

  var old = $.fn.affix;
  $.fn.affix = Plugin;
  $.fn.affix.Constructor = Affix; // AFFIX NO CONFLICT
  // =================

  $.fn.affix.noConflict = function () {
    $.fn.affix = old;
    return this;
  }; // AFFIX DATA-API
  // ==============


  $(window).on('load', function () {
    $('[data-spy="affix"]').each(function () {
      var $spy = $(this);
      var data = $spy.data();
      data.offset = data.offset || {};
      if (data.offsetBottom != null) data.offset.bottom = data.offsetBottom;
      if (data.offsetTop != null) data.offset.top = data.offsetTop;
      Plugin.call($spy, data);
    });
  });
}(jQuery);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hands.js":[
  "@babel/runtime/helpers/interopRequireDefault",
  "@babel/runtime/helpers/typeof"
],"select2.min.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/select2.min.js                                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function(e){"undefined"==typeof e.fn.each2&&e.extend(e.fn,{each2:function(t){for(var s=e([0]),i=-1,n=this.length;++i<n&&(s.context=s[0]=this[i])&&t.call(s[0],i,s)!==!1;);return this}})}(jQuery),function(e,t){"use strict";function s(t){var s=e(document.createTextNode(""));t.before(s),s.before(t),s.remove()}function i(e){function t(e){return j[e]||e}return e.replace(/[^\u0000-\u007E]/g,t)}function n(e,t){for(var s=0,i=t.length;i>s;s+=1)if(a(e,t[s]))return s;return-1}function o(){var t=e(z);t.appendTo("body");var s={width:t.width()-t[0].clientWidth,height:t.height()-t[0].clientHeight};return t.remove(),s}function a(e,s){return e===s?!0:e===t||s===t?!1:null===e||null===s?!1:e.constructor===String?e+""==s+"":s.constructor===String?s+""==e+"":!1}function r(t,s){var i,n,o;if(null===t||t.length<1)return[];for(i=t.split(s),n=0,o=i.length;o>n;n+=1)i[n]=e.trim(i[n]);return i}function c(e){return e.outerWidth(!1)-e.width()}function l(s){var i="keyup-change-value";s.on("keydown",function(){e.data(s,i)===t&&e.data(s,i,s.val())}),s.on("keyup",function(){var n=e.data(s,i);n!==t&&s.val()!==n&&(e.removeData(s,i),s.trigger("keyup-change"))})}function h(s){s.on("mousemove",function(s){var i=F;(i===t||i.x!==s.pageX||i.y!==s.pageY)&&e(s.target).trigger("mousemove-filtered",s)})}function u(e,s,i){i=i||t;var n;return function(){var t=arguments;window.clearTimeout(n),n=window.setTimeout(function(){s.apply(i,t)},e)}}function d(e,t){var s=u(e,function(e){t.trigger("scroll-debounced",e)});t.on("scroll",function(e){n(e.target,t.get())>=0&&s(e)})}function p(e){e[0]!==document.activeElement&&window.setTimeout(function(){var t,s=e[0],i=e.val().length;e.focus();var n=s.offsetWidth>0||s.offsetHeight>0;n&&s===document.activeElement&&(s.setSelectionRange?s.setSelectionRange(i,i):s.createTextRange&&(t=s.createTextRange(),t.collapse(!1),t.select()))},0)}function f(t){t=e(t)[0];var s=0,i=0;if("selectionStart"in t)s=t.selectionStart,i=t.selectionEnd-s;else if("selection"in document){t.focus();var n=document.selection.createRange();i=document.selection.createRange().text.length,n.moveStart("character",-t.value.length),s=n.text.length-i}return{offset:s,length:i}}function g(e){e.preventDefault(),e.stopPropagation()}function m(e){e.preventDefault(),e.stopImmediatePropagation()}function v(t){if(!L){var s=t[0].currentStyle||window.getComputedStyle(t[0],null);L=e(document.createElement("div")).css({position:"absolute",left:"-10000px",top:"-10000px",display:"none",fontSize:s.fontSize,fontFamily:s.fontFamily,fontStyle:s.fontStyle,fontWeight:s.fontWeight,letterSpacing:s.letterSpacing,textTransform:s.textTransform,whiteSpace:"nowrap"}),L.attr("class","select2-sizer"),e("body").append(L)}return L.text(t.val()),L.width()}function w(t,s,i){var n,o,a=[];n=e.trim(t.attr("class")),n&&(n=""+n,e(n.split(/\s+/)).each2(function(){0===this.indexOf("select2-")&&a.push(this)})),n=e.trim(s.attr("class")),n&&(n=""+n,e(n.split(/\s+/)).each2(function(){0!==this.indexOf("select2-")&&(o=i(this),o&&a.push(o))})),t.attr("class",a.join(" "))}function b(e,t,s,n){var o=i(e.toUpperCase()).indexOf(i(t.toUpperCase())),a=t.length;return 0>o?void s.push(n(e)):(s.push(n(e.substring(0,o))),s.push("<span class='select2-match'>"),s.push(n(e.substring(o,o+a))),s.push("</span>"),void s.push(n(e.substring(o+a,e.length))))}function C(e){var t={"\\":"&#92;","&":"&","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#47;"};return String(e).replace(/[&<>"'\/\\]/g,function(e){return t[e]})}function S(s){var i,n=null,o=s.quietMillis||100,a=s.url,r=this;return function(c){window.clearTimeout(i),i=window.setTimeout(function(){var i=s.data,o=a,l=s.transport||e.fn.select2.ajaxDefaults.transport,h={type:s.type||"GET",cache:s.cache||!1,jsonpCallback:s.jsonpCallback||t,dataType:s.dataType||"json"},u=e.extend({},e.fn.select2.ajaxDefaults.params,h);i=i?i.call(r,c.term,c.page,c.context):null,o="function"==typeof o?o.call(r,c.term,c.page,c.context):o,n&&"function"==typeof n.abort&&n.abort(),s.params&&(e.isFunction(s.params)?e.extend(u,s.params.call(r)):e.extend(u,s.params)),e.extend(u,{url:o,dataType:s.dataType,data:i,success:function(e){var t=s.results(e,c.page,c);c.callback(t)},error:function(e,t,s){var i={hasError:!0,jqXHR:e,textStatus:t,errorThrown:s};c.callback(i)}}),n=l.call(r,u)},o)}}function y(t){var s,i,n=t,o=function(e){return""+e.text};e.isArray(n)&&(i=n,n={results:i}),e.isFunction(n)===!1&&(i=n,n=function(){return i});var a=n();return a.text&&(o=a.text,e.isFunction(o)||(s=a.text,o=function(e){return e[s]})),function(t){var s,i=t.term,a={results:[]};return""===i?void t.callback(n()):(s=function(n,a){var r,c;if(n=n[0],n.children){r={};for(c in n)n.hasOwnProperty(c)&&(r[c]=n[c]);r.children=[],e(n.children).each2(function(e,t){s(t,r.children)}),(r.children.length||t.matcher(i,o(r),n))&&a.push(r)}else t.matcher(i,o(n),n)&&a.push(n)},e(n().results).each2(function(e,t){s(t,a.results)}),void t.callback(a))}}function E(s){var i=e.isFunction(s);return function(n){var o=n.term,a={results:[]},r=i?s(n):s;e.isArray(r)&&(e(r).each(function(){var e=this.text!==t,s=e?this.text:this;(""===o||n.matcher(o,s))&&a.results.push(e?this:{id:this,text:this})}),n.callback(a))}}function x(t,s){if(e.isFunction(t))return!0;if(!t)return!1;if("string"==typeof t)return!0;throw new Error(s+" must be a string, function, or falsy value")}function T(t,s){if(e.isFunction(t)){var i=Array.prototype.slice.call(arguments,2);return t.apply(s,i)}return t}function O(t){var s=0;return e.each(t,function(e,t){t.children?s+=O(t.children):s++}),s}function P(e,s,i,n){var o,r,c,l,h,u=e,d=!1;if(!n.createSearchChoice||!n.tokenSeparators||n.tokenSeparators.length<1)return t;for(;;){for(r=-1,c=0,l=n.tokenSeparators.length;l>c&&(h=n.tokenSeparators[c],r=e.indexOf(h),!(r>=0));c++);if(0>r)break;if(o=e.substring(0,r),e=e.substring(r+h.length),o.length>0&&(o=n.createSearchChoice.call(this,o,s),o!==t&&null!==o&&n.id(o)!==t&&null!==n.id(o))){for(d=!1,c=0,l=s.length;l>c;c++)if(a(n.id(o),n.id(s[c]))){d=!0;break}d||i(o)}}return u!==e?e:void 0}function I(){var t=this;e.each(arguments,function(e,s){t[s].remove(),t[s]=null})}function k(t,s){var i=function(){};return i.prototype=new t,i.prototype.constructor=i,i.prototype.parent=t.prototype,i.prototype=e.extend(i.prototype,s),i}if(window.Select2===t){var A,R,D,H,M,L,N,U,F={x:0,y:0},A={TAB:9,ENTER:13,ESC:27,SPACE:32,LEFT:37,UP:38,RIGHT:39,DOWN:40,SHIFT:16,CTRL:17,ALT:18,PAGE_UP:33,PAGE_DOWN:34,HOME:36,END:35,BACKSPACE:8,DELETE:46,isArrow:function(e){switch(e=e.which?e.which:e){case A.LEFT:case A.RIGHT:case A.UP:case A.DOWN:return!0}return!1},isControl:function(e){var t=e.which;switch(t){case A.SHIFT:case A.CTRL:case A.ALT:return!0}return e.metaKey?!0:!1},isFunctionKey:function(e){return e=e.which?e.which:e,e>=112&&123>=e}},z="<div class='select2-measure-scrollbar'></div>",j={"Ⓐ":"A","Ａ":"A","À":"A","Á":"A","Â":"A","Ầ":"A","Ấ":"A","Ẫ":"A","Ẩ":"A","Ã":"A","Ā":"A","Ă":"A","Ằ":"A","Ắ":"A","Ẵ":"A","Ẳ":"A","Ȧ":"A","Ǡ":"A","Ä":"A","Ǟ":"A","Ả":"A","Å":"A","Ǻ":"A","Ǎ":"A","Ȁ":"A","Ȃ":"A","Ạ":"A","Ậ":"A","Ặ":"A","Ḁ":"A","Ą":"A","Ⱥ":"A","Ɐ":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ⓑ":"B","Ｂ":"B","Ḃ":"B","Ḅ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B","Ɓ":"B","Ⓒ":"C","Ｃ":"C","Ć":"C","Ĉ":"C","Ċ":"C","Č":"C","Ç":"C","Ḉ":"C","Ƈ":"C","Ȼ":"C","Ꜿ":"C","Ⓓ":"D","Ｄ":"D","Ḋ":"D","Ď":"D","Ḍ":"D","Ḑ":"D","Ḓ":"D","Ḏ":"D","Đ":"D","Ƌ":"D","Ɗ":"D","Ɖ":"D","Ꝺ":"D","Ǳ":"DZ","Ǆ":"DZ","ǲ":"Dz","ǅ":"Dz","Ⓔ":"E","Ｅ":"E","È":"E","É":"E","Ê":"E","Ề":"E","Ế":"E","Ễ":"E","Ể":"E","Ẽ":"E","Ē":"E","Ḕ":"E","Ḗ":"E","Ĕ":"E","Ė":"E","Ë":"E","Ẻ":"E","Ě":"E","Ȅ":"E","Ȇ":"E","Ẹ":"E","Ệ":"E","Ȩ":"E","Ḝ":"E","Ę":"E","Ḙ":"E","Ḛ":"E","Ɛ":"E","Ǝ":"E","Ⓕ":"F","Ｆ":"F","Ḟ":"F","Ƒ":"F","Ꝼ":"F","Ⓖ":"G","Ｇ":"G","Ǵ":"G","Ĝ":"G","Ḡ":"G","Ğ":"G","Ġ":"G","Ǧ":"G","Ģ":"G","Ǥ":"G","Ɠ":"G","Ꞡ":"G","Ᵹ":"G","Ꝿ":"G","Ⓗ":"H","Ｈ":"H","Ĥ":"H","Ḣ":"H","Ḧ":"H","Ȟ":"H","Ḥ":"H","Ḩ":"H","Ḫ":"H","Ħ":"H","Ⱨ":"H","Ⱶ":"H","Ɥ":"H","Ⓘ":"I","Ｉ":"I","Ì":"I","Í":"I","Î":"I","Ĩ":"I","Ī":"I","Ĭ":"I","İ":"I","Ï":"I","Ḯ":"I","Ỉ":"I","Ǐ":"I","Ȉ":"I","Ȋ":"I","Ị":"I","Į":"I","Ḭ":"I","Ɨ":"I","Ⓙ":"J","Ｊ":"J","Ĵ":"J","Ɉ":"J","Ⓚ":"K","Ｋ":"K","Ḱ":"K","Ǩ":"K","Ḳ":"K","Ķ":"K","Ḵ":"K","Ƙ":"K","Ⱪ":"K","Ꝁ":"K","Ꝃ":"K","Ꝅ":"K","Ꞣ":"K","Ⓛ":"L","Ｌ":"L","Ŀ":"L","Ĺ":"L","Ľ":"L","Ḷ":"L","Ḹ":"L","Ļ":"L","Ḽ":"L","Ḻ":"L","Ł":"L","Ƚ":"L","Ɫ":"L","Ⱡ":"L","Ꝉ":"L","Ꝇ":"L","Ꞁ":"L","Ǉ":"LJ","ǈ":"Lj","Ⓜ":"M","Ｍ":"M","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ɯ":"M","Ⓝ":"N","Ｎ":"N","Ǹ":"N","Ń":"N","Ñ":"N","Ṅ":"N","Ň":"N","Ṇ":"N","Ņ":"N","Ṋ":"N","Ṉ":"N","Ƞ":"N","Ɲ":"N","Ꞑ":"N","Ꞥ":"N","Ǌ":"NJ","ǋ":"Nj","Ⓞ":"O","Ｏ":"O","Ò":"O","Ó":"O","Ô":"O","Ồ":"O","Ố":"O","Ỗ":"O","Ổ":"O","Õ":"O","Ṍ":"O","Ȭ":"O","Ṏ":"O","Ō":"O","Ṑ":"O","Ṓ":"O","Ŏ":"O","Ȯ":"O","Ȱ":"O","Ö":"O","Ȫ":"O","Ỏ":"O","Ő":"O","Ǒ":"O","Ȍ":"O","Ȏ":"O","Ơ":"O","Ờ":"O","Ớ":"O","Ỡ":"O","Ở":"O","Ợ":"O","Ọ":"O","Ộ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Ɔ":"O","Ɵ":"O","Ꝋ":"O","Ꝍ":"O","Ƣ":"OI","Ꝏ":"OO","Ȣ":"OU","Ⓟ":"P","Ｐ":"P","Ṕ":"P","Ṗ":"P","Ƥ":"P","Ᵽ":"P","Ꝑ":"P","Ꝓ":"P","Ꝕ":"P","Ⓠ":"Q","Ｑ":"Q","Ꝗ":"Q","Ꝙ":"Q","Ɋ":"Q","Ⓡ":"R","Ｒ":"R","Ŕ":"R","Ṙ":"R","Ř":"R","Ȑ":"R","Ȓ":"R","Ṛ":"R","Ṝ":"R","Ŗ":"R","Ṟ":"R","Ɍ":"R","Ɽ":"R","Ꝛ":"R","Ꞧ":"R","Ꞃ":"R","Ⓢ":"S","Ｓ":"S","ẞ":"S","Ś":"S","Ṥ":"S","Ŝ":"S","Ṡ":"S","Š":"S","Ṧ":"S","Ṣ":"S","Ṩ":"S","Ș":"S","Ş":"S","Ȿ":"S","Ꞩ":"S","Ꞅ":"S","Ⓣ":"T","Ｔ":"T","Ṫ":"T","Ť":"T","Ṭ":"T","Ț":"T","Ţ":"T","Ṱ":"T","Ṯ":"T","Ŧ":"T","Ƭ":"T","Ʈ":"T","Ⱦ":"T","Ꞇ":"T","Ꜩ":"TZ","Ⓤ":"U","Ｕ":"U","Ù":"U","Ú":"U","Û":"U","Ũ":"U","Ṹ":"U","Ū":"U","Ṻ":"U","Ŭ":"U","Ü":"U","Ǜ":"U","Ǘ":"U","Ǖ":"U","Ǚ":"U","Ủ":"U","Ů":"U","Ű":"U","Ǔ":"U","Ȕ":"U","Ȗ":"U","Ư":"U","Ừ":"U","Ứ":"U","Ữ":"U","Ử":"U","Ự":"U","Ụ":"U","Ṳ":"U","Ų":"U","Ṷ":"U","Ṵ":"U","Ʉ":"U","Ⓥ":"V","Ｖ":"V","Ṽ":"V","Ṿ":"V","Ʋ":"V","Ꝟ":"V","Ʌ":"V","Ꝡ":"VY","Ⓦ":"W","Ｗ":"W","Ẁ":"W","Ẃ":"W","Ŵ":"W","Ẇ":"W","Ẅ":"W","Ẉ":"W","Ⱳ":"W","Ⓧ":"X","Ｘ":"X","Ẋ":"X","Ẍ":"X","Ⓨ":"Y","Ｙ":"Y","Ỳ":"Y","Ý":"Y","Ŷ":"Y","Ỹ":"Y","Ȳ":"Y","Ẏ":"Y","Ÿ":"Y","Ỷ":"Y","Ỵ":"Y","Ƴ":"Y","Ɏ":"Y","Ỿ":"Y","Ⓩ":"Z","Ｚ":"Z","Ź":"Z","Ẑ":"Z","Ż":"Z","Ž":"Z","Ẓ":"Z","Ẕ":"Z","Ƶ":"Z","Ȥ":"Z","Ɀ":"Z","Ⱬ":"Z","Ꝣ":"Z","ⓐ":"a","ａ":"a","ẚ":"a","à":"a","á":"a","â":"a","ầ":"a","ấ":"a","ẫ":"a","ẩ":"a","ã":"a","ā":"a","ă":"a","ằ":"a","ắ":"a","ẵ":"a","ẳ":"a","ȧ":"a","ǡ":"a","ä":"a","ǟ":"a","ả":"a","å":"a","ǻ":"a","ǎ":"a","ȁ":"a","ȃ":"a","ạ":"a","ậ":"a","ặ":"a","ḁ":"a","ą":"a","ⱥ":"a","ɐ":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ⓑ":"b","ｂ":"b","ḃ":"b","ḅ":"b","ḇ":"b","ƀ":"b","ƃ":"b","ɓ":"b","ⓒ":"c","ｃ":"c","ć":"c","ĉ":"c","ċ":"c","č":"c","ç":"c","ḉ":"c","ƈ":"c","ȼ":"c","ꜿ":"c","ↄ":"c","ⓓ":"d","ｄ":"d","ḋ":"d","ď":"d","ḍ":"d","ḑ":"d","ḓ":"d","ḏ":"d","đ":"d","ƌ":"d","ɖ":"d","ɗ":"d","ꝺ":"d","ǳ":"dz","ǆ":"dz","ⓔ":"e","ｅ":"e","è":"e","é":"e","ê":"e","ề":"e","ế":"e","ễ":"e","ể":"e","ẽ":"e","ē":"e","ḕ":"e","ḗ":"e","ĕ":"e","ė":"e","ë":"e","ẻ":"e","ě":"e","ȅ":"e","ȇ":"e","ẹ":"e","ệ":"e","ȩ":"e","ḝ":"e","ę":"e","ḙ":"e","ḛ":"e","ɇ":"e","ɛ":"e","ǝ":"e","ⓕ":"f","ｆ":"f","ḟ":"f","ƒ":"f","ꝼ":"f","ⓖ":"g","ｇ":"g","ǵ":"g","ĝ":"g","ḡ":"g","ğ":"g","ġ":"g","ǧ":"g","ģ":"g","ǥ":"g","ɠ":"g","ꞡ":"g","ᵹ":"g","ꝿ":"g","ⓗ":"h","ｈ":"h","ĥ":"h","ḣ":"h","ḧ":"h","ȟ":"h","ḥ":"h","ḩ":"h","ḫ":"h","ẖ":"h","ħ":"h","ⱨ":"h","ⱶ":"h","ɥ":"h","ƕ":"hv","ⓘ":"i","ｉ":"i","ì":"i","í":"i","î":"i","ĩ":"i","ī":"i","ĭ":"i","ï":"i","ḯ":"i","ỉ":"i","ǐ":"i","ȉ":"i","ȋ":"i","ị":"i","į":"i","ḭ":"i","ɨ":"i","ı":"i","ⓙ":"j","ｊ":"j","ĵ":"j","ǰ":"j","ɉ":"j","ⓚ":"k","ｋ":"k","ḱ":"k","ǩ":"k","ḳ":"k","ķ":"k","ḵ":"k","ƙ":"k","ⱪ":"k","ꝁ":"k","ꝃ":"k","ꝅ":"k","ꞣ":"k","ⓛ":"l","ｌ":"l","ŀ":"l","ĺ":"l","ľ":"l","ḷ":"l","ḹ":"l","ļ":"l","ḽ":"l","ḻ":"l","ſ":"l","ł":"l","ƚ":"l","ɫ":"l","ⱡ":"l","ꝉ":"l","ꞁ":"l","ꝇ":"l","ǉ":"lj","ⓜ":"m","ｍ":"m","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ɯ":"m","ⓝ":"n","ｎ":"n","ǹ":"n","ń":"n","ñ":"n","ṅ":"n","ň":"n","ṇ":"n","ņ":"n","ṋ":"n","ṉ":"n","ƞ":"n","ɲ":"n","ŉ":"n","ꞑ":"n","ꞥ":"n","ǌ":"nj","ⓞ":"o","ｏ":"o","ò":"o","ó":"o","ô":"o","ồ":"o","ố":"o","ỗ":"o","ổ":"o","õ":"o","ṍ":"o","ȭ":"o","ṏ":"o","ō":"o","ṑ":"o","ṓ":"o","ŏ":"o","ȯ":"o","ȱ":"o","ö":"o","ȫ":"o","ỏ":"o","ő":"o","ǒ":"o","ȍ":"o","ȏ":"o","ơ":"o","ờ":"o","ớ":"o","ỡ":"o","ở":"o","ợ":"o","ọ":"o","ộ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o","ɔ":"o","ꝋ":"o","ꝍ":"o","ɵ":"o","ƣ":"oi","ȣ":"ou","ꝏ":"oo","ⓟ":"p","ｐ":"p","ṕ":"p","ṗ":"p","ƥ":"p","ᵽ":"p","ꝑ":"p","ꝓ":"p","ꝕ":"p","ⓠ":"q","ｑ":"q","ɋ":"q","ꝗ":"q","ꝙ":"q","ⓡ":"r","ｒ":"r","ŕ":"r","ṙ":"r","ř":"r","ȑ":"r","ȓ":"r","ṛ":"r","ṝ":"r","ŗ":"r","ṟ":"r","ɍ":"r","ɽ":"r","ꝛ":"r","ꞧ":"r","ꞃ":"r","ⓢ":"s","ｓ":"s","ß":"s","ś":"s","ṥ":"s","ŝ":"s","ṡ":"s","š":"s","ṧ":"s","ṣ":"s","ṩ":"s","ș":"s","ş":"s","ȿ":"s","ꞩ":"s","ꞅ":"s","ẛ":"s","ⓣ":"t","ｔ":"t","ṫ":"t","ẗ":"t","ť":"t","ṭ":"t","ț":"t","ţ":"t","ṱ":"t","ṯ":"t","ŧ":"t","ƭ":"t","ʈ":"t","ⱦ":"t","ꞇ":"t","ꜩ":"tz","ⓤ":"u","ｕ":"u","ù":"u","ú":"u","û":"u","ũ":"u","ṹ":"u","ū":"u","ṻ":"u","ŭ":"u","ü":"u","ǜ":"u","ǘ":"u","ǖ":"u","ǚ":"u","ủ":"u","ů":"u","ű":"u","ǔ":"u","ȕ":"u","ȗ":"u","ư":"u","ừ":"u","ứ":"u","ữ":"u","ử":"u","ự":"u","ụ":"u","ṳ":"u","ų":"u","ṷ":"u","ṵ":"u","ʉ":"u","ⓥ":"v","ｖ":"v","ṽ":"v","ṿ":"v","ʋ":"v","ꝟ":"v","ʌ":"v","ꝡ":"vy","ⓦ":"w","ｗ":"w","ẁ":"w","ẃ":"w","ŵ":"w","ẇ":"w","ẅ":"w","ẘ":"w","ẉ":"w","ⱳ":"w","ⓧ":"x","ｘ":"x","ẋ":"x","ẍ":"x","ⓨ":"y","ｙ":"y","ỳ":"y","ý":"y","ŷ":"y","ỹ":"y","ȳ":"y","ẏ":"y","ÿ":"y","ỷ":"y","ẙ":"y","ỵ":"y","ƴ":"y","ɏ":"y","ỿ":"y","ⓩ":"z","ｚ":"z","ź":"z","ẑ":"z","ż":"z","ž":"z","ẓ":"z","ẕ":"z","ƶ":"z","ȥ":"z","ɀ":"z","ⱬ":"z","ꝣ":"z","Ά":"Α","Έ":"Ε","Ή":"Η","Ί":"Ι","Ϊ":"Ι","Ό":"Ο","Ύ":"Υ","Ϋ":"Υ","Ώ":"Ω","ά":"α","έ":"ε","ή":"η","ί":"ι","ϊ":"ι","ΐ":"ι","ό":"ο","ύ":"υ","ϋ":"υ","ΰ":"υ","ω":"ω","ς":"σ"};N=e(document),M=function(){var e=1;return function(){return e++}}(),R=k(Object,{bind:function(e){var t=this;return function(){e.apply(t,arguments)}},init:function(s){var i,n,a=".select2-results";this.opts=s=this.prepareOpts(s),this.id=s.id,s.element.data("select2")!==t&&null!==s.element.data("select2")&&s.element.data("select2").destroy(),this.container=this.createContainer(),this.liveRegion=e("<span>",{role:"status","aria-live":"polite"}).addClass("select2-hidden-accessible").appendTo(document.body),this.containerId="s2id_"+(s.element.attr("id")||"autogen"+M()),this.containerEventName=this.containerId.replace(/([.])/g,"_").replace(/([;&,\-\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g,"\\$1"),this.container.attr("id",this.containerId),this.container.attr("title",s.element.attr("title")),this.body=e("body"),w(this.container,this.opts.element,this.opts.adaptContainerCssClass),this.container.attr("style",s.element.attr("style")),this.container.css(T(s.containerCss,this.opts.element)),this.container.addClass(T(s.containerCssClass,this.opts.element)),this.elementTabIndex=this.opts.element.attr("tabindex"),this.opts.element.data("select2",this).attr("tabindex","-1").before(this.container).on("click.select2",g),this.container.data("select2",this),this.dropdown=this.container.find(".select2-drop"),w(this.dropdown,this.opts.element,this.opts.adaptDropdownCssClass),this.dropdown.addClass(T(s.dropdownCssClass,this.opts.element)),this.dropdown.data("select2",this),this.dropdown.on("click",g),this.results=i=this.container.find(a),this.search=n=this.container.find("input.select2-input"),this.queryCount=0,this.resultsPage=0,this.context=null,this.initContainer(),this.container.on("click",g),h(this.results),this.dropdown.on("mousemove-filtered",a,this.bind(this.highlightUnderEvent)),this.dropdown.on("touchstart touchmove touchend",a,this.bind(function(e){this._touchEvent=!0,this.highlightUnderEvent(e)})),this.dropdown.on("touchmove",a,this.bind(this.touchMoved)),this.dropdown.on("touchstart touchend",a,this.bind(this.clearTouchMoved)),this.dropdown.on("click",this.bind(function(){this._touchEvent&&(this._touchEvent=!1,this.selectHighlighted())})),d(80,this.results),this.dropdown.on("scroll-debounced",a,this.bind(this.loadMoreIfNeeded)),e(this.container).on("change",".select2-input",function(e){e.stopPropagation()}),e(this.dropdown).on("change",".select2-input",function(e){e.stopPropagation()}),e.fn.mousewheel&&i.mousewheel(function(e,t,s,n){var o=i.scrollTop();n>0&&0>=o-n?(i.scrollTop(0),g(e)):0>n&&i.get(0).scrollHeight-i.scrollTop()+n<=i.height()&&(i.scrollTop(i.get(0).scrollHeight-i.height()),g(e))}),l(n),n.on("keyup-change input paste",this.bind(this.updateResults)),n.on("focus",function(){n.addClass("select2-focused")}),n.on("blur",function(){n.removeClass("select2-focused")}),this.dropdown.on("mouseup",a,this.bind(function(t){e(t.target).closest(".select2-result-selectable").length>0&&(this.highlightUnderEvent(t),this.selectHighlighted(t))})),this.dropdown.on("click mouseup mousedown touchstart touchend focusin",function(e){e.stopPropagation()}),this.nextSearchTerm=t,e.isFunction(this.opts.initSelection)&&(this.initSelection(),this.monitorSource()),null!==s.maximumInputLength&&this.search.attr("maxlength",s.maximumInputLength);var r=s.element.prop("disabled");r===t&&(r=!1),this.enable(!r);var c=s.element.prop("readonly");c===t&&(c=!1),this.readonly(c),U=U||o(),this.autofocus=s.element.prop("autofocus"),s.element.prop("autofocus",!1),this.autofocus&&this.focus(),this.search.attr("placeholder",s.searchInputPlaceholder)},destroy:function(){var e=this.opts.element,s=e.data("select2"),i=this;this.close(),e.length&&e[0].detachEvent&&e.each(function(){this.detachEvent("onpropertychange",i._sync)}),this.propertyObserver&&(this.propertyObserver.disconnect(),this.propertyObserver=null),this._sync=null,s!==t&&(s.container.remove(),s.liveRegion.remove(),s.dropdown.remove(),e.removeClass("select2-offscreen").removeData("select2").off(".select2").prop("autofocus",this.autofocus||!1),this.elementTabIndex?e.attr({tabindex:this.elementTabIndex}):e.removeAttr("tabindex"),e.show()),I.call(this,"container","liveRegion","dropdown","results","search")},optionToData:function(e){return e.is("option")?{id:e.prop("value"),text:e.text(),element:e.get(),css:e.attr("class"),disabled:e.prop("disabled"),locked:a(e.attr("locked"),"locked")||a(e.data("locked"),!0)}:e.is("optgroup")?{text:e.attr("label"),children:[],element:e.get(),css:e.attr("class")}:void 0},prepareOpts:function(s){var i,n,o,c,l=this;if(i=s.element,"select"===i.get(0).tagName.toLowerCase()&&(this.select=n=s.element),n&&e.each(["id","multiple","ajax","query","createSearchChoice","initSelection","data","tags"],function(){if(this in s)throw new Error("Option '"+this+"' is not allowed for Select2 when attached to a <select> element.")}),s=e.extend({},{populateResults:function(i,n,o){var a,r=this.opts.id,c=this.liveRegion;(a=function(i,n,h){var u,d,p,f,g,m,v,w,b,C;i=s.sortResults(i,n,o);var S=[];for(u=0,d=i.length;d>u;u+=1)p=i[u],g=p.disabled===!0,f=!g&&r(p)!==t,m=p.children&&p.children.length>0,v=e("<li></li>"),v.addClass("select2-results-dept-"+h),v.addClass("select2-result"),v.addClass(f?"select2-result-selectable":"select2-result-unselectable"),g&&v.addClass("select2-disabled"),m&&v.addClass("select2-result-with-children"),v.addClass(l.opts.formatResultCssClass(p)),v.attr("role","presentation"),w=e(document.createElement("div")),w.addClass("select2-result-label"),w.attr("id","select2-result-label-"+M()),w.attr("role","option"),C=s.formatResult(p,w,o,l.opts.escapeMarkup),C!==t&&(w.html(C),v.append(w)),m&&(b=e("<ul></ul>"),b.addClass("select2-result-sub"),a(p.children,b,h+1),v.append(b)),v.data("select2-data",p),S.push(v[0]);n.append(S),c.text(s.formatMatches(i.length))})(n,i,0)}},e.fn.select2.defaults,s),"function"!=typeof s.id&&(o=s.id,s.id=function(e){return e[o]}),e.isArray(s.element.data("select2Tags"))){if("tags"in s)throw"tags specified as both an attribute 'data-select2-tags' and in options of Select2 "+s.element.attr("id");s.tags=s.element.data("select2Tags")}if(n?(s.query=this.bind(function(e){var s,n,o,a={results:[],more:!1},r=e.term;o=function(t,s){var i;t.is("option")?e.matcher(r,t.text(),t)&&s.push(l.optionToData(t)):t.is("optgroup")&&(i=l.optionToData(t),t.children().each2(function(e,t){o(t,i.children)}),i.children.length>0&&s.push(i))},s=i.children(),this.getPlaceholder()!==t&&s.length>0&&(n=this.getPlaceholderOption(),n&&(s=s.not(n))),s.each2(function(e,t){o(t,a.results)}),e.callback(a)}),s.id=function(e){return e.id}):"query"in s||("ajax"in s?(c=s.element.data("ajax-url"),c&&c.length>0&&(s.ajax.url=c),s.query=S.call(s.element,s.ajax)):"data"in s?s.query=y(s.data):"tags"in s&&(s.query=E(s.tags),s.createSearchChoice===t&&(s.createSearchChoice=function(t){return{id:e.trim(t),text:e.trim(t)}}),s.initSelection===t&&(s.initSelection=function(t,i){var n=[];e(r(t.val(),s.separator)).each(function(){var t={id:this,text:this},i=s.tags;e.isFunction(i)&&(i=i()),e(i).each(function(){return a(this.id,t.id)?(t=this,!1):void 0}),n.push(t)}),i(n)}))),"function"!=typeof s.query)throw"query function not defined for Select2 "+s.element.attr("id");if("top"===s.createSearchChoicePosition)s.createSearchChoicePosition=function(e,t){e.unshift(t)};else if("bottom"===s.createSearchChoicePosition)s.createSearchChoicePosition=function(e,t){e.push(t)};else if("function"!=typeof s.createSearchChoicePosition)throw"invalid createSearchChoicePosition option must be 'top', 'bottom' or a custom function";return s},monitorSource:function(){var s,i=this.opts.element,n=this;i.on("change.select2",this.bind(function(){this.opts.element.data("select2-change-triggered")!==!0&&this.initSelection()})),this._sync=this.bind(function(){var e=i.prop("disabled");e===t&&(e=!1),this.enable(!e);var s=i.prop("readonly");s===t&&(s=!1),this.readonly(s),w(this.container,this.opts.element,this.opts.adaptContainerCssClass),this.container.addClass(T(this.opts.containerCssClass,this.opts.element)),w(this.dropdown,this.opts.element,this.opts.adaptDropdownCssClass),this.dropdown.addClass(T(this.opts.dropdownCssClass,this.opts.element))}),i.length&&i[0].attachEvent&&i.each(function(){this.attachEvent("onpropertychange",n._sync)}),s=window.MutationObserver||window.WebKitMutationObserver||window.MozMutationObserver,s!==t&&(this.propertyObserver&&(delete this.propertyObserver,this.propertyObserver=null),this.propertyObserver=new s(function(t){e.each(t,n._sync)}),this.propertyObserver.observe(i.get(0),{attributes:!0,subtree:!1}))},triggerSelect:function(t){var s=e.Event("select2-selecting",{val:this.id(t),object:t,choice:t});return this.opts.element.trigger(s),!s.isDefaultPrevented()},triggerChange:function(t){t=t||{},t=e.extend({},t,{type:"change",val:this.val()}),this.opts.element.data("select2-change-triggered",!0),this.opts.element.trigger(t),this.opts.element.data("select2-change-triggered",!1),this.opts.element.click(),this.opts.blurOnChange&&this.opts.element.blur()},isInterfaceEnabled:function(){return this.enabledInterface===!0},enableInterface:function(){var e=this._enabled&&!this._readonly,t=!e;return e===this.enabledInterface?!1:(this.container.toggleClass("select2-container-disabled",t),this.close(),this.enabledInterface=e,!0)},enable:function(e){e===t&&(e=!0),this._enabled!==e&&(this._enabled=e,this.opts.element.prop("disabled",!e),this.enableInterface())},disable:function(){this.enable(!1)},readonly:function(e){e===t&&(e=!1),this._readonly!==e&&(this._readonly=e,this.opts.element.prop("readonly",e),this.enableInterface())},opened:function(){return this.container?this.container.hasClass("select2-dropdown-open"):!1},positionDropdown:function(){var t,s,i,n,o,a=this.dropdown,r=this.container.offset(),c=this.container.outerHeight(!1),l=this.container.outerWidth(!1),h=a.outerHeight(!1),u=e(window),d=u.width(),p=u.height(),f=u.scrollLeft()+d,g=u.scrollTop()+p,m=r.top+c,v=r.left,w=g>=m+h,b=r.top-h>=u.scrollTop(),C=a.outerWidth(!1),S=f>=v+C,y=a.hasClass("select2-drop-above");y?(s=!0,!b&&w&&(i=!0,s=!1)):(s=!1,!w&&b&&(i=!0,s=!0)),i&&(a.hide(),r=this.container.offset(),c=this.container.outerHeight(!1),l=this.container.outerWidth(!1),h=a.outerHeight(!1),f=u.scrollLeft()+d,g=u.scrollTop()+p,m=r.top+c,v=r.left,C=a.outerWidth(!1),S=f>=v+C,a.show(),this.focusSearch()),this.opts.dropdownAutoWidth?(o=e(".select2-results",a)[0],a.addClass("select2-drop-auto-width"),a.css("width",""),C=a.outerWidth(!1)+(o.scrollHeight===o.clientHeight?0:U.width),C>l?l=C:C=l,h=a.outerHeight(!1),S=f>=v+C):this.container.removeClass("select2-drop-auto-width"),"static"!==this.body.css("position")&&(t=this.body.offset(),m-=t.top,v-=t.left),S||(v=r.left+this.container.outerWidth(!1)-C),n={left:v,width:l},s?(n.top=r.top-h,n.bottom="auto",this.container.addClass("select2-drop-above"),a.addClass("select2-drop-above")):(n.top=m,n.bottom="auto",this.container.removeClass("select2-drop-above"),a.removeClass("select2-drop-above")),n=e.extend(n,T(this.opts.dropdownCss,this.opts.element)),a.css(n)},shouldOpen:function(){var t;return this.opened()?!1:this._enabled===!1||this._readonly===!0?!1:(t=e.Event("select2-opening"),this.opts.element.trigger(t),!t.isDefaultPrevented())},clearDropdownAlignmentPreference:function(){this.container.removeClass("select2-drop-above"),this.dropdown.removeClass("select2-drop-above")},open:function(){return this.shouldOpen()?(this.opening(),N.on("mousemove.select2Event",function(e){F.x=e.pageX,F.y=e.pageY}),!0):!1},opening:function(){var t,i=this.containerEventName,n="scroll."+i,o="resize."+i,a="orientationchange."+i;this.container.addClass("select2-dropdown-open").addClass("select2-container-active"),this.clearDropdownAlignmentPreference(),this.dropdown[0]!==this.body.children().last()[0]&&this.dropdown.detach().appendTo(this.body),t=e("#select2-drop-mask"),0==t.length&&(t=e(document.createElement("div")),t.attr("id","select2-drop-mask").attr("class","select2-drop-mask"),t.hide(),t.appendTo(this.body),t.on("mousedown touchstart click",function(i){s(t);var n,o=e("#select2-drop");o.length>0&&(n=o.data("select2"),n.opts.selectOnBlur&&n.selectHighlighted({noFocus:!0}),n.close(),i.preventDefault(),i.stopPropagation())})),this.dropdown.prev()[0]!==t[0]&&this.dropdown.before(t),e("#select2-drop").removeAttr("id"),this.dropdown.attr("id","select2-drop"),t.show(),this.positionDropdown(),this.dropdown.show(),this.positionDropdown(),this.dropdown.addClass("select2-drop-active");var r=this;this.container.parents().add(window).each(function(){e(this).on(o+" "+n+" "+a,function(){r.opened()&&r.positionDropdown()})})},close:function(){if(this.opened()){var t=this.containerEventName,s="scroll."+t,i="resize."+t,n="orientationchange."+t;this.container.parents().add(window).each(function(){e(this).off(s).off(i).off(n)}),this.clearDropdownAlignmentPreference(),e("#select2-drop-mask").hide(),this.dropdown.removeAttr("id"),this.dropdown.hide(),this.container.removeClass("select2-dropdown-open").removeClass("select2-container-active"),this.results.empty(),N.off("mousemove.select2Event"),this.clearSearch(),this.search.removeClass("select2-active"),this.opts.element.trigger(e.Event("select2-close"))}},externalSearch:function(e){this.open(),this.search.val(e),this.updateResults(!1)},clearSearch:function(){},getMaximumSelectionSize:function(){return T(this.opts.maximumSelectionSize,this.opts.element)},ensureHighlightVisible:function(){var t,s,i,n,o,a,r,c,l=this.results;if(s=this.highlight(),!(0>s)){if(0==s)return void l.scrollTop(0);t=this.findHighlightableChoices().find(".select2-result-label"),i=e(t[s]),c=(i.offset()||{}).top||0,n=c+i.outerHeight(!0),s===t.length-1&&(r=l.find("li.select2-more-results"),r.length>0&&(n=r.offset().top+r.outerHeight(!0))),o=l.offset().top+l.outerHeight(!0),n>o&&l.scrollTop(l.scrollTop()+(n-o)),a=c-l.offset().top,0>a&&"none"!=i.css("display")&&l.scrollTop(l.scrollTop()+a)}},findHighlightableChoices:function(){return this.results.find(".select2-result-selectable:not(.select2-disabled):not(.select2-selected)")},moveHighlight:function(t){for(var s=this.findHighlightableChoices(),i=this.highlight();i>-1&&i<s.length;){i+=t;var n=e(s[i]);if(n.hasClass("select2-result-selectable")&&!n.hasClass("select2-disabled")&&!n.hasClass("select2-selected")){this.highlight(i);break}}},highlight:function(t){var s,i,o=this.findHighlightableChoices();return 0===arguments.length?n(o.filter(".select2-highlighted")[0],o.get()):(t>=o.length&&(t=o.length-1),0>t&&(t=0),this.removeHighlight(),s=e(o[t]),s.addClass("select2-highlighted"),this.search.attr("aria-activedescendant",s.find(".select2-result-label").attr("id")),this.ensureHighlightVisible(),this.liveRegion.text(s.text()),i=s.data("select2-data"),void(i&&this.opts.element.trigger({type:"select2-highlight",val:this.id(i),choice:i})))},removeHighlight:function(){this.results.find(".select2-highlighted").removeClass("select2-highlighted")},touchMoved:function(){this._touchMoved=!0},clearTouchMoved:function(){this._touchMoved=!1},countSelectableResults:function(){return this.findHighlightableChoices().length},highlightUnderEvent:function(t){var s=e(t.target).closest(".select2-result-selectable");if(s.length>0&&!s.is(".select2-highlighted")){var i=this.findHighlightableChoices();this.highlight(i.index(s))}else 0==s.length&&this.removeHighlight()},loadMoreIfNeeded:function(){var e,t=this.results,s=t.find("li.select2-more-results"),i=this.resultsPage+1,n=this,o=this.search.val(),a=this.context;0!==s.length&&(e=s.offset().top-t.offset().top-t.height(),e<=this.opts.loadMorePadding&&(s.addClass("select2-active"),this.opts.query({element:this.opts.element,term:o,page:i,context:a,matcher:this.opts.matcher,callback:this.bind(function(e){n.opened()&&(n.opts.populateResults.call(this,t,e.results,{term:o,page:i,context:a}),n.postprocessResults(e,!1,!1),e.more===!0?(s.detach().appendTo(t).text(T(n.opts.formatLoadMore,n.opts.element,i+1)),window.setTimeout(function(){n.loadMoreIfNeeded()},10)):s.remove(),n.positionDropdown(),n.resultsPage=i,n.context=e.context,this.opts.element.trigger({type:"select2-loaded",items:e}))})})))},tokenize:function(){},updateResults:function(s){function i(){l.removeClass("select2-active"),d.positionDropdown(),d.liveRegion.text(h.find(".select2-no-results,.select2-selection-limit,.select2-searching").length?h.text():d.opts.formatMatches(h.find(".select2-result-selectable").length))}function n(e){h.html(e),i()}var o,r,c,l=this.search,h=this.results,u=this.opts,d=this,p=l.val(),f=e.data(this.container,"select2-last-term");if((s===!0||!f||!a(p,f))&&(e.data(this.container,"select2-last-term",p),s===!0||this.showSearchInput!==!1&&this.opened())){c=++this.queryCount;var g=this.getMaximumSelectionSize();if(g>=1&&(o=this.data(),e.isArray(o)&&o.length>=g&&x(u.formatSelectionTooBig,"formatSelectionTooBig")))return void n("<li class='select2-selection-limit'>"+T(u.formatSelectionTooBig,u.element,g)+"</li>");if(l.val().length<u.minimumInputLength)return n(x(u.formatInputTooShort,"formatInputTooShort")?"<li class='select2-no-results'>"+T(u.formatInputTooShort,u.element,l.val(),u.minimumInputLength)+"</li>":""),void(s&&this.showSearch&&this.showSearch(!0));if(u.maximumInputLength&&l.val().length>u.maximumInputLength)return void n(x(u.formatInputTooLong,"formatInputTooLong")?"<li class='select2-no-results'>"+T(u.formatInputTooLong,u.element,l.val(),u.maximumInputLength)+"</li>":"");u.formatSearching&&0===this.findHighlightableChoices().length&&n("<li class='select2-searching'>"+T(u.formatSearching,u.element)+"</li>"),l.addClass("select2-active"),this.removeHighlight(),r=this.tokenize(),r!=t&&null!=r&&l.val(r),this.resultsPage=1,u.query({element:u.element,term:l.val(),page:this.resultsPage,context:null,matcher:u.matcher,callback:this.bind(function(o){var r;if(c==this.queryCount){if(!this.opened())return void this.search.removeClass("select2-active");if(o.hasError!==t&&x(u.formatAjaxError,"formatAjaxError"))return void n("<li class='select2-ajax-error'>"+T(u.formatAjaxError,u.element,o.jqXHR,o.textStatus,o.errorThrown)+"</li>");if(this.context=o.context===t?null:o.context,this.opts.createSearchChoice&&""!==l.val()&&(r=this.opts.createSearchChoice.call(d,l.val(),o.results),r!==t&&null!==r&&d.id(r)!==t&&null!==d.id(r)&&0===e(o.results).filter(function(){return a(d.id(this),d.id(r))}).length&&this.opts.createSearchChoicePosition(o.results,r)),0===o.results.length&&x(u.formatNoMatches,"formatNoMatches"))return void n("<li class='select2-no-results'>"+T(u.formatNoMatches,u.element,l.val())+"</li>");
h.empty(),d.opts.populateResults.call(this,h,o.results,{term:l.val(),page:this.resultsPage,context:null}),o.more===!0&&x(u.formatLoadMore,"formatLoadMore")&&(h.append("<li class='select2-more-results'>"+u.escapeMarkup(T(u.formatLoadMore,u.element,this.resultsPage))+"</li>"),window.setTimeout(function(){d.loadMoreIfNeeded()},10)),this.postprocessResults(o,s),i(),this.opts.element.trigger({type:"select2-loaded",items:o})}})})}},cancel:function(){this.close()},blur:function(){this.opts.selectOnBlur&&this.selectHighlighted({noFocus:!0}),this.close(),this.container.removeClass("select2-container-active"),this.search[0]===document.activeElement&&this.search.blur(),this.clearSearch(),this.selection.find(".select2-search-choice-focus").removeClass("select2-search-choice-focus")},focusSearch:function(){p(this.search)},selectHighlighted:function(e){if(this._touchMoved)return void this.clearTouchMoved();var t=this.highlight(),s=this.results.find(".select2-highlighted"),i=s.closest(".select2-result").data("select2-data");i?(this.highlight(t),this.onSelect(i,e)):e&&e.noFocus&&this.close()},getPlaceholder:function(){var e;return this.opts.element.attr("placeholder")||this.opts.element.attr("data-placeholder")||this.opts.element.data("placeholder")||this.opts.placeholder||((e=this.getPlaceholderOption())!==t?e.text():t)},getPlaceholderOption:function(){if(this.select){var s=this.select.children("option").first();if(this.opts.placeholderOption!==t)return"first"===this.opts.placeholderOption&&s||"function"==typeof this.opts.placeholderOption&&this.opts.placeholderOption(this.select);if(""===e.trim(s.text())&&""===s.val())return s}},initContainerWidth:function(){function s(){var s,i,n,o,a,r;if("off"===this.opts.width)return null;if("element"===this.opts.width)return 0===this.opts.element.outerWidth(!1)?"auto":this.opts.element.outerWidth(!1)+"px";if("copy"===this.opts.width||"resolve"===this.opts.width){if(s=this.opts.element.attr("style"),s!==t)for(i=s.split(";"),o=0,a=i.length;a>o;o+=1)if(r=i[o].replace(/\s/g,""),n=r.match(/^width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i),null!==n&&n.length>=1)return n[1];return"resolve"===this.opts.width?(s=this.opts.element.css("width"),s.indexOf("%")>0?s:0===this.opts.element.outerWidth(!1)?"auto":this.opts.element.outerWidth(!1)+"px"):null}return e.isFunction(this.opts.width)?this.opts.width():this.opts.width}var i=s.call(this);null!==i&&this.container.css("width",i)}}),D=k(R,{createContainer:function(){var t=e(document.createElement("div")).attr({"class":"select2-container"}).html(["<a href='javascript:void(0)' class='select2-choice' tabindex='-1'>","   <span class='select2-chosen'>&#160;</span><abbr class='select2-search-choice-close'></abbr>","   <span class='select2-arrow' role='presentation'><b role='presentation'></b></span>","</a>","<label for='' class='select2-offscreen'></label>","<input class='select2-focusser select2-offscreen' type='text' aria-haspopup='true' role='button' />","<div class='select2-drop select2-display-none'>","   <div class='select2-search'>","       <label for='' class='select2-offscreen'></label>","       <input type='text' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' class='select2-input' role='combobox' aria-expanded='true'","       aria-autocomplete='list' />","   </div>","   <ul class='select2-results' role='listbox'>","   </ul>","</div>"].join(""));return t},enableInterface:function(){this.parent.enableInterface.apply(this,arguments)&&this.focusser.prop("disabled",!this.isInterfaceEnabled())},opening:function(){var s,i,n;this.opts.minimumResultsForSearch>=0&&this.showSearch(!0),this.parent.opening.apply(this,arguments),this.showSearchInput!==!1&&this.search.val(this.focusser.val()),this.opts.shouldFocusInput(this)&&(this.search.focus(),s=this.search.get(0),s.createTextRange?(i=s.createTextRange(),i.collapse(!1),i.select()):s.setSelectionRange&&(n=this.search.val().length,s.setSelectionRange(n,n))),""===this.search.val()&&this.nextSearchTerm!=t&&(this.search.val(this.nextSearchTerm),this.search.select()),this.focusser.prop("disabled",!0).val(""),this.updateResults(!0),this.opts.element.trigger(e.Event("select2-open"))},close:function(){this.opened()&&(this.parent.close.apply(this,arguments),this.focusser.prop("disabled",!1),this.opts.shouldFocusInput(this)&&this.focusser.focus())},focus:function(){this.opened()?this.close():(this.focusser.prop("disabled",!1),this.opts.shouldFocusInput(this)&&this.focusser.focus())},isFocused:function(){return this.container.hasClass("select2-container-active")},cancel:function(){this.parent.cancel.apply(this,arguments),this.focusser.prop("disabled",!1),this.opts.shouldFocusInput(this)&&this.focusser.focus()},destroy:function(){e("label[for='"+this.focusser.attr("id")+"']").attr("for",this.opts.element.attr("id")),this.parent.destroy.apply(this,arguments),I.call(this,"selection","focusser")},initContainer:function(){var t,i,n=this.container,o=this.dropdown,a=M();this.showSearch(this.opts.minimumResultsForSearch<0?!1:!0),this.selection=t=n.find(".select2-choice"),this.focusser=n.find(".select2-focusser"),t.find(".select2-chosen").attr("id","select2-chosen-"+a),this.focusser.attr("aria-labelledby","select2-chosen-"+a),this.results.attr("id","select2-results-"+a),this.search.attr("aria-owns","select2-results-"+a),this.focusser.attr("id","s2id_autogen"+a),i=e("label[for='"+this.opts.element.attr("id")+"']"),this.focusser.prev().text(i.text()).attr("for",this.focusser.attr("id"));var r=this.opts.element.attr("title");this.opts.element.attr("title",r||i.text()),this.focusser.attr("tabindex",this.elementTabIndex),this.search.attr("id",this.focusser.attr("id")+"_search"),this.search.prev().text(e("label[for='"+this.focusser.attr("id")+"']").text()).attr("for",this.search.attr("id")),this.search.on("keydown",this.bind(function(e){if(this.isInterfaceEnabled()&&229!=e.keyCode){if(e.which===A.PAGE_UP||e.which===A.PAGE_DOWN)return void g(e);switch(e.which){case A.UP:case A.DOWN:return this.moveHighlight(e.which===A.UP?-1:1),void g(e);case A.ENTER:return this.selectHighlighted(),void g(e);case A.TAB:return void this.selectHighlighted({noFocus:!0});case A.ESC:return this.cancel(e),void g(e)}}})),this.search.on("blur",this.bind(function(){document.activeElement===this.body.get(0)&&window.setTimeout(this.bind(function(){this.opened()&&this.search.focus()}),0)})),this.focusser.on("keydown",this.bind(function(e){if(this.isInterfaceEnabled()&&e.which!==A.TAB&&!A.isControl(e)&&!A.isFunctionKey(e)&&e.which!==A.ESC){if(this.opts.openOnEnter===!1&&e.which===A.ENTER)return void g(e);if(e.which==A.DOWN||e.which==A.UP||e.which==A.ENTER&&this.opts.openOnEnter){if(e.altKey||e.ctrlKey||e.shiftKey||e.metaKey)return;return this.open(),void g(e)}return e.which==A.DELETE||e.which==A.BACKSPACE?(this.opts.allowClear&&this.clear(),void g(e)):void 0}})),l(this.focusser),this.focusser.on("keyup-change input",this.bind(function(e){if(this.opts.minimumResultsForSearch>=0){if(e.stopPropagation(),this.opened())return;this.open()}})),t.on("mousedown touchstart","abbr",this.bind(function(e){this.isInterfaceEnabled()&&(this.clear(),m(e),this.close(),this.selection.focus())})),t.on("mousedown touchstart",this.bind(function(i){s(t),this.container.hasClass("select2-container-active")||this.opts.element.trigger(e.Event("select2-focus")),this.opened()?this.close():this.isInterfaceEnabled()&&this.open(),g(i)})),o.on("mousedown touchstart",this.bind(function(){this.opts.shouldFocusInput(this)&&this.search.focus()})),t.on("focus",this.bind(function(e){g(e)})),this.focusser.on("focus",this.bind(function(){this.container.hasClass("select2-container-active")||this.opts.element.trigger(e.Event("select2-focus")),this.container.addClass("select2-container-active")})).on("blur",this.bind(function(){this.opened()||(this.container.removeClass("select2-container-active"),this.opts.element.trigger(e.Event("select2-blur")))})),this.search.on("focus",this.bind(function(){this.container.hasClass("select2-container-active")||this.opts.element.trigger(e.Event("select2-focus")),this.container.addClass("select2-container-active")})),this.initContainerWidth(),this.opts.element.addClass("select2-offscreen"),this.setPlaceholder()},clear:function(t){var s=this.selection.data("select2-data");if(s){var i=e.Event("select2-clearing");if(this.opts.element.trigger(i),i.isDefaultPrevented())return;var n=this.getPlaceholderOption();this.opts.element.val(n?n.val():""),this.selection.find(".select2-chosen").empty(),this.selection.removeData("select2-data"),this.setPlaceholder(),t!==!1&&(this.opts.element.trigger({type:"select2-removed",val:this.id(s),choice:s}),this.triggerChange({removed:s}))}},initSelection:function(){if(this.isPlaceholderOptionSelected())this.updateSelection(null),this.close(),this.setPlaceholder();else{var e=this;this.opts.initSelection.call(null,this.opts.element,function(s){s!==t&&null!==s&&(e.updateSelection(s),e.close(),e.setPlaceholder(),e.nextSearchTerm=e.opts.nextSearchTerm(s,e.search.val()))})}},isPlaceholderOptionSelected:function(){var e;return this.getPlaceholder()===t?!1:(e=this.getPlaceholderOption())!==t&&e.prop("selected")||""===this.opts.element.val()||this.opts.element.val()===t||null===this.opts.element.val()},prepareOpts:function(){var t=this.parent.prepareOpts.apply(this,arguments),s=this;return"select"===t.element.get(0).tagName.toLowerCase()?t.initSelection=function(e,t){var i=e.find("option").filter(function(){return this.selected&&!this.disabled});t(s.optionToData(i))}:"data"in t&&(t.initSelection=t.initSelection||function(s,i){var n=s.val(),o=null;t.query({matcher:function(e,s,i){var r=a(n,t.id(i));return r&&(o=i),r},callback:e.isFunction(i)?function(){i(o)}:e.noop})}),t},getPlaceholder:function(){return this.select&&this.getPlaceholderOption()===t?t:this.parent.getPlaceholder.apply(this,arguments)},setPlaceholder:function(){var e=this.getPlaceholder();if(this.isPlaceholderOptionSelected()&&e!==t){if(this.select&&this.getPlaceholderOption()===t)return;this.selection.find(".select2-chosen").html(this.opts.escapeMarkup(e)),this.selection.addClass("select2-default"),this.container.removeClass("select2-allowclear")}},postprocessResults:function(e,t,s){var i=0,n=this;if(this.findHighlightableChoices().each2(function(e,t){return a(n.id(t.data("select2-data")),n.opts.element.val())?(i=e,!1):void 0}),s!==!1&&this.highlight(t===!0&&i>=0?i:0),t===!0){var o=this.opts.minimumResultsForSearch;o>=0&&this.showSearch(O(e.results)>=o)}},showSearch:function(t){this.showSearchInput!==t&&(this.showSearchInput=t,this.dropdown.find(".select2-search").toggleClass("select2-search-hidden",!t),this.dropdown.find(".select2-search").toggleClass("select2-offscreen",!t),e(this.dropdown,this.container).toggleClass("select2-with-searchbox",t))},onSelect:function(e,t){if(this.triggerSelect(e)){var s=this.opts.element.val(),i=this.data();this.opts.element.val(this.id(e)),this.updateSelection(e),this.opts.element.trigger({type:"select2-selected",val:this.id(e),choice:e}),this.nextSearchTerm=this.opts.nextSearchTerm(e,this.search.val()),this.close(),t&&t.noFocus||!this.opts.shouldFocusInput(this)||this.focusser.focus(),a(s,this.id(e))||this.triggerChange({added:e,removed:i})}},updateSelection:function(e){var s,i,n=this.selection.find(".select2-chosen");this.selection.data("select2-data",e),n.empty(),null!==e&&(s=this.opts.formatSelection(e,n,this.opts.escapeMarkup)),s!==t&&n.append(s),i=this.opts.formatSelectionCssClass(e,n),i!==t&&n.addClass(i),this.selection.removeClass("select2-default"),this.opts.allowClear&&this.getPlaceholder()!==t&&this.container.addClass("select2-allowclear")},val:function(){var e,s=!1,i=null,n=this,o=this.data();if(0===arguments.length)return this.opts.element.val();if(e=arguments[0],arguments.length>1&&(s=arguments[1]),this.select)this.select.val(e).find("option").filter(function(){return this.selected}).each2(function(e,t){return i=n.optionToData(t),!1}),this.updateSelection(i),this.setPlaceholder(),s&&this.triggerChange({added:i,removed:o});else{if(!e&&0!==e)return void this.clear(s);if(this.opts.initSelection===t)throw new Error("cannot call val() if initSelection() is not defined");this.opts.element.val(e),this.opts.initSelection(this.opts.element,function(e){n.opts.element.val(e?n.id(e):""),n.updateSelection(e),n.setPlaceholder(),s&&n.triggerChange({added:e,removed:o})})}},clearSearch:function(){this.search.val(""),this.focusser.val("")},data:function(e){var s,i=!1;return 0===arguments.length?(s=this.selection.data("select2-data"),s==t&&(s=null),s):(arguments.length>1&&(i=arguments[1]),void(e?(s=this.data(),this.opts.element.val(e?this.id(e):""),this.updateSelection(e),i&&this.triggerChange({added:e,removed:s})):this.clear(i)))}}),H=k(R,{createContainer:function(){var t=e(document.createElement("div")).attr({"class":"select2-container select2-container-multi"}).html(["<ul class='select2-choices'>","  <li class='select2-search-field'>","    <label for='' class='select2-offscreen'></label>","    <input type='text' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' class='select2-input'>","  </li>","</ul>","<div class='select2-drop select2-drop-multi select2-display-none'>","   <ul class='select2-results'>","   </ul>","</div>"].join(""));return t},prepareOpts:function(){var t=this.parent.prepareOpts.apply(this,arguments),s=this;return"select"===t.element.get(0).tagName.toLowerCase()?t.initSelection=function(e,t){var i=[];e.find("option").filter(function(){return this.selected&&!this.disabled}).each2(function(e,t){i.push(s.optionToData(t))}),t(i)}:"data"in t&&(t.initSelection=t.initSelection||function(s,i){var n=r(s.val(),t.separator),o=[];t.query({matcher:function(s,i,r){var c=e.grep(n,function(e){return a(e,t.id(r))}).length;return c&&o.push(r),c},callback:e.isFunction(i)?function(){for(var e=[],s=0;s<n.length;s++)for(var r=n[s],c=0;c<o.length;c++){var l=o[c];if(a(r,t.id(l))){e.push(l),o.splice(c,1);break}}i(e)}:e.noop})}),t},selectChoice:function(e){var t=this.container.find(".select2-search-choice-focus");t.length&&e&&e[0]==t[0]||(t.length&&this.opts.element.trigger("choice-deselected",t),t.removeClass("select2-search-choice-focus"),e&&e.length&&(this.close(),e.addClass("select2-search-choice-focus"),this.opts.element.trigger("choice-selected",e)))},destroy:function(){e("label[for='"+this.search.attr("id")+"']").attr("for",this.opts.element.attr("id")),this.parent.destroy.apply(this,arguments),I.call(this,"searchContainer","selection")},initContainer:function(){var t,s=".select2-choices";this.searchContainer=this.container.find(".select2-search-field"),this.selection=t=this.container.find(s);var i=this;this.selection.on("click",".select2-search-choice:not(.select2-locked)",function(){i.search[0].focus(),i.selectChoice(e(this))}),this.search.attr("id","s2id_autogen"+M()),this.search.prev().text(e("label[for='"+this.opts.element.attr("id")+"']").text()).attr("for",this.search.attr("id")),this.search.on("input paste",this.bind(function(){this.search.attr("placeholder")&&0==this.search.val().length||this.isInterfaceEnabled()&&(this.opened()||this.open())})),this.search.attr("tabindex",this.elementTabIndex),this.keydowns=0,this.search.on("keydown",this.bind(function(e){if(this.isInterfaceEnabled()){++this.keydowns;var s=t.find(".select2-search-choice-focus"),i=s.prev(".select2-search-choice:not(.select2-locked)"),n=s.next(".select2-search-choice:not(.select2-locked)"),o=f(this.search);if(s.length&&(e.which==A.LEFT||e.which==A.RIGHT||e.which==A.BACKSPACE||e.which==A.DELETE||e.which==A.ENTER)){var a=s;return e.which==A.LEFT&&i.length?a=i:e.which==A.RIGHT?a=n.length?n:null:e.which===A.BACKSPACE?this.unselect(s.first())&&(this.search.width(10),a=i.length?i:n):e.which==A.DELETE?this.unselect(s.first())&&(this.search.width(10),a=n.length?n:null):e.which==A.ENTER&&(a=null),this.selectChoice(a),g(e),void(a&&a.length||this.open())}if((e.which===A.BACKSPACE&&1==this.keydowns||e.which==A.LEFT)&&0==o.offset&&!o.length)return this.selectChoice(t.find(".select2-search-choice:not(.select2-locked)").last()),void g(e);if(this.selectChoice(null),this.opened())switch(e.which){case A.UP:case A.DOWN:return this.moveHighlight(e.which===A.UP?-1:1),void g(e);case A.ENTER:return this.selectHighlighted(),void g(e);case A.TAB:return this.selectHighlighted({noFocus:!0}),void this.close();case A.ESC:return this.cancel(e),void g(e)}if(e.which!==A.TAB&&!A.isControl(e)&&!A.isFunctionKey(e)&&e.which!==A.BACKSPACE&&e.which!==A.ESC){if(e.which===A.ENTER){if(this.opts.openOnEnter===!1)return;if(e.altKey||e.ctrlKey||e.shiftKey||e.metaKey)return}this.open(),(e.which===A.PAGE_UP||e.which===A.PAGE_DOWN)&&g(e),e.which===A.ENTER&&g(e)}}})),this.search.on("keyup",this.bind(function(){this.keydowns=0,this.resizeSearch()})),this.search.on("blur",this.bind(function(t){this.container.removeClass("select2-container-active"),this.search.removeClass("select2-focused"),this.selectChoice(null),this.opened()||this.clearSearch(),t.stopImmediatePropagation(),this.opts.element.trigger(e.Event("select2-blur"))})),this.container.on("click",s,this.bind(function(t){this.isInterfaceEnabled()&&(e(t.target).closest(".select2-search-choice").length>0||(this.selectChoice(null),this.clearPlaceholder(),this.container.hasClass("select2-container-active")||this.opts.element.trigger(e.Event("select2-focus")),this.open(),this.focusSearch(),t.preventDefault()))})),this.container.on("focus",s,this.bind(function(){this.isInterfaceEnabled()&&(this.container.hasClass("select2-container-active")||this.opts.element.trigger(e.Event("select2-focus")),this.container.addClass("select2-container-active"),this.dropdown.addClass("select2-drop-active"),this.clearPlaceholder())})),this.initContainerWidth(),this.opts.element.addClass("select2-offscreen"),this.clearSearch()},enableInterface:function(){this.parent.enableInterface.apply(this,arguments)&&this.search.prop("disabled",!this.isInterfaceEnabled())},initSelection:function(){if(""===this.opts.element.val()&&""===this.opts.element.text()&&(this.updateSelection([]),this.close(),this.clearSearch()),this.select||""!==this.opts.element.val()){var e=this;this.opts.initSelection.call(null,this.opts.element,function(s){s!==t&&null!==s&&(e.updateSelection(s),e.close(),e.clearSearch())})}},clearSearch:function(){var e=this.getPlaceholder(),s=this.getMaxSearchWidth();e!==t&&0===this.getVal().length&&this.search.hasClass("select2-focused")===!1?(this.search.val(e).addClass("select2-default"),this.search.width(s>0?s:this.container.css("width"))):this.search.val("").width(10)},clearPlaceholder:function(){this.search.hasClass("select2-default")&&this.search.val("").removeClass("select2-default")},opening:function(){this.clearPlaceholder(),this.resizeSearch(),this.parent.opening.apply(this,arguments),this.focusSearch(),""===this.search.val()&&this.nextSearchTerm!=t&&(this.search.val(this.nextSearchTerm),this.search.select()),this.updateResults(!0),this.opts.shouldFocusInput(this)&&this.search.focus(),this.opts.element.trigger(e.Event("select2-open"))},close:function(){this.opened()&&this.parent.close.apply(this,arguments)},focus:function(){this.close(),this.search.focus()},isFocused:function(){return this.search.hasClass("select2-focused")},updateSelection:function(t){var s=[],i=[],o=this;e(t).each(function(){n(o.id(this),s)<0&&(s.push(o.id(this)),i.push(this))}),t=i,this.selection.find(".select2-search-choice").remove(),e(t).each(function(){o.addSelectedChoice(this)}),o.postprocessResults()},tokenize:function(){var e=this.search.val();e=this.opts.tokenizer.call(this,e,this.data(),this.bind(this.onSelect),this.opts),null!=e&&e!=t&&(this.search.val(e),e.length>0&&this.open())},onSelect:function(e,s){this.triggerSelect(e)&&""!==e.text&&(this.addSelectedChoice(e),this.opts.element.trigger({type:"selected",val:this.id(e),choice:e}),this.nextSearchTerm=this.opts.nextSearchTerm(e,this.search.val()),this.clearSearch(),this.updateResults(),(this.select||!this.opts.closeOnSelect)&&this.postprocessResults(e,!1,this.opts.closeOnSelect===!0),this.opts.closeOnSelect?(this.close(),this.search.width(10)):this.countSelectableResults()>0?(this.search.width(10),this.resizeSearch(),this.getMaximumSelectionSize()>0&&this.val().length>=this.getMaximumSelectionSize()?this.updateResults(!0):this.nextSearchTerm!=t&&(this.search.val(this.nextSearchTerm),this.updateResults(),this.search.select()),this.positionDropdown()):(this.close(),this.search.width(10)),this.triggerChange({added:e}),s&&s.noFocus||this.focusSearch())},cancel:function(){this.close(),this.focusSearch()},addSelectedChoice:function(s){var i,n,o=!s.locked,a=e("<li class='select2-search-choice'>    <div></div>    <a href='#' class='select2-search-choice-close' tabindex='-1'></a></li>"),r=e("<li class='select2-search-choice select2-locked'><div></div></li>"),c=o?a:r,l=this.id(s),h=this.getVal();i=this.opts.formatSelection(s,c.find("div"),this.opts.escapeMarkup),i!=t&&c.find("div").replaceWith("<div>"+i+"</div>"),n=this.opts.formatSelectionCssClass(s,c.find("div")),n!=t&&c.addClass(n),o&&c.find(".select2-search-choice-close").on("mousedown",g).on("click dblclick",this.bind(function(t){this.isInterfaceEnabled()&&(this.unselect(e(t.target)),this.selection.find(".select2-search-choice-focus").removeClass("select2-search-choice-focus"),g(t),this.close(),this.focusSearch())})).on("focus",this.bind(function(){this.isInterfaceEnabled()&&(this.container.addClass("select2-container-active"),this.dropdown.addClass("select2-drop-active"))})),c.data("select2-data",s),c.insertBefore(this.searchContainer),h.push(l),this.setVal(h)},unselect:function(t){var s,i,o=this.getVal();if(t=t.closest(".select2-search-choice"),0===t.length)throw"Invalid argument: "+t+". Must be .select2-search-choice";if(s=t.data("select2-data")){var a=e.Event("select2-removing");if(a.val=this.id(s),a.choice=s,this.opts.element.trigger(a),a.isDefaultPrevented())return!1;for(;(i=n(this.id(s),o))>=0;)o.splice(i,1),this.setVal(o),this.select&&this.postprocessResults();return t.remove(),this.opts.element.trigger({type:"select2-removed",val:this.id(s),choice:s}),this.triggerChange({removed:s}),!0}},postprocessResults:function(e,t,s){var i=this.getVal(),o=this.results.find(".select2-result"),a=this.results.find(".select2-result-with-children"),r=this;o.each2(function(e,t){var s=r.id(t.data("select2-data"));n(s,i)>=0&&(t.addClass("select2-selected"),t.find(".select2-result-selectable").addClass("select2-selected"))}),a.each2(function(e,t){t.is(".select2-result-selectable")||0!==t.find(".select2-result-selectable:not(.select2-selected)").length||t.addClass("select2-selected")}),-1==this.highlight()&&s!==!1&&r.highlight(0),!this.opts.createSearchChoice&&!o.filter(".select2-result:not(.select2-selected)").length>0&&(!e||e&&!e.more&&0===this.results.find(".select2-no-results").length)&&x(r.opts.formatNoMatches,"formatNoMatches")&&this.results.append("<li class='select2-no-results'>"+T(r.opts.formatNoMatches,r.opts.element,r.search.val())+"</li>")},getMaxSearchWidth:function(){return this.selection.width()-c(this.search)},resizeSearch:function(){var e,t,s,i,n,o=c(this.search);e=v(this.search)+10,t=this.search.offset().left,s=this.selection.width(),i=this.selection.offset().left,n=s-(t-i)-o,e>n&&(n=s-o),40>n&&(n=s-o),0>=n&&(n=e),this.search.width(Math.floor(n))},getVal:function(){var e;return this.select?(e=this.select.val(),null===e?[]:e):(e=this.opts.element.val(),r(e,this.opts.separator))},setVal:function(t){var s;this.select?this.select.val(t):(s=[],e(t).each(function(){n(this,s)<0&&s.push(this)}),this.opts.element.val(0===s.length?"":s.join(this.opts.separator)))},buildChangeDetails:function(e,t){for(var t=t.slice(0),e=e.slice(0),s=0;s<t.length;s++)for(var i=0;i<e.length;i++)a(this.opts.id(t[s]),this.opts.id(e[i]))&&(t.splice(s,1),s>0&&s--,e.splice(i,1),i--);return{added:t,removed:e}},val:function(s,i){var n,o=this;if(0===arguments.length)return this.getVal();if(n=this.data(),n.length||(n=[]),!s&&0!==s)return this.opts.element.val(""),this.updateSelection([]),this.clearSearch(),void(i&&this.triggerChange({added:this.data(),removed:n}));if(this.setVal(s),this.select)this.opts.initSelection(this.select,this.bind(this.updateSelection)),i&&this.triggerChange(this.buildChangeDetails(n,this.data()));else{if(this.opts.initSelection===t)throw new Error("val() cannot be called if initSelection() is not defined");this.opts.initSelection(this.opts.element,function(t){var s=e.map(t,o.id);o.setVal(s),o.updateSelection(t),o.clearSearch(),i&&o.triggerChange(o.buildChangeDetails(n,o.data()))})}this.clearSearch()},onSortStart:function(){if(this.select)throw new Error("Sorting of elements is not supported when attached to <select>. Attach to <input type='hidden'/> instead.");this.search.width(0),this.searchContainer.hide()},onSortEnd:function(){var t=[],s=this;this.searchContainer.show(),this.searchContainer.appendTo(this.searchContainer.parent()),this.resizeSearch(),this.selection.find(".select2-search-choice").each(function(){t.push(s.opts.id(e(this).data("select2-data")))}),this.setVal(t),this.triggerChange()},data:function(t,s){var i,n,o=this;return 0===arguments.length?this.selection.children(".select2-search-choice").map(function(){return e(this).data("select2-data")}).get():(n=this.data(),t||(t=[]),i=e.map(t,function(e){return o.opts.id(e)}),this.setVal(i),this.updateSelection(t),this.clearSearch(),void(s&&this.triggerChange(this.buildChangeDetails(n,this.data()))))}}),e.fn.select2=function(){var s,i,o,a,r,c=Array.prototype.slice.call(arguments,0),l=["val","destroy","opened","open","close","focus","isFocused","container","dropdown","onSortStart","onSortEnd","enable","disable","readonly","positionDropdown","data","search"],h=["opened","isFocused","container","dropdown"],u=["val","data"],d={search:"externalSearch"};return this.each(function(){if(0===c.length||"object"==typeof c[0])s=0===c.length?{}:e.extend({},c[0]),s.element=e(this),"select"===s.element.get(0).tagName.toLowerCase()?r=s.element.prop("multiple"):(r=s.multiple||!1,"tags"in s&&(s.multiple=r=!0)),i=r?new window.Select2["class"].multi:new window.Select2["class"].single,i.init(s);else{if("string"!=typeof c[0])throw"Invalid arguments to select2 plugin: "+c;if(n(c[0],l)<0)throw"Unknown method: "+c[0];if(a=t,i=e(this).data("select2"),i===t)return;if(o=c[0],"container"===o?a=i.container:"dropdown"===o?a=i.dropdown:(d[o]&&(o=d[o]),a=i[o].apply(i,c.slice(1))),n(c[0],h)>=0||n(c[0],u)>=0&&1==c.length)return!1}}),a===t?this:a},e.fn.select2.defaults={width:"copy",loadMorePadding:0,closeOnSelect:!0,openOnEnter:!0,containerCss:{},dropdownCss:{},containerCssClass:"",dropdownCssClass:"",formatResult:function(e,t,s,i){var n=[];return b(e.text,s.term,n,i),n.join("")},formatSelection:function(e,s,i){return e?i(e.text):t},sortResults:function(e){return e},formatResultCssClass:function(e){return e.css},formatSelectionCssClass:function(){return t},minimumResultsForSearch:0,minimumInputLength:0,maximumInputLength:null,maximumSelectionSize:0,id:function(e){return e==t?null:e.id},matcher:function(e,t){return i(""+t).toUpperCase().indexOf(i(""+e).toUpperCase())>=0},separator:",",tokenSeparators:[],tokenizer:P,escapeMarkup:C,blurOnChange:!1,selectOnBlur:!1,adaptContainerCssClass:function(e){return e},adaptDropdownCssClass:function(){return null},nextSearchTerm:function(){return t},searchInputPlaceholder:"",createSearchChoicePosition:"top",shouldFocusInput:function(e){var t="ontouchstart"in window||navigator.msMaxTouchPoints>0;return t&&e.opts.minimumResultsForSearch<0?!1:!0}},e.fn.select2.locales=[],e.fn.select2.locales.en={formatMatches:function(e){return 1===e?"One result is available, press enter to select it.":e+" results are available, use up and down arrow keys to navigate."},formatNoMatches:function(){return"No matches found"},formatAjaxError:function(){return"Loading failed"},formatInputTooShort:function(e,t){var s=t-e.length;return"Please enter "+s+" or more character"+(1==s?"":"s")},formatInputTooLong:function(e,t){var s=e.length-t;return"Please delete "+s+" character"+(1==s?"":"s")},formatSelectionTooBig:function(e){return"You can only select "+e+" item"+(1==e?"":"s")},formatLoadMore:function(){return"Loading more results…"},formatSearching:function(){return"Searching…"}},e.extend(e.fn.select2.defaults,e.fn.select2.locales.en),e.fn.select2.ajaxDefaults={transport:e.ajax,params:{type:"GET",cache:!1,dataType:"json"}},window.Select2={query:{ajax:S,local:y,tags:E},util:{debounce:u,markMatch:b,escapeMarkup:C,stripDiacritics:i},"class":{"abstract":R,single:D,multi:H}}}}(jQuery);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"client":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/client/index.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var $;
module.watch(require("jquery"), {
  "*": function (v) {
    $ = v;
  }
}, 0);
var bootstrap;
module.watch(require("../../ui/2.js"), {
  "default": function (v) {
    bootstrap = v;
  }
}, 1);
module.watch(require("./routes.js"));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"routes.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/client/routes.js                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("../../ui/layouts/main.js"));
Router.route("/", {
  name: "stylometry",
  onBeforeAction: function () {
    module.watch(require("../../ui/pages/stylometry.js"));
    this.render("stylometrytable", {
      to: "stylooption"
    });
    this.next();
  }
});
Router.route("/sresults", {
  name: "sresults",
  onBeforeAction: function () {
    module.watch(require("../../ui/pages/sresults.js"));
    this.render("stylometrytable", {
      to: "stylooption"
    });
    this.next();
  }
});
Router.route("/(.*)", {
  onBeforeAction: function () {
    Router.go("/"), this.next();
  }
});
Router.configure({
  layoutTemplate: "mainlayout"
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"client":{"main.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/main.js                                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("/imports/startup/client"));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".html",
    ".css"
  ]
});
var exports = require("/client/main.js");