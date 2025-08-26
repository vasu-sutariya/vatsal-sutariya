// Rover Navigation System - Simple Goal-Seeking Robot
// This script handles robot movement towards a goal while avoiding obstacles

class SimpleRover {
    constructor(roverElement, goalElement = null) {
        this.rover = roverElement;
        this.goal = goalElement;
        
        // Physics properties
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        this.maxVelocity = 2; // pixels per frame
        this.acceleration = 0.1; // how quickly it accelerates
        this.friction = 0.9; // how quickly it slows down
        this.animationId = null;
        this.isActive = false;

        // Obstacle avoidance
        this.obstacles = [];
        this.obstaclePadding = 15; // pixels of clearance from obstacles
        
        // Goal seeking
        this.goalReached = false;
        this.goalThreshold = 20; // pixels - how close to consider goal reached
        
        this.init();
    }

    init() {
        // Initialize position from current rover position
        this.updatePosition();
        
        // Set initial target to current position
        this.targetPosition = { ...this.position };
        
        console.log('SimpleRover initialized at:', this.position);
    }

    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('Rover started');
        
        // Start animation loop
        this.animate();
    }

    stop() {
        this.isActive = false;
        
        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log('Rover stopped');
    }

    setGoal(x, y) {
        this.targetPosition.x = x;
        this.targetPosition.y = y;
        this.goalReached = false;
        console.log('New goal set:', this.targetPosition);
    }

    setGoalElement(element) {
        this.goal = element;
        this.updateGoalPosition();
    }

    updateGoalPosition() {
        if (this.goal) {
            const rect = this.goal.getBoundingClientRect();
            this.targetPosition.x = rect.left + rect.width / 2;
            this.targetPosition.y = rect.top + rect.height / 2;
        }
    }

    updatePosition() {
        const rect = this.rover.getBoundingClientRect();
        this.position.x = rect.left + rect.width / 2;
        this.position.y = rect.top + rect.height / 2;
    }

    addObstacle(left, top, width, height, padding = 0) {
        this.obstacles.push({
            left: left - padding,
            top: top - padding,
            width: width + 2 * padding,
            height: height + 2 * padding
        });
    }

    clearObstacles() {
        this.obstacles = [];
    }

    // Simple obstacle avoidance - find closest safe point towards goal
    findSafePath(currentPos, targetPos) {
        let path = { x: targetPos.x, y: targetPos.y };
        
        // Check if direct path is blocked
        for (const obstacle of this.obstacles) {
            if (this.lineIntersectsRect(currentPos, targetPos, obstacle)) {
                // Find closest safe point around obstacle
                path = this.findClosestSafePoint(currentPos, targetPos, obstacle);
                break;
            }
        }
        
        return path;
    }

    lineIntersectsRect(start, end, rect) {
        // Check if line from start to end intersects with rectangle
        const left = rect.left;
        const right = rect.left + rect.width;
        const top = rect.top;
        const bottom = rect.top + rect.height;
        
        // Check if either endpoint is inside the rectangle
        if (start.x >= left && start.x <= right && start.y >= top && start.y <= bottom) return true;
        if (end.x >= left && end.x <= right && end.y >= top && end.y <= bottom) return true;
        
        // Check line-rectangle intersection
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        // Parametric line equation: p = start + t * (end - start)
        // Find intersection with rectangle edges
        const tValues = [];
        
        if (dx !== 0) {
            tValues.push((left - start.x) / dx);
            tValues.push((right - start.x) / dx);
        }
        if (dy !== 0) {
            tValues.push((top - start.y) / dy);
            tValues.push((bottom - start.y) / dy);
        }
        
        // Check if any t value is between 0 and 1 (line segment intersects)
        for (const t of tValues) {
            if (t >= 0 && t <= 1) {
                const x = start.x + t * dx;
                const y = start.y + t * dy;
                if (x >= left && x <= right && y >= top && y <= bottom) {
                    return true;
                }
            }
        }
        
        return false;
    }

    findClosestSafePoint(currentPos, targetPos, obstacle) {
        // Find the closest point on the obstacle boundary that's towards the goal
        const left = obstacle.left;
        const right = obstacle.left + obstacle.width;
        const top = obstacle.top;
        const bottom = obstacle.top + obstacle.height;
        
        // Calculate distances to each edge
        const distances = [
            { edge: 'left', dist: Math.abs(currentPos.x - left), x: left - this.obstaclePadding, y: currentPos.y },
            { edge: 'right', dist: Math.abs(currentPos.x - right), x: right + this.obstaclePadding, y: currentPos.y },
            { edge: 'top', dist: Math.abs(currentPos.y - top), x: currentPos.x, y: top - this.obstaclePadding },
            { edge: 'bottom', dist: Math.abs(currentPos.y - bottom), x: currentPos.x, y: bottom + this.obstaclePadding }
        ];
        
        // Choose the edge that's closest to the goal direction
        let bestPoint = distances[0];
        let bestScore = this.distanceToGoal(distances[0]) + distances[0].dist * 0.1;
        
        for (const point of distances) {
            const score = this.distanceToGoal(point) + point.dist * 0.1;
            if (score < bestScore) {
                bestScore = score;
                bestPoint = point;
            }
        }
        
        return { x: bestPoint.x, y: bestPoint.y };
    }

    distanceToGoal(point) {
        const dx = this.targetPosition.x - point.x;
        const dy = this.targetPosition.y - point.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    animate() {
        if (!this.isActive) return;
        
        // Update current position
        this.updatePosition();
        
        // Update goal position if goal element exists
        if (this.goal) {
            this.updateGoalPosition();
        }
        
        // Check if goal is reached
        const distanceToGoal = this.distanceToGoal(this.position);
        if (distanceToGoal < this.goalThreshold) {
            this.goalReached = true;
            console.log('Goal reached!');
            this.stop();
            return;
        }
        
        // Find safe path to goal
        const safeTarget = this.findSafePath(this.position, this.targetPosition);
        
        // Calculate direction to safe target
        const dx = safeTarget.x - this.position.x;
        const dy = safeTarget.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Normalize direction
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Apply acceleration towards target
            this.velocity.x += dirX * this.acceleration;
            this.velocity.y += dirY * this.acceleration;
        }
        
        // Apply friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        
        // Limit maximum velocity
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxVelocity) {
            this.velocity.x = (this.velocity.x / speed) * this.maxVelocity;
            this.velocity.y = (this.velocity.y / speed) * this.maxVelocity;
        }
        
        // Update position
        const newX = this.position.x + this.velocity.x;
        const newY = this.position.y + this.velocity.y;
        
        // Check if new position would collide with obstacles
        const roverRect = this.rover.getBoundingClientRect();
        const roverWidth = roverRect.width;
        const roverHeight = roverRect.height;
        
        let canMove = true;
        for (const obstacle of this.obstacles) {
            const newRoverRect = {
                left: newX - roverWidth / 2,
                top: newY - roverHeight / 2,
                width: roverWidth,
                height: roverHeight
            };
            
            if (this.rectsIntersect(newRoverRect, obstacle)) {
                canMove = false;
                break;
            }
        }
        
        // Move rover if safe
        if (canMove) {
            this.rover.style.left = (newX - roverWidth / 2) + 'px';
            this.rover.style.top = (newY - roverHeight / 2) + 'px';
        } else {
            // Stop movement if collision detected
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
        
        // Continue animation loop
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    rectsIntersect(a, b) {
        return !(a.left + a.width <= b.left ||
                 b.left + b.width <= a.left ||
                 a.top + a.height <= b.top ||
                 b.top + b.height <= a.top);
    }

    // Public API methods
    getPosition() {
        return { ...this.position };
    }

    getTarget() {
        return { ...this.targetPosition };
    }

    isGoalReached() {
        return this.goalReached;
    }

    getObstacles() {
        return [...this.obstacles];
    }
}

// Initialize rover when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const roverElement = document.getElementById('rover');
    if (!roverElement) {
        console.error('Rover element not found!');
        return;
    }
    
    // Create rover instance
    const rover = new SimpleRover(roverElement);
    
    // Add some default obstacles (you can modify these)
    rover.addObstacle(200, 200, 100, 100);
    rover.addObstacle(400, 300, 150, 80);
    rover.addObstacle(100, 400, 120, 90);
    
    // Set a goal position (you can change this)
    rover.setGoal(600, 400);
    
    // Start the rover after a short delay
    setTimeout(() => {
        rover.start();
    }, 1000);
    
    // Expose rover to global scope for debugging
    window.simpleRover = rover;
    
    // Add click handler to set new goals
    document.addEventListener('click', (e) => {
        if (e.target !== roverElement) {
            rover.setGoal(e.clientX, e.clientY);
            if (!rover.isActive) {
                rover.start();
            }
        }
    });
    
    console.log('SimpleRover initialized and ready!');
    console.log('Click anywhere to set a new goal for the rover.');
});
