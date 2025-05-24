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
let lastFocusedElementBeforePopup; // For popup focus management

// Hamburger Menu Elements
let hamburgerIcon, hamburgerMenu, menuPanelList;

// Navigation Arrow Elements
let arrowUp, arrowDown, arrowLeft, arrowRight;
const ROTATION_INCREMENT = Math.PI / 16; // Approx 11.25 degrees

// Global store for selected panel center coordinates
let selectedPanelCenterCoords = [];

// Helper function to find closest vertex index
function findClosestVertexIndex(targetCoord, geometryPositions, tolerance = 0.01) {
    for (let i = 0; i < geometryPositions.count; i++) {
        const dx = geometryPositions.getX(i) - targetCoord.x;
        const dy = geometryPositions.getY(i) - targetCoord.y;
        const dz = geometryPositions.getZ(i) - targetCoord.z;
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < tolerance) {
            return i;
        }
    }
    console.warn("Could not find exact vertex for targetCoord", targetCoord);
    // Fallback: find the truly closest one if no exact match within tolerance
    let closestIdx = -1;
    let minDistSq = Infinity;
    for (let i = 0; i < geometryPositions.count; i++) {
        const dx = geometryPositions.getX(i) - targetCoord.x;
        const dy = geometryPositions.getY(i) - targetCoord.y;
        const dz = geometryPositions.getZ(i) - targetCoord.z;
        const distSq = dx*dx + dy*dy + dz*dz;
        if (distSq < minDistSq) {
            minDistSq = distSq;
            closestIdx = i;
        }
    }
    console.warn(`Falling back to closest vertex index ${closestIdx} with distance ${Math.sqrt(minDistSq)}`);
    return closestIdx;
}


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
    const outerGeometry = new THREE.IcosahedronGeometry(sphereRadius, 1); // Updated detail to 1
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
    const innerGeometry = new THREE.IcosahedronGeometry(sphereRadius * 0.998, 1); // Updated detail to 1
    const innerMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 }); // Match background
    const innerOccluder = new THREE.Mesh(innerGeometry, innerMaterial);
    // innerOccluder.position.copy(actualWireframeSphereMesh.position); // Already at group origin
    sphere.add(innerOccluder); // Add occluder to the group

    // Create and add panels to the actualWireframeSphereMesh
    // createPanels(); // Call moved to end of selectAndStorePanelCenterCoords

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
            const isOpen = hamburgerMenu.classList.toggle('menu-open');
            hamburgerIcon.setAttribute('aria-expanded', isOpen.toString());
            hamburgerMenu.setAttribute('aria-hidden', (!isOpen).toString()); // Update aria-hidden
            if (isOpen) {
                // Focus on the first menu item when menu opens
                const firstMenuItem = hamburgerMenu.querySelector('button[role="menuitem"]');
                if (firstMenuItem) {
                    firstMenuItem.focus();
                }
            }
        });
    }

    // Keyboard navigation for menu
    if (menuPanelList) {
        menuPanelList.addEventListener('keydown', handleMenuKeyDown);
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
        lastFocusedElementBeforePopup = document.activeElement; // Store focus
        popupText.textContent = content;
        popup.style.display = 'block';
        popup.setAttribute('aria-hidden', 'false'); // Update aria-hidden
        
        const popupCloseButton = popup.querySelector('.close-button');
        if (popupCloseButton) {
            popupCloseButton.focus(); // Focus on popup close button
        }
    }
}

