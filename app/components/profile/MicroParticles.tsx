import type { CSSProperties } from "react";

const particles = [
  [4, 2, 13, 0],
  [9, 3, 8, 2],
  [15, 1, 11, 4],
  [21, 2, 7, 1],
  [28, 4, 14, 3],
  [34, 2, 10, 5],
  [39, 3, 9, 0],
  [45, 1, 12, 4],
  [51, 2, 6, 2],
  [57, 3, 15, 1],
  [62, 1, 9, 5],
  [67, 4, 13, 3],
  [72, 2, 8, 0],
  [76, 3, 12, 4],
  [81, 1, 7, 2],
  [85, 2, 14, 5],
  [89, 4, 10, 1],
  [93, 2, 6, 3],
  [96, 3, 11, 0],
  [99, 1, 9, 4],
] as const;

export function MicroParticles() {
  return (
    <div className="micro-particles" aria-hidden="true">
      {particles.map(([left, size, duration, delay], index) => (
        <span
          className="particle"
          key={`${left}-${index}`}
          style={
            {
              "--particle-left": `${left}vw`,
              "--particle-size": `${size}px`,
              "--particle-duration": `${duration}s`,
              "--particle-delay": `${delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
