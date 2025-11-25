let scene, camera, renderer, currentPolyhedron, controls;
let animationProgress = 0;
let isAnimating = false;
let animationDirection = 0;

const container = document.getElementById('canvas-container');
const polyhedronSelect = document.getElementById('polyhedron-select');
const unfoldBtn = document.getElementById('unfold-btn');
const foldBtn = document.getElementById('fold-btn');
const slider = document.getElementById('animation-slider');
const progressValue = document.getElementById('progress-value');

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 5, 8);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.target.set(0, 0, 0);

    createPolyhedron(polyhedronSelect.value);
    animate();
}

function createPolyhedron(type) {
    if (currentPolyhedron) {
        scene.remove(currentPolyhedron);
    }

    animationProgress = parseFloat(slider.value) / 100;

    switch(type) {
        case 'cube':
            currentPolyhedron = createCube();
            break;
        case 'pyramid-square':
            currentPolyhedron = createSquarePyramid();
            break;
        case 'pyramid-triangle':
            currentPolyhedron = createTriangularPyramid();
            break;
        case 'pyramid-rectangle':
            currentPolyhedron = createRectangularPyramid();
            break;
        case 'prism-square':
            currentPolyhedron = createSquarePrism();
            break;
        case 'prism-triangle':
            currentPolyhedron = createTriangularPrism();
            break;
        case 'prism-rectangle':
            currentPolyhedron = createRectangularPrism();
            break;
    }

    scene.add(currentPolyhedron);
    updateAnimation(animationProgress);
}

function calculateDihedralAngle(baseNormal, faceNormal, hingeAxis) {
    // Calculate the angle between two face normals
    // This gives us the dihedral angle (interior angle between faces)
    const angle = Math.acos(Math.max(-1, Math.min(1, baseNormal.dot(faceNormal))));

    // The unfold angle is PI minus the dihedral angle
    return Math.PI - angle;
}

function createFaceFromVertices(vertices3D, color) {
    // Calculate center of face
    const center = new THREE.Vector3();
    vertices3D.forEach(v => center.add(v));
    center.divideScalar(vertices3D.length);

    // Calculate normal of the face
    const v1 = new THREE.Vector3().subVectors(vertices3D[1], vertices3D[0]);
    const v2 = new THREE.Vector3().subVectors(vertices3D[2], vertices3D[0]);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

    // Create geometry with vertices relative to center
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 1; i < vertices3D.length - 1; i++) {
        positions.push(vertices3D[0].x - center.x, vertices3D[0].y - center.y, vertices3D[0].z - center.z);
        positions.push(vertices3D[i].x - center.x, vertices3D[i].y - center.y, vertices3D[i].z - center.z);
        positions.push(vertices3D[i+1].x - center.x, vertices3D[i+1].y - center.y, vertices3D[i+1].z - center.z);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
        color: color,
        side: THREE.DoubleSide,
        flatShading: true
    });

    const mesh = new THREE.Mesh(geometry, material);

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(wireframe);

    const group = new THREE.Group();
    group.add(mesh);
    group.position.copy(center);
    group.userData.normal = normal;

    return group;
}

