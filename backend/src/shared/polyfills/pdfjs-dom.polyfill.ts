/**
 * `pdf-parse` pulls in `pdfjs-dist`, which - even for pure text extraction,
 * no canvas rendering involved - unconditionally does `new DOMMatrix()` at
 * module-load time. It tries to polyfill DOMMatrix/ImageData/Path2D from
 * the optional native `canvas` package first; when that's not installed it
 * just warns and leaves the globals undefined, and the later unconditional
 * usage then throws `ReferenceError: DOMMatrix is not defined`, crashing
 * the whole process on import - not just when a PDF is actually parsed.
 *
 * Defining minimal stubs here (before anything imports `pdf-parse`) makes
 * pdfjs-dist's own `if (!globalThis.DOMMatrix)` guard see them as already
 * present and skip straight past the crash; the stubs are never called for
 * real (nothing here renders to a canvas), they only need to exist.
 *
 * Import this file's side effect FIRST, above any `pdf-parse` import -
 * ordinary ES module imports evaluate in the order they're written, so
 * this must appear before, not after, in every importing file.
 */
class DOMMatrixStub {
  constructor(..._args: unknown[]) {}
}

class ImageDataStub {
  constructor(..._args: unknown[]) {}
}

class Path2DStub {
  constructor(..._args: unknown[]) {}
}

if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixStub;
}
if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as Record<string, unknown>).ImageData = ImageDataStub;
}
if (typeof globalThis.Path2D === 'undefined') {
  (globalThis as Record<string, unknown>).Path2D = Path2DStub;
}
