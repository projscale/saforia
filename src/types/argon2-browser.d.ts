declare module 'argon2-browser' {
  export enum ArgonType { Argon2d, Argon2i, Argon2id }
  export function hash(params: { pass: string | Uint8Array, salt: string | Uint8Array, time?: number, mem?: number, parallelism?: number, hashLen?: number, type?: ArgonType }): Promise<{ hash: Uint8Array }>
  export function unloadRuntime(): void
  const argon2: { ArgonType: typeof ArgonType, hash: typeof hash, unloadRuntime: typeof unloadRuntime }
  export default argon2
}
declare module 'argon2-browser/dist/argon2-bundled.min.js' {
  export enum ArgonType { Argon2d, Argon2i, Argon2id }
  export function hash(params: { pass: string | Uint8Array, salt: string | Uint8Array, time?: number, mem?: number, parallelism?: number, hashLen?: number, type?: ArgonType }): Promise<{ hash: Uint8Array }>
  export function unloadRuntime(): void
  const argon2: { ArgonType: typeof ArgonType, hash: typeof hash, unloadRuntime: typeof unloadRuntime }
  export default argon2
}
