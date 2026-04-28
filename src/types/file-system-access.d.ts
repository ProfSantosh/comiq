// Extensions to the File System Access API types
// These APIs are available in modern browsers but not fully typed in lib.dom.d.ts

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
}

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface Window {
  showDirectoryPicker(options?: {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
  }): Promise<FileSystemDirectoryHandle>
  showOpenFilePicker(options?: {
    multiple?: boolean
    excludeAcceptAllOption?: boolean
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
  }): Promise<FileSystemFileHandle[]>
  showSaveFilePicker(options?: {
    excludeAcceptAllOption?: boolean
    suggestedName?: string
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
  }): Promise<FileSystemFileHandle>
}
