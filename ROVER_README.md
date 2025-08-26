# Simple Rover Navigation System

This is a separated rover navigation system that focuses purely on robot movement and obstacle avoidance. The rover will move towards a goal while avoiding obstacles automatically.

## Files

- `rover.js` - The main rover navigation logic (separated from web interface)
- `rover-test.html` - A simple test page to demonstrate the rover functionality
- `ROVER_README.md` - This documentation file

## Features

### Core Functionality
- **Goal-seeking**: Rover moves towards a specified target position
- **Obstacle avoidance**: Automatically avoids rectangular obstacles
- **Smooth movement**: Physics-based movement with acceleration and friction
- **Collision detection**: Prevents the rover from moving into obstacles

### Simple API
```javascript
// Create rover instance
const rover = new SimpleRover(roverElement);

// Set a goal position
rover.setGoal(x, y);

// Start/stop movement
rover.start();
rover.stop();

// Add obstacles
rover.addObstacle(left, top, width, height);

// Clear all obstacles
rover.clearObstacles();

// Get current status
const position = rover.getPosition();
const target = rover.getTarget();
const isActive = rover.isActive;
const goalReached = rover.isGoalReached();
```

## How to Use

### 1. Basic Setup
Include the rover script in your HTML:
```html
<script src="rover.js"></script>
```

### 2. Create Rover Element
Add a rover element to your HTML:
```html
<div id="rover" style="position: absolute; width: 40px; height: 40px;"></div>
```

### 3. Initialize Rover
The rover will automatically initialize when the DOM loads, or you can create it manually:
```javascript
const roverElement = document.getElementById('rover');
const rover = new SimpleRover(roverElement);
```

### 4. Set Goals
Click anywhere or programmatically set goals:
```javascript
// Set goal by coordinates
rover.setGoal(500, 300);

// Set goal to follow an element
rover.setGoalElement(document.getElementById('target-element'));
```

### 5. Add Obstacles
```javascript
// Add rectangular obstacles
rover.addObstacle(200, 200, 100, 80);  // left, top, width, height
rover.addObstacle(400, 300, 120, 60);
```

## Test the Rover

1. Open `rover-test.html` in a web browser
2. Click anywhere on the screen to set a new goal
3. Watch the rover navigate around obstacles
4. Use the control buttons to:
   - Start/Stop the rover
   - Reset rover position
   - Add random obstacles
   - Clear all obstacles

## Configuration

You can modify these parameters in the `SimpleRover` constructor:

```javascript
this.maxVelocity = 2;        // Maximum speed (pixels per frame)
this.acceleration = 0.1;     // How quickly it accelerates
this.friction = 0.9;         // How quickly it slows down
this.obstaclePadding = 15;   // Clearance from obstacles (pixels)
this.goalThreshold = 20;     // How close to consider goal reached (pixels)
```

## How It Works

### Movement Algorithm
1. **Goal Detection**: Rover checks distance to target
2. **Path Planning**: Finds safe path around obstacles
3. **Physics Simulation**: Applies acceleration and friction
4. **Collision Prevention**: Checks if new position is safe
5. **Position Update**: Moves rover to new position

### Obstacle Avoidance
- Uses line-rectangle intersection testing
- Finds closest safe point around obstacles
- Maintains minimum clearance from obstacles
- Prevents movement into obstacle areas

### Goal Reaching
- Rover stops when within `goalThreshold` distance
- Automatically sets `goalReached` flag
- Can be restarted with new goals

## Integration with Existing Code

To use this rover system in your existing project:

1. **Remove rover code** from your main `script.js`
2. **Include** `rover.js` in your HTML
3. **Initialize** the rover with your existing rover element
4. **Add obstacles** based on your page layout
5. **Set goals** based on user interaction or program logic

## Example Integration

```html
<!-- In your HTML -->
<script src="rover.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
    // Use your existing rover element
    const roverElement = document.getElementById('rover');
    const rover = new SimpleRover(roverElement);
    
    // Add obstacles based on your page elements
    const obstacles = document.querySelectorAll('.obstacle');
    obstacles.forEach(obs => {
        const rect = obs.getBoundingClientRect();
        rover.addObstacle(rect.left, rect.top, rect.width, rect.height);
    });
    
    // Set up goal interaction
    document.addEventListener('click', (e) => {
        if (e.target !== roverElement) {
            rover.setGoal(e.clientX, e.clientY);
            rover.start();
        }
    });
});
</script>
```

## Benefits of Separation

- **Cleaner code**: Rover logic is isolated from web interface
- **Reusable**: Can be used in different projects
- **Testable**: Easy to test rover functionality independently
- **Maintainable**: Changes to rover logic don't affect web interface
- **Simple**: Focused on core navigation functionality

The rover system is now completely separated from the web interface code and provides a simple, focused solution for robot navigation and obstacle avoidance.
