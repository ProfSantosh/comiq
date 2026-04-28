import { librarySourceRepository } from '../../persistence/library-source.repository'
import { librarySourceService } from './library-source.service'

export const libraryRecoveryService = {
  async requestPermission(sourceId: string): Promise<boolean> {
    const source = await librarySourceRepository.getById(sourceId)
    if (!source) return false

    try {
      const result = await source.handle.requestPermission({ mode: 'read' })
      if (result === 'granted') {
        await librarySourceRepository.update(sourceId, {
          permissionState: 'granted',
          status: 'ready',
          lastSeenAt: new Date().toISOString(),
        })
        // Trigger rescan after successful recovery
        void librarySourceService.rescan(sourceId)
        return true
      }
    } catch {
      // User rejected or permission unavailable
    }

    await librarySourceRepository.updateStatus(sourceId, 'revoked')
    return false
  },
}
