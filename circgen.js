var canvas, ctx, options, contInterval, El, controls, Cnum, Crange, Cbool, getElValue, gatherOptions, regen, next, regenDebounced, onChange, genCoord, isCoord, isFree, rnd, grid, wires, currentWire, initGen, getFreeCoord, getNewDelta, getNewDs, startNewWire, transPt, redraw, canTraverse, continueGen, init, _Cbase;
canvas = null;
ctx = null;
options = {};
contInterval = null;
El = function(tag, args){
  var el;
  el = document.createElement(tag);
  _.each(args, function(value, key){
    if (value !== null) {
      return el[key] = value;
    }
  });
  return el;
};
controls = {};
_Cbase = function(id, label, inp){
  var lbl, br, targetEl, el, _i, _ref, _len;
  lbl = El('label', {
    "for": id,
    innerHTML: label + " <span id=\"va_" + id + "\">" + getElValue(inp) + "</span>",
    id: "lb_" + id
  });
  inp.addEventListener('change', onChange, false);
  br = El('br');
  targetEl = document.getElementById('controls');
  for (_i = 0, _len = (_ref = [lbl, inp, br]).length; _i < _len; ++_i) {
    el = _ref[_i];
    targetEl.appendChild(el);
  }
  return controls[id] = inp;
};
Cnum = function(id, label, min, max, value, step){
  min == null && (min = 0);
  max == null && (max = 100);
  value == null && (value = null);
  step == null && (step = 1);
  return _Cbase(id, label, El('input', {
    id: id,
    type: 'range',
    min: min,
    max: max,
    step: step,
    value: value || min
  }));
};
Crange = function(id, label, min, max, valueMin, valueMax, step){
  min == null && (min = 0);
  max == null && (max = 100);
  valueMin == null && (valueMin = null);
  valueMax == null && (valueMax = null);
  step == null && (step = 1);
  Cnum(id + "Min", label + " Min", min, max, valueMin, step);
  return Cnum(id + "Max", label + " Max", min, max, valueMax, step);
};
Cbool = function(id, label, value){
  return _Cbase(id, label, El('input', {
    id: id,
    type: 'checkbox',
    checked: !!value ? "checked" : null
  }));
};
getElValue = function(el){
  if (el.type == "checkbox") {
    return !!el.checked;
  } else {
    return 0 | el.value;
  }
};
gatherOptions = function(){
  var opts;
  opts = {};
  _.map(controls, function(el, key){
    return opts[key] = getElValue(el);
  });
  return opts;
};
regen = function(){
  options = gatherOptions();
  if (options.canvasSize) {
    canvas.width = canvas.height = options.canvasSize;
  }
  initGen();
  return next();
};
next = function(){
  return setTimeout(function(){
    continueGen();
    return next();
  }, 150);
};
regenDebounced = _.debounce(regen, 50);
onChange = function(event){
  document.getElementById("va_" + event.target.id).innerHTML = getElValue(event.target);
  return options = gatherOptions();
};
genCoord = function(x, y){
  return y * options.gridSize + x;
};
isCoord = function(x, y){
  return y >= 0 && y < options.gridSize && x >= 0 && x < options.gridSize;
};
isFree = function(x, y){
  return isCoord(x, y) && !(+grid[genCoord(x, y)]);
};
rnd = function(min, max){
  return 0 | min + Math.random() * (max - min);
};
grid = null;
wires = null;
currentWire = null;
initGen = function(){
  grid = {};
  wires = [];
  return currentWire = null;
};
getFreeCoord = function(){
  var tries, startX, startY;
  tries = 0;
  while (tries < 10) {
    tries++;
    startX = rnd(0, options.gridSize);
    startY = rnd(0, options.gridSize);
    if (isFree(startX, startY)) {
      return {
        x: startX,
        y: startY
      };
    }
  }
  return null;
};
getNewDelta = function(wire){
  var lastPoint, tries, dx, dy, xC, yC;
  lastPoint = wire.points[wire.points.length - 1];
  tries = 0;
  while (tries < 20) {
    tries++;
    if (options.useOldRouting) {
      dx = rnd(-1, 2);
      dy = rnd(-1, 2);
    } else {
      dx = rnd(0, 1000) % 3 - 1;
      dy = rnd(0, 1000) % 3 - 1;
    }
    if (dx == 0 && dy == 0) {
      continue;
    }
    if (!(wire.dx == 0 && wire.dy == 0) && !options.allowAnyTurn) {
      xC = Math.abs(wire.dx - dx);
      yC = Math.abs(wire.dy - dy);
      if (!(wire.dx == dx ^ wire.dy == dy) || xC > 1 || yC > 1) {
        continue;
      }
    }
    if (options.dontAllowStraight && dx == wire.dx && dy == wire.dy) {
      continue;
    }
    if (isFree(lastPoint.x + dx, lastPoint.y + dy)) {
      return {
        dx: dx,
        dy: dy
      };
    }
  }
};
getNewDs = function(wire){
  return rnd(options.wireDsMin, options.wireDsMax);
};
startNewWire = function(){
  var startXY, newWire, newDelta;
  startXY = getFreeCoord();
  if (startXY) {
    newWire = {
      points: [startXY],
      dx: 0,
      dy: 0,
      ds: 0,
      len: rnd(options.wireLenMin, options.wireLenMax)
    };
    newDelta = getNewDelta(newWire);
    newWire.ds = getNewDs(currentWire);
    if (!newDelta) {
      return false;
    }
    newWire.dx = newDelta.dx, newWire.dy = newDelta.dy;
    wires.push(newWire);
    return newWire;
  }
  return false;
};
transPt = function(point){
  var w;
  w = options.gridSpacing;
  return {
    x: (1 + point.x) * w,
    y: (1 + point.y) * w
  };
};
redraw = function(){
  var oldN, y, x, pt, _to, _to2, _results = [];
  canvas.width = canvas.height = options.canvasSize;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "black";
  ctx.fillStyle = "white";
  if (options.removeShortThreshold > 0) {
    oldN = wires.length;
    wires = _.filter(wires, function(wire){
      return wire == currentWire || wire.points.length > options.removeShortThreshold;
    });
    if (wires.length != oldN) {
      grid = {};
    }
  }
  _.each(wires, function(wire, wIndex){
    ctx.lineWidth = options.wireThickness;
    ctx.lineCap = ['butt', 'round', 'square'][options.wireCaps];
    ctx.lineJoin = ['round', 'bevel', 'miter'][options.wireJoins];
    ctx.beginPath();
    _.each(wire.points, function(point, index){
      var curr;
      grid[genCoord(point.x, point.y)] = true;
      curr = transPt(point);
      if (index == 0) {
        return ctx.moveTo(curr.x, curr.y);
      } else {
        return ctx.lineTo(curr.x, curr.y);
      }
    });
    ctx.stroke();
    return ctx.closePath();
  });
  if (options.circleRadius > 0) {
    ctx.lineWidth = options.circleThickness;
    _.each(wires, function(wire, wIndex){
      return _.each([wire.points[0], wire.points[wire.points.length - 1]], function(point){
        var curr;
        curr = transPt(point);
        ctx.beginPath();
        ctx.arc(curr.x, curr.y, options.circleRadius, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.stroke();
        return ctx.closePath();
      });
    });
  }
  if (options.debug >= 1) {
    ctx.lineWidth = 1;
    for (y = 0, _to = options.gridSize; y < _to; ++y) {
      for (x = 0, _to2 = options.gridSize; x < _to2; ++x) {
        pt = transPt({
          x: x,
          y: y
        });
        if (pt.x > canvas.width) {
          break;
        }
        ctx.strokeStyle = isFree(x, y) ? "green" : "red";
        ctx.strokeRect(pt.x - 5, pt.y - 5, 10, 10);
      }
      if (pt.y > canvas.height) {
        break;
      }
    }
    return _results;
  }
};
canTraverse = function(fromPt, toPt){
  var dx, dy;
  if (options.allowCrossing) {
    return isCoord(toPt.x, toPt.y);
  }
  if (!isFree(toPt.x, toPt.y)) {
    return false;
  }
  dx = toPt.x - fromPt.x;
  dy = toPt.y - fromPt.y;
  if (Math.abs(dx) + Math.abs(dy) == 2) {
    if (!(isFree(fromPt.x + dx, fromPt.y) && isFree(fromPt.x, fromPt.y + dy))) {
      return false;
    }
  }
  return true;
};
continueGen = function(){
  var lastPoint, newPoint, newDelta;
  redraw();
  if (options.stop) {
    return true;
  }
  if (!currentWire) {
    console.log("No current wire, trying to start new.");
    currentWire = startNewWire();
    if (!currentWire) {
      console.log("Could not start new line");
      return false;
    }
    return true;
  }
  if (currentWire) {
    lastPoint = currentWire.points[currentWire.points.length - 1];
    newPoint = {
      x: lastPoint.x + currentWire.dx,
      y: lastPoint.y + currentWire.dy
    };
    if (!canTraverse(lastPoint, newPoint)) {
      currentWire = null;
      return true;
    }
    if (currentWire.len <= 0) {
      currentWire = null;
      return true;
    }
    currentWire.points.push(newPoint);
    currentWire.ds--;
    currentWire.len--;
    if (currentWire.ds <= 0) {
      console.log("Generating new delta");
      currentWire.ds = getNewDs(currentWire);
      newDelta = getNewDelta(currentWire);
      if (!newDelta) {
        console.log("Unable to find valid delta, killing wire");
        currentWire = null;
        return true;
      }
      currentWire.dx = newDelta.dx, currentWire.dy = newDelta.dy;
    }
  }
  return true;
};
init = function(){
  Cbool('stop', "Stop");
  Cnum('canvasSize', "Size", 100, 2048, 800, 16);
  Cnum('gridSize', "Grid Size", 3, 400, 30);
  Cnum('gridSpacing', "Grid Spacing", 1, 50, 20);
  Cnum('wireThickness', "Wire Thickness", 1, 50, 3);
  Cnum('circleRadius', "Circle Radius", 0, 50, 6);
  Cnum('circleThickness', "Circle Thickness", 1, 50, 3);
  Cnum('wireCaps', "Wire Caps", 0, 2, 0);
  Cnum('wireJoins', "Wire Joins", 0, 2, 0);
  Crange('wireLen', "Wire Length", 1, 100, 10, 30);
  Crange('wireDs', "Wire Turn I'val", 1, 100, 2, 7);
  Cnum('removeShortThreshold', "Short Wire Del Thresh", 0, 150, 0);
  Cbool('allowCrossing', "Allow Crossing");
  Cbool('allowAnyTurn', "Allow Any Turn");
  Cbool('dontAllowStraight', "Don't allow cont. at turn");
  Cbool('useOldRouting', "Use old routing");
  Cnum('debug', "Debug", 0, 5, 1);
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d');
  return regen();
};