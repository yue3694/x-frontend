"use client";

import { useEffect } from "react";

export function ScrollProgress() {
  useEffect(() => {
    const container = document.getElementById("scrollContainer");
    if (!container) return;
    const sections = container.querySelectorAll<HTMLElement>(".snap-section");
    const dots = document.querySelectorAll<HTMLElement>(".progress-dot");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            dots.forEach((dot) => {
              if (dot.dataset.target === id) dot.classList.add("active");
              else dot.classList.remove("active");
            });
          }
        }
      },
      { root: container, threshold: 0.5 },
    );

    sections.forEach((s) => observer.observe(s));

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const target = document.getElementById(dot.dataset.target ?? "");
        if (target && container) {
          container.scrollTo({ top: target.offsetTop, behavior: "smooth" });
        }
      });
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="scroll-progress-container hidden md:flex">
      <div className="progress-dot active" data-target="section1" title="Identity Core" />
      <div className="progress-dot" data-target="section2" title="Skill Matrix" />
      <div className="progress-dot" data-target="section3" title="Projects" />
      <div className="progress-dot" data-target="section4" title="System Logs" />
    </div>
  );
}