function createCube() {
    const group = new THREE.Group();
    const s = 1;

    const faces = [];

    // Bottom face (base) - lies in XZ plane at y = -s
    const bottomVertices = [
        new THREE.Vector3(-s, -s, -s),
        new THREE.Vector3(s, -s, -s),
        new THREE.Vector3(s, -s, s),
        new THREE.Vector3(-s, -s, s)
    ];
    const bottomFace = createFaceFromVertices(bottomVertices, 0xff6b6b);
    group.add(bottomFace);
    const baseNormal = bottomFace.userData.normal.clone();
    faces.push({
        group: bottomFace,
        initialVertices: bottomVertices,
        hingeStart: new THREE.Vector3(-s, -s, -s),
        hingeEnd: new THREE.Vector3(s, -s, -s),
        unfoldAngle: 0
    });

    // Front face - perpendicular to Z axis at z = s
    const frontVertices = [
        new THREE.Vector3(-s, -s, s),
        new THREE.Vector3(s, -s, s),
        new THREE.Vector3(s, s, s),
        new THREE.Vector3(-s, s, s)
    ];
    const frontFace = createFaceFromVertices(frontVertices, 0x4ecdc4);
    group.add(frontFace);
    faces.push({
        group: frontFace,
        initialVertices: frontVertices,
        hingeStart: new THREE.Vector3(-s, -s, s),
        hingeEnd: new THREE.Vector3(s, -s, s),
        unfoldAngle: Math.PI / 2
    });

    // Right face - perpendicular to X axis at x = s
    const rightVertices = [
        new THREE.Vector3(s, -s, s),
        new THREE.Vector3(s, -s, -s),
        new THREE.Vector3(s, s, -s),
        new THREE.Vector3(s, s, s)
    ];
    const rightFace = createFaceFromVertices(rightVertices, 0xffe66d);
    group.add(rightFace);
    faces.push({
        group: rightFace,
        initialVertices: rightVertices,
        hingeStart: new THREE.Vector3(s, -s, -s),
        hingeEnd: new THREE.Vector3(s, -s, s),
        unfoldAngle: -Math.PI / 2
    });

    // Back face - perpendicular to Z axis at z = -s
    const backVertices = [
        new THREE.Vector3(s, -s, -s),
        new THREE.Vector3(-s, -s, -s),
        new THREE.Vector3(-s, s, -s),
        new THREE.Vector3(s, s, -s)
    ];
    const backFace = createFaceFromVertices(backVertices, 0x95e1d3);
    group.add(backFace);
    faces.push({
        group: backFace,
        initialVertices: backVertices,
        hingeStart: new THREE.Vector3(s, -s, -s),
        hingeEnd: new THREE.Vector3(-s, -s, -s),
        unfoldAngle: Math.PI / 2
    });

    // Left face - perpendicular to X axis at x = -s
    const leftVertices = [
        new THREE.Vector3(-s, -s, -s),
        new THREE.Vector3(-s, -s, s),
        new THREE.Vector3(-s, s, s),
        new THREE.Vector3(-s, s, -s)
    ];
    const leftFace = createFaceFromVertices(leftVertices, 0xf38181);
    group.add(leftFace);
    faces.push({
        group: leftFace,
        initialVertices: leftVertices,
        hingeStart: new THREE.Vector3(-s, -s, -s),
        hingeEnd: new THREE.Vector3(-s, -s, s),
        unfoldAngle: Math.PI / 2
    });

    // Top face - lies in XZ plane at y = s
    const topVertices = [
        new THREE.Vector3(-s, s, s),
        new THREE.Vector3(s, s, s),
        new THREE.Vector3(s, s, -s),
        new THREE.Vector3(-s, s, -s)
    ];
    const topFace = createFaceFromVertices(topVertices, 0xaa96da);
    group.add(topFace);
    faces.push({
        group: topFace,
        initialVertices: topVertices,
        hingeStart: new THREE.Vector3(-s, s, s),
        hingeEnd: new THREE.Vector3(s, s, s),
        unfoldAngle: Math.PI,
        parentFaceIndex: 1  // Top face is attached to front face (index 1)
    });

    group.userData.faces = faces;
    return group;
}

