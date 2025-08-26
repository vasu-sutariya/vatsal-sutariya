// Utilities
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Canvas setup
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let width = 0, height = 0;
function docSize(){
  const de = document.documentElement;
  const b = document.body;
  const w = Math.max(de.scrollWidth, b.scrollWidth, de.clientWidth, window.innerWidth || 0);
  const h = Math.max(de.scrollHeight, b.scrollHeight, de.clientHeight, window.innerHeight || 0);
  return {w, h};
}
function resizeCanvas(){
  const s = docSize();
  width = s.w;
  height = s.h;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.width = Math.floor(width * DPR);
  canvas.height = Math.floor(height * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
if('ResizeObserver' in window){
  const ro = new ResizeObserver(()=> resizeCanvas());
  ro.observe(document.body);
}

// Grid + obstacles
const cellSize = 24; // px
function makeGrid(){
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const nodes = new Array(rows);
  for(let r=0;r<rows;r++){
    nodes[r] = new Array(cols).fill(0);
  }
  return {cols, rows, nodes};
}

let grid = makeGrid();

function worldToGrid(x, y){
  return {
    c: clamp(Math.floor(x / cellSize), 0, grid.cols-1),
    r: clamp(Math.floor(y / cellSize), 0, grid.rows-1)
  };
}

function rectToGridObstacles(rect){
  const padding = 4; // slightly tighter to allow gaps between sections
  const x0 = clamp(Math.floor((rect.left - padding) / cellSize), 0, grid.cols-1);
  const y0 = clamp(Math.floor((rect.top - padding) / cellSize), 0, grid.rows-1);
  const x1 = clamp(Math.floor((rect.right + padding) / cellSize), 0, grid.cols-1);
  const y1 = clamp(Math.floor((rect.bottom + padding) / cellSize), 0, grid.rows-1);
  for(let r=y0;r<=y1;r++){
    for(let c=x0;c<=x1;c++){
      grid.nodes[r][c] = 1;
    }
  }
}

function rebuildObstaclesFromDOM(){
  grid = makeGrid();
  const selectors = [
    // Section text elements
    'section h1', 'section h2', 'section h3', 'section p', 'section li', 'section a', '.badge', '.btn'
  ];
  const items = document.querySelectorAll(selectors.join(','));
  items.forEach(el => {
    try{
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects());
      if(rects.length){
        rects.forEach(r => {
          const pageRect = {
            left: r.left + window.scrollX,
            top: r.top + window.scrollY,
            right: r.right + window.scrollX,
            bottom: r.bottom + window.scrollY
          };
          rectToGridObstacles(pageRect);
        });
      } else {
        const r = el.getBoundingClientRect();
        const pageRect = {
          left: r.left + window.scrollX,
          top: r.top + window.scrollY,
          right: r.right + window.scrollX,
          bottom: r.bottom + window.scrollY
        };
        rectToGridObstacles(pageRect);
      }
    } catch(_e){
      const r = el.getBoundingClientRect();
      const pageRect = {
        left: r.left + window.scrollX,
        top: r.top + window.scrollY,
        right: r.right + window.scrollX,
        bottom: r.bottom + window.scrollY
      };
      rectToGridObstacles(pageRect);
    }
  });
}

// A* pathfinding on grid (4-connected)
function heuristic(a, b){
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
}

function neighbors(node){
  const res = [];
  const dirs = [
    {dc:1, dr:0}, {dc:-1, dr:0}, {dc:0, dr:1}, {dc:0, dr:-1}
  ];
  for(const d of dirs){
    const c = node.c + d.dc;
    const r = node.r + d.dr;
    if(c>=0 && c<grid.cols && r>=0 && r<grid.rows && grid.nodes[r][c]===0){
      res.push({c, r});
    }
  }
  return res;
}

function findPath(start, goal){
  if(grid.nodes[start.r]?.[start.c]===1){
    // nudge start off obstacle
    const ns = neighbors(start);
    if(ns.length===0) return [];
    start = ns[0];
  }
  if(grid.nodes[goal.r]?.[goal.c]===1){
    const ng = neighbors(goal);
    if(ng.length===0) return [];
    goal = ng[0];
  }
  const key = (n)=> n.c+","+n.r;
  const open = new Set();
  const openArr = [];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const startKey = key(start);
  open.add(startKey);
  openArr.push(start);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, goal));

  while(open.size){
    // pick lowest f
    let bestIdx = 0;
    let best = openArr[0];
    let bestF = fScore.get(key(best)) ?? Infinity;
    for(let i=1;i<openArr.length;i++){
      const n = openArr[i];
      const k = key(n);
      const f = fScore.get(k) ?? Infinity;
      if(f < bestF){ bestF = f; best = n; bestIdx = i; }
    }
    const current = best;
    const currentKey = key(current);
    if(current.c===goal.c && current.r===goal.r){
      // reconstruct
      const path = [current];
      let ck = currentKey;
      while(cameFrom.has(ck)){
        const prev = cameFrom.get(ck);
        path.push(prev);
        ck = key(prev);
      }
      path.reverse();
      return path;
    }
    // move current from open
    open.delete(currentKey);
    openArr.splice(bestIdx,1);

    for(const nb of neighbors(current)){
      const nk = key(nb);
      const tentative = (gScore.get(currentKey) ?? Infinity) + 1;
      if(tentative < (gScore.get(nk) ?? Infinity)){
        cameFrom.set(nk, current);
        gScore.set(nk, tentative);
        fScore.set(nk, tentative + heuristic(nb, goal));
        if(!open.has(nk)){
          open.add(nk);
          openArr.push(nb);
        }
      }
    }
  }
  return [];
}

