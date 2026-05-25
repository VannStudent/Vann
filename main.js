const canvas = document.querySelector("#hero-canvas");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pointer = { x: 0, y: 0 };

document.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 45, 360)}ms`;
  revealObserver.observe(item);
});

document.querySelectorAll(".skill-card, .hobby-item").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (prefersReducedMotion) return;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.transform = `translateY(-8px) rotateX(${y * -5}deg) rotateY(${x * 5}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

async function initThreeScene() {
  try {
    const THREE =
      window.THREE ||
      (await import("https://unpkg.com/three@0.150.1/build/three.module.js"));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.position.set(0, 0, 10);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const earthTexture = createEarthTexture(THREE);
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(2.05, 96, 96),
      new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.84,
        metalness: 0.03,
      })
    );
    earth.rotation.z = -0.28;
    earthGroup.add(earth);

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(2.09, 96, 96),
      new THREE.MeshLambertMaterial({
        map: createCloudTexture(THREE),
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      })
    );
    clouds.rotation.z = -0.28;
    earthGroup.add(clouds);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.18, 96, 96),
      new THREE.MeshBasicMaterial({
        color: 0x70d6ff,
        transparent: true,
        opacity: 0.13,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      })
    );
    earthGroup.add(atmosphere);

    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.01, 8, 180), orbitMaterial);
    orbit.rotation.x = Math.PI / 2.35;
    earthGroup.add(orbit);

    const moonPivot = new THREE.Group();
    moonPivot.rotation.x = Math.PI / 2.35;
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 36, 36),
      new THREE.MeshStandardMaterial({
        color: 0xd8d2c4,
        roughness: 0.9,
        metalness: 0,
      })
    );
    moon.position.set(3.1, 0, 0);
    moonPivot.add(moon);
    earthGroup.add(moonPivot);

    const stars = createStarField(THREE);
    scene.add(stars);

    scene.add(new THREE.AmbientLight(0xffffff, 0.68));
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.1);
    sunLight.position.set(4.8, 2.8, 5.6);
    scene.add(sunLight);

    const blueLight = new THREE.PointLight(0x70d6ff, 1.6, 12);
    blueLight.position.set(-4.5, -1.4, 3.5);
    scene.add(blueLight);

    const clock = new THREE.Clock();

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const compact = width < 760;
      const midSize = width < 980;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      earthGroup.position.x = compact ? 0.8 : midSize ? 2.72 : 2.35;
      earthGroup.position.y = compact ? -1.05 : -0.05;
      earthGroup.scale.setScalar(compact ? 0.78 : midSize ? 0.86 : 1);
      renderer.setSize(width, height, false);
    }

    function animate() {
      const elapsed = clock.getElapsedTime();
      const speed = prefersReducedMotion ? 0.15 : 1;

      earth.rotation.y = elapsed * 0.19 * speed + pointer.x * 0.1;
      clouds.rotation.y = elapsed * 0.24 * speed + pointer.x * 0.08;
      orbit.rotation.z = elapsed * 0.12 * speed;
      moonPivot.rotation.z = elapsed * 0.42 * speed;
      moon.rotation.y = elapsed * 0.22 * speed;
      stars.rotation.y = elapsed * 0.012 * speed;
      earthGroup.rotation.x = pointer.y * 0.08;
      earthGroup.rotation.y = pointer.x * 0.05;

      camera.position.x += (pointer.x * 0.28 - camera.position.x) * 0.04;
      camera.position.y += (-pointer.y * 0.2 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize);
    resize();
    animate();
  } catch (error) {
    initCanvasFallback();
  }
}

