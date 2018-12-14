import {Mongo} from "meteor/mongo";
import tokenizer from "@knod/sbd";

export const Stylo = new Mongo.Collection("stylo");
export const Author = new Mongo.Collection("author");
export const Authors = new Mongo.Collection("authors");

const personalPronoun = [
  "ego",
  "mei",
  "mihi",
  "me",
  "tu",
  "tui",
  "tibi",
  "te",
  "nos",
  "nostri",
  "nobis",
  "vos",
  "vestri",
  "vobis",
  "uos",
  "uestri",
  "uobis",
  "mi",
  "nostrum",
  "vestrum",
  "vostrum",
  "vostri",
  "uestrum",
  "uostrum",
  "uostri",
  "egoque",
  "meique",
  "mihique",
  "meque",
  "tuque",
  "tuique",
  "tibique",
  "teque",
  "nosque",
  "nostrique",
  "nobisque",
  "vosque",
  "vestrique",
  "vobisque",
  "uosque",
  "uestrique",
  "uobisque",
  "mique",
  "nostrumque",
  "vestrumque",
  "vostrumque",
  "vostrique",
  "uestrumque",
  "uostrumque",
  "uostrique"
];

const demonstrativePronoun = [
  "hic",
  "hunc",
  "huius",
  "huic",
  "hoc",
  "haec",
  "hanc",
  "hac",
  "hi",
  "hos",
  "horum",
  "his",
  "hae",
  "has",
  "harum",
  "ho",
  "ha",
  "ille",
  "illum",
  "illius",
  "illi",
  "illo",
  "illa",
  "illam",
  "illud",
  "illos",
  "illorum",
  "illis",
  "illas",
  "illarum",
  "illae",
  "is",
  "eum",
  "eius",
  "ei",
  "eo",
  "ea",
  "eam",
  "id",
  "ii",
  "eos",
  "eorum",
  "eis",
  "iis",
  "eae",
  "eas",
  "earum",
  "illic",
  "illaec",
  "illuc",
  "illic",
  "illoc",
  "illunc",
  "illanc",
  "illac",
  "hicque",
  "huncque",
  "huiusque",
  "huicque",
  "hocque",
  "haecque",
  "hancque",
  "hacque",
  "hique",
  "hosque",
  "horumque",
  "hisque",
  "haeque",
  "hasque",
  "harumque",
  "hoque",
  "haque",
  "illeque",
  "illumque",
  "illiusque",
  "illique",
  "illoque",
  "illaque",
  "illamque",
  "illudque",
  "illosque",
  "illorumque",
  "illisque",
  "illasque",
  "illarumque",
  "illaeque",
  "isque",
  "eumque",
  "eiusque",
  "eique",
  "eoque",
  "eaque",
  "eamque",
  "idque",
  "iique",
  "eosque",
  "eorumque",
  "eisque",
  "iisque",
  "eaeque",
  "easque",
  "earumque",
  "illicque",
  "illaecque",
  "illucque",
  "illicque",
  "illocque",
  "illuncque",
  "illancque",
  "illacque"
];

const reflexivePronoun = ["se", "sibi", "sese", "sui", "seque", "sibique", "seseque", "suique"];

const conditionalClauses = ["si", "nisi", "quodsi", "sin", "dummodo"];

const conjunctions = [
  "et",
  "atque",
  "ac",
  "aut",
  "vel",
  "uel",
  "at",
  "autem",
  "sed",
  "postquam",
  "ast",
  "donec",
  "dum",
  "dummodo",
  "enim",
  "etiam",
  "etiamtum",
  "etiamtunc",
  "etenim",
  "veruntamen",
  "ueruntamen",
  "uerumtamen",
  "verumtamen",
  "utrumnam",
  "set",
  "quocirca",
  "quia",
  "quamquam",
  "quanquam",
  "nam",
  "namque",
  "nanque",
  "nempe",
  "dumque",
  "etiamque",
  "quiaque"
];

const conjunctionsIn = ["que"];

