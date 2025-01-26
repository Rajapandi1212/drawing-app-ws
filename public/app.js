const socket = io(); // Connect to the WebSocket server
const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const colorPicker = document.getElementById("color");
const brushSizeSlider = document.getElementById("brushSize");
const resetButton = document.getElementById("resetCanvas");
const currentuser = document.getElementById("currentuser");
const usersList = document.getElementById("users");
const notifications = document.getElementById("notifications");

let isDrawing = false;
let lastPosition = { x: 0, y: 0 };

// Username and UserID from localStorage
let username = localStorage.getItem("username");
let userId = localStorage.getItem("userId");

if (!username || !userId) {
  username = prompt("Enter your username:");
  userId = Date.now().toString(); //  We can replace this with UUID generator for production grade
  localStorage.setItem("username", username);
  localStorage.setItem("userId", userId);
}

currentuser.textContent = `Name : ${username}`;

// Handle scoket events
socket.emit("user-data", {
  userId,
  username,
});

socket.on("existing-users", (existingUsers) => {
  // Add each existing user to the user list
  existingUsers.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user.username;
    li.title = `User ID: ${user.userId}`; // Show user ID on hover
    usersList.appendChild(li);
  });
});

socket.on("user-connected", (data) => {
  console.log(`${data.username} has connected.`);

  const li = document.createElement("li");
  li.textContent = data.username;
  li.title = `User ID: ${data.userId}`; // Show user ID on hover
  usersList.appendChild(li);

  // Show a notification
  showNotification(`${data.username} has connected.`);
});

socket.on("user-disconnected", (data) => {
  console.log(`${data.username} has disconnected.`);

  // Remove user from the list of connected users
  const userItems = usersList.getElementsByTagName("li");
  for (let item of userItems) {
    if (item.textContent === data.username) {
      usersList.removeChild(item);
      break;
    }
  }

  // Show a notification
  showNotification(`${data.username} has disconnected.`);
});

// Function to show notifications
function showNotification(message) {
  notifications.textContent = message;
  notifications.style.display = "block";

  // Hide the notification after 3 seconds
  setTimeout(() => {
    notifications.style.display = "none";
  }, 3000);
}

// Resize canvas to fit the window
canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.8;

// Local state to store the drawn points
let points = [];
let drawingTimeout;

// Start drawing
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  lastPosition = getMousePosition(e);
  points = []; // Clear the points when a new drawing starts
});

// Stop drawing
canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  if (points.length > 0) {
    emitDrawingEvent();
  }
});

// Handle mouse movement
canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;

  const currentPosition = getMousePosition(e);
  points.push(currentPosition); // Add the current mouse position to the points array
  draw(lastPosition, currentPosition, colorPicker.value, brushSizeSlider.value);

  // Debounce the emit of the drawing event every 500ms
  clearTimeout(drawingTimeout);
  drawingTimeout = setTimeout(() => {
    if (points.length > 0) {
      emitDrawingEvent();
    }
  }, 500);

  lastPosition = currentPosition;
});

// Emit the drawing event with all the points
function emitDrawingEvent() {
  socket.emit("drawing", {
    userId,
    username,
    points, // Send all points
    color: colorPicker.value,
    brushSize: brushSizeSlider.value,
  });

  // Clear points after emitting
  points = [];
}

// Handle canvas reset
resetButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Emit reset event with username and userId
  socket.emit("reset-canvas", { userId, username });
});

// Draw on the canvas
function draw(start, end, color, brushSize) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = brushSize;
  ctx.lineCap = "round";
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.closePath();
}

// Get mouse position relative to the canvas
function getMousePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

// Listen for drawing events from the server
socket.on("drawing", ({ userId, username, points, color, brushSize }) => {
  points.forEach((point, index) => {
    if (index === 0) {
      draw(
        { x: point.x, y: point.y },
        { x: point.x, y: point.y },
        color,
        brushSize
      ); // Start drawing from the first point
    } else {
      draw(
        { x: points[index - 1].x, y: points[index - 1].y },
        point,
        color,
        brushSize
      ); // Draw between consecutive points
    }
  });
});

// Listen for canvas reset events from the server
socket.on("reset-canvas", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