// Robot state
let robot = {
  x: 80,
  y: 120,
  // physics
  vx: 0,
  vy: 0,
  maxSpeed: 1000, // px/s
  maxAccel: 5000, // px/s^2
  radius: 8,
  freezeTimer: 0, // seconds to stay at spawn
  path: [], // grid cells
  pathIndex: 0,
  anim: {
    wheelAngle: 0,
    blinkTimer: 0,
    isBlinking: false,
    bobPhase: 0
  }
};

// Guide caption next to the robot
const guide = {
  text: 'and I am J-0015, your guide',
  visible: true,
  timer: 0
};

let mouse = {x: width*0.7, y: height*0.3};
window.addEventListener('pointermove', (e)=>{
  mouse.x = e.pageX; mouse.y = e.pageY;
});

// Build initial obstacle map after first layout
function scheduleObstaclesRebuild(){
  rebuildObstaclesFromDOM();
}
window.addEventListener('load', scheduleObstaclesRebuild);
window.addEventListener('resize', ()=>{
  resizeCanvas();
});

function positionRobotAtHero(){
  const heroTitle = document.querySelector('#hero h2');
  if(!heroTitle) return;
  const rect = heroTitle.getBoundingClientRect();
  const left = rect.left + window.scrollX;
  const top = rect.top + window.scrollY;
  const right = rect.right + window.scrollX;
  const bottom = rect.bottom + window.scrollY;
  robot.x = right - 500;
  robot.y = top + (bottom - top) * 0.5;
  robot.vx = 0; robot.vy = 0;
  robot.freezeTimer = 3; // stay for 3 seconds on spawn
  guide.visible = true; guide.timer = 0;
}

window.addEventListener('load', positionRobotAtHero);
window.addEventListener('resize', positionRobotAtHero);

// Replan at a limited rate
let lastPlanTime = 0;
let planIntervalMs = 80; // faster replanning to follow moving targets

function planIfNeeded(ts){
  if(ts - lastPlanTime < planIntervalMs) return;
  lastPlanTime = ts;
  const start = worldToGrid(robot.x, robot.y);
  const goal = worldToGrid(mouse.x, mouse.y);
  const p = findPath(start, goal);
  if(p.length){
    // pick closest waypoint on new path to continue smoothly
    let closestIdx = 0;
    let bestDist = Infinity;
    for(let i=0;i<p.length;i++){
      const wx = (p[i].c + 0.5) * cellSize;
      const wy = (p[i].r + 0.5) * cellSize;
      const d = Math.hypot(wx - robot.x, wy - robot.y);
      if(d < bestDist){ bestDist = d; closestIdx = i; }
    }
    robot.path = p;
    // Lookahead to the next waypoint, if available
    robot.pathIndex = Math.min(closestIdx + 1, Math.max(closestIdx, p.length - 1));
  }
}