const idem = [
  "idem",
  "eundem",
  "eiusdem",
  "eidem",
  "eodem",
  "eadem",
  "eandem",
  "iidem",
  "eosdem",
  "eorundem",
  "eisdem",
  "iisdem",
  "eaedem",
  "eedem",
  "easdem",
  "earumdem",
  "isdem",
  "isdemque",
  "idemque",
  "eundemque",
  "eiusdemque",
  "eidemque",
  "eodemque",
  "eademque",
  "eandemque",
  "iidemque",
  "eosdemque",
  "eorundemque",
  "eisdemque",
  "iisdemque",
  "eaedemque",
  "easdemque",
  "earundemque"
];

const ipse = [
  "ipse",
  "ipsum",
  "ipsius",
  "ipsi",
  "ipso",
  "ipsa",
  "ipsam",
  "ipsos",
  "ipsorum",
  "ipsas",
  "ipsarum",
  "ipseque",
  "ipsumque",
  "ipsiusque",
  "ipsique",
  "ipsoque",
  "ipsaque",
  "ipsamque",
  "ipsosque",
  "ipsorumque",
  "ipsasque",
  "ipsarumque"
];

const indef = [
  "quidam",
  "quendam",
  "cuiusdam",
  "cuidam",
  "quodam",
  "quedam",
  "quandam",
  "quodam",
  "quoddam",
  "quosdam",
  "quorundam",
  "quibusdam",
  "quasdam",
  "quarundam"
];

const iste = [
  "iste",
  "istum",
  "istius",
  "isti",
  "isto",
  "ista",
  "istam",
  "istud",
  "istos",
  "istorum",
  "istis",
  "istas",
  "istarum",
  "iste",
  "istum",
  "istius",
  "isti",
  "isto",
  "ista",
  "istam",
  "istud",
  "istos",
  "istorum",
  "istis",
  "istas",
  "istarum",
  "isteque",
  "istumque",
  "istiusque",
  "istique",
  "istoque",
  "istaque",
  "istamque",
  "istudque",
  "istosque",
  "istorumque",
  "istisque",
  "istasque",
  "istarumque"
];

const quidam = [
  "quidam",
  "quendam",
  "cuiusdam",
  "cuidam",
  "quodam",
  "quaedam",
  "quandam",
  "quodam",
  "quoddam",
  "quosdam",
  "quorundam",
  "quibusdam",
  "quasdam",
  "quarundam",
  "quiddam",
  "quoddam",
  "quadam",
  "quidamque",
  "quendamque",
  "cuiusdamque",
  "cuidamque",
  "quodamque",
  "quaedamque",
  "quandamque",
  "quodamque",
  "quoddamque",
  "quosdamque",
  "quorundamque",
  "quibusdamque",
  "quasdamque",
  "quarundamque",
  "quiddamque",
  "quoddamque",
  "quadamque"
];

const consonant = ["b", "c", "d", "f", "g", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "y", "z"];

const alius = [
  "alius",
  "alium",
  "alii",
  "alio",
  "alia",
  "aliam",
  "aliud",
  "alios",
  "aliorum",
  "aliis",
  "aliae",
  "alias",
  "aliarum",
  "aliusque",
  "aliumque",
  "aliique",
  "alioque",
  "aliaque",
  "aliamque",
  "aliudque",
  "aliosque",
  "aliorumque",
  "aliisque",
  "aliaeque",
  "aliasque",
  "aliarumque"
];

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

const prepositions = [
  "ab",
  "abs",
  "e",
  "ex",
  "apud",
  "de",
  "cis",
  "erga",
  "inter",
  "ob",
  "penes",
  "per",
  "praeter",
  "propter",
  "trans",
  "absque",
  "pro",
  "tenus",
  "sub",
  "aque",
  "abque",
  "eque",
  "exque",
  "apudque",
  "deque",
  "cisque",
  "ergaque",
  "interque",
  "obque",
  "penesque",
  "perque",
  "praeterque",
  "propterque",
  "transque",
  "proque",
  "tenusque",
  "subque"
];

const cumClauses = ["a", "e", "i", "o", "u", "is", "ibus", "ebus", "obus", "ubus"];

const relatives = [
  "qui",
  "cuius",
  "cui",
  "quem",
  "quo",
  "quae",
  "quam",
  "qua",
  "quod",
  "quorum",
  "quibus",
  "quos",
  "quarum",
  "quas"
];

