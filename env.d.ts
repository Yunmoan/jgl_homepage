/// <reference types="vite/client" />

// Vue SFC type support
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare const __GIT_HASH__: string
declare const __GIT_DATE__: string