function hidePopup() {
    if (popup && popupText) {
        popup.setAttribute('aria-hidden', 'true'); // Update aria-hidden
        popup.style.display = 'none';
        popupText.textContent = '';
        
        if (lastFocusedElementBeforePopup) {
            lastFocusedElementBeforePopup.focus(); // Return focus
            lastFocusedElementBeforePopup = null;
        }
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
        if (clickedPanel.userData.type === 'hexagonPanel_integrated') { // Updated type check
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
                    if (panel.material.emissive) { 
                        panel.material.emissive.setHex(panel.userData.originalEmissive || 0x000000);
                    }
                    panel.material.opacity = panel.userData.originalOpacity; // Reset opacity
                }
            });
            clickedPanel.material.color.set(0xff0000); // Set to red
            clickedPanel.material.opacity = 1.0; // Make clicked panel fully opaque
            if (clickedPanel.material.emissive) { 
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
            if (panel.material.emissive) { 
                panel.material.emissive.setHex(panel.userData.originalEmissive || 0x000000);
            }
            panel.material.opacity = panel.userData.originalOpacity; // Reset opacity for all panels
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
        if (intersectedObject.userData.type === 'hexagonPanel_integrated') { // Updated type check
            const isClickedPanel = intersectedObject.material.color.getHex() === 0xff0000;

            if (hoveredPanel !== intersectedObject && !isClickedPanel) {
                resetHoveredPanel(); 
                
                hoveredPanel = intersectedObject;
                // Ensure originalEmissive is stored if not already (should be by createPanels)
                if (hoveredPanel.userData.originalEmissive === undefined && hoveredPanel.material.emissive) {
                    hoveredPanel.userData.originalEmissive = hoveredPanel.material.emissive.getHex();
                }
                if (hoveredPanel.material.emissive) {
                    hoveredPanel.material.emissive.setHex(0x555500); // Hover emissive color
                }
                 // Optionally make it slightly more opaque on hover
                // hoveredPanel.material.opacity = Math.min(1.0, (hoveredPanel.userData.originalOpacity || 0.7) + 0.15);
            } else if (isClickedPanel) {
                resetHoveredPanel(); 
            }
        } else { 
            resetHoveredPanel();
        }
    } else { 
        resetHoveredPanel();
    }
}

function resetHoveredPanel() {
    if (hoveredPanel) {
        if (hoveredPanel.material.color.getHex() !== 0xff0000 && hoveredPanel.material.emissive) { // Not clicked red
            hoveredPanel.material.emissive.setHex(hoveredPanel.userData.originalEmissive || 0x000000);
        }
        // Reset opacity if it was changed on hover (only if not clicked red)
        if (hoveredPanel.material.color.getHex() !== 0xff0000) {
            hoveredPanel.material.opacity = hoveredPanel.userData.originalOpacity || 0.7;
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
        li.setAttribute('role', 'none'); // LI is just a container for the menuitem button
        
        const button = document.createElement('button');
        button.setAttribute('role', 'menuitem');
        button.type = 'button'; // Explicitly set button type
        button.textContent = title;
        button.dataset.panelId = index;
        button.addEventListener('click', onMenuItemClick);
        // No need for explicit keydown for Enter/Space on button, browser handles it.

        li.appendChild(button);
        menuPanelList.appendChild(li);
    });
}

function handleMenuKeyDown(event) {
    if (!hamburgerMenu.classList.contains('menu-open')) return;
    const items = Array.from(menuPanelList.querySelectorAll('button[role="menuitem"]'));
    if (items.length === 0) return;

    let currentIndex = items.indexOf(document.activeElement);

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (currentIndex > 0) items[currentIndex - 1].focus();
        else items[items.length - 1].focus(); // Wrap to last
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (currentIndex < items.length - 1) items[currentIndex + 1].focus();
        else items[0].focus(); // Wrap to first
    } else if (event.key === 'Home') {
        event.preventDefault();
        items[0].focus();
    } else if (event.key === 'End') {
        event.preventDefault();
        items[items.length - 1].focus();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        hamburgerMenu.classList.remove('menu-open');
        hamburgerIcon.setAttribute('aria-expanded', 'false');
        hamburgerMenu.setAttribute('aria-hidden', 'true'); // Update aria-hidden
        hamburgerIcon.focus(); // Return focus
    }
}


function onMenuItemClick(event) {
    // event.target will be the button due to event listener attachment
    const panelId = parseInt(event.target.dataset.panelId); 
    if (hamburgerMenu) {
        hamburgerMenu.classList.remove('menu-open'); // Close menu
        hamburgerIcon.setAttribute('aria-expanded', 'false'); // Update ARIA state
        hamburgerMenu.setAttribute('aria-hidden', 'true'); // Update aria-hidden
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

    // Return focus to hamburger icon after panel selection (and popup display)
    if (hamburgerIcon) {
        hamburgerIcon.focus();
    }
}

    submit_subtask_report(succeeded=true, summary=reportSummary);
    createPanels(); // Call new createPanels after selectedPanelCenterCoords is populated
}

