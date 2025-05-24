// Global Variables
let scene, camera, renderer, sphere; // sphere will become sphereGroup
let actualWireframeSphereMesh; // Will hold the actual mesh for the wireframe
let panels = [];
const sphereRadius = 2; // Define sphere radius
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let hoveredPanel = null; // For hover effect

// DOM elements for popup
let popup, popupText, closeButton;

// Hamburger Menu Elements
let hamburgerIcon, hamburgerMenu, menuPanelList;

// Navigation Arrow Elements
let arrowUp, arrowDown, arrowLeft, arrowRight;
const ROTATION_INCREMENT = Math.PI / 16; // Approx 11.25 degrees

// Content for each panel
const panelContents = [
    "This is Panel 0: North Pole. Welcome to the top of the world!",
    "This is Panel 1: South Pole. It's chilly down here!",
    "This is Panel 2: Equator Zone A. Enjoy the tropical vibes.",
    "This is Panel 3: Equator Zone B. Discover amazing things here.",
    "This is Panel 4: Equator Zone C. A place of mystery and wonder.",
    "This is Panel 5: Equator Zone D. Explore the vibrant culture.",
    "This is Panel 6: Equator Zone E. The final frontier on the equator."
];

const panelMenuTitles = [
    "North Pole", "South Pole", "Equator A", "Equator B", 
    "Equator C", "Equator D", "Equator E"
];

function init() {
    // Create the scene
    scene = new THREE.Scene();

    // Create the camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Create the renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('sphereCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Create a group for the sphere assembly
    sphere = new THREE.Group(); // The global 'sphere' variable now refers to the group
    scene.add(sphere);

    // Outer wireframe sphere (actual mesh)
    const outerGeometry = new THREE.IcosahedronGeometry(sphereRadius, 2);
    const outerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff, // White wireframe
        wireframe: true,
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.FrontSide // For backface culling effect
    });
    actualWireframeSphereMesh = new THREE.Mesh(outerGeometry, outerMaterial);
    sphere.add(actualWireframeSphereMesh); // Add wireframe mesh to the group

    // Inner solid occluding sphere
    const innerGeometry = new THREE.IcosahedronGeometry(sphereRadius * 0.998, 2); // Slightly smaller
    const innerMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 }); // Match background
    const innerOccluder = new THREE.Mesh(innerGeometry, innerMaterial);
    // innerOccluder.position.copy(actualWireframeSphereMesh.position); // Already at group origin
    sphere.add(innerOccluder); // Add occluder to the group

    // Create and add panels to the actualWireframeSphereMesh
    createPanels(); // createPanels will now need to add to actualWireframeSphereMesh

    // Call the animate function to start the render loop
    animate();

    // Add a window resize listener
    window.addEventListener('resize', onWindowResize, false);

    // Add mouse event listeners for rotation
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove); // For sphere rotation
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseout', onMouseUp); // Stop dragging if mouse leaves canvas
    renderer.domElement.addEventListener('click', onClickPanel);
    renderer.domElement.addEventListener('mousemove', onPanelHover); // For panel hover effect

    // Initialize popup elements
    popup = document.getElementById('popup');
    popupText = document.getElementById('popupText');
    closeButton = document.querySelector('.popup .close-button');

    // Initialize hamburger menu elements
    hamburgerIcon = document.getElementById('hamburger-icon');
    hamburgerMenu = document.getElementById('hamburger-menu');
    menuPanelList = document.getElementById('menu-panel-list');

    // Populate Menu
    populateMenu();

    // Toggle Menu Logic
    if (hamburgerIcon && hamburgerMenu) {
        hamburgerIcon.addEventListener('click', () => {
            hamburgerMenu.classList.toggle('menu-open');
        });
    }

    // Add event listeners for popup
    if (closeButton) {
        closeButton.addEventListener('click', hidePopup);
    }
    window.addEventListener('click', function(event) {
        if (event.target == popup) {
            hidePopup();
        }
    });

    // Initialize Arrow Buttons and add event listeners
    arrowUp = document.getElementById('arrow-up');
    arrowDown = document.getElementById('arrow-down');
    arrowLeft = document.getElementById('arrow-left');
    arrowRight = document.getElementById('arrow-right');

    if (arrowUp) arrowUp.addEventListener('click', () => rotateSphere(ROTATION_INCREMENT, 0));
    if (arrowDown) arrowDown.addEventListener('click', () => rotateSphere(-ROTATION_INCREMENT, 0));
    if (arrowLeft) arrowLeft.addEventListener('click', () => rotateSphere(0, ROTATION_INCREMENT));
    if (arrowRight) arrowRight.addEventListener('click', () => rotateSphere(0, -ROTATION_INCREMENT));
}

