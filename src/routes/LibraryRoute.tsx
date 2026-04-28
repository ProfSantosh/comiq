import { Navigate } from 'react-router-dom'
import { detectLibraryCapability } from '../domain/library/capability-detection.service'
import LibraryView from '../features/library/LibraryView'
import FallbackBanner from '../components/FallbackBanner'

export default function LibraryRoute() {
  const capability = detectLibraryCapability()

  if (!capability.isSupported) {
    return (
      <>
        <FallbackBanner reason={capability.reason} />
        <Navigate to="/quick-read" replace />
      </>
    )
  }

  return <LibraryView />
}