function createEarthTexture(THREE) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 512;
  const ctx = textureCanvas.getContext("2d");

  const ocean = ctx.createLinearGradient(0, 0, 1024, 512);
  ocean.addColorStop(0, "#123a70");
  ocean.addColorStop(0.45, "#0b5b88");
  ocean.addColorStop(1, "#09234d");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 48; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  const landGradient = ctx.createLinearGradient(0, 0, 1024, 512);
  landGradient.addColorStop(0, "#48a868");
  landGradient.addColorStop(0.55, "#8bbf55");
  landGradient.addColorStop(1, "#276b4e");
  ctx.fillStyle = landGradient;

  drawBlob(ctx, [
    [115, 150],
    [170, 94],
    [255, 118],
    [292, 180],
    [260, 246],
    [188, 260],
    [128, 228],
  ]);
  drawBlob(ctx, [
    [275, 270],
    [328, 292],
    [350, 360],
    [322, 430],
    [270, 402],
    [246, 334],
  ]);
  drawBlob(ctx, [
    [470, 112],
    [566, 82],
    [685, 118],
    [764, 174],
    [725, 238],
    [610, 226],
    [520, 260],
    [444, 212],
  ]);
  drawBlob(ctx, [
    [552, 248],
    [626, 266],
    [654, 350],
    [610, 442],
    [548, 382],
    [518, 306],
  ]);
  drawBlob(ctx, [
    [745, 274],
    [828, 246],
    [920, 286],
    [886, 350],
    [798, 356],
  ]);
  drawBlob(ctx, [
    [58, 386],
    [128, 370],
    [202, 402],
    [160, 464],
    [74, 458],
  ]);

  ctx.fillStyle = "rgba(245, 232, 166, 0.36)";
  drawBlob(ctx, [
    [502, 172],
    [596, 164],
    [662, 204],
    [632, 236],
    [522, 228],
  ]);
  drawBlob(ctx, [
    [682, 196],
    [748, 192],
    [790, 230],
    [730, 258],
    [662, 236],
  ]);

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(0, 0, 1024, 18);
  ctx.fillRect(0, 494, 1024, 18);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createCloudTexture(THREE) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 512;
  const ctx = textureCanvas.getContext("2d");
  ctx.clearRect(0, 0, 1024, 512);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";

  for (let i = 0; i < 36; i += 1) {
    const x = Math.random() * 1024;
    const y = 72 + Math.random() * 368;
    const width = 55 + Math.random() * 145;
    const height = 9 + Math.random() * 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
    ctx.ellipse(width * 0.25, -height * 0.22, width * 0.45, height * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.needsUpdate = true;
  return texture;
}

function createStarField(THREE) {
  const count = 170;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const radius = 5.5 + Math.random() * 7.2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xf7f7f7,
      size: 0.028,
      transparent: true,
      opacity: 0.74,
    })
  );
}

function drawBlob(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    const previous = points[i - 1];
    const midX = (current[0] + previous[0]) / 2;
    const midY = (current[1] + previous[1]) / 2;
    ctx.quadraticCurveTo(previous[0], previous[1], midX, midY);
  }

  const last = points[points.length - 1];
  const first = points[0];
  ctx.quadraticCurveTo(last[0], last[1], first[0], first[1]);
  ctx.closePath();
  ctx.fill();
}