function stepAlongPath(dt){
  if(!robot.path.length){
    // natural slow down when no target
    robot.vx *= Math.pow(0.0001, dt);
    robot.vy *= Math.pow(0.0001, dt);
    robot.x += robot.vx * dt;
    robot.y += robot.vy * dt;
    return;
  }

  // target is next waypoint center
  const idx = clamp(robot.pathIndex, 0, robot.path.length-1);
  const cell = robot.path[idx];
  const tx = (cell.c + 0.5) * cellSize;
  const ty = (cell.r + 0.5) * cellSize;

  // arrival steering
  const toTargetX = tx - robot.x;
  const toTargetY = ty - robot.y;
  const dist = Math.hypot(toTargetX, toTargetY);
  const slowRadius = 80; // start slowing down when within this distance
  const desiredSpeed = dist < slowRadius ? robot.maxSpeed * (dist / slowRadius) : robot.maxSpeed;
  const dirX = dist > 0 ? toTargetX / dist : 0;
  const dirY = dist > 0 ? toTargetY / dist : 0;
  const desiredVX = dirX * desiredSpeed;
  const desiredVY = dirY * desiredSpeed;

  // steering acceleration = desired - current, clamped
  let ax = desiredVX - robot.vx;
  let ay = desiredVY - robot.vy;
  const aMag = Math.hypot(ax, ay);
  if(aMag > robot.maxAccel){
    ax = ax / aMag * robot.maxAccel;
    ay = ay / aMag * robot.maxAccel;
  }

  // integrate
  robot.vx += ax * dt;
  robot.vy += ay * dt;
  // clamp speed
  const vMag = Math.hypot(robot.vx, robot.vy);
  if(vMag > robot.maxSpeed){
    robot.vx = robot.vx / vMag * robot.maxSpeed;
    robot.vy = robot.vy / vMag * robot.maxSpeed;
  }

  robot.x += robot.vx * dt;
  robot.y += robot.vy * dt;

  // advance waypoint when close enough
  if(dist <= Math.max(6, robot.maxSpeed * dt)){
    robot.x = tx; robot.y = ty;
    if(robot.pathIndex < robot.path.length - 1){
      robot.pathIndex++;
    }
  }
}

function updateRobotAnimation(dt){
  // wheels animation disabled
  robot.anim.wheelAngle += 0;
  // eye blink every ~3-5 seconds
  robot.anim.blinkTimer += dt;
  if(!robot.anim.isBlinking && robot.anim.blinkTimer > 3 + Math.random()*2){
    robot.anim.isBlinking = true;
    robot.anim.blinkTimer = 0;
  }
  if(robot.anim.isBlinking && robot.anim.blinkTimer > 0.12){
    robot.anim.isBlinking = false;
    robot.anim.blinkTimer = 0;
  }
  // gentle bob
  robot.anim.bobPhase += dt * 2;

  // guide caption lifetime
  if(guide.visible){
    guide.timer += dt;
    // keep visible for 6 seconds
    if(guide.timer > 6){ guide.visible = false; }
  }
}

function drawGrid(){
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for(let x=0; x<=width; x+=cellSize){
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke();
  }
  for(let y=0; y<=height; y+=cellSize){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke();
  }
}

function drawObstacles(){
  ctx.fillStyle = 'rgba(255, 255, 255, 0)';
  for(let r=0;r<grid.rows;r++){
    for(let c=0;c<grid.cols;c++){
      if(grid.nodes[r][c]===1){
        ctx.fillRect(c*cellSize, r*cellSize, cellSize, cellSize);
      }
    }
  }
}

function drawPath(){
  if(!robot.path.length) return;
  ctx.strokeStyle = 'rgba(60, 119, 125, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for(let i=0;i<robot.path.length;i++){
    const cell = robot.path[i];
    const x = (cell.c + 0.5) * cellSize;
    const y = (cell.r + 0.5) * cellSize;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
}

