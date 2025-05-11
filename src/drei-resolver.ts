/**
 * This file is intended to be used with Vite's "resolveId" hook to
 * patch problematic imports from drei components.
 */

import path from 'path';

export function dreiResolver() {
  return {
    name: 'drei-resolver',
    resolveId(id, importer) {
      // Only intercept imports from drei to three-mesh-bvh
      if (importer && importer.includes('@react-three/drei') && id === 'three-mesh-bvh') {
        // Return our patched implementation for these imports
        return path.resolve(__dirname, './drei-patch.ts');
      }
      
      return null; // Let Vite handle other imports normally
    }
  };
} 