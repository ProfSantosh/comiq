// Type shim for the unrar.js WASM module
// Actual functionality is loaded dynamically at runtime

declare module 'unrar.js' {
  interface RarArchive {
    getFilenames(): string[]
    extractFile(name: string): Promise<Uint8Array>
    close(): void
  }

  interface RarLoader {
    open(buffer: ArrayBuffer): Promise<RarArchive>
  }

  const loader: RarLoader
  export default loader
}