function onWindowResize() {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    // Update camera projection matrix
    camera.updateProjectionMatrix();
    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    // Render the scene
    renderer.render(scene, camera);
}

// Mouse event handlers for rotation
function onMouseDown(event) {
    isDragging = true;
    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
}

function onMouseMove(event) {
    if (!isDragging) return;

    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    sphere.rotation.y += deltaX * 0.005;
    sphere.rotation.x += deltaY * 0.005;

    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
}

function onMouseUp() {
    isDragging = false;
}

// Popup functions
function showPopup(content) {
    if (popup && popupText) {
        popupText.textContent = content;
        popup.style.display = 'block';
    }
}

function hidePopup() {
    if (popup && popupText) {
        popup.style.display = 'none';
        popupText.textContent = '';
    }
}

function onClickPanel(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Set the raycaster's origin and direction
    raycaster.setFromCamera(mouse, camera);

    // Find intersected objects
    const intersects = raycaster.intersectObjects(panels, true);

    if (intersects.length > 0) {
        const clickedPanel = intersects[0].object;
        if (clickedPanel.userData.type === 'hexagonPanel') {
            const panelId = clickedPanel.userData.id;
            const content = panelContents[panelId];

            if (content) {
                showPopup(content);
            } else {
                showPopup("Content not found for this panel.");
            }

            // Visual feedback: Change its color to red and reset others
            panels.forEach(panel => {
                if (panel !== clickedPanel) {
                    panel.material.color.setHex(panel.userData.originalColor);
                    if (panel.material.emissive) { // Reset emissive for non-clicked panels
                        panel.material.emissive.setHex(panel.userData.originalEmissive || 0x000000);
                    }
                }
            });
            clickedPanel.material.color.set(0xff0000); // Set to red
            if (clickedPanel.material.emissive) { // Ensure clicked panel's emissive is off
                clickedPanel.material.emissive.setHex(0x000000);
            }
            // If the clicked panel was being hovered, hoveredPanel should be updated
            // or its state considered so resetHoveredPanel doesn't undo the click visual.
            // However, onClickPanel takes precedence; hover effects are managed by onPanelHover.
        }
    } else {
        // Clicked on sphere or background, reset all panels and hide popup
        panels.forEach(panel => {
            panel.material.color.setHex(panel.userData.originalColor);
            if (panel.material.emissive) { // Reset emissive for all panels
                panel.material.emissive.setHex(panel.userData.originalEmissive || 0x000000);
            }
        });
        hidePopup(); // Hide popup if click is not on a panel
        console.log('Clicked on sphere or background');
    }
}

function onPanelHover(event) {
    if (isDragging) return; // Don't show hover effects while dragging sphere

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(panels, false); // false as panels are direct children of sphere

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (intersectedObject.userData.type === 'hexagonPanel') {
            // Check if the panel is currently "clicked" (red)
            const isClickedPanel = intersectedObject.material.color.getHex() === 0xff0000;

            if (hoveredPanel !== intersectedObject && !isClickedPanel) {
                resetHoveredPanel(); // Reset the previously hovered panel if it's not the current one and not clicked
                
                hoveredPanel = intersectedObject;
                if (!hoveredPanel.userData.originalEmissive) { // Should have been set at creation
                    hoveredPanel.userData.originalEmissive = hoveredPanel.material.emissive ? hoveredPanel.material.emissive.getHex() : 0x000000;
                }
                if (hoveredPanel.material.emissive) {
                    hoveredPanel.material.emissive.setHex(0x777700); // Brighter yellow/orange emissive on hover
                }
            } else if (isClickedPanel) {
                 // If hovering over a clicked panel, ensure no hover emissive is applied
                resetHoveredPanel(); // Clears any other hovered panel
                // The clicked panel should retain its non-emissive red state
            }
        } else { // Intersected something, but not a panel (e.g. sphere itself if it was in `panels`)
            resetHoveredPanel();
        }
    } else { // No intersections
        resetHoveredPanel();
    }
}

function resetHoveredPanel() {
    if (hoveredPanel) {
        // Only reset emissive if the panel is not clicked (i.e., not red)
        if (hoveredPanel.material.color.getHex() !== 0xff0000 && hoveredPanel.material.emissive) {
            hoveredPanel.material.emissive.setHex(hoveredPanel.userData.originalEmissive || 0x000000);
        }
    }
    hoveredPanel = null;
}

