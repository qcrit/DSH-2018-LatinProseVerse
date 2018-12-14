$(".form-group.form-group-default").click(function() {
  $(this)
    .find("input")
    .focus();
});
$("body").on("focus", ".form-group.form-group-default :input", function() {
  $(".form-group.form-group-default").removeClass("focused");
  $(this)
    .parents(".form-group")
    .addClass("focused");
});

$("body").on("blur", ".form-group.form-group-default :input", function() {
  $(this)
    .parents(".form-group")
    .removeClass("focused");
  if ($(this).val()) {
    $(this)
      .closest(".form-group")
      .find("label")
      .addClass("fade");
  } else {
    $(this)
      .closest(".form-group")
      .find("label")
      .removeClass("fade");
  }
});

$(".form-group.form-group-default .checkbox, .form-group.form-group-default .radio").hover(
  function() {
    $(this)
      .parents(".form-group")
      .addClass("focused");
  },
  function() {
    $(this)
      .parents(".form-group")
      .removeClass("focused");
  }
);

$(".select2").select2({
  minimumResultsForSearch: 2,
  width: "100%",
  matcher: function(term, text) {
    return text.toUpperCase().indexOf(term.toUpperCase()) == 0;
  }
});
