// Stub for unrar.js WASM module in test environment
export default {
  open: async (_buffer: ArrayBuffer) => ({
    getFilenames: () => [] as string[],
    extractFile: async (_name: string) => new Uint8Array(0),
    close: () => undefined,
  }),
}
