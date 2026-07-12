"use client";

import { useEffect, useRef } from "react";

export function NeuralHub() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let raf = 0;

    (async () => {
      const THREE = await import("three");
      if (cancelled || !container) return;

      try {
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const group = new THREE.Group();
        scene.add(group);

        const coreGeom = new THREE.IcosahedronGeometry(1.5, 2);
        const coreMat = new THREE.MeshPhongMaterial({
          color: 0x3b82f6,
          wireframe: true,
          transparent: true,
          opacity: 0.8,
          emissive: 0x1d4ed8,
          emissiveIntensity: 0.5,
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        group.add(core);

        const innerGeom = new THREE.IcosahedronGeometry(0.8, 1);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
        const inner = new THREE.Mesh(innerGeom, innerMat);
        group.add(inner);

        const particlesCount = 100;
        const positions = new Float32Array(particlesCount * 3);
        for (let i = 0; i < particlesCount; i++) {
          const r = 2.5 + Math.random() * 2;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = r * Math.cos(phi);
        }
        const partGeom = new THREE.BufferGeometry();
        partGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const partMat = new THREE.PointsMaterial({
          color: 0x3b82f6,
          size: 0.05,
          transparent: true,
          opacity: 0.6,
        });
        const points = new THREE.Points(partGeom, partMat);
        group.add(points);

        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(5, 5, 5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));

        camera.position.z = 6;

        let mX = 0;
        let mY = 0;
        function onMouse(e: MouseEvent) {
          mX = (e.clientX - window.innerWidth / 2) / 100;
          mY = (e.clientY - window.innerHeight / 2) / 100;
        }
        window.addEventListener("mousemove", onMouse);

        function onResize() {
          if (!container || !renderer) return;
          const w = container.clientWidth || 400;
          const h = container.clientHeight || 400;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
        window.addEventListener("resize", onResize);

        function animate() {
          raf = requestAnimationFrame(animate);
          group.rotation.y += 0.005;
          group.rotation.x += 0.002;
          group.position.x += (mX - group.position.x) * 0.05;
          group.position.y += (-mY - group.position.y) * 0.05;
          const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.05;
          core.scale.set(pulse, pulse, pulse);
          renderer!.render(scene, camera);
        }
        animate();

        return () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("mousemove", onMouse);
          window.removeEventListener("resize", onResize);
          if (renderer) {
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
              container.removeChild(renderer.domElement);
            }
          }
        };
      } catch {
        // WebGL unavailable — leave container empty for fallback.
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "150%",
        height: "150%",
        zIndex: -1,
        pointerEvents: "none",
      }}
      aria-hidden
    />
  );
}