function initCanvasFallback() {
  const context = canvas.getContext("2d");
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.4 + 0.45,
    speed: Math.random() * 0.18 + 0.05,
  }));

  let width = 0;
  let height = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFallbackEarth(time) {
    const compact = width < 680;
    const centerX = width * (compact ? 0.66 : 0.76) + pointer.x * 22;
    const centerY = height * (compact ? 0.62 : 0.48) - pointer.y * 18;
    const radius = Math.min(width, height) * (compact ? 0.18 : 0.22);
    const spin = time * (prefersReducedMotion ? 0.00003 : 0.0001);

    const glow = context.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.45);
    glow.addColorStop(0, "rgba(112, 214, 255, 0.18)");
    glow.addColorStop(0.68, "rgba(112, 214, 255, 0.1)");
    glow.addColorStop(1, "rgba(112, 214, 255, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, centerY, radius * 1.45, 0, Math.PI * 2);
    context.fill();

    const ocean = context.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    ocean.addColorStop(0, "#174780");
    ocean.addColorStop(0.55, "#0c6c9b");
    ocean.addColorStop(1, "#071f48");
    context.fillStyle = ocean;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius * 0.99, 0, Math.PI * 2);
    context.clip();
    context.translate(centerX, centerY);
    context.rotate(-0.18);
    context.translate(Math.sin(spin) * radius * 0.6, 0);

    context.fillStyle = "#65b96d";
    drawFallbackLand(context, -radius * 0.78, -radius * 0.38, radius * 0.52, radius * 0.36);
    drawFallbackLand(context, -radius * 0.36, radius * 0.12, radius * 0.36, radius * 0.58);
    drawFallbackLand(context, radius * 0.12, -radius * 0.42, radius * 0.74, radius * 0.34);
    drawFallbackLand(context, radius * 0.34, radius * 0.16, radius * 0.42, radius * 0.48);
    context.translate(-radius * 1.65, 0);
    drawFallbackLand(context, -radius * 0.78, -radius * 0.38, radius * 0.52, radius * 0.36);
    drawFallbackLand(context, -radius * 0.36, radius * 0.12, radius * 0.36, radius * 0.58);
    context.restore();

    context.strokeStyle = "rgba(255, 255, 255, 0.16)";
    context.lineWidth = 1;
    for (let i = -2; i <= 2; i += 1) {
      context.beginPath();
      context.ellipse(centerX, centerY, radius * Math.cos(i * 0.28), radius * 0.18, 0, 0, Math.PI * 2);
      context.stroke();
    }

    context.strokeStyle = "rgba(255, 209, 102, 0.62)";
    context.lineWidth = 1.3;
    context.beginPath();
    context.ellipse(centerX, centerY, radius * 1.42, radius * 0.33, Math.PI / 5, 0, Math.PI * 2);
    context.stroke();

    const moonAngle = time * (prefersReducedMotion ? 0.00008 : 0.00042);
    const moonTilt = Math.PI / 5;
    const orbitX = Math.cos(moonAngle) * radius * 1.42;
    const orbitY = Math.sin(moonAngle) * radius * 0.33;
    const moonX = centerX + orbitX * Math.cos(moonTilt) - orbitY * Math.sin(moonTilt);
    const moonY = centerY + orbitX * Math.sin(moonTilt) + orbitY * Math.cos(moonTilt);
    const moonRadius = radius * 0.11;
    const moonGlow = context.createRadialGradient(moonX, moonY, moonRadius * 0.3, moonX, moonY, moonRadius * 2.4);
    moonGlow.addColorStop(0, "rgba(245, 241, 225, 0.55)");
    moonGlow.addColorStop(1, "rgba(245, 241, 225, 0)");
    context.fillStyle = moonGlow;
    context.beginPath();
    context.arc(moonX, moonY, moonRadius * 2.4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d8d2c4";
    context.beginPath();
    context.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    context.fill();

    const shade = context.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    shade.addColorStop(0, "rgba(255,255,255,0.22)");
    shade.addColorStop(0.58, "rgba(255,255,255,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.42)");
    context.fillStyle = shade;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
  }

  function animate(time = 0) {
    context.clearRect(0, 0, width, height);

    stars.forEach((star) => {
      const x = ((star.x + time * 0.00001 * star.speed) % 1) * width;
      const y = star.y * height;
      context.fillStyle = "rgba(238, 247, 239, 0.72)";
      context.beginPath();
      context.arc(x, y, star.size, 0, Math.PI * 2);
      context.fill();
    });

    drawFallbackEarth(time);
    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  resize();
  animate();
}

function drawFallbackLand(ctx, x, y, width, height) {
  ctx.beginPath();
  ctx.ellipse(x, y, width, height, 0.2, 0, Math.PI * 2);
  ctx.ellipse(x + width * 0.42, y + height * 0.22, width * 0.44, height * 0.62, -0.45, 0, Math.PI * 2);
  ctx.ellipse(x - width * 0.36, y + height * 0.18, width * 0.42, height * 0.58, 0.6, 0, Math.PI * 2);
  ctx.fill();
}

window.addEventListener("load", () => {
  initThreeScene();
});