function createSquarePyramid() {
    const group = new THREE.Group();
    const baseSize = 2;
    const height = 2;
    const s = baseSize / 2;

    const faces = [];

    // Base (square)
    const baseVertices = [
        new THREE.Vector3(-s, 0, -s),
        new THREE.Vector3(s, 0, -s),
        new THREE.Vector3(s, 0, s),
        new THREE.Vector3(-s, 0, s)
    ];
    const baseFace = createFaceFromVertices(baseVertices, 0xff6b6b);
    group.add(baseFace);
    const baseNormal = baseFace.userData.normal.clone();
    faces.push({
        group: baseFace,
        initialVertices: baseVertices,
        hingeStart: new THREE.Vector3(-s, 0, -s),
        hingeEnd: new THREE.Vector3(s, 0, -s),
        unfoldAngle: 0
    });

    const apex = new THREE.Vector3(0, height, 0);

    // Front triangle
    const frontVertices = [
        new THREE.Vector3(-s, 0, s),
        new THREE.Vector3(s, 0, s),
        apex
    ];
    const frontFace = createFaceFromVertices(frontVertices, 0x4ecdc4);
    group.add(frontFace);
    const frontHingeAxis = new THREE.Vector3().subVectors(
        new THREE.Vector3(s, 0, s),
        new THREE.Vector3(-s, 0, s)
    ).normalize();
    faces.push({
        group: frontFace,
        initialVertices: frontVertices,
        hingeStart: new THREE.Vector3(-s, 0, s),
        hingeEnd: new THREE.Vector3(s, 0, s),
	unfoldAngle: Math.PI *2/3
        //unfoldAngle: calculateDihedralAngle(baseNormal, frontFace.userData.normal, frontHingeAxis)
    });

    // Right triangle
    const rightVertices = [
        new THREE.Vector3(s, 0, s),
        new THREE.Vector3(s, 0, -s),
        apex
    ];
    const rightFace = createFaceFromVertices(rightVertices, 0xffe66d);
    group.add(rightFace);
    const rightHingeAxis = new THREE.Vector3().subVectors(
        new THREE.Vector3(s, 0, -s),
        new THREE.Vector3(s, 0, s)
    ).normalize();
    faces.push({
        group: rightFace,
        initialVertices: rightVertices,
        hingeStart: new THREE.Vector3(s, 0, s),
        hingeEnd: new THREE.Vector3(s, 0, -s),
	unfoldAngle: Math.PI *2/3
        //unfoldAngle: calculateDihedralAngle(baseNormal, rightFace.userData.normal, rightHingeAxis)
    });

    // Back triangle
    const backVertices = [
        new THREE.Vector3(s, 0, -s),
        new THREE.Vector3(-s, 0, -s),
        apex
    ];
    const backFace = createFaceFromVertices(backVertices, 0x95e1d3);
    group.add(backFace);
    const backHingeAxis = new THREE.Vector3().subVectors(
        new THREE.Vector3(-s, 0, -s),
        new THREE.Vector3(s, 0, -s)
    ).normalize();
    faces.push({
        group: backFace,
        initialVertices: backVertices,
        hingeStart: new THREE.Vector3(s, 0, -s),
        hingeEnd: new THREE.Vector3(-s, 0, -s),
	unfoldAngle: Math.PI *2/3
        //unfoldAngle: calculateDihedralAngle(baseNormal, backFace.userData.normal, backHingeAxis)
    });

    // Left triangle
    const leftVertices = [
        new THREE.Vector3(-s, 0, -s),
        new THREE.Vector3(-s, 0, s),
        apex
    ];
    const leftFace = createFaceFromVertices(leftVertices, 0xf38181);
    group.add(leftFace);
    const leftHingeAxis = new THREE.Vector3().subVectors(
        new THREE.Vector3(-s, 0, s),
        new THREE.Vector3(-s, 0, -s)
    ).normalize();
    faces.push({
        group: leftFace,
        initialVertices: leftVertices,
        hingeStart: new THREE.Vector3(-s, 0, -s),
        hingeEnd: new THREE.Vector3(-s, 0, s),
	unfoldAngle: Math.PI *2/3
        //unfoldAngle: calculateDihedralAngle(baseNormal, leftFace.userData.normal, leftHingeAxis)
    });

    group.userData.faces = faces;
    return group;
}