const abbreviations = [
  "Caes",
  "Iul",
  "Plur",
  "Aug",
  "Prid",
  "Id",
  "Kal",
  "Kl",
  "Non",
  "Med",
  "Ex",
  "In",
  "Ian",
  "Feb",
  "Febr",
  "Mart",
  "Apr",
  "Iun",
  "Mai",
  "Nov",
  "Oct",
  "Sept",
  "Dec",
  "Fin",
  "Cos",
  "Coss",
  "Pr",
  "Sext",
  "Ann",
  "Sal",
  "Imp",
  "Tr",
  "Pl",
  "Leg",
  "Aed",
  "Cens",
  "Agr",
  "Ant",
  "Aur",
  "Cn",
  "Scrib",
  "Fab",
  "Pom",
  "Quir",
  "Pup",
  "An",
  "Ter",
  "Op",
  "Germ",
  "Gn",
  "Ap",
  "M’",
  "Mai",
  "Mam",
  "Men",
  "Min",
  "Oct",
  "Opet",
  "Pro",
  "Quint",
  "Quinct",
  "Sec",
  "Ser",
  "Sert",
  "Serv",
  "Seq",
  "Sex",
  "Sp",
  "St",
  "Ti",
  "Tib",
  "Vol",
  "Vop",
  "Aem",
  "Aim",
  "Rom",
  "Pont",
  "Imp",
  "Max",
  "Coll",
  "Ob ",
  "Lib",
  "Cir",
  "Ver",
  "III",
  "Eq",
  "eq",
  "I",
  "II",
  "III",
  "IIII",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "VIIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XVIIII",
  "XIX",
  "XX",
  "XXI",
  "XXII",
  "XXIII",
  "XXIIII",
  "XXIV",
  "XXV",
  "XXVI",
  "XXVII",
  "XXVIII",
  "XXVIIII",
  "XXIX",
  "XXX",
  "XXXI",
  "XXXII",
  "XXXIII",
  "XXXIIII",
  "XXXIV",
  "XXXV",
  "XXXVI",
  "XXXVII",
  "XXXVIII",
  "XXXVIIII",
  "XXXIX",
  "XXXX",
  "XL",
  "XLI",
  "XLII",
  "XLIII",
  "XLIIII",
  "XLIV",
  "XLV",
  "XLVI",
  "XLVII",
  "XLVIII",
  "XLVIIII",
  "XLIX",
  "L",
  "LI",
  "LII",
  "LIII",
  "LIIII",
  "LIV",
  "LV",
  "LVI",
  "LVII",
  "LVIII",
  "LVIIII",
  "LIX",
  "LX",
  "LXI",
  "LXII",
  "LXIII",
  "LXIIII",
  "LXIV",
  "LXV",
  "LXVI",
  "LXVII",
  "LXVIII",
  "LXVIIII",
  "LXIX",
  "LXX",
  "LXXI",
  "LXXII",
  "LXXIII",
  "LXXIIII",
  "LXXIV",
  "LXXV",
  "LXXVI",
  "LXXVII",
  "LXXVIII",
  "LXXVIIII",
  "LXXIX",
  "LXXX",
  "LXXXI",
  "LXXXII",
  "LXXXIII",
  "LXXXIIII",
  "LXXXIV",
  "LXXXV",
  "LXXXVI",
  "LXXXVII",
  "LXXXVIII",
  "LXXXVIIII",
  "LXXXIX",
  "LXXXX",
  "XC",
  "XCI",
  "XCII",
  "XCIII",
  "XCIIII",
  "XCIV",
  "XCV",
  "XCVI",
  "XCVII",
  "XCVIII",
  "XCVIIII",
  "XCIX",
  "C",
  "CC",
  "CCC",
  "CCCC",
  "CD",
  "D",
  "DC",
  "DCC",
  "DCCC",
  "DCCCC",
  "CM",
  "M",
  "MM",
  "MMM",
  "MMMM"
];

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

