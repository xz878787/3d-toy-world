(function() {
  'use strict';

  // ==================== 场景设置 ====================
  const GRID_SIZE = 8;
  const CELL_SIZE = 1.2;
  const CELL_GAP = 0.05;

  let scene, camera, renderer, raycaster, mouse;
  let gridObjects = [];
  let clouds = [];
  let smokeParticles = [];
  let hoverIndicator = null;
  let currentTool = 'grass';
  let currentSlot = 0;
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 4 };
  let cameraDistance = 12;

  // 初始化场景
  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0e6);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.needsUpdate = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 地面
    const groundGeo = new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE + 2, GRID_SIZE * CELL_SIZE + 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // 网格辅助线
    const gridHelper = new THREE.GridHelper(GRID_SIZE * CELL_SIZE, GRID_SIZE, 0xcccccc, 0xdddddd);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // 悬停指示器
    const indicatorGeo = new THREE.PlaneGeometry(CELL_SIZE - CELL_GAP * 2, CELL_SIZE - CELL_GAP * 2);
    const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x64b4ff, transparent: true, opacity: 0.4 });
    hoverIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    hoverIndicator.rotation.x = -Math.PI / 2;
    hoverIndicator.position.y = 0.02;
    scene.add(hoverIndicator);

    // 创建云朵
    createClouds();
  }

  // 创建云朵
  function createClouds() {
    const cloudCount = 6;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = createCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 40,
        12 + Math.random() * 3,
        (Math.random() - 0.5) * 20
      );
      cloud.userData.speed = 0.02 + Math.random() * 0.03;
      cloud.userData.offset = Math.random() * Math.PI * 2;
      scene.add(cloud);
      clouds.push(cloud);
    }
  }

  function createCloud() {
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    });

    // 主体部分
    const mainCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < mainCount; i++) {
      const size = 1.5 + Math.random() * 1.5;
      const geo = new THREE.SphereGeometry(size, 16, 12);
      const mesh = new THREE.Mesh(geo, cloudMat);
      mesh.position.set(
        (i - mainCount / 2) * 1.2 + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.8
      );
      mesh.scale.y = 0.6;
      mesh.castShadow = true;
      group.add(mesh);
    }

    // 侧翼部分
    const wingCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < wingCount; i++) {
      const size = 0.8 + Math.random() * 0.8;
      const geo = new THREE.SphereGeometry(size, 12, 10);
      const mesh = new THREE.Mesh(geo, cloudMat);
      const side = i % 2 === 0 ? -1 : 1;
      mesh.position.set(
        side * (2 + Math.random() * 1.5),
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.5
      );
      mesh.scale.y = 0.5;
      mesh.castShadow = true;
      group.add(mesh);
    }

    return group;
  }

  function updateCameraPosition() {
    camera.position.x = Math.sin(cameraAngle.theta) * Math.cos(cameraAngle.phi) * cameraDistance;
    camera.position.y = Math.sin(cameraAngle.phi) * cameraDistance;
    camera.position.z = Math.cos(cameraAngle.theta) * Math.cos(cameraAngle.phi) * cameraDistance;
    camera.lookAt(0, 0, 0);
  }

  // ==================== 光照设置 ====================
  function initLights() {
    // 环境光（暖色调）
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.55);
    scene.add(ambientLight);

    // 主光源（日光）
    const sunLight = new THREE.DirectionalLight(0xfff8e8, 1.1);
    sunLight.position.set(12, 18, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0002;
    sunLight.shadow.radius = 3; // 软阴影
    scene.add(sunLight);

    // 补光（暖色）
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.35);
    fillLight.position.set(-8, 10, -8);
    scene.add(fillLight);

    // 顶部补光
    const topLight = new THREE.DirectionalLight(0xffffff, 0.15);
    topLight.position.set(0, 20, 0);
    scene.add(topLight);
  }

  // ==================== 数据结构 ====================
  let world = [];

  function initWorld() {
    world = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      world[x] = [];
      for (let z = 0; z < GRID_SIZE; z++) {
        world[x][z] = { terrain: 'grass', kind: null };
      }
    }
  }

  function setCell(x, z, data) {
    if (x < 0 || x >= GRID_SIZE || z < 0 || z >= GRID_SIZE) return;
    world[x][z] = { ...data };
    renderCell(x, z);
    saveWorld();
    updateMinimap();
  }

  function getCell(x, z) {
    if (x < 0 || x >= GRID_SIZE || z < 0 || z >= GRID_SIZE) return null;
    return world[x][z];
  }

  // ==================== 工厂函数 ====================
  function createGrass() {
    const group = new THREE.Group();
    const baseColors = [0x7cb342, 0x8bc34a, 0x9ccc65, 0x689f38];
    const baseColor = baseColors[Math.floor(Math.random() * baseColors.length)];

    // 草地底板
    const geo = new THREE.BoxGeometry(CELL_SIZE - CELL_GAP * 2, 0.12, CELL_SIZE - CELL_GAP * 2);
    const mat = new THREE.MeshStandardMaterial({ color: baseColor });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.06;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // 添加草叶细节
    const grassCount = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < grassCount; i++) {
      const bladeGeo = new THREE.ConeGeometry(0.02, 0.08 + Math.random() * 0.05, 4);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0x558b2f : 0x689f38
      });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(
        (Math.random() - 0.5) * (CELL_SIZE - CELL_GAP * 2 - 0.1),
        0.12 + Math.random() * 0.02,
        (Math.random() - 0.5) * (CELL_SIZE - CELL_GAP * 2 - 0.1)
      );
      blade.rotation.z = (Math.random() - 0.5) * 0.3;
      group.add(blade);
    }

    return group;
  }

  function createDirt() {
    const group = new THREE.Group();
    const baseColors = [0x8b6914, 0x7d5e10, 0x9a7b1a, 0x6b4e0d];
    const baseColor = baseColors[Math.floor(Math.random() * baseColors.length)];

    // 土路底板
    const geo = new THREE.BoxGeometry(CELL_SIZE - CELL_GAP * 2, 0.1, CELL_SIZE - CELL_GAP * 2);
    const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.05;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // 添加石子细节
    const stoneCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < stoneCount; i++) {
      const size = 0.03 + Math.random() * 0.04;
      const stoneGeo = new THREE.SphereGeometry(size, 6, 6);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e });
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(
        (Math.random() - 0.5) * (CELL_SIZE - CELL_GAP * 2 - 0.1),
        0.06,
        (Math.random() - 0.5) * (CELL_SIZE - CELL_GAP * 2 - 0.1)
      );
      group.add(stone);
    }

    return group;
  }

  function createWater() {
    const group = new THREE.Group();
    const waterColors = [0x4a90d9, 0x5ba3e0, 0x3d82c9, 0x6bb3f0];
    const baseColor = waterColors[Math.floor(Math.random() * waterColors.length)];

    // 水体底板
    const geo = new THREE.BoxGeometry(CELL_SIZE - CELL_GAP * 2, 0.08, CELL_SIZE - CELL_GAP * 2);
    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.85,
      roughness: 0.3,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.04;
    mesh.receiveShadow = true;
    group.add(mesh);

    // 水面高光
    const highlightGeo = new THREE.BoxGeometry(CELL_SIZE - CELL_GAP * 2 - 0.1, 0.01, CELL_SIZE - CELL_GAP * 2 - 0.1);
    const highlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    });
    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    highlight.position.y = 0.085;
    group.add(highlight);

    return group;
  }

  function createStone() {
    const group = new THREE.Group();
    const colors = [0x7a7a7a, 0x6b6b6b, 0x858585, 0x5c5c5c];
    const count = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const size = 0.15 + Math.random() * 0.25;
      const shapeType = Math.floor(Math.random() * 3);

      let geo;
      if (shapeType === 0) {
        // 多面体石头
        geo = new THREE.DodecahedronGeometry(size, 0);
      } else if (shapeType === 1) {
        // 扁平石头
        geo = new THREE.BoxGeometry(size * 1.5, size * 0.4, size * 1.2);
      } else {
        // 圆形石头
        geo = new THREE.IcosahedronGeometry(size, 0);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.9,
        metalness: 0.1
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 0.6,
        size * 0.4,
        (Math.random() - 0.5) * 0.6
      );
      mesh.rotation.set(
        Math.random() * 0.5,
        Math.random() * Math.PI * 2,
        Math.random() * 0.5
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    // 添加一些小碎石
    for (let i = 0; i < 3; i++) {
      const size = 0.05 + Math.random() * 0.08;
      const geo = new THREE.SphereGeometry(size, 6, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0x666666 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 0.5,
        size * 0.3,
        (Math.random() - 0.5) * 0.5
      );
      mesh.castShadow = true;
      group.add(mesh);
    }

    return group;
  }

  function createTree() {
    const group = new THREE.Group();
    const variation = Math.random();

    // 树干 - 更粗更有纹理感
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.7, 12);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.35;
    trunk.castShadow = true;
    group.add(trunk);

    // 树干细节 - 凸起
    for (let i = 0; i < 4; i++) {
      const bumpGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.15, 6);
      const bump = new THREE.Mesh(bumpGeo, trunkMat);
      const angle = (i / 4) * Math.PI * 2;
      bump.position.set(Math.cos(angle) * 0.12, 0.25 + Math.random() * 0.2, Math.sin(angle) * 0.12);
      bump.rotation.z = Math.random() * 0.3;
      group.add(bump);
    }

    // 多层树叶
    const leafColors = [0x2e7d32, 0x388e3c, 0x1b5e20];
    const leafCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < leafCount; i++) {
      const size = 0.4 + Math.random() * 0.3;
      const height = 0.9 + i * 0.4;
      const leafGeo = new THREE.ConeGeometry(size, 0.8 + Math.random() * 0.3, 8);
      const leafMat = new THREE.MeshStandardMaterial({
        color: leafColors[Math.floor(Math.random() * leafColors.length)]
      });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = height;
      leaf.castShadow = true;
      group.add(leaf);
    }

    // 顶部小球
    const topGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 1.5;
    top.castShadow = true;
    group.add(top);

    return group;
  }

  function createHouse() {
    const group = new THREE.Group();
    const variation = Math.floor(Math.random() * 3);

    // 房身主体
    const bodyGeo = new THREE.BoxGeometry(0.85, 0.65, 0.85);
    const bodyColors = [0xd4a574, 0xc9956c, 0xbf8b5e];
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColors[variation] });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.325;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 房身细节 - 木纹效果
    for (let i = 0; i < 3; i++) {
      const lineGeo = new THREE.BoxGeometry(0.86, 0.02, 0.86);
      const lineMat = new THREE.MeshStandardMaterial({ color: 0xb8860b });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.y = 0.15 + i * 0.2;
      group.add(line);
    }

    // 屋顶
    const roofGeo = new THREE.ConeGeometry(0.75, 0.55, 4);
    const roofColors = [0xc62828, 0xb71c1c, 0x8b0000];
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[variation] });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.95;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // 屋顶边缘
    const edgeGeo = new THREE.BoxGeometry(1.1, 0.08, 1.1);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.y = 0.7;
    edge.castShadow = true;
    group.add(edge);

    // 烟囱
    const chimneyGeo = new THREE.BoxGeometry(0.15, 0.35, 0.15);
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(0.25, 1.05, 0);
    chimney.castShadow = true;
    group.add(chimney);

    // 烟囱顶部
    const chimneyTopGeo = new THREE.BoxGeometry(0.18, 0.05, 0.18);
    const chimneyTop = new THREE.Mesh(chimneyTopGeo, chimneyMat);
    chimneyTop.position.set(0.25, 1.25, 0);
    group.add(chimneyTop);

    // 门
    const doorGeo = new THREE.BoxGeometry(0.22, 0.4, 0.05);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.2, 0.45);
    group.add(door);

    // 门把手
    const knobGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xb8860b });
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.position.set(0.07, 0.2, 0.48);
    group.add(knob);

    // 窗户
    const windowGeo = new THREE.BoxGeometry(0.15, 0.15, 0.05);
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x87ceeb, emissive: 0x444444, emissiveIntensity: 0.2 });

    const window1 = new THREE.Mesh(windowGeo, windowMat);
    window1.position.set(-0.25, 0.35, 0.43);
    group.add(window1);

    const window2 = new THREE.Mesh(windowGeo, windowMat);
    window2.position.set(0.25, 0.35, 0.43);
    group.add(window2);

    // 窗框
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const frameV = new THREE.BoxGeometry(0.02, 0.15, 0.06);
    const frameH = new THREE.BoxGeometry(0.15, 0.02, 0.06);

    [window1, window2].forEach(win => {
      const fv = new THREE.Mesh(frameV, frameMat);
      fv.position.copy(win.position);
      group.add(fv);
      const fh = new THREE.Mesh(frameH, frameMat);
      fh.position.copy(win.position);
      group.add(fh);
    });

    // 创建烟雾粒子系统
    createSmokeSystem(group, 0.25, 1.35);

    return group;
  }

  // 创建烟雾粒子系统
  function createSmokeSystem(parent, x, y) {
    const smokeGroup = new THREE.Group();
    smokeGroup.position.set(x, y, 0);
    smokeGroup.userData.isSmoke = true;
    smokeGroup.userData.particles = [];

    for (let i = 0; i < 15; i++) {
      const size = 0.05 + Math.random() * 0.08;
      const geo = new THREE.SphereGeometry(size, 6, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.6
      });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.set(
        (Math.random() - 0.5) * 0.1,
        Math.random() * 0.3,
        (Math.random() - 0.5) * 0.1
      );
      particle.userData.baseY = particle.position.y;
      particle.userData.offset = Math.random() * Math.PI * 2;
      particle.userData.speed = 0.5 + Math.random() * 0.5;
      particle.userData.life = Math.random();
      smokeGroup.add(particle);
      smokeGroup.userData.particles.push(particle);
    }

    parent.add(smokeGroup);
    smokeParticles.push(smokeGroup);
  }

  function createObject(type) {
    switch (type) {
      case 'grass': return createGrass();
      case 'dirt': return createDirt();
      case 'water': return createWater();
      case 'stone': return createStone();
      case 'tree': return createTree();
      case 'house': return createHouse();
      default: return null;
    }
  }

  // ==================== 渲染 ====================
  function renderCell(x, z) {
    // 移除旧对象
    const existingIndex = gridObjects.findIndex(obj => obj.userData.x === x && obj.userData.z === z);
    if (existingIndex !== -1) {
      scene.remove(gridObjects[existingIndex]);
      gridObjects.splice(existingIndex, 1);
    }

    const cell = world[x][z];
    const posX = (x - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
    const posZ = (z - GRID_SIZE / 2 + 0.5) * CELL_SIZE;

    // 创建地形
    const terrain = createObject(cell.terrain);
    if (terrain) {
      terrain.position.set(posX, 0, posZ);
      terrain.userData = { x, z, type: 'terrain' };
      scene.add(terrain);
      gridObjects.push(terrain);
    }

    // 创建物体
    if (cell.kind) {
      const obj = createObject(cell.kind);
      if (obj) {
        obj.position.set(posX, 0, posZ);
        obj.userData = { x, z, type: 'object' };
        scene.add(obj);
        gridObjects.push(obj);
      }
    }
  }

  function renderWorld() {
    // 清除现有对象
    gridObjects.forEach(obj => scene.remove(obj));
    gridObjects = [];

    // 清除烟雾粒子
    smokeParticles.forEach(smoke => scene.remove(smoke));
    smokeParticles = [];

    // 渲染所有格子
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        renderCell(x, z);
      }
    }
  }

  // ==================== 交互 ====================
  function getGridPosition(clientX, clientY) {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      const x = Math.floor((intersectPoint.x / CELL_SIZE) + GRID_SIZE / 2);
      const z = Math.floor((intersectPoint.z / CELL_SIZE) + GRID_SIZE / 2);
      return { x, z, point: intersectPoint };
    }
    return null;
  }

  function onMouseMove(event) {
    const gridPos = getGridPosition(event.clientX, event.clientY);

    if (gridPos) {
      // 更新悬停指示器
      hoverIndicator.position.x = (gridPos.x - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
      hoverIndicator.position.z = (gridPos.z - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
      hoverIndicator.visible = true;
    } else {
      hoverIndicator.visible = false;
    }

    // 拖拽旋转
    if (isDragging) {
      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;

      cameraAngle.theta -= deltaX * 0.01;
      cameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi + deltaY * 0.01));

      updateCameraPosition();
    }

    previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  function onMouseDown(event) {
    if (event.button === 0) {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  function onMouseUp(event) {
    if (event.button === 0) {
      isDragging = false;
    }
  }

  function onClick(event) {
    const gridPos = getGridPosition(event.clientX, event.clientY);

    if (gridPos && gridPos.x >= 0 && gridPos.x < GRID_SIZE && gridPos.z >= 0 && gridPos.z < GRID_SIZE) {
      if (currentTool === 'erase') {
        setCell(gridPos.x, gridPos.z, { terrain: 'grass', kind: null });
      } else if (['grass', 'dirt', 'water'].includes(currentTool)) {
        setCell(gridPos.x, gridPos.z, { terrain: currentTool, kind: null });
      } else {
        setCell(gridPos.x, gridPos.z, { terrain: getCell(gridPos.x, gridPos.z).terrain, kind: currentTool });
      }
    }
  }

  function onWheel(event) {
    cameraDistance += event.deltaY * 0.01;
    cameraDistance = Math.max(6, Math.min(25, cameraDistance));
    updateCameraPosition();
  }

  // ==================== 持久化 ====================
  function getStorageKey() {
    return `smallWorld_slot_${currentSlot}`;
  }

  function saveWorld() {
    localStorage.setItem(getStorageKey(), JSON.stringify(world));
  }

  function loadWorld() {
    const data = localStorage.getItem(getStorageKey());
    if (data) {
      world = JSON.parse(data);
    } else {
      initWorld();
    }
    renderWorld();
    updateMinimap();
  }

  // ==================== 小地图 ====================
  function updateMinimap() {
    const canvas = document.getElementById('minimap');
    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / GRID_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const cell = world[x][z];
        let color;

        // 地形颜色
        switch (cell.terrain) {
          case 'grass': color = '#7cb342'; break;
          case 'dirt': color = '#8b6914'; break;
          case 'water': color = '#4a90d9'; break;
          default: color = '#7cb342';
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * cellSize, z * cellSize, cellSize, cellSize);

        // 物体剪影
        if (cell.kind) {
          ctx.fillStyle = '#333';
          const cx = x * cellSize + cellSize / 2;
          const cy = z * cellSize + cellSize / 2;
          const size = cellSize * 0.3;

          switch (cell.kind) {
            case 'stone':
              ctx.beginPath();
              ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2);
              ctx.fill();
              break;
            case 'tree':
              ctx.beginPath();
              ctx.moveTo(cx, cy - size);
              ctx.lineTo(cx - size * 0.6, cy + size * 0.3);
              ctx.lineTo(cx + size * 0.6, cy + size * 0.3);
              ctx.closePath();
              ctx.fill();
              break;
            case 'house':
              ctx.fillRect(cx - size * 0.5, cy - size * 0.3, size, size * 0.7);
              break;
          }
        }
      }
    }
  }

  // ==================== 重置/清空 ====================
  function clearWorld() {
    initWorld();
    renderWorld();
    saveWorld();
    updateMinimap();
  }

  function resetWorld() {
    initWorld();

    // 随机生成水塘
    const pondX = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
    const pondZ = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
    const pondSize = 2 + Math.floor(Math.random() * 2);

    for (let dx = 0; dx < pondSize; dx++) {
      for (let dz = 0; dz < pondSize; dz++) {
        const x = pondX + dx;
        const z = pondZ + dz;
        if (x < GRID_SIZE && z < GRID_SIZE) {
          world[x][z] = { terrain: 'water', kind: null };
        }
      }
    }

    // 生成石堆
    for (let i = 0; i < 3; i++) {
      let x, z;
      do {
        x = Math.floor(Math.random() * GRID_SIZE);
        z = Math.floor(Math.random() * GRID_SIZE);
      } while (world[x][z].terrain === 'water');
      world[x][z] = { terrain: world[x][z].terrain, kind: 'stone' };
    }

    // 生成房子
    for (let i = 0; i < 3; i++) {
      let x, z;
      do {
        x = Math.floor(Math.random() * GRID_SIZE);
        z = Math.floor(Math.random() * GRID_SIZE);
      } while (world[x][z].terrain === 'water' || world[x][z].kind);
      world[x][z] = { terrain: world[x][z].terrain, kind: 'house' };
    }

    // 生成树
    for (let i = 0; i < 5; i++) {
      let x, z;
      do {
        x = Math.floor(Math.random() * GRID_SIZE);
        z = Math.floor(Math.random() * GRID_SIZE);
      } while (world[x][z].terrain === 'water' || world[x][z].kind);
      world[x][z] = { terrain: world[x][z].terrain, kind: 'tree' };
    }

    // 生成小路（连接房子）
    const houses = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        if (world[x][z].kind === 'house') {
          houses.push({ x, z });
        }
      }
    }

    for (let i = 0; i < houses.length - 1; i++) {
      const h1 = houses[i];
      const h2 = houses[i + 1];
      let cx = h1.x;
      let cz = h1.z;

      while (cx !== h2.x || cz !== h2.z) {
        if (world[cx][cz].terrain !== 'water') {
          world[cx][cz] = { terrain: 'dirt', kind: world[cx][cz].kind };
        }
        if (cx < h2.x) cx++;
        else if (cx > h2.x) cx--;
        else if (cz < h2.z) cz++;
        else if (cz > h2.z) cz--;
      }
    }

    renderWorld();
    saveWorld();
    updateMinimap();
  }

  // ==================== UI 事件 ====================
  function initUI() {
    // 工具选择
    document.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentTool = card.dataset.tool;
      });
    });

    // 默认选中草地
    document.querySelector('[data-tool="grass"]').classList.add('active');

    // 存档切换
    document.getElementById('slot-select').addEventListener('change', (e) => {
      currentSlot = parseInt(e.target.value);
      loadWorld();
    });

    // 重置按钮
    document.getElementById('reset-btn').addEventListener('click', resetWorld);

    // 清空按钮
    document.getElementById('clear-btn').addEventListener('click', clearWorld);

    // 教程淡出
    setTimeout(() => {
      document.getElementById('tutorial').classList.add('fade-out');
    }, 3000);
  }

  // ==================== 动画循环 ====================
  function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // 更新云朵位置
    clouds.forEach(cloud => {
      cloud.position.x += cloud.userData.speed;
      cloud.position.y += Math.sin(time + cloud.userData.offset) * 0.002;

      // 循环移动
      if (cloud.position.x > 25) {
        cloud.position.x = -25;
      }
    });

    // 更新烟雾粒子
    smokeParticles.forEach(smokeGroup => {
      smokeGroup.userData.particles.forEach(particle => {
        // 向上飘动
        particle.position.y += 0.015 * particle.userData.speed;
        particle.position.x += Math.sin(time * 2 + particle.userData.offset) * 0.005;
        particle.position.z += Math.cos(time * 2 + particle.userData.offset) * 0.005;

        // 透明度变化
        const life = (particle.position.y - particle.userData.baseY) / 0.5;
        particle.material.opacity = Math.max(0, 0.6 * (1 - life));

        // 重置粒子
        if (particle.position.y > particle.userData.baseY + 0.5 || particle.material.opacity <= 0) {
          particle.position.y = particle.userData.baseY;
          particle.position.x = (Math.random() - 0.5) * 0.1;
          particle.position.z = (Math.random() - 0.5) * 0.1;
          particle.material.opacity = 0.6;
        }
      });
    });

    renderer.render(scene, camera);
  }

  // ==================== 窗口调整 ====================
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ==================== 启动 ====================
  function init() {
    initScene();
    initLights();
    initWorld();
    initUI();

    // 事件监听
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('wheel', onWheel);

    // 阻止右键菜单
    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

    // 加载存档
    loadWorld();

    // 启动动画
    animate();
  }

  init();
})();