function createTriangularPyramid() {
    const group = new THREE.Group();
    const baseRadius = 1.5;
    const height = 2;

    const faces = [];

    // Base (equilateral triangle)
    const angle1 = -Math.PI / 2;
    const angle2 = angle1 + (2 * Math.PI / 3);
    const angle3 = angle2 + (2 * Math.PI / 3);

    const v1 = new THREE.Vector3(Math.cos(angle1) * baseRadius, 0, Math.sin(angle1) * baseRadius);
    const v2 = new THREE.Vector3(Math.cos(angle2) * baseRadius, 0, Math.sin(angle2) * baseRadius);
    const v3 = new THREE.Vector3(Math.cos(angle3) * baseRadius, 0, Math.sin(angle3) * baseRadius);

    const baseVertices = [v1, v2, v3];
    const baseFace = createFaceFromVertices(baseVertices, 0xff6b6b);
    group.add(baseFace);
    const baseNormal = baseFace.userData.normal.clone();
    faces.push({
        group: baseFace,
        initialVertices: baseVertices,
        hingeStart: v1.clone(),
        hingeEnd: v2.clone(),
        unfoldAngle: 0
    });

    const apex = new THREE.Vector3(0, height, 0);

    // Side 1
    const side1Vertices = [v1, v2, apex];
    const side1Face = createFaceFromVertices(side1Vertices, 0x4ecdc4);
    group.add(side1Face);
    faces.push({
        group: side1Face,
        initialVertices: side1Vertices,
        hingeStart: v1.clone(),
        hingeEnd: v2.clone(),
	unfoldAngle: -Math.PI *15/24
        //unfoldAngle: calculateDihedralAngle(baseNormal, side1Face.userData.normal, new THREE.Vector3())

    });

    // Side 2
    const side2Vertices = [v2, v3, apex];
    const side2Face = createFaceFromVertices(side2Vertices, 0xffe66d);
    group.add(side2Face);
    faces.push({
        group: side2Face,
        initialVertices: side2Vertices,
        hingeStart: v2.clone(),
        hingeEnd: v3.clone(),
        //unfoldAngle: calculateDihedralAngle(baseNormal, side2Face.userData.normal, new THREE.Vector3())
	unfoldAngle: -Math.PI *15/24
    });

    // Side 3
    const side3Vertices = [v3, v1, apex];
    const side3Face = createFaceFromVertices(side3Vertices, 0x95e1d3);
    group.add(side3Face);
    faces.push({
        group: side3Face,
        initialVertices: side3Vertices,
        hingeStart: v3.clone(),
        hingeEnd: v1.clone(),
        //unfoldAngle: calculateDihedralAngle(baseNormal, side3Face.userData.normal, new THREE.Vector3())
	unfoldAngle: -Math.PI *15/24
    });

    group.userData.faces = faces;
    return group;
}

function createRectangularPyramid() {
    const group = new THREE.Group();
    const width = 2.5;
    const depth = 1.5;
    const height = 2;
    const w = width / 2;
    const d = depth / 2;

    const faces = [];

    // Base (rectangle)
    const baseVertices = [
        new THREE.Vector3(-w, 0, -d),
        new THREE.Vector3(w, 0, -d),
        new THREE.Vector3(w, 0, d),
        new THREE.Vector3(-w, 0, d)
    ];
    const baseFace = createFaceFromVertices(baseVertices, 0xff6b6b);
    group.add(baseFace);
    const baseNormal = baseFace.userData.normal.clone();
    faces.push({
        group: baseFace,
        initialVertices: baseVertices,
        hingeStart: new THREE.Vector3(-w, 0, -d),
        hingeEnd: new THREE.Vector3(w, 0, -d),
        unfoldAngle: 0
    });

    const apex = new THREE.Vector3(0, height, 0);

    // Front triangle
    const frontVertices = [
        new THREE.Vector3(-w, 0, d),
        new THREE.Vector3(w, 0, d),
        apex
    ];
    const frontFace = createFaceFromVertices(frontVertices, 0x4ecdc4);
    group.add(frontFace);
    faces.push({
        group: frontFace,
        initialVertices: frontVertices,
        hingeStart: new THREE.Vector3(-w, 0, d),
        hingeEnd: new THREE.Vector3(w, 0, d),
        //unfoldAngle: calculateDihedralAngle(baseNormal, frontFace.userData.normal, new THREE.Vector3())
	unfoldAngle: Math.PI *15/24
    });

    // Right triangle
    const rightVertices = [
        new THREE.Vector3(w, 0, d),
        new THREE.Vector3(w, 0, -d),
        apex
    ];
    const rightFace = createFaceFromVertices(rightVertices, 0xffe66d);
    group.add(rightFace);
    faces.push({
        group: rightFace,
        initialVertices: rightVertices,
        hingeStart: new THREE.Vector3(w, 0, d),
        hingeEnd: new THREE.Vector3(w, 0, -d),
        //unfoldAngle: calculateDihedralAngle(baseNormal, rightFace.userData.normal, new THREE.Vector3())
	unfoldAngle: Math.PI *2/3
    });

    // Back triangle
    const backVertices = [
        new THREE.Vector3(w, 0, -d),
        new THREE.Vector3(-w, 0, -d),
        apex
    ];
    const backFace = createFaceFromVertices(backVertices, 0x95e1d3);
    group.add(backFace);
    faces.push({
        group: backFace,
        initialVertices: backVertices,
        hingeStart: new THREE.Vector3(w, 0, -d),
        hingeEnd: new THREE.Vector3(-w, 0, -d),
        //unfoldAngle: calculateDihedralAngle(baseNormal, backFace.userData.normal, new THREE.Vector3())
	unfoldAngle: Math.PI *15/24
    });

    // Left triangle
    const leftVertices = [
        new THREE.Vector3(-w, 0, -d),
        new THREE.Vector3(-w, 0, d),
        apex
    ];
    const leftFace = createFaceFromVertices(leftVertices, 0xf38181);
    group.add(leftFace);
    faces.push({
        group: leftFace,
        initialVertices: leftVertices,
        hingeStart: new THREE.Vector3(-w, 0, -d),
        hingeEnd: new THREE.Vector3(-w, 0, d),
        //unfoldAngle: calculateDihedralAngle(baseNormal, leftFace.userData.normal, new THREE.Vector3())
	unfoldAngle: Math.PI *2/3
    });

    group.userData.faces = faces;
    return group;
}