const interrogative = (str) => {
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

const countWords = (str) => {
  str = str.replace();
  return str.trim().split(/\s+/).length;
};

const sigFig = (num) => {
  if (num) {
    return Number(num.toFixed(5));
  } else {
    return 0;
  }
};

function startf(a1, str) {
  const consonant = [
    "b",
    "c",
    "d",
    "f",
    "g",
    "j",
    "k",
    "l",
    "m",
    "n",
    "p",
    "q",
    "r",
    "s",
    "t",
    "v",
    "w",
    "x",
    "y",
    "z"
  ];

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

const charCount = (str) => {
  str = str.replace(/[^a-zA-Z0-9]+/gi, "").replace(/\s/g, "");
  return str.length;
};

const multiSplit = (str, delimeters) => {
  const result = [str];
  if (typeof delimeters == "string") delimeters = [delimeters];
  while (delimeters.length > 0) {
    for (let i = 0; i < result.length; i++) {
      const tempSplit = result[i].split(delimeters[0]);
      result = result
        .slice(0, i)
        .concat(tempSplit)
        .concat(result.slice(i + 1));
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
    if ((a1[i].indexOf("!") > -1 && occ >= 1) || (a1[i].indexOf(".") > -1 && occ >= 1)) {
      const re = new RegExp("\\b(" + list.join("|") + ")\\b", "gi");
      const allArray = findall(re, a1[i]);
      const mergeArray = list.concat([",", ":", ".", "!", ";"]);
      for (let d = 0; d < allArray.length; d++) {
        let foundIndexes = mergeArray
          .map((x) => regexIndexOf(a1[i], x, allArray[d].index + 1))
          .filter((x) => x !== -1 && x !== allArray[d].index);
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

const removePunct = (str) => {
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

const superlatives = (str) => {
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

const topNgrams = (str) => {
  function updateFrequency(frequencies, word) {
    frequencies[word] = (frequencies[word] || 0) + 1;
    return frequencies;
  }

  const n = 5;
  let words = str
    .replace(/[^a-zA-Z0-9]+/gi, " ")
    .trim()
    .split(/\s+/);
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

const meanSentence = (a1) => {
  let five = 0;
  for (let de = 0; de < a1.length; de++) {
    const strip = a1[de].replace(/[^a-zA-Z0-9]+/gi, "").trim();
    five += strip.length;
  }

  return five / a1.length;
};

const listO = [
  {feature: "p1", list: "personalPronoun"},
  {feature: "p2", list: "demonstrativePronoun"},
  {feature: "p3", list: "quidam"},
  {feature: "p4", list: "reflexivePronoun"},
  {feature: "p5", list: "iste"},
  {feature: "n1", list: "alius"},
  {feature: "n2", list: "ipse"},
  {feature: "n3", list: "idem"},
  {feature: "s6", list: "priu"},
  {feature: "s5", list: "anteq"},
  {feature: "s4", list: "quom"},
  {feature: "s7", list: "dum"},
  {feature: "s3", list: "quin"},
  {feature: "m4", list: "ut"},
  {feature: "s1", list: "conditionalClauses"},
  {feature: "m7", list: "prepositions"}
];

const listF = [
  {feature: "m1", list: "", name: "interrogative(book)"},
  {feature: "m3", list: "", name: "superlatives(book)"},
  {feature: "c2", name: "startf(book, atque)"},
  {feature: "s8", list: "relatives", name: "relative(sentences, relatives)"},
  {feature: "m5", name: "endGerund(book, gerund)"},
  {feature: "s2", name: "cumClause(book, cumClauses)"}
];

const listC = [
  {
    feature: "c1",
    name: "multiOccurence(ngramRemoved, conjunctions, conjunctionsIn)"
  },
  {feature: "m2", name: "endf(ngramRemoved, o, vocatives)"}
];

Meteor.methods({
  async stylometryf(data, options) {
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
                const value = occurences(book, eval(listO[k].list));
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
                  let value = eval(d);
                  gramr.s8 = sigFig(value.relative);
                  gramr.s9 = sigFig(value.mean);
                } else if (listF[m].feature === "m8") {
                  let value = eval(d);
                  gramr[b] = value;
                } else if (listF[m].list !== "") {
                  let value = eval(d);
                  gramr[b] = sigFig(value / characters);
                } else {
                  let value = eval(d);
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
                const value = eval(d);
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
  },
  authors() {
    const authorArray = Author.find()
      .fetch()
      .map((x) => x.author);
    return [...new Set(authorArray)];
  },
  texts(author) {
    const textArray = Authors.find({author: author}, {sort: {_id: -1}})
      .fetch()
      .map((x) => x.text);
    return [...new Set(textArray)];
  },
  books(author, text) {
    const bookArray = Authors.find({author: author, text: text}, {sort: {_id: -1}})
      .fetch()
      .map((x) => x.book);
    return [...new Set(bookArray)];
  }
});