function createPanels() {
    if (!actualWireframeSphereMesh || !selectedPanelCenterCoords || selectedPanelCenterCoords.length === 0) {
        console.error("Missing prerequisites for createPanels (actualWireframeSphereMesh or selectedPanelCenterCoords).");
        return;
    }

    const sphereGeom = actualWireframeSphereMesh.geometry;
    const spherePositions = sphereGeom.attributes.position;
    const sphereIndices = sphereGeom.index;

    // 1. Build vertex-to-face map for the main sphereGeom (detail 1)
    const vertexFaceMap = new Array(spherePositions.count).fill(null).map(() => new Set());
    for (let i = 0; i < sphereIndices.count / 3; i++) {
        const vA = sphereIndices.getX(i);
        const vB = sphereIndices.getY(i);
        const vC = sphereIndices.getZ(i);
        vertexFaceMap[vA].add(i);
        vertexFaceMap[vB].add(i);
        vertexFaceMap[vC].add(i);
    }

    panels.forEach(oldPanel => { // Clear any old panels from scene / dispose geometry if any
        if(oldPanel.parent) oldPanel.parent.remove(oldPanel);
        if(oldPanel.geometry) oldPanel.geometry.dispose();
        if(oldPanel.material) oldPanel.material.dispose();
    });
    panels.length = 0; // Clear the global panels array

    selectedPanelCenterCoords.forEach((centerCoord, panelIdx) => {
        // 2. Find the central vertex index on the sphere mesh
        const centralVertexIdx = findClosestVertexIndex(centerCoord, spherePositions);
        if (centralVertexIdx === -1) {
            console.error("Could not find central vertex for panel", panelIdx, centerCoord);
            return; // Skip this panel
        }

        // 3. Get the 6 faces connected to this centralVertexIdx
        const connectedFaceIndices = Array.from(vertexFaceMap[centralVertexIdx]);
        if (connectedFaceIndices.length !== 6) {
            console.warn(`Panel ${panelIdx}: Central vertex ${centralVertexIdx} is connected to ${connectedFaceIndices.length} faces, expected 6. Skipping panel.`);
            return; 
        }

        // 4. Collect all unique sphere vertex indices that form these 6 faces
        const panelSphereVertexIndices = new Set();
        const panelFaceDefinitions = []; 

        connectedFaceIndices.forEach(faceIdx => {
            const vA = sphereIndices.getX(faceIdx);
            const vB = sphereIndices.getY(faceIdx);
            const vC = sphereIndices.getZ(faceIdx);
            panelSphereVertexIndices.add(vA);
            panelSphereVertexIndices.add(vB);
            panelSphereVertexIndices.add(vC);
            panelFaceDefinitions.push([vA, vB, vC]);
        });

        // 5. Create new BufferGeometry for the panel
        const panelVerticesArray = [];
        const sphereVertexIdxToArrayIdxMap = new Map(); 
        
        Array.from(panelSphereVertexIndices).forEach((sphereVtxIdx, i) => {
            panelVerticesArray.push(spherePositions.getX(sphereVtxIdx));
            panelVerticesArray.push(spherePositions.getY(sphereVtxIdx));
            panelVerticesArray.push(spherePositions.getZ(sphereVtxIdx));
            sphereVertexIdxToArrayIdxMap.set(sphereVtxIdx, i);
        });

        const panelIndicesArray = [];
        panelFaceDefinitions.forEach(faceVs => {
            panelIndicesArray.push(sphereVertexIdxToArrayIdxMap.get(faceVs[0]));
            panelIndicesArray.push(sphereVertexIdxToArrayIdxMap.get(faceVs[1]));
            panelIndicesArray.push(sphereVertexIdxToArrayIdxMap.get(faceVs[2]));
        });

        const panelGeom = new THREE.BufferGeometry();
        panelGeom.setAttribute('position', new THREE.Float32BufferAttribute(panelVerticesArray, 3));
        panelGeom.setIndex(panelIndicesArray);
        panelGeom.computeVertexNormals(); 

        // 6. Create material for the panel
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0xffee88, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0.7 
        });

        // 7. Create panel mesh and add it
        const panelMesh = new THREE.Mesh(panelGeom, panelMaterial.clone()); 
        
        panelMesh.userData = {
            id: panelIdx,
            type: 'hexagonPanel_integrated', 
            originalColor: panelMaterial.color.getHex(),
            originalOpacity: panelMaterial.opacity,
            originalEmissive: panelMaterial.emissive ? panelMaterial.emissive.getHex() : 0x000000 
        };
        
        actualWireframeSphereMesh.add(panelMesh); 
        panels.push(panelMesh); 
    });

    if (typeof populateMenu === 'function') {
        populateMenu();
    }
    console.log(`Created ${panels.length} integrated panels.`);
}