function createSquarePrism() {
    const group = new THREE.Group();
    const baseSize = 1.5;
    const height = 2.5;
    const s = baseSize / 2;
    const h = height / 2;

    const faces = [];

    // Bottom face
    const bottomVertices = [
        new THREE.Vector3(-s, -h, -s),
        new THREE.Vector3(s, -h, -s),
        new THREE.Vector3(s, -h, s),
        new THREE.Vector3(-s, -h, s)
    ];
    const bottomFace = createFaceFromVertices(bottomVertices, 0xff6b6b);
    group.add(bottomFace);
    const baseNormal = bottomFace.userData.normal.clone();
    faces.push({
        group: bottomFace,
        initialVertices: bottomVertices,
        hingeStart: new THREE.Vector3(-s, -h, -s),
        hingeEnd: new THREE.Vector3(s, -h, -s),
        unfoldAngle: 0
    });

    // Front face
    const frontVertices = [
        new THREE.Vector3(-s, -h, s),
        new THREE.Vector3(s, -h, s),
        new THREE.Vector3(s, h, s),
        new THREE.Vector3(-s, h, s)
    ];
    const frontFace = createFaceFromVertices(frontVertices, 0x4ecdc4);
    group.add(frontFace);
    faces.push({
        group: frontFace,
        initialVertices: frontVertices,
        hingeStart: new THREE.Vector3(-s, -h, s),
        hingeEnd: new THREE.Vector3(s, -h, s),
        unfoldAngle: Math.PI / 2
    });

    // Right face
    const rightVertices = [
        new THREE.Vector3(s, -h, s),
        new THREE.Vector3(s, -h, -s),
        new THREE.Vector3(s, h, -s),
        new THREE.Vector3(s, h, s)
    ];
    const rightFace = createFaceFromVertices(rightVertices, 0xffe66d);
    group.add(rightFace);
    faces.push({
        group: rightFace,
        initialVertices: rightVertices,
        hingeStart: new THREE.Vector3(s, -h, -s),
        hingeEnd: new THREE.Vector3(s, -h, s),
        unfoldAngle: -Math.PI / 2
    });

    // Back face
    const backVertices = [
        new THREE.Vector3(s, -h, -s),
        new THREE.Vector3(-s, -h, -s),
        new THREE.Vector3(-s, h, -s),
        new THREE.Vector3(s, h, -s)
    ];
    const backFace = createFaceFromVertices(backVertices, 0x95e1d3);
    group.add(backFace);
    faces.push({
        group: backFace,
        initialVertices: backVertices,
        hingeStart: new THREE.Vector3(s, -h, -s),
        hingeEnd: new THREE.Vector3(-s, -h, -s),
        unfoldAngle: Math.PI / 2
    });

    // Left face
    const leftVertices = [
        new THREE.Vector3(-s, -h, -s),
        new THREE.Vector3(-s, -h, s),
        new THREE.Vector3(-s, h, s),
        new THREE.Vector3(-s, h, -s)
    ];
    const leftFace = createFaceFromVertices(leftVertices, 0xf38181);
    group.add(leftFace);
    faces.push({
        group: leftFace,
        initialVertices: leftVertices,
        hingeStart: new THREE.Vector3(-s, -h, -s),
        hingeEnd: new THREE.Vector3(-s, -h, s),
        unfoldAngle: Math.PI / 2
    });

    // Top face
    const topVertices = [
        new THREE.Vector3(-s, h, s),
        new THREE.Vector3(s, h, s),
        new THREE.Vector3(s, h, -s),
        new THREE.Vector3(-s, h, -s)
    ];
    const topFace = createFaceFromVertices(topVertices, 0xaa96da);
    group.add(topFace);
    faces.push({
        group: topFace,
        initialVertices: topVertices,
        hingeStart: new THREE.Vector3(-s, h, s),
        hingeEnd: new THREE.Vector3(s, h, s),
        unfoldAngle: Math.PI,
        parentFaceIndex: 1  // Top face is attached to front face (index 1)
    });

    group.userData.faces = faces;
    return group;
}

