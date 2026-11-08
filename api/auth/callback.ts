import {type AuthEnv, handleCallback} from '../_lib/authHandlers.js'

export function GET(request: Request) {
  return handleCallback(request, process.env as AuthEnv, fetch)
}
