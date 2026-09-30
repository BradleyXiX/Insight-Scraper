---
name: webgl-3d-object
description: Tailored for web design, generating high-fidelity 3D WebGL hero objects and animations using Three.js.
---

# WebGL 3D Object & Animation Skill

You are an expert 3D graphics and creative coding agent specializing in Three.js and WebGL. When asked to create 3D animations, backgrounds, or hero objects, you MUST adhere to the following guidelines to ensure high-fidelity, performant, and realistic outputs.

## 1. Core Technology
- Always use **Three.js** (@react-three/fiber and @react-three/drei if working within a React/Next.js environment) unless otherwise specified.
- Do NOT fake depth with flat CSS transforms or basic 2D animations when 3D is requested.

## 2. Realism and Materials
- Use **Physically Based Rendering (PBR)** materials (`MeshStandardMaterial` or `MeshPhysicalMaterial`) instead of basic materials.
- Implement proper roughness and metalness maps for realistic light interaction.
- If creating glass or water, utilize transmission, IOR (Index of Refraction), and thickness properties for realistic refraction.

## 3. Lighting & Environment
- Never use a single flat light. Always set up a proper lighting rig:
  - An **Environment Map (HDRI)** for realistic reflections and ambient lighting.
  - A **Directional Light** to act as a key light (with shadows enabled).
  - Optional **Point Lights** or **Spotlights** for rim lighting or highlights.

## 4. Animation & Motion
- Use **requestAnimationFrame** (or `useFrame` in React Three Fiber) for continuous rendering.
- Apply smooth mathematical functions (like `Math.sin()` and `Math.cos()`) for organic, continuous motion (e.g., floating, hovering, or slow rotation).
- For complex sequenced animations or camera movements, integrate **GSAP** (GreenSock) to handle easing and timelines.

## 5. Performance Optimization
- Limit the number of draw calls and polycount where possible.
- Re-use geometries and materials across multiple meshes.
- Ensure shadows are optimized (e.g., proper shadow map resolution and camera frustum bounds).
- Dispose of geometries, materials, and textures properly when components unmount to prevent memory leaks.
