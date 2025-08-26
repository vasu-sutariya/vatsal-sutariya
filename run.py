import math
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

class Config:
    def __init__(self):
        # Robot parameters
        self.max_speed = 1.0  # m/s (for both vx and vy)
        self.min_speed = -1  # m/s
        self.max_accel = 0.2  # m/s^2
        self.vx_resolution = 0.01  # m/s
        self.vy_resolution = 0.01  # m/s
        self.dt = 0.1  # s
        self.predict_time = 3.0  # s
        self.to_goal_cost_gain = 1.0
        self.speed_cost_gain = 0.1
        self.obstacle_cost_gain = 1.0
        self.robot_radius = 0.2  # m (for collision checking)
        # Area for random goal positions
        self.goal_area = [0.0, 15.0, 0.0, 15.0]  # [min_x, max_x, min_y, max_y]

def motion(x, u, dt):
    """
    Motion model for the robot.
    x = [x, y, vx, vy]
    u = [vx, vy]
    """
    x[0] += u[0] * dt
    x[1] += u[1] * dt
    x[2] = u[0]
    x[3] = u[1]
    return x

def calculate_dynamic_window(x, config):
    """
    Calculate dynamic window based on current state and constraints.
    """
    Vs = [config.min_speed, config.max_speed, config.min_speed, config.max_speed]
    Vd = [x[2] - config.max_accel * config.dt, x[2] + config.max_accel * config.dt,
          x[3] - config.max_accel * config.dt, x[3] + config.max_accel * config.dt]
    dw = [max(Vs[0], Vd[0]), min(Vs[1], Vd[1]), max(Vs[2], Vd[2]), min(Vs[3], Vd[3])]
    return dw

def predict_trajectory(x_init, vx, vy, config):
    """
    Predict trajectory for a given velocity.
    """
    x = np.array(x_init)
    trajectory = np.array(x)
    time = 0
    while time <= config.predict_time:
        x = motion(x, [vx, vy], config.dt)
        trajectory = np.vstack((trajectory, x))
        time += config.dt
    return trajectory

def calc_to_goal_cost(trajectory, goal):
    """
    Calculate distance cost to the goal (lower is better).
    """
    dx = goal[0] - trajectory[-1, 0]
    dy = goal[1] - trajectory[-1, 1]
    cost = math.hypot(dx, dy)
    return cost

def distance_to_rectangle(point, rect):
    """
    Calculate distance from a point to a rectangle (0 if inside).
    rect = [min_x, min_y, max_x, max_y]
    """
    x, y = point
    min_x, min_y, max_x, max_y = rect
    dx = max(min_x - x, 0, x - max_x)
    dy = max(min_y - y, 0, y - max_y)
    return math.hypot(dx, dy)

def calc_obstacle_cost(trajectory, obstacles, config):
    """
    Calculate obstacle cost (higher if closer, inf if collision).
    """
    min_dist = float("inf")
    for i in range(len(trajectory)):
        for rect in obstacles:
            dist = distance_to_rectangle(trajectory[i, 0:2], rect)
            if dist <= config.robot_radius:
                return float("inf")
            min_dist = min(min_dist, dist)
    return 1.0 / min_dist

def dwa_control(x, goal, obstacles, config):
    """
    Dynamic Window Approach control.
    """
    dw = calculate_dynamic_window(x, config)
    min_cost = float("inf")
    best_u = [0.0, 0.0]
    best_trajectory = np.array([x])

    for vx in np.arange(dw[0], dw[1], config.vx_resolution):
        for vy in np.arange(dw[2], dw[3], config.vy_resolution):
            trajectory = predict_trajectory(x, vx, vy, config)

            to_goal_cost = config.to_goal_cost_gain * calc_to_goal_cost(trajectory, goal)
            speed_cost = config.speed_cost_gain * (math.hypot(config.max_speed, config.max_speed) - math.hypot(vx, vy))
            ob_cost = config.obstacle_cost_gain * calc_obstacle_cost(trajectory, obstacles, config)

            if ob_cost == float("inf"):
                continue

            final_cost = to_goal_cost + speed_cost + ob_cost

            if final_cost <= min_cost:
                min_cost = final_cost
                best_u = [vx, vy]
                best_trajectory = trajectory

    return best_u, best_trajectory

def generate_random_goal(config, obstacles):
    """
    Generate a random goal position within the goal area, avoiding obstacles.
    """
    while True:
        x = np.random.uniform(config.goal_area[0], config.goal_area[1])
        y = np.random.uniform(config.goal_area[2], config.goal_area[3])
        valid = True
        for rect in obstacles:
            dist = distance_to_rectangle([x, y], rect)
            if dist <= config.robot_radius + 0.5:
                valid = False
                break
        if valid:
            return np.array([x, y])

def main():
    config = Config()
    # Initial state [x, y, vx, vy]
    x = np.array([0.0, 0.0, 0.0, 0.0])
    # Rectangular obstacles [min_x, min_y, max_x, max_y]
    obstacles = [
        [187, 229, 187 + (323/2), 229 + (300/2)],
        [486, 368, 486 + (232/2), 368 + (31/2)],
        [1, 5, 1 + (1517/2), 5 + (62/2)],
        [667, 825, 667 + (187/2), 825 + (51/2)],
        [357, 934, 357 + (768/2), 934 + (157/2)],
        [1000, 1000, 1000 + (100/2), 1000 + (100/2)],
        [1000, 1000, 1000 + (100/2), 1000 + (100/2)],
    ]
    # Initial goal position (random)
    goal = generate_random_goal(config, obstacles)
    trajectory_history = np.array(x)
    show_animation = True

    while True:
        u, predicted_trajectory = dwa_control(x, goal, obstacles, config)
        x = motion(x, u, config.dt)
        trajectory_history = np.vstack((trajectory_history, x))

        # Check if reached goal
        if math.hypot(x[0] - goal[0], x[1] - goal[1]) <= config.robot_radius + 0.5:
            print("Reached the goal! Generating new random goal...")
            goal = generate_random_goal(config, obstacles)

        if show_animation:
            plt.cla()
            # Plot predicted trajectory
            plt.plot(predicted_trajectory[:, 0], predicted_trajectory[:, 1], "-g", label="Predicted")
            # Plot robot
            plt.plot(x[0], x[1], "xr", label="Robot")
            # Plot goal
            plt.plot(goal[0], goal[1], "ob", label="Target")
            # Plot trajectory history
            plt.plot(trajectory_history[:, 0], trajectory_history[:, 1], "-r", label="Path")
            # Plot obstacles
            for rect in obstacles:
                r = Rectangle((rect[0], rect[1]), rect[2] - rect[0], rect[3] - rect[1], fc='k', alpha=0.5)
                plt.gca().add_patch(r)
            plt.axis("equal")
            plt.xlim(-1, 15)
            plt.ylim(-1, 15)
            plt.grid(True)
            plt.legend()
            plt.pause(0.001)

    plt.show()

if __name__ == "__main__":
    main()