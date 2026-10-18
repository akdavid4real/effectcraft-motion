// Delete the composition so s1..sN can rebuild it from scratch.
for (var i = app.project.numItems; i >= 1; i--) if (app.project.item(i).name == COMP) app.project.item(i).remove();
"reset";
