var require = meteorInstall({"imports":{"startup":{"server":{"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                   //
// imports/startup/server/index.js                                                                   //
//                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                     //
module.watch(require("./register-api.js"));
///////////////////////////////////////////////////////////////////////////////////////////////////////

},"register-api.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                   //
// imports/startup/server/register-api.js                                                            //
//                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                     //
module.watch(require("../../api/stylometry.js"));
///////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"api":{"stylometry.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                   //
// imports/api/stylometry.js                                                                         //
//                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                     //
module.export({
  Stylo: () => Stylo,
  Author: () => Author,
  Authors: () => Authors
});
let Mongo;
module.watch(require("meteor/mongo"), {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let tokenizer;
module.watch(require("@knod/sbd"), {
  default(v) {
    tokenizer = v;
  }

}, 1);
const Stylo = new Mongo.Collection("stylo");
const Author = new Mongo.Collection("author");
const Authors = new Mongo.Collection("authors");
const personalPronoun = ["ego", "mei", "mihi", "me", "tu", "tui", "tibi", "te", "nos", "nostri", "nobis", "vos", "vestri", "vobis", "uos", "uestri", "uobis", "mi", "nostrum", "vestrum", "vostrum", "vostri", "uestrum", "uostrum", "uostri", "egoque", "meique", "mihique", "meque", "tuque", "tuique", "tibique", "teque", "nosque", "nostrique", "nobisque", "vosque", "vestrique", "vobisque", "uosque", "uestrique", "uobisque", "mique", "nostrumque", "vestrumque", "vostrumque", "vostrique", "uestrumque", "uostrumque", "uostrique"];
const demonstrativePronoun = ["hic", "hunc", "huius", "huic", "hoc", "haec", "hanc", "hac", "hi", "hos", "horum", "his", "hae", "has", "harum", "ho", "ha", "ille", "illum", "illius", "illi", "illo", "illa", "illam", "illud", "illos", "illorum", "illis", "illas", "illarum", "illae", "is", "eum", "eius", "ei", "eo", "ea", "eam", "id", "ii", "eos", "eorum", "eis", "iis", "eae", "eas", "earum", "illic", "illaec", "illuc", "illic", "illoc", "illunc", "illanc", "illac", "hicque", "huncque", "huiusque", "huicque", "hocque", "haecque", "hancque", "hacque", "hique", "hosque", "horumque", "hisque", "haeque", "hasque", "harumque", "hoque", "haque", "illeque", "illumque", "illiusque", "illique", "illoque", "illaque", "illamque", "illudque", "illosque", "illorumque", "illisque", "illasque", "illarumque", "illaeque", "isque", "eumque", "eiusque", "eique", "eoque", "eaque", "eamque", "idque", "iique", "eosque", "eorumque", "eisque", "iisque", "eaeque", "easque", "earumque", "illicque", "illaecque", "illucque", "illicque", "illocque", "illuncque", "illancque", "illacque"];
const reflexivePronoun = ["se", "sibi", "sese", "sui", "seque", "sibique", "seseque", "suique"];
const conditionalClauses = ["si", "nisi", "quodsi", "sin", "dummodo"];
const conjunctions = ["et", "atque", "ac", "aut", "vel", "uel", "at", "autem", "sed", "postquam", "ast", "donec", "dum", "dummodo", "enim", "etiam", "etiamtum", "etiamtunc", "etenim", "veruntamen", "ueruntamen", "uerumtamen", "verumtamen", "utrumnam", "set", "quocirca", "quia", "quamquam", "quanquam", "nam", "namque", "nanque", "nempe", "dumque", "etiamque", "quiaque"];
const conjunctionsIn = ["que"];
const idem = ["idem", "eundem", "eiusdem", "eidem", "eodem", "eadem", "eandem", "iidem", "eosdem", "eorundem", "eisdem", "iisdem", "eaedem", "eedem", "easdem", "earumdem", "isdem", "isdemque", "idemque", "eundemque", "eiusdemque", "eidemque", "eodemque", "eademque", "eandemque", "iidemque", "eosdemque", "eorundemque", "eisdemque", "iisdemque", "eaedemque", "easdemque", "earundemque"];
const ipse = ["ipse", "ipsum", "ipsius", "ipsi", "ipso", "ipsa", "ipsam", "ipsos", "ipsorum", "ipsas", "ipsarum", "ipseque", "ipsumque", "ipsiusque", "ipsique", "ipsoque", "ipsaque", "ipsamque", "ipsosque", "ipsorumque", "ipsasque", "ipsarumque"];
const indef = ["quidam", "quendam", "cuiusdam", "cuidam", "quodam", "quedam", "quandam", "quodam", "quoddam", "quosdam", "quorundam", "quibusdam", "quasdam", "quarundam"];
const iste = ["iste", "istum", "istius", "isti", "isto", "ista", "istam", "istud", "istos", "istorum", "istis", "istas", "istarum", "iste", "istum", "istius", "isti", "isto", "ista", "istam", "istud", "istos", "istorum", "istis", "istas", "istarum", "isteque", "istumque", "istiusque", "istique", "istoque", "istaque", "istamque", "istudque", "istosque", "istorumque", "istisque", "istasque", "istarumque"];
const quidam = ["quidam", "quendam", "cuiusdam", "cuidam", "quodam", "quaedam", "quandam", "quodam", "quoddam", "quosdam", "quorundam", "quibusdam", "quasdam", "quarundam", "quiddam", "quoddam", "quadam", "quidamque", "quendamque", "cuiusdamque", "cuidamque", "quodamque", "quaedamque", "quandamque", "quodamque", "quoddamque", "quosdamque", "quorundamque", "quibusdamque", "quasdamque", "quarundamque", "quiddamque", "quoddamque", "quadamque"];
const consonant = ["b", "c", "d", "f", "g", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "y", "z"];
const alius = ["alius", "alium", "alii", "alio", "alia", "aliam", "aliud", "alios", "aliorum", "aliis", "aliae", "alias", "aliarum", "aliusque", "aliumque", "aliique", "alioque", "aliaque", "aliamque", "aliudque", "aliosque", "aliorumque", "aliisque", "aliaeque", "aliasque", "aliarumque"];
const priu = ["priusquam", "prius quam"];
const anteq = ["antequam", "ante quam"];
const quom = ["quominus", "quo minus"];
const dum = ["dum", "dumque"];
const quin = ["quin"];
const o = ["o"];
const atque = ["atque"];
const ut = ["ut", "utei", "utque"];
const gerund = ["ndum", "ndus", "ndorum", "ndarum", "ndumque", "ndusque", "ndorumque", "ndarumque"];
const vocatives = ["e", "i", "a", "u", "ae", "es", "um", "us"];
const prepositions = ["ab", "abs", "e", "ex", "apud", "de", "cis", "erga", "inter", "ob", "penes", "per", "praeter", "propter", "trans", "absque", "pro", "tenus", "sub", "aque", "abque", "eque", "exque", "apudque", "deque", "cisque", "ergaque", "interque", "obque", "penesque", "perque", "praeterque", "propterque", "transque", "proque", "tenusque", "subque"];
const cumClauses = ["a", "e", "i", "o", "u", "is", "ibus", "ebus", "obus", "ubus"];
const relatives = ["qui", "cuius", "cui", "quem", "quo", "quae", "quam", "qua", "quod", "quorum", "quibus", "quos", "quarum", "quas"];
const abbreviations = ["Caes", "Iul", "Plur", "Aug", "Prid", "Id", "Kal", "Kl", "Non", "Med", "Ex", "In", "Ian", "Feb", "Febr", "Mart", "Apr", "Iun", "Mai", "Nov", "Oct", "Sept", "Dec", "Fin", "Cos", "Coss", "Pr", "Sext", "Ann", "Sal", "Imp", "Tr", "Pl", "Leg", "Aed", "Cens", "Agr", "Ant", "Aur", "Cn", "Scrib", "Fab", "Pom", "Quir", "Pup", "An", "Ter", "Op", "Germ", "Gn", "Ap", "M’", "Mai", "Mam", "Men", "Min", "Oct", "Opet", "Pro", "Quint", "Quinct", "Sec", "Ser", "Sert", "Serv", "Seq", "Sex", "Sp", "St", "Ti", "Tib", "Vol", "Vop", "Aem", "Aim", "Rom", "Pont", "Imp", "Max", "Coll", "Ob ", "Lib", "Cir", "Ver", "III", "Eq", "eq", "I", "II", "III", "IIII", "IV", "V", "VI", "VII", "VIII", "VIIII", "IX", "X", "XI", "XII", "XIII", "XIIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XVIIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXVIIII", "XXIX", "XXX", "XXXI", "XXXII", "XXXIII", "XXXIIII", "XXXIV", "XXXV", "XXXVI", "XXXVII", "XXXVIII", "XXXVIIII", "XXXIX", "XXXX", "XL", "XLI", "XLII", "XLIII", "XLIIII", "XLIV", "XLV", "XLVI", "XLVII", "XLVIII", "XLVIIII", "XLIX", "L", "LI", "LII", "LIII", "LIIII", "LIV", "LV", "LVI", "LVII", "LVIII", "LVIIII", "LIX", "LX", "LXI", "LXII", "LXIII", "LXIIII", "LXIV", "LXV", "LXVI", "LXVII", "LXVIII", "LXVIIII", "LXIX", "LXX", "LXXI", "LXXII", "LXXIII", "LXXIIII", "LXXIV", "LXXV", "LXXVI", "LXXVII", "LXXVIII", "LXXVIIII", "LXXIX", "LXXX", "LXXXI", "LXXXII", "LXXXIII", "LXXXIIII", "LXXXIV", "LXXXV", "LXXXVI", "LXXXVII", "LXXXVIII", "LXXXVIIII", "LXXXIX", "LXXXX", "XC", "XCI", "XCII", "XCIII", "XCIIII", "XCIV", "XCV", "XCVI", "XCVII", "XCVIII", "XCVIIII", "XCIX", "C", "CC", "CCC", "CCCC", "CD", "D", "DC", "DCC", "DCCC", "DCCCC", "CM", "M", "MM", "MMM", "MMMM"];

const occurences = (str, words) => {
  const end = "\\b";
  const regex = end + "(" + words.join("|") + ")" + end;
  const re = new RegExp(regex, "gi");

  if (str.match(re)) {
    return str.match(re).length;
  } else {
    return 0;
  }
};

const multiOccurence = (str, listArray) => {
  str = str.toLowerCase().split(" ");
  let count = 0;

  for (let i = 0; i < str.length; i++) {
    if (listArray.includes(str[i]) || str[i].endsWith("que")) {
      count += 1;
    }
  }

  return count;
};

const startWith = (str, list) => {
  for (let i = 0; i < list.length; i++) {
    if (str.startsWith(list[i])) return true;
  }
};

const endWith = (str, list) => {
  let count = 0;

  for (var i = 0; i < list.length; i++) {
    if (str.endsWith(list[i])) {
      count += 1;
    }
  }

  return count;
};

const interrogative = str => {
  let count = 0;
  str = str.split(" ");
  const l = str.length;

  for (let i = 0; i < l; i++) {
    if (str[i].indexOf("?") != -1) {
      count += 1;
    }
  }

  return count;
};

const countWords = str => {
  str = str.replace();
  return str.trim().split(/\s+/).length;
};

const sigFig = num => {
  if (num) {
    return Number(num.toFixed(5));
  } else {
    return 0;
  }
};

function startf(a1, str) {
  const consonant = ["b", "c", "d", "f", "g", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "y", "z"];
  let count = 0;
  const string = a1.toLowerCase().split(" ");
  const l = string.length;

  for (let i = 0; i < l; i++) {
    let p = (i + 1) % l;

    if (string[i] === "atque" && startWith(string[p], consonant)) {
      count += 1;
    }
  }

  return count;
}

const charCount = str => {
  str = str.replace(/[^a-zA-Z0-9]+/gi, "").replace(/\s/g, "");
  return str.length;
};

const multiSplit = (str, delimeters) => {
  const result = [str];
  if (typeof delimeters == "string") delimeters = [delimeters];

  while (delimeters.length > 0) {
    for (let i = 0; i < result.length; i++) {
      const tempSplit = result[i].split(delimeters[0]);
      result = result.slice(0, i).concat(tempSplit).concat(result.slice(i + 1));
    }

    delimeters.shift();
  }

  return result;
};

const relative = (a1, list) => {
  function findall(regex_pattern, string_) {
    let output_list = [];

    while (true) {
      let a_match = regex_pattern.exec(string_);

      if (a_match) {
        delete a_match.input;
        output_list.push(a_match);
      } else {
        break;
      }
    }

    return output_list;
  }

  function regexIndexOf(text, reg, y) {
    const ree = new RegExp("\\b(" + reg + ")\\b", "i");
    let indexInSuffix;

    if (reg === "." || reg === "," || reg === ":" || reg === "!") {
      indexInSuffix = text.indexOf(reg, y);
    } else {
      ifIndex = text.slice(y).match(ree);

      if (ifIndex) {
        indexInSuffix = ifIndex.index + y;
      } else {
        indexInSuffix = -1;
      }
    }

    return indexInSuffix;
  }

  let count = 0;
  let sentCount = 0;
  let ttArray = 0;
  let stringCon = [];
  let relativeArray = [];
  const l = a1.length;

  for (let i = 0; i < l; i++) {
    const occ = occurences(a1[i], list);

    if (a1[i].indexOf("!") > -1 || a1[i].indexOf(".") > -1) {
      sentCount += 1;
    }

    if (a1[i].indexOf("!") > -1 && occ >= 1 || a1[i].indexOf(".") > -1 && occ >= 1) {
      const re = new RegExp("\\b(" + list.join("|") + ")\\b", "gi");
      const allArray = findall(re, a1[i]);
      const mergeArray = list.concat([",", ":", ".", "!", ";"]);

      for (let d = 0; d < allArray.length; d++) {
        let foundIndexes = mergeArray.map(x => regexIndexOf(a1[i], x, allArray[d].index + 1)).filter(x => x !== -1 && x !== allArray[d].index);
        foundIndexes = Math.min(...foundIndexes);
        const str = a1[i].slice(allArray[d].index, foundIndexes);
        relativeArray.push(str);
      }

      count += 1;
    }
  }

  const finalString = relativeArray.toString();
  const stringCount = finalString.replace(/[^a-zA-Z0-9]+/gi, "").replace(/\s/g, "");
  return {
    relative: count / sentCount,
    mean: stringCount.length / relativeArray.length
  };
};

const removePunct = str => {
  return str.replace(/[^a-zA-Z0-9\n\r]+/gi, " ");
};

const endf = (string, str, a2) => {
  let count = 0;
  string = removePunct(string);
  string = string.split(" ");

  for (let i = 0; i < string.length; i++) {
    let p = (i + 1) % string.length;
    let first = string[i].toLowerCase();
    let second = string[p];

    if (first === "o" && endWith(second, a2)) {
      count += 1;
    }
  }

  return count;
};

const cumClause = (a1, a2) => {
  a1 = removePunct(a1);
  const str = "cum";
  let count = 0;
  const string = a1.toLowerCase().split(" ");
  const l = string.length;

  for (let i = 0; i < l; i++) {
    let p = (i + 1) % l;

    if (string[i] === str && endWith(string[p], a2) !== 1) {
      count += 1;
    }
  }

  return count;
};

const endGerund = (a1, a2) => {
  let count = 0;
  a1 = removePunct(a1);
  const string = a1.toLowerCase().split(" ");
  const l = string.length;

  for (let i = 0; i < l; i++) {
    if (endWith(string[i], a2) && string[i] !== "nondum") {
      count += 1;
    }
  }

  return count;
};

const superlatives = str => {
  let count = 0;
  str = str.toLowerCase();
  str = str.split(" ");
  const substring = "issim";
  const l = str.length;

  for (let i = 0; i < l; i++) {
    if (str[i].includes(substring)) {
      count += 1;
    }
  }

  return count;
};

const topNgrams = str => {
  function updateFrequency(frequencies, word) {
    frequencies[word] = (frequencies[word] || 0) + 1;
    return frequencies;
  }

  const n = 5;
  let words = str.replace(/[^a-zA-Z0-9]+/gi, " ").trim().split(/\s+/);
  let frequencies = {};
  let orderedFrequencies = [];
  let word;
  let frequency;
  let result = [];
  words.reduce(updateFrequency, frequencies);

  for (word in frequencies) {
    frequency = frequencies[word];
    (orderedFrequencies[frequency] = orderedFrequencies[frequency] || []).push(word);
  }

  while (result.length < n && orderedFrequencies.length) {
    (words = orderedFrequencies.pop()) && (result = result.concat(words));
  }

  return result.slice(0, n);
};

const meanSentence = a1 => {
  let five = 0;

  for (let de = 0; de < a1.length; de++) {
    const strip = a1[de].replace(/[^a-zA-Z0-9]+/gi, "").trim();
    five += strip.length;
  }

  return five / a1.length;
};

const listO = [{
  feature: "p1",
  list: "personalPronoun"
}, {
  feature: "p2",
  list: "demonstrativePronoun"
}, {
  feature: "p3",
  list: "quidam"
}, {
  feature: "p4",
  list: "reflexivePronoun"
}, {
  feature: "p5",
  list: "iste"
}, {
  feature: "n1",
  list: "alius"
}, {
  feature: "n2",
  list: "ipse"
}, {
  feature: "n3",
  list: "idem"
}, {
  feature: "s6",
  list: "priu"
}, {
  feature: "s5",
  list: "anteq"
}, {
  feature: "s4",
  list: "quom"
}, {
  feature: "s7",
  list: "dum"
}, {
  feature: "s3",
  list: "quin"
}, {
  feature: "m4",
  list: "ut"
}, {
  feature: "s1",
  list: "conditionalClauses"
}, {
  feature: "m7",
  list: "prepositions"
}];
const listF = [{
  feature: "m1",
  list: "",
  name: "interrogative(book)"
}, {
  feature: "m3",
  list: "",
  name: "superlatives(book)"
}, {
  feature: "c2",
  name: "startf(book, atque)"
}, {
  feature: "s8",
  list: "relatives",
  name: "relative(sentences, relatives)"
}, {
  feature: "m5",
  name: "endGerund(book, gerund)"
}, {
  feature: "s2",
  name: "cumClause(book, cumClauses)"
}];
const listC = [{
  feature: "c1",
  name: "multiOccurence(ngramRemoved, conjunctions, conjunctionsIn)"
}, {
  feature: "m2",
  name: "endf(ngramRemoved, o, vocatives)"
}];
Meteor.methods({
  stylometryf(data, options) {
    return Promise.asyncApply(() => {
      const l = data.author.length;
      let result = [];

      for (let i = 0; i < l; i++) {
        const author = data.author[i];
        const text = data.text[i];
        const sbook = data.book[i];
        const query = {
          author: author
        };

        if (text) {
          query.text = text;
        }

        if (sbook) {
          query.book = sbook;
        }

        let tempCursor;

        if (options.selectAll) {
          tempCursor = Stylo.find().fetch();
        } else {
          tempCursor = Stylo.find(query).fetch();
        }

        const fieldName = "ngram";

        for (let doc of tempCursor) {
          let gramr = {};
          let candidate = doc;
          const featureArray = options.feature;
          let slice = fieldName.split(".");

          for (let i = 0; i < slice.length; i++) {
            candidate = candidate[slice[i]];
          }

          if (candidate) {
            const book = doc.ngram;
            let ngramRemoved = book.replace(/[“”";:&,\.\/?\\-]/g, "").trim();
            const sentences = tokenizer.sentences(doc.ngram, {
              abbreviations: abbreviations
            });
            const words = Number(countWords(book));
            const characters = Number(charCount(book));

            for (let k = 0; k < listO.length; k++) {
              const b = listO[k].feature;

              if (featureArray.includes(b)) {
                let value;

                try {
                  const value = occurences(book, module.runSetters(eval(listO[k].list)));
                  gramr[b] = sigFig(value / characters);
                } catch (error) {
                  console.log(error);
                }
              }
            }

            for (let m = 0; m < listF.length; m++) {
              const b = listF[m].feature;

              if (featureArray.includes(b)) {
                const d = listF[m].name;
                let value;

                try {
                  if (listF[m].list === "relatives") {
                    let value = module.runSetters(eval(d));
                    gramr.s8 = sigFig(value.relative);
                    gramr.s9 = sigFig(value.mean);
                  } else if (listF[m].feature === "m8") {
                    let value = module.runSetters(eval(d));
                    gramr[b] = value;
                  } else if (listF[m].list !== "") {
                    let value = module.runSetters(eval(d));
                    gramr[b] = sigFig(value / characters);
                  } else {
                    let value = module.runSetters(eval(d));
                    gramr[b] = sigFig(value / characters);
                  }
                } catch (error) {
                  console.log(error);
                }
              }
            }

            for (let i = 0; i < listC.length; i++) {
              const b = listC[i].feature;

              if (featureArray.includes(b)) {
                const d = listC[i].name;
                let value;

                try {
                  const value = module.runSetters(eval(d));
                  gramr[b] = sigFig(value / characters);
                } catch (error) {
                  console.log(error);
                }
              }
            }

            if (sentences.length <= 1) {
              gramr.m6 = 1;
            } else {
              gramr.m6 = sigFig(meanSentence(sentences));
            }

            gramr.characters = characters.toLocaleString();
            gramr.words = words.toLocaleString();

            if (doc.book) {
              gramr.name = doc.author + " " + doc.text + " " + doc.book;
            } else if (doc.text) {
              gramr.name = doc.author + " " + doc.text;
            } else {
              gramr.name = doc.author;
            }

            gramr.sentences = sentences.length;
            gramr.type = doc.format;
          }

          result.push(gramr);
        }
      }

      return result;
    });
  },

  authors() {
    const authorArray = Author.find().fetch().map(x => x.author);
    return [...new Set(authorArray)];
  },

  texts(author) {
    const textArray = Authors.find({
      author: author
    }, {
      sort: {
        _id: -1
      }
    }).fetch().map(x => x.text);
    return [...new Set(textArray)];
  },

  books(author, text) {
    const bookArray = Authors.find({
      author: author,
      text: text
    }, {
      sort: {
        _id: -1
      }
    }).fetch().map(x => x.book);
    return [...new Set(bookArray)];
  }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"main.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                   //
// server/main.js                                                                                    //
//                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                     //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
module.watch(require("/imports/startup/server"));
///////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9yZWdpc3Rlci1hcGkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3N0eWxvbWV0cnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3NlcnZlci9tYWluLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImV4cG9ydCIsIlN0eWxvIiwiQXV0aG9yIiwiQXV0aG9ycyIsIk1vbmdvIiwidiIsInRva2VuaXplciIsImRlZmF1bHQiLCJDb2xsZWN0aW9uIiwicGVyc29uYWxQcm9ub3VuIiwiZGVtb25zdHJhdGl2ZVByb25vdW4iLCJyZWZsZXhpdmVQcm9ub3VuIiwiY29uZGl0aW9uYWxDbGF1c2VzIiwiY29uanVuY3Rpb25zIiwiY29uanVuY3Rpb25zSW4iLCJpZGVtIiwiaXBzZSIsImluZGVmIiwiaXN0ZSIsInF1aWRhbSIsImNvbnNvbmFudCIsImFsaXVzIiwicHJpdSIsImFudGVxIiwicXVvbSIsImR1bSIsInF1aW4iLCJvIiwiYXRxdWUiLCJ1dCIsImdlcnVuZCIsInZvY2F0aXZlcyIsInByZXBvc2l0aW9ucyIsImN1bUNsYXVzZXMiLCJyZWxhdGl2ZXMiLCJhYmJyZXZpYXRpb25zIiwib2NjdXJlbmNlcyIsInN0ciIsIndvcmRzIiwiZW5kIiwicmVnZXgiLCJqb2luIiwicmUiLCJSZWdFeHAiLCJtYXRjaCIsImxlbmd0aCIsIm11bHRpT2NjdXJlbmNlIiwibGlzdEFycmF5IiwidG9Mb3dlckNhc2UiLCJzcGxpdCIsImNvdW50IiwiaSIsImluY2x1ZGVzIiwiZW5kc1dpdGgiLCJzdGFydFdpdGgiLCJsaXN0Iiwic3RhcnRzV2l0aCIsImVuZFdpdGgiLCJpbnRlcnJvZ2F0aXZlIiwibCIsImluZGV4T2YiLCJjb3VudFdvcmRzIiwicmVwbGFjZSIsInRyaW0iLCJzaWdGaWciLCJudW0iLCJOdW1iZXIiLCJ0b0ZpeGVkIiwic3RhcnRmIiwiYTEiLCJzdHJpbmciLCJwIiwiY2hhckNvdW50IiwibXVsdGlTcGxpdCIsImRlbGltZXRlcnMiLCJyZXN1bHQiLCJ0ZW1wU3BsaXQiLCJzbGljZSIsImNvbmNhdCIsInNoaWZ0IiwicmVsYXRpdmUiLCJmaW5kYWxsIiwicmVnZXhfcGF0dGVybiIsInN0cmluZ18iLCJvdXRwdXRfbGlzdCIsImFfbWF0Y2giLCJleGVjIiwiaW5wdXQiLCJwdXNoIiwicmVnZXhJbmRleE9mIiwidGV4dCIsInJlZyIsInkiLCJyZWUiLCJpbmRleEluU3VmZml4IiwiaWZJbmRleCIsImluZGV4Iiwic2VudENvdW50IiwidHRBcnJheSIsInN0cmluZ0NvbiIsInJlbGF0aXZlQXJyYXkiLCJvY2MiLCJhbGxBcnJheSIsIm1lcmdlQXJyYXkiLCJkIiwiZm91bmRJbmRleGVzIiwibWFwIiwieCIsImZpbHRlciIsIk1hdGgiLCJtaW4iLCJmaW5hbFN0cmluZyIsInRvU3RyaW5nIiwic3RyaW5nQ291bnQiLCJtZWFuIiwicmVtb3ZlUHVuY3QiLCJlbmRmIiwiYTIiLCJmaXJzdCIsInNlY29uZCIsImN1bUNsYXVzZSIsImVuZEdlcnVuZCIsInN1cGVybGF0aXZlcyIsInN1YnN0cmluZyIsInRvcE5ncmFtcyIsInVwZGF0ZUZyZXF1ZW5jeSIsImZyZXF1ZW5jaWVzIiwid29yZCIsIm4iLCJvcmRlcmVkRnJlcXVlbmNpZXMiLCJmcmVxdWVuY3kiLCJyZWR1Y2UiLCJwb3AiLCJtZWFuU2VudGVuY2UiLCJmaXZlIiwiZGUiLCJzdHJpcCIsImxpc3RPIiwiZmVhdHVyZSIsImxpc3RGIiwibmFtZSIsImxpc3RDIiwiTWV0ZW9yIiwibWV0aG9kcyIsInN0eWxvbWV0cnlmIiwiZGF0YSIsIm9wdGlvbnMiLCJhdXRob3IiLCJzYm9vayIsImJvb2siLCJxdWVyeSIsInRlbXBDdXJzb3IiLCJzZWxlY3RBbGwiLCJmaW5kIiwiZmV0Y2giLCJmaWVsZE5hbWUiLCJkb2MiLCJncmFtciIsImNhbmRpZGF0ZSIsImZlYXR1cmVBcnJheSIsIm5ncmFtIiwibmdyYW1SZW1vdmVkIiwic2VudGVuY2VzIiwiY2hhcmFjdGVycyIsImsiLCJiIiwidmFsdWUiLCJldmFsIiwiZXJyb3IiLCJjb25zb2xlIiwibG9nIiwibSIsInM4IiwiczkiLCJtNiIsInRvTG9jYWxlU3RyaW5nIiwidHlwZSIsImZvcm1hdCIsImF1dGhvcnMiLCJhdXRob3JBcnJheSIsIlNldCIsInRleHRzIiwidGV4dEFycmF5Iiwic29ydCIsIl9pZCIsImJvb2tzIiwiYm9va0FycmF5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBQSxPQUFPQyxLQUFQLENBQWFDLFFBQVEsbUJBQVIsQ0FBYixFOzs7Ozs7Ozs7OztBQ0FBRixPQUFPQyxLQUFQLENBQWFDLFFBQVEseUJBQVIsQ0FBYixFOzs7Ozs7Ozs7OztBQ0FBRixPQUFPRyxNQUFQLENBQWM7QUFBQ0MsU0FBTSxNQUFJQSxLQUFYO0FBQWlCQyxVQUFPLE1BQUlBLE1BQTVCO0FBQW1DQyxXQUFRLE1BQUlBO0FBQS9DLENBQWQ7QUFBdUUsSUFBSUMsS0FBSjtBQUFVUCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsY0FBUixDQUFiLEVBQXFDO0FBQUNLLFFBQU1DLENBQU4sRUFBUTtBQUFDRCxZQUFNQyxDQUFOO0FBQVE7O0FBQWxCLENBQXJDLEVBQXlELENBQXpEO0FBQTRELElBQUlDLFNBQUo7QUFBY1QsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFdBQVIsQ0FBYixFQUFrQztBQUFDUSxVQUFRRixDQUFSLEVBQVU7QUFBQ0MsZ0JBQVVELENBQVY7QUFBWTs7QUFBeEIsQ0FBbEMsRUFBNEQsQ0FBNUQ7QUFHcEosTUFBTUosUUFBUSxJQUFJRyxNQUFNSSxVQUFWLENBQXFCLE9BQXJCLENBQWQ7QUFDQSxNQUFNTixTQUFTLElBQUlFLE1BQU1JLFVBQVYsQ0FBcUIsUUFBckIsQ0FBZjtBQUNBLE1BQU1MLFVBQVUsSUFBSUMsTUFBTUksVUFBVixDQUFxQixTQUFyQixDQUFoQjtBQUVQLE1BQU1DLGtCQUFrQixDQUN0QixLQURzQixFQUV0QixLQUZzQixFQUd0QixNQUhzQixFQUl0QixJQUpzQixFQUt0QixJQUxzQixFQU10QixLQU5zQixFQU90QixNQVBzQixFQVF0QixJQVJzQixFQVN0QixLQVRzQixFQVV0QixRQVZzQixFQVd0QixPQVhzQixFQVl0QixLQVpzQixFQWF0QixRQWJzQixFQWN0QixPQWRzQixFQWV0QixLQWZzQixFQWdCdEIsUUFoQnNCLEVBaUJ0QixPQWpCc0IsRUFrQnRCLElBbEJzQixFQW1CdEIsU0FuQnNCLEVBb0J0QixTQXBCc0IsRUFxQnRCLFNBckJzQixFQXNCdEIsUUF0QnNCLEVBdUJ0QixTQXZCc0IsRUF3QnRCLFNBeEJzQixFQXlCdEIsUUF6QnNCLEVBMEJ0QixRQTFCc0IsRUEyQnRCLFFBM0JzQixFQTRCdEIsU0E1QnNCLEVBNkJ0QixPQTdCc0IsRUE4QnRCLE9BOUJzQixFQStCdEIsUUEvQnNCLEVBZ0N0QixTQWhDc0IsRUFpQ3RCLE9BakNzQixFQWtDdEIsUUFsQ3NCLEVBbUN0QixXQW5Dc0IsRUFvQ3RCLFVBcENzQixFQXFDdEIsUUFyQ3NCLEVBc0N0QixXQXRDc0IsRUF1Q3RCLFVBdkNzQixFQXdDdEIsUUF4Q3NCLEVBeUN0QixXQXpDc0IsRUEwQ3RCLFVBMUNzQixFQTJDdEIsT0EzQ3NCLEVBNEN0QixZQTVDc0IsRUE2Q3RCLFlBN0NzQixFQThDdEIsWUE5Q3NCLEVBK0N0QixXQS9Dc0IsRUFnRHRCLFlBaERzQixFQWlEdEIsWUFqRHNCLEVBa0R0QixXQWxEc0IsQ0FBeEI7QUFxREEsTUFBTUMsdUJBQXVCLENBQzNCLEtBRDJCLEVBRTNCLE1BRjJCLEVBRzNCLE9BSDJCLEVBSTNCLE1BSjJCLEVBSzNCLEtBTDJCLEVBTTNCLE1BTjJCLEVBTzNCLE1BUDJCLEVBUTNCLEtBUjJCLEVBUzNCLElBVDJCLEVBVTNCLEtBVjJCLEVBVzNCLE9BWDJCLEVBWTNCLEtBWjJCLEVBYTNCLEtBYjJCLEVBYzNCLEtBZDJCLEVBZTNCLE9BZjJCLEVBZ0IzQixJQWhCMkIsRUFpQjNCLElBakIyQixFQWtCM0IsTUFsQjJCLEVBbUIzQixPQW5CMkIsRUFvQjNCLFFBcEIyQixFQXFCM0IsTUFyQjJCLEVBc0IzQixNQXRCMkIsRUF1QjNCLE1BdkIyQixFQXdCM0IsT0F4QjJCLEVBeUIzQixPQXpCMkIsRUEwQjNCLE9BMUIyQixFQTJCM0IsU0EzQjJCLEVBNEIzQixPQTVCMkIsRUE2QjNCLE9BN0IyQixFQThCM0IsU0E5QjJCLEVBK0IzQixPQS9CMkIsRUFnQzNCLElBaEMyQixFQWlDM0IsS0FqQzJCLEVBa0MzQixNQWxDMkIsRUFtQzNCLElBbkMyQixFQW9DM0IsSUFwQzJCLEVBcUMzQixJQXJDMkIsRUFzQzNCLEtBdEMyQixFQXVDM0IsSUF2QzJCLEVBd0MzQixJQXhDMkIsRUF5QzNCLEtBekMyQixFQTBDM0IsT0ExQzJCLEVBMkMzQixLQTNDMkIsRUE0QzNCLEtBNUMyQixFQTZDM0IsS0E3QzJCLEVBOEMzQixLQTlDMkIsRUErQzNCLE9BL0MyQixFQWdEM0IsT0FoRDJCLEVBaUQzQixRQWpEMkIsRUFrRDNCLE9BbEQyQixFQW1EM0IsT0FuRDJCLEVBb0QzQixPQXBEMkIsRUFxRDNCLFFBckQyQixFQXNEM0IsUUF0RDJCLEVBdUQzQixPQXZEMkIsRUF3RDNCLFFBeEQyQixFQXlEM0IsU0F6RDJCLEVBMEQzQixVQTFEMkIsRUEyRDNCLFNBM0QyQixFQTREM0IsUUE1RDJCLEVBNkQzQixTQTdEMkIsRUE4RDNCLFNBOUQyQixFQStEM0IsUUEvRDJCLEVBZ0UzQixPQWhFMkIsRUFpRTNCLFFBakUyQixFQWtFM0IsVUFsRTJCLEVBbUUzQixRQW5FMkIsRUFvRTNCLFFBcEUyQixFQXFFM0IsUUFyRTJCLEVBc0UzQixVQXRFMkIsRUF1RTNCLE9BdkUyQixFQXdFM0IsT0F4RTJCLEVBeUUzQixTQXpFMkIsRUEwRTNCLFVBMUUyQixFQTJFM0IsV0EzRTJCLEVBNEUzQixTQTVFMkIsRUE2RTNCLFNBN0UyQixFQThFM0IsU0E5RTJCLEVBK0UzQixVQS9FMkIsRUFnRjNCLFVBaEYyQixFQWlGM0IsVUFqRjJCLEVBa0YzQixZQWxGMkIsRUFtRjNCLFVBbkYyQixFQW9GM0IsVUFwRjJCLEVBcUYzQixZQXJGMkIsRUFzRjNCLFVBdEYyQixFQXVGM0IsT0F2RjJCLEVBd0YzQixRQXhGMkIsRUF5RjNCLFNBekYyQixFQTBGM0IsT0ExRjJCLEVBMkYzQixPQTNGMkIsRUE0RjNCLE9BNUYyQixFQTZGM0IsUUE3RjJCLEVBOEYzQixPQTlGMkIsRUErRjNCLE9BL0YyQixFQWdHM0IsUUFoRzJCLEVBaUczQixVQWpHMkIsRUFrRzNCLFFBbEcyQixFQW1HM0IsUUFuRzJCLEVBb0czQixRQXBHMkIsRUFxRzNCLFFBckcyQixFQXNHM0IsVUF0RzJCLEVBdUczQixVQXZHMkIsRUF3RzNCLFdBeEcyQixFQXlHM0IsVUF6RzJCLEVBMEczQixVQTFHMkIsRUEyRzNCLFVBM0cyQixFQTRHM0IsV0E1RzJCLEVBNkczQixXQTdHMkIsRUE4RzNCLFVBOUcyQixDQUE3QjtBQWlIQSxNQUFNQyxtQkFBbUIsQ0FBQyxJQUFELEVBQU8sTUFBUCxFQUFlLE1BQWYsRUFBdUIsS0FBdkIsRUFBOEIsT0FBOUIsRUFBdUMsU0FBdkMsRUFBa0QsU0FBbEQsRUFBNkQsUUFBN0QsQ0FBekI7QUFFQSxNQUFNQyxxQkFBcUIsQ0FBQyxJQUFELEVBQU8sTUFBUCxFQUFlLFFBQWYsRUFBeUIsS0FBekIsRUFBZ0MsU0FBaEMsQ0FBM0I7QUFFQSxNQUFNQyxlQUFlLENBQ25CLElBRG1CLEVBRW5CLE9BRm1CLEVBR25CLElBSG1CLEVBSW5CLEtBSm1CLEVBS25CLEtBTG1CLEVBTW5CLEtBTm1CLEVBT25CLElBUG1CLEVBUW5CLE9BUm1CLEVBU25CLEtBVG1CLEVBVW5CLFVBVm1CLEVBV25CLEtBWG1CLEVBWW5CLE9BWm1CLEVBYW5CLEtBYm1CLEVBY25CLFNBZG1CLEVBZW5CLE1BZm1CLEVBZ0JuQixPQWhCbUIsRUFpQm5CLFVBakJtQixFQWtCbkIsV0FsQm1CLEVBbUJuQixRQW5CbUIsRUFvQm5CLFlBcEJtQixFQXFCbkIsWUFyQm1CLEVBc0JuQixZQXRCbUIsRUF1Qm5CLFlBdkJtQixFQXdCbkIsVUF4Qm1CLEVBeUJuQixLQXpCbUIsRUEwQm5CLFVBMUJtQixFQTJCbkIsTUEzQm1CLEVBNEJuQixVQTVCbUIsRUE2Qm5CLFVBN0JtQixFQThCbkIsS0E5Qm1CLEVBK0JuQixRQS9CbUIsRUFnQ25CLFFBaENtQixFQWlDbkIsT0FqQ21CLEVBa0NuQixRQWxDbUIsRUFtQ25CLFVBbkNtQixFQW9DbkIsU0FwQ21CLENBQXJCO0FBdUNBLE1BQU1DLGlCQUFpQixDQUFDLEtBQUQsQ0FBdkI7QUFFQSxNQUFNQyxPQUFPLENBQ1gsTUFEVyxFQUVYLFFBRlcsRUFHWCxTQUhXLEVBSVgsT0FKVyxFQUtYLE9BTFcsRUFNWCxPQU5XLEVBT1gsUUFQVyxFQVFYLE9BUlcsRUFTWCxRQVRXLEVBVVgsVUFWVyxFQVdYLFFBWFcsRUFZWCxRQVpXLEVBYVgsUUFiVyxFQWNYLE9BZFcsRUFlWCxRQWZXLEVBZ0JYLFVBaEJXLEVBaUJYLE9BakJXLEVBa0JYLFVBbEJXLEVBbUJYLFNBbkJXLEVBb0JYLFdBcEJXLEVBcUJYLFlBckJXLEVBc0JYLFVBdEJXLEVBdUJYLFVBdkJXLEVBd0JYLFVBeEJXLEVBeUJYLFdBekJXLEVBMEJYLFVBMUJXLEVBMkJYLFdBM0JXLEVBNEJYLGFBNUJXLEVBNkJYLFdBN0JXLEVBOEJYLFdBOUJXLEVBK0JYLFdBL0JXLEVBZ0NYLFdBaENXLEVBaUNYLGFBakNXLENBQWI7QUFvQ0EsTUFBTUMsT0FBTyxDQUNYLE1BRFcsRUFFWCxPQUZXLEVBR1gsUUFIVyxFQUlYLE1BSlcsRUFLWCxNQUxXLEVBTVgsTUFOVyxFQU9YLE9BUFcsRUFRWCxPQVJXLEVBU1gsU0FUVyxFQVVYLE9BVlcsRUFXWCxTQVhXLEVBWVgsU0FaVyxFQWFYLFVBYlcsRUFjWCxXQWRXLEVBZVgsU0FmVyxFQWdCWCxTQWhCVyxFQWlCWCxTQWpCVyxFQWtCWCxVQWxCVyxFQW1CWCxVQW5CVyxFQW9CWCxZQXBCVyxFQXFCWCxVQXJCVyxFQXNCWCxZQXRCVyxDQUFiO0FBeUJBLE1BQU1DLFFBQVEsQ0FDWixRQURZLEVBRVosU0FGWSxFQUdaLFVBSFksRUFJWixRQUpZLEVBS1osUUFMWSxFQU1aLFFBTlksRUFPWixTQVBZLEVBUVosUUFSWSxFQVNaLFNBVFksRUFVWixTQVZZLEVBV1osV0FYWSxFQVlaLFdBWlksRUFhWixTQWJZLEVBY1osV0FkWSxDQUFkO0FBaUJBLE1BQU1DLE9BQU8sQ0FDWCxNQURXLEVBRVgsT0FGVyxFQUdYLFFBSFcsRUFJWCxNQUpXLEVBS1gsTUFMVyxFQU1YLE1BTlcsRUFPWCxPQVBXLEVBUVgsT0FSVyxFQVNYLE9BVFcsRUFVWCxTQVZXLEVBV1gsT0FYVyxFQVlYLE9BWlcsRUFhWCxTQWJXLEVBY1gsTUFkVyxFQWVYLE9BZlcsRUFnQlgsUUFoQlcsRUFpQlgsTUFqQlcsRUFrQlgsTUFsQlcsRUFtQlgsTUFuQlcsRUFvQlgsT0FwQlcsRUFxQlgsT0FyQlcsRUFzQlgsT0F0QlcsRUF1QlgsU0F2QlcsRUF3QlgsT0F4QlcsRUF5QlgsT0F6QlcsRUEwQlgsU0ExQlcsRUEyQlgsU0EzQlcsRUE0QlgsVUE1QlcsRUE2QlgsV0E3QlcsRUE4QlgsU0E5QlcsRUErQlgsU0EvQlcsRUFnQ1gsU0FoQ1csRUFpQ1gsVUFqQ1csRUFrQ1gsVUFsQ1csRUFtQ1gsVUFuQ1csRUFvQ1gsWUFwQ1csRUFxQ1gsVUFyQ1csRUFzQ1gsVUF0Q1csRUF1Q1gsWUF2Q1csQ0FBYjtBQTBDQSxNQUFNQyxTQUFTLENBQ2IsUUFEYSxFQUViLFNBRmEsRUFHYixVQUhhLEVBSWIsUUFKYSxFQUtiLFFBTGEsRUFNYixTQU5hLEVBT2IsU0FQYSxFQVFiLFFBUmEsRUFTYixTQVRhLEVBVWIsU0FWYSxFQVdiLFdBWGEsRUFZYixXQVphLEVBYWIsU0FiYSxFQWNiLFdBZGEsRUFlYixTQWZhLEVBZ0JiLFNBaEJhLEVBaUJiLFFBakJhLEVBa0JiLFdBbEJhLEVBbUJiLFlBbkJhLEVBb0JiLGFBcEJhLEVBcUJiLFdBckJhLEVBc0JiLFdBdEJhLEVBdUJiLFlBdkJhLEVBd0JiLFlBeEJhLEVBeUJiLFdBekJhLEVBMEJiLFlBMUJhLEVBMkJiLFlBM0JhLEVBNEJiLGNBNUJhLEVBNkJiLGNBN0JhLEVBOEJiLFlBOUJhLEVBK0JiLGNBL0JhLEVBZ0NiLFlBaENhLEVBaUNiLFlBakNhLEVBa0NiLFdBbENhLENBQWY7QUFxQ0EsTUFBTUMsWUFBWSxDQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsR0FBWCxFQUFnQixHQUFoQixFQUFxQixHQUFyQixFQUEwQixHQUExQixFQUErQixHQUEvQixFQUFvQyxHQUFwQyxFQUF5QyxHQUF6QyxFQUE4QyxHQUE5QyxFQUFtRCxHQUFuRCxFQUF3RCxHQUF4RCxFQUE2RCxHQUE3RCxFQUFrRSxHQUFsRSxFQUF1RSxHQUF2RSxFQUE0RSxHQUE1RSxFQUFpRixHQUFqRixFQUFzRixHQUF0RixFQUEyRixHQUEzRixFQUFnRyxHQUFoRyxDQUFsQjtBQUVBLE1BQU1DLFFBQVEsQ0FDWixPQURZLEVBRVosT0FGWSxFQUdaLE1BSFksRUFJWixNQUpZLEVBS1osTUFMWSxFQU1aLE9BTlksRUFPWixPQVBZLEVBUVosT0FSWSxFQVNaLFNBVFksRUFVWixPQVZZLEVBV1osT0FYWSxFQVlaLE9BWlksRUFhWixTQWJZLEVBY1osVUFkWSxFQWVaLFVBZlksRUFnQlosU0FoQlksRUFpQlosU0FqQlksRUFrQlosU0FsQlksRUFtQlosVUFuQlksRUFvQlosVUFwQlksRUFxQlosVUFyQlksRUFzQlosWUF0QlksRUF1QlosVUF2QlksRUF3QlosVUF4QlksRUF5QlosVUF6QlksRUEwQlosWUExQlksQ0FBZDtBQTZCQSxNQUFNQyxPQUFPLENBQUMsV0FBRCxFQUFjLFlBQWQsQ0FBYjtBQUVBLE1BQU1DLFFBQVEsQ0FBQyxVQUFELEVBQWEsV0FBYixDQUFkO0FBRUEsTUFBTUMsT0FBTyxDQUFDLFVBQUQsRUFBYSxXQUFiLENBQWI7QUFFQSxNQUFNQyxNQUFNLENBQUMsS0FBRCxFQUFRLFFBQVIsQ0FBWjtBQUVBLE1BQU1DLE9BQU8sQ0FBQyxNQUFELENBQWI7QUFFQSxNQUFNQyxJQUFJLENBQUMsR0FBRCxDQUFWO0FBRUEsTUFBTUMsUUFBUSxDQUFDLE9BQUQsQ0FBZDtBQUVBLE1BQU1DLEtBQUssQ0FBQyxJQUFELEVBQU8sTUFBUCxFQUFlLE9BQWYsQ0FBWDtBQUVBLE1BQU1DLFNBQVMsQ0FBQyxNQUFELEVBQVMsTUFBVCxFQUFpQixRQUFqQixFQUEyQixRQUEzQixFQUFxQyxTQUFyQyxFQUFnRCxTQUFoRCxFQUEyRCxXQUEzRCxFQUF3RSxXQUF4RSxDQUFmO0FBRUEsTUFBTUMsWUFBWSxDQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsR0FBWCxFQUFnQixHQUFoQixFQUFxQixJQUFyQixFQUEyQixJQUEzQixFQUFpQyxJQUFqQyxFQUF1QyxJQUF2QyxDQUFsQjtBQUVBLE1BQU1DLGVBQWUsQ0FDbkIsSUFEbUIsRUFFbkIsS0FGbUIsRUFHbkIsR0FIbUIsRUFJbkIsSUFKbUIsRUFLbkIsTUFMbUIsRUFNbkIsSUFObUIsRUFPbkIsS0FQbUIsRUFRbkIsTUFSbUIsRUFTbkIsT0FUbUIsRUFVbkIsSUFWbUIsRUFXbkIsT0FYbUIsRUFZbkIsS0FabUIsRUFhbkIsU0FibUIsRUFjbkIsU0FkbUIsRUFlbkIsT0FmbUIsRUFnQm5CLFFBaEJtQixFQWlCbkIsS0FqQm1CLEVBa0JuQixPQWxCbUIsRUFtQm5CLEtBbkJtQixFQW9CbkIsTUFwQm1CLEVBcUJuQixPQXJCbUIsRUFzQm5CLE1BdEJtQixFQXVCbkIsT0F2Qm1CLEVBd0JuQixTQXhCbUIsRUF5Qm5CLE9BekJtQixFQTBCbkIsUUExQm1CLEVBMkJuQixTQTNCbUIsRUE0Qm5CLFVBNUJtQixFQTZCbkIsT0E3Qm1CLEVBOEJuQixVQTlCbUIsRUErQm5CLFFBL0JtQixFQWdDbkIsWUFoQ21CLEVBaUNuQixZQWpDbUIsRUFrQ25CLFVBbENtQixFQW1DbkIsUUFuQ21CLEVBb0NuQixVQXBDbUIsRUFxQ25CLFFBckNtQixDQUFyQjtBQXdDQSxNQUFNQyxhQUFhLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxHQUFYLEVBQWdCLEdBQWhCLEVBQXFCLEdBQXJCLEVBQTBCLElBQTFCLEVBQWdDLE1BQWhDLEVBQXdDLE1BQXhDLEVBQWdELE1BQWhELEVBQXdELE1BQXhELENBQW5CO0FBRUEsTUFBTUMsWUFBWSxDQUNoQixLQURnQixFQUVoQixPQUZnQixFQUdoQixLQUhnQixFQUloQixNQUpnQixFQUtoQixLQUxnQixFQU1oQixNQU5nQixFQU9oQixNQVBnQixFQVFoQixLQVJnQixFQVNoQixNQVRnQixFQVVoQixRQVZnQixFQVdoQixRQVhnQixFQVloQixNQVpnQixFQWFoQixRQWJnQixFQWNoQixNQWRnQixDQUFsQjtBQWlCQSxNQUFNQyxnQkFBZ0IsQ0FDcEIsTUFEb0IsRUFFcEIsS0FGb0IsRUFHcEIsTUFIb0IsRUFJcEIsS0FKb0IsRUFLcEIsTUFMb0IsRUFNcEIsSUFOb0IsRUFPcEIsS0FQb0IsRUFRcEIsSUFSb0IsRUFTcEIsS0FUb0IsRUFVcEIsS0FWb0IsRUFXcEIsSUFYb0IsRUFZcEIsSUFab0IsRUFhcEIsS0Fib0IsRUFjcEIsS0Fkb0IsRUFlcEIsTUFmb0IsRUFnQnBCLE1BaEJvQixFQWlCcEIsS0FqQm9CLEVBa0JwQixLQWxCb0IsRUFtQnBCLEtBbkJvQixFQW9CcEIsS0FwQm9CLEVBcUJwQixLQXJCb0IsRUFzQnBCLE1BdEJvQixFQXVCcEIsS0F2Qm9CLEVBd0JwQixLQXhCb0IsRUF5QnBCLEtBekJvQixFQTBCcEIsTUExQm9CLEVBMkJwQixJQTNCb0IsRUE0QnBCLE1BNUJvQixFQTZCcEIsS0E3Qm9CLEVBOEJwQixLQTlCb0IsRUErQnBCLEtBL0JvQixFQWdDcEIsSUFoQ29CLEVBaUNwQixJQWpDb0IsRUFrQ3BCLEtBbENvQixFQW1DcEIsS0FuQ29CLEVBb0NwQixNQXBDb0IsRUFxQ3BCLEtBckNvQixFQXNDcEIsS0F0Q29CLEVBdUNwQixLQXZDb0IsRUF3Q3BCLElBeENvQixFQXlDcEIsT0F6Q29CLEVBMENwQixLQTFDb0IsRUEyQ3BCLEtBM0NvQixFQTRDcEIsTUE1Q29CLEVBNkNwQixLQTdDb0IsRUE4Q3BCLElBOUNvQixFQStDcEIsS0EvQ29CLEVBZ0RwQixJQWhEb0IsRUFpRHBCLE1BakRvQixFQWtEcEIsSUFsRG9CLEVBbURwQixJQW5Eb0IsRUFvRHBCLElBcERvQixFQXFEcEIsS0FyRG9CLEVBc0RwQixLQXREb0IsRUF1RHBCLEtBdkRvQixFQXdEcEIsS0F4RG9CLEVBeURwQixLQXpEb0IsRUEwRHBCLE1BMURvQixFQTJEcEIsS0EzRG9CLEVBNERwQixPQTVEb0IsRUE2RHBCLFFBN0RvQixFQThEcEIsS0E5RG9CLEVBK0RwQixLQS9Eb0IsRUFnRXBCLE1BaEVvQixFQWlFcEIsTUFqRW9CLEVBa0VwQixLQWxFb0IsRUFtRXBCLEtBbkVvQixFQW9FcEIsSUFwRW9CLEVBcUVwQixJQXJFb0IsRUFzRXBCLElBdEVvQixFQXVFcEIsS0F2RW9CLEVBd0VwQixLQXhFb0IsRUF5RXBCLEtBekVvQixFQTBFcEIsS0ExRW9CLEVBMkVwQixLQTNFb0IsRUE0RXBCLEtBNUVvQixFQTZFcEIsTUE3RW9CLEVBOEVwQixLQTlFb0IsRUErRXBCLEtBL0VvQixFQWdGcEIsTUFoRm9CLEVBaUZwQixLQWpGb0IsRUFrRnBCLEtBbEZvQixFQW1GcEIsS0FuRm9CLEVBb0ZwQixLQXBGb0IsRUFxRnBCLEtBckZvQixFQXNGcEIsSUF0Rm9CLEVBdUZwQixJQXZGb0IsRUF3RnBCLEdBeEZvQixFQXlGcEIsSUF6Rm9CLEVBMEZwQixLQTFGb0IsRUEyRnBCLE1BM0ZvQixFQTRGcEIsSUE1Rm9CLEVBNkZwQixHQTdGb0IsRUE4RnBCLElBOUZvQixFQStGcEIsS0EvRm9CLEVBZ0dwQixNQWhHb0IsRUFpR3BCLE9BakdvQixFQWtHcEIsSUFsR29CLEVBbUdwQixHQW5Hb0IsRUFvR3BCLElBcEdvQixFQXFHcEIsS0FyR29CLEVBc0dwQixNQXRHb0IsRUF1R3BCLE9BdkdvQixFQXdHcEIsS0F4R29CLEVBeUdwQixJQXpHb0IsRUEwR3BCLEtBMUdvQixFQTJHcEIsTUEzR29CLEVBNEdwQixPQTVHb0IsRUE2R3BCLFFBN0dvQixFQThHcEIsS0E5R29CLEVBK0dwQixJQS9Hb0IsRUFnSHBCLEtBaEhvQixFQWlIcEIsTUFqSG9CLEVBa0hwQixPQWxIb0IsRUFtSHBCLFFBbkhvQixFQW9IcEIsTUFwSG9CLEVBcUhwQixLQXJIb0IsRUFzSHBCLE1BdEhvQixFQXVIcEIsT0F2SG9CLEVBd0hwQixRQXhIb0IsRUF5SHBCLFNBekhvQixFQTBIcEIsTUExSG9CLEVBMkhwQixLQTNIb0IsRUE0SHBCLE1BNUhvQixFQTZIcEIsT0E3SG9CLEVBOEhwQixRQTlIb0IsRUErSHBCLFNBL0hvQixFQWdJcEIsT0FoSW9CLEVBaUlwQixNQWpJb0IsRUFrSXBCLE9BbElvQixFQW1JcEIsUUFuSW9CLEVBb0lwQixTQXBJb0IsRUFxSXBCLFVBcklvQixFQXNJcEIsT0F0SW9CLEVBdUlwQixNQXZJb0IsRUF3SXBCLElBeElvQixFQXlJcEIsS0F6SW9CLEVBMElwQixNQTFJb0IsRUEySXBCLE9BM0lvQixFQTRJcEIsUUE1SW9CLEVBNklwQixNQTdJb0IsRUE4SXBCLEtBOUlvQixFQStJcEIsTUEvSW9CLEVBZ0pwQixPQWhKb0IsRUFpSnBCLFFBakpvQixFQWtKcEIsU0FsSm9CLEVBbUpwQixNQW5Kb0IsRUFvSnBCLEdBcEpvQixFQXFKcEIsSUFySm9CLEVBc0pwQixLQXRKb0IsRUF1SnBCLE1BdkpvQixFQXdKcEIsT0F4Sm9CLEVBeUpwQixLQXpKb0IsRUEwSnBCLElBMUpvQixFQTJKcEIsS0EzSm9CLEVBNEpwQixNQTVKb0IsRUE2SnBCLE9BN0pvQixFQThKcEIsUUE5Sm9CLEVBK0pwQixLQS9Kb0IsRUFnS3BCLElBaEtvQixFQWlLcEIsS0FqS29CLEVBa0twQixNQWxLb0IsRUFtS3BCLE9BbktvQixFQW9LcEIsUUFwS29CLEVBcUtwQixNQXJLb0IsRUFzS3BCLEtBdEtvQixFQXVLcEIsTUF2S29CLEVBd0twQixPQXhLb0IsRUF5S3BCLFFBektvQixFQTBLcEIsU0ExS29CLEVBMktwQixNQTNLb0IsRUE0S3BCLEtBNUtvQixFQTZLcEIsTUE3S29CLEVBOEtwQixPQTlLb0IsRUErS3BCLFFBL0tvQixFQWdMcEIsU0FoTG9CLEVBaUxwQixPQWpMb0IsRUFrTHBCLE1BbExvQixFQW1McEIsT0FuTG9CLEVBb0xwQixRQXBMb0IsRUFxTHBCLFNBckxvQixFQXNMcEIsVUF0TG9CLEVBdUxwQixPQXZMb0IsRUF3THBCLE1BeExvQixFQXlMcEIsT0F6TG9CLEVBMExwQixRQTFMb0IsRUEyTHBCLFNBM0xvQixFQTRMcEIsVUE1TG9CLEVBNkxwQixRQTdMb0IsRUE4THBCLE9BOUxvQixFQStMcEIsUUEvTG9CLEVBZ01wQixTQWhNb0IsRUFpTXBCLFVBak1vQixFQWtNcEIsV0FsTW9CLEVBbU1wQixRQW5Nb0IsRUFvTXBCLE9BcE1vQixFQXFNcEIsSUFyTW9CLEVBc01wQixLQXRNb0IsRUF1TXBCLE1Bdk1vQixFQXdNcEIsT0F4TW9CLEVBeU1wQixRQXpNb0IsRUEwTXBCLE1BMU1vQixFQTJNcEIsS0EzTW9CLEVBNE1wQixNQTVNb0IsRUE2TXBCLE9BN01vQixFQThNcEIsUUE5TW9CLEVBK01wQixTQS9Nb0IsRUFnTnBCLE1BaE5vQixFQWlOcEIsR0FqTm9CLEVBa05wQixJQWxOb0IsRUFtTnBCLEtBbk5vQixFQW9OcEIsTUFwTm9CLEVBcU5wQixJQXJOb0IsRUFzTnBCLEdBdE5vQixFQXVOcEIsSUF2Tm9CLEVBd05wQixLQXhOb0IsRUF5TnBCLE1Bek5vQixFQTBOcEIsT0ExTm9CLEVBMk5wQixJQTNOb0IsRUE0TnBCLEdBNU5vQixFQTZOcEIsSUE3Tm9CLEVBOE5wQixLQTlOb0IsRUErTnBCLE1BL05vQixDQUF0Qjs7QUFrT0EsTUFBTUMsYUFBYSxDQUFDQyxHQUFELEVBQU1DLEtBQU4sS0FBZ0I7QUFDakMsUUFBTUMsTUFBTSxLQUFaO0FBQ0EsUUFBTUMsUUFBUUQsTUFBTSxHQUFOLEdBQVlELE1BQU1HLElBQU4sQ0FBVyxHQUFYLENBQVosR0FBOEIsR0FBOUIsR0FBb0NGLEdBQWxEO0FBQ0EsUUFBTUcsS0FBSyxJQUFJQyxNQUFKLENBQVdILEtBQVgsRUFBa0IsSUFBbEIsQ0FBWDs7QUFDQSxNQUFJSCxJQUFJTyxLQUFKLENBQVVGLEVBQVYsQ0FBSixFQUFtQjtBQUNqQixXQUFPTCxJQUFJTyxLQUFKLENBQVVGLEVBQVYsRUFBY0csTUFBckI7QUFDRCxHQUZELE1BRU87QUFDTCxXQUFPLENBQVA7QUFDRDtBQUNGLENBVEQ7O0FBV0EsTUFBTUMsaUJBQWlCLENBQUNULEdBQUQsRUFBTVUsU0FBTixLQUFvQjtBQUN6Q1YsUUFBTUEsSUFBSVcsV0FBSixHQUFrQkMsS0FBbEIsQ0FBd0IsR0FBeEIsQ0FBTjtBQUNBLE1BQUlDLFFBQVEsQ0FBWjs7QUFDQSxPQUFLLElBQUlDLElBQUksQ0FBYixFQUFnQkEsSUFBSWQsSUFBSVEsTUFBeEIsRUFBZ0NNLEdBQWhDLEVBQXFDO0FBQ25DLFFBQUlKLFVBQVVLLFFBQVYsQ0FBbUJmLElBQUljLENBQUosQ0FBbkIsS0FBOEJkLElBQUljLENBQUosRUFBT0UsUUFBUCxDQUFnQixLQUFoQixDQUFsQyxFQUEwRDtBQUN4REgsZUFBUyxDQUFUO0FBQ0Q7QUFDRjs7QUFDRCxTQUFPQSxLQUFQO0FBQ0QsQ0FURDs7QUFXQSxNQUFNSSxZQUFZLENBQUNqQixHQUFELEVBQU1rQixJQUFOLEtBQWU7QUFDL0IsT0FBSyxJQUFJSixJQUFJLENBQWIsRUFBZ0JBLElBQUlJLEtBQUtWLE1BQXpCLEVBQWlDTSxHQUFqQyxFQUFzQztBQUNwQyxRQUFJZCxJQUFJbUIsVUFBSixDQUFlRCxLQUFLSixDQUFMLENBQWYsQ0FBSixFQUE2QixPQUFPLElBQVA7QUFDOUI7QUFDRixDQUpEOztBQU1BLE1BQU1NLFVBQVUsQ0FBQ3BCLEdBQUQsRUFBTWtCLElBQU4sS0FBZTtBQUM3QixNQUFJTCxRQUFRLENBQVo7O0FBQ0EsT0FBSyxJQUFJQyxJQUFJLENBQWIsRUFBZ0JBLElBQUlJLEtBQUtWLE1BQXpCLEVBQWlDTSxHQUFqQyxFQUFzQztBQUNwQyxRQUFJZCxJQUFJZ0IsUUFBSixDQUFhRSxLQUFLSixDQUFMLENBQWIsQ0FBSixFQUEyQjtBQUN6QkQsZUFBUyxDQUFUO0FBQ0Q7QUFDRjs7QUFDRCxTQUFPQSxLQUFQO0FBQ0QsQ0FSRDs7QUFVQSxNQUFNUSxnQkFBaUJyQixHQUFELElBQVM7QUFDN0IsTUFBSWEsUUFBUSxDQUFaO0FBQ0FiLFFBQU1BLElBQUlZLEtBQUosQ0FBVSxHQUFWLENBQU47QUFDQSxRQUFNVSxJQUFJdEIsSUFBSVEsTUFBZDs7QUFDQSxPQUFLLElBQUlNLElBQUksQ0FBYixFQUFnQkEsSUFBSVEsQ0FBcEIsRUFBdUJSLEdBQXZCLEVBQTRCO0FBQzFCLFFBQUlkLElBQUljLENBQUosRUFBT1MsT0FBUCxDQUFlLEdBQWYsS0FBdUIsQ0FBQyxDQUE1QixFQUErQjtBQUM3QlYsZUFBUyxDQUFUO0FBQ0Q7QUFDRjs7QUFDRCxTQUFPQSxLQUFQO0FBQ0QsQ0FWRDs7QUFZQSxNQUFNVyxhQUFjeEIsR0FBRCxJQUFTO0FBQzFCQSxRQUFNQSxJQUFJeUIsT0FBSixFQUFOO0FBQ0EsU0FBT3pCLElBQUkwQixJQUFKLEdBQVdkLEtBQVgsQ0FBaUIsS0FBakIsRUFBd0JKLE1BQS9CO0FBQ0QsQ0FIRDs7QUFLQSxNQUFNbUIsU0FBVUMsR0FBRCxJQUFTO0FBQ3RCLE1BQUlBLEdBQUosRUFBUztBQUNQLFdBQU9DLE9BQU9ELElBQUlFLE9BQUosQ0FBWSxDQUFaLENBQVAsQ0FBUDtBQUNELEdBRkQsTUFFTztBQUNMLFdBQU8sQ0FBUDtBQUNEO0FBQ0YsQ0FORDs7QUFRQSxTQUFTQyxNQUFULENBQWdCQyxFQUFoQixFQUFvQmhDLEdBQXBCLEVBQXlCO0FBQ3ZCLFFBQU1qQixZQUFZLENBQ2hCLEdBRGdCLEVBRWhCLEdBRmdCLEVBR2hCLEdBSGdCLEVBSWhCLEdBSmdCLEVBS2hCLEdBTGdCLEVBTWhCLEdBTmdCLEVBT2hCLEdBUGdCLEVBUWhCLEdBUmdCLEVBU2hCLEdBVGdCLEVBVWhCLEdBVmdCLEVBV2hCLEdBWGdCLEVBWWhCLEdBWmdCLEVBYWhCLEdBYmdCLEVBY2hCLEdBZGdCLEVBZWhCLEdBZmdCLEVBZ0JoQixHQWhCZ0IsRUFpQmhCLEdBakJnQixFQWtCaEIsR0FsQmdCLEVBbUJoQixHQW5CZ0IsRUFvQmhCLEdBcEJnQixDQUFsQjtBQXVCQSxNQUFJOEIsUUFBUSxDQUFaO0FBQ0EsUUFBTW9CLFNBQVNELEdBQUdyQixXQUFILEdBQWlCQyxLQUFqQixDQUF1QixHQUF2QixDQUFmO0FBQ0EsUUFBTVUsSUFBSVcsT0FBT3pCLE1BQWpCOztBQUNBLE9BQUssSUFBSU0sSUFBSSxDQUFiLEVBQWdCQSxJQUFJUSxDQUFwQixFQUF1QlIsR0FBdkIsRUFBNEI7QUFDMUIsUUFBSW9CLElBQUksQ0FBQ3BCLElBQUksQ0FBTCxJQUFVUSxDQUFsQjs7QUFDQSxRQUFJVyxPQUFPbkIsQ0FBUCxNQUFjLE9BQWQsSUFBeUJHLFVBQVVnQixPQUFPQyxDQUFQLENBQVYsRUFBcUJuRCxTQUFyQixDQUE3QixFQUE4RDtBQUM1RDhCLGVBQVMsQ0FBVDtBQUNEO0FBQ0Y7O0FBQ0QsU0FBT0EsS0FBUDtBQUNEOztBQUVELE1BQU1zQixZQUFhbkMsR0FBRCxJQUFTO0FBQ3pCQSxRQUFNQSxJQUFJeUIsT0FBSixDQUFZLGlCQUFaLEVBQStCLEVBQS9CLEVBQW1DQSxPQUFuQyxDQUEyQyxLQUEzQyxFQUFrRCxFQUFsRCxDQUFOO0FBQ0EsU0FBT3pCLElBQUlRLE1BQVg7QUFDRCxDQUhEOztBQUtBLE1BQU00QixhQUFhLENBQUNwQyxHQUFELEVBQU1xQyxVQUFOLEtBQXFCO0FBQ3RDLFFBQU1DLFNBQVMsQ0FBQ3RDLEdBQUQsQ0FBZjtBQUNBLE1BQUksT0FBT3FDLFVBQVAsSUFBcUIsUUFBekIsRUFBbUNBLGFBQWEsQ0FBQ0EsVUFBRCxDQUFiOztBQUNuQyxTQUFPQSxXQUFXN0IsTUFBWCxHQUFvQixDQUEzQixFQUE4QjtBQUM1QixTQUFLLElBQUlNLElBQUksQ0FBYixFQUFnQkEsSUFBSXdCLE9BQU85QixNQUEzQixFQUFtQ00sR0FBbkMsRUFBd0M7QUFDdEMsWUFBTXlCLFlBQVlELE9BQU94QixDQUFQLEVBQVVGLEtBQVYsQ0FBZ0J5QixXQUFXLENBQVgsQ0FBaEIsQ0FBbEI7QUFDQUMsZUFBU0EsT0FDTkUsS0FETSxDQUNBLENBREEsRUFDRzFCLENBREgsRUFFTjJCLE1BRk0sQ0FFQ0YsU0FGRCxFQUdORSxNQUhNLENBR0NILE9BQU9FLEtBQVAsQ0FBYTFCLElBQUksQ0FBakIsQ0FIRCxDQUFUO0FBSUQ7O0FBQ0R1QixlQUFXSyxLQUFYO0FBQ0Q7O0FBQ0QsU0FBT0osTUFBUDtBQUNELENBZEQ7O0FBZ0JBLE1BQU1LLFdBQVcsQ0FBQ1gsRUFBRCxFQUFLZCxJQUFMLEtBQWM7QUFDN0IsV0FBUzBCLE9BQVQsQ0FBaUJDLGFBQWpCLEVBQWdDQyxPQUFoQyxFQUF5QztBQUN2QyxRQUFJQyxjQUFjLEVBQWxCOztBQUNBLFdBQU8sSUFBUCxFQUFhO0FBQ1gsVUFBSUMsVUFBVUgsY0FBY0ksSUFBZCxDQUFtQkgsT0FBbkIsQ0FBZDs7QUFDQSxVQUFJRSxPQUFKLEVBQWE7QUFDWCxlQUFPQSxRQUFRRSxLQUFmO0FBQ0FILG9CQUFZSSxJQUFaLENBQWlCSCxPQUFqQjtBQUNELE9BSEQsTUFHTztBQUNMO0FBQ0Q7QUFDRjs7QUFDRCxXQUFPRCxXQUFQO0FBQ0Q7O0FBRUQsV0FBU0ssWUFBVCxDQUFzQkMsSUFBdEIsRUFBNEJDLEdBQTVCLEVBQWlDQyxDQUFqQyxFQUFvQztBQUNsQyxVQUFNQyxNQUFNLElBQUlsRCxNQUFKLENBQVcsU0FBU2dELEdBQVQsR0FBZSxNQUExQixFQUFrQyxHQUFsQyxDQUFaO0FBQ0EsUUFBSUcsYUFBSjs7QUFDQSxRQUFJSCxRQUFRLEdBQVIsSUFBZUEsUUFBUSxHQUF2QixJQUE4QkEsUUFBUSxHQUF0QyxJQUE2Q0EsUUFBUSxHQUF6RCxFQUE4RDtBQUM1REcsc0JBQWdCSixLQUFLOUIsT0FBTCxDQUFhK0IsR0FBYixFQUFrQkMsQ0FBbEIsQ0FBaEI7QUFDRCxLQUZELE1BRU87QUFDTEcsZ0JBQVVMLEtBQUtiLEtBQUwsQ0FBV2UsQ0FBWCxFQUFjaEQsS0FBZCxDQUFvQmlELEdBQXBCLENBQVY7O0FBQ0EsVUFBSUUsT0FBSixFQUFhO0FBQ1hELHdCQUFnQkMsUUFBUUMsS0FBUixHQUFnQkosQ0FBaEM7QUFDRCxPQUZELE1BRU87QUFDTEUsd0JBQWdCLENBQUMsQ0FBakI7QUFDRDtBQUNGOztBQUNELFdBQU9BLGFBQVA7QUFDRDs7QUFFRCxNQUFJNUMsUUFBUSxDQUFaO0FBQ0EsTUFBSStDLFlBQVksQ0FBaEI7QUFDQSxNQUFJQyxVQUFVLENBQWQ7QUFDQSxNQUFJQyxZQUFZLEVBQWhCO0FBQ0EsTUFBSUMsZ0JBQWdCLEVBQXBCO0FBQ0EsUUFBTXpDLElBQUlVLEdBQUd4QixNQUFiOztBQUNBLE9BQUssSUFBSU0sSUFBSSxDQUFiLEVBQWdCQSxJQUFJUSxDQUFwQixFQUF1QlIsR0FBdkIsRUFBNEI7QUFDMUIsVUFBTWtELE1BQU1qRSxXQUFXaUMsR0FBR2xCLENBQUgsQ0FBWCxFQUFrQkksSUFBbEIsQ0FBWjs7QUFDQSxRQUFJYyxHQUFHbEIsQ0FBSCxFQUFNUyxPQUFOLENBQWMsR0FBZCxJQUFxQixDQUFDLENBQXRCLElBQTJCUyxHQUFHbEIsQ0FBSCxFQUFNUyxPQUFOLENBQWMsR0FBZCxJQUFxQixDQUFDLENBQXJELEVBQXdEO0FBQ3REcUMsbUJBQWEsQ0FBYjtBQUNEOztBQUNELFFBQUs1QixHQUFHbEIsQ0FBSCxFQUFNUyxPQUFOLENBQWMsR0FBZCxJQUFxQixDQUFDLENBQXRCLElBQTJCeUMsT0FBTyxDQUFuQyxJQUEwQ2hDLEdBQUdsQixDQUFILEVBQU1TLE9BQU4sQ0FBYyxHQUFkLElBQXFCLENBQUMsQ0FBdEIsSUFBMkJ5QyxPQUFPLENBQWhGLEVBQW9GO0FBQ2xGLFlBQU0zRCxLQUFLLElBQUlDLE1BQUosQ0FBVyxTQUFTWSxLQUFLZCxJQUFMLENBQVUsR0FBVixDQUFULEdBQTBCLE1BQXJDLEVBQTZDLElBQTdDLENBQVg7QUFDQSxZQUFNNkQsV0FBV3JCLFFBQVF2QyxFQUFSLEVBQVkyQixHQUFHbEIsQ0FBSCxDQUFaLENBQWpCO0FBQ0EsWUFBTW9ELGFBQWFoRCxLQUFLdUIsTUFBTCxDQUFZLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxHQUFYLEVBQWdCLEdBQWhCLEVBQXFCLEdBQXJCLENBQVosQ0FBbkI7O0FBQ0EsV0FBSyxJQUFJMEIsSUFBSSxDQUFiLEVBQWdCQSxJQUFJRixTQUFTekQsTUFBN0IsRUFBcUMyRCxHQUFyQyxFQUEwQztBQUN4QyxZQUFJQyxlQUFlRixXQUNoQkcsR0FEZ0IsQ0FDWEMsQ0FBRCxJQUFPbEIsYUFBYXBCLEdBQUdsQixDQUFILENBQWIsRUFBb0J3RCxDQUFwQixFQUF1QkwsU0FBU0UsQ0FBVCxFQUFZUixLQUFaLEdBQW9CLENBQTNDLENBREssRUFFaEJZLE1BRmdCLENBRVJELENBQUQsSUFBT0EsTUFBTSxDQUFDLENBQVAsSUFBWUEsTUFBTUwsU0FBU0UsQ0FBVCxFQUFZUixLQUY1QixDQUFuQjtBQUdBUyx1QkFBZUksS0FBS0MsR0FBTCxDQUFTLEdBQUdMLFlBQVosQ0FBZjtBQUNBLGNBQU1wRSxNQUFNZ0MsR0FBR2xCLENBQUgsRUFBTTBCLEtBQU4sQ0FBWXlCLFNBQVNFLENBQVQsRUFBWVIsS0FBeEIsRUFBK0JTLFlBQS9CLENBQVo7QUFDQUwsc0JBQWNaLElBQWQsQ0FBbUJuRCxHQUFuQjtBQUNEOztBQUNEYSxlQUFTLENBQVQ7QUFDRDtBQUNGOztBQUVELFFBQU02RCxjQUFjWCxjQUFjWSxRQUFkLEVBQXBCO0FBQ0EsUUFBTUMsY0FBY0YsWUFBWWpELE9BQVosQ0FBb0IsaUJBQXBCLEVBQXVDLEVBQXZDLEVBQTJDQSxPQUEzQyxDQUFtRCxLQUFuRCxFQUEwRCxFQUExRCxDQUFwQjtBQUNBLFNBQU87QUFDTGtCLGNBQVU5QixRQUFRK0MsU0FEYjtBQUVMaUIsVUFBTUQsWUFBWXBFLE1BQVosR0FBcUJ1RCxjQUFjdkQ7QUFGcEMsR0FBUDtBQUlELENBaEVEOztBQWtFQSxNQUFNc0UsY0FBZTlFLEdBQUQsSUFBUztBQUMzQixTQUFPQSxJQUFJeUIsT0FBSixDQUFZLHFCQUFaLEVBQW1DLEdBQW5DLENBQVA7QUFDRCxDQUZEOztBQUlBLE1BQU1zRCxPQUFPLENBQUM5QyxNQUFELEVBQVNqQyxHQUFULEVBQWNnRixFQUFkLEtBQXFCO0FBQ2hDLE1BQUluRSxRQUFRLENBQVo7QUFDQW9CLFdBQVM2QyxZQUFZN0MsTUFBWixDQUFUO0FBQ0FBLFdBQVNBLE9BQU9yQixLQUFQLENBQWEsR0FBYixDQUFUOztBQUNBLE9BQUssSUFBSUUsSUFBSSxDQUFiLEVBQWdCQSxJQUFJbUIsT0FBT3pCLE1BQTNCLEVBQW1DTSxHQUFuQyxFQUF3QztBQUN0QyxRQUFJb0IsSUFBSSxDQUFDcEIsSUFBSSxDQUFMLElBQVVtQixPQUFPekIsTUFBekI7QUFDQSxRQUFJeUUsUUFBUWhELE9BQU9uQixDQUFQLEVBQVVILFdBQVYsRUFBWjtBQUNBLFFBQUl1RSxTQUFTakQsT0FBT0MsQ0FBUCxDQUFiOztBQUNBLFFBQUkrQyxVQUFVLEdBQVYsSUFBaUI3RCxRQUFROEQsTUFBUixFQUFnQkYsRUFBaEIsQ0FBckIsRUFBMEM7QUFDeENuRSxlQUFTLENBQVQ7QUFDRDtBQUNGOztBQUNELFNBQU9BLEtBQVA7QUFDRCxDQWJEOztBQWVBLE1BQU1zRSxZQUFZLENBQUNuRCxFQUFELEVBQUtnRCxFQUFMLEtBQVk7QUFDNUJoRCxPQUFLOEMsWUFBWTlDLEVBQVosQ0FBTDtBQUVBLFFBQU1oQyxNQUFNLEtBQVo7QUFDQSxNQUFJYSxRQUFRLENBQVo7QUFDQSxRQUFNb0IsU0FBU0QsR0FBR3JCLFdBQUgsR0FBaUJDLEtBQWpCLENBQXVCLEdBQXZCLENBQWY7QUFDQSxRQUFNVSxJQUFJVyxPQUFPekIsTUFBakI7O0FBQ0EsT0FBSyxJQUFJTSxJQUFJLENBQWIsRUFBZ0JBLElBQUlRLENBQXBCLEVBQXVCUixHQUF2QixFQUE0QjtBQUMxQixRQUFJb0IsSUFBSSxDQUFDcEIsSUFBSSxDQUFMLElBQVVRLENBQWxCOztBQUNBLFFBQUlXLE9BQU9uQixDQUFQLE1BQWNkLEdBQWQsSUFBcUJvQixRQUFRYSxPQUFPQyxDQUFQLENBQVIsRUFBbUI4QyxFQUFuQixNQUEyQixDQUFwRCxFQUF1RDtBQUNyRG5FLGVBQVMsQ0FBVDtBQUNEO0FBQ0Y7O0FBQ0QsU0FBT0EsS0FBUDtBQUNELENBZEQ7O0FBZ0JBLE1BQU11RSxZQUFZLENBQUNwRCxFQUFELEVBQUtnRCxFQUFMLEtBQVk7QUFDNUIsTUFBSW5FLFFBQVEsQ0FBWjtBQUNBbUIsT0FBSzhDLFlBQVk5QyxFQUFaLENBQUw7QUFDQSxRQUFNQyxTQUFTRCxHQUFHckIsV0FBSCxHQUFpQkMsS0FBakIsQ0FBdUIsR0FBdkIsQ0FBZjtBQUNBLFFBQU1VLElBQUlXLE9BQU96QixNQUFqQjs7QUFDQSxPQUFLLElBQUlNLElBQUksQ0FBYixFQUFnQkEsSUFBSVEsQ0FBcEIsRUFBdUJSLEdBQXZCLEVBQTRCO0FBQzFCLFFBQUlNLFFBQVFhLE9BQU9uQixDQUFQLENBQVIsRUFBbUJrRSxFQUFuQixLQUEwQi9DLE9BQU9uQixDQUFQLE1BQWMsUUFBNUMsRUFBc0Q7QUFDcERELGVBQVMsQ0FBVDtBQUNEO0FBQ0Y7O0FBQ0QsU0FBT0EsS0FBUDtBQUNELENBWEQ7O0FBYUEsTUFBTXdFLGVBQWdCckYsR0FBRCxJQUFTO0FBQzVCLE1BQUlhLFFBQVEsQ0FBWjtBQUNBYixRQUFNQSxJQUFJVyxXQUFKLEVBQU47QUFDQVgsUUFBTUEsSUFBSVksS0FBSixDQUFVLEdBQVYsQ0FBTjtBQUNBLFFBQU0wRSxZQUFZLE9BQWxCO0FBQ0EsUUFBTWhFLElBQUl0QixJQUFJUSxNQUFkOztBQUNBLE9BQUssSUFBSU0sSUFBSSxDQUFiLEVBQWdCQSxJQUFJUSxDQUFwQixFQUF1QlIsR0FBdkIsRUFBNEI7QUFDMUIsUUFBSWQsSUFBSWMsQ0FBSixFQUFPQyxRQUFQLENBQWdCdUUsU0FBaEIsQ0FBSixFQUFnQztBQUM5QnpFLGVBQVMsQ0FBVDtBQUNEO0FBQ0Y7O0FBQ0QsU0FBT0EsS0FBUDtBQUNELENBWkQ7O0FBY0EsTUFBTTBFLFlBQWF2RixHQUFELElBQVM7QUFDekIsV0FBU3dGLGVBQVQsQ0FBeUJDLFdBQXpCLEVBQXNDQyxJQUF0QyxFQUE0QztBQUMxQ0QsZ0JBQVlDLElBQVosSUFBb0IsQ0FBQ0QsWUFBWUMsSUFBWixLQUFxQixDQUF0QixJQUEyQixDQUEvQztBQUNBLFdBQU9ELFdBQVA7QUFDRDs7QUFFRCxRQUFNRSxJQUFJLENBQVY7QUFDQSxNQUFJMUYsUUFBUUQsSUFDVHlCLE9BRFMsQ0FDRCxpQkFEQyxFQUNrQixHQURsQixFQUVUQyxJQUZTLEdBR1RkLEtBSFMsQ0FHSCxLQUhHLENBQVo7QUFJQSxNQUFJNkUsY0FBYyxFQUFsQjtBQUNBLE1BQUlHLHFCQUFxQixFQUF6QjtBQUNBLE1BQUlGLElBQUo7QUFDQSxNQUFJRyxTQUFKO0FBQ0EsTUFBSXZELFNBQVMsRUFBYjtBQUVBckMsUUFBTTZGLE1BQU4sQ0FBYU4sZUFBYixFQUE4QkMsV0FBOUI7O0FBQ0EsT0FBS0MsSUFBTCxJQUFhRCxXQUFiLEVBQTBCO0FBQ3hCSSxnQkFBWUosWUFBWUMsSUFBWixDQUFaO0FBQ0EsS0FBQ0UsbUJBQW1CQyxTQUFuQixJQUFnQ0QsbUJBQW1CQyxTQUFuQixLQUFpQyxFQUFsRSxFQUFzRTFDLElBQXRFLENBQTJFdUMsSUFBM0U7QUFDRDs7QUFDRCxTQUFPcEQsT0FBTzlCLE1BQVAsR0FBZ0JtRixDQUFoQixJQUFxQkMsbUJBQW1CcEYsTUFBL0MsRUFBdUQ7QUFDckQsS0FBQ1AsUUFBUTJGLG1CQUFtQkcsR0FBbkIsRUFBVCxNQUF1Q3pELFNBQVNBLE9BQU9HLE1BQVAsQ0FBY3hDLEtBQWQsQ0FBaEQ7QUFDRDs7QUFDRCxTQUFPcUMsT0FBT0UsS0FBUCxDQUFhLENBQWIsRUFBZ0JtRCxDQUFoQixDQUFQO0FBQ0QsQ0ExQkQ7O0FBNEJBLE1BQU1LLGVBQWdCaEUsRUFBRCxJQUFRO0FBQzNCLE1BQUlpRSxPQUFPLENBQVg7O0FBQ0EsT0FBSyxJQUFJQyxLQUFLLENBQWQsRUFBaUJBLEtBQUtsRSxHQUFHeEIsTUFBekIsRUFBaUMwRixJQUFqQyxFQUF1QztBQUNyQyxVQUFNQyxRQUFRbkUsR0FBR2tFLEVBQUgsRUFBT3pFLE9BQVAsQ0FBZSxpQkFBZixFQUFrQyxFQUFsQyxFQUFzQ0MsSUFBdEMsRUFBZDtBQUNBdUUsWUFBUUUsTUFBTTNGLE1BQWQ7QUFDRDs7QUFFRCxTQUFPeUYsT0FBT2pFLEdBQUd4QixNQUFqQjtBQUNELENBUkQ7O0FBVUEsTUFBTTRGLFFBQVEsQ0FDWjtBQUFDQyxXQUFTLElBQVY7QUFBZ0JuRixRQUFNO0FBQXRCLENBRFksRUFFWjtBQUFDbUYsV0FBUyxJQUFWO0FBQWdCbkYsUUFBTTtBQUF0QixDQUZZLEVBR1o7QUFBQ21GLFdBQVMsSUFBVjtBQUFnQm5GLFFBQU07QUFBdEIsQ0FIWSxFQUlaO0FBQUNtRixXQUFTLElBQVY7QUFBZ0JuRixRQUFNO0FBQXRCLENBSlksRUFLWjtBQUFDbUYsV0FBUyxJQUFWO0FBQWdCbkYsUUFBTTtBQUF0QixDQUxZLEVBTVo7QUFBQ21GLFdBQVMsSUFBVjtBQUFnQm5GLFFBQU07QUFBdEIsQ0FOWSxFQU9aO0FBQUNtRixXQUFTLElBQVY7QUFBZ0JuRixRQUFNO0FBQXRCLENBUFksRUFRWjtBQUFDbUYsV0FBUyxJQUFWO0FBQWdCbkYsUUFBTTtBQUF0QixDQVJZLEVBU1o7QUFBQ21GLFdBQVMsSUFBVjtBQUFnQm5GLFFBQU07QUFBdEIsQ0FUWSxFQVVaO0FBQUNtRixXQUFTLElBQVY7QUFBZ0JuRixRQUFNO0FBQXRCLENBVlksRUFXWjtBQUFDbUYsV0FBUyxJQUFWO0FBQWdCbkYsUUFBTTtBQUF0QixDQVhZLEVBWVo7QUFBQ21GLFdBQVMsSUFBVjtBQUFnQm5GLFFBQU07QUFBdEIsQ0FaWSxFQWFaO0FBQUNtRixXQUFTLElBQVY7QUFBZ0JuRixRQUFNO0FBQXRCLENBYlksRUFjWjtBQUFDbUYsV0FBUyxJQUFWO0FBQWdCbkYsUUFBTTtBQUF0QixDQWRZLEVBZVo7QUFBQ21GLFdBQVMsSUFBVjtBQUFnQm5GLFFBQU07QUFBdEIsQ0FmWSxFQWdCWjtBQUFDbUYsV0FBUyxJQUFWO0FBQWdCbkYsUUFBTTtBQUF0QixDQWhCWSxDQUFkO0FBbUJBLE1BQU1vRixRQUFRLENBQ1o7QUFBQ0QsV0FBUyxJQUFWO0FBQWdCbkYsUUFBTSxFQUF0QjtBQUEwQnFGLFFBQU07QUFBaEMsQ0FEWSxFQUVaO0FBQUNGLFdBQVMsSUFBVjtBQUFnQm5GLFFBQU0sRUFBdEI7QUFBMEJxRixRQUFNO0FBQWhDLENBRlksRUFHWjtBQUFDRixXQUFTLElBQVY7QUFBZ0JFLFFBQU07QUFBdEIsQ0FIWSxFQUlaO0FBQUNGLFdBQVMsSUFBVjtBQUFnQm5GLFFBQU0sV0FBdEI7QUFBbUNxRixRQUFNO0FBQXpDLENBSlksRUFLWjtBQUFDRixXQUFTLElBQVY7QUFBZ0JFLFFBQU07QUFBdEIsQ0FMWSxFQU1aO0FBQUNGLFdBQVMsSUFBVjtBQUFnQkUsUUFBTTtBQUF0QixDQU5ZLENBQWQ7QUFTQSxNQUFNQyxRQUFRLENBQ1o7QUFDRUgsV0FBUyxJQURYO0FBRUVFLFFBQU07QUFGUixDQURZLEVBS1o7QUFBQ0YsV0FBUyxJQUFWO0FBQWdCRSxRQUFNO0FBQXRCLENBTFksQ0FBZDtBQVFBRSxPQUFPQyxPQUFQLENBQWU7QUFDUEMsYUFBTixDQUFrQkMsSUFBbEIsRUFBd0JDLE9BQXhCO0FBQUEsb0NBQWlDO0FBQy9CLFlBQU12RixJQUFJc0YsS0FBS0UsTUFBTCxDQUFZdEcsTUFBdEI7QUFDQSxVQUFJOEIsU0FBUyxFQUFiOztBQUNBLFdBQUssSUFBSXhCLElBQUksQ0FBYixFQUFnQkEsSUFBSVEsQ0FBcEIsRUFBdUJSLEdBQXZCLEVBQTRCO0FBQzFCLGNBQU1nRyxTQUFTRixLQUFLRSxNQUFMLENBQVloRyxDQUFaLENBQWY7QUFDQSxjQUFNdUMsT0FBT3VELEtBQUt2RCxJQUFMLENBQVV2QyxDQUFWLENBQWI7QUFDQSxjQUFNaUcsUUFBUUgsS0FBS0ksSUFBTCxDQUFVbEcsQ0FBVixDQUFkO0FBQ0EsY0FBTW1HLFFBQVE7QUFDWkgsa0JBQVFBO0FBREksU0FBZDs7QUFHQSxZQUFJekQsSUFBSixFQUFVO0FBQ1I0RCxnQkFBTTVELElBQU4sR0FBYUEsSUFBYjtBQUNEOztBQUNELFlBQUkwRCxLQUFKLEVBQVc7QUFDVEUsZ0JBQU1ELElBQU4sR0FBYUQsS0FBYjtBQUNEOztBQUNELFlBQUlHLFVBQUo7O0FBQ0EsWUFBSUwsUUFBUU0sU0FBWixFQUF1QjtBQUNyQkQsdUJBQWF0SixNQUFNd0osSUFBTixHQUFhQyxLQUFiLEVBQWI7QUFDRCxTQUZELE1BRU87QUFDTEgsdUJBQWF0SixNQUFNd0osSUFBTixDQUFXSCxLQUFYLEVBQWtCSSxLQUFsQixFQUFiO0FBQ0Q7O0FBQ0QsY0FBTUMsWUFBWSxPQUFsQjs7QUFDQSxhQUFLLElBQUlDLEdBQVQsSUFBZ0JMLFVBQWhCLEVBQTRCO0FBQzFCLGNBQUlNLFFBQVEsRUFBWjtBQUNBLGNBQUlDLFlBQVlGLEdBQWhCO0FBQ0EsZ0JBQU1HLGVBQWViLFFBQVFSLE9BQTdCO0FBQ0EsY0FBSTdELFFBQVE4RSxVQUFVMUcsS0FBVixDQUFnQixHQUFoQixDQUFaOztBQUNBLGVBQUssSUFBSUUsSUFBSSxDQUFiLEVBQWdCQSxJQUFJMEIsTUFBTWhDLE1BQTFCLEVBQWtDTSxHQUFsQyxFQUF1QztBQUNyQzJHLHdCQUFZQSxVQUFVakYsTUFBTTFCLENBQU4sQ0FBVixDQUFaO0FBQ0Q7O0FBQ0QsY0FBSTJHLFNBQUosRUFBZTtBQUNiLGtCQUFNVCxPQUFPTyxJQUFJSSxLQUFqQjtBQUNBLGdCQUFJQyxlQUFlWixLQUFLdkYsT0FBTCxDQUFhLG9CQUFiLEVBQW1DLEVBQW5DLEVBQXVDQyxJQUF2QyxFQUFuQjtBQUNBLGtCQUFNbUcsWUFBWTVKLFVBQVU0SixTQUFWLENBQW9CTixJQUFJSSxLQUF4QixFQUErQjtBQUMvQzdILDZCQUFlQTtBQURnQyxhQUEvQixDQUFsQjtBQUdBLGtCQUFNRyxRQUFRNEIsT0FBT0wsV0FBV3dGLElBQVgsQ0FBUCxDQUFkO0FBQ0Esa0JBQU1jLGFBQWFqRyxPQUFPTSxVQUFVNkUsSUFBVixDQUFQLENBQW5COztBQUNBLGlCQUFLLElBQUllLElBQUksQ0FBYixFQUFnQkEsSUFBSTNCLE1BQU01RixNQUExQixFQUFrQ3VILEdBQWxDLEVBQXVDO0FBQ3JDLG9CQUFNQyxJQUFJNUIsTUFBTTJCLENBQU4sRUFBUzFCLE9BQW5COztBQUNBLGtCQUFJcUIsYUFBYTNHLFFBQWIsQ0FBc0JpSCxDQUF0QixDQUFKLEVBQThCO0FBQzVCLG9CQUFJQyxLQUFKOztBQUNBLG9CQUFJO0FBQ0Ysd0JBQU1BLFFBQVFsSSxXQUFXaUgsSUFBWCxvQkFBaUJrQixLQUFLOUIsTUFBTTJCLENBQU4sRUFBUzdHLElBQWQsQ0FBakIsRUFBZDtBQUNBc0csd0JBQU1RLENBQU4sSUFBV3JHLE9BQU9zRyxRQUFRSCxVQUFmLENBQVg7QUFDRCxpQkFIRCxDQUdFLE9BQU9LLEtBQVAsRUFBYztBQUNkQywwQkFBUUMsR0FBUixDQUFZRixLQUFaO0FBQ0Q7QUFDRjtBQUNGOztBQUVELGlCQUFLLElBQUlHLElBQUksQ0FBYixFQUFnQkEsSUFBSWhDLE1BQU05RixNQUExQixFQUFrQzhILEdBQWxDLEVBQXVDO0FBQ3JDLG9CQUFNTixJQUFJMUIsTUFBTWdDLENBQU4sRUFBU2pDLE9BQW5COztBQUNBLGtCQUFJcUIsYUFBYTNHLFFBQWIsQ0FBc0JpSCxDQUF0QixDQUFKLEVBQThCO0FBQzVCLHNCQUFNN0QsSUFBSW1DLE1BQU1nQyxDQUFOLEVBQVMvQixJQUFuQjtBQUNBLG9CQUFJMEIsS0FBSjs7QUFDQSxvQkFBSTtBQUNGLHNCQUFJM0IsTUFBTWdDLENBQU4sRUFBU3BILElBQVQsS0FBa0IsV0FBdEIsRUFBbUM7QUFDakMsd0JBQUkrRywwQkFBUUMsS0FBSy9ELENBQUwsQ0FBUixDQUFKO0FBQ0FxRCwwQkFBTWUsRUFBTixHQUFXNUcsT0FBT3NHLE1BQU10RixRQUFiLENBQVg7QUFDQTZFLDBCQUFNZ0IsRUFBTixHQUFXN0csT0FBT3NHLE1BQU1wRCxJQUFiLENBQVg7QUFDRCxtQkFKRCxNQUlPLElBQUl5QixNQUFNZ0MsQ0FBTixFQUFTakMsT0FBVCxLQUFxQixJQUF6QixFQUErQjtBQUNwQyx3QkFBSTRCLDBCQUFRQyxLQUFLL0QsQ0FBTCxDQUFSLENBQUo7QUFDQXFELDBCQUFNUSxDQUFOLElBQVdDLEtBQVg7QUFDRCxtQkFITSxNQUdBLElBQUkzQixNQUFNZ0MsQ0FBTixFQUFTcEgsSUFBVCxLQUFrQixFQUF0QixFQUEwQjtBQUMvQix3QkFBSStHLDBCQUFRQyxLQUFLL0QsQ0FBTCxDQUFSLENBQUo7QUFDQXFELDBCQUFNUSxDQUFOLElBQVdyRyxPQUFPc0csUUFBUUgsVUFBZixDQUFYO0FBQ0QsbUJBSE0sTUFHQTtBQUNMLHdCQUFJRywwQkFBUUMsS0FBSy9ELENBQUwsQ0FBUixDQUFKO0FBQ0FxRCwwQkFBTVEsQ0FBTixJQUFXckcsT0FBT3NHLFFBQVFILFVBQWYsQ0FBWDtBQUNEO0FBQ0YsaUJBZkQsQ0FlRSxPQUFPSyxLQUFQLEVBQWM7QUFDZEMsMEJBQVFDLEdBQVIsQ0FBWUYsS0FBWjtBQUNEO0FBQ0Y7QUFDRjs7QUFFRCxpQkFBSyxJQUFJckgsSUFBSSxDQUFiLEVBQWdCQSxJQUFJMEYsTUFBTWhHLE1BQTFCLEVBQWtDTSxHQUFsQyxFQUF1QztBQUNyQyxvQkFBTWtILElBQUl4QixNQUFNMUYsQ0FBTixFQUFTdUYsT0FBbkI7O0FBQ0Esa0JBQUlxQixhQUFhM0csUUFBYixDQUFzQmlILENBQXRCLENBQUosRUFBOEI7QUFDNUIsc0JBQU03RCxJQUFJcUMsTUFBTTFGLENBQU4sRUFBU3lGLElBQW5CO0FBQ0Esb0JBQUkwQixLQUFKOztBQUNBLG9CQUFJO0FBQ0Ysd0JBQU1BLDBCQUFRQyxLQUFLL0QsQ0FBTCxDQUFSLENBQU47QUFDQXFELHdCQUFNUSxDQUFOLElBQVdyRyxPQUFPc0csUUFBUUgsVUFBZixDQUFYO0FBQ0QsaUJBSEQsQ0FHRSxPQUFPSyxLQUFQLEVBQWM7QUFDZEMsMEJBQVFDLEdBQVIsQ0FBWUYsS0FBWjtBQUNEO0FBQ0Y7QUFDRjs7QUFFRCxnQkFBSU4sVUFBVXJILE1BQVYsSUFBb0IsQ0FBeEIsRUFBMkI7QUFDekJnSCxvQkFBTWlCLEVBQU4sR0FBVyxDQUFYO0FBQ0QsYUFGRCxNQUVPO0FBQ0xqQixvQkFBTWlCLEVBQU4sR0FBVzlHLE9BQU9xRSxhQUFhNkIsU0FBYixDQUFQLENBQVg7QUFDRDs7QUFDREwsa0JBQU1NLFVBQU4sR0FBbUJBLFdBQVdZLGNBQVgsRUFBbkI7QUFDQWxCLGtCQUFNdkgsS0FBTixHQUFjQSxNQUFNeUksY0FBTixFQUFkOztBQUNBLGdCQUFJbkIsSUFBSVAsSUFBUixFQUFjO0FBQ1pRLG9CQUFNakIsSUFBTixHQUFhZ0IsSUFBSVQsTUFBSixHQUFhLEdBQWIsR0FBbUJTLElBQUlsRSxJQUF2QixHQUE4QixHQUE5QixHQUFvQ2tFLElBQUlQLElBQXJEO0FBQ0QsYUFGRCxNQUVPLElBQUlPLElBQUlsRSxJQUFSLEVBQWM7QUFDbkJtRSxvQkFBTWpCLElBQU4sR0FBYWdCLElBQUlULE1BQUosR0FBYSxHQUFiLEdBQW1CUyxJQUFJbEUsSUFBcEM7QUFDRCxhQUZNLE1BRUE7QUFDTG1FLG9CQUFNakIsSUFBTixHQUFhZ0IsSUFBSVQsTUFBakI7QUFDRDs7QUFDRFUsa0JBQU1LLFNBQU4sR0FBa0JBLFVBQVVySCxNQUE1QjtBQUNBZ0gsa0JBQU1tQixJQUFOLEdBQWFwQixJQUFJcUIsTUFBakI7QUFDRDs7QUFDRHRHLGlCQUFPYSxJQUFQLENBQVlxRSxLQUFaO0FBQ0Q7QUFDRjs7QUFDRCxhQUFPbEYsTUFBUDtBQUNELEtBakhEO0FBQUEsR0FEYTs7QUFtSGJ1RyxZQUFVO0FBQ1IsVUFBTUMsY0FBY2pMLE9BQU91SixJQUFQLEdBQ2pCQyxLQURpQixHQUVqQmhELEdBRmlCLENBRVpDLENBQUQsSUFBT0EsRUFBRXdDLE1BRkksQ0FBcEI7QUFHQSxXQUFPLENBQUMsR0FBRyxJQUFJaUMsR0FBSixDQUFRRCxXQUFSLENBQUosQ0FBUDtBQUNELEdBeEhZOztBQXlIYkUsUUFBTWxDLE1BQU4sRUFBYztBQUNaLFVBQU1tQyxZQUFZbkwsUUFBUXNKLElBQVIsQ0FBYTtBQUFDTixjQUFRQTtBQUFULEtBQWIsRUFBK0I7QUFBQ29DLFlBQU07QUFBQ0MsYUFBSyxDQUFDO0FBQVA7QUFBUCxLQUEvQixFQUNmOUIsS0FEZSxHQUVmaEQsR0FGZSxDQUVWQyxDQUFELElBQU9BLEVBQUVqQixJQUZFLENBQWxCO0FBR0EsV0FBTyxDQUFDLEdBQUcsSUFBSTBGLEdBQUosQ0FBUUUsU0FBUixDQUFKLENBQVA7QUFDRCxHQTlIWTs7QUErSGJHLFFBQU10QyxNQUFOLEVBQWN6RCxJQUFkLEVBQW9CO0FBQ2xCLFVBQU1nRyxZQUFZdkwsUUFBUXNKLElBQVIsQ0FBYTtBQUFDTixjQUFRQSxNQUFUO0FBQWlCekQsWUFBTUE7QUFBdkIsS0FBYixFQUEyQztBQUFDNkYsWUFBTTtBQUFDQyxhQUFLLENBQUM7QUFBUDtBQUFQLEtBQTNDLEVBQ2Y5QixLQURlLEdBRWZoRCxHQUZlLENBRVZDLENBQUQsSUFBT0EsRUFBRTBDLElBRkUsQ0FBbEI7QUFHQSxXQUFPLENBQUMsR0FBRyxJQUFJK0IsR0FBSixDQUFRTSxTQUFSLENBQUosQ0FBUDtBQUNEOztBQXBJWSxDQUFmLEU7Ozs7Ozs7Ozs7O0FDemdDQSxJQUFJNUMsTUFBSjtBQUFXakosT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGVBQVIsQ0FBYixFQUFzQztBQUFDK0ksU0FBT3pJLENBQVAsRUFBUztBQUFDeUksYUFBT3pJLENBQVA7QUFBUzs7QUFBcEIsQ0FBdEMsRUFBNEQsQ0FBNUQ7QUFBK0RSLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSx5QkFBUixDQUFiLEUiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi9yZWdpc3Rlci1hcGkuanMnO1xuIiwiaW1wb3J0IFwiLi4vLi4vYXBpL3N0eWxvbWV0cnkuanNcIjtcbiIsImltcG9ydCB7TW9uZ299IGZyb20gXCJtZXRlb3IvbW9uZ29cIjtcbmltcG9ydCB0b2tlbml6ZXIgZnJvbSBcIkBrbm9kL3NiZFwiO1xuXG5leHBvcnQgY29uc3QgU3R5bG8gPSBuZXcgTW9uZ28uQ29sbGVjdGlvbihcInN0eWxvXCIpO1xuZXhwb3J0IGNvbnN0IEF1dGhvciA9IG5ldyBNb25nby5Db2xsZWN0aW9uKFwiYXV0aG9yXCIpO1xuZXhwb3J0IGNvbnN0IEF1dGhvcnMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbihcImF1dGhvcnNcIik7XG5cbmNvbnN0IHBlcnNvbmFsUHJvbm91biA9IFtcbiAgXCJlZ29cIixcbiAgXCJtZWlcIixcbiAgXCJtaWhpXCIsXG4gIFwibWVcIixcbiAgXCJ0dVwiLFxuICBcInR1aVwiLFxuICBcInRpYmlcIixcbiAgXCJ0ZVwiLFxuICBcIm5vc1wiLFxuICBcIm5vc3RyaVwiLFxuICBcIm5vYmlzXCIsXG4gIFwidm9zXCIsXG4gIFwidmVzdHJpXCIsXG4gIFwidm9iaXNcIixcbiAgXCJ1b3NcIixcbiAgXCJ1ZXN0cmlcIixcbiAgXCJ1b2Jpc1wiLFxuICBcIm1pXCIsXG4gIFwibm9zdHJ1bVwiLFxuICBcInZlc3RydW1cIixcbiAgXCJ2b3N0cnVtXCIsXG4gIFwidm9zdHJpXCIsXG4gIFwidWVzdHJ1bVwiLFxuICBcInVvc3RydW1cIixcbiAgXCJ1b3N0cmlcIixcbiAgXCJlZ29xdWVcIixcbiAgXCJtZWlxdWVcIixcbiAgXCJtaWhpcXVlXCIsXG4gIFwibWVxdWVcIixcbiAgXCJ0dXF1ZVwiLFxuICBcInR1aXF1ZVwiLFxuICBcInRpYmlxdWVcIixcbiAgXCJ0ZXF1ZVwiLFxuICBcIm5vc3F1ZVwiLFxuICBcIm5vc3RyaXF1ZVwiLFxuICBcIm5vYmlzcXVlXCIsXG4gIFwidm9zcXVlXCIsXG4gIFwidmVzdHJpcXVlXCIsXG4gIFwidm9iaXNxdWVcIixcbiAgXCJ1b3NxdWVcIixcbiAgXCJ1ZXN0cmlxdWVcIixcbiAgXCJ1b2Jpc3F1ZVwiLFxuICBcIm1pcXVlXCIsXG4gIFwibm9zdHJ1bXF1ZVwiLFxuICBcInZlc3RydW1xdWVcIixcbiAgXCJ2b3N0cnVtcXVlXCIsXG4gIFwidm9zdHJpcXVlXCIsXG4gIFwidWVzdHJ1bXF1ZVwiLFxuICBcInVvc3RydW1xdWVcIixcbiAgXCJ1b3N0cmlxdWVcIlxuXTtcblxuY29uc3QgZGVtb25zdHJhdGl2ZVByb25vdW4gPSBbXG4gIFwiaGljXCIsXG4gIFwiaHVuY1wiLFxuICBcImh1aXVzXCIsXG4gIFwiaHVpY1wiLFxuICBcImhvY1wiLFxuICBcImhhZWNcIixcbiAgXCJoYW5jXCIsXG4gIFwiaGFjXCIsXG4gIFwiaGlcIixcbiAgXCJob3NcIixcbiAgXCJob3J1bVwiLFxuICBcImhpc1wiLFxuICBcImhhZVwiLFxuICBcImhhc1wiLFxuICBcImhhcnVtXCIsXG4gIFwiaG9cIixcbiAgXCJoYVwiLFxuICBcImlsbGVcIixcbiAgXCJpbGx1bVwiLFxuICBcImlsbGl1c1wiLFxuICBcImlsbGlcIixcbiAgXCJpbGxvXCIsXG4gIFwiaWxsYVwiLFxuICBcImlsbGFtXCIsXG4gIFwiaWxsdWRcIixcbiAgXCJpbGxvc1wiLFxuICBcImlsbG9ydW1cIixcbiAgXCJpbGxpc1wiLFxuICBcImlsbGFzXCIsXG4gIFwiaWxsYXJ1bVwiLFxuICBcImlsbGFlXCIsXG4gIFwiaXNcIixcbiAgXCJldW1cIixcbiAgXCJlaXVzXCIsXG4gIFwiZWlcIixcbiAgXCJlb1wiLFxuICBcImVhXCIsXG4gIFwiZWFtXCIsXG4gIFwiaWRcIixcbiAgXCJpaVwiLFxuICBcImVvc1wiLFxuICBcImVvcnVtXCIsXG4gIFwiZWlzXCIsXG4gIFwiaWlzXCIsXG4gIFwiZWFlXCIsXG4gIFwiZWFzXCIsXG4gIFwiZWFydW1cIixcbiAgXCJpbGxpY1wiLFxuICBcImlsbGFlY1wiLFxuICBcImlsbHVjXCIsXG4gIFwiaWxsaWNcIixcbiAgXCJpbGxvY1wiLFxuICBcImlsbHVuY1wiLFxuICBcImlsbGFuY1wiLFxuICBcImlsbGFjXCIsXG4gIFwiaGljcXVlXCIsXG4gIFwiaHVuY3F1ZVwiLFxuICBcImh1aXVzcXVlXCIsXG4gIFwiaHVpY3F1ZVwiLFxuICBcImhvY3F1ZVwiLFxuICBcImhhZWNxdWVcIixcbiAgXCJoYW5jcXVlXCIsXG4gIFwiaGFjcXVlXCIsXG4gIFwiaGlxdWVcIixcbiAgXCJob3NxdWVcIixcbiAgXCJob3J1bXF1ZVwiLFxuICBcImhpc3F1ZVwiLFxuICBcImhhZXF1ZVwiLFxuICBcImhhc3F1ZVwiLFxuICBcImhhcnVtcXVlXCIsXG4gIFwiaG9xdWVcIixcbiAgXCJoYXF1ZVwiLFxuICBcImlsbGVxdWVcIixcbiAgXCJpbGx1bXF1ZVwiLFxuICBcImlsbGl1c3F1ZVwiLFxuICBcImlsbGlxdWVcIixcbiAgXCJpbGxvcXVlXCIsXG4gIFwiaWxsYXF1ZVwiLFxuICBcImlsbGFtcXVlXCIsXG4gIFwiaWxsdWRxdWVcIixcbiAgXCJpbGxvc3F1ZVwiLFxuICBcImlsbG9ydW1xdWVcIixcbiAgXCJpbGxpc3F1ZVwiLFxuICBcImlsbGFzcXVlXCIsXG4gIFwiaWxsYXJ1bXF1ZVwiLFxuICBcImlsbGFlcXVlXCIsXG4gIFwiaXNxdWVcIixcbiAgXCJldW1xdWVcIixcbiAgXCJlaXVzcXVlXCIsXG4gIFwiZWlxdWVcIixcbiAgXCJlb3F1ZVwiLFxuICBcImVhcXVlXCIsXG4gIFwiZWFtcXVlXCIsXG4gIFwiaWRxdWVcIixcbiAgXCJpaXF1ZVwiLFxuICBcImVvc3F1ZVwiLFxuICBcImVvcnVtcXVlXCIsXG4gIFwiZWlzcXVlXCIsXG4gIFwiaWlzcXVlXCIsXG4gIFwiZWFlcXVlXCIsXG4gIFwiZWFzcXVlXCIsXG4gIFwiZWFydW1xdWVcIixcbiAgXCJpbGxpY3F1ZVwiLFxuICBcImlsbGFlY3F1ZVwiLFxuICBcImlsbHVjcXVlXCIsXG4gIFwiaWxsaWNxdWVcIixcbiAgXCJpbGxvY3F1ZVwiLFxuICBcImlsbHVuY3F1ZVwiLFxuICBcImlsbGFuY3F1ZVwiLFxuICBcImlsbGFjcXVlXCJcbl07XG5cbmNvbnN0IHJlZmxleGl2ZVByb25vdW4gPSBbXCJzZVwiLCBcInNpYmlcIiwgXCJzZXNlXCIsIFwic3VpXCIsIFwic2VxdWVcIiwgXCJzaWJpcXVlXCIsIFwic2VzZXF1ZVwiLCBcInN1aXF1ZVwiXTtcblxuY29uc3QgY29uZGl0aW9uYWxDbGF1c2VzID0gW1wic2lcIiwgXCJuaXNpXCIsIFwicXVvZHNpXCIsIFwic2luXCIsIFwiZHVtbW9kb1wiXTtcblxuY29uc3QgY29uanVuY3Rpb25zID0gW1xuICBcImV0XCIsXG4gIFwiYXRxdWVcIixcbiAgXCJhY1wiLFxuICBcImF1dFwiLFxuICBcInZlbFwiLFxuICBcInVlbFwiLFxuICBcImF0XCIsXG4gIFwiYXV0ZW1cIixcbiAgXCJzZWRcIixcbiAgXCJwb3N0cXVhbVwiLFxuICBcImFzdFwiLFxuICBcImRvbmVjXCIsXG4gIFwiZHVtXCIsXG4gIFwiZHVtbW9kb1wiLFxuICBcImVuaW1cIixcbiAgXCJldGlhbVwiLFxuICBcImV0aWFtdHVtXCIsXG4gIFwiZXRpYW10dW5jXCIsXG4gIFwiZXRlbmltXCIsXG4gIFwidmVydW50YW1lblwiLFxuICBcInVlcnVudGFtZW5cIixcbiAgXCJ1ZXJ1bXRhbWVuXCIsXG4gIFwidmVydW10YW1lblwiLFxuICBcInV0cnVtbmFtXCIsXG4gIFwic2V0XCIsXG4gIFwicXVvY2lyY2FcIixcbiAgXCJxdWlhXCIsXG4gIFwicXVhbXF1YW1cIixcbiAgXCJxdWFucXVhbVwiLFxuICBcIm5hbVwiLFxuICBcIm5hbXF1ZVwiLFxuICBcIm5hbnF1ZVwiLFxuICBcIm5lbXBlXCIsXG4gIFwiZHVtcXVlXCIsXG4gIFwiZXRpYW1xdWVcIixcbiAgXCJxdWlhcXVlXCJcbl07XG5cbmNvbnN0IGNvbmp1bmN0aW9uc0luID0gW1wicXVlXCJdO1xuXG5jb25zdCBpZGVtID0gW1xuICBcImlkZW1cIixcbiAgXCJldW5kZW1cIixcbiAgXCJlaXVzZGVtXCIsXG4gIFwiZWlkZW1cIixcbiAgXCJlb2RlbVwiLFxuICBcImVhZGVtXCIsXG4gIFwiZWFuZGVtXCIsXG4gIFwiaWlkZW1cIixcbiAgXCJlb3NkZW1cIixcbiAgXCJlb3J1bmRlbVwiLFxuICBcImVpc2RlbVwiLFxuICBcImlpc2RlbVwiLFxuICBcImVhZWRlbVwiLFxuICBcImVlZGVtXCIsXG4gIFwiZWFzZGVtXCIsXG4gIFwiZWFydW1kZW1cIixcbiAgXCJpc2RlbVwiLFxuICBcImlzZGVtcXVlXCIsXG4gIFwiaWRlbXF1ZVwiLFxuICBcImV1bmRlbXF1ZVwiLFxuICBcImVpdXNkZW1xdWVcIixcbiAgXCJlaWRlbXF1ZVwiLFxuICBcImVvZGVtcXVlXCIsXG4gIFwiZWFkZW1xdWVcIixcbiAgXCJlYW5kZW1xdWVcIixcbiAgXCJpaWRlbXF1ZVwiLFxuICBcImVvc2RlbXF1ZVwiLFxuICBcImVvcnVuZGVtcXVlXCIsXG4gIFwiZWlzZGVtcXVlXCIsXG4gIFwiaWlzZGVtcXVlXCIsXG4gIFwiZWFlZGVtcXVlXCIsXG4gIFwiZWFzZGVtcXVlXCIsXG4gIFwiZWFydW5kZW1xdWVcIlxuXTtcblxuY29uc3QgaXBzZSA9IFtcbiAgXCJpcHNlXCIsXG4gIFwiaXBzdW1cIixcbiAgXCJpcHNpdXNcIixcbiAgXCJpcHNpXCIsXG4gIFwiaXBzb1wiLFxuICBcImlwc2FcIixcbiAgXCJpcHNhbVwiLFxuICBcImlwc29zXCIsXG4gIFwiaXBzb3J1bVwiLFxuICBcImlwc2FzXCIsXG4gIFwiaXBzYXJ1bVwiLFxuICBcImlwc2VxdWVcIixcbiAgXCJpcHN1bXF1ZVwiLFxuICBcImlwc2l1c3F1ZVwiLFxuICBcImlwc2lxdWVcIixcbiAgXCJpcHNvcXVlXCIsXG4gIFwiaXBzYXF1ZVwiLFxuICBcImlwc2FtcXVlXCIsXG4gIFwiaXBzb3NxdWVcIixcbiAgXCJpcHNvcnVtcXVlXCIsXG4gIFwiaXBzYXNxdWVcIixcbiAgXCJpcHNhcnVtcXVlXCJcbl07XG5cbmNvbnN0IGluZGVmID0gW1xuICBcInF1aWRhbVwiLFxuICBcInF1ZW5kYW1cIixcbiAgXCJjdWl1c2RhbVwiLFxuICBcImN1aWRhbVwiLFxuICBcInF1b2RhbVwiLFxuICBcInF1ZWRhbVwiLFxuICBcInF1YW5kYW1cIixcbiAgXCJxdW9kYW1cIixcbiAgXCJxdW9kZGFtXCIsXG4gIFwicXVvc2RhbVwiLFxuICBcInF1b3J1bmRhbVwiLFxuICBcInF1aWJ1c2RhbVwiLFxuICBcInF1YXNkYW1cIixcbiAgXCJxdWFydW5kYW1cIlxuXTtcblxuY29uc3QgaXN0ZSA9IFtcbiAgXCJpc3RlXCIsXG4gIFwiaXN0dW1cIixcbiAgXCJpc3RpdXNcIixcbiAgXCJpc3RpXCIsXG4gIFwiaXN0b1wiLFxuICBcImlzdGFcIixcbiAgXCJpc3RhbVwiLFxuICBcImlzdHVkXCIsXG4gIFwiaXN0b3NcIixcbiAgXCJpc3RvcnVtXCIsXG4gIFwiaXN0aXNcIixcbiAgXCJpc3Rhc1wiLFxuICBcImlzdGFydW1cIixcbiAgXCJpc3RlXCIsXG4gIFwiaXN0dW1cIixcbiAgXCJpc3RpdXNcIixcbiAgXCJpc3RpXCIsXG4gIFwiaXN0b1wiLFxuICBcImlzdGFcIixcbiAgXCJpc3RhbVwiLFxuICBcImlzdHVkXCIsXG4gIFwiaXN0b3NcIixcbiAgXCJpc3RvcnVtXCIsXG4gIFwiaXN0aXNcIixcbiAgXCJpc3Rhc1wiLFxuICBcImlzdGFydW1cIixcbiAgXCJpc3RlcXVlXCIsXG4gIFwiaXN0dW1xdWVcIixcbiAgXCJpc3RpdXNxdWVcIixcbiAgXCJpc3RpcXVlXCIsXG4gIFwiaXN0b3F1ZVwiLFxuICBcImlzdGFxdWVcIixcbiAgXCJpc3RhbXF1ZVwiLFxuICBcImlzdHVkcXVlXCIsXG4gIFwiaXN0b3NxdWVcIixcbiAgXCJpc3RvcnVtcXVlXCIsXG4gIFwiaXN0aXNxdWVcIixcbiAgXCJpc3Rhc3F1ZVwiLFxuICBcImlzdGFydW1xdWVcIlxuXTtcblxuY29uc3QgcXVpZGFtID0gW1xuICBcInF1aWRhbVwiLFxuICBcInF1ZW5kYW1cIixcbiAgXCJjdWl1c2RhbVwiLFxuICBcImN1aWRhbVwiLFxuICBcInF1b2RhbVwiLFxuICBcInF1YWVkYW1cIixcbiAgXCJxdWFuZGFtXCIsXG4gIFwicXVvZGFtXCIsXG4gIFwicXVvZGRhbVwiLFxuICBcInF1b3NkYW1cIixcbiAgXCJxdW9ydW5kYW1cIixcbiAgXCJxdWlidXNkYW1cIixcbiAgXCJxdWFzZGFtXCIsXG4gIFwicXVhcnVuZGFtXCIsXG4gIFwicXVpZGRhbVwiLFxuICBcInF1b2RkYW1cIixcbiAgXCJxdWFkYW1cIixcbiAgXCJxdWlkYW1xdWVcIixcbiAgXCJxdWVuZGFtcXVlXCIsXG4gIFwiY3VpdXNkYW1xdWVcIixcbiAgXCJjdWlkYW1xdWVcIixcbiAgXCJxdW9kYW1xdWVcIixcbiAgXCJxdWFlZGFtcXVlXCIsXG4gIFwicXVhbmRhbXF1ZVwiLFxuICBcInF1b2RhbXF1ZVwiLFxuICBcInF1b2RkYW1xdWVcIixcbiAgXCJxdW9zZGFtcXVlXCIsXG4gIFwicXVvcnVuZGFtcXVlXCIsXG4gIFwicXVpYnVzZGFtcXVlXCIsXG4gIFwicXVhc2RhbXF1ZVwiLFxuICBcInF1YXJ1bmRhbXF1ZVwiLFxuICBcInF1aWRkYW1xdWVcIixcbiAgXCJxdW9kZGFtcXVlXCIsXG4gIFwicXVhZGFtcXVlXCJcbl07XG5cbmNvbnN0IGNvbnNvbmFudCA9IFtcImJcIiwgXCJjXCIsIFwiZFwiLCBcImZcIiwgXCJnXCIsIFwialwiLCBcImtcIiwgXCJsXCIsIFwibVwiLCBcIm5cIiwgXCJwXCIsIFwicVwiLCBcInJcIiwgXCJzXCIsIFwidFwiLCBcInZcIiwgXCJ3XCIsIFwieFwiLCBcInlcIiwgXCJ6XCJdO1xuXG5jb25zdCBhbGl1cyA9IFtcbiAgXCJhbGl1c1wiLFxuICBcImFsaXVtXCIsXG4gIFwiYWxpaVwiLFxuICBcImFsaW9cIixcbiAgXCJhbGlhXCIsXG4gIFwiYWxpYW1cIixcbiAgXCJhbGl1ZFwiLFxuICBcImFsaW9zXCIsXG4gIFwiYWxpb3J1bVwiLFxuICBcImFsaWlzXCIsXG4gIFwiYWxpYWVcIixcbiAgXCJhbGlhc1wiLFxuICBcImFsaWFydW1cIixcbiAgXCJhbGl1c3F1ZVwiLFxuICBcImFsaXVtcXVlXCIsXG4gIFwiYWxpaXF1ZVwiLFxuICBcImFsaW9xdWVcIixcbiAgXCJhbGlhcXVlXCIsXG4gIFwiYWxpYW1xdWVcIixcbiAgXCJhbGl1ZHF1ZVwiLFxuICBcImFsaW9zcXVlXCIsXG4gIFwiYWxpb3J1bXF1ZVwiLFxuICBcImFsaWlzcXVlXCIsXG4gIFwiYWxpYWVxdWVcIixcbiAgXCJhbGlhc3F1ZVwiLFxuICBcImFsaWFydW1xdWVcIlxuXTtcblxuY29uc3QgcHJpdSA9IFtcInByaXVzcXVhbVwiLCBcInByaXVzIHF1YW1cIl07XG5cbmNvbnN0IGFudGVxID0gW1wiYW50ZXF1YW1cIiwgXCJhbnRlIHF1YW1cIl07XG5cbmNvbnN0IHF1b20gPSBbXCJxdW9taW51c1wiLCBcInF1byBtaW51c1wiXTtcblxuY29uc3QgZHVtID0gW1wiZHVtXCIsIFwiZHVtcXVlXCJdO1xuXG5jb25zdCBxdWluID0gW1wicXVpblwiXTtcblxuY29uc3QgbyA9IFtcIm9cIl07XG5cbmNvbnN0IGF0cXVlID0gW1wiYXRxdWVcIl07XG5cbmNvbnN0IHV0ID0gW1widXRcIiwgXCJ1dGVpXCIsIFwidXRxdWVcIl07XG5cbmNvbnN0IGdlcnVuZCA9IFtcIm5kdW1cIiwgXCJuZHVzXCIsIFwibmRvcnVtXCIsIFwibmRhcnVtXCIsIFwibmR1bXF1ZVwiLCBcIm5kdXNxdWVcIiwgXCJuZG9ydW1xdWVcIiwgXCJuZGFydW1xdWVcIl07XG5cbmNvbnN0IHZvY2F0aXZlcyA9IFtcImVcIiwgXCJpXCIsIFwiYVwiLCBcInVcIiwgXCJhZVwiLCBcImVzXCIsIFwidW1cIiwgXCJ1c1wiXTtcblxuY29uc3QgcHJlcG9zaXRpb25zID0gW1xuICBcImFiXCIsXG4gIFwiYWJzXCIsXG4gIFwiZVwiLFxuICBcImV4XCIsXG4gIFwiYXB1ZFwiLFxuICBcImRlXCIsXG4gIFwiY2lzXCIsXG4gIFwiZXJnYVwiLFxuICBcImludGVyXCIsXG4gIFwib2JcIixcbiAgXCJwZW5lc1wiLFxuICBcInBlclwiLFxuICBcInByYWV0ZXJcIixcbiAgXCJwcm9wdGVyXCIsXG4gIFwidHJhbnNcIixcbiAgXCJhYnNxdWVcIixcbiAgXCJwcm9cIixcbiAgXCJ0ZW51c1wiLFxuICBcInN1YlwiLFxuICBcImFxdWVcIixcbiAgXCJhYnF1ZVwiLFxuICBcImVxdWVcIixcbiAgXCJleHF1ZVwiLFxuICBcImFwdWRxdWVcIixcbiAgXCJkZXF1ZVwiLFxuICBcImNpc3F1ZVwiLFxuICBcImVyZ2FxdWVcIixcbiAgXCJpbnRlcnF1ZVwiLFxuICBcIm9icXVlXCIsXG4gIFwicGVuZXNxdWVcIixcbiAgXCJwZXJxdWVcIixcbiAgXCJwcmFldGVycXVlXCIsXG4gIFwicHJvcHRlcnF1ZVwiLFxuICBcInRyYW5zcXVlXCIsXG4gIFwicHJvcXVlXCIsXG4gIFwidGVudXNxdWVcIixcbiAgXCJzdWJxdWVcIlxuXTtcblxuY29uc3QgY3VtQ2xhdXNlcyA9IFtcImFcIiwgXCJlXCIsIFwiaVwiLCBcIm9cIiwgXCJ1XCIsIFwiaXNcIiwgXCJpYnVzXCIsIFwiZWJ1c1wiLCBcIm9idXNcIiwgXCJ1YnVzXCJdO1xuXG5jb25zdCByZWxhdGl2ZXMgPSBbXG4gIFwicXVpXCIsXG4gIFwiY3VpdXNcIixcbiAgXCJjdWlcIixcbiAgXCJxdWVtXCIsXG4gIFwicXVvXCIsXG4gIFwicXVhZVwiLFxuICBcInF1YW1cIixcbiAgXCJxdWFcIixcbiAgXCJxdW9kXCIsXG4gIFwicXVvcnVtXCIsXG4gIFwicXVpYnVzXCIsXG4gIFwicXVvc1wiLFxuICBcInF1YXJ1bVwiLFxuICBcInF1YXNcIlxuXTtcblxuY29uc3QgYWJicmV2aWF0aW9ucyA9IFtcbiAgXCJDYWVzXCIsXG4gIFwiSXVsXCIsXG4gIFwiUGx1clwiLFxuICBcIkF1Z1wiLFxuICBcIlByaWRcIixcbiAgXCJJZFwiLFxuICBcIkthbFwiLFxuICBcIktsXCIsXG4gIFwiTm9uXCIsXG4gIFwiTWVkXCIsXG4gIFwiRXhcIixcbiAgXCJJblwiLFxuICBcIklhblwiLFxuICBcIkZlYlwiLFxuICBcIkZlYnJcIixcbiAgXCJNYXJ0XCIsXG4gIFwiQXByXCIsXG4gIFwiSXVuXCIsXG4gIFwiTWFpXCIsXG4gIFwiTm92XCIsXG4gIFwiT2N0XCIsXG4gIFwiU2VwdFwiLFxuICBcIkRlY1wiLFxuICBcIkZpblwiLFxuICBcIkNvc1wiLFxuICBcIkNvc3NcIixcbiAgXCJQclwiLFxuICBcIlNleHRcIixcbiAgXCJBbm5cIixcbiAgXCJTYWxcIixcbiAgXCJJbXBcIixcbiAgXCJUclwiLFxuICBcIlBsXCIsXG4gIFwiTGVnXCIsXG4gIFwiQWVkXCIsXG4gIFwiQ2Vuc1wiLFxuICBcIkFnclwiLFxuICBcIkFudFwiLFxuICBcIkF1clwiLFxuICBcIkNuXCIsXG4gIFwiU2NyaWJcIixcbiAgXCJGYWJcIixcbiAgXCJQb21cIixcbiAgXCJRdWlyXCIsXG4gIFwiUHVwXCIsXG4gIFwiQW5cIixcbiAgXCJUZXJcIixcbiAgXCJPcFwiLFxuICBcIkdlcm1cIixcbiAgXCJHblwiLFxuICBcIkFwXCIsXG4gIFwiTeKAmVwiLFxuICBcIk1haVwiLFxuICBcIk1hbVwiLFxuICBcIk1lblwiLFxuICBcIk1pblwiLFxuICBcIk9jdFwiLFxuICBcIk9wZXRcIixcbiAgXCJQcm9cIixcbiAgXCJRdWludFwiLFxuICBcIlF1aW5jdFwiLFxuICBcIlNlY1wiLFxuICBcIlNlclwiLFxuICBcIlNlcnRcIixcbiAgXCJTZXJ2XCIsXG4gIFwiU2VxXCIsXG4gIFwiU2V4XCIsXG4gIFwiU3BcIixcbiAgXCJTdFwiLFxuICBcIlRpXCIsXG4gIFwiVGliXCIsXG4gIFwiVm9sXCIsXG4gIFwiVm9wXCIsXG4gIFwiQWVtXCIsXG4gIFwiQWltXCIsXG4gIFwiUm9tXCIsXG4gIFwiUG9udFwiLFxuICBcIkltcFwiLFxuICBcIk1heFwiLFxuICBcIkNvbGxcIixcbiAgXCJPYiBcIixcbiAgXCJMaWJcIixcbiAgXCJDaXJcIixcbiAgXCJWZXJcIixcbiAgXCJJSUlcIixcbiAgXCJFcVwiLFxuICBcImVxXCIsXG4gIFwiSVwiLFxuICBcIklJXCIsXG4gIFwiSUlJXCIsXG4gIFwiSUlJSVwiLFxuICBcIklWXCIsXG4gIFwiVlwiLFxuICBcIlZJXCIsXG4gIFwiVklJXCIsXG4gIFwiVklJSVwiLFxuICBcIlZJSUlJXCIsXG4gIFwiSVhcIixcbiAgXCJYXCIsXG4gIFwiWElcIixcbiAgXCJYSUlcIixcbiAgXCJYSUlJXCIsXG4gIFwiWElJSUlcIixcbiAgXCJYSVZcIixcbiAgXCJYVlwiLFxuICBcIlhWSVwiLFxuICBcIlhWSUlcIixcbiAgXCJYVklJSVwiLFxuICBcIlhWSUlJSVwiLFxuICBcIlhJWFwiLFxuICBcIlhYXCIsXG4gIFwiWFhJXCIsXG4gIFwiWFhJSVwiLFxuICBcIlhYSUlJXCIsXG4gIFwiWFhJSUlJXCIsXG4gIFwiWFhJVlwiLFxuICBcIlhYVlwiLFxuICBcIlhYVklcIixcbiAgXCJYWFZJSVwiLFxuICBcIlhYVklJSVwiLFxuICBcIlhYVklJSUlcIixcbiAgXCJYWElYXCIsXG4gIFwiWFhYXCIsXG4gIFwiWFhYSVwiLFxuICBcIlhYWElJXCIsXG4gIFwiWFhYSUlJXCIsXG4gIFwiWFhYSUlJSVwiLFxuICBcIlhYWElWXCIsXG4gIFwiWFhYVlwiLFxuICBcIlhYWFZJXCIsXG4gIFwiWFhYVklJXCIsXG4gIFwiWFhYVklJSVwiLFxuICBcIlhYWFZJSUlJXCIsXG4gIFwiWFhYSVhcIixcbiAgXCJYWFhYXCIsXG4gIFwiWExcIixcbiAgXCJYTElcIixcbiAgXCJYTElJXCIsXG4gIFwiWExJSUlcIixcbiAgXCJYTElJSUlcIixcbiAgXCJYTElWXCIsXG4gIFwiWExWXCIsXG4gIFwiWExWSVwiLFxuICBcIlhMVklJXCIsXG4gIFwiWExWSUlJXCIsXG4gIFwiWExWSUlJSVwiLFxuICBcIlhMSVhcIixcbiAgXCJMXCIsXG4gIFwiTElcIixcbiAgXCJMSUlcIixcbiAgXCJMSUlJXCIsXG4gIFwiTElJSUlcIixcbiAgXCJMSVZcIixcbiAgXCJMVlwiLFxuICBcIkxWSVwiLFxuICBcIkxWSUlcIixcbiAgXCJMVklJSVwiLFxuICBcIkxWSUlJSVwiLFxuICBcIkxJWFwiLFxuICBcIkxYXCIsXG4gIFwiTFhJXCIsXG4gIFwiTFhJSVwiLFxuICBcIkxYSUlJXCIsXG4gIFwiTFhJSUlJXCIsXG4gIFwiTFhJVlwiLFxuICBcIkxYVlwiLFxuICBcIkxYVklcIixcbiAgXCJMWFZJSVwiLFxuICBcIkxYVklJSVwiLFxuICBcIkxYVklJSUlcIixcbiAgXCJMWElYXCIsXG4gIFwiTFhYXCIsXG4gIFwiTFhYSVwiLFxuICBcIkxYWElJXCIsXG4gIFwiTFhYSUlJXCIsXG4gIFwiTFhYSUlJSVwiLFxuICBcIkxYWElWXCIsXG4gIFwiTFhYVlwiLFxuICBcIkxYWFZJXCIsXG4gIFwiTFhYVklJXCIsXG4gIFwiTFhYVklJSVwiLFxuICBcIkxYWFZJSUlJXCIsXG4gIFwiTFhYSVhcIixcbiAgXCJMWFhYXCIsXG4gIFwiTFhYWElcIixcbiAgXCJMWFhYSUlcIixcbiAgXCJMWFhYSUlJXCIsXG4gIFwiTFhYWElJSUlcIixcbiAgXCJMWFhYSVZcIixcbiAgXCJMWFhYVlwiLFxuICBcIkxYWFhWSVwiLFxuICBcIkxYWFhWSUlcIixcbiAgXCJMWFhYVklJSVwiLFxuICBcIkxYWFhWSUlJSVwiLFxuICBcIkxYWFhJWFwiLFxuICBcIkxYWFhYXCIsXG4gIFwiWENcIixcbiAgXCJYQ0lcIixcbiAgXCJYQ0lJXCIsXG4gIFwiWENJSUlcIixcbiAgXCJYQ0lJSUlcIixcbiAgXCJYQ0lWXCIsXG4gIFwiWENWXCIsXG4gIFwiWENWSVwiLFxuICBcIlhDVklJXCIsXG4gIFwiWENWSUlJXCIsXG4gIFwiWENWSUlJSVwiLFxuICBcIlhDSVhcIixcbiAgXCJDXCIsXG4gIFwiQ0NcIixcbiAgXCJDQ0NcIixcbiAgXCJDQ0NDXCIsXG4gIFwiQ0RcIixcbiAgXCJEXCIsXG4gIFwiRENcIixcbiAgXCJEQ0NcIixcbiAgXCJEQ0NDXCIsXG4gIFwiRENDQ0NcIixcbiAgXCJDTVwiLFxuICBcIk1cIixcbiAgXCJNTVwiLFxuICBcIk1NTVwiLFxuICBcIk1NTU1cIlxuXTtcblxuY29uc3Qgb2NjdXJlbmNlcyA9IChzdHIsIHdvcmRzKSA9PiB7XG4gIGNvbnN0IGVuZCA9IFwiXFxcXGJcIjtcbiAgY29uc3QgcmVnZXggPSBlbmQgKyBcIihcIiArIHdvcmRzLmpvaW4oXCJ8XCIpICsgXCIpXCIgKyBlbmQ7XG4gIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChyZWdleCwgXCJnaVwiKTtcbiAgaWYgKHN0ci5tYXRjaChyZSkpIHtcbiAgICByZXR1cm4gc3RyLm1hdGNoKHJlKS5sZW5ndGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn07XG5cbmNvbnN0IG11bHRpT2NjdXJlbmNlID0gKHN0ciwgbGlzdEFycmF5KSA9PiB7XG4gIHN0ciA9IHN0ci50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiIFwiKTtcbiAgbGV0IGNvdW50ID0gMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAobGlzdEFycmF5LmluY2x1ZGVzKHN0cltpXSkgfHwgc3RyW2ldLmVuZHNXaXRoKFwicXVlXCIpKSB7XG4gICAgICBjb3VudCArPSAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY291bnQ7XG59O1xuXG5jb25zdCBzdGFydFdpdGggPSAoc3RyLCBsaXN0KSA9PiB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzdHIuc3RhcnRzV2l0aChsaXN0W2ldKSkgcmV0dXJuIHRydWU7XG4gIH1cbn07XG5cbmNvbnN0IGVuZFdpdGggPSAoc3RyLCBsaXN0KSA9PiB7XG4gIGxldCBjb3VudCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzdHIuZW5kc1dpdGgobGlzdFtpXSkpIHtcbiAgICAgIGNvdW50ICs9IDE7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb3VudDtcbn07XG5cbmNvbnN0IGludGVycm9nYXRpdmUgPSAoc3RyKSA9PiB7XG4gIGxldCBjb3VudCA9IDA7XG4gIHN0ciA9IHN0ci5zcGxpdChcIiBcIik7XG4gIGNvbnN0IGwgPSBzdHIubGVuZ3RoO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChzdHJbaV0uaW5kZXhPZihcIj9cIikgIT0gLTEpIHtcbiAgICAgIGNvdW50ICs9IDE7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb3VudDtcbn07XG5cbmNvbnN0IGNvdW50V29yZHMgPSAoc3RyKSA9PiB7XG4gIHN0ciA9IHN0ci5yZXBsYWNlKCk7XG4gIHJldHVybiBzdHIudHJpbSgpLnNwbGl0KC9cXHMrLykubGVuZ3RoO1xufTtcblxuY29uc3Qgc2lnRmlnID0gKG51bSkgPT4ge1xuICBpZiAobnVtKSB7XG4gICAgcmV0dXJuIE51bWJlcihudW0udG9GaXhlZCg1KSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHN0YXJ0ZihhMSwgc3RyKSB7XG4gIGNvbnN0IGNvbnNvbmFudCA9IFtcbiAgICBcImJcIixcbiAgICBcImNcIixcbiAgICBcImRcIixcbiAgICBcImZcIixcbiAgICBcImdcIixcbiAgICBcImpcIixcbiAgICBcImtcIixcbiAgICBcImxcIixcbiAgICBcIm1cIixcbiAgICBcIm5cIixcbiAgICBcInBcIixcbiAgICBcInFcIixcbiAgICBcInJcIixcbiAgICBcInNcIixcbiAgICBcInRcIixcbiAgICBcInZcIixcbiAgICBcIndcIixcbiAgICBcInhcIixcbiAgICBcInlcIixcbiAgICBcInpcIlxuICBdO1xuXG4gIGxldCBjb3VudCA9IDA7XG4gIGNvbnN0IHN0cmluZyA9IGExLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCIgXCIpO1xuICBjb25zdCBsID0gc3RyaW5nLmxlbmd0aDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICBsZXQgcCA9IChpICsgMSkgJSBsO1xuICAgIGlmIChzdHJpbmdbaV0gPT09IFwiYXRxdWVcIiAmJiBzdGFydFdpdGgoc3RyaW5nW3BdLCBjb25zb25hbnQpKSB7XG4gICAgICBjb3VudCArPSAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY291bnQ7XG59XG5cbmNvbnN0IGNoYXJDb3VudCA9IChzdHIpID0+IHtcbiAgc3RyID0gc3RyLnJlcGxhY2UoL1teYS16QS1aMC05XSsvZ2ksIFwiXCIpLnJlcGxhY2UoL1xccy9nLCBcIlwiKTtcbiAgcmV0dXJuIHN0ci5sZW5ndGg7XG59O1xuXG5jb25zdCBtdWx0aVNwbGl0ID0gKHN0ciwgZGVsaW1ldGVycykgPT4ge1xuICBjb25zdCByZXN1bHQgPSBbc3RyXTtcbiAgaWYgKHR5cGVvZiBkZWxpbWV0ZXJzID09IFwic3RyaW5nXCIpIGRlbGltZXRlcnMgPSBbZGVsaW1ldGVyc107XG4gIHdoaWxlIChkZWxpbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlc3VsdC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdGVtcFNwbGl0ID0gcmVzdWx0W2ldLnNwbGl0KGRlbGltZXRlcnNbMF0pO1xuICAgICAgcmVzdWx0ID0gcmVzdWx0XG4gICAgICAgIC5zbGljZSgwLCBpKVxuICAgICAgICAuY29uY2F0KHRlbXBTcGxpdClcbiAgICAgICAgLmNvbmNhdChyZXN1bHQuc2xpY2UoaSArIDEpKTtcbiAgICB9XG4gICAgZGVsaW1ldGVycy5zaGlmdCgpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5jb25zdCByZWxhdGl2ZSA9IChhMSwgbGlzdCkgPT4ge1xuICBmdW5jdGlvbiBmaW5kYWxsKHJlZ2V4X3BhdHRlcm4sIHN0cmluZ18pIHtcbiAgICBsZXQgb3V0cHV0X2xpc3QgPSBbXTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgbGV0IGFfbWF0Y2ggPSByZWdleF9wYXR0ZXJuLmV4ZWMoc3RyaW5nXyk7XG4gICAgICBpZiAoYV9tYXRjaCkge1xuICAgICAgICBkZWxldGUgYV9tYXRjaC5pbnB1dDtcbiAgICAgICAgb3V0cHV0X2xpc3QucHVzaChhX21hdGNoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0X2xpc3Q7XG4gIH1cblxuICBmdW5jdGlvbiByZWdleEluZGV4T2YodGV4dCwgcmVnLCB5KSB7XG4gICAgY29uc3QgcmVlID0gbmV3IFJlZ0V4cChcIlxcXFxiKFwiICsgcmVnICsgXCIpXFxcXGJcIiwgXCJpXCIpO1xuICAgIGxldCBpbmRleEluU3VmZml4O1xuICAgIGlmIChyZWcgPT09IFwiLlwiIHx8IHJlZyA9PT0gXCIsXCIgfHwgcmVnID09PSBcIjpcIiB8fCByZWcgPT09IFwiIVwiKSB7XG4gICAgICBpbmRleEluU3VmZml4ID0gdGV4dC5pbmRleE9mKHJlZywgeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmSW5kZXggPSB0ZXh0LnNsaWNlKHkpLm1hdGNoKHJlZSk7XG4gICAgICBpZiAoaWZJbmRleCkge1xuICAgICAgICBpbmRleEluU3VmZml4ID0gaWZJbmRleC5pbmRleCArIHk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmRleEluU3VmZml4ID0gLTE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpbmRleEluU3VmZml4O1xuICB9XG5cbiAgbGV0IGNvdW50ID0gMDtcbiAgbGV0IHNlbnRDb3VudCA9IDA7XG4gIGxldCB0dEFycmF5ID0gMDtcbiAgbGV0IHN0cmluZ0NvbiA9IFtdO1xuICBsZXQgcmVsYXRpdmVBcnJheSA9IFtdO1xuICBjb25zdCBsID0gYTEubGVuZ3RoO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IG9jYyA9IG9jY3VyZW5jZXMoYTFbaV0sIGxpc3QpO1xuICAgIGlmIChhMVtpXS5pbmRleE9mKFwiIVwiKSA+IC0xIHx8IGExW2ldLmluZGV4T2YoXCIuXCIpID4gLTEpIHtcbiAgICAgIHNlbnRDb3VudCArPSAxO1xuICAgIH1cbiAgICBpZiAoKGExW2ldLmluZGV4T2YoXCIhXCIpID4gLTEgJiYgb2NjID49IDEpIHx8IChhMVtpXS5pbmRleE9mKFwiLlwiKSA+IC0xICYmIG9jYyA+PSAxKSkge1xuICAgICAgY29uc3QgcmUgPSBuZXcgUmVnRXhwKFwiXFxcXGIoXCIgKyBsaXN0LmpvaW4oXCJ8XCIpICsgXCIpXFxcXGJcIiwgXCJnaVwiKTtcbiAgICAgIGNvbnN0IGFsbEFycmF5ID0gZmluZGFsbChyZSwgYTFbaV0pO1xuICAgICAgY29uc3QgbWVyZ2VBcnJheSA9IGxpc3QuY29uY2F0KFtcIixcIiwgXCI6XCIsIFwiLlwiLCBcIiFcIiwgXCI7XCJdKTtcbiAgICAgIGZvciAobGV0IGQgPSAwOyBkIDwgYWxsQXJyYXkubGVuZ3RoOyBkKyspIHtcbiAgICAgICAgbGV0IGZvdW5kSW5kZXhlcyA9IG1lcmdlQXJyYXlcbiAgICAgICAgICAubWFwKCh4KSA9PiByZWdleEluZGV4T2YoYTFbaV0sIHgsIGFsbEFycmF5W2RdLmluZGV4ICsgMSkpXG4gICAgICAgICAgLmZpbHRlcigoeCkgPT4geCAhPT0gLTEgJiYgeCAhPT0gYWxsQXJyYXlbZF0uaW5kZXgpO1xuICAgICAgICBmb3VuZEluZGV4ZXMgPSBNYXRoLm1pbiguLi5mb3VuZEluZGV4ZXMpO1xuICAgICAgICBjb25zdCBzdHIgPSBhMVtpXS5zbGljZShhbGxBcnJheVtkXS5pbmRleCwgZm91bmRJbmRleGVzKTtcbiAgICAgICAgcmVsYXRpdmVBcnJheS5wdXNoKHN0cik7XG4gICAgICB9XG4gICAgICBjb3VudCArPSAxO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGZpbmFsU3RyaW5nID0gcmVsYXRpdmVBcnJheS50b1N0cmluZygpO1xuICBjb25zdCBzdHJpbmdDb3VudCA9IGZpbmFsU3RyaW5nLnJlcGxhY2UoL1teYS16QS1aMC05XSsvZ2ksIFwiXCIpLnJlcGxhY2UoL1xccy9nLCBcIlwiKTtcbiAgcmV0dXJuIHtcbiAgICByZWxhdGl2ZTogY291bnQgLyBzZW50Q291bnQsXG4gICAgbWVhbjogc3RyaW5nQ291bnQubGVuZ3RoIC8gcmVsYXRpdmVBcnJheS5sZW5ndGhcbiAgfTtcbn07XG5cbmNvbnN0IHJlbW92ZVB1bmN0ID0gKHN0cikgPT4ge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1teYS16QS1aMC05XFxuXFxyXSsvZ2ksIFwiIFwiKTtcbn07XG5cbmNvbnN0IGVuZGYgPSAoc3RyaW5nLCBzdHIsIGEyKSA9PiB7XG4gIGxldCBjb3VudCA9IDA7XG4gIHN0cmluZyA9IHJlbW92ZVB1bmN0KHN0cmluZyk7XG4gIHN0cmluZyA9IHN0cmluZy5zcGxpdChcIiBcIik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IHAgPSAoaSArIDEpICUgc3RyaW5nLmxlbmd0aDtcbiAgICBsZXQgZmlyc3QgPSBzdHJpbmdbaV0udG9Mb3dlckNhc2UoKTtcbiAgICBsZXQgc2Vjb25kID0gc3RyaW5nW3BdO1xuICAgIGlmIChmaXJzdCA9PT0gXCJvXCIgJiYgZW5kV2l0aChzZWNvbmQsIGEyKSkge1xuICAgICAgY291bnQgKz0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvdW50O1xufTtcblxuY29uc3QgY3VtQ2xhdXNlID0gKGExLCBhMikgPT4ge1xuICBhMSA9IHJlbW92ZVB1bmN0KGExKTtcblxuICBjb25zdCBzdHIgPSBcImN1bVwiO1xuICBsZXQgY291bnQgPSAwO1xuICBjb25zdCBzdHJpbmcgPSBhMS50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiIFwiKTtcbiAgY29uc3QgbCA9IHN0cmluZy5sZW5ndGg7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgbGV0IHAgPSAoaSArIDEpICUgbDtcbiAgICBpZiAoc3RyaW5nW2ldID09PSBzdHIgJiYgZW5kV2l0aChzdHJpbmdbcF0sIGEyKSAhPT0gMSkge1xuICAgICAgY291bnQgKz0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvdW50O1xufTtcblxuY29uc3QgZW5kR2VydW5kID0gKGExLCBhMikgPT4ge1xuICBsZXQgY291bnQgPSAwO1xuICBhMSA9IHJlbW92ZVB1bmN0KGExKTtcbiAgY29uc3Qgc3RyaW5nID0gYTEudG9Mb3dlckNhc2UoKS5zcGxpdChcIiBcIik7XG4gIGNvbnN0IGwgPSBzdHJpbmcubGVuZ3RoO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChlbmRXaXRoKHN0cmluZ1tpXSwgYTIpICYmIHN0cmluZ1tpXSAhPT0gXCJub25kdW1cIikge1xuICAgICAgY291bnQgKz0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvdW50O1xufTtcblxuY29uc3Qgc3VwZXJsYXRpdmVzID0gKHN0cikgPT4ge1xuICBsZXQgY291bnQgPSAwO1xuICBzdHIgPSBzdHIudG9Mb3dlckNhc2UoKTtcbiAgc3RyID0gc3RyLnNwbGl0KFwiIFwiKTtcbiAgY29uc3Qgc3Vic3RyaW5nID0gXCJpc3NpbVwiO1xuICBjb25zdCBsID0gc3RyLmxlbmd0aDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoc3RyW2ldLmluY2x1ZGVzKHN1YnN0cmluZykpIHtcbiAgICAgIGNvdW50ICs9IDE7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb3VudDtcbn07XG5cbmNvbnN0IHRvcE5ncmFtcyA9IChzdHIpID0+IHtcbiAgZnVuY3Rpb24gdXBkYXRlRnJlcXVlbmN5KGZyZXF1ZW5jaWVzLCB3b3JkKSB7XG4gICAgZnJlcXVlbmNpZXNbd29yZF0gPSAoZnJlcXVlbmNpZXNbd29yZF0gfHwgMCkgKyAxO1xuICAgIHJldHVybiBmcmVxdWVuY2llcztcbiAgfVxuXG4gIGNvbnN0IG4gPSA1O1xuICBsZXQgd29yZHMgPSBzdHJcbiAgICAucmVwbGFjZSgvW15hLXpBLVowLTldKy9naSwgXCIgXCIpXG4gICAgLnRyaW0oKVxuICAgIC5zcGxpdCgvXFxzKy8pO1xuICBsZXQgZnJlcXVlbmNpZXMgPSB7fTtcbiAgbGV0IG9yZGVyZWRGcmVxdWVuY2llcyA9IFtdO1xuICBsZXQgd29yZDtcbiAgbGV0IGZyZXF1ZW5jeTtcbiAgbGV0IHJlc3VsdCA9IFtdO1xuXG4gIHdvcmRzLnJlZHVjZSh1cGRhdGVGcmVxdWVuY3ksIGZyZXF1ZW5jaWVzKTtcbiAgZm9yICh3b3JkIGluIGZyZXF1ZW5jaWVzKSB7XG4gICAgZnJlcXVlbmN5ID0gZnJlcXVlbmNpZXNbd29yZF07XG4gICAgKG9yZGVyZWRGcmVxdWVuY2llc1tmcmVxdWVuY3ldID0gb3JkZXJlZEZyZXF1ZW5jaWVzW2ZyZXF1ZW5jeV0gfHwgW10pLnB1c2god29yZCk7XG4gIH1cbiAgd2hpbGUgKHJlc3VsdC5sZW5ndGggPCBuICYmIG9yZGVyZWRGcmVxdWVuY2llcy5sZW5ndGgpIHtcbiAgICAod29yZHMgPSBvcmRlcmVkRnJlcXVlbmNpZXMucG9wKCkpICYmIChyZXN1bHQgPSByZXN1bHQuY29uY2F0KHdvcmRzKSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5zbGljZSgwLCBuKTtcbn07XG5cbmNvbnN0IG1lYW5TZW50ZW5jZSA9IChhMSkgPT4ge1xuICBsZXQgZml2ZSA9IDA7XG4gIGZvciAobGV0IGRlID0gMDsgZGUgPCBhMS5sZW5ndGg7IGRlKyspIHtcbiAgICBjb25zdCBzdHJpcCA9IGExW2RlXS5yZXBsYWNlKC9bXmEtekEtWjAtOV0rL2dpLCBcIlwiKS50cmltKCk7XG4gICAgZml2ZSArPSBzdHJpcC5sZW5ndGg7XG4gIH1cblxuICByZXR1cm4gZml2ZSAvIGExLmxlbmd0aDtcbn07XG5cbmNvbnN0IGxpc3RPID0gW1xuICB7ZmVhdHVyZTogXCJwMVwiLCBsaXN0OiBcInBlcnNvbmFsUHJvbm91blwifSxcbiAge2ZlYXR1cmU6IFwicDJcIiwgbGlzdDogXCJkZW1vbnN0cmF0aXZlUHJvbm91blwifSxcbiAge2ZlYXR1cmU6IFwicDNcIiwgbGlzdDogXCJxdWlkYW1cIn0sXG4gIHtmZWF0dXJlOiBcInA0XCIsIGxpc3Q6IFwicmVmbGV4aXZlUHJvbm91blwifSxcbiAge2ZlYXR1cmU6IFwicDVcIiwgbGlzdDogXCJpc3RlXCJ9LFxuICB7ZmVhdHVyZTogXCJuMVwiLCBsaXN0OiBcImFsaXVzXCJ9LFxuICB7ZmVhdHVyZTogXCJuMlwiLCBsaXN0OiBcImlwc2VcIn0sXG4gIHtmZWF0dXJlOiBcIm4zXCIsIGxpc3Q6IFwiaWRlbVwifSxcbiAge2ZlYXR1cmU6IFwiczZcIiwgbGlzdDogXCJwcml1XCJ9LFxuICB7ZmVhdHVyZTogXCJzNVwiLCBsaXN0OiBcImFudGVxXCJ9LFxuICB7ZmVhdHVyZTogXCJzNFwiLCBsaXN0OiBcInF1b21cIn0sXG4gIHtmZWF0dXJlOiBcInM3XCIsIGxpc3Q6IFwiZHVtXCJ9LFxuICB7ZmVhdHVyZTogXCJzM1wiLCBsaXN0OiBcInF1aW5cIn0sXG4gIHtmZWF0dXJlOiBcIm00XCIsIGxpc3Q6IFwidXRcIn0sXG4gIHtmZWF0dXJlOiBcInMxXCIsIGxpc3Q6IFwiY29uZGl0aW9uYWxDbGF1c2VzXCJ9LFxuICB7ZmVhdHVyZTogXCJtN1wiLCBsaXN0OiBcInByZXBvc2l0aW9uc1wifVxuXTtcblxuY29uc3QgbGlzdEYgPSBbXG4gIHtmZWF0dXJlOiBcIm0xXCIsIGxpc3Q6IFwiXCIsIG5hbWU6IFwiaW50ZXJyb2dhdGl2ZShib29rKVwifSxcbiAge2ZlYXR1cmU6IFwibTNcIiwgbGlzdDogXCJcIiwgbmFtZTogXCJzdXBlcmxhdGl2ZXMoYm9vaylcIn0sXG4gIHtmZWF0dXJlOiBcImMyXCIsIG5hbWU6IFwic3RhcnRmKGJvb2ssIGF0cXVlKVwifSxcbiAge2ZlYXR1cmU6IFwiczhcIiwgbGlzdDogXCJyZWxhdGl2ZXNcIiwgbmFtZTogXCJyZWxhdGl2ZShzZW50ZW5jZXMsIHJlbGF0aXZlcylcIn0sXG4gIHtmZWF0dXJlOiBcIm01XCIsIG5hbWU6IFwiZW5kR2VydW5kKGJvb2ssIGdlcnVuZClcIn0sXG4gIHtmZWF0dXJlOiBcInMyXCIsIG5hbWU6IFwiY3VtQ2xhdXNlKGJvb2ssIGN1bUNsYXVzZXMpXCJ9XG5dO1xuXG5jb25zdCBsaXN0QyA9IFtcbiAge1xuICAgIGZlYXR1cmU6IFwiYzFcIixcbiAgICBuYW1lOiBcIm11bHRpT2NjdXJlbmNlKG5ncmFtUmVtb3ZlZCwgY29uanVuY3Rpb25zLCBjb25qdW5jdGlvbnNJbilcIlxuICB9LFxuICB7ZmVhdHVyZTogXCJtMlwiLCBuYW1lOiBcImVuZGYobmdyYW1SZW1vdmVkLCBvLCB2b2NhdGl2ZXMpXCJ9XG5dO1xuXG5NZXRlb3IubWV0aG9kcyh7XG4gIGFzeW5jIHN0eWxvbWV0cnlmKGRhdGEsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBsID0gZGF0YS5hdXRob3IubGVuZ3RoO1xuICAgIGxldCByZXN1bHQgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgY29uc3QgYXV0aG9yID0gZGF0YS5hdXRob3JbaV07XG4gICAgICBjb25zdCB0ZXh0ID0gZGF0YS50ZXh0W2ldO1xuICAgICAgY29uc3Qgc2Jvb2sgPSBkYXRhLmJvb2tbaV07XG4gICAgICBjb25zdCBxdWVyeSA9IHtcbiAgICAgICAgYXV0aG9yOiBhdXRob3JcbiAgICAgIH07XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICBxdWVyeS50ZXh0ID0gdGV4dDtcbiAgICAgIH1cbiAgICAgIGlmIChzYm9vaykge1xuICAgICAgICBxdWVyeS5ib29rID0gc2Jvb2s7XG4gICAgICB9XG4gICAgICBsZXQgdGVtcEN1cnNvcjtcbiAgICAgIGlmIChvcHRpb25zLnNlbGVjdEFsbCkge1xuICAgICAgICB0ZW1wQ3Vyc29yID0gU3R5bG8uZmluZCgpLmZldGNoKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZW1wQ3Vyc29yID0gU3R5bG8uZmluZChxdWVyeSkuZmV0Y2goKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IFwibmdyYW1cIjtcbiAgICAgIGZvciAobGV0IGRvYyBvZiB0ZW1wQ3Vyc29yKSB7XG4gICAgICAgIGxldCBncmFtciA9IHt9O1xuICAgICAgICBsZXQgY2FuZGlkYXRlID0gZG9jO1xuICAgICAgICBjb25zdCBmZWF0dXJlQXJyYXkgPSBvcHRpb25zLmZlYXR1cmU7XG4gICAgICAgIGxldCBzbGljZSA9IGZpZWxkTmFtZS5zcGxpdChcIi5cIik7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2xpY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjYW5kaWRhdGUgPSBjYW5kaWRhdGVbc2xpY2VbaV1dO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjYW5kaWRhdGUpIHtcbiAgICAgICAgICBjb25zdCBib29rID0gZG9jLm5ncmFtO1xuICAgICAgICAgIGxldCBuZ3JhbVJlbW92ZWQgPSBib29rLnJlcGxhY2UoL1vigJzigJ1cIjs6JixcXC5cXC8/XFxcXC1dL2csIFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICBjb25zdCBzZW50ZW5jZXMgPSB0b2tlbml6ZXIuc2VudGVuY2VzKGRvYy5uZ3JhbSwge1xuICAgICAgICAgICAgYWJicmV2aWF0aW9uczogYWJicmV2aWF0aW9uc1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbnN0IHdvcmRzID0gTnVtYmVyKGNvdW50V29yZHMoYm9vaykpO1xuICAgICAgICAgIGNvbnN0IGNoYXJhY3RlcnMgPSBOdW1iZXIoY2hhckNvdW50KGJvb2spKTtcbiAgICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IGxpc3RPLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICBjb25zdCBiID0gbGlzdE9ba10uZmVhdHVyZTtcbiAgICAgICAgICAgIGlmIChmZWF0dXJlQXJyYXkuaW5jbHVkZXMoYikpIHtcbiAgICAgICAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gb2NjdXJlbmNlcyhib29rLCBldmFsKGxpc3RPW2tdLmxpc3QpKTtcbiAgICAgICAgICAgICAgICBncmFtcltiXSA9IHNpZ0ZpZyh2YWx1ZSAvIGNoYXJhY3RlcnMpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgbGlzdEYubGVuZ3RoOyBtKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGIgPSBsaXN0RlttXS5mZWF0dXJlO1xuICAgICAgICAgICAgaWYgKGZlYXR1cmVBcnJheS5pbmNsdWRlcyhiKSkge1xuICAgICAgICAgICAgICBjb25zdCBkID0gbGlzdEZbbV0ubmFtZTtcbiAgICAgICAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0RlttXS5saXN0ID09PSBcInJlbGF0aXZlc1wiKSB7XG4gICAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBldmFsKGQpO1xuICAgICAgICAgICAgICAgICAgZ3JhbXIuczggPSBzaWdGaWcodmFsdWUucmVsYXRpdmUpO1xuICAgICAgICAgICAgICAgICAgZ3JhbXIuczkgPSBzaWdGaWcodmFsdWUubWVhbik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaXN0RlttXS5mZWF0dXJlID09PSBcIm04XCIpIHtcbiAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IGV2YWwoZCk7XG4gICAgICAgICAgICAgICAgICBncmFtcltiXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGlzdEZbbV0ubGlzdCAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gZXZhbChkKTtcbiAgICAgICAgICAgICAgICAgIGdyYW1yW2JdID0gc2lnRmlnKHZhbHVlIC8gY2hhcmFjdGVycyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IGV2YWwoZCk7XG4gICAgICAgICAgICAgICAgICBncmFtcltiXSA9IHNpZ0ZpZyh2YWx1ZSAvIGNoYXJhY3RlcnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpc3RDLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBiID0gbGlzdENbaV0uZmVhdHVyZTtcbiAgICAgICAgICAgIGlmIChmZWF0dXJlQXJyYXkuaW5jbHVkZXMoYikpIHtcbiAgICAgICAgICAgICAgY29uc3QgZCA9IGxpc3RDW2ldLm5hbWU7XG4gICAgICAgICAgICAgIGxldCB2YWx1ZTtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGV2YWwoZCk7XG4gICAgICAgICAgICAgICAgZ3JhbXJbYl0gPSBzaWdGaWcodmFsdWUgLyBjaGFyYWN0ZXJzKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc2VudGVuY2VzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICBncmFtci5tNiA9IDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdyYW1yLm02ID0gc2lnRmlnKG1lYW5TZW50ZW5jZShzZW50ZW5jZXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZ3JhbXIuY2hhcmFjdGVycyA9IGNoYXJhY3RlcnMudG9Mb2NhbGVTdHJpbmcoKTtcbiAgICAgICAgICBncmFtci53b3JkcyA9IHdvcmRzLnRvTG9jYWxlU3RyaW5nKCk7XG4gICAgICAgICAgaWYgKGRvYy5ib29rKSB7XG4gICAgICAgICAgICBncmFtci5uYW1lID0gZG9jLmF1dGhvciArIFwiIFwiICsgZG9jLnRleHQgKyBcIiBcIiArIGRvYy5ib29rO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZG9jLnRleHQpIHtcbiAgICAgICAgICAgIGdyYW1yLm5hbWUgPSBkb2MuYXV0aG9yICsgXCIgXCIgKyBkb2MudGV4dDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ3JhbXIubmFtZSA9IGRvYy5hdXRob3I7XG4gICAgICAgICAgfVxuICAgICAgICAgIGdyYW1yLnNlbnRlbmNlcyA9IHNlbnRlbmNlcy5sZW5ndGg7XG4gICAgICAgICAgZ3JhbXIudHlwZSA9IGRvYy5mb3JtYXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2goZ3JhbXIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuICBhdXRob3JzKCkge1xuICAgIGNvbnN0IGF1dGhvckFycmF5ID0gQXV0aG9yLmZpbmQoKVxuICAgICAgLmZldGNoKClcbiAgICAgIC5tYXAoKHgpID0+IHguYXV0aG9yKTtcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoYXV0aG9yQXJyYXkpXTtcbiAgfSxcbiAgdGV4dHMoYXV0aG9yKSB7XG4gICAgY29uc3QgdGV4dEFycmF5ID0gQXV0aG9ycy5maW5kKHthdXRob3I6IGF1dGhvcn0sIHtzb3J0OiB7X2lkOiAtMX19KVxuICAgICAgLmZldGNoKClcbiAgICAgIC5tYXAoKHgpID0+IHgudGV4dCk7XG4gICAgcmV0dXJuIFsuLi5uZXcgU2V0KHRleHRBcnJheSldO1xuICB9LFxuICBib29rcyhhdXRob3IsIHRleHQpIHtcbiAgICBjb25zdCBib29rQXJyYXkgPSBBdXRob3JzLmZpbmQoe2F1dGhvcjogYXV0aG9yLCB0ZXh0OiB0ZXh0fSwge3NvcnQ6IHtfaWQ6IC0xfX0pXG4gICAgICAuZmV0Y2goKVxuICAgICAgLm1hcCgoeCkgPT4geC5ib29rKTtcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoYm9va0FycmF5KV07XG4gIH1cbn0pO1xuIiwiaW1wb3J0IHtNZXRlb3J9IGZyb20gXCJtZXRlb3IvbWV0ZW9yXCI7XG5pbXBvcnQgXCIvaW1wb3J0cy9zdGFydHVwL3NlcnZlclwiO1xuIl19
