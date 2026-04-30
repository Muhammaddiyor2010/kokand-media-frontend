const API_BASE = "http://127.0.0.1:8000";

async function loadContent() {
  const response = await fetch(`${API_BASE}/api/public/content`);
  if (!response.ok) {
    throw new Error("Kontent yuklanmadi");
  }
  return response.json();
}

function fillContent(data) {
  document.getElementById("brandName").textContent = data.brand;
  document.getElementById("heroTitle").textContent = data.hero_title;
  document.getElementById("heroSubtitle").textContent = data.hero_subtitle;
  document.getElementById("monthlyPrice").textContent = data.monthly_price;
  document.getElementById("videoPrice").textContent = data.one_time_video_price;
  document.getElementById("aboutText").textContent = data.about;
  document.getElementById("contactPhone").textContent = data.phone;
  document.getElementById("contactTelegram").textContent = data.telegram;

  const grid = document.getElementById("serviceGrid");
  grid.innerHTML = "";
  data.services.forEach((service) => {
    const card = document.createElement("article");
    card.className = "service-card";
    card.innerHTML = `<h3>${service.title}</h3><p>${service.description}</p>`;
    grid.appendChild(card);
  });
}

async function submitLeadForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("formMessage");
  message.classList.remove("error");

  const formData = new FormData(form);
  const payload = {
    name: formData.get("name")?.toString().trim(),
    phone: formData.get("phone")?.toString().trim(),
    comment: formData.get("comment")?.toString().trim() || null,
  };

  try {
    const response = await fetch(`${API_BASE}/api/public/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("So'rov yuborilmadi");
    }

    form.reset();
    message.textContent = "So'rov qabul qilindi. Tez orada bog'lanamiz.";
  } catch (error) {
    message.classList.add("error");
    message.textContent = "Xatolik yuz berdi. Qayta urinib ko'ring.";
  }
}

function setup3DBackground() {
  import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js")
    .then((THREE) => {
      const canvas = document.getElementById("bg-canvas");
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 6);

      const lightA = new THREE.PointLight(0x4cd7d0, 3, 20);
      lightA.position.set(4, 3, 4);
      scene.add(lightA);

      const lightB = new THREE.PointLight(0x82ff9d, 2, 20);
      lightB.position.set(-4, -3, 3);
      scene.add(lightB);

      const object = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.3, 0.36, 180, 24),
        new THREE.MeshStandardMaterial({
          color: 0xb0f8ff,
          roughness: 0.3,
          metalness: 0.75,
          emissive: 0x0a2238,
          emissiveIntensity: 0.5,
        })
      );
      scene.add(object);

      const stars = new THREE.Group();
      for (let i = 0; i < 120; i += 1) {
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 8, 8),
          new THREE.MeshBasicMaterial({ color: i % 2 ? 0x4cd7d0 : 0x82ff9d })
        );
        star.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10);
        stars.add(star);
      }
      scene.add(stars);

      const animate = () => {
        object.rotation.x += 0.005;
        object.rotation.y += 0.006;
        stars.rotation.y += 0.0008;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate();

      window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    })
    .catch(() => {
      const canvas = document.getElementById("bg-canvas");
      if (canvas) {
        canvas.style.display = "none";
      }
    });
}

async function init() {
  setup3DBackground();
  document.getElementById("leadForm").addEventListener("submit", submitLeadForm);

  try {
    const data = await loadContent();
    fillContent(data);
  } catch {
    document.getElementById("formMessage").textContent = "Backend bilan ulanishni tekshiring.";
  }
}

init();