function rotateSphere(rotationXAmount, rotationYAmount) {
    if (sphere) { // Ensure sphere exists
        sphere.rotation.x += rotationXAmount;
        sphere.rotation.y += rotationYAmount;
    }
}

function populateMenu() {
    if (!menuPanelList) return;
    menuPanelList.innerHTML = ''; // Clear existing items
    panelMenuTitles.forEach((title, index) => {
        const li = document.createElement('li');
        li.textContent = title;
        li.dataset.panelId = index; // Store panel ID
        li.addEventListener('click', onMenuItemClick);
        menuPanelList.appendChild(li);
    });
}

function onMenuItemClick(event) {
    const panelId = parseInt(event.target.dataset.panelId);
    if (hamburgerMenu) {
        hamburgerMenu.classList.remove('menu-open'); // Close menu
    }

    // Find the corresponding 3D panel
    const targetPanel = panels.find(p => p.userData.id === panelId);
    if (targetPanel) {
        // Simulate clicking the panel:
        // 1. Reset other panels' appearance (color and emissive)
        panels.forEach(panel => {
            if (panel !== targetPanel) {
                panel.material.color.setHex(panel.userData.originalColor);
                if (panel.material.emissive) {
                     panel.material.emissive.setHex(panel.userData.originalEmissive || 0x000000);
                }
            }
        });
        // 2. Highlight the clicked panel
        targetPanel.material.color.set(0xff0000); // Set to red
        if (targetPanel.material.emissive) {
            targetPanel.material.emissive.setHex(0x000000); // No emissive when "clicked"
        }
        
        // 3. Show popup with its content
        const content = panelContents[panelId]; // panelContents should already exist
        if (content) {
            showPopup(content);
        } else {
            showPopup("Content not found for this panel.");
        }
        
        // Reset hover effect if the clicked panel was the hovered one
        if (hoveredPanel === targetPanel) {
            hoveredPanel = null; 
        }
    }
}

function createHexagonGeometry() {
    const shape = new THREE.Shape();
    const size = 0.4; // Size of the hexagon
    shape.moveTo(size * Math.cos(0), size * Math.sin(0));
    for (let i = 1; i <= 6; i++) {
        shape.lineTo(size * Math.cos(i * Math.PI / 3), size * Math.sin(i * Math.PI / 3));
    }
    return new THREE.ShapeGeometry(shape);
}

function createPanels() {
    const hexGeometry = createHexagonGeometry();
    // Panel material should remain solid (no wireframe: true here)
    const panelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffcc00, 
        side: THREE.DoubleSide, 
        emissive: 0x333300, // This is the originalEmissive base for panels
        roughness: 0.7, 
        metalness: 0.2 
    });

    const panelRadius = sphereRadius + 0.05; // Slightly above the sphere's surface

    const panelPositionsSpherical = [
        { theta: 0, phi: 0 }, // North Pole
        { theta: Math.PI, phi: 0 }, // South Pole
        { theta: Math.PI / 2, phi: 0 }, // Equatorial 1
        { theta: Math.PI / 2, phi: (2 * Math.PI / 5) * 1 }, // Equatorial 2
        { theta: Math.PI / 2, phi: (2 * Math.PI / 5) * 2 }, // Equatorial 3
        { theta: Math.PI / 2, phi: (2 * Math.PI / 5) * 3 }, // Equatorial 4
        { theta: Math.PI / 2, phi: (2 * Math.PI / 5) * 4 }  // Equatorial 5
    ];

    panelPositionsSpherical.forEach((coords, i) => {
        const panel = new THREE.Mesh(hexGeometry, panelMaterial);

        // Convert spherical coordinates to Cartesian
        panel.position.x = panelRadius * Math.sin(coords.theta) * Math.cos(coords.phi);
        panel.position.y = panelRadius * Math.cos(coords.theta);
        panel.position.z = panelRadius * Math.sin(coords.theta) * Math.sin(coords.phi);

        // Orient the panel to face outwards from the sphere's center
        // The panel is a child of actualWireframeSphereMesh which is at (0,0,0) within the sphereGroup.
        // So, panel's lookAt should target the center of actualWireframeSphereMesh (which is its local 0,0,0).
        panel.lookAt(0, 0, 0); 
        panel.rotation.y += Math.PI; // Adjust orientation as before


        actualWireframeSphereMesh.add(panel); // Add panel as a child of the actualWireframeSphereMesh
        panels.push(panel);
        panel.userData = { 
            id: i, 
            type: 'hexagonPanel', 
            originalColor: panelMaterial.color.getHex(),
            originalEmissive: panelMaterial.emissive ? panelMaterial.emissive.getHex() : 0x000000 
        };
    });
}

// Execution
init();