function createTriangularPrism() {
    const group = new THREE.Group();
    const baseRadius = 1.2;
    const height = 2.5;
    const h = height / 2;

    const faces = [];

    // Triangle vertices for top and bottom
    const angle1 = -Math.PI / 2;
    const angle2 = angle1 + (2 * Math.PI / 3);
    const angle3 = angle2 + (2 * Math.PI / 3);

    const b1 = new THREE.Vector3(Math.cos(angle1) * baseRadius, -h, Math.sin(angle1) * baseRadius);
    const b2 = new THREE.Vector3(Math.cos(angle2) * baseRadius, -h, Math.sin(angle2) * baseRadius);
    const b3 = new THREE.Vector3(Math.cos(angle3) * baseRadius, -h, Math.sin(angle3) * baseRadius);

    const t1 = new THREE.Vector3(Math.cos(angle1) * baseRadius, h, Math.sin(angle1) * baseRadius);
    const t2 = new THREE.Vector3(Math.cos(angle2) * baseRadius, h, Math.sin(angle2) * baseRadius);
    const t3 = new THREE.Vector3(Math.cos(angle3) * baseRadius, h, Math.sin(angle3) * baseRadius);

    // Bottom face
    const bottomVertices = [b1, b2, b3];
    const bottomFace = createFaceFromVertices(bottomVertices, 0xff6b6b);
    group.add(bottomFace);
    const baseNormal = bottomFace.userData.normal.clone();
    faces.push({
        group: bottomFace,
        initialVertices: bottomVertices,
        hingeStart: b1.clone(),
        hingeEnd: b2.clone(),
        unfoldAngle: 0
    });

    // Side 1
    const side1Vertices = [b1, b2, t2, t1];
    const side1Face = createFaceFromVertices(side1Vertices, 0x4ecdc4);
    group.add(side1Face);
    faces.push({
        group: side1Face,
        initialVertices: side1Vertices,
        hingeStart: b1.clone(),
        hingeEnd: b2.clone(),
        unfoldAngle: -Math.PI / 2
    });

    // Side 2
    const side2Vertices = [b2, b3, t3, t2];
    const side2Face = createFaceFromVertices(side2Vertices, 0xffe66d);
    group.add(side2Face);
    faces.push({
        group: side2Face,
        initialVertices: side2Vertices,
        hingeStart: b2.clone(),
        hingeEnd: b3.clone(),
        unfoldAngle: -Math.PI / 2
    });

    // Side 3
    const side3Vertices = [b3, b1, t1, t3];
    const side3Face = createFaceFromVertices(side3Vertices, 0x95e1d3);
    group.add(side3Face);
    faces.push({
        group: side3Face,
        initialVertices: side3Vertices,
        hingeStart: b3.clone(),
        hingeEnd: b1.clone(),
        unfoldAngle: -Math.PI / 2
    });

    // Top face
    const topVertices = [t1, t2, t3];
    const topFace = createFaceFromVertices(topVertices, 0xaa96da);
    group.add(topFace);
    faces.push({
        group: topFace,
        initialVertices: topVertices,
        hingeStart: t1.clone(),
        hingeEnd: t2.clone(),
        unfoldAngle: -Math.PI,
        parentFaceIndex: 1  // Top face is attached to side 1 (index 1)
    });

    group.userData.faces = faces;
    return group;
}

