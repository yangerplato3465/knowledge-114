/** A small indexed mesh, with UVs fixed to the complete source (no slicing/cropping). */
export function actorMesh(width: number, height: number) {
  const columns = 7, rows = 10;
  const vertices = new Float32Array(columns * rows * 2), uvs = new Float32Array(vertices.length);
  const indices: number[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const i = row * columns + col, u = col / (columns - 1), v = row / (rows - 1);
    vertices.set([u * width, v * height], i * 2); uvs.set([u, v], i * 2);
    if (col < columns - 1 && row < rows - 1) {
      const down = i + columns;
      indices.push(i, i + 1, down, i + 1, down + 1, down);
    }
  }
  return { vertices, rest: vertices.slice(), uvs, indices: new Uint32Array(indices) };
}

/** Source-space deformation fades to zero above the boots, so feet never skate. */
export function deformActor(vertices: Float32Array, rest: Float32Array, width: number, height: number,
  time: number, phase: number, pointerX: number, pointerY: number, reduced = false) {
  const breath = Math.sin(time * 1.35 + phase), sway = Math.sin(time * .72 + phase);
  for (let i = 0; i < vertices.length; i += 2) {
    const x = rest[i], y = rest[i + 1], v = y / height;
    const weight = Math.max(0, (.76 - v) / .76);
    const edge = Math.min(1, Math.abs(x / width - .5) * 2);
    vertices[i] = x + (reduced ? 0 : weight * (sway * 3.2 + pointerX * 4 + Math.sin(time * 1.05 + phase + v * 3) * edge * 2));
    vertices[i + 1] = y + (reduced ? 0 : weight * (-breath * 3.2 + pointerY * 2));
  }
}

export function smoothPointer(current: number, target: number, deltaMS: number) {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, deltaMS) / 180));
}
