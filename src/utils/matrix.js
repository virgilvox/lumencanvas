/**
 * Calculates the 3x3 perspective transform matrix that maps the 'from' points to the 'to' points.
 * This is based on the math from the following article:
 * https://math.stackexchange.com/questions/296794/finding-the-transform-matrix-from-4-projected-points-with-javascript
 *
 * @param {Array<object>} from - Array of 4 points {x, y} for the source rectangle.
 * @param {Array<object>} to - Array of 4 points {x, y} for the destination quadrilateral.
 * @returns {Array<number>|null} A 16-element array for CSS matrix3d, or null if not solvable.
 */
export function getTransform(from, to) {
    if (from.length !== 4 || to.length !== 4) {
        return null;
    }

    const A = []; // Augmented matrix
    for (let i = 0; i < 4; i++) {
        const f = from[i];
        const t = to[i];
        A.push([f.x, f.y, 1, 0, 0, 0, -f.x * t.x, -f.y * t.x]);
        A.push([0, 0, 0, f.x, f.y, 1, -f.x * t.y, -f.y * t.y]);
    }

    const b = [];
    for (let i = 0; i < 4; i++) {
        b.push(to[i].x);
        b.push(to[i].y);
    }

    const h = solve(A, b);
    if (!h) return null;

    // The h vector is [h11, h12, h13, h21, h22, h23, h31, h32]
    // We need to convert it to a 4x4 matrix for CSS matrix3d
    // The matrix is column-major order for CSS
    const H = [
        h[0], h[3], 0, h[6],
        h[1], h[4], 0, h[7],
        0,    0,    1, 0,
        h[2], h[5], 0, 1
    ];

    return H;
}

/**
 * Solves a system of linear equations Ax = b using Gaussian elimination.
 * @param {Array<Array<number>>} A - The matrix A.
 * @param {Array<number>} b - The vector b.
 * @returns {Array<number>|null} The solution vector x, or null if not solvable.
 */
function solve(A, b) {
    const n = A.length;
    for (let i = 0; i < n; i++) {
        A[i].push(b[i]);
    }

    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
                maxRow = k;
            }
        }
        [A[i], A[maxRow]] = [A[maxRow], A[i]];

        if (Math.abs(A[i][i]) <= 1e-8) {
            return null; // Singular matrix
        }

        for (let k = i + 1; k < n; k++) {
            const factor = A[k][i] / A[i][i];
            for (let j = i; j < n + 1; j++) {
                A[k][j] -= factor * A[i][j];
            }
        }
    }

    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += A[i][j] * x[j];
        }
        x[i] = (A[i][n] - sum) / A[i][i];
    }

    return x;
} 