function createRectangularPrism() {
    const group = new THREE.Group();
    const width = 2.5;
    const depth = 1.5;
    const height = 2;
    const w = width / 2;
    const d = depth / 2;
    const h = height / 2;

    const faces = [];

    // Bottom face
    const bottomVertices = [
        new THREE.Vector3(-w, -h, -d),
        new THREE.Vector3(w, -h, -d),
        new THREE.Vector3(w, -h, d),
        new THREE.Vector3(-w, -h, d)
    ];
    const bottomFace = createFaceFromVertices(bottomVertices, 0xff6b6b);
    group.add(bottomFace);
    const baseNormal = bottomFace.userData.normal.clone();
    faces.push({
        group: bottomFace,
        initialVertices: bottomVertices,
        hingeStart: new THREE.Vector3(-w, -h, -d),
        hingeEnd: new THREE.Vector3(w, -h, -d),
        unfoldAngle: 0
    });

    // Front face
    const frontVertices = [
        new THREE.Vector3(-w, -h, d),
        new THREE.Vector3(w, -h, d),
        new THREE.Vector3(w, h, d),
        new THREE.Vector3(-w, h, d)
    ];
    const frontFace = createFaceFromVertices(frontVertices, 0x4ecdc4);
    group.add(frontFace);
    faces.push({
        group: frontFace,
        initialVertices: frontVertices,
        hingeStart: new THREE.Vector3(-w, -h, d),
        hingeEnd: new THREE.Vector3(w, -h, d),
        unfoldAngle: Math.PI / 2
    });

    // Right face
    const rightVertices = [
        new THREE.Vector3(w, -h, d),
        new THREE.Vector3(w, -h, -d),
        new THREE.Vector3(w, h, -d),
        new THREE.Vector3(w, h, d)
    ];
    const rightFace = createFaceFromVertices(rightVertices, 0xffe66d);
    group.add(rightFace);
    faces.push({
        group: rightFace,
        initialVertices: rightVertices,
        hingeStart: new THREE.Vector3(w, -h, -d),
        hingeEnd: new THREE.Vector3(w, -h, d),
        unfoldAngle: -Math.PI / 2
    });

    // Back face
    const backVertices = [
        new THREE.Vector3(w, -h, -d),
        new THREE.Vector3(-w, -h, -d),
        new THREE.Vector3(-w, h, -d),
        new THREE.Vector3(w, h, -d)
    ];
    const backFace = createFaceFromVertices(backVertices, 0x95e1d3);
    group.add(backFace);
    faces.push({
        group: backFace,
        initialVertices: backVertices,
        hingeStart: new THREE.Vector3(w, -h, -d),
        hingeEnd: new THREE.Vector3(-w, -h, -d),
        unfoldAngle: Math.PI / 2
    });

    // Left face
    const leftVertices = [
        new THREE.Vector3(-w, -h, -d),
        new THREE.Vector3(-w, -h, d),
        new THREE.Vector3(-w, h, d),
        new THREE.Vector3(-w, h, -d)
    ];
    const leftFace = createFaceFromVertices(leftVertices, 0xf38181);
    group.add(leftFace);
    faces.push({
        group: leftFace,
        initialVertices: leftVertices,
        hingeStart: new THREE.Vector3(-w, -h, -d),
        hingeEnd: new THREE.Vector3(-w, -h, d),
        unfoldAngle: Math.PI / 2
    });

    // Top face
    const topVertices = [
        new THREE.Vector3(-w, h, d),
        new THREE.Vector3(w, h, d),
        new THREE.Vector3(w, h, -d),
        new THREE.Vector3(-w, h, -d)
    ];
    const topFace = createFaceFromVertices(topVertices, 0xaa96da);
    group.add(topFace);
    faces.push({
        group: topFace,
        initialVertices: topVertices,
        hingeStart: new THREE.Vector3(-w, h, d),
        hingeEnd: new THREE.Vector3(w, h, d),
        unfoldAngle: Math.PI,
        parentFaceIndex: 1  // Top face is attached to front face (index 1)
    });

    group.userData.faces = faces;
    return group;
}