function drawRobot(){
  const bob = Math.sin(robot.anim.bobPhase) * 1.2;
  const cx = robot.x;
  const cy = robot.y + bob;

  // no shadow

  // body (rounded rect)
  const bodyW = 42, bodyH = 28, r = 10;
  const x = cx - bodyW/2, y = cy - bodyH/2;
  ctx.fillStyle = '#1b233d';
  ctx.strokeStyle = 'rgba(108,240,255,0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, bodyW, bodyH, r);
  ctx.fill();
  ctx.stroke();

  // face panel
  roundRect(ctx, x+6, y+6, bodyW-12, bodyH-14, 6);
  ctx.fillStyle = '#0e152b';
  ctx.fill();

  // eyes
  const eyeY = y + bodyH/2 - 4;
  const blinkScale = robot.anim.isBlinking ? 0.15 : 1;
  ctx.fillStyle = '#6cf0ff';
  ctx.beginPath();
  ctx.ellipse(x + bodyW/2 - 12, eyeY, 4, 4*blinkScale, 0, 0, Math.PI*2);
  ctx.ellipse(x + bodyW/2 - 22, eyeY, 4, 4*blinkScale, 0, 0, Math.PI*2);
  ctx.fill();

  // tiny mouth/status
  ctx.fillStyle = '#f36b6b';
  ctx.fillRect(x + bodyW/2 - 4, eyeY + 6, 8, 3);

  // antenna
  ctx.strokeStyle = '#6cf0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.quadraticCurveTo(cx + 6, y - 8, cx + 10, y - 14 + Math.sin(robot.anim.bobPhase*2)*2);
  ctx.stroke();
  ctx.fillStyle = '#2eff8b';
  ctx.beginPath();
  ctx.arc(cx + 10, y - 14 + Math.sin(robot.anim.bobPhase*2)*2, 3, 0, Math.PI*2);
  ctx.fill();

  // wheels
  drawWheel(cx - 14, cy + bodyH/2 - 2, robot.anim.wheelAngle);
  drawWheel(cx + 14, cy + bodyH/2 - 2, robot.anim.wheelAngle);

  // guide caption bubble
  if(guide.visible){
    drawBubble(cx + 30, cy - 24, guide.text);
  }
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function drawWheel(wx, wy, angle){
  // wheel body
  ctx.fillStyle = '#0b1020';
  ctx.beginPath();
  ctx.arc(wx, wy, 7, 0, Math.PI*2);
  ctx.fill();
  // rim
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(wx, wy, 6, 0, Math.PI*2);
  ctx.stroke();
  // spokes
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(angle);
  ctx.strokeStyle = 'rgba(108,240,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -6);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 6);
  ctx.stroke();
  ctx.restore();
}

function drawBubble(x, y, text){
  ctx.font = '14px Inter, system-ui, sans-serif';
  const paddingX = 10, paddingY = 8;
  const metrics = ctx.measureText(text);
  const w = metrics.width + paddingX*2;
  const h = 26 + (metrics.actualBoundingBoxAscent ? 0 : 0);
  ctx.fillStyle = 'rgba(11,16,32,0.92)';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  // tail
  ctx.beginPath();
  ctx.moveTo(x - 6, y + h*0.7);
  ctx.lineTo(x, y + h*0.55);
  ctx.lineTo(x, y + h*0.85);
  ctx.closePath();
  ctx.fill();
  // text
  ctx.fillStyle = '#e7ebff';
  ctx.fillText(text, x + paddingX, y + h - paddingY);
}

function clear(){
  ctx.clearRect(0,0,width,height);
  // no vignette
}

let lastTs = 0;
function frame(ts){
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!prefersReducedMotion){
    if(robot.freezeTimer > 0){
      robot.freezeTimer = Math.max(0, robot.freezeTimer - dt);
      // keep animating idle
      updateRobotAnimation(dt);
    } else {
      planIfNeeded(ts);
      stepAlongPath(dt);
      updateRobotAnimation(dt);
    }
  }
  clear();
  drawGrid();
  drawObstacles();
  if(robot.freezeTimer <= 0){
    drawPath();
  }
  drawRobot();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();