function updateAnimation(progress) {
    if (!currentPolyhedron || !currentPolyhedron.userData.faces) return;

    const faces = currentPolyhedron.userData.faces;

    faces.forEach((faceData, index) => {
        if (index === 0) return; // Skip the base face

        const face = faceData.group;

        // Store initial position and rotation if not already stored
        if (!faceData.initialPosition) {
            faceData.initialPosition = face.position.clone();
            faceData.initialRotation = face.rotation.clone();
            faceData.initialQuaternion = face.quaternion.clone();
        }

        if (progress === 0) {
            // Reset to initial position
            face.position.copy(faceData.initialPosition);
            face.quaternion.copy(faceData.initialQuaternion);
            return;
        }

        // Determine the hinge position (may be dynamic for dependent faces)
        let hingeStart = faceData.hingeStart.clone();
        let hingeEnd = faceData.hingeEnd.clone();

        // Special handling for cube top face (depends on front face rotation)
        if (faceData.parentFaceIndex !== undefined) {
            const parentFaceData = faces[faceData.parentFaceIndex];
            const parentUnfoldAngle = parentFaceData.unfoldAngle * progress;
            const parentHingeAxis = new THREE.Vector3()
                .subVectors(parentFaceData.hingeEnd, parentFaceData.hingeStart)
                .normalize();

            // Calculate the offset from parent's hinge to this face's hinge
            const hingeStartOffset = new THREE.Vector3().subVectors(faceData.hingeStart, parentFaceData.hingeStart);
            const hingeEndOffset = new THREE.Vector3().subVectors(faceData.hingeEnd, parentFaceData.hingeStart);

            // Rotate these offsets by the parent's rotation
            hingeStart = parentFaceData.hingeStart.clone().add(
                hingeStartOffset.clone().applyAxisAngle(parentHingeAxis, parentUnfoldAngle)
            );
            hingeEnd = parentFaceData.hingeStart.clone().add(
                hingeEndOffset.clone().applyAxisAngle(parentHingeAxis, parentUnfoldAngle)
            );
        }

        // Use the calculated unfold angle for this specific face
        const currentUnfoldAngle = faceData.unfoldAngle * progress;
        const hingeAxis = new THREE.Vector3()
            .subVectors(hingeEnd, hingeStart)
            .normalize();

        // Calculate the center of the face
        const center = faceData.initialPosition.clone();

        // Vector from hinge start to face center
        const pivotToCenter = new THREE.Vector3().subVectors(center, faceData.hingeStart);

        // Rotate this vector around the hinge axis
        const rotatedVector = pivotToCenter.clone().applyAxisAngle(hingeAxis, currentUnfoldAngle);

        // New position is hinge start plus rotated vector
        face.position.copy(hingeStart).add(rotatedVector);

        // Calculate the rotation
        // First apply initial rotation, then add the unfolding rotation
        const unfoldQuaternion = new THREE.Quaternion().setFromAxisAngle(hingeAxis, currentUnfoldAngle);
        face.quaternion.copy(faceData.initialQuaternion).multiply(unfoldQuaternion);
    });
}

function animate() {
    requestAnimationFrame(animate);

    if (isAnimating) {
        animationProgress += animationDirection * 0.01;
        animationProgress = Math.max(0, Math.min(1, animationProgress));

        slider.value = animationProgress * 100;
        progressValue.textContent = Math.round(animationProgress * 100) + '%';

        updateAnimation(animationProgress);

        if (animationProgress === 0 || animationProgress === 1) {
            isAnimating = false;
        }
    }

    controls.update();

    renderer.render(scene, camera);
}

polyhedronSelect.addEventListener('change', (e) => {
    createPolyhedron(e.target.value);
});

unfoldBtn.addEventListener('click', () => {
    isAnimating = true;
    animationDirection = 1;
});

foldBtn.addEventListener('click', () => {
    isAnimating = true;
    animationDirection = -1;
});

slider.addEventListener('input', (e) => {
    isAnimating = false;
    animationProgress = parseFloat(e.target.value) / 100;
    progressValue.textContent = Math.round(animationProgress * 100) + '%';
    updateAnimation(animationProgress);
});

window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
});

init();